'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-theme rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Privacy Policy</h1>
          <p className="text-theme-muted mb-8">Last updated: September 25, 2026</p>

          <div className="prose legal-prose max-w-none space-y-8 text-theme-secondary">
            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">1. Introduction</h2>
              <p>
                Sails (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
                sales tax calculation and compliance service.
              </p>
              <p className="mt-4">
                Please read this Privacy Policy carefully. By using Sails, you agree to the collection and use of 
                information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password (stored in hashed form)</li>
                <li><strong>Business Information:</strong> Business name, address, EIN (optional), business type</li>
                <li><strong>Tax-Related Data:</strong> Nexus registrations, state registration numbers, filing history</li>
                <li><strong>Transaction Data:</strong> Sale amounts, product categories, state information for tax calculations</li>
                <li><strong>Payment Information:</strong> Billing details are collected and processed by Stripe. Sails never sees or stores your full card number.</li>
              </ul>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">2.2 Store and Order Data</h3>
              <p>
                When you connect a store or upload an order report, Sails imports only what sales tax work needs: order
                number and date, amounts, tax collected, order status, the items sold, and the ship-to city, state, ZIP
                and country. We do <strong>not</strong> store your buyers&apos; names, email addresses, phone numbers or
                street addresses, even when the platform provides them.
              </p>
              <p className="mt-2">
                Store connections only ask for read access. The keys that let Sails read your orders are encrypted
                (AES-256) before they are saved, and you can disconnect a store at any time.
              </p>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">2.3 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Log Data:</strong> IP address, access times, browser type and pages requested, kept by our hosting provider for security and troubleshooting</li>
                <li><strong>Error Reports:</strong> When something breaks, our error-monitoring service (Sentry) records technical details about the error, like the page address, your browser and the code that failed. It doesn&apos;t record your screen.</li>
              </ul>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">2.4 Cookies and Tracking</h3>
              <p>
                Sails uses one cookie, to keep you signed in. We don&apos;t use tracking or advertising cookies. See our{' '}
                <Link href="/cookies" className="text-theme-accent hover:text-emerald-300">Cookie Policy</Link> for details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide, maintain, and improve our sales tax calculation services</li>
                <li>Process tax calculations and generate compliance reports</li>
                <li>Send you the emails you&apos;ve asked for, like threshold alerts (you can turn these off in Settings)</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations and enforce our terms</li>
                <li>Understand how the service is used, in aggregate, so we can improve it</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">4. Data Sharing and Disclosure</h2>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Service Providers:</strong> The companies listed in section 10, only as needed to run Sails</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> For any other purpose with your explicit permission</li>
              </ul>
              <p className="mt-4">
                <strong>We do not sell your personal information</strong> to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">5. Data Security</h2>
              <p>
                We protect your data with these measures:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Encryption in transit (TLS) for every connection to Sails</li>
                <li>Encryption at rest by our database provider, plus an extra layer of AES-256 encryption on store connection keys</li>
                <li>Passwords stored only as bcrypt hashes</li>
                <li>Read-only access to your store — Sails can&apos;t change your orders or settings</li>
                <li>Rate limiting on sign-in and on our API</li>
                <li>Hosting on established cloud providers (Vercel and Neon) with physical security controls</li>
              </ul>
              <p className="mt-4">
                No system is perfectly secure. If you believe you&apos;ve found a security problem, please email{' '}
                <a href="mailto:support@sails.tax" className="text-theme-accent hover:text-emerald-300">support@sails.tax</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">6. Data Retention</h2>
              <p>
                We retain your personal data only for as long as necessary to fulfill the purposes described in this policy, 
                unless a longer retention period is required by law. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Account, business and order data:</strong> Kept while your account is open, because nexus is measured over the previous and current year. Deleting your account (Settings → Data &amp; Privacy) permanently deletes this data right away.</li>
                <li><strong>Billing records:</strong> Kept by Stripe as required for tax and accounting law</li>
                <li><strong>Server logs and error reports:</strong> Kept by our hosting and monitoring providers for a limited period</li>
                <li><strong>Email preferences:</strong> Kept until you change them or delete your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">7. Your Rights</h2>
              
              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">7.1 GDPR Rights (EU/EEA Residents)</h3>
              <p>Under the General Data Protection Regulation, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Restriction:</strong> Request limitation of processing</li>
                <li><strong>Objection:</strong> Object to certain types of processing</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">7.2 CCPA Rights (California Residents)</h3>
              <p>Under the California Consumer Privacy Act, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Know what personal information is collected about you</li>
                <li>Know whether your personal information is sold or disclosed and to whom</li>
                <li>Say no to the sale of personal information</li>
                <li>Access your personal information</li>
                <li>Request deletion of your personal information</li>
                <li>Not be discriminated against for exercising your privacy rights</li>
              </ul>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">7.3 Exercising Your Rights</h3>
              <p>
                To exercise any of these rights, please visit your{' '}
                <Link href="/settings" className="text-theme-accent hover:text-emerald-300">Account Settings</Link>{' '}
                or contact us at <a href="mailto:support@sails.tax" className="text-theme-accent hover:text-emerald-300">support@sails.tax</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">8. International Data Transfers</h2>
              <p>
                Sails is operated from the United States, and our service providers process data primarily in the
                United States. If you use Sails from outside the US, your information will be transferred to the US.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">9. Children&apos;s Privacy</h2>
              <p>
                Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
                information from children. If you become aware that a child has provided us with personal data, please 
                contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">10. Third-Party Services</h2>
              <p>Sails uses these service providers to run the service:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Vercel</strong> — website and application hosting</li>
                <li><strong>Neon</strong> — database hosting</li>
                <li><strong>Stripe</strong> — subscription billing and payments</li>
                <li><strong>Resend</strong> — sending account emails and the alerts you&apos;ve turned on</li>
                <li><strong>Sentry</strong> — error monitoring</li>
                <li><strong>Upstash</strong> — rate limiting</li>
                <li><strong>TaxJar</strong> — tax rate lookups for some calculations (the destination address and amount are sent)</li>
                <li><strong>Your store platform</strong> (for example Shopify or WooCommerce) — only when you connect it</li>
              </ul>
              <p className="mt-2">
                Each provider has its own privacy policy governing the information it processes for us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For material changes, we will 
                provide more prominent notice (including email notification for account holders).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
                <a href="mailto:support@sails.tax" className="text-theme-accent hover:text-emerald-300">support@sails.tax</a>
                {' '}or visit our{' '}
                <Link href="/contact" className="text-theme-accent hover:text-emerald-300">Contact page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
