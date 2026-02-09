/**
 * Public Tax Calculation API (v1)
 * 
 * POST /api/v1/tax/calculate
 * 
 * Authentication: Bearer token (API key)
 * Header: Authorization: Bearer stax_xxxxx
 * 
 * Used by WooCommerce plugin, BigCommerce app, and other integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apikeys';
import { calculateTax } from '@/lib/taxjar';
import { getStateByCode } from '@/data/taxRates';
import { prisma } from '@/lib/prisma';
import type { ProductCategory } from '@/types';

// CORS headers for external requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'Missing or invalid Authorization header',
          hint: 'Use: Authorization: Bearer stax_your_api_key'
        },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const apiKey = authHeader.substring(7); // Remove "Bearer "
    
    // Validate API key
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check permissions
    if (!validation.permissions?.includes('calculate')) {
      return NextResponse.json(
        { error: 'API key does not have calculate permission' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Fetch user's business and nexus states for TaxJar
    let nexusAddresses: Array<{ state: string; zip?: string; city?: string }> = [];
    let businessAddress: { state: string; zip?: string; city?: string } | undefined;
    
    if (validation.userId) {
      const business = await prisma.business.findFirst({
        where: { userId: validation.userId },
        include: {
          nexusStates: {
            where: { hasNexus: true },
            select: { stateCode: true },
          },
        },
      });
      
      if (business) {
        // Use business address as default from address
        if (business.state) {
          businessAddress = {
            state: business.state,
            zip: business.zip || undefined,
            city: business.city || undefined,
          };
        }
        
        // Build nexus addresses from registered nexus states
        nexusAddresses = business.nexusStates.map(n => ({
          state: n.stateCode,
        }));
        
        // Always include business state as nexus if not already there
        if (business.state && !nexusAddresses.find(n => n.state === business.state)) {
          nexusAddresses.push({
            state: business.state,
            zip: business.zip || undefined,
            city: business.city || undefined,
          });
        }
      }
    }
    
    // If no nexus states configured, assume nexus everywhere (recommended for e-commerce)
    // This will be populated with the destination state below after we parse the request
    const assumeNexusEverywhere = nexusAddresses.length === 0;
    
    // Parse request body
    const body = await request.json();
    
    // Support both snake_case (TaxJar style) and camelCase (WooCommerce plugin)
    const {
      // Required - support both naming conventions
      to_state: snakeToState,
      toState: camelToState,
      amount,
      // Optional
      to_zip: snakeToZip,
      toZip: camelToZip,
      to_city: snakeToCity,
      toCity: camelToCity,
      to_country: snakeToCountry,
      toCountry: camelToCountry,
      shipping,
      line_items,
      product_tax_code,
      // From address (optional, for origin-based states)
      from_state: snakeFromState,
      fromState: camelFromState,
      from_zip: snakeFromZip,
      fromZip: camelFromZip,
      from_city: snakeFromCity,
      fromCity: camelFromCity,
    } = body;
    
    // Normalize to preferred format (snake_case takes precedence)
    const to_state = snakeToState || camelToState;
    const to_zip = snakeToZip || camelToZip;
    const to_city = snakeToCity || camelToCity;
    const to_country = snakeToCountry || camelToCountry;
    const from_state = snakeFromState || camelFromState;
    const from_zip = snakeFromZip || camelFromZip;
    const from_city = snakeFromCity || camelFromCity;
    
    // Validate required fields
    if (!to_state || typeof to_state !== 'string') {
      return NextResponse.json(
        { error: 'to_state is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate state code
    const state = getStateByCode(to_state.toUpperCase());
    if (!state) {
      return NextResponse.json(
        { error: 'Invalid state code', provided: to_state },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Use request from_address, fall back to business address
    const effectiveFromAddress = from_state 
      ? { state: from_state.toUpperCase(), zip: from_zip, city: from_city }
      : businessAddress;
    
    // If assuming nexus everywhere, add the destination state as nexus
    // This ensures TaxJar calculates tax for any destination
    if (assumeNexusEverywhere) {
      nexusAddresses.push({ state: to_state.toUpperCase() });
    }
    
    // Calculate tax
    const result = await calculateTax({
      amount,
      shipping: shipping || 0,
      toAddress: {
        state: to_state.toUpperCase(),
        zip: to_zip,
        city: to_city,
        country: to_country || 'US',
      },
      fromAddress: effectiveFromAddress,
      category: (product_tax_code as ProductCategory) || 'general',
      nexusAddresses: nexusAddresses.length > 0 ? nexusAddresses : undefined,
    });
    
    // Calculate breakdown amounts from rates
    const taxableAmount = result.taxableAmount || amount;
    const stateAmount = taxableAmount * (result.breakdown?.stateRate || result.rate);
    const countyAmount = taxableAmount * (result.breakdown?.countyRate || 0);
    const cityAmount = taxableAmount * (result.breakdown?.cityRate || 0);
    const specialAmount = taxableAmount * (result.breakdown?.specialRate || 0);
    
    // Build response data in TaxJar-compatible format
    const taxData = {
      order_total_amount: amount + (shipping || 0),
      shipping: shipping || 0,
      taxable_amount: taxableAmount,
      amount_to_collect: result.taxAmount,
      rate: result.rate,
      has_nexus: true,
      freight_taxable: false,
      tax_source: result.source,
      jurisdictions: {
        state: to_state.toUpperCase(),
        city: to_city,
      },
      breakdown: {
        state_taxable_amount: taxableAmount,
        state_tax_rate: result.breakdown?.stateRate || result.rate,
        state_tax_collectable: stateAmount,
        county_taxable_amount: countyAmount > 0 ? taxableAmount : 0,
        county_tax_rate: result.breakdown?.countyRate || 0,
        county_tax_collectable: countyAmount,
        city_taxable_amount: cityAmount > 0 ? taxableAmount : 0,
        city_tax_rate: result.breakdown?.cityRate || 0,
        city_tax_collectable: cityAmount,
        special_district_taxable_amount: specialAmount > 0 ? taxableAmount : 0,
        special_tax_rate: result.breakdown?.specialRate || 0,
        special_district_tax_collectable: specialAmount,
        combined_tax_rate: result.rate,
        line_items: line_items?.map((item: any, index: number) => ({
          id: item.id || String(index),
          taxable_amount: item.unit_price * item.quantity,
          tax_collectable: (item.unit_price * item.quantity) * result.rate,
          combined_tax_rate: result.rate,
        })),
      },
    };
    
    // Determine confidence level based on data source
    let confidence = 'state_only';
    let message = 'Tax rate is an estimate based on state averages.';
    
    if (to_zip && result.source === 'taxjar') {
      confidence = 'exact_zip';
      message = '';
    } else if (to_zip) {
      confidence = 'zip_estimate';
      message = 'Tax rate estimated for your ZIP code area.';
    }
    
    // Build simplified response for WooCommerce plugin
    const simpleData = {
      taxAmount: result.taxAmount,
      rate: result.rate,
      confidence,
      message,
    };
    
    // Return response in both WooCommerce plugin format and TaxJar format
    return NextResponse.json({
      success: true,
      data: { ...simpleData, ...taxData },  // For WooCommerce plugin (simple fields + full breakdown)
      tax: taxData,   // For TaxJar-style integrations
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Tax calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
