'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stateTaxRates, calculateTax, getNoTaxStates, taxRateMetadata } from '@/data/taxRates';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Calculator, 
  MapPin, 
  Bell, 
  LayoutDashboard, 
  Link2, 
  ClipboardList,
  Check,
  Calendar,
  AlertTriangle
} from 'lucide-react';

const ICON_CLASS = "w-8 h-8 text-theme-accent";

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
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Header */}
      <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-theme-accent" />
              <span className="text-2xl font-bold text-theme-primary">Sails</span>
            </div>
            <nav className="hidden md:flex gap-6 items-center">
              <a href="#features" className="text-theme-secondary hover:text-theme-primary transition">Features</a>
              <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">Pricing</Link>
              <a href="#calculator" className="text-theme-secondary hover:text-theme-primary transition">Calculator</a>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <Link href="/login" className="text-theme-secondary hover:text-theme-primary px-4 py-2 transition hidden sm:inline-block">
                Log in
              </Link>
              <Link href="/signup" className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-theme-gradient opacity-95" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* The Problem */}
          <p className="text-theme-accent font-medium mb-4 text-lg">
            Sell online? You probably owe sales tax in more states than you think.
          </p>
          
          {/* The Solution */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-theme-primary mb-4 leading-tight">
            We Handle Your Sales Tax
          </h1>
          <p className="text-xl sm:text-2xl text-theme-secondary mb-6">
            So you can get back to{' '}
            <span className="text-theme-accent font-semibold border-b-2 pb-1 inline-block min-w-[200px] transition-all duration-300" style={{ borderColor: 'var(--accent-primary)' }}>
              {businesses[businessIndex]}
            </span>
          </p>
          
          {/* What it does */}
          <p className="text-lg sm:text-xl text-theme-secondary mb-4 max-w-2xl mx-auto">
            Sales tax is confusing. 45 states, different rules, changing deadlines. 
            Miss a filing and you could face penalties.
          </p>
          <p className="text-lg sm:text-xl text-theme-primary font-medium mb-8 max-w-2xl mx-auto">
            Sails tells you exactly what you owe, where you owe it, and when it&apos;s due.
            <span className="text-theme-accent"> Starting at $29/month.</span>
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {["Know where you owe", "Never miss a deadline", "Stop worrying about audits"].map((text, i) => (
              <div key={i} className="card-theme px-4 py-2 rounded-lg flex items-center">
                <Check className="w-4 h-4 text-theme-accent" />
                <span className="text-theme-secondary ml-2">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
              Start 14-Day Free Trial
            </Link>
            <Link href="/pricing" className="card-theme px-8 py-4 rounded-xl font-semibold text-lg text-theme-primary hover:bg-theme-accent/10 transition">
              See Pricing
            </Link>
          </div>
          <p className="text-theme-muted text-sm mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 border-b border-theme-primary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-4">
            How It Works
          </h2>
          <p className="text-theme-muted text-center mb-12 max-w-2xl mx-auto">
            Get set up in minutes. No tax expertise required.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "1", title: "Connect Your Store", desc: "Link your Shopify, Amazon, WooCommerce, or other sales channels. We import your sales data automatically." },
              { num: "2", title: "See What You Owe", desc: "We calculate your tax obligations for every state. See exactly how much you owe and when it's due." },
              { num: "3", title: "File With Confidence", desc: "Get pre-filled forms and deadline reminders. File your returns in minutes, not hours." }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-theme-accent">{step.num}</span>
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-2">{step.title}</h3>
                <p className="text-theme-muted">{step.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Flow diagram */}
          <div className="mt-12 flex justify-center items-center gap-4 text-theme-muted text-sm">
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary">Your Store</span>
            <span>→</span>
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary">Sails</span>
            <span>→</span>
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary flex items-center gap-1">Tax Filed <Check className="w-4 h-4 text-theme-accent" /></span>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-12 px-4 bg-theme-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-8">
            Sound familiar?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { pain: "\"I sell on Shopify and Amazon but I have no idea if I should be collecting sales tax.\"", solution: "We track your nexus (tax obligations) across all 50 states automatically." },
              { pain: "\"I'm scared I'll get a letter from a state saying I owe thousands in back taxes.\"", solution: "Know exactly where you owe before states come knocking." },
              { pain: "\"Filing deadlines are different for every state and I can't keep track.\"", solution: "Get reminders before every deadline. Never file late again." },
              { pain: "\"I don't have time to figure out sales tax rules for 45 states.\"", solution: "We do the research. You just see what you owe." }
            ].map((item, i) => (
              <div key={i} className="card-theme rounded-xl p-6">
                <p className="text-theme-secondary italic mb-4">{item.pain}</p>
                <p className="text-theme-accent font-medium">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary text-center mb-4">
            Free Tax Calculator
          </h2>
          <p className="text-theme-muted text-center mb-8 sm:mb-12">
            Try our instant sales tax calculator for any US state
          </p>
          
          <div className="card-theme rounded-2xl p-6 sm:p-8">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-theme-secondary mb-2 font-medium">Sale Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary text-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-theme-secondary mb-2 font-medium">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary text-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                >
                  {stateTaxRates.map((state) => (
                    <option key={state.stateCode} value={state.stateCode} className="bg-theme-card">
                      {state.state} ({state.combinedRate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleCalculate}
              className="w-full mt-6 btn-theme-primary py-4 rounded-lg font-semibold text-lg transition"
            >
              Calculate Tax
            </button>

            {result && (
              <div className="mt-6 p-4 sm:p-6 bg-accent-subtle rounded-xl border" style={{ borderColor: 'var(--accent-primary)', borderWidth: '1px', opacity: 0.5 }}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-theme-muted text-xs sm:text-sm">Subtotal</div>
                    <div className="text-xl sm:text-2xl font-bold text-theme-primary">${parseFloat(amount).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted text-xs sm:text-sm">Tax ({result.rate}%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-theme-accent">${result.tax.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted text-xs sm:text-sm">Total</div>
                    <div className="text-xl sm:text-2xl font-bold text-theme-primary">${result.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-theme-muted text-sm mt-4">
              <Link href="/signup" className="text-theme-accent hover:underline">Sign up</Link> to access advanced features like nexus tracking, deadline alerts, and filings
            </p>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-theme-muted flex items-center justify-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Rates updated: {taxRateMetadata.lastUpdated}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" style={{ color: 'var(--warning)' }} />
                  Estimates only - verify with official state sources.
                </span>
                <Link href="/terms" className="text-theme-accent hover:underline">See disclaimer</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-20 px-4 bg-theme-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary text-center mb-4">
            Everything You Need to Stay Compliant
          </h2>
          <p className="text-theme-muted text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            No more spreadsheets. No more guessing. Just clear answers.
          </p>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: <Calculator className={ICON_CLASS} />, title: "Tax Calculator", desc: "Know exactly how much tax to collect, instantly", comingSoon: false },
              { icon: <MapPin className={ICON_CLASS} />, title: "Nexus Tracking", desc: "See which states you owe tax in (and which you don't)", comingSoon: false },
              { icon: <Bell className={ICON_CLASS} />, title: "Deadline Alerts", desc: "Get reminded before every filing deadline", comingSoon: false },
              { icon: <LayoutDashboard className={ICON_CLASS} />, title: "Simple Dashboard", desc: "Everything you need on one screen", comingSoon: false },
              { icon: <Link2 className={ICON_CLASS} />, title: "Integrations", desc: "Connect Shopify, Amazon, Etsy, WooCommerce & more", comingSoon: true },
              { icon: <ClipboardList className={ICON_CLASS} />, title: "Auto-Filing", desc: "We file your returns automatically", comingSoon: true }
            ].map((feature, i) => (
              <div key={i} className="card-theme rounded-xl p-6 hover:border-theme-accent transition relative">
                {feature.comingSoon && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--warning)' }}>
                    Coming Soon
                  </span>
                )}
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-theme-primary mb-2">{feature.title}</h3>
                <p className="text-theme-muted text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
            Simple, Honest Pricing
          </h2>
          <p className="text-theme-muted mb-8">
            No hidden fees. No surprises. Cancel anytime.
          </p>
          
          <div className="card-theme rounded-2xl p-8 inline-block">
            <div className="text-theme-muted mb-2">Starting at</div>
            <div className="text-5xl font-bold text-theme-primary mb-2">$29<span className="text-xl text-theme-muted">/month</span></div>
            <p className="text-theme-muted mb-6">for small sellers up to 500 orders/month</p>
            <Link href="/pricing" className="inline-block btn-theme-primary px-8 py-3 rounded-lg font-semibold transition">
              See All Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Tax-Free States */}
      <section className="py-12 sm:py-20 px-4 bg-theme-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-6">
            States with No Sales Tax
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {noTaxStates.map((state) => (
              <span key={state.stateCode} className="px-3 sm:px-4 py-2 bg-accent-subtle text-theme-accent rounded-lg font-medium text-sm sm:text-base">
                {state.state}
              </span>
            ))}
          </div>
          <p className="text-theme-muted mt-4 text-sm">
            Even if you&apos;re in a tax-free state, you may still owe taxes in other states where you have customers.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
            Stop Stressing About Sales Tax
          </h2>
          <p className="text-theme-muted mb-8 text-lg">
            Try Sails free for 14 days. No credit card required.
          </p>
          <Link href="/signup" className="inline-block btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
