'use client';

import { useTheme } from '@/context/ThemeContext';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  
  // Only access theme after mounting (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/SSG, render a placeholder
  if (!mounted) {
    return (
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full w-[88px] h-[32px]" style={{ backgroundColor: 'var(--bg-card)' }} />
    );
  }

  return <ThemeToggleInner />;
}

function ThemeToggleInner() {
  const { theme, toggleTheme } = useTheme();
  const isNautical = theme === 'nautical';

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 group border"
      style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderColor: 'var(--border-secondary)' 
      }}
      aria-label={`Switch to ${isNautical ? 'default' : 'nautical'} theme`}
      title={`Switch to ${isNautical ? 'default' : 'nautical'} theme`}
    >
      {/* Moon icon (default theme) */}
      <span className={`transition-all duration-300 ${isNautical ? 'opacity-40 scale-90' : 'opacity-100 scale-100'}`}>
        <svg className="w-4 h-4" style={{ color: isNautical ? 'var(--text-muted)' : 'var(--accent-secondary)' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>

      {/* Toggle track */}
      <div className="relative w-8 h-4 rounded-full transition-colors" style={{ backgroundColor: 'var(--border-secondary)' }}>
        {/* Toggle knob */}
        <div 
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 shadow-sm"
          style={{
            transform: isNautical ? 'translateX(18px)' : 'translateX(2px)',
            backgroundColor: 'var(--accent-primary)'
          }}
        />
      </div>

      {/* Sun icon (nautical/light theme) */}
      <span className={`transition-all duration-300 ${isNautical ? 'opacity-100 scale-100' : 'opacity-40 scale-90'}`}>
        <svg className="w-4 h-4" style={{ color: isNautical ? 'var(--accent-primary)' : 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </span>
    </button>
  );
}
