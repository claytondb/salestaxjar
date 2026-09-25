import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    platformConnection: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}))
vi.mock('./platforms', () => ({ updateSyncStatus: vi.fn() }))
vi.mock('./platform-sync', () => ({ importConnectionOrders: vi.fn() }))
vi.mock('./nexus-alerts', () => ({ checkAndCreateAlerts: vi.fn() }))

import { prisma } from './prisma'
import { updateSyncStatus } from './platforms'
import { importConnectionOrders } from './platform-sync'
import { checkAndCreateAlerts } from './nexus-alerts'
import { autoSyncConnections } from './auto-sync'

const NOW = new Date('2026-09-25T13:00:00Z')

function connection(id: string, userId: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    userId,
    platform: 'shopify',
    platformId: `${id}.myshopify.com`,
    accessToken: 'tok',
    refreshToken: null,
    syncStatus: 'success',
    updatedAt: new Date('2026-09-20T00:00:00Z'),
    lastSyncAt: new Date('2026-09-20T00:00:00Z'),
    ...extra,
  }
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env.AUTO_SYNC_ALERTS_ENABLED
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', subscription: null },
    { id: 'u2', subscription: { plan: 'pro', status: 'active' } },
  ] as never)
  vi.mocked(importConnectionOrders).mockResolvedValue({
    imported: 3,
    errors: [],
    fetchedCount: 3,
    cap: { truncated: false, skipped: 0, limit: 50 },
    affectedStates: ['CA'],
    historyFrom: '2026-09-13T00:00:00.000Z',
    complete: true,
  })
  vi.mocked(updateSyncStatus).mockResolvedValue(undefined)
  vi.mocked(checkAndCreateAlerts).mockResolvedValue([{}] as never)
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('autoSyncConnections', () => {
  it('only picks Shopify and WooCommerce stores not synced in the last 20 hours, oldest first', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([] as never)
    await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    const args = vi.mocked(prisma.platformConnection.findMany).mock.calls[0][0]!
    expect(args.where).toEqual({
      platform: { in: ['shopify', 'woocommerce'] },
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date('2026-09-24T17:00:00Z') } }],
    })
    expect(args.orderBy).toEqual({ lastSyncAt: { sort: 'asc', nulls: 'first' } })
  })

  it('syncs each store and marks it synced', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c1', 'u1'), connection('c2', 'u2')] as never)
    const result = await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(result).toMatchObject({ due: 2, synced: 2, failed: 0, imported: 6 })
    expect(vi.mocked(importConnectionOrders).mock.calls.map(([p]) => [p.userId, p.subscription])).toEqual([
      ['u1', null],
      ['u2', { plan: 'pro', status: 'active' }],
    ])
    expect(vi.mocked(updateSyncStatus).mock.calls.map((c) => [c[0], c[3]])).toEqual([
      ['u1', 'syncing'],
      ['u1', 'success'],
      ['u2', 'syncing'],
      ['u2', 'success'],
    ])
  })

  it('records a failed store and carries on with the next', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c1', 'u1'), connection('c2', 'u2')] as never)
    vi.mocked(importConnectionOrders).mockRejectedValueOnce(new Error('Shopify API error: 401'))
    const result = await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(result).toMatchObject({ synced: 1, failed: 1 })
    expect(updateSyncStatus).toHaveBeenCalledWith('u1', 'shopify', 'c1.myshopify.com', 'error', 'Shopify API error: 401')
  })

  it('leaves a sync that is running right now alone', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([
      connection('c1', 'u1', { syncStatus: 'syncing', updatedAt: new Date('2026-09-25T12:55:00Z') }),
      connection('c2', 'u2', { syncStatus: 'syncing', updatedAt: new Date('2026-09-25T10:00:00Z') }), // stuck: retry
    ] as never)
    const result = await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(result).toMatchObject({ due: 1, synced: 1 })
    expect(vi.mocked(importConnectionOrders).mock.calls[0][0].connection.id).toBe('c2')
  })

  it('leaves stores for tomorrow when time runs out', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c1', 'u1'), connection('c2', 'u2')] as never)
    const result = await autoSyncConnections({ deadline: Date.now() + 1_000, now: NOW })
    expect(result).toMatchObject({ due: 2, synced: 0, deferred: 2 })
    expect(importConnectionOrders).not.toHaveBeenCalled()
  })

  it('gives each store a limited share of the time', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c1', 'u1')] as never)
    await autoSyncConnections({ deadline: Date.now() + 90_000, now: NOW })
    expect(vi.mocked(importConnectionOrders).mock.calls[0][0].budgetMs).toBe(20_000)
  })

  it('skips stores whose account no longer exists', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c9', 'gone')] as never)
    const result = await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(result).toMatchObject({ skipped: 1, synced: 0 })
  })

  it('does not create alerts (or send alert emails) unless AUTO_SYNC_ALERTS_ENABLED=true', async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([connection('c1', 'u1')] as never)
    await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(checkAndCreateAlerts).not.toHaveBeenCalled()

    process.env.AUTO_SYNC_ALERTS_ENABLED = 'true'
    const result = await autoSyncConnections({ deadline: Date.now() + 60_000, now: NOW })
    expect(checkAndCreateAlerts).toHaveBeenCalledWith('u1', NOW)
    expect(result.alerts).toBe(1)
  })
})
