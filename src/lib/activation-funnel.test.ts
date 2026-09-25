import { describe, it, expect } from 'vitest'
import { buildActivationFunnel, FUNNEL_STEPS, type FunnelUser } from './activation-funnel'

const NOW = new Date('2026-09-25T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

const users: FunnelUser[] = [
  { id: 'a', createdAt: daysAgo(5), emailVerified: true, subscriptionStatus: 'active' },
  { id: 'b', createdAt: daysAgo(10), emailVerified: true, subscriptionStatus: 'trialing' },
  { id: 'c', createdAt: daysAgo(40), emailVerified: false, subscriptionStatus: null },
  { id: 'd', createdAt: daysAgo(200), emailVerified: true, subscriptionStatus: 'canceled' },
]
const facts = {
  connected: new Set(['a', 'd']),
  withOrders: new Set(['a', 'b']), // b uploaded an Amazon report without connecting a store
  markedNexus: new Set(['a']),
  markedFiled: new Set<string>(),
}

describe('buildActivationFunnel', () => {
  it('counts each step for signups in the window', () => {
    const [last30, last90, all] = buildActivationFunnel(users, facts, NOW)
    const counts = (w: typeof last30) => Object.fromEntries(w.steps.map((s) => [s.key, s.count]))
    expect(counts(last30)).toEqual({
      signed_up: 2,
      verified: 2,
      brought_orders: 2,
      orders_imported: 2,
      marked_nexus: 1,
      marked_filed: 0,
      started_plan: 2,
      paying: 1,
    })
    expect(counts(last90).signed_up).toBe(3)
    expect(counts(all)).toMatchObject({ signed_up: 4, verified: 3, brought_orders: 3, started_plan: 3, paying: 1 })
  })

  it('reports each step as a share of signups', () => {
    const [, , all] = buildActivationFunnel(users, facts, NOW)
    expect(all.steps.find((s) => s.key === 'verified')!.percentOfSignups).toBe(75)
  })

  it('handles an empty window', () => {
    const [last30] = buildActivationFunnel([], facts, NOW)
    expect(last30.steps).toHaveLength(FUNNEL_STEPS.length)
    expect(last30.steps.every((s) => s.count === 0 && s.percentOfSignups === 0)).toBe(true)
  })
})
