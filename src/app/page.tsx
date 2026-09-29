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
  ClipboardList,
  Check,
  Calendar,
  AlertTriangle,
  Heart,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ICON_CLASS = "w-8 h-8 text-theme-accent";

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  calculator: <Calculator className={ICON_CLASS} />,
  nexus_tracking: <MapPin className={ICON_CLASS} />,
  threshold_alerts: <AlertTriangle className={ICON_CLASS} />,
  filing_calendar: <Calendar className={ICON_CLASS} />,
  deadline_reminders: <Bell className={ICON_CLASS} />,
  reports: <LayoutDashboard className={ICON_CLASS} />,
  filing_summaries: <ClipboardList className={ICON_CLASS} />,
};

// Six cards (a full 3×2 grid), all live.
const HOMEPAGE_FEATURE_IDS = [
  'nexus_tracking',
  'threshold_alerts',
  'filing_calendar',
  'deadline_reminders',
  'reports',
  'calculator',
];

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
      answer: "Connect your store and upload your Amazon order reports, and Sails combines them into one state-by-state picture. States treat marketplace sales differently — some count them toward your threshold and some don't — and Sails applies each state's rule for you."
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

  // The page renders right away (and on the server) so visitors and search
  // engines see the content; only the header buttons wait for the auth check.
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
            <nav className="hidden lg:flex gap-6 items-center">
              <a href="#features" className="text-theme-secondary hover:text-theme-primary transition">Features</a>
              <Link href="/free-scan" className="text-theme-secondary hover:text-theme-primary transition whitespace-nowrap">Nexus Check</Link>
              <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">Pricing</Link>
              <a href="#calculator" className="text-theme-secondary hover:text-theme-primary transition">Calculator</a>
              <Link href="/blog" className="text-theme-secondary hover:text-theme-primary transition">Blog</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                className="lg:hidden text-theme-secondary hover:text-theme-primary p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {!isLoading && user ? (
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
                  <Link href="/signup" className="btn-theme-primary px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base whitespace-nowrap">
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
        <div className="lg:hidden border-b border-theme-primary bg-theme-card/95 backdrop-blur-sm">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Features</a>
            <Link href="/free-scan" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Free Nexus Check</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Pricing</Link>
            <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Calculator</a>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="text-theme-secondary hover:text-theme-primary transition py-2">Blog</Link>
            <div className="py-2 flex items-center gap-3">
              <span className="text-theme-secondary">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
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
            Sails checks your sales against every state&apos;s economic nexus rules, flags the states you&apos;re close to or over, and keeps your filing due dates in one place. Built for Shopify and WooCommerce sellers. <span className="text-theme-primary font-medium">Free to start.</span>
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["Free plan, no credit card", "No accounting degree needed", `State rules reviewed ${NEXUS_RULES_REVIEWED_MONTH}`, "Read-only store access"].map((text, i) => (
              <div key={i} className="px-3 py-1.5 rounded-full flex items-center text-sm" style={{ backgroundColor: 'var(--bg-card)', opacity: 0.8 }}>
                <Check className="w-3.5 h-3.5 text-theme-muted" />
                <span className="text-theme-muted ml-1.5">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/free-scan" className="btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
              Check Where You Owe — Free
            </Link>
            <Link href="/signup" className="card-theme px-8 py-4 rounded-xl font-semibold text-lg text-theme-primary hover:bg-theme-accent/10 transition">
              Create a Free Account
            </Link>
          </div>
          <p className="text-theme-muted text-sm mt-4">
            The check needs no signup — drop in an order export and your file never leaves your computer.
          </p>
          <p className="text-theme-muted text-sm mt-1">Free forever tier • Paid plans from $9/mo • Cancel anytime</p>
          <p className="text-sm mt-3">
            <Link href="/sales-tax" className="text-theme-accent hover:underline">
              Look up any state&apos;s threshold and due dates →
            </Link>
          </p>
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
              { pain: "\"Filing deadlines are different for every state and I can't keep track.\"", solution: "See the upcoming due dates for every state you track on one calendar." },
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
            Connect your store in minutes. Sails only asks for read access to your orders.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {INTEGRATIONS.filter((p) => p.status === 'live').map((p) => (
              <div key={p.id} className="card-theme rounded-xl p-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4" style={{ backgroundColor: p.color }}>
                  {p.name.charAt(0)}
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-2">{p.name}</h3>
                <span className="inline-block text-xs px-2 py-1 rounded-full font-medium mb-3" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                  {STATUS_LABEL[p.status]} · {p.connection}
                </span>
                <p className="text-theme-muted text-sm">{p.summary}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-theme-muted text-sm mt-8 max-w-2xl mx-auto">
            <span className="font-medium text-theme-secondary">In beta:</span> {betaIntegrationNames()}.
            Beta connections work, but haven&apos;t been tested with many real stores yet — please double-check the numbers they produce.
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
            What You Get
          </h2>
          <p className="text-theme-muted text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            Clear answers about where you owe, without the spreadsheets.
          </p>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {HOMEPAGE_FEATURE_IDS.flatMap((id) => FEATURES.filter((f) => f.id === id)).map((feature) => (
              <div key={feature.id} className="card-theme rounded-xl p-6 hover:border-theme-accent transition relative">
                {feature.status !== 'live' && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--warning)' }}>
                    {STATUS_LABEL[feature.status]}
                  </span>
                )}
                <div className="mb-4">{FEATURE_ICONS[feature.id] ?? <ClipboardList className={ICON_CLASS} />}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-theme-primary mb-2">{feature.name}</h3>
                <p className="text-theme-muted text-sm sm:text-base">{feature.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
            Pricing Built for Real Sellers
          </h2>
          <p className="text-theme-muted mb-8">
            Start free. Pay when you want Sails watching more orders and more stores for you.
          </p>
          
          <div className="grid sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
            <div className="card-theme rounded-xl p-6">
              <div className="text-theme-accent font-bold text-2xl mb-1">Free</div>
              <div className="text-theme-muted text-sm">Nexus monitoring + 50 orders/mo</div>
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

          <p className="text-theme-muted text-sm max-w-2xl mx-auto mb-8">
            For comparison, TaxJar&apos;s Starter plan is listed at $39/month (checked {COMPETITOR_FACTS_CHECKED_LABEL}).
            TaxJar and similar tools also calculate tax at checkout and can file returns for you — Sails focuses on
            telling you where you need to register and what to do next.
          </p>
          
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
            See where you stand in every state. Free plan available — no credit card needed.
          </p>
          <Link href="/signup" className="inline-block btn-theme-primary px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">
            Start Free — No Credit Card
          </Link>
          <p className="text-theme-secondary mt-4">
            Not ready for an account?{' '}
            <Link href="/free-scan" className="text-theme-accent font-medium hover:underline">
              Run the free nexus check
            </Link>{' '}
            with an order export.
          </p>
          <p className="text-theme-muted text-sm mt-2">
            Questions first? Email support@sails.tax — a real person answers.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
