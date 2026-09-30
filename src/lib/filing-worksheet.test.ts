import { describe, it, expect } from 'vitest'
import { buildFilingWorksheet, worksheetCsv, worksheetRange, type WorksheetOrder } from './filing-worksheet'

const q3 = {
  stateCode: 'TX',
  stateName: 'Texas',
  period: 'quarterly',
  periodStart: new Date('2026-07-01T00:00:00Z'),
  periodEnd: new Date('2026-09-30T00:00:00Z'),
}
const afterQ3 = new Date('2026-10-05T12:00:00Z')
const latest = { direct: new Date('2026-10-04T10:00:00Z'), marketplace: new Date('2026-10-01T00:00:00Z') }

describe('worksheetRange', () => {
  it('covers every day of the period, including the last one', () => {
    const { start, endExclusive } = worksheetRange(q3)
    expect(start.toISOString()).toBe('2026-07-01T00:00:00.000Z')
    expect(endExclusive.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })
})

describe('buildFilingWorksheet', () => {
  it('adds up the state’s orders by channel, whatever the state is stored as', () => {
    const w = buildFilingWorksheet(
      q3,
      [
        { state: 'TX', platform: 'shopify', orders: 3, sales: 300.1, shipping: 15, tax: 24.76 },
        { state: 'Texas', platform: 'woocommerce', orders: 1, sales: 50, shipping: 5, tax: 4.13 },
        { state: 'TX', platform: 'amazon', orders: 2, sales: 80, shipping: 0, tax: 6.6 },
        { state: 'CA', platform: 'shopify', orders: 9, sales: 999, shipping: 0, tax: 80 },
      ],
      latest,
      afterQ3
    )
    expect(w.periodLabel).toBe('Q3 2026')
    expect(w.periodStart).toBe('2026-07-01')
    expect(w.periodEnd).toBe('2026-09-30')
    expect(w.direct).toEqual({ orders: 4, sales: 350.1, shipping: 20, tax: 28.89 })
    expect(w.marketplace).toEqual({ orders: 2, sales: 80, shipping: 0, tax: 6.6 })
    expect(w.warnings).toEqual([])
  })

  it('warns when the period isn’t over or the orders stop early', () => {
    const during = buildFilingWorksheet(q3, [], latest, new Date('2026-09-15T00:00:00Z'))
    expect(during.warnings[0]).toMatch(/isn't over yet \(it ends Sep 30, 2026\)/)

    const stale = buildFilingWorksheet(q3, [], { direct: new Date('2026-09-10T00:00:00Z') }, afterQ3)
    expect(stale.warnings[0]).toMatch(/newest store order in Sails is from Sep 10, 2026/)

    const none = buildFilingWorksheet(q3, [], {}, afterQ3)
    expect(none.warnings[0]).toMatch(/no orders from your own store yet/)
  })

  it('points out store orders with no sales tax on them', () => {
    const w = buildFilingWorksheet(q3, [{ state: 'TX', platform: 'shopify', orders: 2, sales: 100, shipping: 0, tax: 0 }], latest, afterQ3)
    expect(w.warnings).toEqual([expect.stringMatching(/None of these Texas orders show sales tax/)])
  })
})

describe('worksheetCsv', () => {
  const order = (extra: Partial<WorksheetOrder>): WorksheetOrder => ({
    orderDate: new Date('2026-08-02T15:00:00Z'),
    orderNumber: '#1001',
    platformOrderId: '5550001',
    platform: 'shopify',
    shippingState: 'TX',
    shippingCity: 'Austin',
    shippingZip: '78701',
    totalAmount: 108.25,
    taxAmount: 8.25,
    shippingAmount: 5,
    ...extra,
  })

  it('lists the state’s orders oldest first, with sales excluding tax', () => {
    const csv = worksheetCsv(q3, [
      order({ orderDate: new Date('2026-09-01T00:00:00Z'), orderNumber: null, platform: 'amazon', platformOrderId: '112-1' }),
      order({}),
      order({ shippingState: 'CA', orderNumber: '#9999' }),
    ])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('Order date,Order number,Sold through,Channel,Ship-to state,City,ZIP,Sales (excl. tax),Shipping,Sales tax,Order total')
    expect(lines.slice(1)).toEqual([
      '2026-08-02,#1001,shopify,Own store,TX,Austin,78701,100.00,5.00,8.25,108.25',
      '2026-09-01,112-1,amazon,Marketplace,TX,Austin,78701,100.00,5.00,8.25,108.25',
    ])
  })

  it('quotes commas and keeps spreadsheet formulas from running', () => {
    const csv = worksheetCsv(q3, [order({ orderNumber: '=HYPERLINK("x")', shippingCity: 'Fort Worth, TX' })])
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('"Fort Worth, TX"')
  })
})
