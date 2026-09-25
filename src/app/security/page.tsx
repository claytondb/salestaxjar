import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SERVICE_PROVIDERS } from '@/lib/service-providers';

export const metadata: Metadata = {
  title: 'Security — How Sails Protects Your Store Data',
  description:
    'How Sails protects your store connection and order data: read-only access, encrypted store keys, minimal data kept, and the service providers Sails uses.',
  alternates: { canonical: 'https://sails.tax/security' },
};

const REVIEWED = 'September 25, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-theme-primary mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-theme rounded-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">How Sails protects your data</h1>
          <p className="text-theme-muted mb-6">Last reviewed: {REVIEWED}</p>
          <p className="text-theme-secondary mb-8">
            Sails is a small company, so here&apos;s plainly what we do today — no badges or certifications we don&apos;t
            have.
          </p>

          <div className="space-y-8 text-theme-secondary">
            <Section title="Your store connection">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Sails only asks for read access: permission to read orders and store locations on Shopify, and a
                  read-only API key on WooCommerce. Sails only ever reads — it never changes your orders, products or
                  settings.
                </li>
                <li>
                  The keys that let Sails read your store are encrypted with AES-256-GCM before they&apos;re saved, using a
                  key kept outside the database.
                </li>
                <li>
                  While a Shopify or WooCommerce store is connected, Sails checks it for new orders once a day and whenever
                  you click Sync.
                </li>
                <li>
                  Disconnecting a store deletes its saved keys straight away. Orders already imported stay in your account
                  until you delete your account.
                </li>
              </ul>
            </Section>

            <Section title="What Sails keeps — and what it doesn't">
              <p className="mb-2">
                From each order, Sails keeps only what sales tax work needs: the order number and date, amounts, tax
                collected, status, the items sold (name, quantity, price and SKU), and the ship-to city, state, ZIP code and
                country.
              </p>
              <p className="mb-2">
                Sails does <strong>not</strong> keep your buyers&apos; names, email addresses, phone numbers or street
                addresses, even when your store platform sends them.
              </p>
              <p>
                The <Link href="/free-scan" className="text-theme-accent hover:underline">free nexus check</Link> reads
                your files in your browser. They&apos;re never uploaded to Sails or anyone else.
              </p>
            </Section>

            <Section title="Your account">
              <ul className="list-disc pl-6 space-y-2">
                <li>Passwords are stored only as bcrypt hashes, never in readable form.</li>
                <li>You stay signed in with a secure, HTTP-only cookie that expires after 7 days.</li>
                <li>Sign-in attempts are rate limited to slow down password guessing.</li>
                <li>
                  Sails doesn&apos;t offer two-factor sign-in yet, so use a strong password you don&apos;t use anywhere
                  else.
                </li>
              </ul>
            </Section>

            <Section title="Infrastructure">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Every connection to Sails uses HTTPS, and browsers are told to always use it (HSTS). Pages also send
                  standard security headers that block framing and content-type sniffing.
                </li>
                <li>
                  Sails runs on Vercel, and its database is hosted by Neon, which encrypts stored data. Store keys get the
                  extra layer of encryption described above.
                </li>
                <li>Error reports leave personal details out by default, and Sails doesn&apos;t record screens or sessions.</li>
                <li>Sails uses one cookie, to keep you signed in. There are no tracking or advertising cookies.</li>
              </ul>
            </Section>

            <Section title="You're in control">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Download a copy of your data at any time, or delete your account and data permanently, in Settings → Data
                  &amp; Privacy.
                </li>
                <li>Turn alert, reminder and tip emails on or off in Settings → Notifications.</li>
              </ul>
            </Section>

            <Section title="Service providers">
              <p className="mb-3">Sails uses these companies to run the service. Each only gets what it needs:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-theme-primary rounded-lg">
                  <thead>
                    <tr className="text-left bg-theme-card">
                      <th className="p-3 font-semibold text-theme-primary">Provider</th>
                      <th className="p-3 font-semibold text-theme-primary">What it does</th>
                      <th className="p-3 font-semibold text-theme-primary">What it receives</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SERVICE_PROVIDERS.map((p) => (
                      <tr key={p.name} className="border-t border-theme-primary align-top">
                        <td className="p-3 font-medium text-theme-primary whitespace-nowrap">{p.name}</td>
                        <td className="p-3">{p.purpose}</td>
                        <td className="p-3">{p.data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm">
                Your store platform (for example Shopify or WooCommerce) is where the orders come from. Sails reads from it
                only after you connect your store, and stops when you disconnect it.
              </p>
            </Section>

            <Section title="Found a problem?">
              <p>
                If you think you&apos;ve found a security issue, please email{' '}
                <a href="mailto:support@sails.tax" className="text-theme-accent hover:underline">
                  support@sails.tax
                </a>{' '}
                with the details. A person reads every message, and we&apos;ll reply as soon as we can. See also our{' '}
                <Link href="/privacy" className="text-theme-accent hover:underline">
                  privacy policy
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
