import { prisma } from './prisma';
import { stateTaxRates, getStateByCode } from '@/data/taxRates';
import type { ProductCategory } from '@/types';
import { categoryModifiers } from '@/types';

// TaxJar API configuration
const TAXJAR_API_KEY = process.env.TAXJAR_API_KEY;
const TAXJAR_API_URL = process.env.TAXJAR_API_URL || 'https://api.taxjar.com/v2';

// Check if TaxJar is configured
export function isTaxJarConfigured(): boolean {
  return !!TAXJAR_API_KEY;
}

// Interface definitions
export interface TaxAddress {
  street?: string;
  city?: string;
  state: string;
  zip?: string;
  country?: string;
}

export interface TaxCalculationRequest {
  amount: number;
  shipping?: number;
  toAddress: TaxAddress;
  fromAddress?: TaxAddress;
  category?: ProductCategory;
  nexusAddresses?: TaxAddress[];
}

export interface TaxCalculationResult {
  taxableAmount: number;
  taxAmount: number;
  rate: number;
  total: number;
  breakdown?: {
    stateRate: number;
    countyRate: number;
    cityRate: number;
    specialRate: number;
  };
  source: 'taxjar' | 'local' | 'cache';
}

export interface TaxRateResult {
  stateCode: string;
  zip?: string;
  city?: string;
  combinedRate: number;
  stateRate: number;
  countyRate: number;
  cityRate: number;
  specialRate: number;
  source: 'taxjar' | 'local' | 'cache';
}

// =============================================================================
// Tax Calculation
// =============================================================================

export async function calculateTax(
  request: TaxCalculationRequest
): Promise<TaxCalculationResult> {
  // Try TaxJar API first if configured
  if (isTaxJarConfigured()) {
    try {
      const result = await calculateTaxWithTaxJar(request);
      return result;
    } catch (error) {
      console.error('TaxJar API error, falling back to local rates:', error);
    }
  }

  // Fall back to local calculation
  return calculateTaxLocally(request);
}

// Calculate tax using TaxJar API
async function calculateTaxWithTaxJar(
  request: TaxCalculationRequest
): Promise<TaxCalculationResult> {
  const response = await fetch(`${TAXJAR_API_URL}/taxes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TAXJAR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to_country: request.toAddress.country || 'US',
      to_zip: request.toAddress.zip,
      to_state: request.toAddress.state,
      to_city: request.toAddress.city,
      to_street: request.toAddress.street,
      from_country: request.fromAddress?.country || 'US',
      from_zip: request.fromAddress?.zip,
      from_state: request.fromAddress?.state,
      from_city: request.fromAddress?.city,
      from_street: request.fromAddress?.street,
      amount: request.amount,
      shipping: request.shipping || 0,
      nexus_addresses: request.nexusAddresses?.map(addr => ({
        country: addr.country || 'US',
        state: addr.state,
        zip: addr.zip,
        city: addr.city,
        street: addr.street,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TaxJar API error: ${error}`);
  }

  const data = await response.json();
  const tax = data.tax;

  return {
    taxableAmount: tax.taxable_amount,
    taxAmount: tax.amount_to_collect,
    rate: tax.rate,
    total: request.amount + tax.amount_to_collect,
    breakdown: tax.breakdown ? {
      stateRate: tax.breakdown.state_tax_rate || 0,
      countyRate: tax.breakdown.county_tax_rate || 0,
      cityRate: tax.breakdown.city_tax_rate || 0,
      specialRate: tax.breakdown.special_tax_rate || 0,
    } : undefined,
    source: 'taxjar',
  };
}

// Calculate tax using local rates
function calculateTaxLocally(request: TaxCalculationRequest): TaxCalculationResult {
  const stateCode = request.toAddress.state.toUpperCase();
  const state = getStateByCode(stateCode);

  if (!state) {
    return {
      taxableAmount: request.amount,
      taxAmount: 0,
      rate: 0,
      total: request.amount,
      source: 'local',
    };
  }

  // Get base rate
  let rate = state.combinedRate;

  // Apply category modifier if applicable
  if (request.category && request.category !== 'general') {
    const modifiers = categoryModifiers[stateCode];
    if (modifiers && request.category in modifiers) {
      const modifier = modifiers[request.category as keyof typeof modifiers];
      if (modifier !== undefined) {
        rate = state.combinedRate * modifier;
      }
    }
  }

  const taxAmount = Math.round(request.amount * (rate / 100) * 100) / 100;

  return {
    taxableAmount: request.amount,
    taxAmount,
    rate: rate / 100,
    total: Math.round((request.amount + taxAmount) * 100) / 100,
    breakdown: {
      stateRate: state.stateRate / 100,
      countyRate: 0,
      cityRate: 0,
      specialRate: state.avgLocalRate / 100,
    },
    source: 'local',
  };
}

// =============================================================================
// Tax Rate Lookup
// =============================================================================

export async function getTaxRate(params: {
  stateCode: string;
  zip?: string;
  city?: string;
}): Promise<TaxRateResult> {
  // Check cache first
  const cached = await getCachedRate(params.stateCode, params.zip, params.city);
  if (cached) {
    return cached;
  }

  // Try TaxJar API
  if (isTaxJarConfigured() && params.zip) {
    try {
      const result = await getRateFromTaxJar(params);
      // Cache the result
      await cacheRate(result);
      return result;
    } catch (error) {
      console.error('TaxJar rate lookup error:', error);
    }
  }

  // Fall back to local rates
  return getLocalRate(params.stateCode);
}

// Get rate from TaxJar API
async function getRateFromTaxJar(params: {
  stateCode: string;
  zip?: string;
  city?: string;
}): Promise<TaxRateResult> {
  const searchParams = new URLSearchParams({
    country: 'US',
    state: params.stateCode,
  });
  
  if (params.zip) searchParams.append('zip', params.zip);
  if (params.city) searchParams.append('city', params.city);

  const response = await fetch(
    `${TAXJAR_API_URL}/rates/${params.zip || params.stateCode}?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${TAXJAR_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TaxJar rate lookup failed: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rate;

  return {
    stateCode: params.stateCode,
    zip: params.zip,
    city: params.city || rate.city,
    combinedRate: parseFloat(rate.combined_rate),
    stateRate: parseFloat(rate.state_rate),
    countyRate: parseFloat(rate.county_rate || '0'),
    cityRate: parseFloat(rate.city_rate || '0'),
    specialRate: parseFloat(rate.special_rate || '0'),
    source: 'taxjar',
  };
}

// Get rate from local data
function getLocalRate(stateCode: string): TaxRateResult {
  const state = getStateByCode(stateCode);

  if (!state) {
    return {
      stateCode,
      combinedRate: 0,
      stateRate: 0,
      countyRate: 0,
      cityRate: 0,
      specialRate: 0,
      source: 'local',
    };
  }

  return {
    stateCode: state.stateCode,
    combinedRate: state.combinedRate / 100,
    stateRate: state.stateRate / 100,
    countyRate: 0,
    cityRate: 0,
    specialRate: state.avgLocalRate / 100,
    source: 'local',
  };
}

// =============================================================================
// Rate Caching
// =============================================================================

const CACHE_DURATION_DAYS = 7;

async function getCachedRate(
  stateCode: string,
  zip?: string,
  city?: string
): Promise<TaxRateResult | null> {
  try {
    const cached = await prisma.taxRateCache.findFirst({
      where: {
        stateCode,
        zipCode: zip || null,
        city: city || null,
        validUntil: { gt: new Date() },
      },
    });

    if (!cached) return null;

    return {
      stateCode: cached.stateCode,
      zip: cached.zipCode || undefined,
      city: cached.city || undefined,
      combinedRate: Number(cached.combinedRate),
      stateRate: Number(cached.stateRate),
      countyRate: Number(cached.countyRate),
      cityRate: Number(cached.cityRate),
      specialRate: Number(cached.specialRate),
      source: 'cache',
    };
  } catch {
    return null;
  }
}

async function cacheRate(rate: TaxRateResult): Promise<void> {
  try {
    const validUntil = new Date(Date.now() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.taxRateCache.upsert({
      where: {
        stateCode_zipCode_city: {
          stateCode: rate.stateCode,
          zipCode: rate.zip || '',
          city: rate.city || '',
        },
      },
      create: {
        stateCode: rate.stateCode,
        zipCode: rate.zip || null,
        city: rate.city || null,
        combinedRate: rate.combinedRate,
        stateRate: rate.stateRate,
        countyRate: rate.countyRate,
        cityRate: rate.cityRate,
        specialRate: rate.specialRate,
        source: rate.source,
        validUntil,
      },
      update: {
        combinedRate: rate.combinedRate,
        stateRate: rate.stateRate,
        countyRate: rate.countyRate,
        cityRate: rate.cityRate,
        specialRate: rate.specialRate,
        source: rate.source,
        validUntil,
      },
    });
  } catch (error) {
    console.error('Failed to cache rate:', error);
  }
}

// =============================================================================
// Bulk Operations
// =============================================================================

export async function calculateBulkTax(
  requests: TaxCalculationRequest[]
): Promise<TaxCalculationResult[]> {
  // Process in parallel with rate limiting
  const results: TaxCalculationResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(calculateTax));
    results.push(...batchResults);
  }

  return results;
}

// Get all state rates (for display purposes)
export function getAllStateRates(): Array<{
  state: string;
  stateCode: string;
  combinedRate: number;
  stateRate: number;
  avgLocalRate: number;
  hasLocalTax: boolean;
}> {
  return stateTaxRates.map(state => ({
    state: state.state,
    stateCode: state.stateCode,
    combinedRate: state.combinedRate,
    stateRate: state.stateRate,
    avgLocalRate: state.avgLocalRate,
    hasLocalTax: state.hasLocalTax,
  }));
}
