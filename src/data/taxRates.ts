// US State Sales Tax Rates (2024-2025)
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
// Last Updated: January 2025
// Effective Date: January 1, 2025
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
  lastUpdated: "2025-01-01",
  effectiveDate: "2025-01-01",
  nextScheduledUpdate: "2025-04-01",
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
  { state: "Alabama", stateCode: "AL", stateRate: 4.00, avgLocalRate: 5.24, combinedRate: 9.24, hasLocalTax: true },
  { state: "Alaska", stateCode: "AK", stateRate: 0.00, avgLocalRate: 1.82, combinedRate: 1.82, hasLocalTax: true, notes: "No state tax, local only" },
  { state: "Arizona", stateCode: "AZ", stateRate: 5.60, avgLocalRate: 2.80, combinedRate: 8.40, hasLocalTax: true },
  { state: "Arkansas", stateCode: "AR", stateRate: 6.50, avgLocalRate: 2.97, combinedRate: 9.47, hasLocalTax: true },
  { state: "California", stateCode: "CA", stateRate: 7.25, avgLocalRate: 1.57, combinedRate: 8.82, hasLocalTax: true },
  { state: "Colorado", stateCode: "CO", stateRate: 2.90, avgLocalRate: 4.87, combinedRate: 7.77, hasLocalTax: true },
  { state: "Connecticut", stateCode: "CT", stateRate: 6.35, avgLocalRate: 0.00, combinedRate: 6.35, hasLocalTax: false },
  { state: "Delaware", stateCode: "DE", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Florida", stateCode: "FL", stateRate: 6.00, avgLocalRate: 1.01, combinedRate: 7.01, hasLocalTax: true },
  { state: "Georgia", stateCode: "GA", stateRate: 4.00, avgLocalRate: 3.35, combinedRate: 7.35, hasLocalTax: true },
  { state: "Hawaii", stateCode: "HI", stateRate: 4.00, avgLocalRate: 0.44, combinedRate: 4.44, hasLocalTax: true, notes: "GET tax, not traditional sales tax" },
  { state: "Idaho", stateCode: "ID", stateRate: 6.00, avgLocalRate: 0.02, combinedRate: 6.02, hasLocalTax: true },
  { state: "Illinois", stateCode: "IL", stateRate: 6.25, avgLocalRate: 2.57, combinedRate: 8.82, hasLocalTax: true },
  { state: "Indiana", stateCode: "IN", stateRate: 7.00, avgLocalRate: 0.00, combinedRate: 7.00, hasLocalTax: false },
  { state: "Iowa", stateCode: "IA", stateRate: 6.00, avgLocalRate: 0.94, combinedRate: 6.94, hasLocalTax: true },
  { state: "Kansas", stateCode: "KS", stateRate: 6.50, avgLocalRate: 2.19, combinedRate: 8.69, hasLocalTax: true },
  { state: "Kentucky", stateCode: "KY", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Louisiana", stateCode: "LA", stateRate: 4.45, avgLocalRate: 5.10, combinedRate: 9.55, hasLocalTax: true },
  { state: "Maine", stateCode: "ME", stateRate: 5.50, avgLocalRate: 0.00, combinedRate: 5.50, hasLocalTax: false },
  { state: "Maryland", stateCode: "MD", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Massachusetts", stateCode: "MA", stateRate: 6.25, avgLocalRate: 0.00, combinedRate: 6.25, hasLocalTax: false },
  { state: "Michigan", stateCode: "MI", stateRate: 6.00, avgLocalRate: 0.00, combinedRate: 6.00, hasLocalTax: false },
  { state: "Minnesota", stateCode: "MN", stateRate: 6.875, avgLocalRate: 0.60, combinedRate: 7.475, hasLocalTax: true },
  { state: "Mississippi", stateCode: "MS", stateRate: 7.00, avgLocalRate: 0.07, combinedRate: 7.07, hasLocalTax: true },
  { state: "Missouri", stateCode: "MO", stateRate: 4.225, avgLocalRate: 4.03, combinedRate: 8.255, hasLocalTax: true },
  { state: "Montana", stateCode: "MT", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Nebraska", stateCode: "NE", stateRate: 5.50, avgLocalRate: 1.44, combinedRate: 6.94, hasLocalTax: true },
  { state: "Nevada", stateCode: "NV", stateRate: 6.85, avgLocalRate: 1.38, combinedRate: 8.23, hasLocalTax: true },
  { state: "New Hampshire", stateCode: "NH", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "New Jersey", stateCode: "NJ", stateRate: 6.625, avgLocalRate: 0.00, combinedRate: 6.625, hasLocalTax: false },
  { state: "New Mexico", stateCode: "NM", stateRate: 4.875, avgLocalRate: 2.69, combinedRate: 7.565, hasLocalTax: true, notes: "Gross receipts tax" },
  { state: "New York", stateCode: "NY", stateRate: 4.00, avgLocalRate: 4.52, combinedRate: 8.52, hasLocalTax: true },
  { state: "North Carolina", stateCode: "NC", stateRate: 4.75, avgLocalRate: 2.22, combinedRate: 6.97, hasLocalTax: true },
  { state: "North Dakota", stateCode: "ND", stateRate: 5.00, avgLocalRate: 2.04, combinedRate: 7.04, hasLocalTax: true },
  { state: "Ohio", stateCode: "OH", stateRate: 5.75, avgLocalRate: 1.48, combinedRate: 7.23, hasLocalTax: true },
  { state: "Oklahoma", stateCode: "OK", stateRate: 4.50, avgLocalRate: 4.47, combinedRate: 8.97, hasLocalTax: true },
  { state: "Oregon", stateCode: "OR", stateRate: 0.00, avgLocalRate: 0.00, combinedRate: 0.00, hasLocalTax: false, notes: "No sales tax" },
  { state: "Pennsylvania", stateCode: "PA", stateRate: 6.00, avgLocalRate: 0.34, combinedRate: 6.34, hasLocalTax: true },
  { state: "Rhode Island", stateCode: "RI", stateRate: 7.00, avgLocalRate: 0.00, combinedRate: 7.00, hasLocalTax: false },
  { state: "South Carolina", stateCode: "SC", stateRate: 6.00, avgLocalRate: 1.46, combinedRate: 7.46, hasLocalTax: true },
  { state: "South Dakota", stateCode: "SD", stateRate: 4.20, avgLocalRate: 1.91, combinedRate: 6.11, hasLocalTax: true },
  { state: "Tennessee", stateCode: "TN", stateRate: 7.00, avgLocalRate: 2.55, combinedRate: 9.55, hasLocalTax: true },
  { state: "Texas", stateCode: "TX", stateRate: 6.25, avgLocalRate: 1.94, combinedRate: 8.19, hasLocalTax: true },
  { state: "Utah", stateCode: "UT", stateRate: 6.10, avgLocalRate: 1.09, combinedRate: 7.19, hasLocalTax: true },
  { state: "Vermont", stateCode: "VT", stateRate: 6.00, avgLocalRate: 0.24, combinedRate: 6.24, hasLocalTax: true },
  { state: "Virginia", stateCode: "VA", stateRate: 5.30, avgLocalRate: 0.45, combinedRate: 5.75, hasLocalTax: true },
  { state: "Washington", stateCode: "WA", stateRate: 6.50, avgLocalRate: 2.67, combinedRate: 9.17, hasLocalTax: true },
  { state: "West Virginia", stateCode: "WV", stateRate: 6.00, avgLocalRate: 0.52, combinedRate: 6.52, hasLocalTax: true },
  { state: "Wisconsin", stateCode: "WI", stateRate: 5.00, avgLocalRate: 0.44, combinedRate: 5.44, hasLocalTax: true },
  { state: "Wyoming", stateCode: "WY", stateRate: 4.00, avgLocalRate: 1.36, combinedRate: 5.36, hasLocalTax: true },
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
