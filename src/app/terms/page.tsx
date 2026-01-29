'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-theme rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Terms of Service</h1>
          <p className="text-theme-muted mb-8">Last updated: January 27, 2025</p>

          {/* Critical Tax Disclaimer Banner */}
          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: 'var(--error-bg)', border: '2px solid var(--error-border)' }}>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--error-text)' }}>
              <span>⚠️</span> IMPORTANT TAX DISCLAIMER
            </h2>
            <div className="space-y-3" style={{ color: 'var(--error-text)' }}>
              <p>
                <strong>Sails provides TAX ESTIMATION TOOLS and FILING PREPARATION ASSISTANCE ONLY.</strong> We are NOT a certified public accounting 
                (CPA) firm, tax advisory service, or law firm. Our tools are designed to assist with sales tax calculations 
                and generate filing-ready reports, but should not be relied upon as the sole basis for tax compliance decisions.
              </p>
              <p>
                <strong>Filing Assistance:</strong> We prepare reports and pre-fill data to help you file, but YOU are responsible for 
                reviewing all information and submitting your own tax returns. We do NOT file returns on your behalf, and we do NOT 
                hold or remit any tax funds.
              </p>
              <p>
                <strong>You are solely responsible for:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Verifying the accuracy of all tax calculations</li>
                <li>Ensuring compliance with applicable tax laws</li>
                <li>Filing accurate tax returns</li>
                <li>Consulting qualified tax professionals for advice specific to your situation</li>
              </ul>
              <p>
                Tax rates, rules, and exemptions change frequently. We make reasonable efforts to maintain accurate data, 
                but <strong>we cannot guarantee that our rates are current or complete</strong>. Local taxes (city, county, 
                special districts) may apply and are not always reflected in our calculations.
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-theme-secondary">
            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Sails (&quot;the Service&quot;), you agree to be bound by these Terms of Service 
                (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service. We may modify these Terms at 
                any time, and your continued use of the Service after such modifications constitutes acceptance of the 
                updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">2. Description of Service</h2>
              <p>Sails provides:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Sales tax calculation tools for US states and territories</li>
                <li>Product category-based tax rate estimation</li>
                <li>Nexus determination assistance</li>
                <li>Filing deadline tracking and reminders</li>
                <li>Integration with e-commerce platforms</li>
                <li>Tax calculation history and reporting</li>
              </ul>
              <p className="mt-4">
                The Service is provided &quot;as is&quot; and is intended to assist with sales tax compliance, not replace 
                professional tax advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">3. User Responsibilities</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide accurate and complete information when registering</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Use the Service only for lawful business purposes</li>
                <li>Not attempt to reverse engineer, hack, or disrupt the Service</li>
                <li>Verify all tax calculations before filing returns</li>
                <li>Keep your own records for tax compliance purposes</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">4. Tax Rate Accuracy</h2>
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <p style={{ color: 'var(--warning-text)' }}>
                  <strong>Important:</strong> Tax rates in our system are estimates based on publicly available data.
                </p>
              </div>
              <p>Regarding our tax rate data:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Sources:</strong> State departments of revenue, tax foundation data, government publications</li>
                <li><strong>Updates:</strong> We aim to update rates quarterly, but changes may not be immediate</li>
                <li><strong>Local Taxes:</strong> City, county, and special district taxes may not be fully captured</li>
                <li><strong>Exemptions:</strong> Product exemptions are simplified and may not cover all scenarios</li>
                <li><strong>Verification:</strong> Always verify rates with official state tax authority websites</li>
              </ul>
              <p className="mt-4">
                Links to official state tax authorities can be found on our{' '}
                <Link href="/calculator" className="text-theme-accent hover:text-emerald-300">Calculator</Link> page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">5. Limitation of Liability</h2>
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <p className="uppercase font-semibold mb-2">DISCLAIMER OF WARRANTIES</p>
                <p>
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                  EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                  FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
              <div className="bg-white/5 border border-white/20 rounded-lg p-4 mt-4">
                <p className="uppercase font-semibold mb-2">LIMITATION OF DAMAGES</p>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SALESTAXJAR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                  SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Losses resulting from tax penalties, interest, or audits</li>
                  <li>Loss of profits, revenue, or business opportunities</li>
                  <li>Errors in tax calculations or rate data</li>
                  <li>Service interruptions or data loss</li>
                  <li>Reliance on information provided by the Service</li>
                </ul>
                <p className="mt-4">
                  OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE TWELVE (12) MONTHS 
                  PRECEDING THE CLAIM.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">6. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless Sails, its officers, directors, employees, 
                and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable 
                attorney&apos;s fees) arising out of or in any way connected with:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Tax penalties or interest resulting from your use of our calculations</li>
                <li>Any tax filings or compliance decisions based on our Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">7. Payment Terms</h2>
              <p>For paid subscriptions:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Fees are billed monthly or annually in advance</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>We may change pricing with 30 days&apos; notice</li>
                <li>Failure to pay may result in service suspension</li>
                <li>You are responsible for all applicable taxes on your subscription</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">8. Cancellation and Termination</h2>
              <p>
                You may cancel your subscription at any time through your account settings. Upon cancellation:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>You retain access until the end of your billing period</li>
                <li>You may export your data before the account closes</li>
                <li>We retain calculation history for 7 years per tax requirements</li>
                <li>We may terminate accounts for Terms violations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">9. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Service (including but not limited to text, graphics, 
                logos, and software) are owned by Sails and protected by intellectual property laws. You may not 
                copy, modify, distribute, or create derivative works without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">10. Privacy</h2>
              <p>
                Your use of the Service is also governed by our{' '}
                <Link href="/privacy" className="text-theme-accent hover:text-emerald-300">Privacy Policy</Link>, 
                which is incorporated into these Terms by reference.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">11. Dispute Resolution</h2>
              <p>
                Any disputes arising from these Terms or your use of the Service shall be:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Governed by the laws of the State of Delaware</li>
                <li>Subject to binding arbitration under AAA rules</li>
                <li>Conducted in Austin, Texas (or virtually)</li>
                <li>On an individual basis (no class actions)</li>
              </ul>
              <p className="mt-4">
                For disputes under $10,000, we encourage using our support team first: {' '}
                <a href="mailto:support@sails.tax" className="text-theme-accent hover:text-emerald-300">
                  support@sails.tax
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">12. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions will continue 
                in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">13. Entire Agreement</h2>
              <p>
                These Terms, together with the Privacy Policy and any other legal notices published on the Service, 
                constitute the entire agreement between you and Sails regarding the use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">14. Contact Information</h2>
              <p>For questions about these Terms, please contact us:</p>
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p><strong>Sails Legal Department</strong></p>
                <p>Email: <a href="mailto:legal@sails.tax" className="text-theme-accent hover:text-emerald-300">legal@sails.tax</a></p>
                <p>Address: 123 Tax Lane, Suite 100, Austin, TX 78701</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
