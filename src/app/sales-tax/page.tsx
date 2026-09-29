import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import MarketingHeader from '@/components/MarketingHeader';
import Footer from '@/components/Footer';
import { STATE_GUIDES } from '@/lib/state-guides';
import { NEXUS_RULES_REVIEWED_LABEL, NEXUS_RULES_SOURCES } from '@/lib/nexus-thresholds';

const title = 'Sales Tax by State for Online Sellers: Nexus Thresholds & Due Dates';
const description =
  "Every state's economic nexus threshold, the period it's measured over, whether marketplace sales count, and when returns are due — reviewed " +
  `${NEXUS_RULES_REVIEWED_LABEL}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://sails.tax/sales-tax' },
  openGraph: { title, description, url: 'https://sails.tax/sales-tax', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function SalesTaxByStatePage() {
  const taxed = STATE_GUIDES.filter((g) => g.hasSalesTax);
  const taxedStates = taxed.filter((g) => g.code !== 'DC').length;
  const noTax = STATE_GUIDES.filter((g) => !g.hasSalesTax && !g.rule.localNexus).map((g) => g.name);
  const noTaxList = noTax.length > 1 ? `${noTax.slice(0, -1).join(', ')} and ${noTax[noTax.length - 1]}` : noTax.join('');
  const marketplaceCount = taxed.filter((g) => g.marketplaceCounts).length;
  const withTransactions = taxed.filter((g) => g.rule.transactionThreshold).length;

  return (
    <div className="min-h-screen bg-theme-gradient">
      <MarketingHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-3">Sales tax by state for online sellers</h1>
          <p className="text-lg text-theme-secondary max-w-3xl">
            Once your sales into a state pass its economic nexus threshold, you need to register there and collect its
            sales tax. Here&apos;s each state&apos;s threshold, what it counts, and when returns are due.
          </p>
          <p className="text-sm text-theme-muted mt-2">Rules reviewed {NEXUS_RULES_REVIEWED_LABEL}.</p>
        </header>

        <section className="grid sm:grid-cols-3 gap-4 mb-8 text-sm">
          <div className="card-theme rounded-xl p-5">
            <p className="text-2xl font-bold text-theme-primary">{taxedStates}</p>
            <p className="text-theme-secondary">
              states and DC have a statewide sales tax. {noTaxList} don&apos;t, and Alaska has only local sales taxes.
            </p>
          </div>
          <div className="card-theme rounded-xl p-5">
            <p className="text-2xl font-bold text-theme-primary">{marketplaceCount}</p>
            <p className="text-theme-secondary">
              of them count your Amazon, Etsy and eBay sales toward the threshold, even though the marketplace collects the
              tax.
            </p>
          </div>
          <div className="card-theme rounded-xl p-5">
            <p className="text-2xl font-bold text-theme-primary">{withTransactions}</p>
            <p className="text-theme-secondary">
              still have a number-of-transactions test as well as a dollar amount. The rest look at sales dollars only.
            </p>
          </div>
        </section>

        <section className="card-theme rounded-2xl overflow-hidden mb-8" aria-labelledby="table-heading">
          <h2 id="table-heading" className="sr-only">
            Economic nexus thresholds by state
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-theme-muted border-b border-theme-primary">
                <th scope="col" className="p-3 font-medium">
                  State
                </th>
                <th scope="col" className="p-3 font-medium">
                  Threshold
                </th>
                <th scope="col" className="p-3 font-medium hidden md:table-cell">
                  Measured over
                </th>
                <th scope="col" className="p-3 font-medium">
                  <span className="hidden sm:inline">Marketplace sales count?</span>
                  <span className="sm:hidden">Marketplace?</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {STATE_GUIDES.map((g) => (
                <tr key={g.code} className="border-b border-theme-primary last:border-b-0 align-top">
                  <th scope="row" className="p-3 text-left font-medium">
                    <Link href={`/sales-tax/${g.slug}`} className="text-theme-accent hover:underline">
                      {g.name}
                    </Link>
                  </th>
                  <td className="p-3 text-theme-primary">{g.thresholdShort}</td>
                  <td className="p-3 text-theme-secondary hidden md:table-cell">{g.hasSalesTax ? g.period : '—'}</td>
                  <td className="p-3 text-theme-secondary">{g.hasSalesTax ? (g.marketplaceCounts ? 'Yes' : 'No') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card-theme rounded-2xl p-6 sm:p-8 mb-8 border-2" style={{ borderColor: 'var(--accent-primary)' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-2">Check your own orders against every state</h2>
          <p className="text-theme-secondary mb-4">
            Drop in your Shopify, Amazon, Etsy or other order exports. Sails measures each state the way that state does —
            its period, its sales and its marketplace rule — and tells you where you&apos;re over, where you&apos;re close,
            and what to do next.
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

        <section className="text-sm text-theme-muted space-y-2">
          <p>
            Sources, reviewed {NEXUS_RULES_REVIEWED_LABEL}:{' '}
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
            These summaries help you decide what to check. They aren&apos;t tax advice. Confirm with the state or a tax
            professional before you register or file.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
