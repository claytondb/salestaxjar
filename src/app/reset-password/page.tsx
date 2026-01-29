'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(data.error || 'Password reset failed');
        return;
      }

      setStatus('success');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setStatus('error');
      setError('An error occurred');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <Header />
        <main className="max-w-md mx-auto px-4 py-20">
          <div className="card-theme rounded-xl border border-theme-primary p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✕</span>
            </div>
            <h1 className="text-2xl font-bold text-theme-primary mb-2">Invalid Reset Link</h1>
            <p className="text-theme-muted mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/login"
              className="inline-block btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition"
            >
              Back to Login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="card-theme rounded-xl border border-theme-primary p-8">
          {status === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-theme-primary mb-2 text-center">Reset Password</h1>
              <p className="text-theme-muted mb-6 text-center">
                Enter your new password below.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-theme-primary  text-theme-primary py-3 rounded-lg font-medium transition"
                >
                  Reset Password
                </button>
              </form>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent mx-auto mb-4"></div>
              <p className="text-theme-muted">Resetting your password...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 btn-theme-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Password Reset!</h2>
              <p className="text-theme-muted mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
              <Link
                href="/login"
                className="inline-block btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✕</span>
              </div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Reset Failed</h2>
              <p className="text-red-400 mb-6">{error}</p>
              <button
                onClick={() => setStatus('form')}
                className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
