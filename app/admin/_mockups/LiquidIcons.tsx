'use client';
import * as React from 'react';

interface LiquidIconProps {
  size?: number;
  className?: string;
}

// Dashboard Icon - Profesional con gráficos + cámara (cyan con estrellas)
export function DashboardIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Fondo circular cyan */}
        <circle cx="50" cy="50" r="50" fill="url(#dashboardBg)" />
        
        {/* Estrellas decorativas */}
        <path d="M25 35 L27 41 L33 41 L28 45 L30 51 L25 47 L20 51 L22 45 L17 41 L23 41 Z" fill="#000" opacity="0.3" />
        <path d="M75 25 L77 31 L83 31 L78 35 L80 41 L75 37 L70 41 L72 35 L67 31 L73 31 Z" fill="#000" opacity="0.3" />
        <circle cx="20" cy="70" r="2" fill="#000" opacity="0.3" />
        <circle cx="80" cy="65" r="2" fill="#000" opacity="0.3" />
        <path d="M70 75 L71 77 L73 77 L71.5 78.5 L72 81 L70 79.5 L68 81 L68.5 78.5 L67 77 L69 77 Z" fill="#000" opacity="0.3" />
        
        {/* Gráficos de barras */}
        <rect x="25" y="45" width="6" height="15" rx="3" fill="#000" stroke="#000" strokeWidth="2" />
        <rect x="35" y="35" width="6" height="25" rx="3" fill="#000" stroke="#000" strokeWidth="2" />
        <rect x="45" y="40" width="6" height="20" rx="3" fill="#000" stroke="#000" strokeWidth="2" />
        
        {/* Base de gráficos */}
        <rect x="22" y="60" width="32" height="3" rx="1.5" fill="#000" opacity="0.3" />
        
        {/* Cámara */}
        <rect x="60" y="45" width="20" height="15" rx="3" fill="none" stroke="#000" strokeWidth="3" />
        <rect x="65" y="40" width="10" height="5" rx="2" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="70" cy="52.5" r="5" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="70" cy="52.5" r="2" fill="#000" />
        
        <defs>
          <linearGradient id="dashboardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Eventos Icon - Calendario profesional con cámara (púrpura elegante)
export function EventsIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Fondo circular púrpura */}
        <circle cx="50" cy="50" r="50" fill="url(#eventsBg)" />
        
        {/* Calendario principal */}
        <rect x="25" y="30" width="35" height="45" rx="5" fill="none" stroke="#000" strokeWidth="3" />
        
        {/* Header del calendario */}
        <rect x="25" y="30" width="35" height="12" rx="5" fill="#000" opacity="0.1" />
        
        {/* Anillas del calendario */}
        <ellipse cx="35" cy="25" rx="3" ry="6" fill="#000" opacity="0.8" />
        <ellipse cx="50" cy="25" rx="3" ry="6" fill="#000" opacity="0.8" />
        
        {/* Contenido del calendario - día */}
        <rect x="30" y="45" width="8" height="6" rx="2" fill="#000" opacity="0.3" />
        <circle cx="35" cy="60" r="1.5" fill="#000" opacity="0.6" />
        
        {/* Cámara superpuesta */}
        <rect x="50" y="50" width="25" height="18" rx="4" fill="none" stroke="#000" strokeWidth="3" />
        <rect x="55" y="45" width="15" height="8" rx="3" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="62.5" cy="59" r="6" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="62.5" cy="59" r="3" fill="#000" />
        
        <defs>
          <linearGradient id="eventsBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Carpetas Icon - Calendario profesional con cámara y estrellas doradas
export function FoldersIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Fondo circular púrpura */}
        <circle cx="50" cy="50" r="50" fill="url(#foldersBg)" />
        
        {/* Estrellas doradas decorativas */}
        <path d="M20 25 L21.5 28 L25 28 L22.25 30.25 L23.75 33.5 L20 31.25 L16.25 33.5 L17.75 30.25 L15 28 L18.5 28 Z" fill="#fbbf24" />
        <path d="M80 70 L81.5 73 L85 73 L82.25 75.25 L83.75 78.5 L80 76.25 L76.25 78.5 L77.75 75.25 L75 73 L78.5 73 Z" fill="#fbbf24" />
        
        {/* Calendario principal */}
        <rect x="20" y="30" width="40" height="50" rx="6" fill="none" stroke="#000" strokeWidth="3" />
        
        {/* Header del calendario */}
        <rect x="20" y="30" width="40" height="15" rx="6" fill="#000" opacity="0.1" />
        
        {/* Anillas del calendario - blancas */}
        <ellipse cx="30" cy="25" rx="4" ry="8" fill="#fff" stroke="#000" strokeWidth="2" />
        <ellipse cx="50" cy="25" rx="4" ry="8" fill="#fff" stroke="#000" strokeWidth="2" />
        
        {/* Contenido del calendario */}
        <circle cx="30" cy="60" r="3" fill="#000" opacity="0.3" />
        <circle cx="40" cy="55" r="2" fill="#000" opacity="0.4" />
        
        {/* Cámara superpuesta */}
        <rect x="45" y="55" width="30" height="22" rx="5" fill="none" stroke="#000" strokeWidth="3" />
        <rect x="52" y="48" width="16" height="10" rx="4" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="60" cy="66" r="7" fill="none" stroke="#000" strokeWidth="3" />
        <circle cx="60" cy="66" r="3" fill="#000" />
        <circle cx="68" cy="60" r="1.5" fill="#000" />
        
        <defs>
          <linearGradient id="foldersBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default { DashboardIcon, EventsIcon, FoldersIcon };
