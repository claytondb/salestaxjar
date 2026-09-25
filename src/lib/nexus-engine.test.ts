import { describe, it, expect } from 'vitest'
import {
  bucketOrders,
  channelForPlatform,
  computeWindows,
  emptyWindows,
  evaluateAllStates,
  evaluateState,
  getTopActions,
  summarize,
  type DataCoverage,
  type NexusOrder,
  type StateWindows,
} from './nexus-engine'
import { getStateThreshold } from './nexus-thresholds'

const NOW = new Date('2026-07-01T12:00:00Z')
const FULL_HISTORY: DataCoverage = {
  earliestOrder: new Date('2024-06-01T00:00:00Z'),
  latestOrder: new Date('2026-06-30T00:00:00Z'),
  hasMarketplaceData: true,
}

function rule(code: string) {
  const r = getStateThreshold(code)
  if (!r) throw new Error(`no rule for ${code}`)
  return r
}

/** Build windows by hand: amounts per window and channel. */
function windows(parts: {
  prev?: [number, number]
  cur?: [number, number]
  roll?: [number, number]
  prevMkt?: [number, number]
  curMkt?: [number, number]
  rollMkt?: [number, number]
}): StateWindows {
  const w = emptyWindows()
  const set = (t: { sales: number; orders: number }, v?: [number, number]) => {
    if (v) {
      t.sales = v[0]
      t.orders = v[1]
    }
  }
  set(w.previousYear.direct, parts.prev)
  set(w.currentYear.direct, parts.cur)
  set(w.rolling12.direct, parts.roll)
  set(w.previousYear.marketplace, parts.prevMkt)
  set(w.currentYear.marketplace, parts.curMkt)
  set(w.rolling12.marketplace, parts.rollMkt)
  return w
}

const ctx = { now: NOW, coverage: FULL_HISTORY }

describe('channels and windows', () => {
  it('treats marketplaces as marketplace sales and stores as direct', () => {
    expect(channelForPlatform('amazon')).toBe('marketplace')
    expect(channelForPlatform('Etsy')).toBe('marketplace')
    expect(channelForPlatform('shopify')).toBe('direct')
    expect(channelForPlatform('woocommerce')).toBe('direct')
  })

  it('computes previous year, current year and last-12-month windows in UTC', () => {
    const w = computeWindows(NOW)
    expect(w.previousYear.start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(w.previousYear.end.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(w.currentYear.start.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(w.rolling12.start.toISOString()).toBe('2025-07-01T12:00:00.000Z')
  })

  it('buckets orders into every window they fall in and reports coverage', () => {
    const orders: NexusOrder[] = [
      { date: new Date('2025-03-10T00:00:00Z'), stateCode: 'tx', sales: 100, channel: 'direct' }, // prev only
      { date: new Date('2025-09-10T00:00:00Z'), stateCode: 'TX', sales: 200, channel: 'direct' }, // prev + rolling
      { date: new Date('2026-02-10T00:00:00Z'), stateCode: 'TX', sales: 300, channel: 'marketplace' }, // cur + rolling
      { date: new Date('invalid'), stateCode: 'TX', sales: 999, channel: 'direct' }, // ignored
    ]
    const { byState, coverage } = bucketOrders(orders, NOW)
    const tx = byState.get('TX')!
    expect(tx.previousYear.direct).toEqual({ sales: 300, orders: 2 })
    expect(tx.rolling12.direct).toEqual({ sales: 200, orders: 1 })
    expect(tx.rolling12.marketplace).toEqual({ sales: 300, orders: 1 })
    expect(tx.currentYear.marketplace).toEqual({ sales: 300, orders: 1 })
    expect(coverage.earliestOrder?.toISOString()).toBe('2025-03-10T00:00:00.000Z')
    expect(coverage.hasMarketplaceData).toBe(true)
  })
})

describe('measurement periods', () => {
  it('Florida (previous year only): over last year means register now', () => {
    const e = evaluateState(rule('FL'), windows({ prev: [120_000, 900], cur: [40_000, 300] }), ctx)
    expect(e.status).toBe('exceeded')
    expect(e.window.key).toBe('previousYear')
    expect(e.nextStep.kind).toBe('register_now')
    expect(e.headline).toBe('Over the threshold')
  })

  it('Florida: crossing this year means registering by January 1 next year, not now', () => {
    const e = evaluateState(rule('FL'), windows({ prev: [50_000, 400], cur: [110_000, 800] }), ctx)
    expect(e.status).toBe('warning')
    expect(e.startsNextYear).toBe(true)
    expect(e.nextStep.kind).toBe('plan_registration')
    expect(e.nextStep.text).toContain('January 1, 2027')
    expect(e.why.join(' ')).toMatch(/previous year/)
  })

  it('Washington (previous or current year): uses whichever year is higher', () => {
    const e = evaluateState(rule('WA'), windows({ prev: [101_000, 500], cur: [20_000, 90] }), ctx)
    expect(e.status).toBe('exceeded')
    expect(e.window.key).toBe('previousYear')
    const e2 = evaluateState(rule('WA'), windows({ prev: [20_000, 90], cur: [101_000, 500] }), ctx)
    expect(e2.status).toBe('exceeded')
    expect(e2.window.key).toBe('currentYear')
  })

  it('Texas (last 12 months): ignores sales outside the rolling window', () => {
    const e = evaluateState(rule('TX'), windows({ prev: [900_000, 5000], roll: [200_000, 1200] }), ctx)
    expect(e.window.key).toBe('rolling12')
    expect(e.status).toBe('safe')
    expect(e.measuredSales).toBe(200_000)
  })
})

describe('marketplace sales', () => {
  it('counts marketplace sales where the state counts them (California)', () => {
    const e = evaluateState(rule('CA'), windows({ cur: [300_000, 2000], curMkt: [250_000, 1500] }), ctx)
    expect(e.marketplace.counted).toBe(true)
    expect(e.measuredSales).toBe(550_000)
    expect(e.status).toBe('exceeded')
    expect(e.why.join(' ')).toMatch(/counts marketplace sales too/)
  })

  it('leaves marketplace sales out where the state excludes them (Florida)', () => {
    const e = evaluateState(rule('FL'), windows({ prev: [30_000, 200], prevMkt: [400_000, 3000] }), ctx)
    expect(e.marketplace.counted).toBe(false)
    expect(e.measuredSales).toBe(30_000)
    expect(e.status).toBe('safe')
    expect(e.why.join(' ')).toMatch(/doesn't count sales made through marketplaces/)
  })
})

describe('AND and OR thresholds', () => {
  it('Connecticut needs both $100K and 200 orders', () => {
    const salesOnly = evaluateState(rule('CT'), windows({ roll: [150_000, 100] }), ctx)
    expect(salesOnly.status).toBe('safe')
    expect(salesOnly.highestPercentage).toBeCloseTo(50)
    const both = evaluateState(rule('CT'), windows({ roll: [150_000, 250] }), ctx)
    expect(both.status).toBe('exceeded')
  })

  it('Arkansas: 200 orders alone is enough', () => {
    const e = evaluateState(rule('AR'), windows({ cur: [20_000, 210] }), ctx)
    expect(e.status).toBe('exceeded')
    expect(e.transactionPercentage).toBeGreaterThanOrEqual(100)
  })
})

describe('how sure', () => {
  it('is high when the data covers the window and the result is clear', () => {
    const e = evaluateState(rule('PA'), windows({ prev: [300_000, 2000] }), ctx)
    expect(e.status).toBe('exceeded')
    expect(e.confidence).toBe('high')
    expect(e.confidenceReasons).toEqual([])
  })

  it('drops when order history starts after the window a state looks at', () => {
    const coverage: DataCoverage = { earliestOrder: new Date('2026-03-01T00:00:00Z'), latestOrder: NOW, hasMarketplaceData: false }
    const e = evaluateState(rule('WA'), windows({ cur: [40_000, 200] }), { now: NOW, coverage })
    expect(e.confidence).toBe('low')
    expect(e.confidenceReasons.join(' ')).toMatch(/history starts on Mar 1, 2026/)
  })

  it('does not doubt an "over" result because of missing older history', () => {
    const coverage: DataCoverage = { earliestOrder: new Date('2026-03-01T00:00:00Z'), latestOrder: NOW, hasMarketplaceData: true }
    const e = evaluateState(rule('PA'), windows({ cur: [0, 0], prev: [0, 0], roll: [0, 0] }), { now: NOW, coverage })
    expect(e.status).toBe('safe')
    const over = evaluateState(rule('WA'), windows({ cur: [150_000, 700] }), { now: NOW, coverage })
    expect(over.status).toBe('exceeded')
    expect(over.confidenceReasons.join(' ')).not.toMatch(/history starts/)
  })

  it('flags states that only count taxable or retail sales', () => {
    const e = evaluateState(rule('FL'), windows({ prev: [150_000, 900] }), ctx)
    expect(e.confidence).toBe('medium')
    expect(e.confidenceReasons.join(' ')).toMatch(/only counts taxable sales/)
  })

  it('flags results within 10% of the line', () => {
    const e = evaluateState(rule('WA'), windows({ cur: [95_000, 400] }), ctx)
    expect(e.status).toBe('warning')
    expect(e.confidence).toBe('medium')
    expect(e.confidenceReasons.join(' ')).toMatch(/within 10%/)
  })
})

describe('what next', () => {
  it('projects when a calendar-year state will be crossed at the current pace', () => {
    // $60K by July 1 ≈ $331/day → the remaining $40K takes ~121 days → late October
    const e = evaluateState(rule('WA'), windows({ cur: [60_000, 300] }), ctx)
    expect(e.projectedCrossing).toBe('October 2026')
    expect(e.nextStep.text).toContain('October 2026')
  })

  it('does not project past the end of the year', () => {
    const e = evaluateState(rule('WA'), windows({ cur: [10_000, 50] }), ctx)
    expect(e.projectedCrossing).toBeNull()
  })

  it('says nothing to do in states without a sales tax', () => {
    const e = evaluateState(rule('OR'), windows({ cur: [900_000, 5000] }), ctx)
    expect(e.hasSalesTax).toBe(false)
    expect(e.headline).toBe('No state sales tax')
    expect(e.nextStep.kind).toBe('none')
  })

  it('every result names its sources and review date', () => {
    const e = evaluateState(rule('TX'), undefined, ctx)
    expect(e.sources.length).toBeGreaterThan(0)
    expect(e.rulesReviewed).toMatch(/2026/)
    expect(e.headline).toBe('No sales yet')
  })
})

describe('all states, summary and top actions', () => {
  const byState = new Map<string, StateWindows>([
    ['WA', windows({ cur: [150_000, 700] })], // over now
    ['FL', windows({ prev: [10_000, 50], cur: [120_000, 600] })], // over this year → next year
    ['GA', windows({ cur: [80_000, 150] })], // approaching
    ['OR', windows({ cur: [50_000, 100] })], // no sales tax
  ])

  it('sorts the most urgent states first and no-sales-tax states last', () => {
    const all = evaluateAllStates(byState, ctx)
    expect(all).toHaveLength(51)
    expect(all[0].stateCode).toBe('WA')
    expect(all[1].stateCode).toBe('FL')
    expect(all[all.length - 1].hasSalesTax).toBe(false)
  })

  it('summarizes counts', () => {
    const summary = summarize(evaluateAllStates(byState, ctx))
    expect(summary.exceededCount).toBe(1)
    expect(summary.startsNextYearCount).toBe(1)
    expect(summary.totalStatesWithSales).toBe(4)
    expect(summary.noSalesTaxCount).toBe(5)
  })

  it('puts registering first, then planning, then watching', () => {
    const all = evaluateAllStates(byState, ctx)
    const actions = getTopActions(all, FULL_HISTORY, NOW)
    expect(actions.map((a) => a.kind)).toEqual(['register', 'plan', 'watch'])
    expect(actions[0].title).toBe('Register in Washington')
  })

  it('asks for more history when it starts after January 1 of last year', () => {
    const coverage: DataCoverage = { earliestOrder: new Date('2026-02-01T00:00:00Z'), latestOrder: NOW, hasMarketplaceData: true }
    const all = evaluateAllStates(new Map([['GA', windows({ cur: [80_000, 150] })]]), { now: NOW, coverage })
    const actions = getTopActions(all, coverage, NOW)
    expect(actions[0].kind).toBe('import_history')
    expect(actions[0].title).toContain('January 1, 2025')
  })

  it('asks for orders when there is no data at all', () => {
    const coverage: DataCoverage = { earliestOrder: null, latestOrder: null, hasMarketplaceData: false }
    const all = evaluateAllStates(new Map(), { now: NOW, coverage })
    const actions = getTopActions(all, coverage, NOW)
    expect(actions).toHaveLength(1)
    expect(actions[0].kind).toBe('connect_store')
  })
})
