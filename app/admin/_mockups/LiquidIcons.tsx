'use client';
import * as React from 'react';

interface LiquidIconProps {
  size?: number;
  className?: string;
}

// Dashboard Icon - Gráficos simples (azul→púrpura)
export function DashboardIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Base */}
        <rect x="3" y="6" width="18" height="12" rx="3" fill="#3b82f6" opacity="0.9" />
        
        {/* Chart Bars */}
        <rect x="6" y="12" width="2" height="4" rx="1" fill="#06b6d4" />
        <rect x="9" y="10" width="2" height="6" rx="1" fill="#3b82f6" />
        <rect x="12" y="8" width="2" height="8" rx="1" fill="#8b5cf6" />
        
        {/* Circle */}
        <circle cx="17" cy="9" r="2.5" fill="#a855f7" opacity="0.8" />
        <circle cx="17" cy="9" r="1" fill="#06b6d4" />
      </svg>
    </div>
  );
}

// Eventos Icon - Calendario simple (cyan→púrpura)
export function EventsIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Calendar Base */}
        <rect x="4" y="6" width="16" height="14" rx="3" fill="#06b6d4" opacity="0.9" />
        
        {/* Calendar Header */}
        <rect x="4" y="6" width="16" height="4" rx="3" fill="#22d3ee" />
        
        {/* Rings */}
        <circle cx="8" cy="4" r="1" fill="#fbbf24" />
        <circle cx="16" cy="4" r="1" fill="#fbbf24" />
        
        {/* Photo Area */}
        <rect x="6" y="12" width="12" height="6" rx="2" fill="#7dd3fc" opacity="0.8" />
        
        {/* Mountain + Sun */}
        <polygon points="8,16 10,14 12,15 14,13 16,16" fill="#10b981" />
        <circle cx="14" cy="14" r="1" fill="#fbbf24" />
      </svg>
    </div>
  );
}

// Carpetas Icon - Calendario rosa/púrpura
export function FoldersIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Calendar Base */}
        <rect x="4" y="6" width="16" height="14" rx="3" fill="#c084fc" opacity="0.9" />
        
        {/* Calendar Header */}
        <rect x="4" y="6" width="16" height="4" rx="3" fill="#f472b6" />
        
        {/* Rings */}
        <circle cx="8" cy="4" r="1" fill="#10b981" />
        <circle cx="16" cy="4" r="1" fill="#10b981" />
        
        {/* Photo Area */}
        <rect x="6" y="12" width="12" height="6" rx="2" fill="#a7f3d0" opacity="0.8" />
        
        {/* Mountain + Sun */}
        <polygon points="8,16 10,14 12,15 14,13 16,16" fill="#34d399" />
        <circle cx="14" cy="14" r="1" fill="#fbbf24" />
      </svg>
    </div>
  );
}

export default { DashboardIcon, EventsIcon, FoldersIcon };
