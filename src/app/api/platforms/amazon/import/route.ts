import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import { parse } from 'csv-parse/sync';

/**
 * POST /api/platforms/amazon/import
 * 
 * Manually import Amazon tax data from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Tier gate: Amazon requires Pro or higher
    const access = userCanConnectPlatform(user, 'amazon');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_amazon'),
        { status: 403 }
      );
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();
    
    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid CSV format. Please upload a valid Amazon tax report.' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Detect report type and parse accordingly
    const columns = Object.keys(records[0]);
    const reportType = detectReportType(columns);
    
    if (!reportType) {
      return NextResponse.json(
        { error: 'Unrecognized report format. Please upload an Amazon Sales Tax Report or Transaction Report.' },
        { status: 400 }
      );
    }

    // Parse orders based on report type
    const orders = parseAmazonReport(records, reportType);
    
    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No valid orders found in the report' },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);

    // Get or create a manual import "connection" for this user
    let manualConnection = await prisma.platformConnection.findFirst({
      where: {
        userId: user.id,
        platform: 'amazon',
        platformId: 'manual-import',
      },
    });

    if (!manualConnection) {
      manualConnection = await prisma.platformConnection.create({
        data: {
          userId: user.id,
          platform: 'amazon',
          platformId: 'manual-import',
          platformName: 'Amazon (Manual Import)',
          accessToken: 'manual',
          refreshToken: 'manual',
          syncStatus: 'success',
        },
      });
    }

    // Save to database
    let ordersImported = 0;
    for (const order of orders) {
      try {
        await prisma.importedOrder.upsert({
          where: {
            platform_platformOrderId: {
              platform: 'amazon',
              platformOrderId: order.orderId,
            },
          },
          create: {
            userId: user.id,
            platformConnectionId: manualConnection.id,
            platform: 'amazon',
            platformOrderId: order.orderId,
            orderDate: order.orderDate,
            subtotal: order.totalAmount - order.taxAmount,
            shippingAmount: 0,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            currency: 'USD',
            status: 'imported',
            shippingState: order.state,
            shippingCity: order.city,
            shippingZip: order.zip,
            shippingCountry: 'US',
            rawData: JSON.stringify(order.raw),
          },
          update: {
            subtotal: order.totalAmount - order.taxAmount,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            shippingState: order.state,
            shippingCity: order.city,
            shippingZip: order.zip,
            rawData: JSON.stringify(order.raw),
            updatedAt: new Date(),
          },
        });
        ordersImported++;
      } catch (dbError) {
        console.error('Failed to save order:', order.orderId, dbError);
      }
    }

    // Update the manual connection's last sync time
    await prisma.platformConnection.update({
      where: { id: manualConnection.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      ordersImported,
      totalSales: Math.round(totalSales * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      reportType,
    });
  } catch (error) {
    console.error('Amazon import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Detect Amazon report type based on column headers
 */
function detectReportType(columns: string[]): string | null {
  const columnSet = new Set(columns.map(c => c.toLowerCase()));
  
  // Sales Tax Report
  if (columnSet.has('order-id') && columnSet.has('tax-collection-model')) {
    return 'sales-tax-report';
  }
  
  // Transaction Report / Date Range Report
  if (columnSet.has('order id') && columnSet.has('total')) {
    return 'transaction-report';
  }
  
  // Settlement Report
  if (columnSet.has('order-id') && columnSet.has('amount-type')) {
    return 'settlement-report';
  }
  
  // Generic order report
  if (columns.some(c => c.toLowerCase().includes('order')) && 
      columns.some(c => c.toLowerCase().includes('tax'))) {
    return 'generic';
  }
  
  return null;
}

interface ParsedOrder {
  orderId: string;
  orderDate: Date;
  totalAmount: number;
  taxAmount: number;
  state: string;
  city: string;
  zip: string;
  raw: Record<string, string>;
}

/**
 * Parse Amazon report based on type
 */
function parseAmazonReport(
  records: Record<string, string>[], 
  reportType: string
): ParsedOrder[] {
  const orders: ParsedOrder[] = [];
  const orderMap = new Map<string, ParsedOrder>();
  
  for (const record of records) {
    try {
      let orderId: string;
      let orderDate: Date;
      let totalAmount = 0;
      let taxAmount = 0;
      let state = '';
      let city = '';
      let zip = '';
      
      switch (reportType) {
        case 'sales-tax-report':
          orderId = record['order-id'] || record['Order ID'] || '';
          orderDate = parseDate(record['transaction-date'] || record['posting-date'] || '');
          totalAmount = parseAmount(record['total-price'] || record['item-price'] || '0');
          taxAmount = parseAmount(
            record['tax-collected'] || 
            record['state-tax-collected'] || 
            record['total-tax'] || 
            '0'
          );
          state = record['ship-state'] || record['state'] || '';
          city = record['ship-city'] || record['city'] || '';
          zip = record['ship-postal-code'] || record['zip'] || '';
          break;
          
        case 'transaction-report':
          orderId = record['Order ID'] || record['order id'] || '';
          orderDate = parseDate(record['Date'] || record['date'] || '');
          totalAmount = parseAmount(record['Total'] || record['total'] || '0');
          taxAmount = parseAmount(record['Tax'] || record['tax'] || '0');
          state = record['State'] || record['Shipping State'] || '';
          city = record['City'] || record['Shipping City'] || '';
          zip = record['Postal Code'] || record['Shipping Postal Code'] || '';
          break;
          
        case 'settlement-report':
          orderId = record['order-id'] || '';
          orderDate = parseDate(record['posted-date'] || '');
          // Settlement reports have multiple line items per order
          const amountType = record['amount-type'] || '';
          const amount = parseAmount(record['amount'] || '0');
          
          if (amountType.toLowerCase().includes('principal')) {
            totalAmount = amount;
          } else if (amountType.toLowerCase().includes('tax')) {
            taxAmount = amount;
          }
          
          state = record['ship-state'] || '';
          city = record['ship-city'] || '';
          zip = record['ship-postal-code'] || '';
          break;
          
        default:
          // Generic parsing - try common column names
          orderId = findValue(record, ['order-id', 'order id', 'orderid', 'order_id', 'amazon-order-id']);
          orderDate = parseDate(findValue(record, ['date', 'order-date', 'transaction-date', 'posted-date']));
          totalAmount = parseAmount(findValue(record, ['total', 'total-price', 'item-price', 'price', 'amount']));
          taxAmount = parseAmount(findValue(record, ['tax', 'tax-collected', 'total-tax', 'sales-tax', 'state-tax']));
          state = findValue(record, ['state', 'ship-state', 'shipping-state', 'ship-to-state']);
          city = findValue(record, ['city', 'ship-city', 'shipping-city']);
          zip = findValue(record, ['zip', 'postal-code', 'ship-postal-code', 'postal']);
      }
      
      if (!orderId || !orderDate || isNaN(orderDate.getTime())) {
        continue;
      }
      
      // Aggregate by order ID (some reports have multiple lines per order)
      if (orderMap.has(orderId)) {
        const existing = orderMap.get(orderId)!;
        existing.totalAmount += totalAmount;
        existing.taxAmount += taxAmount;
        // Keep first occurrence's address info
      } else {
        orderMap.set(orderId, {
          orderId,
          orderDate,
          totalAmount,
          taxAmount,
          state: state.toUpperCase().substring(0, 2),
          city,
          zip,
          raw: record,
        });
      }
    } catch (e) {
      // Skip malformed rows
      continue;
    }
  }
  
  return Array.from(orderMap.values());
}

/**
 * Find value from record using multiple possible column names
 */
function findValue(record: Record<string, string>, names: string[]): string {
  for (const name of names) {
    // Try exact match
    if (record[name]) return record[name];
    
    // Try case-insensitive
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase() === lowerName || key.toLowerCase().replace(/[^a-z]/g, '') === lowerName.replace(/[^a-z]/g, '')) {
        return value;
      }
    }
  }
  return '';
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  
  // Try ISO format first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try MM/DD/YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p, 10));
    
    // MM/DD/YYYY
    if (a <= 12 && b <= 31) {
      date = new Date(c, a - 1, b);
      if (!isNaN(date.getTime())) return date;
    }
    
    // YYYY/MM/DD
    if (a > 31) {
      date = new Date(a, b - 1, c);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return new Date(NaN);
}

/**
 * Parse amount string, handling currency symbols and formatting
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove currency symbols, spaces, and commas
  const cleaned = amountStr.replace(/[$£€\s,]/g, '');
  
  // Handle parentheses for negative numbers
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1)) || 0;
  }
  
  return parseFloat(cleaned) || 0;
}
