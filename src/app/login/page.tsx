'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      {/* Theme toggle in corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-logo-from)] to-[var(--color-logo-to)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">$</span>
          </div>
          <span className="text-3xl font-bold text-[var(--color-text)]">SalesTaxJar</span>
        </Link>

        {/* Login Form */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-8 border border-[var(--color-border)] shadow-lg">
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-2">Welcome back</h1>
          <p className="text-[var(--color-text-muted)] text-center mb-6">Log in to your account</p>

          {error && (
            <div className="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error)] px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[var(--color-text-secondary)] mb-2 font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[var(--color-text-secondary)] mb-2 font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <input type="checkbox" className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-[var(--color-primary)] hover:underline">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[var(--color-text-muted)]">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-[var(--color-primary)] hover:underline font-medium">
              Sign up free
            </Link>
          </div>
        </div>

        {/* Demo Account */}
        <div className="mt-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-center shadow-sm">
          <p className="text-[var(--color-text-muted)] text-sm mb-2">Try with a demo account:</p>
          <button
            onClick={() => {
              setEmail('demo@salestaxjar.com');
              setPassword('demo123');
            }}
            className="text-[var(--color-primary)] hover:underline text-sm font-medium"
          >
            Fill demo credentials
          </button>
        </div>
      </div>
    </div>
  );
}
