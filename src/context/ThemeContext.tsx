'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'default' | 'nautical';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('default');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sails-theme') as ThemeName | null;
    if (saved && (saved === 'default' || saved === 'nautical')) {
      setThemeState(saved);
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;
    
    document.documentElement.classList.remove('theme-default', 'theme-nautical');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('sails-theme', theme);
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'default' ? 'nautical' : 'default');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a safe default for SSR/SSG
    return {
      theme: 'default' as ThemeName,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
