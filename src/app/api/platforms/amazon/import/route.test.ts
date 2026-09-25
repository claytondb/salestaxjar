import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(() => ({ allowed: true, userPlan: 'starter', requiredPlan: 'free' })),
  tierGateError: vi.fn(),
}))
vi.mock('@/lib/usage', () => ({
  canImportOrders: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 500, remaining: 500 })),
  applyMonthlyOrderCap: vi.fn(async ({ items }: { items: unknown[] }) => ({ items, truncated: false, skipped: 0, limit: 500, remaining: 500 })),
  freeUserImportError: vi.fn(),
  orderLimitExceededError: vi.fn(),
  getUserUsageStatus: vi.fn(async () => ({ currentCount: 3, limit: 500, remaining: 497, percentUsed: 1, atLimit: false, nearLimit: false })),
}))
vi.mock('@/lib/nexus-alerts', () => ({ checkAndCreateAlerts: vi.fn(async () => []) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformConnection: {
      findFirst: vi.fn(async () => ({ id: 'conn-1' })),
      create: vi.fn(),
      update: vi.fn(async () => ({})),
    },
    importedOrder: { upsert: vi.fn(async () => ({})) },
  },
}))

import { POST } from './route'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndCreateAlerts } from '@/lib/nexus-alerts'

function upload(csv: string) {
  const form = new FormData()
  form.append('file', new File([csv], 'amazon.csv', { type: 'text/csv' }))
  return new NextRequest('http://localhost/api/platforms/amazon/import', { method: 'POST', body: form })
}

function savedStates() {
  return vi.mocked(prisma.importedOrder.upsert).mock.calls.map(
    (c) => (c[0] as { create: { platformOrderId: string; shippingState: string | null } }).create
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1', subscription: { plan: 'starter', status: 'active' } } as never)
})

describe('POST /api/platforms/amazon/import', () => {
  it('turns full state names into codes instead of truncating them', async () => {
    const csv = [
      'Order ID,Date,Total,Tax,State,City,Postal Code',
      '111-1,2026-03-01,108.25,8.25,Texas,Austin,78701',
      '111-2,2026-03-02,54.00,4.00,new york,Albany,12207',
      '111-3,2026-03-03,20.00,0,CA,Fresno,93650',
      '111-4,2026-03-04,20.00,0,Puerto Rico,San Juan,00901',
    ].join('\n')
    const res = await POST(upload(csv))
    expect(res.status).toBe(200)
    const saved = savedStates()
    expect(saved.find((o) => o.platformOrderId === '111-1')?.shippingState).toBe('TX')
    expect(saved.find((o) => o.platformOrderId === '111-2')?.shippingState).toBe('NY')
    expect(saved.find((o) => o.platformOrderId === '111-3')?.shippingState).toBe('CA')
    expect(saved.find((o) => o.platformOrderId === '111-4')?.shippingState).toBeNull()
  })

  it('counts settlement tax lines in the order total, so sales = total − tax', async () => {
    const csv = [
      'order-id,posted-date,amount-type,amount,ship-state,ship-city,ship-postal-code',
      '222-1,2026-04-01,ItemPrice Principal,100.00,WA,Seattle,98101',
      '222-1,2026-04-01,ItemPrice Tax,10.10,,,',
    ].join('\n')
    await POST(upload(csv))
    const create = (vi.mocked(prisma.importedOrder.upsert).mock.calls[0][0] as { create: { totalAmount: number; taxAmount: number; subtotal: number; shippingState: string } }).create
    expect(create.totalAmount).toBeCloseTo(110.1)
    expect(create.taxAmount).toBeCloseTo(10.1)
    expect(create.subtotal).toBeCloseTo(100)
    expect(create.shippingState).toBe('WA')
  })

  it('checks nexus thresholds after importing, like a store sync', async () => {
    const csv = ['Order ID,Date,Total,Tax,State', '333-1,2026-05-01,10,0,OH'].join('\n')
    await POST(upload(csv))
    expect(checkAndCreateAlerts).toHaveBeenCalledWith('user-1')
  })
})
