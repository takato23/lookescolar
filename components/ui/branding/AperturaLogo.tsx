'use client';

import * as React from 'react';

interface AperturaLogoProps {
  variant?: 'default' | 'white' | 'dark' | 'gold' | 'minimal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animated?: boolean;
  showText?: boolean;
}

/**
 * Apertura Logo - White-label platform logo
 *
 * Premium camera aperture/iris design representing photography distribution.
 * Features 7-blade aperture with cyan glow center and gold accents.
 * This is the default logo for the platform, can be replaced by tenant custom logos.
 */
export function AperturaLogo({
  variant = 'default',
  size = 'md',
  className = '',
  animated = false,
  showText = false,
}: AperturaLogoProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const getColors = () => {
    switch (variant) {
      case 'white':
        return {
          background: '#ffffff',
          blades: '#e2e8f0',
          bladesStroke: '#cbd5e1',
          ring: '#f1f5f9',
          ringStroke: '#e2e8f0',
          center: '#f8fafc',
          centerGlow: '#ffffff',
          highlight: '#ffffff',
          text: '#64748b',
        };
      case 'dark':
        return {
          background: '#0a0a12',
          blades: '#1a1a2e',
          bladesStroke: '#16213e',
          ring: '#c9956c',
          ringStroke: '#d4a574',
          center: '#00d4ff',
          centerGlow: '#0088cc',
          highlight: '#ffffff',
          text: '#c9956c',
        };
      case 'gold':
        return {
          background: 'transparent',
          blades: '#c9956c',
          bladesStroke: '#d4a574',
          ring: '#d4a574',
          ringStroke: '#e0b896',
          center: '#ffffff',
          centerGlow: '#f5e6d3',
          highlight: '#ffffff',
          text: '#c9956c',
        };
      case 'minimal':
        return {
          background: 'transparent',
          blades: 'currentColor',
          bladesStroke: 'currentColor',
          ring: 'currentColor',
          ringStroke: 'currentColor',
          center: 'currentColor',
          centerGlow: 'currentColor',
          highlight: 'currentColor',
          text: 'currentColor',
        };
      default:
        // Premium dark theme with cyan glow (matches landing page)
        return {
          background: '#0a0a12',
          blades: '#1a1a2e',
          bladesStroke: '#16213e',
          ring: '#c9956c',
          ringStroke: '#d4a574',
          center: '#00d4ff',
          centerGlow: '#0088cc',
          highlight: '#ffffff',
          text: '#c9956c',
        };
    }
  };

  const colors = getColors();
  const uniqueId = React.useId();

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          className={`h-full w-full ${animated ? 'animate-[spin_20s_linear_infinite]' : ''}`}
          aria-label="Apertura - Distribución de Fotografía"
        >
          <defs>
            {/* Blade gradient */}
            <linearGradient id={`blade-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.blades} />
              <stop offset="50%" stopColor={colors.bladesStroke} />
              <stop offset="100%" stopColor={colors.blades} stopOpacity="0.9" />
            </linearGradient>

            {/* Gold ring gradient */}
            <linearGradient id={`gold-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.ringStroke} />
              <stop offset="50%" stopColor={colors.ring} />
              <stop offset="100%" stopColor={colors.ringStroke} />
            </linearGradient>

            {/* Center glow gradient */}
            <radialGradient id={`glow-${uniqueId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.center} stopOpacity="0.9" />
              <stop offset="60%" stopColor={colors.centerGlow} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.centerGlow} stopOpacity="0" />
            </radialGradient>

            {/* Soft glow filter */}
            <filter id={`softGlow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          {variant !== 'minimal' && variant !== 'gold' && (
            <circle cx="50" cy="50" r="48" fill={colors.background} />
          )}

          {/* Outer gold ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={`url(#gold-${uniqueId})`}
            strokeWidth="1.5"
          />

          {/* Inner ring accent */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={colors.ring}
            strokeWidth="0.5"
            opacity="0.5"
          />

          {/* 7 Aperture blades */}
          <g fill={`url(#blade-${uniqueId})`} filter={`url(#softGlow-${uniqueId})`}>
            {[0, 51.43, 102.86, 154.29, 205.71, 257.14, 308.57].map((angle, i) => (
              <path
                key={i}
                d="M50,12 Q65,22 68,35 Q62,43 50,38 Q42,32 45,20 Q48,14 50,12"
                transform={`rotate(${angle}, 50, 50)`}
                opacity={i % 2 === 0 ? 0.95 : 0.9}
              />
            ))}
          </g>

          {/* Blade edge highlights */}
          <g fill="none" stroke={colors.highlight} strokeWidth="0.3" opacity="0.3">
            {[0, 102.86, 205.71].map((angle, i) => (
              <path
                key={i}
                d="M50,15 Q60,25 58,32"
                transform={`rotate(${angle}, 50, 50)`}
              />
            ))}
          </g>

          {/* Center glow (aperture opening) */}
          <circle cx="50" cy="50" r="14" fill={`url(#glow-${uniqueId})`} />

          {/* Center core */}
          <circle cx="50" cy="50" r="6" fill={colors.center} opacity="0.8" />
          <circle cx="50" cy="50" r="3" fill={colors.highlight} opacity="0.9" />

          {/* Lens reflection highlights */}
          <circle cx="44" cy="44" r="2" fill={colors.highlight} opacity="0.7" />
          <circle cx="42" cy="46" r="1" fill={colors.highlight} opacity="0.4" />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-light tracking-[0.25em] uppercase ${textSizes[size]}`}
          style={{ color: colors.text }}
        >
          apertura
        </span>
      )}
    </div>
  );
}

export default AperturaLogo;
