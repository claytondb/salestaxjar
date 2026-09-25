/**
 * The outside services Sails uses to run (its "subprocessors"). Shown on the
 * privacy policy and the security page, so the two never disagree. Add a
 * provider here before sending it any customer data.
 */

export interface ServiceProvider {
  name: string;
  purpose: string;
  /** What Sails sends it, in plain words */
  data: string;
}

export const SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    name: 'Vercel',
    purpose: 'Website and application hosting',
    data: 'Everything the app handles passes through it; request logs are kept for a limited time.',
  },
  {
    name: 'Neon',
    purpose: 'Database hosting',
    data: 'Your account, business details, imported orders and filing records.',
  },
  {
    name: 'Stripe',
    purpose: 'Subscription billing and payments',
    data: 'Your email and billing details. Card numbers go straight to Stripe; Sails never sees them.',
  },
  {
    name: 'Resend',
    purpose: "Sending account emails and the alerts you've turned on",
    data: 'Your email address and the content of the email.',
  },
  {
    name: 'Sentry',
    purpose: 'Error monitoring',
    data: 'Technical details about errors. Personal details are left out by default.',
  },
  {
    name: 'Upstash',
    purpose: 'Rate limiting',
    data: 'Sign-in email addresses, IP addresses or account IDs, kept briefly to count requests.',
  },
  {
    name: 'TaxJar',
    purpose: 'Tax rate lookups for some calculations',
    data: 'The destination address and amount of the sale being calculated.',
  },
];
