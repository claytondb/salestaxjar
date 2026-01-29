'use client';

import Link from 'next/link';
import { AlertTriangle, Lock, Shield } from 'lucide-react';
import SailsLogo from './SailsLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-theme-primary py-12 px-4 bg-theme-secondary/50">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <SailsLogo className="w-9 h-9 text-theme-accent" />
              <span className="text-xl font-bold text-theme-primary">Sails</span>
            </Link>
            <p className="text-theme-muted text-sm">
              Simplifying sales tax compliance for e-commerce businesses across the United States.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-theme-primary font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-theme-muted text-sm">
              <li><Link href="/calculator" className="hover:text-theme-primary transition">Tax Calculator</Link></li>
              <li><Link href="/nexus" className="hover:text-theme-primary transition">Nexus Tracker</Link></li>
              <li><Link href="/filings" className="hover:text-theme-primary transition">Filing Management</Link></li>
              <li><Link href="/#pricing" className="hover:text-theme-primary transition">Pricing</Link></li>
              <li><Link href="/#features" className="hover:text-theme-primary transition">Features</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-theme-primary font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-theme-muted text-sm">
              <li><Link href="/terms" className="hover:text-theme-primary transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-theme-primary transition">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-theme-primary transition">Cookie Policy</Link></li>
              <li><Link href="/terms#disclaimer" className="hover:text-theme-primary transition">Tax Disclaimer</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-theme-primary font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-theme-muted text-sm">
              <li><Link href="/contact" className="hover:text-theme-primary transition">Contact Us</Link></li>
              <li><Link href="/contact#faq" className="hover:text-theme-primary transition">FAQ</Link></li>
              <li><a href="mailto:support@sails.tax" className="hover:text-theme-primary transition">support@sails.tax</a></li>
            </ul>
          </div>
        </div>

        {/* Tax Disclaimer Banner */}
        <div className="rounded-lg p-4 mb-8" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <p className="text-xs text-center flex items-start justify-center gap-2" style={{ color: 'var(--warning)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span><strong>IMPORTANT:</strong> Sails provides tax estimation tools only. We are not a CPA firm or tax advisory service. 
            Tax calculations are estimates based on publicly available data and may not reflect current rates or local variations. 
            You are responsible for verifying accuracy and consulting qualified tax professionals. 
            <Link href="/terms" className="underline ml-1 hover:opacity-80">See full Terms of Service</Link>.</span>
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-theme-primary">
          <div className="text-theme-muted text-sm">
            © {currentYear} Sails. All rights reserved.
          </div>
          <div className="flex gap-6 text-theme-muted text-sm">
            <Link href="/privacy" className="hover:text-theme-primary transition">Privacy</Link>
            <Link href="/terms" className="hover:text-theme-primary transition">Terms</Link>
            <Link href="/cookies" className="hover:text-theme-primary transition">Cookies</Link>
            <Link href="/contact" className="hover:text-theme-primary transition">Contact</Link>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="flex justify-center gap-4 mt-8 text-theme-muted text-xs">
          <span className="px-2 py-1 border border-theme-secondary rounded flex items-center gap-1">
            <Lock className="w-3 h-3" /> SSL Secured
          </span>
          <span className="px-2 py-1 border border-theme-secondary rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> GDPR Compliant
          </span>
          <span className="px-2 py-1 border border-theme-secondary rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> CCPA Compliant
          </span>
        </div>
      </div>
    </footer>
  );
}
