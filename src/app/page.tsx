'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stateTaxRates, calculateTax, getNoTaxStates, taxRateMetadata } from '@/data/taxRates';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import TaxDisclaimer from '@/components/TaxDisclaimer';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('100');
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [result, setResult] = useState<{ tax: number; total: number; rate: number } | null>(null);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">$</span>
              </div>
              <span className="text-2xl font-bold text-white">SalesTaxJar</span>
            </div>
            <nav className="hidden md:flex gap-6">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <a href="#calculator" className="text-gray-300 hover:text-white transition">Calculator</a>
            </nav>
            <div className="flex gap-3">
              <Link href="/login" className="text-gray-300 hover:text-white px-4 py-2 transition hidden sm:inline-block">
                Log in
              </Link>
              <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Sales Tax Compliance<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Made Simple
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Calculate sales tax, track nexus obligations, and manage filing deadlines for all 50 states.
            Stay compliant without the headache. Starting at just <span className="text-emerald-400 font-semibold">$29/month</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
              Start 14-Day Free Trial
            </Link>
            <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition border border-white/20">
              Watch Demo
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Free Tax Calculator
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12">
            Try our instant sales tax calculator for any US state
          </p>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-white/20">
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
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">Sign up</Link> to access advanced features like product categories, bulk calculations, and export
            </p>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                📅 Rates updated: {taxRateMetadata.lastUpdated} |{' '}
                <span className="text-yellow-500">⚠️</span> Estimates only - not tax advice.{' '}
                <Link href="/terms" className="text-emerald-400 hover:text-emerald-300">See full disclaimer</Link>
              </p>
            </div>
          </div>

          {/* Important Disclaimer Banner */}
          <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-200/90 text-sm text-center leading-relaxed">
              <span className="font-semibold">⚠️ Important:</span> SalesTaxJar provides tax calculation tools and compliance resources. 
              We are not a licensed CPA, tax attorney, or registered tax preparer. Our calculations are estimates based on 
              publicly available state tax rates and should not be considered tax advice. Always verify rates with official 
              state sources and consult a qualified tax professional for your specific situation.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            From calculation to filing, we handle the entire sales tax lifecycle
          </p>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: "🧮",
                title: "Tax Calculator",
                desc: "Calculate state-level sales tax rates instantly (local jurisdictions coming soon)",
                comingSoon: false
              },
              {
                icon: "📊",
                title: "Dashboard",
                desc: "See all your tax liabilities and nexus obligations at a glance",
                comingSoon: false
              },
              {
                icon: "📍",
                title: "Nexus Tracking",
                desc: "Track your economic nexus thresholds across all states",
                comingSoon: false
              },
              {
                icon: "🔔",
                title: "Deadline Alerts",
                desc: "Never miss a filing deadline with smart reminders",
                comingSoon: false
              },
              {
                icon: "🔗",
                title: "Integrations",
                desc: "Connect with Shopify, Amazon, Etsy, WooCommerce & more",
                comingSoon: true
              },
              {
                icon: "📋",
                title: "Auto-Filing",
                desc: "Automated filing of returns in every state you need",
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

      {/* Pricing */}
      <section id="pricing" className="py-12 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12">
            Save thousands compared to competitors. No hidden fees.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Starter */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 sm:p-8 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
              <p className="text-gray-400 mb-4">For small sellers</p>
              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-bold text-white">$29</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Up to 500 orders/mo
                </li>
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Tax calculator
                </li>
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Email support
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> Integrations (Coming Soon)
                </li>
              </ul>
              <Link href="/signup" className="block w-full py-3 border border-emerald-500 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition text-center">
                Start Free Trial
              </Link>
            </div>

            {/* Growth - Featured */}
            <div className="bg-gradient-to-b from-emerald-500/20 to-emerald-600/20 backdrop-blur rounded-2xl p-6 sm:p-8 border-2 border-emerald-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Growth</h3>
              <p className="text-gray-400 mb-4">For growing businesses</p>
              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-bold text-white">$79</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Up to 5,000 orders/mo
                </li>
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Nexus tracking
                </li>
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Priority support
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> All Integrations (Coming Soon)
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> Filing Assistance (Coming Soon)
                </li>
              </ul>
              <Link href="/signup" className="block w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition font-medium text-center">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 sm:p-8 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
              <p className="text-gray-400 mb-4">For high-volume sellers</p>
              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-bold text-white">$199</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Unlimited orders
                </li>
                <li className="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
                  <span className="text-emerald-400">✓</span> Dedicated support
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> Custom Integrations (Coming Soon)
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> Auto-Filing (Coming Soon)
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm sm:text-base">
                  <span className="text-yellow-400">◷</span> Audit Resources (Coming Soon)
                </li>
              </ul>
              <Link href="/signup" className="block w-full py-3 border border-emerald-500 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition text-center">
                Contact Sales
              </Link>
            </div>
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
            Even if you&apos;re in a tax-free state, you may still have nexus obligations in other states.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Simplify Your Sales Tax?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Start simplifying your sales tax compliance today
          </p>
          <Link href="/signup" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
            Start Your Free Trial Today
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
