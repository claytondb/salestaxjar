/**
 * Capability registry — the single source of truth for what Sails can do today.
 *
 * Marketing pages, the pricing page, FAQs and the in-app platform list all read
 * from here, so a platform or feature can never be "supported" on one page and
 * "coming soon" on another.
 *
 * Status meanings (shown to users):
 *   live    — available now and used by real sellers
 *   beta    — available to try, but not yet proven with enough real stores;
 *             sellers should double-check the numbers it produces
 *   planned — not available yet; we don't promise dates
 *
 * When you change a status here, every page that mentions it updates.
 */

export type CapabilityStatus = 'live' | 'beta' | 'planned';

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  live: 'Live',
  beta: 'Beta',
  planned: 'Planned',
};

export const STATUS_DESCRIPTION: Record<CapabilityStatus, string> = {
  live: 'Available now.',
  beta: 'Available to try. It has not been tested with many real stores yet, so please double-check the numbers it produces.',
  planned: 'Not available yet.',
};

export interface IntegrationCapability {
  /** Matches PlatformConnection.platform / ImportedOrder.platform */
  id: string;
  name: string;
  status: CapabilityStatus;
  /** 'store' = your own storefront; 'marketplace' = a marketplace that collects tax for you */
  kind: 'store' | 'marketplace';
  /** How the seller connects it */
  connection: string;
  /** One sentence for marketing pages */
  summary: string;
  /** Brand color used for the letter badge */
  color: string;
}

export const INTEGRATIONS: IntegrationCapability[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    status: 'live',
    kind: 'store',
    connection: 'One-click connect',
    summary: 'Connect in one click and import your recent orders.',
    color: '#96bf48',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    status: 'live',
    kind: 'store',
    connection: 'WooCommerce REST API key',
    summary: 'Connect with a read-only WooCommerce API key and import your orders.',
    color: '#7f54b3',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    status: 'live',
    kind: 'marketplace',
    connection: 'Order report upload (CSV)',
    summary: 'Upload an Amazon order report so your marketplace sales are included.',
    color: '#ff9900',
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    status: 'beta',
    kind: 'store',
    connection: 'Store API token',
    summary: 'Connect with a store API token and import your orders.',
    color: '#34313f',
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    status: 'beta',
    kind: 'store',
    connection: 'Commerce API key',
    summary: 'Connect with a Commerce API key (Commerce Advanced plan) and import your orders.',
    color: '#111111',
  },
  {
    id: 'ecwid',
    name: 'Ecwid',
    status: 'beta',
    kind: 'store',
    connection: 'Store ID and API token',
    summary: 'Connect with your store ID and API token and import your orders.',
    color: '#0087cd',
  },
  {
    id: 'magento',
    name: 'Magento / Adobe Commerce',
    status: 'beta',
    kind: 'store',
    connection: 'Integration access token',
    summary: 'Connect with an integration access token and import your orders.',
    color: '#f46f25',
  },
  {
    id: 'prestashop',
    name: 'PrestaShop',
    status: 'beta',
    kind: 'store',
    connection: 'Webservice API key',
    summary: 'Connect with a Webservice API key and import your orders.',
    color: '#df0067',
  },
  {
    id: 'opencart',
    name: 'OpenCart',
    status: 'beta',
    kind: 'store',
    connection: 'API username and key',
    summary: 'Connect with an API username and key and import your orders.',
    color: '#23a1d1',
  },
];

/** Store platforms that sync automatically once a day (see src/lib/auto-sync.ts). */
export const AUTO_SYNC_PLATFORMS = ['shopify', 'woocommerce'];

export interface FeatureCapability {
  id: string;
  name: string;
  status: CapabilityStatus;
  summary: string;
}

export const FEATURES: FeatureCapability[] = [
  {
    id: 'calculator',
    name: 'Tax calculator',
    status: 'live',
    summary: 'Estimate the tax on a sale for any state, using dated state and average local rates.',
  },
  {
    id: 'nexus_tracking',
    name: 'Nexus tracking',
    status: 'live',
    summary: "See how close you are to each state's economic nexus threshold, and why.",
  },
  {
    id: 'threshold_alerts',
    name: 'Threshold alerts',
    status: 'live',
    summary: "Get an email when your sales approach or pass a state's threshold.",
  },
  {
    id: 'daily_sync',
    name: 'Daily store sync',
    status: 'live',
    summary: 'Connected Shopify and WooCommerce stores bring in new orders automatically once a day.',
  },
  {
    id: 'filing_calendar',
    name: 'Filing calendar',
    status: 'live',
    summary: "See upcoming filing due dates for the states you track, using each state's own schedule.",
  },
  {
    // Built, and due dates now follow each state's own schedule, but the emails
    // stay off (DEADLINE_REMINDERS_ENABLED) until the owner decides to send them.
    // Flip to 'live' when that env flag is on.
    id: 'deadline_reminders',
    name: 'Deadline reminder emails',
    status: 'planned',
    summary: 'An email a week and a day before each filing deadline you track.',
  },
  {
    id: 'reports',
    name: 'Sales-by-state reports',
    status: 'live',
    summary: 'Download your sales and tax collected by state as CSV.',
  },
  {
    id: 'filing_summaries',
    name: 'Filing-ready summaries',
    status: 'planned',
    summary: 'State-by-state totals laid out the way each return asks for them.',
  },
  {
    id: 'auto_filing',
    name: 'Filing for you',
    status: 'planned',
    summary:
      'We will only offer filing once the workflow has been reviewed by licensed tax professionals. Until then, you file with the state and Sails gives you the numbers and deadlines.',
  },
];

export function getIntegration(id: string): IntegrationCapability | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}

export function getIntegrationStatus(id: string): CapabilityStatus | undefined {
  return getIntegration(id)?.status;
}

export function getIntegrationsByStatus(status: CapabilityStatus): IntegrationCapability[] {
  return INTEGRATIONS.filter((i) => i.status === status);
}

export function getFeature(id: string): FeatureCapability | undefined {
  return FEATURES.find((f) => f.id === id);
}

/**
 * Human list of names, e.g. "Shopify, WooCommerce and Amazon".
 */
export function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Shopify, WooCommerce and Amazon" — the integrations that are fully live. */
export function liveIntegrationNames(): string {
  return formatNameList(getIntegrationsByStatus('live').map((i) => i.name));
}

/** "BigCommerce, Squarespace, …" — the integrations in beta. */
export function betaIntegrationNames(): string {
  return formatNameList(getIntegrationsByStatus('beta').map((i) => i.name));
}
