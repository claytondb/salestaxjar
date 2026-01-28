'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stateTaxRates, calculateTax, getNoTaxStates, taxRateMetadata } from '@/data/taxRates';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('100');
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [result, setResult] = useState<{ tax: number; total: number; rate: number } | null>(null);
  
  // Rotating business examples for "get back to ___"
  const businesses = [
    "making bead jewelry",
    "roasting coffee beans",
    "designing t-shirts",
    "crafting candles",
    "baking sourdough",
    "knitting sweaters",
    "building furniture",
    "brewing kombucha",
    "painting portraits",
    "selling vintage finds",
    "making hot sauce",
    "growing succulents",
  ];
  const [businessIndex, setBusinessIndex] = useState(0);
  
  // Rotate through businesses
  useEffect(() => {
    const interval = setInterval(() => {
      setBusinessIndex((prev) => (prev + 1) % businesses.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [businesses.length]);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleCalculate = () => {
    const calc = calculateTax(parseFloat(amount) || 0, selectedState);
    setResult(calc);
  };

  const noTaxStates = getNoTaxStates();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--color-primary)] opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--color-jar)] opacity-5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* The Problem (relatable pain point) */}
          <p className="text-[var(--color-primary)] font-medium mb-4 text-lg">
            Sell online? You probably owe sales tax in more states than you think.
          </p>
          
          {/* The Solution (crystal clear headline) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-text)] mb-4 leading-tight">
            We Handle Your Sales Tax
          </h1>
          <p className="text-xl sm:text-2xl text-[var(--color-text-secondary)] mb-6">
            So you can get back to{' '}
            <span className="text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)] pb-1 inline-block min-w-[200px] transition-all duration-300">
              {businesses[businessIndex]}
            </span>
          </p>
          
          {/* What it does in plain English */}
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] mb-4 max-w-2xl mx-auto">
            Sales tax is confusing. 45 states, different rules, changing deadlines. 
            Miss a filing and you could face penalties.
          </p>
          <p className="text-lg sm:text-xl text-[var(--color-text)] font-medium mb-8 max-w-2xl mx-auto">
            SalesTaxJar tells you exactly what you owe, where you owe it, and when it&apos;s due.
            <span className="text-[var(--color-jar)]"> Starting at $29/month.</span>
          </p>

          {/* Social Proof / Trust Signal */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-[var(--color-bg-card)] px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
              <span className="text-[var(--color-success)] font-bold">✓</span>
              <span className="text-[var(--color-text-secondary)] ml-2">Know where you owe</span>
            </div>
            <div className="bg-[var(--color-bg-card)] px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
              <span className="text-[var(--color-success)] font-bold">✓</span>
              <span className="text-[var(--color-text-secondary)] ml-2">Never miss a deadline</span>
            </div>
            <div className="bg-[var(--color-bg-card)] px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
              <span className="text-[var(--color-success)] font-bold">✓</span>
              <span className="text-[var(--color-text-secondary)] ml-2">Stop worrying about audits</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105 shadow-lg">
              Start 14-Day Free Trial
            </Link>
            <Link href="/pricing" className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] text-[var(--color-text)] px-8 py-4 rounded-xl font-semibold text-lg transition border border-[var(--color-border)] shadow-sm">
              See Pricing
            </Link>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 border-y border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] text-center mb-4">
            How It Works
          </h2>
          <p className="text-[var(--color-text-muted)] text-center mb-12 max-w-2xl mx-auto">
            Get set up in minutes. No tax expertise required.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-primary-border)]">
                <span className="text-3xl font-bold text-[var(--color-primary)]">1</span>
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">Connect Your Store</h3>
              <p className="text-[var(--color-text-muted)]">
                Link your Shopify, Amazon, WooCommerce, or other sales channels. We import your sales data automatically.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-primary-border)]">
                <span className="text-3xl font-bold text-[var(--color-primary)]">2</span>
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">See What You Owe</h3>
              <p className="text-[var(--color-text-muted)]">
                We calculate your tax obligations for every state. See exactly how much you owe and when it&apos;s due.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-primary-border)]">
                <span className="text-3xl font-bold text-[var(--color-primary)]">3</span>
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">File With Confidence</h3>
              <p className="text-[var(--color-text-muted)]">
                Get pre-filled forms and deadline reminders. File your returns in minutes, not hours.
              </p>
            </div>
          </div>
          
          {/* Simple flow diagram */}
          <div className="mt-12 flex justify-center items-center gap-4 text-[var(--color-text-muted)] text-sm">
            <span className="bg-[var(--color-bg-card)] px-4 py-2 rounded-lg text-[var(--color-text)] border border-[var(--color-border)]">Your Store</span>
            <span>→</span>
            <span className="bg-[var(--color-primary-bg)] px-4 py-2 rounded-lg text-[var(--color-primary)] border border-[var(--color-primary-border)] font-medium">SalesTaxJar</span>
            <span>→</span>
            <span className="bg-[var(--color-success-bg)] px-4 py-2 rounded-lg text-[var(--color-success)] border border-[var(--color-success-border)]">Tax Filed ✓</span>
          </div>
        </div>
      </section>

      {/* "Why Do I Need This?" Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] text-center mb-8">
            Sound familiar?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                pain: "\"I sell on Shopify and Amazon but I have no idea if I should be collecting sales tax.\"",
                solution: "We track your nexus (tax obligations) across all 50 states automatically."
              },
              {
                pain: "\"I'm scared I'll get a letter from a state saying I owe thousands in back taxes.\"",
                solution: "Know exactly where you owe before states come knocking."
              },
              {
                pain: "\"Filing deadlines are different for every state and I can't keep track.\"",
                solution: "Get reminders before every deadline. Never file late again."
              },
              {
                pain: "\"I don't have time to figure out sales tax rules for 45 states.\"",
                solution: "We do the research. You just see what you owe."
              }
            ].map((item, i) => (
              <div key={i} className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
                <p className="text-[var(--color-text-secondary)] italic mb-4">{item.pain}</p>
                <p className="text-[var(--color-primary)] font-medium">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-12 sm:py-20 px-4 bg-[var(--color-bg-muted)] border-y border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] text-center mb-4">
            Free Tax Calculator
          </h2>
          <p className="text-[var(--color-text-muted)] text-center mb-8 sm:mb-12">
            Try our instant sales tax calculator for any US state
          </p>
          
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 sm:p-8 border border-[var(--color-border)] shadow-lg">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Sale Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                >
                  {stateTaxRates.map((state) => (
                    <option key={state.stateCode} value={state.stateCode}>
                      {state.state} ({state.combinedRate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleCalculate}
              className="w-full mt-6 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white py-4 rounded-lg font-semibold text-lg transition shadow-md hover:shadow-lg"
            >
              Calculate Tax
            </button>

            {result && (
              <div className="mt-6 p-4 sm:p-6 bg-[var(--color-success-bg)] rounded-xl border border-[var(--color-success-border)]">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[var(--color-text-muted)] text-xs sm:text-sm">Subtotal</div>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">${parseFloat(amount).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-muted)] text-xs sm:text-sm">Tax ({result.rate}%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--color-success)]">${result.tax.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-muted)] text-xs sm:text-sm">Total</div>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">${result.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-[var(--color-text-muted)] text-sm mt-4">
              <Link href="/signup" className="text-[var(--color-primary)] hover:underline">Sign up</Link> to access advanced features like nexus tracking, deadline alerts, and filings
            </p>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-[var(--color-text-light)]">
                📅 Rates updated: {taxRateMetadata.lastUpdated} |{' '}
                <span className="text-[var(--color-warning)]">⚠️</span> Estimates only - verify with official state sources.{' '}
                <Link href="/terms" className="text-[var(--color-primary)] hover:underline">See disclaimer</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] text-center mb-4">
            Everything You Need to Stay Compliant
          </h2>
          <p className="text-[var(--color-text-muted)] text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            No more spreadsheets. No more guessing. Just clear answers.
          </p>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: "🧮",
                title: "Tax Calculator",
                desc: "Know exactly how much tax to collect, instantly",
                comingSoon: false
              },
              {
                icon: "📍",
                title: "Nexus Tracking",
                desc: "See which states you owe tax in (and which you don't)",
                comingSoon: false
              },
              {
                icon: "🔔",
                title: "Deadline Alerts",
                desc: "Get reminded before every filing deadline",
                comingSoon: false
              },
              {
                icon: "📊",
                title: "Simple Dashboard",
                desc: "Everything you need on one screen",
                comingSoon: false
              },
              {
                icon: "🔗",
                title: "Integrations",
                desc: "Connect Shopify, Amazon, Etsy, WooCommerce & more",
                comingSoon: true
              },
              {
                icon: "📋",
                title: "Auto-Filing",
                desc: "We file your returns automatically",
                comingSoon: true
              }
            ].map((feature, i) => (
              <div key={i} className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-lg transition relative">
                {feature.comingSoon && (
                  <span className="absolute top-3 right-3 text-xs bg-[var(--color-jar-bg)] text-[var(--color-jar)] px-2 py-1 rounded-full font-medium border border-[var(--color-warning-border)]">
                    Coming Soon
                  </span>
                )}
                <div className="text-3xl sm:text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-text)] mb-2">{feature.title}</h3>
                <p className="text-[var(--color-text-muted)] text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-12 sm:py-20 px-4 bg-[var(--color-bg-muted)] border-y border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-4">
            Simple, Honest Pricing
          </h2>
          <p className="text-[var(--color-text-muted)] mb-8">
            No hidden fees. No surprises. Cancel anytime.
          </p>
          
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-8 border border-[var(--color-border)] inline-block shadow-lg">
            <div className="text-[var(--color-text-muted)] mb-2">Starting at</div>
            <div className="text-5xl font-bold text-[var(--color-text)] mb-2">$29<span className="text-xl text-[var(--color-text-muted)]">/month</span></div>
            <p className="text-[var(--color-text-muted)] mb-6">for small sellers up to 500 orders/month</p>
            <Link href="/pricing" className="inline-block bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-8 py-3 rounded-lg font-semibold transition shadow-md">
              See All Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Tax-Free States */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-6">
            States with No Sales Tax
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {noTaxStates.map((state) => (
              <span key={state.stateCode} className="px-3 sm:px-4 py-2 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg font-medium text-sm sm:text-base border border-[var(--color-success-border)]">
                {state.state}
              </span>
            ))}
          </div>
          <p className="text-[var(--color-text-muted)] mt-4 text-sm">
            Even if you&apos;re in a tax-free state, you may still owe taxes in other states where you have customers.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 px-4 bg-[var(--color-bg-muted)] border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-4">
            Stop Stressing About Sales Tax
          </h2>
          <p className="text-[var(--color-text-muted)] mb-8 text-lg">
            Try SalesTaxJar free for 14 days. No credit card required.
          </p>
          <Link href="/signup" className="inline-block bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105 shadow-lg">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
