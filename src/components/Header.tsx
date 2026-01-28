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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">$</span>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white hidden sm:inline">SalesTaxJar</span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-1">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/calculator" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Calculator
                </Link>
                <Link 
                  href="/nexus" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Nexus
                </Link>
                <Link 
                  href="/filings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Filings
                </Link>
                <Link 
                  href="/settings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden lg:inline">{user.email}</span>
              </div>
              <button 
                onClick={logout}
                className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition text-sm"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
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
            <nav className="md:hidden mt-4 pb-2 border-t border-slate-200 dark:border-white/10 pt-4 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/calculator" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculator
              </Link>
              <Link 
                href="/nexus" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Nexus
              </Link>
              <Link 
                href="/filings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Filings
              </Link>
              <Link 
                href="/settings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
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
    <header className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">$</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">SalesTaxJar</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/#features" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Features</Link>
            <Link href="/pricing" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Pricing</Link>
            <Link href="/#calculator" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition">Calculator</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition">
              Log in
            </Link>
            <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
