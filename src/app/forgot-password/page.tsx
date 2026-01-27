'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success'>('form');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    const result = await forgotPassword(email);
    
    if (!result.success && result.error) {
      setError(result.error);
      setStatus('form');
      return;
    }

    // Always show success to prevent email enumeration
    setStatus('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-8">
          {status === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2 text-center">Forgot Password?</h1>
              <p className="text-gray-400 mb-6 text-center">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition"
                >
                  Send Reset Link
                </button>
              </form>

              <p className="text-center text-gray-400 mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Sending reset link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📧</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-gray-400 mb-6">
                If an account exists with <strong className="text-white">{email}</strong>, 
                we&apos;ve sent a password reset link.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('form')}
                  className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium transition"
                >
                  Try Another Email
                </button>
                <Link
                  href="/login"
                  className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
