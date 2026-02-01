'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CookiePreferences {
  necessary: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: true,
};

export default function CookieConsent() {
  // Initialize preferences from localStorage if available
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    try {
      const consent = localStorage.getItem('salestaxjar_cookie_consent');
      if (consent) {
        return JSON.parse(consent);
      }
    } catch {
      // Ignore parse errors
    }
    return defaultPreferences;
  });
  
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('salestaxjar_cookie_consent');
    if (!consent) {
      // Small delay before showing banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const consentData = {
      ...prefs,
      consentDate: new Date().toISOString(),
      version: '1.0',
    };
    localStorage.setItem('salestaxjar_cookie_consent', JSON.stringify(consentData));
    setPreferences(prefs);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: true,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto">
        {showPreferences ? (
          // Detailed Preferences Panel
          <div className="card-theme border border-theme-secondary rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-theme-primary mb-4">Cookie Preferences</h3>
            <p className="text-theme-muted text-sm mb-6">
              We use cookies and similar technologies to enhance your experience. You can customize your preferences below.
            </p>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-theme-secondary/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-theme-primary">Necessary Cookies</span>
                    <span className="text-xs btn-theme-primary/20 text-theme-accent px-2 py-0.5 rounded">Always Active</span>
                  </div>
                  <p className="text-theme-muted text-sm mt-1">
                    Essential for the website to function. These cannot be disabled.
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-6 btn-theme-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-theme-secondary/20 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-theme-primary">Analytics Cookies</span>
                  <p className="text-theme-muted text-sm mt-1">
                    Help us understand how visitors interact with our website (anonymized).
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, analytics: !preferences.analytics })}
                  className={`ml-4 w-12 h-6 rounded-full relative transition ${
                    preferences.analytics ? 'btn-theme-primary' : 'bg-theme-secondary'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                    preferences.analytics ? 'right-1' : 'left-1'
                  }`}></div>
                </button>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-theme-secondary/20 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-theme-primary">Marketing Cookies</span>
                  <p className="text-theme-muted text-sm mt-1">
                    Used to deliver relevant advertisements and track campaign effectiveness.
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, marketing: !preferences.marketing })}
                  className={`ml-4 w-12 h-6 rounded-full relative transition ${
                    preferences.marketing ? 'btn-theme-primary' : 'bg-theme-secondary'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                    preferences.marketing ? 'right-1' : 'left-1'
                  }`}></div>
                </button>
              </div>

              {/* Preference Cookies */}
              <div className="flex items-start justify-between p-4 bg-theme-secondary/20 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-theme-primary">Preference Cookies</span>
                  <p className="text-theme-muted text-sm mt-1">
                    Remember your settings and preferences for a better experience.
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, preferences: !preferences.preferences })}
                  className={`ml-4 w-12 h-6 rounded-full relative transition ${
                    preferences.preferences ? 'btn-theme-primary' : 'bg-theme-secondary'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                    preferences.preferences ? 'right-1' : 'left-1'
                  }`}></div>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 text-theme-muted hover:text-theme-primary transition"
              >
                ← Back
              </button>
              <div className="flex-1"></div>
              <button
                onClick={acceptNecessary}
                className="px-6 py-2 border border-theme-secondary text-theme-primary rounded-lg hover:bg-theme-secondary/30 transition"
              >
                Necessary Only
              </button>
              <button
                onClick={saveCustom}
                className="px-6 py-2 btn-theme-primary  text-theme-primary rounded-lg font-medium transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        ) : (
          // Simple Banner
          <div className="card-theme border border-theme-secondary rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-theme-primary mb-1">🍪 We use cookies</h3>
                <p className="text-theme-muted text-sm">
                  We use cookies to enhance your browsing experience, analyze traffic, and personalize content. 
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies. 
                  <Link href="/cookies" className="text-theme-accent hover:opacity-80 ml-1">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition text-sm"
                >
                  Customize
                </button>
                <button
                  onClick={acceptNecessary}
                  className="px-6 py-2 border border-theme-secondary text-theme-primary rounded-lg hover:bg-theme-secondary/30 transition"
                >
                  Necessary Only
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2 btn-theme-primary  text-theme-primary rounded-lg font-medium transition"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
