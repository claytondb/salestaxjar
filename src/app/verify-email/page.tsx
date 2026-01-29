'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'init'>('init');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Use a flag to track if we should proceed with verification
    let cancelled = false;
    
    const verifyEmail = async () => {
      if (!token) {
        if (!cancelled) {
          setStatus('error');
          setError('No verification token provided');
        }
        return;
      }

      if (!cancelled) {
        setStatus('loading');
      }

      try {
        const response = await fetch('/api/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setStatus('error');
          setError(data.error || 'Verification failed');
          return;
        }

        setStatus('success');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          if (!cancelled) {
            router.push('/dashboard');
          }
        }, 3000);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setError('An error occurred during verification');
        }
      }
    };

    verifyEmail();
    
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="card-theme rounded-xl border border-theme-primary p-8 text-center">
          {(status === 'loading' || status === 'init') && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-theme-accent mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-theme-primary mb-2">Verifying Email</h1>
              <p className="text-theme-muted">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 btn-theme-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary mb-2">Email Verified!</h1>
              <p className="text-theme-muted mb-6">
                Your email has been successfully verified. Redirecting to dashboard...
              </p>
              <Link
                href="/dashboard"
                className="inline-block btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--error-bg)' }}>
                <span className="text-4xl">✕</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary mb-2">Verification Failed</h1>
              <p className="mb-6" style={{ color: 'var(--error-text)' }}>{error}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="inline-block btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition"
                >
                  Go to Login
                </Link>
                <p className="text-theme-muted text-sm">
                  Need help?{' '}
                  <Link href="/contact" className="text-theme-accent hover:text-emerald-300">
                    Contact Support
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
