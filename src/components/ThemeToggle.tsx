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
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 w-[88px] h-[32px]" />
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
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 group
        bg-white/10 hover:bg-white/20"
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
      <div className="relative w-8 h-4 rounded-full bg-white/20 transition-colors">
        {/* Toggle knob */}
        <div 
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 shadow-sm"
          style={{
            transform: isNautical ? 'translateX(18px)' : 'translateX(2px)',
            backgroundColor: 'var(--accent-primary)'
          }}
        />
      </div>

      {/* Anchor icon (nautical theme) */}
      <span className={`transition-all duration-300 ${isNautical ? 'opacity-100 scale-100' : 'opacity-40 scale-90'}`}>
        <svg className="w-4 h-4" style={{ color: isNautical ? 'var(--accent-primary)' : 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM12 8a2 2 0 100-4 2 2 0 000 4zM12 8v14M5 12h2m10 0h2M7 19a5 5 0 0110 0" />
        </svg>
      </span>
    </button>
  );
}
