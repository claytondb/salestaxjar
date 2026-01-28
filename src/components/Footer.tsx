'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] py-12 px-4 bg-[var(--color-bg-muted)]">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[var(--color-logo-from)] to-[var(--color-logo-to)] rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-xl font-bold text-[var(--color-text)]">SalesTaxJar</span>
            </Link>
            <p className="text-[var(--color-text-muted)] text-sm">
              Simplifying sales tax compliance for e-commerce businesses across the United States.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-[var(--color-text)] font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-[var(--color-text-muted)] text-sm">
              <li><Link href="/calculator" className="hover:text-[var(--color-primary)] transition">Tax Calculator</Link></li>
              <li><Link href="/nexus" className="hover:text-[var(--color-primary)] transition">Nexus Tracker</Link></li>
              <li><Link href="/filings" className="hover:text-[var(--color-primary)] transition">Filing Management</Link></li>
              <li><Link href="/pricing" className="hover:text-[var(--color-primary)] transition">Pricing</Link></li>
              <li><Link href="/#features" className="hover:text-[var(--color-primary)] transition">Features</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-[var(--color-text)] font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-[var(--color-text-muted)] text-sm">
              <li><Link href="/terms" className="hover:text-[var(--color-primary)] transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--color-primary)] transition">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-[var(--color-primary)] transition">Cookie Policy</Link></li>
              <li><Link href="/terms#disclaimer" className="hover:text-[var(--color-primary)] transition">Tax Disclaimer</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-[var(--color-text)] font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-[var(--color-text-muted)] text-sm">
              <li><Link href="/contact" className="hover:text-[var(--color-primary)] transition">Contact Us</Link></li>
              <li><Link href="/contact#faq" className="hover:text-[var(--color-primary)] transition">FAQ</Link></li>
              <li><a href="mailto:support@salestaxjar.com" className="hover:text-[var(--color-primary)] transition">support@salestaxjar.com</a></li>
            </ul>
          </div>
        </div>

        {/* Tax Disclaimer Banner */}
        <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg p-4 mb-8">
          <p className="text-[var(--color-warning)] text-xs text-center">
            <strong>⚠️ IMPORTANT:</strong> SalesTaxJar provides tax estimation tools only. We are not a CPA firm or tax advisory service. 
            Tax calculations are estimates based on publicly available data and may not reflect current rates or local variations. 
            You are responsible for verifying accuracy and consulting qualified tax professionals. 
            <Link href="/terms" className="underline ml-1 hover:opacity-80">See full Terms of Service</Link>.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[var(--color-border)]">
          <div className="text-[var(--color-text-muted)] text-sm">
            © {currentYear} SalesTaxJar. All rights reserved.
          </div>
          <div className="flex gap-6 text-[var(--color-text-muted)] text-sm">
            <Link href="/privacy" className="hover:text-[var(--color-primary)] transition">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--color-primary)] transition">Terms</Link>
            <Link href="/cookies" className="hover:text-[var(--color-primary)] transition">Cookies</Link>
            <Link href="/contact" className="hover:text-[var(--color-primary)] transition">Contact</Link>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="flex justify-center gap-4 mt-8 text-[var(--color-text-light)] text-xs">
          <span className="px-2 py-1 border border-[var(--color-border)] rounded">🔒 SSL Secured</span>
          <span className="px-2 py-1 border border-[var(--color-border)] rounded">🇪🇺 GDPR Compliant</span>
          <span className="px-2 py-1 border border-[var(--color-border)] rounded">🇺🇸 CCPA Compliant</span>
        </div>
      </div>
    </footer>
  );
}
