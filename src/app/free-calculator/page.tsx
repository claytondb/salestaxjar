'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, CheckCircle, ArrowRight, Store, Zap, Shield } from 'lucide-react';
import { stateTaxRates, getStateByCode } from '@/data/taxRates';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

interface CalcResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  effectiveRate: number;
  stateName: string;
  stateCode: string;
}

export default function FreeCalculatorPage() {
  const [amount, setAmount] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid sale amount.');
      return;
    }
    if (!selectedState) {
      setError('Please select a state.');
      return;
    }

    const stateInfo = getStateByCode(selectedState);
    if (!stateInfo) {
      setError('State not found. Please try again.');
      return;
    }

    const rate = stateInfo.combinedRate;
    const taxAmount = Math.round(amt * (rate / 100) * 100) / 100;
    const total = Math.round((amt + taxAmount) * 100) / 100;

    setResult({
      subtotal: amt,
      taxAmount,
      total,
      effectiveRate: rate,
      stateName: stateInfo.state,
      stateCode: selectedState,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCalculate();
  };

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Header */}
      <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-theme-accent" />
              <span className="text-2xl font-bold text-theme-primary">Sails</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              <Link href="/#features" className="text-theme-secondary hover:text-theme-primary transition">Features</Link>
              <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">Pricing</Link>
              <Link href="/free-calculator" className="text-theme-accent font-medium">Free Calculator</Link>
              <Link href="/blog" className="text-theme-secondary hover:text-theme-primary transition">Blog</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <Link href="/login" className="text-theme-secondary hover:text-theme-primary px-4 py-2 transition">Log in</Link>
              <Link href="/signup" className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-12 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent-subtle text-theme-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calculator className="w-4 h-4" />
              100% Free — No Account Required
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-theme-primary mb-4">
              Free Sales Tax Calculator
            </h1>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              Instantly calculate sales tax for any US state. Enter your sale amount, pick a state, and get accurate results in seconds.
            </p>
          </div>
        </section>

        {/* Calculator Card */}
        <section className="px-4 pb-12">
          <div className="max-w-xl mx-auto">
            <div className="card-theme rounded-2xl p-8 shadow-lg">
              <div className="space-y-5">
                {/* Sale Amount */}
                <div>
                  <label htmlFor="amount" className="block text-theme-secondary mb-2 font-medium">
                    Sale Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted font-medium text-lg">$</span>
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-8 pr-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary text-lg focus:outline-none focus:ring-2"
                      placeholder="100.00"
                      style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-theme-secondary mb-2 font-medium">
                    State
                  </label>
                  <select
                    id="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                  >
                    <option value="">Select a state…</option>
                    {stateTaxRates.map((s) => (
                      <option key={s.stateCode} value={s.stateCode} className="bg-theme-card">
                        {s.state} — {s.combinedRate}%
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zip Code (optional, informational) */}
                <div>
                  <label htmlFor="zip" className="block text-theme-secondary mb-2 font-medium">
                    ZIP Code <span className="text-theme-muted font-normal text-sm">(optional)</span>
                  </label>
                  <input
                    id="zip"
                    type="text"
                    maxLength={10}
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                    placeholder="e.g. 90210"
                    style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                  />
                  <p className="text-theme-muted text-xs mt-1">
                    Note: State-level average rates are used. Local rates vary by ZIP code.
                  </p>
                </div>

                {error && (
                  <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--error)', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleCalculate}
                  className="w-full btn-theme-primary py-4 rounded-lg font-semibold text-lg transition"
                >
                  Calculate Sales Tax
                </button>
              </div>

              {/* Result */}
              {result && (
                <div className="mt-6 p-6 bg-accent-subtle rounded-xl border border-theme-accent">
                  <h2 className="font-semibold text-theme-primary mb-4 text-lg">
                    Results for {result.stateName}
                    {zipCode && <span className="text-theme-muted font-normal text-sm"> · ZIP {zipCode}</span>}
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-theme-muted text-sm mb-1">Subtotal</div>
                      <div className="text-2xl font-bold text-theme-primary">
                        ${result.subtotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-theme-muted text-sm mb-1">Tax ({result.effectiveRate}%)</div>
                      <div className="text-2xl font-bold text-theme-primary">
                        ${result.taxAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-theme-muted text-sm mb-1">Total</div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                        ${result.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-theme-primary">
                    <p className="text-theme-muted text-xs text-center">
                      Rate shown is the combined state + average local rate for {result.stateName}.
                      Actual local rates may vary. Not tax advice.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Banner */}
            <div className="mt-6 p-6 card-theme rounded-2xl border border-theme-accent text-center">
              <Store className="w-8 h-8 text-theme-accent mx-auto mb-3" />
              <h3 className="font-bold text-theme-primary text-lg mb-2">
                Need to track this for your whole store?
              </h3>
              <p className="text-theme-secondary mb-4">
                Sails connects to Shopify, WooCommerce, and BigCommerce — automatically calculating and tracking sales tax across all your orders.{' '}
                <strong className="text-theme-primary">Free to start.</strong>
              </p>
              <Link
                href="/signup"
                className="btn-theme-primary px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
              >
                Connect Your Store Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* State Tax Rate Table */}
        <section className="px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-theme-primary text-center mb-2">
              2025 Sales Tax Rates by State
            </h2>
            <p className="text-theme-secondary text-center mb-8">
              Combined state + average local rates across all 50 US states.
            </p>
            <div className="card-theme rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-primary">
                      <th className="text-left py-3 px-4 text-theme-muted font-medium">State</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-medium">State Rate</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-medium">Avg Local</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-medium">Combined Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateTaxRates.map((s, i) => (
                      <tr
                        key={s.stateCode}
                        className={`border-b border-theme-primary/30 ${i % 2 === 0 ? '' : 'bg-theme-secondary/10'}`}
                      >
                        <td className="py-2.5 px-4 text-theme-primary font-medium">
                          {s.state} ({s.stateCode})
                        </td>
                        <td className="py-2.5 px-4 text-theme-secondary text-right">{s.stateRate.toFixed(2)}%</td>
                        <td className="py-2.5 px-4 text-theme-secondary text-right">{s.avgLocalRate.toFixed(2)}%</td>
                        <td className="py-2.5 px-4 text-theme-primary font-semibold text-right">{s.combinedRate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-theme-primary">
                <p className="text-theme-muted text-xs text-center">
                  Rates effective January 1, 2025. Source: Tax Foundation, state DOR websites. For estimation only — not tax advice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature highlights / SEO content */}
        <section className="px-4 pb-16 bg-theme-card/30">
          <div className="max-w-4xl mx-auto py-12">
            <h2 className="text-2xl font-bold text-theme-primary text-center mb-10">
              Why Use Sails&apos; Free Sales Tax Calculator?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Zap className="w-10 h-10 text-theme-accent mx-auto mb-3" />
                <h3 className="font-semibold text-theme-primary mb-2">Instant Results</h3>
                <p className="text-theme-secondary text-sm">
                  No sign-up, no wait. Enter your amount and state, get the answer immediately.
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className="w-10 h-10 text-theme-accent mx-auto mb-3" />
                <h3 className="font-semibold text-theme-primary mb-2">2025 Rates</h3>
                <p className="text-theme-secondary text-sm">
                  Our state rates are updated annually from Tax Foundation data and state revenue departments.
                </p>
              </div>
              <div className="text-center">
                <Shield className="w-10 h-10 text-theme-accent mx-auto mb-3" />
                <h3 className="font-semibold text-theme-primary mb-2">All 50 States</h3>
                <p className="text-theme-secondary text-sm">
                  Coverage for all US states including combined state + average local rates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ / Informational content for SEO */}
        <section className="px-4 pb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-theme-primary text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: 'How do I calculate sales tax?',
                  a: 'Multiply the sale price by the sales tax rate (as a decimal). For example, $100 × 8.5% = $8.50 in tax, making your total $108.50. Our calculator does this automatically for every US state.',
                },
                {
                  q: 'Which states have no sales tax?',
                  a: 'Five states have no state sales tax: Alaska, Delaware, Montana, New Hampshire, and Oregon. However, Alaska does allow local sales taxes, so check local rates if selling there.',
                },
                {
                  q: 'What is the highest sales tax state?',
                  a: 'When combining state and average local rates, Louisiana, Tennessee, and Arkansas typically have the highest combined sales tax rates in the US, often above 9%.',
                },
                {
                  q: 'Do I need to collect sales tax on all my sales?',
                  a: 'It depends on whether you have "nexus" in a state — meaning a sufficient business presence or sales volume that triggers a collection obligation. Most states use economic nexus thresholds ($100K in sales or 200 transactions). Sails can help you track your nexus across all states.',
                },
                {
                  q: 'Are these rates accurate for my city or ZIP code?',
                  a: 'These are state-level combined rates (state rate + average local rate). Actual local taxes vary by city, county, and special district. For precise ZIP-code-level rates, consider upgrading to Sails to get exact rates for every order.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="card-theme rounded-xl p-6">
                  <h3 className="font-semibold text-theme-primary mb-2">{q}</h3>
                  <p className="text-theme-secondary">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 pb-16">
          <div className="max-w-2xl mx-auto text-center card-theme rounded-2xl p-10">
            <h2 className="text-3xl font-bold text-theme-primary mb-4">
              Ready to automate sales tax for your store?
            </h2>
            <p className="text-theme-secondary mb-6 text-lg">
              Sails connects to Shopify, WooCommerce, and BigCommerce. Track nexus, calculate taxes, and never miss a filing deadline. Free to start.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="btn-theme-primary px-8 py-3 rounded-lg font-semibold inline-flex items-center justify-center gap-2"
              >
                Start Free — No Credit Card
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="card-theme px-8 py-3 rounded-lg font-medium inline-block text-theme-primary hover:opacity-80 transition border border-theme-primary"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
