'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Lock, ShieldCheck, Upload, X } from 'lucide-react';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';
import { NexusResultsView, type NexusReportResponse } from '@/components/NexusResults';
import { combineOrderFiles, parseOrderFile, type ParsedOrderFile } from '@/lib/order-csv';
import { sampleOrders } from '@/lib/scan-sample';
import { PLAN_ORDER_LIMITS, type PlanTier } from '@/lib/plans';
import { PLAN_MARKETING } from '@/lib/plan-features';
import {
  bucketOrders,
  evaluateAllStates,
  getTopActions,
  summarize,
  type NexusOrder,
  type SalesChannel,
} from '@/lib/nexus-engine';

interface LoadedFile {
  id: string;
  name: string;
  text: string;
  result: ParsedOrderFile | { error: string };
}

const EXPORT_HELP: { name: string; steps: string }[] = [
  { name: 'Shopify', steps: 'Orders → Export → All orders → "CSV for Excel, Numbers, or other spreadsheet programs". Bigger exports arrive by email.' },
  { name: 'Amazon', steps: 'Seller Central → Reports → Fulfillment → All Orders (or Order Reports). Pick the date range and download.' },
  { name: 'Etsy', steps: 'Shop Manager → Settings → Options → Download Data → Orders CSV. Download each year you need.' },
  { name: 'WooCommerce and others', steps: 'Any order export with an order date, ship-to state and order total works — for example from an order export plugin.' },
];

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Parse without letting an unexpected file take the page down. */
function readFile(text: string, channel?: SalesChannel): ParsedOrderFile | { error: string } {
  try {
    return parseOrderFile(text, channel ? { channel } : {});
  } catch {
    return { error: "Sails couldn't read this file. Make sure it's a CSV or tab-separated export." };
  }
}

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

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** "Left out: 3 cancelled or refunded, 1 outside the US" — only the reasons that apply. */
function leftOutSummary(skipped: ParsedOrderFile['skipped']): string | null {
  const parts = [
    skipped.notSales > 0 && `${skipped.notSales.toLocaleString('en-US')} cancelled or refunded`,
    skipped.outsideUS > 0 && `${skipped.outsideUS.toLocaleString('en-US')} outside the US`,
    skipped.noState > 0 && `${skipped.noState.toLocaleString('en-US')} with no US state`,
    skipped.noDate > 0 && `${skipped.noDate.toLocaleString('en-US')} with no readable date`,
    skipped.otherChannel > 0 &&
      `${skipped.otherChannel.toLocaleString('en-US')} Amazon shipped for your other sales channels (count those in that channel's export)`,
  ].filter(Boolean);
  return parts.length ? `Left out: ${parts.join(', ')}.` : null;
}

export default function FreeScanPage() {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [useSample, setUseSample] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    setReading(true);
    // Let the "Reading…" message paint before the (synchronous) parsing starts
    await new Promise((resolve) => setTimeout(resolve, 30));
    const loaded: LoadedFile[] = [];
    for (const file of incoming) {
      let text = '';
      try {
        text = await file.text();
      } catch {
        // handled below as an unreadable file
      }
      loaded.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        text,
        result: text ? readFile(text) : { error: "Sails couldn't open this file." },
      });
    }
    setUseSample(false);
    setFiles((prev) => [...prev.filter((p) => !loaded.some((l) => l.id === p.id)), ...loaded]);
    setReading(false);
  }, []);

  const setChannel = (id: string, channel: SalesChannel) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, result: readFile(f.text, channel) } : f)));
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const combined = useMemo(
    () => combineOrderFiles(files.flatMap((f) => ('error' in f.result ? [] : [f.result]))),
    [files]
  );

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
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-theme-accent bg-accent-subtle' : 'border-theme-secondary'
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
            }}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-theme-muted" aria-hidden />
            <p className="text-lg font-medium text-theme-primary">Drop your order exports here</p>
            <p className="text-sm text-theme-muted mb-4">CSV or tab-separated files. Add as many as you like — one per store or marketplace.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-theme-primary px-5 py-2.5 rounded-lg font-medium"
              >
                Choose files
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setUseSample(true);
                }}
                className="px-5 py-2.5 rounded-lg font-medium border border-theme-secondary text-theme-secondary hover:text-theme-primary"
              >
                Try it with sample data
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {reading && (
            <p className="mt-4 text-sm text-theme-secondary" role="status">
              Reading your files…
            </p>
          )}

          {useSample && (
            <p className="mt-4 text-sm text-theme-secondary flex items-center gap-2">
              <FileText className="w-4 h-4" aria-hidden />
              Showing made-up sample data. Add your own files to check your store.
            </p>
          )}

          {files.length > 0 && (
            <ul className="mt-5 space-y-3">
              {files.map((f) => (
                <li key={f.id} className="rounded-lg border border-theme-primary p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-theme-primary truncate">{f.name}</p>
                      {'error' in f.result ? (
                        <p className="text-red-500 mt-1">{f.result.error}</p>
                      ) : (
                        <>
                          <p className="text-theme-secondary mt-1">
                            {f.result.label} · {plural(f.result.orders.length, 'US order')} counted
                            {f.result.dateRange ? ` · ${formatDay(f.result.dateRange.from)} to ${formatDay(f.result.dateRange.to)}` : ''}
                          </p>
                          {leftOutSummary(f.result.skipped) && (
                            <p className="text-theme-muted mt-1">{leftOutSummary(f.result.skipped)}</p>
                          )}
                          {f.result.missingTax && (
                            <p className="text-yellow-600 mt-1">No tax column found, so totals may include sales tax.</p>
                          )}
                          <fieldset className="mt-2 flex flex-wrap gap-4 text-theme-secondary">
                            <legend className="sr-only">Where were these sales made?</legend>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`channel-${f.id}`}
                                checked={f.result.channel === 'direct'}
                                onChange={() => setChannel(f.id, 'direct')}
                              />
                              My own store
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`channel-${f.id}`}
                                checked={f.result.channel === 'marketplace'}
                                onChange={() => setChannel(f.id, 'marketplace')}
                              />
                              A marketplace (Amazon, Etsy, eBay…)
                            </label>
                          </fieldset>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="text-theme-muted hover:text-theme-primary p-1"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {combined.duplicates > 0 && (
            <p className="mt-3 text-sm text-theme-secondary">
              {plural(combined.duplicates, 'order was', 'orders were')} in more than one file, so{' '}
              {combined.duplicates === 1 ? 'it was' : 'they were'} counted once.
            </p>
          )}

          <details className="mt-6 text-sm">
            <summary className="cursor-pointer text-theme-accent font-medium">How to export your orders</summary>
            <ul className="mt-3 space-y-2 text-theme-secondary">
              {EXPORT_HELP.map((h) => (
                <li key={h.name}>
                  <span className="font-medium text-theme-primary">{h.name}:</span> {h.steps}
                </li>
              ))}
              <li>
                Include everything from <span className="font-medium text-theme-primary">January 1 of last year</span> to
                today — that&apos;s the longest period most states look at.
              </li>
            </ul>
          </details>
        </section>

        {/* Results */}
        {report ? (
          <>
            <NexusResultsView report={report} mode="scan" />
            <section className="card-theme rounded-2xl p-6 sm:p-8 mt-8 text-center">
              <ShieldCheck className="w-10 h-10 text-theme-accent mx-auto mb-3" aria-hidden />
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Keep this up to date</h2>
              <p className="text-theme-secondary max-w-xl mx-auto mb-2">
                Connect your store and Sails brings in new orders each time you sync, re-checks every state, and alerts you when
                one gets close to its threshold.
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
          Your files are read by your browser and never sent to Sails or anyone else. Results are estimates to help you decide
          what to check — not tax advice. Confirm with the state or a tax professional before registering.
        </p>
      </main>

      <Footer />
    </div>
  );
}
