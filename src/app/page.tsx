'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { stateTaxRates, calculateTax, getNoTaxStates, taxRateMetadata } from '@/data/taxRates';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import {
  INTEGRATIONS,
  FEATURES,
  STATUS_LABEL,
  liveIntegrationNames,
  betaIntegrationNames,
} from '@/lib/capabilities';
import { COMPETITOR_FACTS_CHECKED_LABEL } from '@/lib/competitors';
import { NEXUS_RULES_REVIEWED_LABEL, NEXUS_RULES_REVIEWED_MONTH } from '@/lib/nexus-thresholds';
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
  AlertTriangle,
  Heart,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Star,
} from 'lucide-react';

const ICON_CLASS = "w-8 h-8 text-theme-accent";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [amount, setAmount] = useState<string>('100');
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [result, setResult] = useState<{ tax: number; total: number; rate: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
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

  // No auto-redirect - let users browse marketing page even if logged in

  const handleCalculate = () => {
    const calc = calculateTax(parseFloat(amount) || 0, selectedState);
    setResult(calc);
  };

  const noTaxStates = getNoTaxStates();

  const faqs = [
    {
      question: "Do I need to file sales taxes myself?",
      answer: "Yes. Sails shows you where you're likely required to collect, your deadlines, and your sales and tax collected by state — then you (or your accountant) file with each state. Sails does not file returns for you today, and we'll only offer that once the process has been reviewed by licensed tax professionals."
    },
    {
      question: "What platforms do you support?",
      answer: `${liveIntegrationNames()} are live today. ${betaIntegrationNames()} are in beta — they work, but haven't been tested with many real stores yet, so please double-check the numbers they produce.`
    },
    {
      question: "Is my data secure?",
      answer: "Data travels over encrypted connections (TLS), our database provider encrypts stored data, and store connection keys are encrypted again by Sails before they're saved. Store connections only ask for read access — Sails can't change anything in your store. You can disconnect a store at any time, and deleting your account deletes your data. We never sell your data. Our Privacy Policy lists the services we use."
    },
    {
      question: "What if I sell on multiple platforms?",
      answer: "Connect your store and upload your Amazon order reports, and Sails combines them into one state-by-state picture. States treat marketplace sales differently — some count them toward your threshold and some don't — so it's important to include every channel."
    },
    {
      question: "How is Sails different from TaxJar or Avalara?",
      answer: `Those tools calculate tax at checkout and can file returns for you. Sails focuses on the step before that: showing a small seller where they're likely required to register and collect, and what to do next. Sails has a free plan and paid plans from $9/month; TaxJar's Starter plan is listed at $39/month (checked ${COMPETITOR_FACTS_CHECKED_LABEL}).`
    },
    {
      question: "What happens when I hit economic nexus in a new state?",
      answer: "Sails emails you when your sales approach or pass a state's economic nexus threshold (usually $100,000 in sales; some states also count 200 transactions). Passing a threshold usually means you need to register with that state before you start collecting its sales tax — Sails links you to the state's registration page."
    },
  ];

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
              <Link href="/blog" className="text-theme-secondary hover:text-theme-primary transition">Blog</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <button
                className="md:hidden text-theme-secondary hover:text-theme-primary p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {user ? (
                // Logged in - show dashboard link
                <Link href="/dashboard" className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition">
                  Go to Dashboard
                </Link>
              ) : (
                // Logged out - show login and signup
                <>
                  <Link href="/login" className="border border-theme-secondary hover:border-theme-primary text-theme-secondary hover:text-theme-primary px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-theme-primary px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base">
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-theme-primary bg-theme-card/95 backdrop-blur-sm">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Features</a>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Pricing</Link>
            <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Calculator</a>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Blog</Link>
          </nav>
        </div>
      )}

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
          {/* Price punch badge */}
          <div className="inline-flex items-center gap-2 bg-accent-subtle text-theme-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4" />
            Built for small online sellers — not Fortune 500 companies
          </div>
          
          {/* The headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-theme-primary mb-3 leading-tight">
            Sales Tax for Small Online Sellers.
          </h1>
          <p className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--accent-primary)' }}>
            Know where you owe. <span className="text-theme-primary">Know what to do next.</span>
          </p>

          <p className="text-xl sm:text-2xl text-theme-secondary mb-4">
            <span className="italic text-theme-muted">Sales Tax Made Breezy</span> — so you can get back to{' '}
            <span className="text-theme-accent font-handwritten text-2xl sm:text-3xl border-b-2 pb-1 inline-block min-w-[200px] transition-all duration-300" style={{ borderColor: 'var(--accent-primary)' }}>
              {businesses[businessIndex]}
            </span>
          </p>
          
          {/* What it does */}
          <p className="text-lg sm:text-xl text-theme-secondary mb-8 max-w-2xl mx-auto">
            Sails checks your sales against every state&apos;s economic nexus rules, flags the states you&apos;re close to or over, and reminds you before filing deadlines. Built for Shopify and WooCommerce sellers. <span className="text-theme-primary font-medium">Free to start.</span>
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["Free plan, no credit card", "No accounting degree needed", `State rules reviewed ${NEXUS_RULES_REVIEWED_LABEL}`, "Read-only store access"].map((text, i) => (
              <div key={i} className="px-3 py-1.5 rounded-full flex items-center text-sm" style={{ backgroundColor: 'var(--bg-card)', opacity: 0.8 }}>
                <Check className="w-3.5 h-3.5 text-theme-muted" />
                <span className="text-theme-muted ml-1.5">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
              Start Free — No Credit Card
            </Link>
            <Link href="/pricing" className="card-theme px-8 py-4 rounded-xl font-semibold text-lg text-theme-primary hover:bg-theme-accent/10 transition">
              See Pricing
            </Link>
          </div>
          <p className="text-theme-muted text-sm mt-4">Free forever tier • Paid plans from $9/mo • Cancel anytime</p>
        </div>
      </section>

      {/* Social Proof / Platform Badges */}
      <section className="py-10 px-4 border-b border-theme-primary bg-theme-card/30">
        <div className="max-w-5xl mx-auto">
          {/* Platform Integrations */}
          <p className="text-center text-theme-muted text-sm uppercase tracking-wider font-medium mb-6">Works with your store</p>
          <div className="flex flex-wrap justify-center items-center gap-4 mb-10">
            {INTEGRATIONS.filter((p) => p.status !== 'planned').map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl card-theme border border-theme-primary ${p.status === 'beta' ? 'border-dashed' : ''}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                  {p.name.charAt(0)}
                </div>
                <span className={`font-semibold ${p.status === 'beta' ? 'text-theme-muted' : 'text-theme-primary'}`}>{p.name}</span>
                {p.status === 'beta' && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                    {STATUS_LABEL.beta}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Facts, not vanity numbers */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-theme-accent mb-1">50 + DC</div>
              <div className="text-theme-muted text-sm">States tracked</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-theme-accent mb-1">{NEXUS_RULES_REVIEWED_MONTH}</div>
              <div className="text-theme-muted text-sm">State rules last reviewed</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-theme-accent mb-1">$0</div>
              <div className="text-theme-muted text-sm">To start</div>
            </div>
          </div>
        </div>
      </section>

      {/* Early access — honest about where Sails is today */}
      <section className="py-12 px-4 border-b border-theme-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-3">Sails is new, and we&apos;re building it with our first sellers</h2>
          <p className="text-theme-secondary mb-2">
            If you&apos;re a small seller trying to figure out sales tax, we&apos;d love to help you get set up
            and hear what would make Sails more useful to you.
          </p>
          <p className="text-theme-muted text-sm">
            Email <a href="mailto:support@sails.tax" className="text-theme-accent hover:underline">support@sails.tax</a> — a real person reads every message.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 border-b border-theme-primary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-4">
            How It Works
          </h2>
          <p className="text-theme-muted text-center mb-12 max-w-2xl mx-auto">
            Get set up in 5 minutes. No tax expertise required.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "1", title: "Connect Your Store", desc: "Connect Shopify or WooCommerce (other platforms are in beta) and upload Amazon order reports. Sails imports your orders, so there's no retyping." },
              { num: "2", title: "We Track Your Sales", desc: "Sails adds up your sales into each state, compares them with that state's threshold, and flags the states you're approaching or have passed." },
              { num: "3", title: "Know What To Do", desc: "See which states you may need to register in, your filing deadlines, and your sales and tax collected by state — ready for your returns." }
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
          <div className="mt-12 flex justify-center items-center gap-4 text-theme-muted text-sm flex-wrap">
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary">Connect Your Store</span>
            <span>→</span>
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary">We Track Your Sales</span>
            <span>→</span>
            <span className="card-theme px-4 py-2 rounded-lg text-theme-primary flex items-center gap-1">Know What To Do <Check className="w-4 h-4 text-theme-accent" /></span>
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
              { pain: "\"I sell on Shopify and Amazon but I have no idea if I should be collecting sales tax.\"", solution: "See your nexus picture across all 50 states and DC, with every channel combined." },
              { pain: "\"I'm scared I'll get a letter from a state saying I owe thousands in back taxes.\"", solution: "Spot the states you're close to or over — before a state spots them first." },
              { pain: "\"Filing deadlines are different for every state and I can't keep track.\"", solution: "Get an email 7 days and 1 day before each deadline you track." },
              { pain: "\"I don't have time to figure out sales tax rules for 45 states.\"", solution: `We keep each state's thresholds up to date, with sources (last reviewed ${NEXUS_RULES_REVIEWED_LABEL}).` }
            ].map((item, i) => (
              <div key={i} className="card-theme rounded-xl p-6">
                <p className="text-theme-secondary italic mb-4">{item.pain}</p>
                <p className="text-theme-accent font-medium">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Integrations Detail */}
      <section id="integrations" className="py-16 px-4 border-b border-theme-primary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-4">
            Works With Your Platform
          </h2>
          <p className="text-theme-muted text-center mb-12 max-w-2xl mx-auto">
            Connect your store in minutes. No developer needed.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                color: '#96bf48',
                letter: 'S',
                platform: 'Shopify',
                desc: 'Connect via OAuth in one click. We sync your orders automatically and track nexus across all your Shopify sales.',
                badge: 'Direct Integration',
              },
              {
                color: '#7f54b3',
                letter: 'W',
                platform: 'WooCommerce',
                desc: 'Install our lightweight plugin and we pull in your order history. Works with any WooCommerce store on any host.',
                badge: 'Free Plugin',
              },
              {
                color: '#34313f',
                letter: 'B',
                platform: 'BigCommerce',
                desc: 'BigCommerce integration connects to your store API. Import historical orders and track new sales in real time.',
                badge: 'Coming Soon',
              },
            ].map((p, i) => (
              <div key={i} className="card-theme rounded-xl p-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4" style={{ backgroundColor: p.color }}>
                  {p.letter}
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-2">{p.platform}</h3>
                <span className="inline-block text-xs px-2 py-1 rounded-full font-medium mb-3" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                  {p.badge}
                </span>
                <p className="text-theme-muted text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-theme-muted text-sm mt-8">
            Also supports manual CSV import for Amazon, Etsy, eBay, and more.
          </p>
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
              <Link href="/signup" className="text-theme-accent hover:underline">Sign up free</Link> to access nexus tracking, deadline alerts, and filing reports
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
              { icon: <Link2 className={ICON_CLASS} />, title: "Store Integrations", desc: "Connect Shopify, WooCommerce, or BigCommerce in minutes.", comingSoon: false },
              { icon: <LayoutDashboard className={ICON_CLASS} />, title: "Simple Dashboard", desc: "Built for makers, not accountants", comingSoon: false },
              { icon: <ClipboardList className={ICON_CLASS} />, title: "Filing Assistance", desc: "Know exactly what to file and when", comingSoon: true }
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

      {/* Pricing Preview + Avalara Comparison */}
      <section id="pricing" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
            Pricing Built for Real Sellers
          </h2>
          <p className="text-theme-muted mb-8">
            Not enterprise budgets. Not VC-backed growth plans. Just honest pricing for small businesses.
          </p>
          
          <div className="grid sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
            <div className="card-theme rounded-xl p-6">
              <div className="text-theme-accent font-bold text-2xl mb-1">Free</div>
              <div className="text-theme-muted text-sm">Nexus monitoring</div>
            </div>
            <div className="card-theme rounded-xl p-6 border-2 border-theme-accent">
              <div className="text-theme-accent font-bold text-2xl mb-1">$9/mo</div>
              <div className="text-theme-muted text-sm">Starter — side hustlers</div>
            </div>
            <div className="card-theme rounded-xl p-6">
              <div className="text-theme-accent font-bold text-2xl mb-1">$29/mo</div>
              <div className="text-theme-muted text-sm">Pro — full-time sellers</div>
            </div>
            <div className="card-theme rounded-xl p-6">
              <div className="text-theme-accent font-bold text-2xl mb-1">$79/mo</div>
              <div className="text-theme-muted text-sm">Enterprise — high volume</div>
            </div>
          </div>

          {/* Avalara comparison callout */}
          <div className="card-theme rounded-xl p-6 max-w-2xl mx-auto mb-8 border border-theme-primary">
            <div className="flex items-center gap-2 justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-theme-accent" />
              <span className="font-semibold text-theme-primary">How Sails compares</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-bold text-theme-primary mb-1">Sails</div>
                <div className="text-2xl font-bold text-theme-accent">$9/mo</div>
                <div className="text-theme-muted text-xs mt-1">Starter plan</div>
              </div>
              <div>
                <div className="font-bold text-theme-primary mb-1">TaxJar</div>
                <div className="text-2xl font-bold text-theme-secondary">$99/mo</div>
                <div className="text-theme-muted text-xs mt-1">Entry plan</div>
              </div>
              <div>
                <div className="font-bold text-theme-primary mb-1">Avalara</div>
                <div className="text-2xl font-bold text-theme-secondary">$15K+/yr</div>
                <div className="text-theme-muted text-xs mt-1">Average contract</div>
              </div>
            </div>
            <p className="text-theme-muted text-xs mt-4">Same core compliance features. No enterprise pricing. No surprise fees.</p>
          </div>
          
          <Link href="/pricing" className="inline-block btn-theme-primary px-8 py-3 rounded-lg font-semibold transition">
            See All Plans
          </Link>
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

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-4 border-t border-theme-primary">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-theme-muted text-center mb-10">
            Everything small sellers want to know about sales tax compliance.
          </p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card-theme rounded-xl overflow-hidden">
                <button
                  className="w-full px-6 py-5 text-left flex justify-between items-center gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-theme-primary">{faq.question}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-5 h-5 text-theme-accent flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-theme-muted flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-theme-secondary text-sm leading-relaxed border-t border-theme-primary pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-20 px-4 bg-theme-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
            Get Back to Making Things
          </h2>
          <p className="text-theme-muted mb-8 text-lg">
            Sales tax compliance for $9/month — not $19,000/year. Free forever tier available.
          </p>
          <Link href="/signup" className="inline-block btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
            Start Free — No Credit Card
          </Link>
          <p className="text-theme-muted text-sm mt-4">
            Join small business owners who finally understand their sales tax obligations
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
