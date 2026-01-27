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
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setError(data.error || 'Verification failed');
          return;
        }

        setStatus('success');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
              <p className="text-gray-400">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-gray-400 mb-6">
                Your email has been successfully verified. Redirecting to dashboard...
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✕</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-red-400 mb-6">{error}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  Go to Login
                </Link>
                <p className="text-gray-500 text-sm">
                  Need help?{' '}
                  <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
