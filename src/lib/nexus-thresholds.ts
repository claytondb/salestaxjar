/**
 * State Economic Nexus Thresholds (2026)
 *
 * Comprehensive data on economic nexus thresholds for all US states + DC.
 * States measure either on a rolling 12-month or calendar year basis.
 * Most states: $100,000 in sales OR 200 transactions.
 * Notable exceptions: CA, NY, TX use $500K thresholds.
 *
 * DATA REVIEWED: 2026-07-08.
 * Sources (current-law verification for transaction-threshold repeals + AND-logic states):
 *  - Avalara, "States eliminating economic nexus transaction thresholds" (updated Apr 21, 2026):
 *    https://www.avalara.com/blog/en/north-america/2025/06/states-eliminating-economic-nexus-transaction-thresholds.html
 *  - Sales Tax Institute, Economic Nexus State Guide:
 *    https://www.salestaxinstitute.com/resources/economic-nexus-state-guide
 *  - Louisiana (repealed 200-txn, eff. Aug 1 2023):
 *    https://www.salestaxinstitute.com/resources/louisiana-removes-200-transaction-threshold-from-economic-nexus-rules
 *  - Indiana & Wyoming (repealed, eff. 2024):
 *    https://www.avalara.com/blog/en/north-america/2024/03/indiana-wyoming-drop-remote-seller-transaction-threshold.html
 *  - North Carolina (repealed, eff. Jul 1 2024):
 *    https://www.salestaxinstitute.com/resources/north-carolina-repeals-transaction-count-from-economic-nexus-threshold
 *  - Illinois (repealed, eff. Jan 1 2026):
 *    https://www.anrok.com/tax-news/illinois-to-eliminate-its-200-transaction-economic-nexus-threshold
 *
 * Transaction-count threshold REPEALED (now sales-dollar test only) -> transactionThreshold: null:
 *  ME (2022), SD (Jul 2023), LA (Aug 2023), IN (Jan 2024), WY (Jul 2024),
 *  NC (Jul 2024), UT (Jul 2025), IL (Jan 2026). All confirmed via sources above.
 *
 * AND-logic states (BOTH sales AND transaction thresholds must be met to establish nexus):
 *  CT ($100K AND 200 txns) and NY ($500K AND 100 txns). These are the ONLY two AND states;
 *  every other dual-threshold state uses OR logic. See `logic` field below.
 */

export interface NexusThreshold {
  stateCode: string;
  stateName: string;
  /** Dollar threshold for economic nexus (null = no sales tax / no threshold) */
  salesThreshold: number | null;
  /** Transaction count threshold (null = no transaction threshold) */
  transactionThreshold: number | null;
  /**
   * How the sales and transaction thresholds combine.
   * 'or' (default): meeting EITHER threshold establishes nexus.
   * 'and': BOTH thresholds must be met (currently only CT and NY).
   */
  logic?: 'and' | 'or';
  /** Whether the state has a general sales tax */
  hasSalesTax: boolean;
  /** Measurement period */
  measurementPeriod: 'calendar_year' | 'rolling_12_months' | 'previous_or_current_calendar_year';
  /** Additional notes about the state's nexus rules */
  notes: string;
}

export const STATE_NEXUS_THRESHOLDS: NexusThreshold[] = [
  {
    stateCode: 'AL',
    stateName: 'Alabama',
    salesThreshold: 250000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Simplified Sellers Use Tax (SSUT) program. $250K threshold.',
  },
  {
    stateCode: 'AK',
    stateName: 'Alaska',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'calendar_year',
    notes: 'No statewide sales tax. Some local jurisdictions impose sales tax; check local rules.',
  },
  {
    stateCode: 'AZ',
    stateName: 'Arizona',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Transaction privilege tax (TPT). No transaction count threshold.',
  },
  {
    stateCode: 'AR',
    stateName: 'Arkansas',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'CA',
    stateName: 'California',
    salesThreshold: 500000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$500K threshold. No transaction count threshold.',
  },
  {
    stateCode: 'CO',
    stateName: 'Colorado',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Retail delivery fee also applies. No transaction count threshold.',
  },
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    salesThreshold: 100000,
    transactionThreshold: 200,
    logic: 'and',
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$100K in sales AND 200 transactions (both must be met).',
  },
  {
    stateCode: 'DE',
    stateName: 'Delaware',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'calendar_year',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'FL',
    stateName: 'Florida',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Effective July 2021. No transaction count threshold.',
  },
  {
    stateCode: 'GA',
    stateName: 'Georgia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'HI',
    stateName: 'Hawaii',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'General excise tax (GET), not technically a sales tax but functions similarly.',
  },
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'IL',
    stateName: 'Illinois',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2026.',
  },
  {
    stateCode: 'IN',
    stateName: 'Indiana',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2024.',
  },
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'KS',
    stateName: 'Kansas',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'KY',
    stateName: 'Kentucky',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions. (Transaction threshold scheduled for repeal Aug 1, 2026.)',
  },
  {
    stateCode: 'LA',
    stateName: 'Louisiana',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in retail sales only. 200-transaction threshold repealed effective Aug 1, 2023.',
  },
  {
    stateCode: 'ME',
    stateName: 'Maine',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jan 1, 2022.',
  },
  {
    stateCode: 'MD',
    stateName: 'Maryland',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'MI',
    stateName: 'Michigan',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'MN',
    stateName: 'Minnesota',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$100K in sales OR 200 transactions over 12 months.',
  },
  {
    stateCode: 'MS',
    stateName: 'Mississippi',
    salesThreshold: 250000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$250K threshold. No transaction count threshold.',
  },
  {
    stateCode: 'MO',
    stateName: 'Missouri',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Effective January 2023. No transaction count threshold.',
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'calendar_year',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'NE',
    stateName: 'Nebraska',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'calendar_year',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'NJ',
    stateName: 'New Jersey',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'Gross receipts tax (GRT). No transaction count threshold.',
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    salesThreshold: 500000,
    transactionThreshold: 100,
    logic: 'and',
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$500K in sales AND 100 transactions (both must be met).',
  },
  {
    stateCode: 'NC',
    stateName: 'North Carolina',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2024.',
  },
  {
    stateCode: 'ND',
    stateName: 'North Dakota',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'OH',
    stateName: 'Ohio',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    salesThreshold: null,
    transactionThreshold: null,
    hasSalesTax: false,
    measurementPeriod: 'calendar_year',
    notes: 'No sales tax.',
  },
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'SC',
    stateName: 'South Carolina',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'SD',
    stateName: 'South Dakota',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2023. Wayfair v. South Dakota origin state.',
  },
  {
    stateCode: 'TN',
    stateName: 'Tennessee',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'TX',
    stateName: 'Texas',
    salesThreshold: 500000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$500K threshold. No transaction count threshold.',
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2025.',
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'rolling_12_months',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'VA',
    stateName: 'Virginia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'WA',
    stateName: 'Washington',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'B&O tax also applies. No transaction count threshold.',
  },
  {
    stateCode: 'WV',
    stateName: 'West Virginia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
  },
  {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: 'No transaction count threshold.',
  },
  {
    stateCode: 'WY',
    stateName: 'Wyoming',
    salesThreshold: 100000,
    transactionThreshold: null,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales only. 200-transaction threshold repealed effective Jul 1, 2024.',
  },
  {
    stateCode: 'DC',
    stateName: 'District of Columbia',
    salesThreshold: 100000,
    transactionThreshold: 200,
    hasSalesTax: true,
    measurementPeriod: 'previous_or_current_calendar_year',
    notes: '$100K in sales OR 200 transactions.',
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
