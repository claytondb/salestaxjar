import { describe, it, expect } from 'vitest'
import { HANDOFF_MAX_ORDERS, clearScanHandoff, loadScanHandoff, saveScanHandoff } from './scan-handoff'
import type { ImportBatch } from './order-file-import'

function memoryStore() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  }
}

const batch = (n: number, platform: ImportBatch['platform'] = 'shopify'): ImportBatch => ({
  platform,
  orders: Array.from({ length: n }, (_, i) => ({ id: String(i), date: '2026-05-01T00:00:00.000Z', state: 'TX', sales: 10, tax: 1 })),
})

describe('scan handoff', () => {
  it('keeps the checked orders for the import after sign-up', () => {
    const store = memoryStore()
    const now = Date.UTC(2026, 8, 29)
    expect(saveScanHandoff(['orders.csv'], [batch(3), batch(2, 'etsy')], store, now)).toBe(true)
    const loaded = loadScanHandoff(store, now + 60_000)
    expect(loaded).toMatchObject({ files: ['orders.csv'], orders: 5 })
    expect(loaded?.batches.map((b) => b.platform)).toEqual(['shopify', 'etsy'])
    clearScanHandoff(store)
    expect(loadScanHandoff(store, now)).toBeNull()
  })

  it('forgets it after a day, and ignores anything malformed', () => {
    const store = memoryStore()
    const now = Date.UTC(2026, 8, 29)
    saveScanHandoff(['orders.csv'], [batch(1)], store, now)
    expect(loadScanHandoff(store, now + 25 * 3600_000)).toBeNull()
    expect(store.data.size).toBe(0)

    store.setItem('sails:free-check-orders', JSON.stringify({ savedAt: now, files: [], batches: [{ platform: 'ebay', orders: [] }] }))
    expect(loadScanHandoff(store, now)).toBeNull()
    store.setItem('sails:free-check-orders', '{not json')
    expect(loadScanHandoff(store, now)).toBeNull()
  })

  it('skips very large scans and storage errors instead of failing', () => {
    const store = memoryStore()
    expect(saveScanHandoff(['big.csv'], [batch(HANDOFF_MAX_ORDERS + 1)], store)).toBe(false)
    expect(store.data.size).toBe(0)
    const full = { ...memoryStore(), setItem: () => { throw new Error('QuotaExceededError') } }
    expect(saveScanHandoff(['a.csv'], [batch(1)], full)).toBe(false)
    expect(saveScanHandoff(['a.csv'], [batch(1)], null)).toBe(false)
    expect(loadScanHandoff(null)).toBeNull()
  })
})
