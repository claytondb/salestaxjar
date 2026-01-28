'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SailsLogo from './SailsLogo';

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  if (user) {
    // Logged in header
    return (
      <header className="bg-slate-900 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <SailsLogo className="w-9 h-9 text-emerald-400" />
                <span className="text-xl font-bold text-white hidden sm:inline">Sails</span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-1">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/calculator" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  Calculator
                </Link>
                <Link 
                  href="/nexus" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  Nexus
                </Link>
                <Link 
                  href="/filings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  Filings
                </Link>
                <Link 
                  href="/settings" 
                  className={`px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <span className="text-emerald-400 font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden lg:inline">{user.email}</span>
              </div>
              <button 
                onClick={logout}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-gray-400 hover:text-white"
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
            <nav className="md:hidden mt-4 pb-2 border-t border-white/10 pt-4 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/dashboard') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/calculator" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/calculator') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculator
              </Link>
              <Link 
                href="/nexus" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/nexus') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Nexus
              </Link>
              <Link 
                href="/filings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/filings') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Filings
              </Link>
              <Link 
                href="/settings" 
                className={`block px-4 py-2 rounded-lg transition ${isActive('/settings') ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
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
    <header className="border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <SailsLogo className="w-10 h-10 text-emerald-400" />
            <span className="text-2xl font-bold text-white">Sails</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/#features" className="text-gray-300 hover:text-white transition">Features</Link>
            <Link href="/#pricing" className="text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="/#calculator" className="text-gray-300 hover:text-white transition">Calculator</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="text-gray-300 hover:text-white px-4 py-2 transition">
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
