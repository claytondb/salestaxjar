import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarClock, ExternalLink, Landmark, Lock, Scale, ShoppingBag, Store } from 'lucide-react';
import MarketingHeader from '@/components/MarketingHeader';
import Footer from '@/components/Footer';
import { STATE_GUIDES, describeDueDates, getStateGuideBySlug, stateFaq, type StateGuide } from '@/lib/state-guides';
import { NEXUS_RULES_REVIEWED_LABEL, NEXUS_RULES_SOURCES } from '@/lib/nexus-thresholds';

interface Props {
  params: Promise<{ state: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return STATE_GUIDES.map((g) => ({ state: g.slug }));
}

function describe(guide: StateGuide): string {
  if (!guide.hasSalesTax) {
    return guide.rule.localNexus
      ? `${guide.name} has no state sales tax, but many towns collect from remote sellers through the ${guide.rule.localNexus.body}. What online sellers need to know.`
      : `${guide.name} has no statewide sales tax. What that means for online sellers, and how to check the states where you do owe.`;
  }
  const defaultFiling = guide.filing.find((f) => f.isDefault);
  return `${guide.shortName} economic nexus: ${guide.threshold} ${guide.periodPhrase}. Marketplace sales ${
    guide.marketplaceCounts ? 'count' : "don't count"
  }.${defaultFiling ? ` ${defaultFiling.label.replace(/ \(.*\)$/, '')} returns are ${defaultFiling.due}.` : ''} Check your own orders free.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const guide = getStateGuideBySlug(state);
  if (!guide) return { title: 'State not found' };
  const title = guide.hasSalesTax
    ? `${guide.name} Sales Tax: Economic Nexus Threshold & Due Dates`
    : `${guide.name} Sales Tax for Online Sellers`;
  const description = describe(guide);
  const url = `https://sails.tax/sales-tax/${guide.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="card-theme rounded-xl p-5">
      <dt className="flex items-center gap-2 text-sm text-theme-muted mb-1">
        {icon}
        {label}
      </dt>
      <dd className="text-theme-primary">{children}</dd>
    </div>
  );
}

const ICON = 'w-4 h-4 text-theme-accent';

export default async function StateSalesTaxPage({ params }: Props) {
  const { state } = await params;
  const guide = getStateGuideBySlug(state);
  if (!guide) notFound();

  const { name, shortName, rule } = guide;
  const faq = stateFaq(guide);
  const url = `https://sails.tax/sales-tax/${guide.slug}`;
  const others = STATE_GUIDES.filter((g) => g.code !== guide.code);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Sales tax by state', item: 'https://sails.tax/sales-tax' },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-theme-gradient">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-theme-muted mb-6">
          <Link href="/sales-tax" className="hover:text-theme-primary">
            Sales tax by state
          </Link>
          <span aria-hidden> › </span>
          <span className="text-theme-secondary">{name}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-3">{name} sales tax for online sellers</h1>
          <p className="text-lg text-theme-secondary">
            {guide.hasSalesTax
              ? `When an online seller has to register in ${shortName}, which sales count, and when returns are due.`
              : `${name} has no statewide sales tax. Here's what that means if you sell online.`}
          </p>
          <p className="text-sm text-theme-muted mt-2">Rules reviewed {NEXUS_RULES_REVIEWED_LABEL}.</p>
        </header>

        {guide.hasSalesTax ? (
          <>
            <dl className="grid sm:grid-cols-2 gap-4 mb-10">
              <Fact icon={<Scale className={ICON} aria-hidden />} label="Economic nexus threshold">
                <span className="text-xl font-semibold">{guide.threshold}</span>
              </Fact>
              <Fact icon={<CalendarClock className={ICON} aria-hidden />} label="Measured over">
                {guide.period}
                {rule.measurementNote && <span className="block text-sm text-theme-secondary mt-1">{rule.measurementNote}</span>}
              </Fact>
              <Fact icon={<Store className={ICON} aria-hidden />} label="Sales that count">
                {guide.countedSales}
              </Fact>
              <Fact icon={<ShoppingBag className={ICON} aria-hidden />} label="Marketplace sales (Amazon, Etsy, eBay…)">
                {guide.marketplaceCounts ? 'Count toward the threshold' : "Don't count toward the threshold"}
              </Fact>
            </dl>

            <section className="mb-10" aria-labelledby="register-heading">
              <h2 id="register-heading" className="text-2xl font-bold text-theme-primary mb-3">
                Do you need to register in {shortName}?
              </h2>
              <div className="space-y-3 text-theme-secondary leading-relaxed">
                <p>
                  Online sellers based outside {shortName} need to register and collect {shortName} sales tax once their
                  sales into the state meet the threshold: {guide.threshold?.charAt(0).toLowerCase()}
                  {guide.threshold?.slice(1)} {guide.periodPhrase}.
                  {rule.measurementNote ? ` ${rule.measurementNote}` : ''}
                  {rule.measurementPeriod === 'previous_calendar_year'
                    ? ` ${shortName} looks only at the previous calendar year, so sales this year decide whether you need to register next year.`
                    : ''}
                </p>
                <p>{guide.marketplace}</p>
                {guide.extraNote && <p>{guide.extraNote}</p>}
                <p>
                  How soon you must register after passing the threshold depends on the state, so check {shortName}&apos;s
                  rules when you get close. Businesses located in {shortName} usually need to register whatever their sales.
                </p>
              </div>
              {guide.registration && (
                <a
                  href={guide.registration.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-theme-accent font-medium hover:underline"
                >
                  <Landmark className="w-4 h-4" aria-hidden />
                  Register with {guide.registration.portalName}
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              )}
            </section>
          </>
        ) : (
          <section className="mb-10 space-y-3 text-theme-secondary leading-relaxed">
            {faq.map((f) => (
              <p key={f.question}>{f.answer}</p>
            ))}
            {rule.localNexus && (
              <a
                href={rule.localNexus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-theme-accent font-medium hover:underline"
              >
                {rule.localNexus.body}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            )}
            <p>
              Selling into other states is different: most have a threshold, and once your sales there pass it you need to
              register and collect that state&apos;s tax.
            </p>
          </section>
        )}

        {/* Free check */}
        <section className="card-theme rounded-2xl p-6 sm:p-8 mb-10 border-2" style={{ borderColor: 'var(--accent-primary)' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-2">
            {guide.hasSalesTax ? `Are you over ${shortName}'s threshold?` : 'Where do you owe sales tax?'}
          </h2>
          <p className="text-theme-secondary mb-4">
            Drop in your Shopify, Amazon, Etsy or other order exports. Sails checks them against{' '}
            {guide.hasSalesTax ? `${shortName}'s rules and every other state's` : "every state's rules"} — including which
            states count marketplace sales — and tells you what to do next.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link href="/free-scan" className="btn-theme-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center justify-center gap-2">
              Run the free nexus check <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <span className="text-sm text-theme-muted inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" aria-hidden />
              Runs in your browser. Your files aren&apos;t uploaded.
            </span>
          </div>
        </section>

        {guide.filing.length > 0 && (
          <section className="mb-10" aria-labelledby="filing-heading">
            <h2 id="filing-heading" className="text-2xl font-bold text-theme-primary mb-3">
              Filing {shortName} sales tax returns
            </h2>
            <p className="text-theme-secondary mb-4">
              {shortName} assigns your filing frequency when you register, mostly based on how much tax you collect.{' '}
              {describeDueDates(guide)}
            </p>
            <div className="card-theme rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">{shortName} filing frequencies and due dates</caption>
                <thead>
                  <tr className="text-left text-theme-muted border-b border-theme-primary">
                    <th scope="col" className="p-3 font-medium">
                      How often
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Return due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guide.filing.map((f) => (
                    <tr key={f.period} className="border-b border-theme-primary last:border-b-0">
                      <td className="p-3 text-theme-primary align-top">{f.label}</td>
                      <td className="p-3 text-theme-secondary">{f.due.replace(/^due /, '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guide.filingNote && <p className="text-sm text-theme-secondary mt-3">{guide.filingNote}</p>}
            <p className="text-sm text-theme-muted mt-3">
              These are the standard due dates. When one falls on a weekend or holiday, most states move it to the next
              business day. Sails&apos; filing calendar assumes{' '}
              {guide.filing.find((f) => f.isDefault)?.label.replace(/ \(.*\)$/, '').toLowerCase()} filing for {shortName}, so
              check the frequency on your registration notice.
            </p>
          </section>
        )}

        <section className="mb-10 text-sm text-theme-muted space-y-2" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="text-base font-semibold text-theme-primary">
            Sources
          </h2>
          <p>
            Thresholds, measurement periods and marketplace rules were reviewed on {NEXUS_RULES_REVIEWED_LABEL} against:{' '}
            {NEXUS_RULES_SOURCES.map((src, i) => (
              <span key={src.url}>
                {i > 0 && '; '}
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
                  {src.name}
                </a>{' '}
                (updated {src.updated})
              </span>
            ))}
            . Filing due dates were checked against state revenue agency websites in September 2026.
          </p>
          <p>
            This page summarizes the rules to help you decide what to check. It isn&apos;t tax advice. Confirm with{' '}
            {shortName}&apos;s tax agency or a tax professional before you register or file.
          </p>
        </section>

        <section aria-labelledby="other-states-heading">
          <h2 id="other-states-heading" className="text-lg font-semibold text-theme-primary mb-3">
            Other states
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5 text-sm">
            {others.map((g) => (
              <li key={g.code}>
                <Link href={`/sales-tax/${g.slug}`} className="text-theme-secondary hover:text-theme-accent">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/sales-tax" className="text-theme-accent font-medium hover:underline">
              Compare every state&apos;s threshold →
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
