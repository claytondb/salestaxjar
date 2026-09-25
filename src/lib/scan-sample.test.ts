import { describe, it, expect } from 'vitest'
import { sampleOrders } from './scan-sample'
import { bucketOrders, evaluateAllStates, getTopActions, summarize } from './nexus-engine'

function run(now: Date) {
  const { byState, coverage } = bucketOrders(sampleOrders(now), now)
  const evaluations = evaluateAllStates(byState, { now, coverage, source: 'files' })
  const pick = (code: string) => evaluations.find((e) => e.stateCode === code)!
  return { evaluations, coverage, pick, summary: summarize(evaluations), actions: getTopActions(evaluations, coverage, now, 3, 'files') }
}

describe('free check sample data', () => {
  // The same kinds of results should show up whatever the time of year
  for (const date of ['2026-01-10T12:00:00Z', '2026-04-15T12:00:00Z', '2026-09-25T12:00:00Z', '2026-12-28T12:00:00Z']) {
    it(`shows every kind of result on ${date.slice(0, 10)}`, () => {
      const { pick, summary, actions } = run(new Date(date))
      expect(pick('WA').overNow).toBe(true)
      expect(pick('GA').overNow).toBe(true)
      expect(pick('GA').summaryLine).toMatch(/orders/)
      expect(pick('CO').pastExposure).not.toBeNull()
      expect(pick('WI').marketplaceOnly).toBe(true)
      expect(pick('IL').status).toBe('approaching')
      for (const code of ['TX', 'CA', 'FL', 'NY', 'NJ', 'OH']) {
        expect({ code, over: pick(code).overNow || pick(code).startsNextYear || !!pick(code).pastExposure }).toEqual({ code, over: false })
      }
      expect(summary.registerNowCount).toBe(2)
      expect(actions.map((a) => a.kind)).toEqual(['register', 'register', 'past'])
    })
  }

  it('is the same every time', () => {
    const now = new Date('2026-09-25T12:00:00Z')
    expect(sampleOrders(now)).toEqual(sampleOrders(now))
  })

  it('covers January 1 two years back to today, so no data-gap warnings', () => {
    const now = new Date('2026-09-25T12:00:00Z')
    const { coverage, evaluations } = run(now)
    expect(coverage.earliestOrder!.getUTCFullYear()).toBe(2024)
    expect(evaluations.flatMap((e) => e.confidenceReasons).join(' ')).not.toMatch(/start on|most recent/)
  })
})
