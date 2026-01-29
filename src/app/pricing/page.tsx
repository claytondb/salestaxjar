'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Check, Clock, Sparkles, Heart, Zap, Shield } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'See if you even need to worry about sales tax',
    features: [
      { text: 'Nexus monitoring (where do I owe?)', included: true },
      { text: 'Economic nexus alerts', included: true },
      { text: 'Unlimited tax calculations', included: true },
      { text: 'Educational guides', included: true },
      { text: 'Email support', included: true },
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Starter',
    price: 9,
    description: 'For side hustlers who just hit nexus thresholds',
    features: [
      { text: 'Everything in Free, plus:', included: true, bold: true },
      { text: 'Up to 200 orders/month', included: true },
      { text: 'Shopify & WooCommerce', included: true },
      { text: 'Track 3 states', included: true },
      { text: 'Email deadline reminders', included: true },
      { text: 'CSV order import', included: true },
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For full-time sellers with multi-state sales',
    features: [
      { text: 'Everything in Starter, plus:', included: true, bold: true },
      { text: 'Up to 2,000 orders/month', included: true },
      { text: 'All integrations (Shopify, WooCommerce, Squarespace...)', included: true },
      { text: 'Unlimited state tracking', included: true },
      { text: 'SMS + email reminders', included: true },
      { text: 'Priority support', included: true },
      { text: 'Filing assistance', included: true, comingSoon: true },
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: 59,
    description: 'For high-volume sellers who want it all',
    features: [
      { text: 'Everything in Pro, plus:', included: true, bold: true },
      { text: 'Unlimited orders', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'API access', included: true },
      { text: 'Audit support resources', included: true },
      { text: 'Auto-filing', included: true, comingSoon: true },
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

const faqs = [
  {
    q: 'Why is Sails so much cheaper than TaxJar?',
    a: 'We built Sails specifically for small online store owners — not enterprise businesses. We don\'t need a giant sales team or fancy offices. We pass those savings to you.',
  },
  {
    q: 'What happens after my free trial?',
    a: 'After 14 days, you can pick a paid plan or stay on Free forever. The Free plan lets you monitor nexus and calculate taxes — you only pay when you need more.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes! Upgrade or downgrade anytime. Changes take effect on your next billing cycle.',
  },
  {
    q: 'What counts as an "order"?',
    a: 'Any transaction you import or sync from your connected store counts as one order. Multi-item orders still count as just one order.',
  },
  {
    q: 'Do you file my sales tax returns for me?',
    a: 'Filing assistance is coming soon for Pro plans! Right now we calculate what you owe and remind you of deadlines. Many users say this alone saves them hours.',
  },
  {
    q: 'I\'m just a hobby seller. Do I even need this?',
    a: 'Maybe not yet! Use our free nexus monitoring to see if you\'ve crossed any state thresholds. Many states require collection at $100K in sales. We\'ll alert you when you\'re getting close.',
  },
  {
    q: 'Is Sails a CPA or tax advisor?',
    a: 'No — we\'re software that helps you track and calculate sales tax. We provide filing-ready reports, but you review and submit them yourself. For complex situations, we recommend consulting a tax professional.',
  },
];

const comparisons = [
  { feature: 'Starting price', sails: '$9/mo', taxjar: '$19/mo', taxcloud: '$19/mo' },
  { feature: 'Free tier', sails: '✓ Yes', taxjar: '✗ No', taxcloud: '✗ No' },
  { feature: 'Shopify + WooCommerce', sails: '✓', taxjar: '✓', taxcloud: '✓' },
  { feature: 'Squarespace', sails: '✓', taxjar: '✗ No', taxcloud: '✗ No' },
  { feature: 'Made for small sellers', sails: '✓', taxjar: 'Enterprise focus', taxcloud: 'Mixed' },
];

export default function PricingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleCTA = (planName: string, price: number) => {
    if (user) {
      router.push('/settings?tab=billing');
    } else if (price === 0) {
      router.push('/signup');
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Header */}
      <header className="border-b border-theme-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-theme-accent" />
              <span className="text-2xl font-bold text-theme-primary">Sails</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              <Link href="/#features" className="text-theme-secondary hover:text-theme-primary transition">Features</Link>
              <Link href="/pricing" className="text-theme-accent font-medium">Pricing</Link>
              <Link href="/#calculator" className="text-theme-secondary hover:text-theme-primary transition">Calculator</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              {isLoading ? null : user ? (
                <Link href="/dashboard" className="btn-theme-primary text-white px-4 py-2 rounded-lg font-medium transition">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="border border-theme-secondary text-theme-secondary hover:text-theme-primary hover:border-theme-primary px-4 py-2 rounded-lg transition hidden sm:inline-block">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-theme-primary text-white px-4 py-2 rounded-lg font-medium transition">
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent-subtle text-theme-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4" />
            Built for small online store owners
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-theme-primary mb-4">
            Half the price of TaxJar.
            <br />
            <span className="text-theme-accent">All the features you need.</span>
          </h1>
          <p className="text-xl text-theme-secondary mb-2">
            Sales tax software that doesn't assume you have an accounting department.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 ${
                  plan.popular
                    ? 'bg-accent-subtle border-2 border-theme-accent relative'
                    : 'card-theme'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <h2 className="text-xl font-bold text-theme-primary mb-1">{plan.name}</h2>
                <p className="text-theme-muted text-sm mb-4 min-h-[40px]">{plan.description}</p>

                <div className="mb-6">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-theme-primary">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-theme-primary">${plan.price}</span>
                      <span className="text-theme-muted">/mo</span>
                    </>
                  )}
                </div>

                <ul className="space-y-2 mb-6 min-h-[200px]">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {feature.comingSoon ? (
                        <Clock className="w-4 h-4 text-theme-muted mt-0.5 flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-theme-accent mt-0.5 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${feature.bold ? 'font-semibold text-theme-primary' : 'text-theme-secondary'}`}>
                        {feature.text}
                        {feature.comingSoon && (
                          <span className="text-theme-muted text-xs ml-1">(Soon)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan.name, plan.price)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'btn-theme-primary text-white'
                      : plan.price === 0
                      ? 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 border border-theme-primary'
                      : 'border border-theme-accent text-theme-accent hover:bg-accent-subtle'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          
          <p className="text-center text-theme-muted text-sm mt-6">
            All paid plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-theme-primary text-center mb-8">
            How we compare
          </h2>
          <div className="card-theme rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-primary">
                  <th className="text-left py-3 px-4 text-theme-muted font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-theme-accent font-bold">Sails</th>
                  <th className="text-center py-3 px-4 text-theme-muted font-medium">TaxJar</th>
                  <th className="text-center py-3 px-4 text-theme-muted font-medium">TaxCloud</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={i} className="border-b border-theme-primary/50">
                    <td className="py-3 px-4 text-theme-secondary">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-theme-accent font-medium">{row.sails}</td>
                    <td className="py-3 px-4 text-center text-theme-muted">{row.taxjar}</td>
                    <td className="py-3 px-4 text-center text-theme-muted">{row.taxcloud}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div className="card-theme rounded-xl p-6">
              <Zap className="w-8 h-8 text-theme-accent mx-auto mb-3" />
              <h3 className="font-semibold text-theme-primary mb-1">5-minute setup</h3>
              <p className="text-theme-muted text-sm">Connect your store and start tracking in minutes, not hours.</p>
            </div>
            <div className="card-theme rounded-xl p-6">
              <Shield className="w-8 h-8 text-theme-accent mx-auto mb-3" />
              <h3 className="font-semibold text-theme-primary mb-1">No surprise fees</h3>
              <p className="text-theme-muted text-sm">The price you see is the price you pay. Always.</p>
            </div>
            <div className="card-theme rounded-xl p-6">
              <Heart className="w-8 h-8 text-theme-accent mx-auto mb-3" />
              <h3 className="font-semibold text-theme-primary mb-1">Made for makers</h3>
              <p className="text-theme-muted text-sm">We speak human, not accountant. No jargon here.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 sm:py-16 px-4 bg-theme-secondary/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-8">
            Questions? We&apos;ve got answers.
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="card-theme rounded-xl p-6">
                <h3 className="text-theme-primary font-semibold mb-2">{faq.q}</h3>
                <p className="text-theme-muted text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-4">
            Ready to stop stressing about sales tax?
          </h2>
          <p className="text-theme-muted mb-8">
            Join thousands of small business owners who finally understand their tax obligations.
          </p>
          <Link href="/signup" className="inline-block btn-theme-primary text-white px-8 py-4 rounded-xl font-semibold text-lg transition">
            Start Free — No Credit Card
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
