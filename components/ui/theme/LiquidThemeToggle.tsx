'use client';
import * as React from 'react';
import { useTheme } from '@/components/providers/theme-provider';

interface LiquidThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiquidThemeToggle({
  className = '',
  size = 'md',
}: LiquidThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #c084fc 0%, #f472b6 50%, #ec4899 100%)' // Rosa suave para modo oscuro
          : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 40%, #8b5cf6 100%)', // Cyan a púrpura para modo claro
        boxShadow: `
          0 20px 40px rgba(0, 0, 0, 0.15),
          0 8px 16px rgba(0, 0, 0, 0.1),
          inset 0 2px 4px rgba(255, 255, 255, 0.3),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1)
        `,
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {/* Liquid Glass Shine Effect */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 70%)',
        }}
      />

      {/* Icon Container */}
      <div
        className={`relative flex h-full w-full items-center justify-center ${iconSizeClasses[size]}`}
      >
        {/* Sol - Modo Día */}
        <span
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'rotate-90 scale-75 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        >
          ☀️
        </span>

        {/* Luna - Modo Noche */}
        <span
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-75 opacity-0'
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

export default LiquidThemeToggle;
