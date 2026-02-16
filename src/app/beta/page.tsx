'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle2, 
  Gift, 
  Users, 
  MessageSquare, 
  ArrowRight,
  Loader2,
  ClipboardList
} from 'lucide-react';
import SailsLogo from '@/components/SailsLogo';
import BetaSurveyCard from '@/components/BetaSurveyCard';

const BETA_END_DATE = new Date('2026-03-02'); // 2 weeks from now - adjust as needed

export default function BetaPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/beta/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (data.isInvited) {
        if (data.alreadyRedeemed) {
          setStatus('already');
          setMessage('You\'ve already joined the beta! Log in to access your account.');
        } else {
          setStatus('success');
          setMessage('You\'re on the list! Click below to create your account.');
        }
      } else {
        setStatus('error');
        setMessage('This email isn\'t on our beta list yet. If you signed up on Reddit, make sure you\'re using the same email.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const daysLeft = Math.max(0, Math.ceil((BETA_END_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header - matches main site */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Sails</span>
            </Link>
            <Link 
              href="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition text-sm"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Beta Program — {daysLeft} days left
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            You're Invited to the<br />
            <span className="text-emerald-600">Sails Beta</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Thanks for your interest! Enter your email below to check your beta status 
            and claim your <strong>lifetime free Pro account</strong>.
          </p>
        </motion.div>

        {/* Email Check Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-md mx-auto mb-16"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Check My Status
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium">{message}</p>
                  <Link 
                    href={`/signup?email=${encodeURIComponent(email)}&beta=true`}
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create Your Account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'already' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-medium">{message}</p>
                  <Link 
                    href="/login"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Log In
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <p className="text-red-800">{message}</p>
              <p className="text-red-600 text-sm mt-2">
                Think this is a mistake? Reply to the Reddit thread or email support.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* What Beta Testers Get */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            What Beta Testers Get
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Gift,
                title: 'Lifetime Free Pro',
                description: 'Your Pro account stays free forever. Not a trial — actually free.',
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                icon: MessageSquare,
                title: 'Direct Access',
                description: 'Talk directly to the founder. Your feedback shapes the product.',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: Users,
                title: 'Founding Member Status',
                description: 'Your name on our Founding Members page. Early access to all new features.',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* What We Ask */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 rounded-2xl p-8 text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What We Ask in Return
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-4">
            Use Sails with your real store and tell us what's broken, confusing, or missing.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium mb-4">
            <ClipboardList className="w-4 h-4" />
            Complete a short survey at the end of beta to lock in your lifetime free Pro account
          </div>
          <p className="text-sm text-gray-500">
            Beta ends {BETA_END_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. 
            Complete the survey to keep your lifetime Pro access.
          </p>
        </motion.div>

        {/* Survey Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <BetaSurveyCard userEmail={email} />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 Sails. Sales tax made breezy.</p>
        </div>
      </footer>
    </div>
  );
}
