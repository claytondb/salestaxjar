/**
 * What each plan includes, in the words shown to customers.
 *
 * The pricing page, Settings → Billing, and the Stripe plan config all read
 * from here so they can never disagree. Keep this in sync with the enforced
 * limits in plans.ts (PLAN_ORDER_LIMITS / PLAN_PLATFORM_LIMITS) — the tests
 * in plan-features.test.ts check that they match.
 *
 * Only list things that are available today. Planned features belong in the
 * capability registry (capabilities.ts), not in a plan someone pays for.
 */

import type { PlanTier } from './plans';

export interface PlanFeatureLine {
  text: string;
  /** "Everything in X, plus:" header lines */
  bold?: boolean;
}

export interface PlanMarketing {
  name: string;
  price: number;
  description: string;
  /** Lines for the pricing page (cumulative, with "Everything in X, plus:") */
  features: PlanFeatureLine[];
  /** Short standalone list for compact cards (Settings → Billing) */
  highlights: string[];
}

export const PLAN_MARKETING: Record<PlanTier, PlanMarketing> = {
  free: {
    name: 'Free',
    price: 0,
    description: 'See if you even need to worry about sales tax',
    features: [
      { text: 'Nexus monitoring for all 50 states + DC' },
      { text: 'Threshold alerts, a filing calendar and deadline reminders' },
      { text: 'Sales-by-state reports and CSV export' },
      { text: '1 store connection, up to 50 orders/month' },
      { text: 'Unlimited tax calculations' },
      { text: 'Email support' },
    ],
    highlights: [
      'Nexus monitoring (50 states + DC)',
      'Alerts, filing calendar and reminders',
      '1 store connection, 50 orders/month',
      'Unlimited calculations',
    ],
  },
  starter: {
    name: 'Starter',
    price: 9,
    description: 'For side hustlers who are starting to sell across state lines',
    features: [
      { text: 'Everything in Free, plus:', bold: true },
      { text: '2 store connections' },
      { text: 'Up to 500 orders/month' },
    ],
    highlights: ['Everything in Free', '2 store connections', '500 orders/month'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    description: 'For growing sellers with multi-state sales',
    features: [
      { text: 'Everything in Starter, plus:', bold: true },
      { text: '3 store connections' },
      { text: 'Up to 5,000 orders/month' },
      { text: 'Tax calculation API + API keys' },
      { text: 'Priority email support' },
    ],
    highlights: ['3 store connections', '5,000 orders/month', 'Tax calculation API', 'Priority email support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 79,
    description: 'For high-volume sellers',
    features: [
      { text: 'Everything in Pro, plus:', bold: true },
      { text: 'Unlimited store connections' },
      { text: 'Unlimited orders' },
      { text: 'Highest priority support' },
    ],
    highlights: ['Unlimited store connections', 'Unlimited orders', 'Highest priority support'],
  },
};
