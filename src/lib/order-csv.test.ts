import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  parseDate,
  parseMoney,
  detectFormat,
  parseOrderFile,
  combineOrderFiles,
  isNotASale,
  type ParsedOrderFile,
} from './order-csv'

function ok(result: ReturnType<typeof parseOrderFile>): ParsedOrderFile {
  if ('error' in result) throw new Error(result.error)
  return result
}

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields, CRLF and a BOM', () => {
    const text = '﻿a,b,c\r\n1,"two, 2","say ""hi"""\r\n3,"multi\nline",x\r\n\r\n'
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'two, 2', 'say "hi"'],
      ['3', 'multi\nline', 'x'],
    ])
  })
})

describe('parseMoney', () => {
  it('reads common money formats', () => {
    expect(parseMoney('$1,234.56')).toBe(1234.56)
    expect(parseMoney('1234')).toBe(1234)
    expect(parseMoney('(12.50)')).toBe(-12.5)
    expect(parseMoney('-3.00')).toBe(-3)
    expect(parseMoney('1.234,56')).toBe(1234.56)
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('n/a')).toBeNull()
  })
})

describe('parseDate', () => {
  it('reads store date formats', () => {
    expect(parseDate('2026-03-01 10:15:00 -0500')?.toISOString()).toBe('2026-03-01T15:15:00.000Z')
    expect(parseDate('2026-03-01T10:15:00Z')?.toISOString()).toBe('2026-03-01T10:15:00.000Z')
    expect(parseDate('2026-03-01')?.toISOString()).toBe('2026-03-01T00:00:00.000Z')
    expect(parseDate('03/01/2026')?.toISOString()).toBe('2026-03-01T12:00:00.000Z')
    expect(parseDate('3/1/26')?.toISOString()).toBe('2026-03-01T12:00:00.000Z')
    expect(parseDate('Mar 1, 2026')?.toISOString()).toBe('2026-03-01T12:00:00.000Z')
    expect(parseDate('nonsense')).toBeNull()
  })
})

describe('Shopify orders export', () => {
  const csv = [
    'Name,Email,Financial Status,Paid at,Fulfillment Status,Currency,Subtotal,Shipping,Taxes,Total,Created at,Lineitem quantity,Lineitem name,Shipping Province,Shipping Country,Cancelled at,Refunded Amount',
    '#1001,a@example.com,paid,2026-03-01 10:15:00 -0500,fulfilled,USD,100.00,5.00,8.25,113.25,2026-03-01 10:15:00 -0500,1,Mug,CA,US,,0.00',
    '#1001,,,,,,,,,,,1,Second item,,,,',
    '#1002,b@example.com,paid,,,USD,50.00,0,0,50.00,2026-03-02 09:00:00 -0500,1,Tee,Texas,US,,10.00',
    '#1003,c@example.com,voided,,,USD,20.00,0,0,20.00,2026-03-03 09:00:00 -0500,1,Tee,NY,US,,',
    '#1004,d@example.com,paid,,,CAD,20.00,0,0,20.00,2026-03-04 09:00:00 -0500,1,Tee,ON,CA,,',
  ].join('\n')

  it('is detected', () => {
    expect(detectFormat(parseCsv(csv)[0])).toBe('shopify')
  })

  it('groups line items into orders, subtracts tax and refunds, skips voided and non-US orders', () => {
    const r = ok(parseOrderFile(csv))
    expect(r.format).toBe('shopify')
    expect(r.channel).toBe('direct')
    expect(r.orders).toEqual([
      { date: new Date('2026-03-01T15:15:00Z'), stateCode: 'CA', sales: 105, channel: 'direct', orderId: '#1001' },
      { date: new Date('2026-03-02T14:00:00Z'), stateCode: 'TX', sales: 40, channel: 'direct', orderId: '#1002' },
    ])
    expect(r.skipped).toMatchObject({ notSales: 1, outsideUS: 1 })
    expect(r.missingTax).toBe(false)
  })

  it('counts partly refunded orders (minus the refund) and uses the billing address when nothing shipped', () => {
    const file = [
      'Name,Financial Status,Taxes,Total,Created at,Lineitem name,Billing Province,Billing Country,Shipping Province,Shipping Country,Refunded Amount',
      '#2001,partially_refunded,0,80.00,2026-04-01 10:00:00 -0500,Mug,WA,US,WA,US,30.00',
      '#2002,paid,0,25.00,2026-04-02 10:00:00 -0500,E-book,OR,US,,,0',
      '#2003,paid,0,25.00,2026-04-03 10:00:00 -0500,E-book,ON,CA,,,0',
      '#2004,refunded,0,25.00,2026-04-04 10:00:00 -0500,E-book,OR,US,,,25.00',
    ].join('\n')
    const r = ok(parseOrderFile(file))
    expect(r.orders.map((o) => [o.orderId, o.stateCode, o.sales])).toEqual([
      ['#2001', 'WA', 50],
      ['#2002', 'OR', 25],
    ])
    expect(r.skipped).toMatchObject({ outsideUS: 1, notSales: 1 })
  })
})

describe('isNotASale', () => {
  it('drops cancelled, refunded and failed orders but keeps partly refunded ones', () => {
    expect(isNotASale('cancelled')).toBe(true)
    expect(isNotASale('Refunded')).toBe(true)
    expect(isNotASale('wc-failed')).toBe(true)
    expect(isNotASale('Pending payment')).toBe(true)
    expect(isNotASale('partially_refunded')).toBe(false)
    expect(isNotASale('Partially Refunded')).toBe(false)
    expect(isNotASale('paid')).toBe(false)
    expect(isNotASale('')).toBe(false)
  })
})

describe('Amazon order report (tab separated)', () => {
  const tsv = [
    ['amazon-order-id', 'purchase-date', 'order-status', 'item-price', 'item-tax', 'shipping-price', 'shipping-tax', 'ship-state', 'ship-country'].join('\t'),
    ['111-1', '2026-02-10T18:00:00+00:00', 'Shipped', '20.00', '1.60', '4.00', '0.32', 'WA', 'US'].join('\t'),
    ['111-1', '2026-02-10T18:00:00+00:00', 'Shipped', '10.00', '0.80', '0', '0', 'WA', 'US'].join('\t'),
    ['111-2', '2026-02-11T18:00:00+00:00', 'Cancelled', '99.00', '0', '0', '0', 'OR', 'US'].join('\t'),
    ['111-3', '2026-02-12T18:00:00+00:00', 'Shipped', '15.00', '0', '0', '0', 'florida', 'US'].join('\t'),
  ].join('\n')

  it('is detected and treated as marketplace sales; prices already exclude tax', () => {
    const r = ok(parseOrderFile(tsv))
    expect(r.format).toBe('amazon')
    expect(r.channel).toBe('marketplace')
    expect(r.orders).toHaveLength(2)
    expect(r.orders[0]).toMatchObject({ stateCode: 'WA', sales: 34, channel: 'marketplace' })
    expect(r.orders[1]).toMatchObject({ stateCode: 'FL', sales: 15 })
    expect(r.skipped.notSales).toBe(1)
  })

  it('subtracts promotions, leaves out cancelled items and orders Amazon only shipped for another channel', () => {
    const report = [
      ['amazon-order-id', 'purchase-date', 'order-status', 'sales-channel', 'item-status', 'item-price', 'item-tax', 'shipping-price', 'shipping-tax', 'item-promotion-discount', 'ship-promotion-discount', 'ship-state', 'ship-country'].join('\t'),
      ['222-1', '2026-02-10T18:00:00+00:00', 'Shipped', 'Amazon.com', 'Shipped', '50.00', '4.00', '5.00', '0', '-10.00', '5.00', 'TX', 'US'].join('\t'),
      ['222-1', '2026-02-10T18:00:00+00:00', 'Shipped', 'Amazon.com', 'Cancelled', '20.00', '0', '0', '0', '0', '0', 'TX', 'US'].join('\t'),
      ['222-2', '2026-02-11T18:00:00+00:00', 'Shipped', 'Non-Amazon', 'Shipped', '99.00', '0', '0', '0', '0', '0', 'TX', 'US'].join('\t'),
    ].join('\n')
    const r = ok(parseOrderFile(report))
    expect(r.orders.map((o) => [o.orderId, o.sales])).toEqual([['222-1', 40]])
    expect(r.skipped.otherChannel).toBe(1)
  })
})

describe('Etsy sold orders export', () => {
  const csv = [
    'Sale Date,Order ID,Number of Items,Ship City,Ship State,Ship Zipcode,Ship Country,Currency,Order Value,Shipping,Sales Tax,Order Total,Status',
    '03/05/26,3001,1,Austin,TX,78701,United States,USD,40.00,5.00,3.00,48.00,Completed',
    '03/06/26,3002,1,Boise,Idaho,83702,United States,USD,20.00,0,1.20,21.20,Completed',
  ].join('\n')

  it('is detected and treated as marketplace sales', () => {
    const r = ok(parseOrderFile(csv))
    expect(r.format).toBe('etsy')
    expect(r.channel).toBe('marketplace')
    expect(r.orders.map((o) => [o.stateCode, o.sales])).toEqual([
      ['TX', 45],
      ['ID', 20],
    ])
  })
})

describe('generic export (e.g. a WooCommerce export plugin)', () => {
  const csv = [
    'Order Number,Order Status,Order Date,State Code (Shipping),Country Code (Shipping),Order Total Amount,Order Total Tax Amount',
    '501,completed,2026-01-15 12:00:00,GA,US,108.00,8.00',
    '502,refunded,2026-01-16 12:00:00,GA,US,50.00,0',
    '503,processing,2026-01-17 12:00:00,,US,20.00,0',
  ].join('\n')

  it('finds the columns by name', () => {
    const r = ok(parseOrderFile(csv))
    expect(r.format).toBe('generic')
    expect(r.orders).toEqual([
      { date: new Date('2026-01-15T12:00:00Z'), stateCode: 'GA', sales: 100, channel: 'direct', orderId: '501' },
    ])
    expect(r.skipped).toMatchObject({ notSales: 1, noState: 1 })
  })

  it('lets the seller mark a generic file as marketplace sales', () => {
    const r = ok(parseOrderFile(csv, { channel: 'marketplace' }))
    expect(r.orders[0].channel).toBe('marketplace')
  })

  it('notes when there is no tax column', () => {
    const r = ok(parseOrderFile('Date,State,Total\n2026-01-01,CA,10'))
    expect(r.missingTax).toBe(true)
    expect(r.orders[0].sales).toBe(10)
  })

  it('does not treat a customer "Name" column as an order id', () => {
    const r = ok(parseOrderFile('Name,Date,State,Total\nPat Lee,2026-01-01,CA,10\nPat Lee,2026-02-01,CA,15'))
    expect(r.orders.map((o) => o.sales)).toEqual([10, 15])
    expect(r.orders.every((o) => o.orderId === null)).toBe(true)
  })

  it('explains what is missing when columns are not found', () => {
    const r = parseOrderFile('Foo,Bar\n1,2')
    expect('error' in r && r.error).toMatch(/order date, a ship-to state and an order total/)
  })
})

describe('combineOrderFiles', () => {
  it('counts an order once when two exports overlap, and keeps rows without ids', () => {
    const header = 'Name,Financial Status,Taxes,Total,Created at,Shipping Province,Shipping Country'
    const lastYear = ok(parseOrderFile([header, '#1,paid,0,10,2025-05-01,CA,US', '#2,paid,0,20,2025-06-01,CA,US'].join('\n')))
    const allOrders = ok(parseOrderFile([header, '#2,paid,0,20,2025-06-01,CA,US', '#3,paid,0,30,2026-01-01,CA,US'].join('\n')))
    const noIds = ok(parseOrderFile('Date,State,Total\n2026-01-01,TX,5\n2026-01-01,TX,5'))
    const { orders, duplicates } = combineOrderFiles([lastYear, allOrders, noIds])
    expect(duplicates).toBe(1)
    expect(orders.map((o) => o.sales)).toEqual([10, 20, 30, 5, 5])
    expect(orders[0]).not.toHaveProperty('orderId')
  })
})
