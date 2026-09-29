/**
 * State Economic Nexus Thresholds
 *
 * One entry per state + DC: the dollar and transaction thresholds, how they
 * combine, the measurement period, which sales count, and whether sales made
 * through a marketplace (Amazon, Etsy, eBay, Walmart…) count toward YOUR
 * threshold.
 *
 * RULES REVIEWED: 2026-09-25 (see NEXUS_RULES_REVIEWED_ON).
 * Every field below was checked against:
 *  - Sales Tax Institute, "Economic Nexus State Guide" (page updated Sep 23, 2026):
 *    https://www.salestaxinstitute.com/resources/economic-nexus-state-guide
 *    Source for thresholds, measurement periods, includable sales and
 *    marketplace treatment for every state.
 *  - Avalara, "States eliminating economic nexus transaction thresholds"
 *    (updated Aug 3, 2026) — confirms Kentucky's repeal effective Aug 1, 2026:
 *    https://www.avalara.com/blog/en/north-america/2025/06/states-eliminating-economic-nexus-transaction-thresholds.html
 *
 * Transaction-count threshold REPEALED (sales-dollar test only) -> transactionThreshold: null:
 *  ME (2022), SD (Jul 2023), LA (Aug 2023), IN (Jan 2024), WY (Jul 2024),
 *  NC (Jul 2024), UT (Jul 2025), IL (Jan 2026), KY (Aug 2026).
 *
 * AND-logic states (BOTH thresholds must be met): CT ($100K AND 200 txns) and
 * NY ($500K AND more than 100 sales). Every other dual-threshold state uses OR.
 *
 * Release rule: do not change a value here without a named source and the date
 * you checked it. Update NEXUS_RULES_REVIEWED_ON when you re-review.
 */

export type MeasurementPeriod =
  /** Previous calendar year only (e.g. FL, PA). Current-year sales decide NEXT year. */
  | 'previous_calendar_year'
  /** Either the previous or the current calendar year (most states). */
  | 'previous_or_current_calendar_year'
  /** A trailing 12-month (or four-quarter) window. */
  | 'rolling_12_months'
  /** Legacy value kept for compatibility; treated like previous_or_current. */
  | 'calendar_year';

/** Which of a seller's sales the state counts toward the threshold. */
export type CountedSales = 'gross' | 'retail' | 'taxable';

export interface NexusThreshold {
  stateCode: string;
  stateName: string;
  /** Dollar threshold for economic nexus (null = no sales tax / no threshold) */
  salesThreshold: number | null;
  /** Transaction count threshold (null = no transaction threshold) */
  transactionThreshold: number | null;
  /**
   * The state's test is MORE THAN the amount rather than at least it
   * (Mississippi: more than $250K; New York: more than 100 sales). Used for
   * wording; the engine treats both as reaching the threshold.
   */
  salesThresholdExclusive?: boolean;
  transactionThresholdExclusive?: boolean;
  /**
   * How the sales and transaction thresholds combine.
   * 'or' (default): meeting EITHER threshold establishes nexus.
   * 'and': BOTH thresholds must be met (currently only CT and NY).
   */
  logic?: 'and' | 'or';
  /** Whether the state has a general sales tax */
  hasSalesTax: boolean;
  /** Measurement period */
  measurementPeriod: MeasurementPeriod;
  /** Extra detail when the state's window is more specific than our period type */
  measurementNote?: string;
  /** Which sales the state counts (gross, retail or taxable sales) */
  countedSales: CountedSales;
  /**
   * Whether sales made through a marketplace facilitator (Amazon, Etsy, eBay…)
   * count toward the seller's own threshold in this state.
   */
  marketplaceSales: 'included' | 'excluded';
  /** Extra detail about marketplace treatment */
  marketplaceNote?: string;
  /**
   * A local (not statewide) remote-seller threshold — Alaska has no state
   * sales tax, but many towns collect through the ARSSTC.
   */
  localNexus?: { salesThreshold: number; body: string; url: string };
  /** Additional notes about the state's nexus rules */
  notes: string;
}

/** Date the whole table was last reviewed against the sources above. */
export const NEXUS_RULES_REVIEWED_ON = '2026-09-25';
export const NEXUS_RULES_REVIEWED_LABEL = 'September 25, 2026';
export const NEXUS_RULES_REVIEWED_MONTH = 'Sep 2026';

export const NEXUS_RULES_SOURCES = [
  {
    name: 'Sales Tax Institute — Economic Nexus State Guide',
    url: 'https://www.salestaxinstitute.com/resources/economic-nexus-state-guide',
    updated: 'September 23, 2026',
  },
  {
    name: 'Avalara — States eliminating economic nexus transaction thresholds',
    url: 'https://www.avalara.com/blog/en/north-america/2025/06/states-eliminating-economic-nexus-transaction-thresholds.html',
    updated: 'August 3, 2026',
  },
] as const;

export const MEASUREMENT_PERIOD_LABELS: Record<MeasurementPeriod, string> = {
  previous_calendar_year: 'Previous calendar year',
  previous_or_current_calendar_year: 'Previous or current calendar year',
  rolling_12_months: 'Last 12 months',
  calendar_year: 'Previous or current calendar year',
};

export const COUNTED_SALES_LABELS: Record<CountedSales, string> = {
  gross: 'Gross sales (taxable and exempt)',
  retail: 'Retail sales',
  taxable: 'Taxable sales only',
};

export const STATE_NEXUS_THRESHOLDS: NexusThreshold[] = [
  {
    stateCode: 'AL',
    stateName: 'Alabama',
    salesThreshold: 250000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: 'Simplified Sellers Use Tax (SSUT) program available.',
  },
  {
    stateCode: 'AK',
    stateName: 'Alaska',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    localNexus: {
      salesThreshold: 100000,
      body: 'Alaska Remote Seller Sales Tax Commission (ARSSTC)',
      url: 'https://arsstc.org/',
    },
    notes: 'Many local governments collect through the Alaska Remote Seller Sales Tax Commission (ARSSTC), which uses a $100K threshold.',
  },
  {
    stateCode: 'AZ',
    stateName: 'Arizona',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: 'Transaction privilege tax (TPT).',
  },
  {
    stateCode: 'AR',
    stateName: 'Arkansas',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'taxable',
    marketplaceSales: 'excluded',
    notes: '$100K in taxable sales OR 200 transactions.',
  },
  {
    stateCode: 'CA',
    stateName: 'California',
    salesThreshold: 500000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$500K in sales of tangible personal property.',
  },
  {
    stateCode: 'CO',
    stateName: 'Colorado',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: 'Retail delivery fee also applies.',
  },
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    salesThreshold: 100000,
    transactionThreshold: 200,
    logic: 'and',
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    measurementNote: 'Connecticut measures the 12-month period ending September 30.',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in retail sales AND 200 transactions (both must be met).',
  },
  {
    stateCode: 'DE',
    stateName: 'Delaware',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'FL',
    stateName: 'Florida',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'taxable',
    marketplaceSales: 'excluded',
    notes: '$100K in taxable remote sales in the previous calendar year.',
  },
  {
    stateCode: 'GA',
    stateName: 'Georgia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: '$100K in retail sales OR 200 transactions.',
  },
  {
    stateCode: 'HI',
    stateName: 'Hawaii',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'General excise tax (GET), not technically a sales tax but works similarly.',
  },
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '',
  },
  {
    stateCode: 'IL',
    stateName: 'Illinois',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2026.',
  },
  {
    stateCode: 'IN',
    stateName: 'Indiana',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2024.',
  },
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '',
  },
  {
    stateCode: 'KS',
    stateName: 'Kansas',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '',
  },
  {
    stateCode: 'KY',
    stateName: 'Kentucky',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Aug 1, 2026.',
  },
  {
    stateCode: 'LA',
    stateName: 'Louisiana',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Aug 1, 2023.',
  },
  {
    stateCode: 'ME',
    stateName: 'Maine',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2022.',
  },
  {
    stateCode: 'MD',
    stateName: 'Maryland',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    marketplaceNote: 'Marketplace sales are left out when the marketplace collects the tax, which Amazon, Etsy, eBay and Walmart do.',
    notes: '',
  },
  {
    stateCode: 'MI',
    stateName: 'Michigan',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions in the previous calendar year.',
  },
  {
    stateCode: 'MN',
    stateName: 'Minnesota',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    measurementNote: 'Minnesota measures the 12 months ending with the last completed calendar quarter.',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in retail sales OR 200 retail sales.',
  },
  {
    stateCode: 'MS',
    stateName: 'Mississippi',
    salesThreshold: 250000,
    salesThresholdExclusive: true,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: 'More than $250K in sales over the prior 12 months.',
  },
  {
    stateCode: 'MO',
    stateName: 'Missouri',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    countedSales: 'taxable',
    marketplaceSales: 'included',
    notes: '$100K in taxable sales over the previous 12 months, checked quarterly.',
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'NE',
    stateName: 'Nebraska',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in retail sales OR 200 transactions.',
  },
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in retail sales OR 200 transactions.',
  },
  {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'NJ',
    stateName: 'New Jersey',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'taxable',
    marketplaceSales: 'excluded',
    notes: 'Gross receipts tax (GRT). $100K in taxable receipts in the previous calendar year.',
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    salesThreshold: 500000,
    transactionThreshold: 100,
    transactionThresholdExclusive: true,
    logic: 'and',
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    measurementNote: 'New York measures the immediately preceding four sales tax quarters.',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$500K in sales AND more than 100 sales (both must be met).',
  },
  {
    stateCode: 'NC',
    stateName: 'North Carolina',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2024.',
  },
  {
    stateCode: 'ND',
    stateName: 'North Dakota',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'taxable',
    marketplaceSales: 'excluded',
    notes: '',
  },
  {
    stateCode: 'OH',
    stateName: 'Ohio',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'taxable',
    marketplaceSales: 'excluded',
    notes: '',
  },
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in gross sales on all channels in the previous calendar year.',
  },
  {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions in the previous calendar year.',
  },
  {
    stateCode: 'SC',
    stateName: 'South Carolina',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '',
  },
  {
    stateCode: 'SD',
    stateName: 'South Dakota',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2023.',
  },
  {
    stateCode: 'TN',
    stateName: 'Tennessee',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: '',
  },
  {
    stateCode: 'TX',
    stateName: 'Texas',
    salesThreshold: 500000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$500K in gross revenue over the preceding 12 months.',
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2025.',
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    measurementNote: 'Vermont measures the prior four calendar quarters.',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'VA',
    stateName: 'Virginia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'excluded',
    notes: '$100K in retail sales OR 200 transactions.',
  },
  {
    stateCode: 'WA',
    stateName: 'Washington',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: 'B&O tax also applies.',
  },
  {
    stateCode: 'WV',
    stateName: 'West Virginia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'included',
    marketplaceNote: 'If all of your Wisconsin sales go through marketplaces that collect the tax, you don\'t need to register.',
    notes: '',
  },
  {
    stateCode: 'WY',
    stateName: 'Wyoming',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'gross',
    marketplaceSales: 'excluded',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2024.',
  },
  {
    stateCode: 'DC',
    stateName: 'District of Columbia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    countedSales: 'retail',
    marketplaceSales: 'included',
    notes: '$100K in retail sales OR 200 transactions.',
  },
];

// Quick lookup by state code
export const THRESHOLD_BY_STATE: Record<string, NexusThreshold> = {};
for (const threshold of STATE_NEXUS_THRESHOLDS) {
  THRESHOLD_BY_STATE[threshold.stateCode] = threshold;
}

/**
 * Get the threshold for a specific state
 */
export function getStateThreshold(stateCode: string): NexusThreshold | undefined {
  return THRESHOLD_BY_STATE[stateCode];
}

/**
 * Get all states that have sales tax
 */
export function getSalesTaxStates(): NexusThreshold[] {
  return STATE_NEXUS_THRESHOLDS.filter(s => s.hasSalesTax);
}

/**
 * Get all states without sales tax
 */
export function getNoSalesTaxStates(): NexusThreshold[] {
  return STATE_NEXUS_THRESHOLDS.filter(s => !s.hasSalesTax);
}

export type ExposureStatus = 'safe' | 'approaching' | 'warning' | 'exceeded';

/**
 * Determine nexus exposure status based on sales and transaction data.
 * Returns the HIGHEST exposure level across both thresholds.
 */
export function calculateExposureStatus(
  totalSales: number,
  transactionCount: number,
  threshold: NexusThreshold
): {
  status: ExposureStatus;
  salesPercentage: number;
  transactionPercentage: number;
  highestPercentage: number;
} {
  if (!threshold.hasSalesTax || !threshold.salesThreshold) {
    return {
      status: 'safe',
      salesPercentage: 0,
      transactionPercentage: 0,
      highestPercentage: 0,
    };
  }

  const salesPercentage = (totalSales / threshold.salesThreshold) * 100;
  const transactionPercentage = threshold.transactionThreshold
    ? (transactionCount / threshold.transactionThreshold) * 100
    : 0;

  // Determine the percentage that governs the exposure status.
  // 'or' states (the default): nexus is established by meeting EITHER threshold,
  //   so the driving percentage is the HIGHER of the two (existing behavior).
  // 'and' states (CT, NY): nexus requires BOTH thresholds to be met, so the state
  //   is only "exceeded"/"approaching" once the LOWER of the two percentages crosses
  //   the level. Using the minimum prevents false "must register" alerts when only
  //   one of the two thresholds is met.
  const useAndLogic = threshold.logic === 'and' && threshold.transactionThreshold != null;
  const highestPercentage = useAndLogic
    ? Math.min(salesPercentage, transactionPercentage)
    : Math.max(salesPercentage, transactionPercentage);

  let status: ExposureStatus = 'safe';
  if (highestPercentage >= 100) {
    status = 'exceeded';
  } else if (highestPercentage >= 90) {
    status = 'warning';
  } else if (highestPercentage >= 75) {
    status = 'approaching';
  }

  return { status, salesPercentage, transactionPercentage, highestPercentage };
}
