'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const result = await signup(email, password, name);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Signup failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-theme-gradient flex flex-col">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <SailsLogo className="w-12 h-12 text-theme-accent" />
          <span className="text-3xl font-bold text-theme-primary">Sails</span>
        </Link>

        {/* Signup Form */}
        <div className="card-theme rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-theme-primary text-center mb-2">Create your account</h1>
          <p className="text-theme-muted text-center mb-6">Free forever plan available. Paid plans include 14-day free trial.</p>

          {error && (
            <div className="px-4 py-3 rounded-lg mb-6 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-theme-secondary mb-2 font-medium">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-theme-secondary mb-2 font-medium">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-theme-secondary mb-2 font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-theme-secondary mb-2 font-medium">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="text-sm text-theme-muted">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-theme-accent hover:opacity-80">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-theme-accent hover:opacity-80">Privacy Policy</Link>.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-theme-primary py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-theme-muted">Already have an account? </span>
            <Link href="/login" className="text-theme-accent hover:opacity-80 font-medium">
              Log in
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {['Free tier forever', 'No credit card required', 'Upgrade anytime', 'Cancel anytime'].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-theme-muted text-sm">
              <span className="text-theme-accent">✓</span>
              {benefit}
            </div>
          ))}
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
