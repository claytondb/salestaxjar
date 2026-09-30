'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Lock, ShieldCheck } from 'lucide-react';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';
import { NexusResultsView, type NexusReportResponse } from '@/components/NexusResults';
import OrderFileDrop, { useOrderFiles } from '@/components/OrderFileDrop';
import { buildImportBatches } from '@/lib/order-file-import';
import { clearScanHandoff, saveScanHandoff } from '@/lib/scan-handoff';
import { sampleOrders } from '@/lib/scan-sample';
import { PLAN_ORDER_LIMITS, type PlanTier } from '@/lib/plans';
import { PLAN_MARKETING } from '@/lib/plan-features';
import {
  bucketOrders,
  evaluateAllStates,
  getTopActions,
  summarize,
  type NexusOrder,
} from '@/lib/nexus-engine';

const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'enterprise'];

/** Which plan would count every order, based on the last 12 months in the files. */
function planHint(orders: NexusOrder[], now: Date): string {
  const freeLimit = PLAN_ORDER_LIMITS.free ?? 0;
  const yearAgo = now.getTime() - 365 * 86_400_000;
  let recent = 0;
  let earliest = Infinity;
  for (const o of orders) {
    const t = o.date.getTime();
    if (t < yearAgo || t > now.getTime()) continue;
    recent++;
    if (t < earliest) earliest = t;
  }
  if (recent === 0) {
    return `The free plan has no time limit and counts up to ${freeLimit} orders a month. No credit card needed.`;
  }
  const months = Math.min(12, Math.max(1, (now.getTime() - earliest) / (30.4 * 86_400_000)));
  const perMonth = Math.round(recent / months);
  const tier = PLAN_ORDER.find((t) => PLAN_ORDER_LIMITS[t] === null || perMonth <= (PLAN_ORDER_LIMITS[t] as number)) ?? 'enterprise';
  const about = `These files average about ${perMonth.toLocaleString('en-US')} orders a month`;
  if (tier === 'free') return `${about}, so the free plan covers you — no time limit, no credit card.`;
  const plan = PLAN_MARKETING[tier];
  const limit = PLAN_ORDER_LIMITS[tier];
  return `${about}. The free plan counts up to ${freeLimit} a month; ${plan.name} ($${plan.price}/month) counts ${
    limit === null ? 'every order' : `up to ${limit.toLocaleString('en-US')}`
  }.`;
}

export default function FreeScanPage() {
  const fileState = useOrderFiles();
  const { combined, clear, files, parsed } = fileState;
  const [useSample, setUseSample] = useState(false);
  // Keep the checked orders in this tab so they can be imported in one click after sign-up
  const [handoffReady, setHandoffReady] = useState(false);

  useEffect(() => {
    if (useSample || parsed.length === 0) {
      clearScanHandoff();
      setHandoffReady(false); // eslint-disable-line react-hooks/set-state-in-effect -- mirrors what was saved
      return;
    }
    const names = files.filter((f) => !('error' in f.result)).map((f) => f.name);
    setHandoffReady(saveScanHandoff(names, buildImportBatches(parsed)));
  }, [files, parsed, useSample]);

  const scan = useMemo(() => {
    const now = new Date();
    const orders: NexusOrder[] = useSample ? sampleOrders(now) : combined.orders;
    if (orders.length === 0) return null;
    const { byState, coverage } = bucketOrders(orders, now);
    const evaluations = evaluateAllStates(byState, { now, coverage, source: 'files' });
    const report: NexusReportResponse = {
      generatedAt: now.toISOString(),
      coverage: {
        earliestOrder: coverage.earliestOrder?.toISOString() ?? null,
        latestOrder: coverage.latestOrder?.toISOString() ?? null,
        hasMarketplaceData: coverage.hasMarketplaceData,
        cappedMonths: [],
        planOrderLimit: null,
      },
      evaluations,
      summary: summarize(evaluations),
      topActions: getTopActions(evaluations, coverage, now, 3, 'files'),
    };
    return { report, hint: useSample ? null : planHint(orders, now) };
  }, [combined, useSample]);
  const report = scan?.report ?? null;

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Header */}
      <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-theme-accent" />
              <span className="text-2xl font-bold text-theme-primary">Sails</span>
            </Link>
            <nav className="hidden lg:flex gap-6 items-center">
              <Link href="/free-scan" className="text-theme-accent font-medium">
                Free Nexus Check
              </Link>
              <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">
                Pricing
              </Link>
              <Link href="/free-calculator" className="text-theme-secondary hover:text-theme-primary transition">
                Calculator
              </Link>
              <Link href="/blog" className="text-theme-secondary hover:text-theme-primary transition">
                Blog
              </Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-2 sm:gap-3 items-center">
              <div className="hidden sm:block lg:hidden">
                <ThemeToggle />
              </div>
              <Link href="/login" className="text-theme-secondary hover:text-theme-primary px-3 py-2 transition whitespace-nowrap">
                Log in
              </Link>
              <Link href="/signup" className="btn-theme-primary px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-accent-subtle text-theme-accent px-4 py-2 rounded-full text-sm font-medium mb-5">
            <Lock className="w-4 h-4" aria-hidden />
            Free — your files never leave your computer
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-theme-primary mb-4">Where do you owe sales tax?</h1>
          <p className="text-lg sm:text-xl text-theme-secondary max-w-2xl mx-auto">
            Drop in your order exports from Shopify, Amazon, Etsy or any store. Sails checks them against every state&apos;s
            economic nexus rules right here in your browser — and tells you what to do next.
          </p>
        </section>

        {/* Upload */}
        <section id="scan-upload" className="card-theme rounded-2xl p-6 sm:p-8 mb-8 scroll-mt-24" aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="sr-only">
            Add your order files
          </h2>
          <OrderFileDrop
            state={fileState}
            onAdd={() => setUseSample(false)}
            actions={
              <button
                type="button"
                onClick={() => {
                  clear();
                  setUseSample(true);
                }}
                className="px-5 py-2.5 rounded-lg font-medium border border-theme-secondary text-theme-secondary hover:text-theme-primary"
              >
                Try it with sample data
              </button>
            }
            notice={
              useSample && (
                <p className="mt-4 text-sm text-theme-secondary flex items-center gap-2">
                  <FileText className="w-4 h-4" aria-hidden />
                  Showing made-up sample data. Add your own files to check your store.
                </p>
              )
            }
          />
        </section>

        {/* Results */}
        {report ? (
          <>
            <NexusResultsView report={report} mode="scan" />
            <section className="card-theme rounded-2xl p-6 sm:p-8 mt-8 text-center">
              <ShieldCheck className="w-10 h-10 text-theme-accent mx-auto mb-3" aria-hidden />
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Keep this up to date</h2>
              <p className="text-theme-secondary max-w-xl mx-auto mb-2">
                {handoffReady
                  ? 'Create a free account and import these orders in one click.'
                  : 'Create a free account and import these same files.'}{' '}
                Then connect your Shopify or WooCommerce store, and Sails adds new orders every day — with alerts as you
                near a threshold and each state&apos;s filing due dates in one calendar.
              </p>
              <p className="text-theme-muted text-sm max-w-xl mx-auto mb-5">
                {scan?.hint ?? `The free plan has no time limit and counts up to ${PLAN_ORDER_LIMITS.free} orders a month. No credit card needed.`}
              </p>
              <Link href="/signup" className="btn-theme-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2">
                Create a free account <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </section>
          </>
        ) : (
          <section className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="card-theme rounded-xl p-5">
              <h3 className="font-semibold text-theme-primary mb-1">Every state&apos;s own rules</h3>
              <p className="text-theme-secondary">
                Last year, this year or rolling 12 months — whichever each state uses, with the sources and the date the rules
                were reviewed.
              </p>
            </div>
            <div className="card-theme rounded-xl p-5">
              <h3 className="font-semibold text-theme-primary mb-1">Marketplace sales handled</h3>
              <p className="text-theme-secondary">
                Amazon and Etsy sales count only in the states that count them toward your threshold.
              </p>
            </div>
            <div className="card-theme rounded-xl p-5">
              <h3 className="font-semibold text-theme-primary mb-1">What to do next</h3>
              <p className="text-theme-secondary">
                For each state: why, how sure Sails is, and the next step — with the state&apos;s registration link.
              </p>
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-theme-muted text-center max-w-2xl mx-auto">
          Your files are read by your browser and never sent to Sails or anyone else. The orders you check stay in this
          browser tab until you close it, so you can import them if you create an account. Results are estimates to help you
          decide what to check — not tax advice. Confirm with the state or a tax professional before registering.
        </p>
      </main>

      <Footer />
    </div>
  );
}
