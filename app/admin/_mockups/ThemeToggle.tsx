'use client';
import * as React from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ isDark, onToggle, className = '' }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-12 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 group ${className}`}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #7c3aed 75%, #a855f7 100%)'
          : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 25%, #6366f1 50%, #8b5cf6 75%, #a855f7 100%)',
        boxShadow: isDark
          ? `
            0 8px 32px rgba(168, 85, 247, 0.25),
            0 4px 16px rgba(124, 58, 237, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `
          : `
            0 8px 32px rgba(59, 130, 246, 0.25),
            0 4px 16px rgba(99, 102, 241, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1)
          `,
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {/* Liquid Glass Overlay */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
        }}
      />

      {/* Icon Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        
        {/* Sun Icon */}
        <div 
          className={`absolute transition-all duration-500 ${
            isDark 
              ? 'opacity-0 scale-50 rotate-180' 
              : 'opacity-100 scale-100 rotate-0'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {/* Sun Center */}
            <circle 
              cx="12" 
              cy="12" 
              r="4" 
              fill="url(#sunGradient)"
              className="drop-shadow-sm"
            />
            
            {/* Sun Rays */}
            <g stroke="url(#sunRayGradient)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m11.31 11.31l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M17.66 6.34l1.42-1.42" />
            </g>
            
            <defs>
              <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="sunRayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Moon Icon */}
        <div 
          className={`absolute transition-all duration-500 ${
            isDark 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-50 rotate-180'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {/* Moon Shape */}
            <path 
              d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" 
              fill="url(#moonGradient)"
              className="drop-shadow-sm"
            />
            
            {/* Stars */}
            <circle cx="17" cy="7" r="0.5" fill="#e2e8f0" opacity="0.8" />
            <circle cx="19" cy="9" r="0.3" fill="#f1f5f9" opacity="0.6" />
            <circle cx="20" cy="6" r="0.4" fill="#cbd5e1" opacity="0.7" />
            
            <defs>
              <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ambient Glow Effect */}
        <div 
          className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
            isDark ? 'opacity-30' : 'opacity-20'
          }`}
          style={{
            background: isDark
              ? 'radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />
      </div>

      {/* Hover Ring Effect */}
      <div className="absolute inset-0 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Active Press Effect */}
      <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-active:opacity-100 transition-opacity duration-75" />
    </button>
  );
}

export default ThemeToggle;
