import { describe, it, expect } from 'vitest'
import {
  addMonths,
  bucketOrders,
  channelForPlatform,
  emptyChannels,
  emptyCoverage,
  evaluateAllStates,
  evaluateState,
  finishCoverage,
  getTopActions,
  monthRange,
  needsRegistration,
  summarize,
  type DataCoverage,
  type MonthKey,
  type NexusOrder,
  type Registration,
  type StateMonths,
} from './nexus-engine'
import { getStateThreshold } from './nexus-thresholds'

const NOW = new Date('2026-07-01T12:00:00Z')

function coverage(opts: Partial<{ directFrom: string; directTo: string; mktFrom: string; mktTo: string; capped: MonthKey[]; limit: number | null }> = {}): DataCoverage {
  const c = emptyCoverage()
  c.direct = {
    earliest: new Date(opts.directFrom ?? '2024-01-02T00:00:00Z'),
    latest: new Date(opts.directTo ?? '2026-06-30T00:00:00Z'),
  }
  if (opts.mktFrom) {
    c.marketplace = { earliest: new Date(opts.mktFrom), latest: new Date(opts.mktTo ?? '2026-06-30T00:00:00Z') }
    c.hasMarketplaceData = true
  }
  c.cappedMonths = opts.capped ?? []
  c.planOrderLimit = opts.limit ?? null
  return finishCoverage(c)
}

const FULL = coverage({ mktFrom: '2024-01-05T00:00:00Z' })

function rule(code: string) {
  const r = getStateThreshold(code)
  if (!r) throw new Error(`no rule for ${code}`)
  return r
}

/** Spread `sales`/`orders` evenly over the months from start to end (inclusive). */
function spread(months: StateMonths, start: MonthKey, end: MonthKey, sales: number, orders: number, channel: 'direct' | 'marketplace' = 'direct') {
  const keys = monthRange(start, end)
  keys.forEach((k, i) => {
    const b = months.get(k) ?? emptyChannels()
    b[channel].sales += sales / keys.length
    b[channel].orders += Math.floor(orders / keys.length) + (i < orders % keys.length ? 1 : 0)
    months.set(k, b)
  })
  return months
}

function sales(parts: Array<[MonthKey, MonthKey, number, number, ('direct' | 'marketplace')?]>): StateMonths {
  const m: StateMonths = new Map()
  for (const [a, b, s, o, ch] of parts) spread(m, a, b, s, o, ch ?? 'direct')
  return m
}

const ctx = (extra: Partial<{ coverage: DataCoverage; registrations: Map<string, Registration>; now: Date }> = {}) => ({
  now: extra.now ?? NOW,
  coverage: extra.coverage ?? FULL,
  registrations: extra.registrations,
})

describe('helpers', () => {
  it('maps platforms to channels', () => {
    expect(channelForPlatform('amazon')).toBe('marketplace')
    expect(channelForPlatform('Etsy')).toBe('marketplace')
    expect(channelForPlatform('shopify')).toBe('direct')
  })

  it('does month arithmetic in UTC', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-11', 3)).toBe('2026-02')
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('buckets orders by state and month, skips bad values, tracks coverage per channel', () => {
    const orders: NexusOrder[] = [
      { date: new Date('2025-03-10T00:00:00Z'), stateCode: 'tx', sales: 100, channel: 'direct' },
      { date: new Date('2025-03-31T23:59:59Z'), stateCode: 'TX', sales: 50, channel: 'direct' },
      { date: new Date('2026-02-10T00:00:00Z'), stateCode: 'TX', sales: 300, channel: 'marketplace' },
      { date: new Date('2026-02-11T00:00:00Z'), stateCode: 'TX', sales: Number.NaN, channel: 'direct' },
      { date: new Date('invalid'), stateCode: 'TX', sales: 999, channel: 'direct' },
      { date: new Date('2023-06-01T00:00:00Z'), stateCode: 'TX', sales: 999, channel: 'direct' }, // older than the history window
    ]
    const { byState, coverage: cov } = bucketOrders(orders, NOW)
    const tx = byState.get('TX')!
    expect(tx.get('2025-03')!.direct).toEqual({ sales: 150, orders: 2 })
    expect(tx.get('2026-02')!.marketplace).toEqual({ sales: 300, orders: 1 })
    expect(tx.get('2026-02')!.direct).toEqual({ sales: 0, orders: 1 }) // NaN counted as an order, not as sales
    expect(tx.has('2023-06')).toBe(false)
    expect(cov.marketplace.earliest?.toISOString()).toBe('2026-02-10T00:00:00.000Z')
    expect(cov.direct.earliest?.toISOString()).toBe('2023-06-01T00:00:00.000Z')
    expect(cov.hasMarketplaceData).toBe(true)
  })
})

describe('measurement windows', () => {
  it('Florida (previous year only): over last year → register now', () => {
    const e = evaluateState(rule('FL'), sales([['2025-01', '2025-12', 120_000, 900]]), ctx())
    expect(e.status).toBe('exceeded')
    expect(e.overNow).toBe(true)
    expect(e.window.label).toBe('2025')
    expect(e.nextStep.kind).toBe('register_now')
  })

  it('Florida: crossing this year → register by January 1 next year', () => {
    const e = evaluateState(rule('FL'), sales([['2025-01', '2025-12', 50_000, 400], ['2026-01', '2026-06', 110_000, 800]]), ctx())
    expect(e.startsNextYear).toBe(true)
    expect(e.status).toBe('warning')
    expect(e.nextStep.kind).toBe('plan_registration')
    expect(e.nextStep.text).toContain('January 1, 2027')
  })

  it('a closed prior year that came close does not make the state "close" today', () => {
    const e = evaluateState(rule('WA'), sales([['2025-01', '2025-12', 95_000, 400], ['2026-01', '2026-06', 20_000, 80]]), ctx())
    expect(e.status).toBe('safe')
    expect(e.window.label).toBe('2026 so far')
    expect(e.why.join(' ')).toContain('In 2025 you reached 95%')
  })

  it('Texas (rolling 12 months): remembers a crossing after the window moves on', () => {
    // $350K in Jul–Aug 2025, then $25K a month: the 12 months to June 2026 total $600K.
    const months = sales([['2025-07', '2025-08', 350_000, 400], ['2025-09', '2026-06', 250_000, 900]])
    const sept = new Date('2026-09-25T12:00:00Z')
    const e = evaluateState(rule('TX'), months, ctx({ now: sept }))
    expect(e.overNow).toBe(true)
    expect(e.status).toBe('exceeded')
    expect(e.window.endMonth).toBe('2026-06')
    expect(e.summaryLine).toContain('12 months ending June 2026')
  })

  it('Texas: an older crossing (more than a year ago) is flagged as past exposure', () => {
    const months = sales([['2024-05', '2025-04', 600_000, 2000]])
    const e = evaluateState(rule('TX'), months, ctx())
    expect(e.overNow).toBe(false)
    expect(e.pastExposure).not.toBeNull()
    expect(e.nextStep.kind).toBe('past_exposure')
    expect(e.headline).toContain('Was over')
  })

  it('calendar states: over two years ago means the state expected tax last year', () => {
    const e = evaluateState(rule('WA'), sales([['2024-01', '2024-12', 150_000, 600]]), ctx())
    expect(e.pastExposure).toEqual({ period: '2025' })
    expect(e.status).toBe('warning')
    expect(e.nextStep.text).toContain('for 2025')
  })
})

describe('marketplace sales', () => {
  it('counts marketplace sales where the state counts them (California)', () => {
    const months = sales([['2026-01', '2026-06', 300_000, 2000], ['2026-01', '2026-06', 250_000, 1500, 'marketplace']])
    const e = evaluateState(rule('CA'), months, ctx())
    expect(e.measuredSales).toBe(550_000)
    expect(e.status).toBe('exceeded')
    expect(e.nextStep.text).toContain('on orders from your own store')
  })

  it('leaves them out where the state excludes them (Florida)', () => {
    const months = sales([['2025-01', '2025-12', 30_000, 200], ['2025-01', '2025-12', 400_000, 3000, 'marketplace']])
    const e = evaluateState(rule('FL'), months, ctx())
    expect(e.status).toBe('safe')
    expect(e.why.join(' ')).toContain('In 2025 your sales into Florida were $30,000')
    expect(e.why.join(' ')).toContain('$400,000 of marketplace sales in 2025 were left out')
    expect(e.headline).toBe('No sales in 2026 so far')
  })

  it('marketplace-only sales into an excluding state are "Under", not "No sales yet"', () => {
    const months = sales([['2026-01', '2026-06', 400_000, 3000, 'marketplace']])
    const e = evaluateState(rule('FL'), months, ctx())
    expect(e.headline).toBe('Under — marketplace sales not counted')
    expect(e.summaryLine).toContain("doesn't count toward your threshold")
    expect(e.hasAnySales).toBe(true)
  })

  it('does not tell a marketplace-only seller to register and collect (Wisconsin)', () => {
    const months = sales([['2026-01', '2026-06', 150_000, 900, 'marketplace']])
    const e = evaluateState(rule('WI'), months, ctx())
    expect(e.marketplaceOnly).toBe(true)
    expect(e.status).toBe('warning')
    expect(e.nextStep.kind).toBe('review')
    expect(e.nextStep.text).toContain("don't need to register")
    expect(needsRegistration(e)).toBe(false)
  })
})

describe('AND and OR thresholds', () => {
  it('Connecticut needs both $100K and 200 orders', () => {
    const salesOnly = evaluateState(rule('CT'), sales([['2025-07', '2026-06', 150_000, 100]]), ctx())
    expect(salesOnly.overNow).toBe(false)
    expect(salesOnly.summaryLine).toContain('needs both tests')
    const both = evaluateState(rule('CT'), sales([['2025-07', '2026-06', 150_000, 250]]), ctx())
    expect(both.overNow).toBe(true)
  })

  it('Arkansas: 200 orders alone is enough, and the wording says so', () => {
    const e = evaluateState(rule('AR'), sales([['2026-01', '2026-06', 20_000, 210]]), ctx())
    expect(e.status).toBe('exceeded')
    expect(e.summaryLine).toContain('210 orders')
    expect(e.summaryLine).toContain('200-order threshold')
  })
})

describe('how sure', () => {
  it('is high when the data covers the window and the result is clear', () => {
    const e = evaluateState(rule('PA'), sales([['2025-01', '2025-12', 300_000, 2000]]), ctx())
    expect(e.confidence).toBe('high')
  })

  it('drops when store history starts after the window a state looks at', () => {
    const cov = coverage({ directFrom: '2026-03-01T00:00:00Z' })
    const e = evaluateState(rule('WA'), sales([['2026-03', '2026-06', 40_000, 200]]), ctx({ coverage: cov }))
    expect(e.confidence).toBe('low')
    expect(e.confidenceReasons.join(' ')).toMatch(/store orders in Sails start on Mar 1, 2026/)
  })

  it('drops when the newest orders are stale', () => {
    const cov = coverage({ directTo: '2026-01-15T00:00:00Z' })
    const e = evaluateState(rule('WA'), sales([['2025-01', '2026-01', 60_000, 300]]), ctx({ coverage: cov }))
    expect(e.confidence).toBe('low')
    expect(e.confidenceReasons.join(' ')).toMatch(/most recent store order in Sails is from Jan 15, 2026/)
  })

  it('checks marketplace history separately in states that count it', () => {
    const cov = coverage({ mktFrom: '2026-06-01T00:00:00Z' })
    const e = evaluateState(rule('CA'), sales([['2025-01', '2026-06', 200_000, 900]]), ctx({ coverage: cov }))
    expect(e.confidenceReasons.join(' ')).toMatch(/marketplace \(Amazon…\) orders in Sails start on Jun 1, 2026/)
    const fl = evaluateState(rule('FL'), sales([['2025-01', '2026-06', 60_000, 300]]), ctx({ coverage: cov }))
    expect(fl.confidenceReasons.join(' ')).not.toMatch(/marketplace/)
  })

  it('drops when a plan limit kept orders out', () => {
    const cov = coverage({ capped: ['2026-04', '2026-05'], limit: 50 })
    const e = evaluateState(rule('WA'), sales([['2025-01', '2026-06', 60_000, 900]]), ctx({ coverage: cov }))
    expect(e.confidence).toBe('medium')
    expect(e.confidenceReasons.join(' ')).toMatch(/limit of 50 orders a month was reached in April 2026 and May 2026/)
  })

  it('does not doubt an "over" result because of missing history', () => {
    const cov = coverage({ directFrom: '2026-03-01T00:00:00Z' })
    const e = evaluateState(rule('WA'), sales([['2026-03', '2026-06', 150_000, 700]]), ctx({ coverage: cov }))
    expect(e.overNow).toBe(true)
    expect(e.confidenceReasons.join(' ')).not.toMatch(/start on/)
  })

  it('flags taxable/retail-only states and results within 10% of the line', () => {
    expect(evaluateState(rule('FL'), sales([['2025-01', '2025-12', 150_000, 900]]), ctx()).confidenceReasons.join(' ')).toMatch(/only counts taxable sales/)
    const close = evaluateState(rule('WA'), sales([['2026-01', '2026-06', 95_000, 400]]), ctx())
    expect(close.status).toBe('warning')
    expect(close.confidenceReasons.join(' ')).toMatch(/within 10%/)
  })
})

describe('projection', () => {
  it('uses the pace since January 1 when history covers it', () => {
    // $60K by July 1 → the remaining $40K takes ~120 days → late October
    const e = evaluateState(rule('WA'), sales([['2026-01', '2026-06', 60_000, 300]]), ctx())
    expect(e.projectedCrossing).toBe('October 2026')
  })

  it('uses the pace since the first order when history starts later', () => {
    const cov = coverage({ directFrom: '2026-05-01T00:00:00Z' })
    // $55K in May–June → ~$900/day → the remaining $45K takes ~50 days
    const e = evaluateState(rule('WA'), sales([['2026-05', '2026-06', 55_000, 200]]), ctx({ coverage: cov }))
    expect(e.projectedCrossing).toBe('August 2026')
  })

  it('projects the order test too and takes whichever comes first', () => {
    // GA: $55K and 150 orders by July 1 → 200 orders around the end of August
    const e = evaluateState(rule('GA'), sales([['2026-01', '2026-06', 55_000, 150]]), ctx())
    expect(e.projectedCrossing).toBe('August 2026')
  })

  it('does not project past the end of the year', () => {
    const e = evaluateState(rule('WA'), sales([['2026-01', '2026-06', 10_000, 50]]), ctx())
    expect(e.projectedCrossing).toBeNull()
  })
})

describe('special cases', () => {
  it('Alaska: no state tax, but flags the local ARSSTC threshold', () => {
    const e = evaluateState(rule('AK'), sales([['2026-01', '2026-06', 300_000, 900]]), ctx())
    expect(e.hasSalesTax).toBe(false)
    expect(e.localNexusOver).toBe(true)
    expect(e.status).toBe('warning')
    expect(e.nextStep.kind).toBe('review')
    expect(e.why.join(' ').match(/no statewide sales tax/g)).toHaveLength(1)
  })

  it('states without a sales tax say nothing to do', () => {
    const e = evaluateState(rule('OR'), sales([['2026-01', '2026-06', 900_000, 5000]]), ctx())
    expect(e.headline).toBe('No state sales tax')
    expect(e.nextStep.kind).toBe('none')
  })

  it("doesn't nag states the seller marked as registered", () => {
    const registrations = new Map<string, Registration>([['WA', 'registered']])
    const e = evaluateState(rule('WA'), sales([['2026-01', '2026-06', 150_000, 700]]), ctx({ registrations }))
    expect(e.overNow).toBe(true)
    expect(e.headline).toBe('Registered')
    expect(e.nextStep.kind).toBe('none')
    expect(needsRegistration(e)).toBe(false)
  })

  it('the rolling-state note reads cleanly', () => {
    const e = evaluateState(rule('NY'), sales([['2025-07', '2026-06', 10_000, 20]]), ctx())
    expect(e.why.join(' ')).not.toContain('..')
  })

  it('every result names its sources and review date', () => {
    const e = evaluateState(rule('TX'), undefined, ctx())
    expect(e.sources.length).toBeGreaterThan(0)
    expect(e.headline).toBe('No sales yet')
  })
})

describe('all states, summary and top actions', () => {
  const byState = new Map<string, StateMonths>([
    ['WA', sales([['2026-01', '2026-06', 150_000, 700]])], // over now
    ['FL', sales([['2025-01', '2025-12', 10_000, 50], ['2026-01', '2026-06', 120_000, 600]])], // next year
    ['GA', sales([['2026-01', '2026-06', 80_000, 150]])], // approaching
    ['WI', sales([['2026-01', '2026-06', 150_000, 900, 'marketplace']])], // marketplace only
    ['OR', sales([['2026-01', '2026-06', 50_000, 100]])], // no sales tax
  ])

  it('sorts the most urgent states first and no-sales-tax states last', () => {
    const all = evaluateAllStates(byState, ctx())
    expect(all).toHaveLength(51)
    expect(all.slice(0, 4).map((e) => e.stateCode)).toEqual(['WA', 'FL', 'WI', 'GA'])
    expect(all[all.length - 1].hasSalesTax).toBe(false)
  })

  it('summarizes counts', () => {
    const summary = summarize(evaluateAllStates(byState, ctx()))
    expect(summary.registerNowCount).toBe(1)
    expect(summary.startsNextYearCount).toBe(1)
    expect(summary.reviewCount).toBe(1)
    expect(summary.closeCount).toBe(1)
    expect(summary.totalStatesWithSales).toBe(5)
  })

  it('orders actions: register, plan, then review', () => {
    const all = evaluateAllStates(byState, ctx())
    const actions = getTopActions(all, FULL, NOW)
    expect(actions.map((a) => a.kind)).toEqual(['register', 'plan', 'review'])
    expect(actions[0].title).toBe('Register in Washington')
  })

  it('suggests upgrading when a plan limit kept orders out', () => {
    const cov = coverage({ capped: ['2026-05'], limit: 50, mktFrom: '2024-01-05T00:00:00Z' })
    const all = evaluateAllStates(new Map([['GA', sales([['2026-01', '2026-06', 80_000, 150]])]]), ctx({ coverage: cov }))
    expect(getTopActions(all, cov, NOW).map((a) => a.kind)).toContain('upgrade')
  })

  it('asks for orders when there is no data at all', () => {
    const empty = emptyCoverage()
    const all = evaluateAllStates(new Map(), ctx({ coverage: empty }))
    const actions = getTopActions(all, empty, NOW)
    expect(actions).toEqual([expect.objectContaining({ kind: 'connect_store' })])
  })
})
