'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Check, Sparkles, Heart, Zap, Shield } from 'lucide-react';
import { TAXJAR, COMPETITOR_FACTS_CHECKED_LABEL } from '@/lib/competitors';
import { PLAN_MARKETING } from '@/lib/plan-features';

const plans = (['free', 'starter', 'pro', 'enterprise'] as const).map((tier) => ({
  ...PLAN_MARKETING[tier],
  cta: tier === 'free' ? 'Get Started Free' : 'Start Free Trial',
  popular: tier === 'pro',
}));

const faqs = [
  {
    q: 'How is Sails different from TaxJar?',
    a: `TaxJar calculates tax at checkout and can file returns for you (AutoFile is billed per return). Sails focuses on the step before that: showing a small seller which states they're likely required to register in, and what to do next. Sails has a free plan; TaxJar's Starter plan is listed at $39/month with a 30-day free trial (checked ${COMPETITOR_FACTS_CHECKED_LABEL}).`,
  },
  {
    q: 'What happens after my free trial?',
    a: 'Paid plans start with a 14-day free trial and no credit card. If you add a card, your plan continues after the trial. If you don\'t, you move to the Free plan automatically — nothing is charged.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade or downgrade anytime from Settings → Billing.',
  },
  {
    q: 'What does the free plan include?',
    a: 'Nexus monitoring across all 50 states + DC, threshold alerts, a filing calendar, unlimited tax calculations, and one store connection with up to 50 orders a month. The limit counts orders by the month they were placed, so you can import past months too, up to 50 orders in each. No time limit, no credit card.',
  },
  {
    q: 'Do you file my sales tax returns for me?',
    a: 'No. Sails shows you where you\'re likely required to collect, your deadlines, and your sales and tax collected by state, and you (or your accountant) file with each state. We\'ll only offer filing once the process has been reviewed by licensed tax professionals.',
  },
  {
    q: 'I\'m just a hobby seller. Do I even need this?',
    a: 'Maybe not yet! Most states only require you to register once your sales into that state pass $100,000 a year (a few use a higher amount, and some also count 200 transactions). The free plan will tell you if you get close.',
  },
  {
    q: 'Is Sails a CPA or tax advisor?',
    a: 'No — we\'re software that helps you track and estimate sales tax. You review and submit returns yourself. For complex situations, we recommend consulting a tax professional.',
  },
];

const comparisons = [
  { feature: 'Free plan', sails: 'Yes', taxjar: TAXJAR.freePlan.value, source: TAXJAR.freePlan.sourceUrl },
  { feature: 'Starting price', sails: '$9/mo (Starter)', taxjar: TAXJAR.starterPrice.value, source: TAXJAR.starterPrice.sourceUrl },
  { feature: 'Filing returns for you', sails: 'Not offered — you file', taxjar: TAXJAR.filing.value, source: TAXJAR.filing.sourceUrl },
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
            <nav className="hidden lg:flex gap-6 items-center">
              <Link href="/free-scan" className="text-theme-secondary hover:text-theme-primary transition whitespace-nowrap">Nexus Check</Link>
              <Link href="/pricing" className="text-theme-accent font-medium">Pricing</Link>
              <Link href="/free-calculator" className="text-theme-secondary hover:text-theme-primary transition">Calculator</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="lg:hidden">
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
            Simple pricing for small sellers.
            <br />
            <span className="text-theme-accent">Start free.</span>
          </h1>
          <p className="text-xl text-theme-secondary mb-2">
            Sales tax software that doesn&apos;t assume you have an accounting department.
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
                      <Check className="w-4 h-4 text-theme-accent mt-0.5 flex-shrink-0" />
                      <span className={`text-sm ${feature.bold ? 'font-semibold text-theme-primary' : 'text-theme-secondary'}`}>
                        {feature.text}
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
            Paid plans start with a 14-day free trial — no credit card required. Skip the card and you&apos;ll simply move to Free when the trial ends.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-theme-primary text-center mb-8">
            How we compare
          </h2>
          <p className="text-center text-theme-muted text-sm -mt-4 mb-6">
            Different tools do different jobs. Here are the facts we can point to.
          </p>
          <div className="card-theme rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-primary">
                  <th className="text-left py-3 px-4 text-theme-muted font-medium"></th>
                  <th className="text-center py-3 px-4 text-theme-accent font-bold">Sails</th>
                  <th className="text-center py-3 px-4 text-theme-muted font-medium">TaxJar</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={i} className="border-b border-theme-primary/50">
                    <td className="py-3 px-4 text-theme-secondary">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-theme-accent font-medium">{row.sails}</td>
                    <td className="py-3 px-4 text-center text-theme-muted">
                      <a href={row.source} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.taxjar}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-theme-muted text-xs mt-3">
            TaxJar details are from TaxJar&apos;s public pricing pages, checked {COMPETITOR_FACTS_CHECKED_LABEL}. Prices change — click a value to see the source.
          </p>
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
            See where you stand in every state in a few minutes. The free plan has no time limit.
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
