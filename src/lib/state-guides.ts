/**
 * Plain-language summaries of each state's sales tax rules for online
 * sellers, built from the reviewed rule tables (nexus-thresholds.ts,
 * filing-deadlines.ts, state-registration-urls.ts). Used by the public
 * /sales-tax pages, so the pages can never disagree with the nexus engine.
 */

import {
  COUNTED_SALES_LABELS,
  MEASUREMENT_PERIOD_LABELS,
  STATE_NEXUS_THRESHOLDS,
  type NexusThreshold,
} from './nexus-thresholds';
import {
  getFilingScheduleSummary,
  getStateFilingConfig,
  type FilingPeriod,
} from './filing-deadlines';
import { getStateRegistrationUrl } from './state-registration-urls';
import { stateSlug } from './state-slug';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export { stateSlug };

function money(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

/** "$100K" for tables */
function shortMoney(amount: number): string {
  return amount >= 1000 && amount % 1000 === 0 ? `$${(amount / 1000).toLocaleString('en-US')}K` : money(amount);
}

const SALES_NOUN: Record<NexusThreshold['countedSales'], string> = {
  gross: 'sales',
  retail: 'retail sales',
  taxable: 'taxable sales',
};

export interface FilingOption {
  period: FilingPeriod;
  /** "Quarterly" or "Quarterly (Mar–May, Jun–Aug, Sep–Nov, Dec–Feb)" */
  label: string;
  /** "due the 20th of the following month" */
  due: string;
  /** The frequency Sails' filing calendar starts with */
  isDefault: boolean;
}

export interface StateGuide {
  code: string;
  name: string;
  /** The name as used mid-sentence and in headings ("DC" for the District of Columbia) */
  shortName: string;
  slug: string;
  rule: NexusThreshold;
  hasSalesTax: boolean;
  /** "$100,000 in sales or 200 transactions"; null when there's no statewide threshold */
  threshold: string | null;
  /** "$100K or 200 transactions" (tables) */
  thresholdShort: string;
  /** "Previous or current calendar year" */
  period: string;
  /** "in the previous or current calendar year" */
  periodPhrase: string;
  countedSales: string;
  marketplaceCounts: boolean;
  /** One or two sentences on marketplace sales */
  marketplace: string;
  filing: FilingOption[];
  filingNote?: string;
  registration?: { url: string; portalName: string };
  /** Anything in the rule's notes that the threshold line doesn't already say */
  extraNote: string | null;
}

/**
 * The rule notes often just restate the threshold ("$100K in sales OR 200
 * transactions."). Keep only what adds something: other taxes, programs, or
 * a repealed transaction test.
 */
function extraNoteFor(rule: NexusThreshold): string | null {
  const notes = rule.notes.trim();
  if (!notes || /^no sales tax\.?$/i.test(notes)) return null;
  if (!/^(more than )?\$/i.test(notes)) return notes;
  // A restated threshold that still adds a detail worth keeping
  if (/tangible personal property|all channels|checked quarterly/i.test(notes)) return notes;
  const repeal = notes.match(/(\d+)-transaction threshold repealed effective ([^.]+)\./i);
  if (repeal) {
    return `${shortNameFor(rule)} dropped its ${repeal[1]}-transaction test effective ${repeal[2]}, so only sales dollars count.`;
  }
  return null;
}

function periodPhrase(rule: NexusThreshold): string {
  switch (rule.measurementPeriod) {
    case 'previous_calendar_year':
      return 'in the previous calendar year';
    case 'rolling_12_months':
      return 'in the previous 12 months';
    default:
      return 'in the previous or current calendar year';
  }
}

function thresholdText(rule: NexusThreshold): string | null {
  if (!rule.hasSalesTax || rule.salesThreshold === null) return null;
  const sales = `${rule.salesThresholdExclusive ? 'more than ' : ''}${money(rule.salesThreshold)} in ${SALES_NOUN[rule.countedSales]}`;
  const text = (() => {
    if (!rule.transactionThreshold) return sales;
    const count = `${rule.transactionThresholdExclusive ? 'more than ' : ''}${rule.transactionThreshold.toLocaleString('en-US')} transactions`;
    return rule.logic === 'and' ? `${sales} and ${count} (both)` : `${sales} or ${count}`;
  })();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function thresholdShortText(rule: NexusThreshold): string {
  if (!rule.hasSalesTax || rule.salesThreshold === null) {
    return rule.localNexus ? `No state tax (local ${shortMoney(rule.localNexus.salesThreshold)})` : 'No sales tax';
  }
  const sales = `${rule.salesThresholdExclusive ? 'Over ' : ''}${shortMoney(rule.salesThreshold)}`;
  if (!rule.transactionThreshold) return sales;
  const count = `${rule.transactionThresholdExclusive ? 'over ' : ''}${rule.transactionThreshold} transactions`;
  return `${sales} ${rule.logic === 'and' ? 'and' : 'or'} ${count}`;
}

/** "DC" for the District of Columbia, whose full name reads awkwardly mid-sentence */
function shortNameFor(rule: NexusThreshold): string {
  return rule.stateCode === 'DC' ? 'DC' : rule.stateName;
}

function marketplaceText(rule: NexusThreshold): string {
  const name = shortNameFor(rule);
  const base =
    rule.marketplaceSales === 'included'
      ? `Sales through marketplaces like Amazon, Etsy and eBay count toward ${name}'s threshold, even though the marketplace collects the tax on them.`
      : `Sales through marketplaces like Amazon, Etsy and eBay don't count toward ${name}'s threshold.`;
  return rule.marketplaceNote ? `${base} ${rule.marketplaceNote}` : base;
}

function filingOptions(code: string): FilingOption[] {
  const config = getStateFilingConfig(code);
  if (config.noStateSalesTax) return [];
  const periods: FilingPeriod[] = ['monthly'];
  if (config.quarterlyDue !== undefined) periods.push('quarterly');
  if (config.annual) periods.push('annual');
  return periods.map((period) => {
    const [label, due] = getFilingScheduleSummary(code, period).split(' · ');
    let dueText = due ?? '';
    if (period === 'monthly' && config.monthlyDueExceptions) {
      const exceptions = Object.entries(config.monthlyDueExceptions).map(([month, day]) => {
        const m = Number(month);
        const dueMonth = MONTHS[(m + 1) % 12];
        return `${MONTHS[m]} returns are due ${day === 'last' ? `the last day of ${dueMonth}` : `${dueMonth} ${day}`}`;
      });
      dueText = `${dueText} (${exceptions.join('; ')})`;
    }
    return { period, label, due: dueText, isDefault: period === config.defaultPeriod };
  });
}

export function buildStateGuide(rule: NexusThreshold): StateGuide {
  const registration = getStateRegistrationUrl(rule.stateCode);
  const config = getStateFilingConfig(rule.stateCode);
  return {
    code: rule.stateCode,
    name: rule.stateName,
    shortName: shortNameFor(rule),
    slug: stateSlug(rule.stateName),
    rule,
    hasSalesTax: rule.hasSalesTax,
    threshold: thresholdText(rule),
    thresholdShort: thresholdShortText(rule),
    period: MEASUREMENT_PERIOD_LABELS[rule.measurementPeriod],
    periodPhrase: periodPhrase(rule),
    countedSales: COUNTED_SALES_LABELS[rule.countedSales],
    marketplaceCounts: rule.marketplaceSales === 'included',
    marketplace: marketplaceText(rule),
    filing: filingOptions(rule.stateCode),
    filingNote: config.note,
    registration: registration ? { url: registration.registrationUrl, portalName: registration.portalName } : undefined,
    extraNote: extraNoteFor(rule),
  };
}

/** Every state plus DC, alphabetical by name. */
export const STATE_GUIDES: StateGuide[] = STATE_NEXUS_THRESHOLDS.map(buildStateGuide).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function getStateGuideBySlug(slug: string): StateGuide | undefined {
  return STATE_GUIDES.find((g) => g.slug === slug);
}

export function getStateGuideByCode(code: string): StateGuide | undefined {
  return STATE_GUIDES.find((g) => g.code === code.toUpperCase());
}

/** "Monthly and quarterly returns are due the 20th of the following month. Annual returns are due January 20." */
export function describeDueDates(guide: StateGuide): string {
  const groups = new Map<string, string[]>();
  for (const option of guide.filing) {
    const labels = groups.get(option.due) ?? [];
    labels.push(option.period);
    groups.set(option.due, labels);
  }
  return [...groups.entries()]
    .map(([due, periods]) => {
      const list = periods.length === 1 ? periods[0] : `${periods.slice(0, -1).join(', ')} and ${periods[periods.length - 1]}`;
      return `${list.charAt(0).toUpperCase()}${list.slice(1)} returns are ${due}.`;
    })
    .join(' ');
}

/** Short questions and answers for a state, shown on its page and as FAQ data. */
export function stateFaq(guide: StateGuide): { question: string; answer: string }[] {
  const { shortName: name, rule } = guide;
  if (!guide.hasSalesTax) {
    const answer = rule.localNexus
      ? `${name} has no statewide sales tax, but many local governments collect sales tax from remote sellers through the ${rule.localNexus.body}, which uses a ${money(rule.localNexus.salesThreshold)} threshold.`
      : `No. ${name} has no statewide sales tax, so there's no sales tax economic nexus threshold to track.`;
    return [{ question: `Do online sellers have to collect sales tax in ${name}?`, answer }];
  }
  const faq = [
    {
      question: `What is ${name}'s economic nexus threshold?`,
      answer: `${guide.threshold} ${guide.periodPhrase}.${rule.measurementNote ? ` ${rule.measurementNote}` : ''}`,
    },
    {
      question: `Do marketplace sales count toward ${name}'s threshold?`,
      answer: guide.marketplace,
    },
  ];
  const defaultFiling = guide.filing.find((f) => f.isDefault);
  if (defaultFiling) {
    faq.push({
      question: `When are ${name} sales tax returns due?`,
      answer: `${name} assigns your filing frequency when you register. ${describeDueDates(guide)}`,
    });
  }
  return faq;
}
