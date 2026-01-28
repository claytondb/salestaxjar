'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stateTaxRates, calculateTax, getNoTaxStates, taxRateMetadata } from '@/data/taxRates';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">$</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">SalesTaxJar</span>
            </div>
            <nav className="hidden md:flex gap-6">
              <a href="#features" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Features</a>
              <Link href="/pricing" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Pricing</Link>
              <a href="#calculator" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Calculator</a>
            </nav>
            <div className="flex gap-3">
              <Link href="/login" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition hidden sm:inline-block">
                Log in
              </Link>
              <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - REWRITTEN for clarity */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Gradient Overlay - keeps text readable while showing image warmth */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* The Problem (relatable pain point) */}
          <p className="text-emerald-400 font-medium mb-4 text-lg">
            Sell online? You probably owe sales tax in more states than you think.
          </p>
          
          {/* The Solution (crystal clear headline) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            We Handle Your Sales Tax
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-6">
            So you can get back to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-semibold border-b-2 border-emerald-400/50 pb-1 inline-block min-w-[200px] transition-all duration-300">
              {businesses[businessIndex]}
            </span>
          </p>
          
          {/* What it does in plain English */}
          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Sales tax is confusing. 45 states, different rules, changing deadlines. 
            Miss a filing and you could face penalties.
          </p>
          <p className="text-lg sm:text-xl text-white font-medium mb-8 max-w-2xl mx-auto">
            SalesTaxJar tells you exactly what you owe, where you owe it, and when it&apos;s due.
            <span className="text-emerald-400"> Starting at $29/month.</span>
          </p>

          {/* Social Proof / Trust Signal */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-gray-300 ml-2">Know where you owe</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-gray-300 ml-2">Never miss a deadline</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-gray-300 ml-2">Stop worrying about audits</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
              Start 14-Day Free Trial
            </Link>
            <Link href="/pricing" className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition border border-white/20">
              See Pricing
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 border-b border-slate-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Get set up in minutes. No tax expertise required.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Connect Your Store</h3>
              <p className="text-slate-500 dark:text-gray-400">
                Link your Shopify, Amazon, WooCommerce, or other sales channels. We import your sales data automatically.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">See What You Owe</h3>
              <p className="text-slate-500 dark:text-gray-400">
                We calculate your tax obligations for every state. See exactly how much you owe and when it&apos;s due.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">File With Confidence</h3>
              <p className="text-slate-500 dark:text-gray-400">
                Get pre-filled forms and deadline reminders. File your returns in minutes, not hours.
              </p>
            </div>
          </div>
          
          {/* Simple flow diagram */}
          <div className="mt-12 flex justify-center items-center gap-4 text-slate-400 dark:text-gray-500 text-sm">
            <span className="bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-lg text-slate-700 dark:text-white">Your Store</span>
            <span>→</span>
            <span className="bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-lg text-slate-700 dark:text-white">SalesTaxJar</span>
            <span>→</span>
            <span className="bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-lg text-slate-700 dark:text-white">Tax Filed ✓</span>
          </div>
        </div>
      </section>

      {/* "Why Do I Need This?" Section */}
      <section className="py-12 px-4 bg-slate-50 dark:bg-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-8">
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
              <div key={i} className="bg-white dark:bg-white/10 backdrop-blur rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                <p className="text-slate-600 dark:text-gray-300 italic mb-4">{item.pain}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white text-center mb-4">
            Free Tax Calculator
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-center mb-8 sm:mb-12">
            Try our instant sales tax calculator for any US state
          </p>
          
          <div className="bg-white dark:bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-white/20 shadow-lg dark:shadow-none">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Sale Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 font-medium">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {stateTaxRates.map((state) => (
                    <option key={state.stateCode} value={state.stateCode} className="bg-slate-800">
                      {state.state} ({state.combinedRate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleCalculate}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-lg font-semibold text-lg transition"
            >
              Calculate Tax
            </button>

            {result && (
              <div className="mt-6 p-4 sm:p-6 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm">Subtotal</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">${parseFloat(amount).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm">Tax ({result.rate}%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-400">${result.tax.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm">Total</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">${result.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-gray-400 text-sm mt-4">
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">Sign up</Link> to access advanced features like nexus tracking, deadline alerts, and filings
            </p>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                📅 Rates updated: {taxRateMetadata.lastUpdated} |{' '}
                <span className="text-yellow-500">⚠️</span> Estimates only - verify with official state sources.{' '}
                <Link href="/terms" className="text-emerald-400 hover:text-emerald-300">See disclaimer</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Everything You Need to Stay Compliant
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
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
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 hover:border-emerald-500/50 transition relative">
                {feature.comingSoon && (
                  <span className="absolute top-3 right-3 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-medium">
                    Coming Soon
                  </span>
                )}
                <div className="text-3xl sm:text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Honest Pricing
          </h2>
          <p className="text-gray-400 mb-8">
            No hidden fees. No surprises. Cancel anytime.
          </p>
          
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 inline-block">
            <div className="text-gray-400 mb-2">Starting at</div>
            <div className="text-5xl font-bold text-white mb-2">$29<span className="text-xl text-gray-400">/month</span></div>
            <p className="text-gray-400 mb-6">for small sellers up to 500 orders/month</p>
            <Link href="/pricing" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition">
              See All Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Tax-Free States */}
      <section className="py-12 sm:py-20 px-4 bg-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
            States with No Sales Tax
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {noTaxStates.map((state) => (
              <span key={state.stateCode} className="px-3 sm:px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium text-sm sm:text-base">
                {state.state}
              </span>
            ))}
          </div>
          <p className="text-gray-400 mt-4 text-sm">
            Even if you&apos;re in a tax-free state, you may still owe taxes in other states where you have customers.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Stop Stressing About Sales Tax
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Try SalesTaxJar free for 14 days. No credit card required.
          </p>
          <Link href="/signup" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
