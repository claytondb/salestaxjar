import { describe, it, expect } from 'vitest'
import { parseOrderFile, type ParsedOrderFile } from './order-csv'
import {
  buildImportBatches,
  countImportOrders,
  estimateOverLimit,
  importIdFor,
  platformForFile,
  runImportBatches,
  type ImportBatchResult,
} from './order-file-import'

function ok(result: ReturnType<typeof parseOrderFile>): ParsedOrderFile {
  if ('error' in result) throw new Error(result.error)
  return result
}

const shopify = [
  'Name,Financial Status,Taxes,Total,Created at,Lineitem name,Shipping Province,Shipping Country,Id',
  '#1001,paid,1.00,21.00,2026-05-01 10:00:00 -0500,Mug,CA,US,5550001',
  '#1001,,,,,Coaster,,,',
  '#1002,paid,0,10.00,2026-05-02 10:00:00 -0500,Tee,TX,US,5550002',
].join('\n')
const shopifyOverlap = [
  'Name,Financial Status,Taxes,Total,Created at,Lineitem name,Shipping Province,Shipping Country,Id',
  '#1002,paid,0,10.00,2026-05-02 10:00:00 -0500,Tee,TX,US,5550002',
  '#1003,paid,0,30.00,2026-05-03 10:00:00 -0500,Hat,NY,US,5550003',
].join('\n')
const generic = 'Date,State,Total,Tax\n2026-01-01,CA,10,1\n2026-01-02,TX,20,0'

describe('platformForFile', () => {
  it('stores known exports under their platform, and generic files by channel', () => {
    expect(platformForFile('shopify', 'direct')).toBe('shopify')
    expect(platformForFile('amazon', 'marketplace')).toBe('amazon')
    expect(platformForFile('etsy', 'marketplace')).toBe('etsy')
    expect(platformForFile('generic', 'direct')).toBe('upload')
    expect(platformForFile('generic', 'marketplace')).toBe('upload-marketplace')
  })
})

describe('importIdFor', () => {
  it("uses Shopify's numeric id so a file and a store sync update the same order", () => {
    const [first] = ok(parseOrderFile(shopify)).orders
    expect(importIdFor(first, 'shopify')).toBe('5550001')
  })

  it('gives rows without ids a stable id, so re-importing the same file does not duplicate', () => {
    const a = ok(parseOrderFile(generic)).orders.map((o) => importIdFor(o, 'generic'))
    const b = ok(parseOrderFile(generic)).orders.map((o) => importIdFor(o, 'generic'))
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(2)
    expect(a[0]).toMatch(/^row-/)
  })
})

describe('buildImportBatches', () => {
  it('drops orders repeated across overlapping files and keeps only the needed fields', () => {
    const batches = buildImportBatches([ok(parseOrderFile(shopify)), ok(parseOrderFile(shopifyOverlap)), ok(parseOrderFile(generic))])
    expect(batches.map((b) => [b.platform, b.orders.length])).toEqual([
      ['shopify', 3],
      ['upload', 2],
    ])
    expect(batches[0].orders[0]).toEqual({ id: '5550001', number: '#1001', date: '2026-05-01T15:00:00.000Z', state: 'CA', sales: 20, tax: 1 })
    expect(Object.keys(batches[0].orders[0]).sort()).toEqual(['date', 'id', 'number', 'sales', 'state', 'tax'])
    // Generic rows with no id: no order number to keep
    expect(Object.keys(batches[1].orders[0]).sort()).toEqual(['date', 'id', 'sales', 'state', 'tax'])
  })

  it('splits big imports into request-sized batches, oldest first', () => {
    const rows = ['Order ID,Date,State,Total']
    for (let i = 0; i < 25; i++) rows.push(`${i},2026-01-${String((i % 28) + 1).padStart(2, '0')},CA,${i + 1}`)
    const batches = buildImportBatches([ok(parseOrderFile(rows.join('\n')))], 10)
    expect(batches.map((b) => b.orders.length)).toEqual([10, 10, 5])
    expect(countImportOrders(batches)).toBe(25)
    const dates = batches.flatMap((b) => b.orders.map((o) => o.date))
    expect([...dates].sort()).toEqual(dates)
  })

  it('moves a generic file to the marketplace platform when the seller says so', () => {
    const batches = buildImportBatches([ok(parseOrderFile(generic, { channel: 'marketplace' }))])
    expect(batches[0].platform).toBe('upload-marketplace')
  })
})

describe('estimateOverLimit', () => {
  const batch = (dates: string[]) => ({
    platform: 'upload' as const,
    orders: dates.map((date, i) => ({ id: String(i), date, state: 'CA', sales: 1, tax: 0 })),
  })

  it('counts the orders in months with more than the plan allows', () => {
    const jan = Array.from({ length: 5 }, () => '2026-01-10T00:00:00.000Z')
    const feb = Array.from({ length: 2 }, () => '2026-02-10T00:00:00.000Z')
    expect(estimateOverLimit([batch(jan), batch(feb)], 3)).toEqual({ months: 1, orders: 2 })
    expect(estimateOverLimit([batch(jan), batch(feb)], 5)).toEqual({ months: 0, orders: 0 })
  })

  it('never limits unlimited plans', () => {
    expect(estimateOverLimit([batch(['2026-01-10T00:00:00.000Z'])], null)).toEqual({ months: 0, orders: 0 })
  })
})

describe('runImportBatches', () => {
  const batches = buildImportBatches([ok(parseOrderFile(shopify)), ok(parseOrderFile(generic))])
  const reply = (extra: Partial<ImportBatchResult> = {}): ImportBatchResult => ({
    imported: 2,
    rejected: 0,
    failed: 0,
    skippedOverLimit: 0,
    monthlyLimit: 50,
    ...extra,
  })

  it('sends every batch, marks the last one final and adds up the results', async () => {
    const calls: [string, boolean][] = []
    const progress: number[] = []
    const { totals, error } = await runImportBatches(
      batches,
      async (b, final) => {
        calls.push([b.platform, final])
        return reply(final ? { newAlerts: 1, skippedOverLimit: 3 } : {})
      },
      (sent) => progress.push(sent)
    )
    expect(error).toBeNull()
    expect(calls).toEqual([
      ['shopify', false],
      ['upload', true],
    ])
    expect(totals).toMatchObject({ imported: 4, skippedOverLimit: 3, newAlerts: 1, monthlyLimit: 50, sent: 4 })
    expect(progress).toEqual([2, 4])
  })

  it('stops at the first failure and keeps what was saved', async () => {
    let call = 0
    const { totals, error } = await runImportBatches(batches, async () => {
      call++
      if (call === 2) throw new Error('Server busy')
      return reply()
    })
    expect(error).toBe('Server busy')
    expect(totals).toMatchObject({ imported: 2, sent: 2 })
  })
})
