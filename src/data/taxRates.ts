// US State Sales Tax Rates (2026)
// 
// IMPORTANT DISCLAIMER:
// These rates are ESTIMATES based on publicly available data and should not be
// relied upon for tax filing purposes. Always verify with official state sources.
//
// Sources:
// - Tax Foundation (taxfoundation.org)
// - State Departments of Revenue
// - Sales Tax Institute
//
// Last Updated: September 25, 2026 (Tax Foundation "State and Local Sales Tax
// Rates, Midyear 2026", published July 6, 2026 — rates as of July 1, 2026):
// https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/
// Effective Date: July 1, 2026
//
// Note: These are BASE state rates combined with AVERAGE local rates.
// Actual local taxes vary significantly by city, county, and special district.
// Some products may be exempt or have reduced rates not reflected here.

export interface TaxRate {
  state: string;
  stateCode: string;
  stateRate: number;
  avgLocalRate: number;
  combinedRate: number;
  hasLocalTax: boolean;
  notes?: string;
}

// Metadata about the tax rate data
export const taxRateMetadata = {
  lastUpdated: "2026-09-25",
  effectiveDate: "2026-07-01",
  // Tax Foundation publishes January rates each year (usually in February).
  nextScheduledUpdate: "2027-02-15",
  sources: [
    { name: "Tax Foundation", url: "https://taxfoundation.org/", description: "State and local sales tax rates" },
    { name: "Sales Tax Institute", url: "https://www.salestaxinstitute.com/", description: "Sales tax research and resources" },
    { name: "State DOR websites", url: null, description: "Individual state departments of revenue" },
  ],
  disclaimer: "Tax rates are estimates based on publicly available data. Actual rates may vary by jurisdiction. This is not tax advice. Consult a qualified tax professional.",
  localTaxNote: "Local rates shown are state-wide averages. Actual local taxes (city, county, special district) may be higher or lower depending on the specific location.",
  exemptionNote: "Product category exemptions are simplified. Many states have complex exemption rules based on price thresholds, specific product types, or intended use.",
};

export const stateTaxRates: TaxRate[] = [
  { state: "Alabama", stateCode: "AL", stateRate: 4.00, avgLocalRate: 5.46, combinedRate: 9.46, hasLocalTax: true },
  { state: "Alaska", stateCode: "AK", stateRate: 0.00, avgLocalRate: 1.82, combinedRate: 1.82, hasLocalTax: true, notes: "No state tax, local only" },
  { state: "Arizona", stateCode: "AZ", stateRate: 5.60, avgLocalRate: 2.94, combinedRate: 8.54, hasLocalTax: true },
  { state: "Arkansas", stateCode: "AR", stateRate: 6.50, avgLocalRate: 2.98, combinedRate: 9.48, hasLocalTax: true },
  { state: "California", stateCode: "CA", stateRate: 7.25, avgLocalRate: 1.78, combinedRate: 9.03, hasLocalTax: true },
  { state: "Colorado", stateCode: "CO", stateRate: 2.90, avgLocalRate: 4.99, combinedRate: 7.89, hasLocalTax: true },
  { state: "Connecticut", stateCode: "CT", stateRate: 6.35, avgLocalRate: 0.00, combinedRate: 6.35, hasLocalTax: false },
  { state: "Delaware", stateCode: "DE", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Florida", stateCode: "FL", stateRate: 6.00, avgLocalRate: 0.98, combinedRate: 6.98, hasLocalTax: true },
  { state: "Georgia", stateCode: "GA", stateRate: 4.00, avgLocalRate: 3.56, combinedRate: 7.56, hasLocalTax: true },
  { state: "Hawaii", stateCode: "HI", stateRate: 4.00, avgLocalRate: 0.50, combinedRate: 4.50, hasLocalTax: true, notes: "GET tax, not traditional sales tax" },
  { state: "Idaho", stateCode: "ID", stateRate: 6.00, avgLocalRate: 0.03, combinedRate: 6.03, hasLocalTax: true },
  { state: "Illinois", stateCode: "IL", stateRate: 6.25, avgLocalRate: 2.73, combinedRate: 8.98, hasLocalTax: true },
  { state: "Indiana", stateCode: "IN", stateRate: 7.00, avgLocalRate: 0.00, combinedRate: 7.00, hasLocalTax: false },
  { state: "Iowa", stateCode: "IA", stateRate: 6.00, avgLocalRate: 0.94, combinedRate: 6.94, hasLocalTax: true },
  { state: "Kansas", stateCode: "KS", stateRate: 6.50, avgLocalRate: 2.21, combinedRate: 8.71, hasLocalTax: true },
  { state: "Kentucky", stateCode: "KY", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Louisiana", stateCode: "LA", stateRate: 5.00, avgLocalRate: 5.13, combinedRate: 10.13, hasLocalTax: true },
  { state: "Maine", stateCode: "ME", stateRate: 5.50, avgLocalRate: 0.00, combinedRate: 5.50, hasLocalTax: false },
  { state: "Maryland", stateCode: "MD", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Massachusetts", stateCode: "MA", stateRate: 6.25, avgLocalRate: 0.00, combinedRate: 6.25, hasLocalTax: false },
  { state: "Michigan", stateCode: "MI", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Minnesota", stateCode: "MN", stateRate: 6.875, avgLocalRate: 1.26, combinedRate: 8.135, hasLocalTax: true },
  { state: "Mississippi", stateCode: "MS", stateRate: 7.00, avgLocalRate: 0.06, combinedRate: 7.06, hasLocalTax: true },
  { state: "Missouri", stateCode: "MO", stateRate: 4.225, avgLocalRate: 4.22, combinedRate: 8.445, hasLocalTax: true },
  { state: "Montana", stateCode: "MT", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Nebraska", stateCode: "NE", stateRate: 5.50, avgLocalRate: 1.48, combinedRate: 6.98, hasLocalTax: true },
  { state: "Nevada", stateCode: "NV", stateRate: 6.85, avgLocalRate: 1.39, combinedRate: 8.24, hasLocalTax: true },
  { state: "New Hampshire", stateCode: "NH", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "New Jersey", stateCode: "NJ", stateRate: 6.625, avgLocalRate: 0.00, combinedRate: 6.625, hasLocalTax: false, notes: "Some Urban Enterprise Zones charge a reduced rate" },
  { state: "New Mexico", stateCode: "NM", stateRate: 4.875, avgLocalRate: 2.80, combinedRate: 7.675, hasLocalTax: true, notes: "Gross receipts tax" },
  { state: "New York", stateCode: "NY", stateRate: 4.00, avgLocalRate: 4.54, combinedRate: 8.54, hasLocalTax: true },
  { state: "North Carolina", stateCode: "NC", stateRate: 4.75, avgLocalRate: 2.35, combinedRate: 7.10, hasLocalTax: true },
  { state: "North Dakota", stateCode: "ND", stateRate: 5.00, avgLocalRate: 2.09, combinedRate: 7.09, hasLocalTax: true },
  { state: "Ohio", stateCode: "OH", stateRate: 5.75, avgLocalRate: 1.54, combinedRate: 7.29, hasLocalTax: true },
  { state: "Oklahoma", stateCode: "OK", stateRate: 4.50, avgLocalRate: 4.56, combinedRate: 9.06, hasLocalTax: true },
  { state: "Oregon", stateCode: "OR", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Pennsylvania", stateCode: "PA", stateRate: 6.00, avgLocalRate: 0.34, combinedRate: 6.34, hasLocalTax: true },
  { state: "Rhode Island", stateCode: "RI", stateRate: 7.00, avgLocalRate: 0.00, combinedRate: 7.00, hasLocalTax: false },
  { state: "South Carolina", stateCode: "SC", stateRate: 6.00, avgLocalRate: 1.49, combinedRate: 7.49, hasLocalTax: true },
  { state: "South Dakota", stateCode: "SD", stateRate: 4.20, avgLocalRate: 1.91, combinedRate: 6.11, hasLocalTax: true },
  { state: "Tennessee", stateCode: "TN", stateRate: 7.00, avgLocalRate: 2.61, combinedRate: 9.61, hasLocalTax: true },
  { state: "Texas", stateCode: "TX", stateRate: 6.25, avgLocalRate: 1.95, combinedRate: 8.20, hasLocalTax: true },
  { state: "Utah", stateCode: "UT", stateRate: 6.10, avgLocalRate: 1.32, combinedRate: 7.42, hasLocalTax: true },
  { state: "Vermont", stateCode: "VT", stateRate: 6.00, avgLocalRate: 0.43, combinedRate: 6.43, hasLocalTax: true },
  { state: "Virginia", stateCode: "VA", stateRate: 5.30, avgLocalRate: 0.47, combinedRate: 5.77, hasLocalTax: true },
  { state: "Washington", stateCode: "WA", stateRate: 6.50, avgLocalRate: 3.07, combinedRate: 9.57, hasLocalTax: true },
  { state: "West Virginia", stateCode: "WV", stateRate: 6.00, avgLocalRate: 0.60, combinedRate: 6.60, hasLocalTax: true },
  { state: "Wisconsin", stateCode: "WI", stateRate: 5.00, avgLocalRate: 0.72, combinedRate: 5.72, hasLocalTax: true },
  { state: "Wyoming", stateCode: "WY", stateRate: 4.00, avgLocalRate: 1.39, combinedRate: 5.39, hasLocalTax: true },
  { state: "District of Columbia", stateCode: "DC", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
];

export const getStateByCode = (code: string): TaxRate | undefined => {
  return stateTaxRates.find(s => s.stateCode.toUpperCase() === code.toUpperCase());
};

export const getNoTaxStates = (): TaxRate[] => {
  return stateTaxRates.filter(s => s.stateRate === 0);
};

export const getHighestTaxStates = (limit: number = 5): TaxRate[] => {
  return [...stateTaxRates].sort((a, b) => b.combinedRate - a.combinedRate).slice(0, limit);
};

export const calculateTax = (amount: number, stateCode: string): { tax: number; total: number; rate: number } | null => {
  const state = getStateByCode(stateCode);
  if (!state) return null;
  
  const tax = amount * (state.combinedRate / 100);
  return {
    tax: Math.round(tax * 100) / 100,
    total: Math.round((amount + tax) * 100) / 100,
    rate: state.combinedRate
  };
};
