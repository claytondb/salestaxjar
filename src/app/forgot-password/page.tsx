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
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="card-theme rounded-xl border border-theme-primary p-8">
          {status === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-theme-primary mb-2 text-center">Forgot Password?</h1>
              <p className="text-theme-muted mb-6 text-center">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="px-4 py-3 rounded-lg mb-6" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-theme-primary  text-theme-primary py-3 rounded-lg font-medium transition"
                >
                  Send Reset Link
                </button>
              </form>

              <p className="text-center text-theme-muted mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-theme-accent hover:text-emerald-300">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent mx-auto mb-4"></div>
              <p className="text-theme-muted">Sending reset link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 btn-theme-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📧</span>
              </div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Check Your Email</h2>
              <p className="text-theme-muted mb-6">
                If an account exists with <strong className="text-theme-primary">{email}</strong>, 
                we&apos;ve sent a password reset link.
              </p>
              <p className="text-theme-muted text-sm mb-6">
                Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('form')}
                  className="block w-full bg-white/10 hover:bg-white/20 text-theme-primary py-3 rounded-lg font-medium transition"
                >
                  Try Another Email
                </button>
                <Link
                  href="/login"
                  className="block w-full btn-theme-primary  text-theme-primary py-3 rounded-lg font-medium transition text-center"
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
