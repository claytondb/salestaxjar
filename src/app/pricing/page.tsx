'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import SailsLogo from '@/components/SailsLogo';
import { Check, Clock, X, DollarSign } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'For small sellers just getting started',
    features: [
      { text: 'Up to 500 orders/month', included: true },
      { text: 'Tax calculator', included: true },
      { text: 'Nexus tracking for 3 states', included: true },
      { text: 'Email deadline reminders', included: true },
      { text: 'Email support', included: true },
      { text: 'Platform integrations', included: false, comingSoon: true },
      { text: 'Auto-filing', included: false, comingSoon: true },
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: 79,
    description: 'For growing businesses with multi-state sales',
    features: [
      { text: 'Up to 5,000 orders/month', included: true },
      { text: 'Tax calculator', included: true },
      { text: 'Unlimited nexus tracking', included: true },
      { text: 'Email + SMS deadline reminders', included: true },
      { text: 'Priority support', included: true },
      { text: 'All platform integrations', included: false, comingSoon: true },
      { text: 'Filing assistance', included: false, comingSoon: true },
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For high-volume sellers who need it all',
    features: [
      { text: 'Unlimited orders', included: true },
      { text: 'Tax calculator', included: true },
      { text: 'Unlimited nexus tracking', included: true },
      { text: 'Email + SMS + Phone reminders', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom integrations', included: false, comingSoon: true },
      { text: 'Full auto-filing service', included: false, comingSoon: true },
      { text: 'Audit support resources', included: false, comingSoon: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  {
    q: 'What happens after my free trial?',
    a: 'After 14 days, you can choose a plan that fits your needs. We\'ll send you a reminder before the trial ends. If you don\'t upgrade, your account stays active but with limited features.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes! You can upgrade or downgrade at any time. If you upgrade, the change takes effect immediately. If you downgrade, it takes effect at the start of your next billing cycle.',
  },
  {
    q: 'What counts as an "order"?',
    a: 'Any transaction you import or calculate tax for counts as one order. Even if an order has multiple items, it\'s still just one order.',
  },
  {
    q: 'Do you file my sales tax returns for me?',
    a: 'Not yet, but it\'s coming soon! Right now we help you calculate what you owe and remind you of deadlines. Auto-filing is our most requested feature and it\'s in development.',
  },
  {
    q: 'Is Sails a CPA or tax advisor?',
    a: 'No. We\'re a software tool that helps you track and calculate sales tax. We\'re not licensed to give tax advice. For complex situations, we recommend consulting a tax professional.',
  },
  {
    q: 'What if I need help?',
    a: 'Email support is included with all plans. Growth and Enterprise customers get priority support with faster response times.',
  },
];

export default function PricingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleCTA = (planName: string) => {
    if (planName === 'Enterprise') {
      // For enterprise, go to contact page
      router.push('/contact');
    } else if (user) {
      // Logged in users go to settings/billing
      router.push('/settings?tab=billing');
    } else {
      // New users go to signup
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-emerald-400" />
              <span className="text-2xl font-bold text-white">Sails</span>
            </Link>
            <div className="flex gap-3">
              {isLoading ? null : user ? (
                <Link href="/dashboard" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-gray-300 hover:text-white px-4 py-2 transition hidden sm:inline-block">
                    Log in
                  </Link>
                  <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition">
                    Start Free Trial
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Pick a plan that fits your business. No hidden fees.
          </p>
          <p className="text-emerald-400 font-medium">
            Every plan includes a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 lg:p-8 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500 relative'
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-1">{plan.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl lg:text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : feature.comingSoon ? (
                        <Clock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                        {feature.text}
                        {feature.comingSoon && (
                          <span className="text-yellow-400 text-xs ml-1">(Coming Soon)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan.name)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Note */}
      <section className="py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <p className="text-emerald-400 font-medium mb-2 flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" /> Save thousands compared to competitors
            </p>
            <p className="text-gray-300 text-sm">
              Similar services charge $100-$500/month or more. Sails gives you the essentials at a price that makes sense for small businesses.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 sm:py-16 px-4 bg-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
            Questions? We&apos;ve got answers.
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-gray-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to stop stressing about sales tax?
          </h2>
          <p className="text-gray-400 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Link href="/signup" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition">
            Start 14-Day Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
