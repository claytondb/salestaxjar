/**
 * The activation funnel for the admin page, built from Sails' own database —
 * no third-party analytics. Each step counts signups in the window that
 * reached it (at any time since signing up).
 */

export interface FunnelUser {
  id: string;
  createdAt: Date;
  emailVerified: boolean;
  subscriptionStatus: string | null;
}

export interface FunnelFacts {
  /** Users with a store connection */
  connected: Set<string>;
  /** Users with any imported orders (a store sync or an Amazon upload) */
  withOrders: Set<string>;
  /** Users who marked at least one state as registered / nexus */
  markedNexus: Set<string>;
  /** Users who marked at least one return as filed */
  markedFiled: Set<string>;
}

export const FUNNEL_STEPS = [
  { key: 'signed_up', label: 'Signed up' },
  { key: 'verified', label: 'Verified email' },
  { key: 'brought_orders', label: 'Connected a store or uploaded orders' },
  { key: 'orders_imported', label: 'Orders imported' },
  { key: 'marked_nexus', label: 'Marked a state as registered' },
  { key: 'marked_filed', label: 'Marked a return as filed' },
  { key: 'started_plan', label: 'Started a paid plan or trial' },
  { key: 'paying', label: 'Paying (active subscription)' },
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEPS)[number]['key'];

export interface FunnelWindow {
  label: string;
  days: number | null;
  steps: { key: FunnelStepKey; label: string; count: number; percentOfSignups: number }[];
}

const STARTED_PLAN = new Set(['active', 'trialing', 'past_due', 'canceled']);

function reached(user: FunnelUser, key: FunnelStepKey, facts: FunnelFacts): boolean {
  switch (key) {
    case 'signed_up':
      return true;
    case 'verified':
      return user.emailVerified;
    case 'brought_orders':
      return facts.connected.has(user.id) || facts.withOrders.has(user.id);
    case 'orders_imported':
      return facts.withOrders.has(user.id);
    case 'marked_nexus':
      return facts.markedNexus.has(user.id);
    case 'marked_filed':
      return facts.markedFiled.has(user.id);
    case 'started_plan':
      return !!user.subscriptionStatus && STARTED_PLAN.has(user.subscriptionStatus);
    case 'paying':
      return user.subscriptionStatus === 'active';
  }
}

export function buildActivationFunnel(
  users: FunnelUser[],
  facts: FunnelFacts,
  now: Date = new Date(),
  windows: { label: string; days: number | null }[] = [
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'All time', days: null },
  ]
): FunnelWindow[] {
  return windows.map(({ label, days }) => {
    const since = days === null ? null : now.getTime() - days * 86_400_000;
    const cohort = users.filter((u) => since === null || u.createdAt.getTime() >= since);
    return {
      label,
      days,
      steps: FUNNEL_STEPS.map(({ key, label: stepLabel }) => {
        const count = cohort.filter((u) => reached(u, key, facts)).length;
        return {
          key,
          label: stepLabel,
          count,
          percentOfSignups: cohort.length ? Math.round((count / cohort.length) * 100) : 0,
        };
      }),
    };
  });
}
