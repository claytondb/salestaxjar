/**
 * Competitor facts shown on Sails pages.
 *
 * Rules (from the trust review):
 *   - Only publish facts we can point to on the competitor's own public page.
 *   - Every fact carries the date we checked it and a link to the source.
 *   - Re-check these before changing any page that shows them. Prices change.
 *
 * Last checked: 2026-09-25.
 */

export interface CompetitorFact {
  label: string;
  value: string;
  sourceUrl: string;
  /** ISO date the fact was checked on the source page */
  checkedOn: string;
}

export const COMPETITOR_FACTS_CHECKED_ON = '2026-09-25';

/** "September 25, 2026" */
export const COMPETITOR_FACTS_CHECKED_LABEL = 'September 25, 2026';

export const TAXJAR = {
  name: 'TaxJar',
  starterPrice: {
    label: 'Starter plan',
    value: 'From $39/mo (up to 200 orders/mo)',
    sourceUrl: 'https://www.taxjar.com/pricing',
    checkedOn: COMPETITOR_FACTS_CHECKED_ON,
  } satisfies CompetitorFact,
  professionalPrice: {
    label: 'Professional plan',
    value: 'From $99/mo',
    sourceUrl: 'https://support.taxjar.com/article/139-how-much-does-taxjar-cost',
    checkedOn: COMPETITOR_FACTS_CHECKED_ON,
  } satisfies CompetitorFact,
  freePlan: {
    label: 'Free plan',
    value: 'No (30-day free trial)',
    sourceUrl: 'https://www.taxjar.com/pricing',
    checkedOn: COMPETITOR_FACTS_CHECKED_ON,
  } satisfies CompetitorFact,
  filing: {
    label: 'Filing',
    value: 'AutoFile: $50–$55 per return',
    sourceUrl: 'https://support.taxjar.com/article/139-how-much-does-taxjar-cost',
    checkedOn: COMPETITOR_FACTS_CHECKED_ON,
  } satisfies CompetitorFact,
};

export const SHOPIFY_TAX = {
  name: 'Shopify Tax',
  filing: {
    label: 'Automated filing',
    value: '$75 per return on Basic, Grow and Advanced ($50 on Plus)',
    sourceUrl: 'https://help.shopify.com/en/manual/taxes/shopify-tax/automated-filing/pricing',
    checkedOn: COMPETITOR_FACTS_CHECKED_ON,
  } satisfies CompetitorFact,
};
