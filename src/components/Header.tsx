'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  if (user) {
    // Logged in header
    return (
      <header className="bg-[var(--color-header-bg)] border-b border-[var(--color-header-border)] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[var(--color-logo-from)] to-[var(--color-logo-to)] rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">$</span>
                </div>
                <span className="text-xl font-bold text-[var(--color-text)] hidden sm:inline">SalesTaxJar</span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-1">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg transition font-medium ${isActive('/dashboard') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/calculator" 
                  className={`px-4 py-2 rounded-lg transition font-medium ${isActive('/calculator') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                >
                  Calculator
                </Link>
                <Link 
                  href="/nexus" 
                  className={`px-4 py-2 rounded-lg transition font-medium ${isActive('/nexus') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                >
                  Nexus
                </Link>
                <Link 
                  href="/filings" 
                  className={`px-4 py-2 rounded-lg transition font-medium ${isActive('/filings') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                >
                  Filings
                </Link>
                <Link 
                  href="/settings" 
                  className={`px-4 py-2 rounded-lg transition font-medium ${isActive('/settings') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                >
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <div className="w-8 h-8 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center">
                  <span className="text-[var(--color-primary)] font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden lg:inline">{user.email}</span>
              </div>
              <button 
                onClick={logout}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition text-sm"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
            <nav className="md:hidden mt-4 pb-2 border-t border-[var(--color-border)] pt-4 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/calculator" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculator
              </Link>
              <Link 
                href="/nexus" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Nexus
              </Link>
              <Link 
                href="/filings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Filings
              </Link>
              <Link 
                href="/settings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
            </nav>
          )}
        </div>
      </header>
    );
  }

  // Logged out header
  return (
    <header className="border-b border-[var(--color-header-border)] bg-[var(--color-header-bg)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-logo-from)] to-[var(--color-logo-to)] rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">$</span>
            </div>
            <span className="text-2xl font-bold text-[var(--color-text)]">SalesTaxJar</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/#features" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">Features</Link>
            <Link href="/pricing" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">Pricing</Link>
            <Link href="/#calculator" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">Calculator</Link>
          </nav>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <Link href="/login" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-4 py-2 transition">
              Log in
            </Link>
            <Link href="/signup" className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-4 py-2 rounded-lg font-medium transition shadow-md hover:shadow-lg">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
