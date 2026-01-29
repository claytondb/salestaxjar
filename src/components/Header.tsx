'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SailsLogo from './SailsLogo';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  if (user) {
    // Logged in header
    return (
      <header className="header-theme sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <SailsLogo className="w-9 h-9 text-theme-accent" />
                <span className="text-xl font-bold text-theme-primary hidden sm:inline">Sails</span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-1">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'nav-active' : 'nav-inactive'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/calculator" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'nav-active' : 'nav-inactive'}`}
                >
                  Calculator
                </Link>
                <Link 
                  href="/nexus" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'nav-active' : 'nav-inactive'}`}
                >
                  Nexus
                </Link>
                <Link 
                  href="/filings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'nav-active' : 'nav-inactive'}`}
                >
                  Filings
                </Link>
                <Link 
                  href="/settings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'nav-active' : 'nav-inactive'}`}
                >
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Home link - back to marketing page */}
              <Link 
                href="/" 
                className="hidden sm:inline text-theme-muted hover:text-theme-primary transition text-sm"
                title="View marketing site"
              >
                Home
              </Link>
              
              <div className="hidden sm:flex items-center gap-2 text-sm text-theme-muted">
                <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center">
                  <span className="text-theme-accent font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden lg:inline">{user.email}</span>
              </div>
              <button 
                onClick={logout}
                className="text-theme-muted hover:text-theme-primary transition text-sm"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-theme-muted hover:text-theme-primary"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-2 border-t border-theme-primary pt-4 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'nav-active' : 'nav-inactive'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/calculator" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'nav-active' : 'nav-inactive'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculator
              </Link>
              <Link 
                href="/nexus" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'nav-active' : 'nav-inactive'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Nexus
              </Link>
              <Link 
                href="/filings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'nav-active' : 'nav-inactive'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Filings
              </Link>
              <Link 
                href="/settings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'nav-active' : 'nav-inactive'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="border-t border-theme-primary mt-2 pt-2">
                <Link 
                  href="/" 
                  className="block px-4 py-2 rounded-lg transition nav-inactive"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ← Back to Home
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>
    );
  }

  // Logged out header
  return (
    <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <SailsLogo className="w-10 h-10 text-theme-accent" />
            <span className="text-2xl font-bold text-theme-primary">Sails</span>
          </Link>
          <nav className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-theme-secondary hover:text-theme-primary transition">Features</a>
            <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">Pricing</Link>
            <a href="#calculator" className="text-theme-secondary hover:text-theme-primary transition">Calculator</a>
            <ThemeToggle />
          </nav>
          <div className="flex gap-3 items-center">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <Link href="/login" className="text-theme-secondary hover:text-theme-primary px-4 py-2 transition">
              Log in
            </Link>
            <Link href="/signup" className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
