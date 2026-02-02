'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-theme rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Cookie Policy</h1>
          <p className="text-theme-muted mb-8">Last updated: January 27, 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-theme-secondary">
            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit a website. They are widely 
                used to make websites work more efficiently and to provide information to the owners of the site. 
                Cookies can be &quot;persistent&quot; (stored until deleted) or &quot;session&quot; (deleted when you close your browser).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">2. How We Use Cookies</h2>
              <p>Sails uses cookies for the following purposes:</p>
              
              <div className="mt-4 space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-theme-accent mb-2">Necessary Cookies</h3>
                  <p className="text-sm">
                    Essential for the website to function properly. These cookies enable core functionality such as 
                    security, authentication, and session management. Without these cookies, the site cannot function correctly.
                  </p>
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-theme-primary">
                        <th className="text-left py-2 text-theme-muted">Cookie</th>
                        <th className="text-left py-2 text-theme-muted">Purpose</th>
                        <th className="text-left py-2 text-theme-muted">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="py-2 font-mono text-theme-accent">salestaxjar_session</td>
                        <td className="py-2">Maintains your logged-in state</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2 font-mono text-theme-accent">salestaxjar_state</td>
                        <td className="py-2">Stores app preferences and data</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-theme-accent">salestaxjar_cookie_consent</td>
                        <td className="py-2">Remembers your cookie preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-theme-accent mb-2">Analytics Cookies</h3>
                  <p className="text-sm">
                    Help us understand how visitors interact with our website. This data is anonymized and aggregated, 
                    and is used to improve our services.
                  </p>
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-theme-primary">
                        <th className="text-left py-2 text-theme-muted">Cookie</th>
                        <th className="text-left py-2 text-theme-muted">Purpose</th>
                        <th className="text-left py-2 text-theme-muted">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="py-2 font-mono text-theme-accent">_ga</td>
                        <td className="py-2">Google Analytics - distinguishes users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-theme-accent">_gid</td>
                        <td className="py-2">Google Analytics - distinguishes users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-theme-accent mb-2">Preference Cookies</h3>
                  <p className="text-sm">
                    Allow the website to remember choices you make (such as your preferred language or region) and 
                    provide enhanced, personalized features.
                  </p>
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-theme-primary">
                        <th className="text-left py-2 text-theme-muted">Cookie</th>
                        <th className="text-left py-2 text-theme-muted">Purpose</th>
                        <th className="text-left py-2 text-theme-muted">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 font-mono text-theme-accent">theme_preference</td>
                        <td className="py-2">Remembers your display preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-theme-accent mb-2">Marketing Cookies</h3>
                  <p className="text-sm">
                    Used to track visitors across websites to display relevant advertisements. These are only set 
                    if you provide consent.
                  </p>
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-theme-primary">
                        <th className="text-left py-2 text-theme-muted">Cookie</th>
                        <th className="text-left py-2 text-theme-muted">Purpose</th>
                        <th className="text-left py-2 text-theme-muted">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 font-mono text-theme-accent">_fbp</td>
                        <td className="py-2">Facebook pixel for ad targeting</td>
                        <td className="py-2">3 months</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">3. Managing Cookies</h2>
              <p>You have several options for managing cookies:</p>
              
              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">Cookie Consent Tool</h3>
              <p>
                When you first visit our site, you&apos;ll see a cookie consent banner. You can customize your preferences 
                at any time by clicking the &quot;Customize&quot; button.
              </p>

              <h3 className="text-lg font-medium text-theme-accent mt-4 mb-2">Browser Settings</h3>
              <p>
                Most browsers allow you to control cookies through their settings. You can typically:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>View what cookies are stored</li>
                <li>Delete cookies individually or all at once</li>
                <li>Block third-party cookies</li>
                <li>Block all cookies (note: this may break site functionality)</li>
                <li>Clear cookies when you close your browser</li>
              </ul>

              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p className="font-medium text-theme-primary mb-2">Browser cookie settings:</p>
                <ul className="text-sm space-y-1">
                  <li>• <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:opacity-80">Chrome</a></li>
                  <li>• <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:opacity-80">Firefox</a></li>
                  <li>• <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:opacity-80">Safari</a></li>
                  <li>• <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:opacity-80">Edge</a></li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">4. Local Storage</h2>
              <p>
                In addition to cookies, we use browser local storage and session storage to store data locally 
                on your device. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Application state:</strong> Your calculations, settings, and preferences</li>
                <li><strong>Authentication data:</strong> Session tokens for logged-in users</li>
                <li><strong>User data:</strong> Account information (demo mode only)</li>
              </ul>
              <div className="rounded-lg p-4 mt-4" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
                  <strong>Demo Mode:</strong> This application uses localStorage for data persistence as a demonstration. 
                  In production, sensitive data would be stored securely on our servers.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">5. Do Not Track</h2>
              <p>
                Some browsers include a &quot;Do Not Track&quot; (DNT) feature. We currently do not respond to DNT signals, 
                but you can opt out of analytics and marketing cookies using our consent tool.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">6. Changes to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in technology, regulation, 
                or our practices. The &quot;Last updated&quot; date at the top indicates when the policy was last revised.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-theme-primary mb-4">7. Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p>Email: <a href="mailto:support@sails.tax" className="text-theme-accent hover:opacity-80">support@sails.tax</a></p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-theme-primary flex gap-4">
            <Link 
              href="/privacy" 
              className="text-theme-accent hover:opacity-80 transition"
            >
              ← Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-theme-accent hover:opacity-80 transition"
            >
              Terms of Service →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
