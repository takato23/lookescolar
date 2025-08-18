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
      className={`relative w-14 h-14 rounded-3xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #c084fc 0%, #f472b6 50%, #ec4899 100%)'  // Rosa suave como tu 3er icono
          : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 40%, #8b5cf6 100%)', // Cyan a púrpura como tu 1er icono
        boxShadow: `
          0 20px 40px rgba(0, 0, 0, 0.15),
          0 8px 16px rgba(0, 0, 0, 0.1),
          inset 0 2px 4px rgba(255, 255, 255, 0.3),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1)
        `,
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {/* Liquid Glass Shine Effect */}
      <div 
        className="absolute inset-0 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 70%)',
        }}
      />

      {/* Icon Container */}
      <div className="relative w-full h-full flex items-center justify-center text-2xl">
        {/* Sol - Modo Día */}
        <span 
          className={`absolute transition-all duration-300 ${
            isDark 
              ? 'opacity-0 scale-75 rotate-90' 
              : 'opacity-100 scale-100 rotate-0'
          }`}
        >
          ☀️
        </span>

        {/* Luna - Modo Noche */}
        <span 
          className={`absolute transition-all duration-300 ${
            isDark 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-75 rotate-90'
          }`}
        >
          🌙
        </span>
      </div>

      {/* Glow interno dinámico */}
      <div 
        className="absolute inset-2 rounded-2xl transition-all duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, rgba(244, 114, 182, 0.3) 0%, transparent 60%)'
            : 'radial-gradient(circle at center, rgba(6, 182, 212, 0.3) 0%, transparent 60%)',
          filter: 'blur(6px)',
        }}
      />
    </button>
  );
}

export default ThemeToggle;
