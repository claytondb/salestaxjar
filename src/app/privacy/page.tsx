'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: January 27, 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                SalesTaxJar (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
                sales tax calculation and compliance service.
              </p>
              <p className="mt-4">
                Please read this Privacy Policy carefully. By using SalesTaxJar, you agree to the collection and use of 
                information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password (stored in hashed form)</li>
                <li><strong>Business Information:</strong> Business name, address, EIN (optional), business type</li>
                <li><strong>Tax-Related Data:</strong> Nexus registrations, state registration numbers, filing history</li>
                <li><strong>Transaction Data:</strong> Sale amounts, product categories, state information for tax calculations</li>
                <li><strong>Payment Information:</strong> Billing address, payment method details (processed by third-party payment processors)</li>
              </ul>

              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the service</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              </ul>

              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">2.3 Cookies and Tracking</h3>
              <p>
                We use cookies and similar technologies to enhance your experience. See our{' '}
                <Link href="/cookies" className="text-emerald-400 hover:text-emerald-300">Cookie Policy</Link> for details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide, maintain, and improve our sales tax calculation services</li>
                <li>Process tax calculations and generate compliance reports</li>
                <li>Send you important notices about deadlines and rate changes</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations and enforce our terms</li>
                <li>Analyze usage patterns to improve our service (in aggregate, anonymized form)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Service Providers:</strong> Cloud hosting, payment processing, email delivery services</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> For any other purpose with your explicit permission</li>
              </ul>
              <p className="mt-4">
                <strong>We do not sell your personal information</strong> to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your data, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Password hashing using industry-standard algorithms</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure data centers with physical security controls</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Demo Mode Notice:</strong> This demonstration version uses browser localStorage for data storage. 
                  In production, all data would be stored in secure, encrypted databases with enterprise-grade security.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
              <p>
                We retain your personal data only for as long as necessary to fulfill the purposes described in this policy, 
                unless a longer retention period is required by law. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Account Data:</strong> Retained while your account is active, plus 30 days after deletion request</li>
                <li><strong>Tax Calculations:</strong> Retained for 7 years to comply with tax record-keeping requirements</li>
                <li><strong>Usage Logs:</strong> Retained for 90 days</li>
                <li><strong>Marketing Preferences:</strong> Retained until you opt out</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
              
              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">7.1 GDPR Rights (EU/EEA Residents)</h3>
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

              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">7.2 CCPA Rights (California Residents)</h3>
              <p>Under the California Consumer Privacy Act, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Know what personal information is collected about you</li>
                <li>Know whether your personal information is sold or disclosed and to whom</li>
                <li>Say no to the sale of personal information</li>
                <li>Access your personal information</li>
                <li>Request deletion of your personal information</li>
                <li>Not be discriminated against for exercising your privacy rights</li>
              </ul>

              <h3 className="text-lg font-medium text-emerald-400 mt-4 mb-2">7.3 Exercising Your Rights</h3>
              <p>
                To exercise any of these rights, please visit your{' '}
                <Link href="/settings" className="text-emerald-400 hover:text-emerald-300">Account Settings</Link>{' '}
                or contact us at <a href="mailto:privacy@salestaxjar.com" className="text-emerald-400 hover:text-emerald-300">privacy@salestaxjar.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the 
                European Commission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
              <p>
                Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
                information from children. If you become aware that a child has provided us with personal data, please 
                contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Third-Party Services</h2>
              <p>We may integrate with the following types of third-party services:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>E-commerce Platforms:</strong> Shopify, Amazon, Etsy, WooCommerce, etc.</li>
                <li><strong>Payment Processors:</strong> Stripe, PayPal</li>
                <li><strong>Analytics:</strong> Google Analytics (anonymized)</li>
                <li><strong>Customer Support:</strong> Help desk software</li>
              </ul>
              <p className="mt-2">
                Each third-party service has its own privacy policy governing the use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For material changes, we will 
                provide more prominent notice (including email notification for account holders).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Contact Us</h2>
              <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p><strong>SalesTaxJar Privacy Team</strong></p>
                <p>Email: <a href="mailto:privacy@salestaxjar.com" className="text-emerald-400 hover:text-emerald-300">privacy@salestaxjar.com</a></p>
                <p>Address: 123 Tax Lane, Suite 100, Austin, TX 78701</p>
                <p className="mt-2">
                  For GDPR inquiries: <a href="mailto:dpo@salestaxjar.com" className="text-emerald-400 hover:text-emerald-300">dpo@salestaxjar.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
