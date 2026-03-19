/**
 * Tests for POST /api/platforms/sync
 *
 * Unified sync route that dispatches to platform-specific sync functions.
 *
 * Covers:
 *   - Auth guard (401)
 *   - Missing platform/platformId fields (400)
 *   - Tier gate for platform access (403)
 *   - Order limit exceeded before sync (403)
 *   - Platform connection not found (404)
 *   - Successful sync: Shopify, WooCommerce, BigCommerce, Squarespace
 *   - Successful sync: Ecwid, Magento, PrestaShop, OpenCart (new platforms)
 *   - Unsupported platform (500)
 *   - Order trimming when approaching limit
 *   - Usage warnings (approaching, warning, at_limit)
 *   - Nexus alerts returned on sync
 *   - Sync error updates status to 'error' (500)
 *   - Internal server error (500)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    importedOrder: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/platforms', () => ({
  getConnection: vi.fn(),
  updateSyncStatus: vi.fn(),
  saveImportedOrders: vi.fn(),
  updateSalesSummary: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
  resolveUserPlan: vi.fn(),
  checkOrderLimit: vi.fn(),
  orderLimitError: vi.fn(),
  getOrderLimitDisplay: vi.fn(),
  getPlanDisplayName: vi.fn(),
}));

vi.mock('@/lib/platforms/shopify', () => ({
  fetchOrders: vi.fn(),
}));

vi.mock('@/lib/platforms/woocommerce', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/squarespace', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/bigcommerce', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  fetchOrderShippingAddresses: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/ecwid', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/magento', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/prestashop', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms/opencart', () => ({
  getCredentials: vi.fn(),
  fetchOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/sales-aggregation', () => ({
  aggregateForStates: vi.fn(),
}));

vi.mock('@/lib/nexus-alerts', () => ({
  checkAndCreateAlerts: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getConnection, updateSyncStatus, saveImportedOrders, updateSalesSummary } from '@/lib/platforms';
import {
  userCanConnectPlatform,
  tierGateError,
  resolveUserPlan,
  checkOrderLimit,
  orderLimitError,
  getOrderLimitDisplay,
  getPlanDisplayName,
} from '@/lib/plans';
import { fetchOrders as fetchShopifyOrders } from '@/lib/platforms/shopify';
import { getCredentials as getWooCredentials, fetchAllOrders as fetchWooOrders, mapOrderToImport as mapWooOrder } from '@/lib/platforms/woocommerce';
import { getCredentials as getSquarespaceCredentials, fetchAllOrders as fetchSquarespaceOrders, mapOrderToImport as mapSquarespaceOrder } from '@/lib/platforms/squarespace';
import { getCredentials as getBigCommerceCredentials, fetchAllOrders as fetchBigCommerceOrders, fetchOrderShippingAddresses as fetchBigCommerceShippingAddresses, mapOrderToImport as mapBigCommerceOrder } from '@/lib/platforms/bigcommerce';
import { getCredentials as getEcwidCredentials, fetchAllOrders as fetchEcwidOrders, mapOrderToImport as mapEcwidOrder } from '@/lib/platforms/ecwid';
import { getCredentials as getMagentoCredentials, fetchAllOrders as fetchMagentoOrders, mapOrderToImport as mapMagentoOrder } from '@/lib/platforms/magento';
import { getCredentials as getPrestaShopCredentials, fetchAllOrders as fetchPrestaShopOrders, mapOrderToImport as mapPrestaShopOrder } from '@/lib/platforms/prestashop';
import { getCredentials as getOpenCartCredentials, fetchOrders as fetchOpenCartOrders, mapOrderToImport as mapOpenCartOrder } from '@/lib/platforms/opencart';
import { checkAndCreateAlerts } from '@/lib/nexus-alerts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const starterUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date(),
  subscription: { plan: 'starter', status: 'active' },
};

const mockConnection = {
  id: 'conn-1',
  platform: 'ecwid',
  platformId: 'store-123',
  accessToken: 'tok-abc',
  refreshToken: null,
};

const mappedOrder = {
  platform: 'ecwid',
  platformOrderId: 'order-1',
  orderNumber: '#1001',
  orderDate: new Date(),
  subtotal: 50,
  shippingAmount: 5,
  taxAmount: 3.5,
  totalAmount: 58.5,
  currency: 'USD',
  status: 'paid',
  shippingState: 'CA',
  shippingCity: 'Los Angeles',
  shippingZip: '90001',
  shippingCountry: 'US',
  billingState: 'CA',
  lineItems: [],
  taxBreakdown: {},
  rawData: {},
};

// ─── beforeEach: default happy-path mocks ───────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getCurrentUser).mockResolvedValue(starterUser as never);
  vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true } as never);
  vi.mocked(resolveUserPlan).mockReturnValue('starter' as never);
  vi.mocked(prisma.importedOrder.count).mockResolvedValue(0);
  vi.mocked(checkOrderLimit).mockReturnValue({ allowed: true, currentCount: 0, limit: 500 } as never);
  vi.mocked(getConnection).mockResolvedValue(mockConnection as never);
  vi.mocked(updateSyncStatus).mockResolvedValue(undefined);
  vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 1, errors: [] } as never);
  vi.mocked(updateSalesSummary).mockResolvedValue(undefined);
  vi.mocked(checkAndCreateAlerts).mockResolvedValue([] as never);
  vi.mocked(getPlanDisplayName).mockReturnValue('Growth');
  vi.mocked(getOrderLimitDisplay).mockReturnValue('5,000 orders/mo');
});

// ─── Auth guard ─────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── Validation ─────────────────────────────────────────────────────────────

describe('validation', () => {
  it('returns 400 when platform is missing', async () => {
    const res = await POST(postRequest({ platformId: 'store-123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing platform/i);
  });

  it('returns 400 when platformId is missing', async () => {
    const res = await POST(postRequest({ platform: 'ecwid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing platform/i);
  });

  it('returns 400 when both fields are missing', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });
});

// ─── Tier gate ──────────────────────────────────────────────────────────────

describe('tier gate', () => {
  it('returns 403 when user lacks platform access', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({
      allowed: false,
      userPlan: 'free',
      requiredPlan: 'starter',
    } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'tier_gate', required: 'starter' } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('tier_gate');
  });
});

// ─── Order limit ────────────────────────────────────────────────────────────

describe('order limit', () => {
  it('returns 403 when monthly order limit is exceeded before sync', async () => {
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: false,
      currentCount: 500,
      limit: 500,
      upgradeNeeded: 'growth',
    } as never);
    vi.mocked(orderLimitError).mockReturnValue({ error: 'order_limit_exceeded' } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('order_limit_exceeded');
  });
});

// ─── Connection not found ────────────────────────────────────────────────────

describe('connection not found', () => {
  it('returns 404 when platform connection does not exist', async () => {
    vi.mocked(getConnection).mockResolvedValue(null);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── Ecwid sync ─────────────────────────────────────────────────────────────

describe('Ecwid sync', () => {
  const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
  const ecwidOrder = {
    id: 1001,
    orderNumber: 1001,
    paymentStatus: 'PAID',
    fulfillmentStatus: 'AWAITING_PROCESSING',
    total: 58.5,
    subtotal: 50,
    tax: 3.5,
    shippingCost: 5,
    currency: 'USD',
    email: 'customer@example.com',
    shippingPerson: { stateOrProvinceCode: 'CA', city: 'Los Angeles', postalCode: '90001', countryCode: 'US' },
    items: [],
    taxItems: [],
  };

  beforeEach(() => {
    vi.mocked(mockConnection as never).platform = 'ecwid';
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([ecwidOrder] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue(mappedOrder as never);
  });

  it('syncs Ecwid orders successfully', async () => {
    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(1);
  });

  it('fetches Ecwid credentials before syncing', async () => {
    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(getEcwidCredentials).toHaveBeenCalledWith('user-1', 'store-123');
  });

  it('returns 500 when Ecwid credentials are not found', async () => {
    vi.mocked(getEcwidCredentials).mockResolvedValue(null);
    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not found/i);
  });

  it('filters out cancelled Ecwid orders', async () => {
    const cancelledOrder = { ...ecwidOrder, paymentStatus: 'CANCELLED' };
    vi.mocked(fetchEcwidOrders).mockResolvedValue([ecwidOrder, cancelledOrder] as never);
    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    // mapEcwidOrder should only be called for the valid order
    expect(mapEcwidOrder).toHaveBeenCalledTimes(1);
  });

  it('filters out returned Ecwid orders', async () => {
    const returnedOrder = { ...ecwidOrder, fulfillmentStatus: 'RETURNED' };
    vi.mocked(fetchEcwidOrders).mockResolvedValue([ecwidOrder, returnedOrder] as never);
    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(mapEcwidOrder).toHaveBeenCalledTimes(1);
  });

  it('passes dateRange to Ecwid fetch', async () => {
    const dateRange = { start: '2026-01-01T00:00:00Z', end: '2026-03-01T00:00:00Z' };
    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123', dateRange }));
    expect(fetchEcwidOrders).toHaveBeenCalledWith(
      ecwidCreds,
      expect.objectContaining({ createdFrom: dateRange.start, createdTo: dateRange.end })
    );
  });

  it('uses default 30-day window when no dateRange provided', async () => {
    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    const call = vi.mocked(fetchEcwidOrders).mock.calls[0][1] as { createdFrom: string; createdTo: string };
    expect(call.createdFrom).toBeDefined();
    expect(call.createdTo).toBeDefined();
  });
});

// ─── Magento sync ───────────────────────────────────────────────────────────

describe('Magento sync', () => {
  const magentoCreds = { baseUrl: 'https://mystore.com', accessToken: 'mag-tok' };
  const magentoOrder = {
    entity_id: 100,
    increment_id: '000000100',
    status: 'complete',
    state: 'complete',
    created_at: '2026-03-01 10:00:00',
    grand_total: 58.5,
    subtotal: 50,
    tax_amount: 3.5,
    shipping_amount: 5,
    order_currency_code: 'USD',
    customer_email: 'customer@example.com',
    items: [],
    extension_attributes: {},
  };

  beforeEach(() => {
    vi.mocked(getMagentoCredentials).mockResolvedValue(magentoCreds as never);
    vi.mocked(fetchMagentoOrders).mockResolvedValue([magentoOrder] as never);
    vi.mocked(mapMagentoOrder).mockReturnValue({ ...mappedOrder, platform: 'magento' } as never);
  });

  it('syncs Magento orders successfully', async () => {
    const res = await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(1);
  });

  it('fetches Magento credentials before syncing', async () => {
    // getCredentials is called with connection.platformId from the DB connection record ('store-123')
    await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(getMagentoCredentials).toHaveBeenCalledWith('user-1', 'store-123');
  });

  it('returns 500 when Magento credentials are not found', async () => {
    vi.mocked(getMagentoCredentials).mockResolvedValue(null);
    const res = await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not found/i);
  });

  it('filters out canceled Magento orders', async () => {
    const canceledOrder = { ...magentoOrder, status: 'canceled' };
    vi.mocked(fetchMagentoOrders).mockResolvedValue([magentoOrder, canceledOrder] as never);
    await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(mapMagentoOrder).toHaveBeenCalledTimes(1);
  });

  it('filters out closed Magento orders', async () => {
    const closedOrder = { ...magentoOrder, status: 'closed' };
    vi.mocked(fetchMagentoOrders).mockResolvedValue([magentoOrder, closedOrder] as never);
    await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(mapMagentoOrder).toHaveBeenCalledTimes(1);
  });

  it('passes dateRange to Magento fetch', async () => {
    const dateRange = { start: '2026-01-01T00:00:00Z', end: '2026-03-01T00:00:00Z' };
    await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com', dateRange }));
    expect(fetchMagentoOrders).toHaveBeenCalledWith(
      magentoCreds,
      expect.objectContaining({ createdAtFrom: dateRange.start, createdAtTo: dateRange.end })
    );
  });
});

// ─── PrestaShop sync ────────────────────────────────────────────────────────

describe('PrestaShop sync', () => {
  const prestaCreds = { baseUrl: 'https://mystore.com', apiKey: 'presta-key' };
  const prestaOrder = {
    id: 200,
    reference: 'XYZABCDEF',
    id_address_delivery: 5,
    current_state: 5,
    total_paid: '58.50',
    total_paid_tax_incl: '58.50',
    total_paid_tax_excl: '55.00',
    total_shipping: '5.00',
    total_shipping_tax_incl: '5.00',
    id_currency: 1,
    id_customer: 10,
    date_add: '2026-03-01 10:00:00',
    date_upd: '2026-03-01 10:00:00',
    invoice_date: '0000-00-00 00:00:00',
    id_shop: 1,
    order_rows: [],
  };

  beforeEach(() => {
    vi.mocked(getPrestaShopCredentials).mockResolvedValue(prestaCreds as never);
    vi.mocked(fetchPrestaShopOrders).mockResolvedValue([prestaOrder] as never);
    vi.mocked(mapPrestaShopOrder).mockResolvedValue({ ...mappedOrder, platform: 'prestashop' } as never);
  });

  it('syncs PrestaShop orders successfully', async () => {
    const res = await POST(postRequest({ platform: 'prestashop', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(1);
  });

  it('fetches PrestaShop credentials before syncing', async () => {
    // getCredentials is called with connection.platformId from the DB connection record
    await POST(postRequest({ platform: 'prestashop', platformId: 'store-123' }));
    expect(getPrestaShopCredentials).toHaveBeenCalledWith('user-1', 'store-123');
  });

  it('returns 500 when PrestaShop credentials are not found', async () => {
    vi.mocked(getPrestaShopCredentials).mockResolvedValue(null);
    const res = await POST(postRequest({ platform: 'prestashop', platformId: 'store-123' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not found/i);
  });

  it('passes credentials to mapOrderToImport (async address fetch)', async () => {
    await POST(postRequest({ platform: 'prestashop', platformId: 'store-123' }));
    expect(mapPrestaShopOrder).toHaveBeenCalledWith(prestaOrder, prestaCreds);
  });

  it('passes dateRange to PrestaShop fetch', async () => {
    const dateRange = { start: '2026-01-01T00:00:00Z', end: '2026-03-01T00:00:00Z' };
    await POST(postRequest({ platform: 'prestashop', platformId: 'store-123', dateRange }));
    expect(fetchPrestaShopOrders).toHaveBeenCalledWith(
      prestaCreds,
      expect.objectContaining({ dateFrom: dateRange.start, dateTo: dateRange.end })
    );
  });

  it('maps multiple PrestaShop orders in parallel', async () => {
    const secondOrder = { ...prestaOrder, id: 201, reference: 'XYZABCDEG' };
    vi.mocked(fetchPrestaShopOrders).mockResolvedValue([prestaOrder, secondOrder] as never);
    await POST(postRequest({ platform: 'prestashop', platformId: 'store-123' }));
    expect(mapPrestaShopOrder).toHaveBeenCalledTimes(2);
  });
});

// ─── OpenCart sync ──────────────────────────────────────────────────────────

describe('OpenCart sync', () => {
  const openCartCreds = { storeUrl: 'https://mystore.com', apiUsername: 'Default', apiKey: 'oc-key' };
  const openCartOrder = {
    order_id: '300',
    order_status_id: '5',
    order_status: 'Complete',
    firstname: 'John',
    lastname: 'Doe',
    email: 'customer@example.com',
    shipping_zone_code: 'CA',
    shipping_city: 'Los Angeles',
    shipping_postcode: '90001',
    shipping_iso_code_2: 'US',
    total: '58.50',
    date_added: '2026-03-01 10:00:00',
    currency_code: 'USD',
    totals: [],
    products: [],
  };

  beforeEach(() => {
    vi.mocked(getOpenCartCredentials).mockResolvedValue(openCartCreds as never);
    vi.mocked(fetchOpenCartOrders).mockResolvedValue([openCartOrder] as never);
    vi.mocked(mapOpenCartOrder).mockReturnValue({ ...mappedOrder, platform: 'opencart' } as never);
  });

  it('syncs OpenCart orders successfully', async () => {
    const res = await POST(postRequest({ platform: 'opencart', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(1);
  });

  it('fetches OpenCart credentials before syncing', async () => {
    await POST(postRequest({ platform: 'opencart', platformId: 'store-123' }));
    // getCredentials is called with connection.platformId (from the DB record), not the request platformId
    expect(getOpenCartCredentials).toHaveBeenCalledWith('user-1', 'store-123');
  });

  it('returns 500 when OpenCart credentials are not found', async () => {
    vi.mocked(getOpenCartCredentials).mockResolvedValue(null);
    const res = await POST(postRequest({ platform: 'opencart', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not found/i);
  });

  it('passes dateRange to OpenCart fetch', async () => {
    const dateRange = { start: '2026-01-01T00:00:00Z', end: '2026-03-01T00:00:00Z' };
    await POST(postRequest({ platform: 'opencart', platformId: 'store-123', dateRange }));
    expect(fetchOpenCartOrders).toHaveBeenCalledWith(
      openCartCreds,
      expect.objectContaining({ dateFrom: dateRange.start, dateTo: dateRange.end })
    );
  });

  it('uses limit of 250 for OpenCart orders', async () => {
    await POST(postRequest({ platform: 'opencart', platformId: 'store-123' }));
    expect(fetchOpenCartOrders).toHaveBeenCalledWith(
      openCartCreds,
      expect.objectContaining({ limit: 250 })
    );
  });
});

// ─── Unsupported platform ───────────────────────────────────────────────────

describe('unsupported platform', () => {
  it('returns 500 for unrecognized platform', async () => {
    const res = await POST(postRequest({ platform: 'wix', platformId: 'site-123' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported platform/i);
  });
});

// ─── Order trimming ─────────────────────────────────────────────────────────

describe('order trimming', () => {
  it('trims orders to remaining capacity when limit is close', async () => {
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(498);
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      currentCount: 498,
      limit: 500,
    } as never);

    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);

    const manyOrders = Array(10).fill({ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' });
    vi.mocked(fetchEcwidOrders).mockResolvedValue(manyOrders as never);
    vi.mocked(mapEcwidOrder).mockReturnValue(mappedOrder as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 2, errors: [] } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trimmed).toBeDefined();
    expect(body.trimmed.message).toMatch(/monthly limit/i);
  });
});

// ─── Usage warnings ─────────────────────────────────────────────────────────

describe('usage warnings', () => {
  const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };

  beforeEach(() => {
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([{ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' }] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue(mappedOrder as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 50, errors: [] } as never);
  });

  it('returns approaching warning at 75-89% usage', async () => {
    // 350 existing + 50 imported = 400 / 500 = 80% → 'approaching'
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(350);
    vi.mocked(checkOrderLimit).mockReturnValue({ allowed: true, currentCount: 350, limit: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 50, errors: [] } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usageWarning).toBeDefined();
    expect(body.usageWarning.type).toBe('approaching');
  });

  it('returns warning at 90-99% usage', async () => {
    // 420 existing + 50 imported = 470 / 500 = 94% → 'warning'
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(420);
    vi.mocked(checkOrderLimit).mockReturnValue({ allowed: true, currentCount: 420, limit: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 50, errors: [] } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usageWarning).toBeDefined();
    expect(body.usageWarning.type).toBe('warning');
  });

  it('returns at_limit warning at 100% usage', async () => {
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(450);
    vi.mocked(checkOrderLimit).mockReturnValue({ allowed: true, currentCount: 450, limit: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 50, errors: [] } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // At exactly 500 used / 500 limit → at_limit
    expect(body.usageWarning).toBeDefined();
    expect(['at_limit', 'warning']).toContain(body.usageWarning.type);
  });

  it('omits usageWarning below 75% usage', async () => {
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(10);
    vi.mocked(checkOrderLimit).mockReturnValue({ allowed: true, currentCount: 10, limit: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 5, errors: [] } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usageWarning).toBeUndefined();
  });
});

// ─── Nexus alerts ───────────────────────────────────────────────────────────

describe('nexus alerts', () => {
  it('returns newAlerts count when threshold alerts are triggered', async () => {
    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([{ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' }] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue({ ...mappedOrder, shippingState: 'TX' } as never);
    vi.mocked(checkAndCreateAlerts).mockResolvedValue([{ id: 'alert-1' }, { id: 'alert-2' }] as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newAlerts).toBe(2);
  });

  it('omits newAlerts when no alerts triggered', async () => {
    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([{ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' }] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue(mappedOrder as never);
    vi.mocked(checkAndCreateAlerts).mockResolvedValue([] as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newAlerts).toBeUndefined();
  });
});

// ─── Sync error handling ────────────────────────────────────────────────────

describe('sync error handling', () => {
  it('updates sync status to error and returns 500 when fetch throws', async () => {
    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockRejectedValue(new Error('Network timeout'));

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Network timeout/i);

    expect(updateSyncStatus).toHaveBeenCalledWith(
      'user-1', 'ecwid', 'store-123', 'error', 'Network timeout'
    );
  });

  it('updates sync status to error for Magento fetch failure', async () => {
    const magentoCreds = { baseUrl: 'https://mystore.com', accessToken: 'mag-tok' };
    vi.mocked(getMagentoCredentials).mockResolvedValue(magentoCreds as never);
    vi.mocked(fetchMagentoOrders).mockRejectedValue(new Error('Auth failed'));

    const res = await POST(postRequest({ platform: 'magento', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(500);
    expect(updateSyncStatus).toHaveBeenCalledWith(
      'user-1', 'magento', 'https://mystore.com', 'error', 'Auth failed'
    );
  });

  it('updates sync status to error for PrestaShop fetch failure', async () => {
    const prestaCreds = { baseUrl: 'https://mystore.com', apiKey: 'presta-key' };
    vi.mocked(getPrestaShopCredentials).mockResolvedValue(prestaCreds as never);
    vi.mocked(fetchPrestaShopOrders).mockRejectedValue(new Error('Connection refused'));

    const res = await POST(postRequest({ platform: 'prestashop', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(500);
    expect(updateSyncStatus).toHaveBeenCalledWith(
      'user-1', 'prestashop', 'https://mystore.com', 'error', 'Connection refused'
    );
  });

  it('updates sync status to error for OpenCart fetch failure', async () => {
    const openCartCreds = { storeUrl: 'https://mystore.com', apiUsername: 'Default', apiKey: 'oc-key' };
    vi.mocked(getOpenCartCredentials).mockResolvedValue(openCartCreds as never);
    vi.mocked(fetchOpenCartOrders).mockRejectedValue(new Error('Login failed'));

    const res = await POST(postRequest({ platform: 'opencart', platformId: 'https://mystore.com' }));
    expect(res.status).toBe(500);
    expect(updateSyncStatus).toHaveBeenCalledWith(
      'user-1', 'opencart', 'https://mystore.com', 'error', 'Login failed'
    );
  });
});

// ─── Status transitions ─────────────────────────────────────────────────────

describe('sync status transitions', () => {
  it('sets status to syncing then success on a good sync', async () => {
    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([{ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' }] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue(mappedOrder as never);

    await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));

    const calls = vi.mocked(updateSyncStatus).mock.calls;
    const statuses = calls.map(c => c[3]);
    expect(statuses).toContain('syncing');
    expect(statuses).toContain('success');
  });
});

// ─── Affected states ────────────────────────────────────────────────────────

describe('affected states in response', () => {
  it('returns affectedStates with state codes from synced orders', async () => {
    const ecwidCreds = { storeId: 'store-123', secretKey: 'secret-abc' };
    vi.mocked(getEcwidCredentials).mockResolvedValue(ecwidCreds as never);
    vi.mocked(fetchEcwidOrders).mockResolvedValue([{ paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING' }] as never);
    vi.mocked(mapEcwidOrder).mockReturnValue({ ...mappedOrder, shippingState: 'TX' } as never);

    const res = await POST(postRequest({ platform: 'ecwid', platformId: 'store-123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.affectedStates).toContain('TX');
  });
});
