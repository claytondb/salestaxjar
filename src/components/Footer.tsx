'use client';

import Link from 'next/link';
import { AlertTriangle, Lock, Shield } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 py-12 px-4 bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-xl font-bold text-white">SalesTaxJar</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Simplifying sales tax compliance for e-commerce businesses across the United States.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/calculator" className="hover:text-white transition">Tax Calculator</Link></li>
              <li><Link href="/nexus" className="hover:text-white transition">Nexus Tracker</Link></li>
              <li><Link href="/filings" className="hover:text-white transition">Filing Management</Link></li>
              <li><Link href="/#pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="/#features" className="hover:text-white transition">Features</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
              <li><Link href="/terms#disclaimer" className="hover:text-white transition">Tax Disclaimer</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/contact#faq" className="hover:text-white transition">FAQ</Link></li>
              <li><a href="mailto:support@salestaxjar.com" className="hover:text-white transition">support@salestaxjar.com</a></li>
            </ul>
          </div>
        </div>

        {/* Tax Disclaimer Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
          <p className="text-yellow-400 text-xs text-center flex items-start justify-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span><strong>IMPORTANT:</strong> SalesTaxJar provides tax estimation tools only. We are not a CPA firm or tax advisory service. 
            Tax calculations are estimates based on publicly available data and may not reflect current rates or local variations. 
            You are responsible for verifying accuracy and consulting qualified tax professionals. 
            <Link href="/terms" className="underline ml-1 hover:text-yellow-300">See full Terms of Service</Link>.</span>
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
          <div className="text-gray-400 text-sm">
            © {currentYear} SalesTaxJar. All rights reserved.
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/cookies" className="hover:text-white transition">Cookies</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="flex justify-center gap-4 mt-8 text-gray-500 text-xs">
          <span className="px-2 py-1 border border-gray-600 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" /> SSL Secured
          </span>
          <span className="px-2 py-1 border border-gray-600 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> GDPR Compliant
          </span>
          <span className="px-2 py-1 border border-gray-600 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> CCPA Compliant
          </span>
        </div>
      </div>
    </footer>
  );
}
