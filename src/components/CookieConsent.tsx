'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Cookie notice.
 *
 * Sails sets a single, strictly necessary cookie (the sign-in session) and no
 * analytics, advertising or tracking cookies — so there is nothing to opt in or
 * out of. This is a one-time notice, not a consent form. If an optional cookie
 * is ever added, this must become a real consent choice again.
 */

const STORAGE_KEY = 'salestaxjar_cookie_consent';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode) — just show the notice.
    }
    if (!seen) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ necessary: true, acknowledgedAt: new Date().toISOString(), version: '2.0' })
      );
    } catch {
      // Ignore — the notice will simply show again next visit.
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" role="region" aria-label="Cookie notice">
      <div className="max-w-3xl mx-auto">
        <div className="card-theme border border-theme-secondary rounded-2xl p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <p className="flex-1 text-theme-secondary text-sm">
              Sails uses one cookie to keep you signed in. No tracking, no ads.{' '}
              <Link href="/cookies" className="text-theme-accent hover:opacity-80 whitespace-nowrap">
                Cookie policy
              </Link>
            </p>
            <button
              onClick={dismiss}
              className="px-5 py-2 btn-theme-primary rounded-lg font-medium transition text-sm whitespace-nowrap"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
