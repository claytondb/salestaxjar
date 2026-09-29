'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Info,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getStateRegistrationUrl } from '@/lib/state-registration-urls';
import NexusActionList from '@/components/NexusActionList';
import { formatMoney, formatPercent } from '@/lib/nexus-engine';
import type { StateEvaluation, TopAction, ExposureSummary, Confidence } from '@/lib/nexus-engine';

export interface NexusReportResponse {
  generatedAt: string;
  coverage: {
    earliestOrder: string | null;
    latestOrder: string | null;
    hasMarketplaceData: boolean;
    cappedMonths: string[];
    planOrderLimit: number | null;
  };
  evaluations: StateEvaluation[];
  summary: ExposureSummary;
  topActions: TopAction[];
}

type Filter = 'attention' | 'with_sales' | 'all';

export function formatDay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function needsAttention(e: StateEvaluation): boolean {
  return e.registration === 'none' && (e.localNexusOver || (e.hasSalesTax && e.status !== 'safe'));
}

type Tone = 'register' | 'plan' | 'past' | 'review' | 'close' | 'watch' | 'ok' | 'registered';

function toneFor(e: StateEvaluation): Tone {
  if (e.registration !== 'none' && (e.overNow || e.startsNextYear || e.pastExposure)) return 'registered';
  if (e.marketplaceOnly || e.localNexusOver) return 'review';
  if (e.overNow) return 'register';
  if (e.startsNextYear) return 'plan';
  if (e.pastExposure) return 'past';
  if (e.status === 'warning') return 'close';
  if (e.status === 'approaching') return 'watch';
  return 'ok';
}

const TONE_STYLES: Record<Tone, { chip: string; bar: string; track: string; icon: React.ReactNode }> = {
  register: { chip: 'tone-red', bar: 'bg-red-500', track: 'bg-red-500/15', icon: <ShieldAlert className="w-5 h-5 text-red-500" aria-hidden /> },
  plan: { chip: 'tone-purple', bar: 'bg-purple-500', track: 'bg-purple-500/15', icon: <CalendarClock className="w-5 h-5 text-purple-500" aria-hidden /> },
  past: { chip: 'tone-orange', bar: 'bg-orange-500', track: 'bg-orange-500/15', icon: <Receipt className="w-5 h-5 text-orange-500" aria-hidden /> },
  review: { chip: 'tone-blue', bar: 'bg-blue-500', track: 'bg-blue-500/15', icon: <Info className="w-5 h-5 text-blue-500" aria-hidden /> },
  close: { chip: 'tone-orange', bar: 'bg-orange-500', track: 'bg-orange-500/15', icon: <AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden /> },
  watch: { chip: 'tone-yellow', bar: 'bg-yellow-500', track: 'bg-yellow-500/15', icon: <TrendingUp className="w-5 h-5 text-yellow-600" aria-hidden /> },
  ok: { chip: 'tone-green', bar: 'bg-emerald-500', track: 'bg-emerald-500/15', icon: <ShieldCheck className="w-5 h-5 text-emerald-600" aria-hidden /> },
  registered: { chip: 'tone-green', bar: 'bg-emerald-500', track: 'bg-emerald-500/15', icon: <CheckCircle className="w-5 h-5 text-emerald-600" aria-hidden /> },
};

const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: 'tone-green border-emerald-500/40',
  medium: 'tone-yellow border-yellow-500/40',
  low: 'tone-red border-red-500/40',
};

function ProgressBar({ label, value, max, pct, tone, stateName }: { label: string; value: string; max: string; pct: number; tone: Tone; stateName: string }) {
  const s = TONE_STYLES[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-theme-muted">{label}</span>
        <span className="text-theme-secondary">
          {value} of {max} <span className="text-theme-muted">({formatPercent(pct)})</span>
        </span>
      </div>
      <div
        className={`h-2 rounded-full ${s.track} overflow-hidden`}
        role="progressbar"
        aria-label={`${label} toward the ${stateName} threshold`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(Math.round(pct), 100)}
      >
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function StateCard({ e }: { e: StateEvaluation }) {
  const tone = toneFor(e);
  const s = TONE_STYLES[tone];
  const reg = getStateRegistrationUrl(e.stateCode);
  const showRegister = (e.nextStep.kind === 'register_now' || e.nextStep.kind === 'plan_registration') && reg;
  const threshold = e.salesThreshold ?? e.rule.localNexus?.salesThreshold ?? null;

  return (
    <article id={`state-${e.stateCode}`} className="p-5 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {s.icon}
          <div className="min-w-0">
            <h3 className="font-semibold text-theme-primary">
              {e.stateName} <span className="text-theme-muted font-normal text-sm">{e.stateCode}</span>
            </h3>
            <p className="text-xs text-theme-muted">
              Measured over: {e.window.label}
              {e.marketplace.sales > 0 && (e.marketplace.counted ? ' · includes marketplace sales' : ' · marketplace sales not counted')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.chip}`}>{e.headline}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs border ${CONFIDENCE_STYLE[e.confidence]}`} title="How sure Sails is about this result">
            How sure: {CONFIDENCE_LABEL[e.confidence]}
          </span>
        </div>
      </div>

      {threshold && (
        <div className="space-y-2 mb-3">
          <ProgressBar
            label="Sales"
            value={formatMoney(e.measuredSales)}
            max={formatMoney(threshold)}
            pct={e.salesPercentage}
            tone={tone}
            stateName={e.stateName}
          />
          {e.transactionThreshold && e.measuredOrders > 0 && (
            <ProgressBar
              label={e.logic === 'and' ? 'Orders (both needed)' : 'Orders'}
              value={e.measuredOrders.toLocaleString('en-US')}
              max={e.transactionThreshold.toLocaleString('en-US')}
              pct={e.transactionPercentage}
              tone={tone}
              stateName={e.stateName}
            />
          )}
        </div>
      )}

      <p className="text-sm text-theme-primary">
        <span className="font-semibold">What next: </span>
        {e.nextStep.text}
      </p>
      {showRegister && reg && (
        <a
          href={reg.registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            e.nextStep.kind === 'register_now' ? 'tone-red hover:opacity-90' : 'tone-purple hover:opacity-90'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          {e.nextStep.kind === 'register_now' ? 'Register' : 'See how to register'} with {reg.portalName}
        </a>
      )}
      {e.localNexusOver && e.rule.localNexus && (
        <a
          href={e.rule.localNexus.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm tone-blue hover:opacity-90 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          {e.rule.localNexus.body}
        </a>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-sm text-theme-accent hover:underline">
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden />
          Why, how sure, and the rule
        </summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm">
          <section>
            <h4 className="font-semibold text-theme-primary mb-1">Why</h4>
            <ul className="list-disc pl-5 space-y-1 text-theme-secondary">
              {e.why.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-theme-primary mb-1">How sure: {CONFIDENCE_LABEL[e.confidence]}</h4>
            {e.confidenceReasons.length === 0 ? (
              <p className="text-theme-secondary">
                {e.overNow || e.startsNextYear || e.pastExposure
                  ? `Your sales are clearly over the threshold in the period ${e.stateName} looks at.`
                  : `Your order history covers the period ${e.stateName} looks at, and the result isn't close to the line.`}
              </p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-theme-secondary">
                {e.confidenceReasons.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="md:col-span-2">
            <h4 className="font-semibold text-theme-primary mb-1">{e.stateName}&apos;s rule</h4>
            <dl className="grid sm:grid-cols-3 gap-2 text-theme-secondary">
              <div>
                <dt className="text-theme-muted text-xs">Period</dt>
                <dd>
                  {e.rule.measurementLabel}
                  {e.rule.measurementNote ? ` — ${e.rule.measurementNote}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-theme-muted text-xs">Sales that count</dt>
                <dd>{e.rule.countedSalesLabel}</dd>
              </div>
              <div>
                <dt className="text-theme-muted text-xs">Marketplace sales (Amazon, Etsy…)</dt>
                <dd>
                  {e.rule.marketplaceSales === 'included' ? 'Counted' : 'Not counted'}
                  {e.rule.marketplaceNote ? ` — ${e.rule.marketplaceNote}` : ''}
                </dd>
              </div>
            </dl>
            {e.rule.notes && <p className="mt-2 text-theme-secondary">{e.rule.notes}</p>}
            <p className="mt-2 text-xs text-theme-muted">
              Rules reviewed {e.rulesReviewed}. Sources:{' '}
              {e.sources.map((src, i) => (
                <span key={src.url}>
                  {i > 0 && ' · '}
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
                    {src.name}
                  </a>
                </span>
              ))}
            </p>
          </section>
        </div>
      </details>
    </article>
  );
}

/**
 * The nexus results: top actions, summary, method note, filters and a card
 * per state. Used by the signed-in nexus page and by the free CSV scan.
 */
export function NexusResultsView({ report, mode = 'app' }: { report: NexusReportResponse; mode?: 'app' | 'scan' }) {
  const [filter, setFilter] = useState<Filter | null>(null);
  const evaluations = useMemo(() => report.evaluations, [report]);
  const attention = evaluations.filter(needsAttention);
  const withSales = evaluations.filter((e) => (e.hasSalesTax || e.localNexusOver) && e.hasAnySales);
  const activeFilter: Filter = filter ?? (attention.length > 0 ? 'attention' : 'with_sales');
  const shown =
    activeFilter === 'attention'
      ? attention
      : activeFilter === 'with_sales'
        ? withSales
        : evaluations.filter((e) => e.hasSalesTax || e.localNexusOver);
  const noSalesTaxStates = evaluations.filter((e) => !e.hasSalesTax && !e.localNexusOver);

  const { summary, coverage, topActions } = report;
  const checkCount = summary.pastExposureCount + summary.reviewCount;
  const soldInto = evaluations.filter((e) => e.hasAnySales).length;

  return (
    <div className="space-y-6">
      {/* What to do next */}
      {topActions.length > 0 && (
        <section className="card-theme rounded-xl border border-theme-primary p-5" aria-labelledby="top-actions-heading">
          <h2 id="top-actions-heading" className="text-lg font-semibold text-theme-primary mb-3">
            What to do next
          </h2>
          <NexusActionList actions={topActions} mode={mode} />
        </section>
      )}
      {topActions.length === 0 && (
        <section className="card-theme rounded-xl border border-green-500/30 p-5" aria-labelledby="all-clear-heading">
          <h2 id="all-clear-heading" className="text-lg font-semibold text-theme-primary mb-1 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" aria-hidden />
            Nothing needs your attention right now
          </h2>
          <p className="text-sm text-theme-secondary">
            {mode === 'scan'
              ? "You're under 75% of every state's threshold, measured over the period each state uses. Check again as your sales grow."
              : 'Keep your store synced so these totals stay current.'}
          </p>
        </section>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-theme rounded-xl p-4 border border-red-500/30">
          <div className="text-2xl font-bold text-red-500">{summary.registerNowCount}</div>
          <div className="text-sm text-theme-muted">Register now</div>
        </div>
        <div className="card-theme rounded-xl p-4 border border-purple-500/30">
          <div className="text-2xl font-bold text-purple-500">{summary.startsNextYearCount}</div>
          <div className="text-sm text-theme-muted">Register by Jan 1</div>
        </div>
        <div className="card-theme rounded-xl p-4 border border-orange-500/30">
          <div className="text-2xl font-bold text-orange-600">{summary.closeCount}</div>
          <div className="text-sm text-theme-muted">Getting close (75%+)</div>
        </div>
        <div className="card-theme rounded-xl p-4 border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-500">{checkCount}</div>
          <div className="text-sm text-theme-muted">Past years or rules to check</div>
        </div>
      </div>

      {/* Method */}
      <details className="card-theme rounded-xl border border-theme-primary p-4 text-sm">
        <summary className="cursor-pointer list-none flex items-start gap-2 text-theme-secondary">
          <Info className="w-4 h-4 mt-0.5 text-theme-accent flex-shrink-0" aria-hidden />
          <span>
            Based on your orders from {formatDay(coverage.earliestOrder)} to {formatDay(coverage.latestOrder)}
            {coverage.hasMarketplaceData ? ', including marketplace sales' : ''}. You sold into {withSales.length}{' '}
            {withSales.length === 1 ? 'state' : 'states'} with a sales tax
            {soldInto > withSales.length ? `, plus ${soldInto - withSales.length} without one` : ''}. State rules reviewed{' '}
            {evaluations[0]?.rulesReviewed}.{' '}
            <span className="text-theme-accent">How Sails measures</span>
          </span>
        </summary>
        <ul className="mt-3 list-disc pl-5 space-y-1 text-theme-secondary">
          <li>Sales are your order totals minus the sales tax you collected. Shipping is included; cancelled and refunded orders are not.</li>
          <li>
            Each state is measured over its own period: last calendar year, this year, or rolling 12-month periods (checked at
            every month-end in the past year).
          </li>
          <li>Marketplace sales (Amazon, Etsy, eBay…) only count in states that count them toward your threshold.</li>
          <li>Each order counts as one transaction.</li>
          {coverage.cappedMonths.length > 0 && (
            <li>
              Your plan&apos;s monthly limit was reached in {coverage.cappedMonths.length} month
              {coverage.cappedMonths.length === 1 ? '' : 's'}; orders beyond it weren&apos;t imported, so some totals may be low.
            </li>
          )}
          <li>
            These are estimates to help you decide what to check. They aren&apos;t tax advice — confirm with the state or a tax
            professional before registering.
          </li>
        </ul>
      </details>

      {/* Filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter states">
        {(
          [
            ['attention', `Needs attention (${attention.length})`],
            ['with_sales', `States with sales (${withSales.length})`],
            ['all', 'All states'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={activeFilter === key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeFilter === key ? 'btn-theme-primary text-white' : 'bg-white/10 text-theme-secondary hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* State cards */}
      <div className="card-theme rounded-xl border border-theme-primary overflow-hidden divide-y divide-[var(--border-primary)]">
        {shown.map((e) => (
          <StateCard key={e.stateCode} e={e} />
        ))}
        {shown.length === 0 && (
          <div className="p-8 text-center text-theme-muted">
            <Info className="w-8 h-8 mx-auto mb-3 opacity-50" aria-hidden />
            <p>{activeFilter === 'attention' ? 'No states need attention right now.' : 'No states match this filter.'}</p>
          </div>
        )}
      </div>

      {activeFilter === 'all' && noSalesTaxStates.length > 0 && (
        <div className="card-theme rounded-xl border border-theme-primary p-4">
          <h3 className="text-sm font-medium text-theme-muted mb-2">States with no statewide sales tax</h3>
          <div className="flex flex-wrap gap-2">
            {noSalesTaxStates.map((state) => (
              <span key={state.stateCode} className="px-3 py-1 rounded-lg bg-white/5 text-theme-muted text-sm" title={state.why.join(' ')}>
                {state.stateName}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
