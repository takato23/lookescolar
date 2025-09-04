'use client';
import * as React from 'react';

interface LiquidIconProps {
  size?: number;
  className?: string;
}

// Dashboard Icon - Panel de control moderno con métricas y cámara
export function DashboardIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#dashboardGradient)" />

        {/* Gráficos de barras principales */}
        <rect x="4" y="12" width="2" height="4" rx="1" fill="white" opacity="0.9" />
        <rect x="7" y="10" width="2" height="6" rx="1" fill="white" opacity="0.9" />
        <rect x="10" y="8" width="2" height="8" rx="1" fill="white" opacity="0.9" />

        {/* Línea de tendencia */}
        <path
          d="M4 14 L7 12 L10 10 L13 11"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Ícono de cámara minimalista */}
        <rect
          x="14"
          y="6"
          width="6"
          height="4"
          rx="1"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <circle cx="17" cy="9" r="2.5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <circle cx="17" cy="9" r="1" fill="white" opacity="0.9" />

        <defs>
          <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Eventos Icon - Calendario moderno con cámara integrada
export function EventsIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#eventsGradient)" />

        {/* Calendario principal */}
        <rect
          x="3"
          y="6"
          width="10"
          height="10"
          rx="2"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Header del calendario */}
        <rect x="3" y="6" width="10" height="3" rx="2" fill="white" opacity="0.2" />

        {/* Anillas del calendario */}
        <circle cx="6" cy="4.5" r="0.8" fill="white" opacity="0.8" />
        <circle cx="9" cy="4.5" r="0.8" fill="white" opacity="0.8" />

        {/* Día en el calendario */}
        <circle cx="6" cy="12" r="1" fill="white" opacity="0.6" />

        {/* Ícono de cámara integrado */}
        <rect
          x="15"
          y="4"
          width="5"
          height="3.5"
          rx="0.8"
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          opacity="0.9"
        />
        <circle cx="17.5" cy="6.5" r="2" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="white" opacity="0.9" />

        <defs>
          <linearGradient id="eventsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Fotos Icon - Galería organizada con múltiples imágenes
export function FoldersIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#foldersGradient)" />

        {/* Carpeta principal */}
        <path
          d="M4 8 L4 16 L18 16 L18 10 L16 8 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Pestaña de la carpeta */}
        <path d="M16 8 L18 10 L18 8 Z" fill="white" opacity="0.3" />

        {/* Imágenes dentro de la carpeta */}
        <rect x="6" y="11" width="3" height="3" rx="0.5" fill="white" opacity="0.6" />
        <rect x="10" y="11" width="3" height="3" rx="0.5" fill="white" opacity="0.6" />
        <rect x="14" y="11" width="3" height="3" rx="0.5" fill="white" opacity="0.6" />

        {/* Miniaturas adicionales */}
        <rect x="6" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />
        <rect x="9" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />
        <rect x="12" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />
        <rect x="15" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />

        <defs>
          <linearGradient id="foldersGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Orders Icon - Carrito de compras con productos
export function OrdersIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#ordersGradient)" />

        {/* Carrito de compras */}
        <rect x="4" y="8" width="12" height="8" rx="1" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />

        {/* Ruedas del carrito */}
        <circle cx="6" cy="17" r="1.5" fill="white" opacity="0.8" />
        <circle cx="14" cy="17" r="1.5" fill="white" opacity="0.8" />

        {/* Mango del carrito */}
        <path d="M16 8 L18 10 L18 14" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />

        {/* Productos en el carrito */}
        <rect x="6" y="10" width="2" height="2" rx="0.3" fill="white" opacity="0.6" />
        <rect x="9" y="10" width="2" height="2" rx="0.3" fill="white" opacity="0.6" />
        <rect x="12" y="10" width="2" height="2" rx="0.3" fill="white" opacity="0.6" />

        <defs>
          <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// QR Icon - Código QR moderno
export function QrIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#qrGradient)" />

        {/* Patrón QR simplificado */}
        <rect x="4" y="4" width="6" height="6" rx="1" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <rect x="4" y="4" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="8" y="4" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="4" y="8" width="2" height="2" fill="white" opacity="0.8" />

        <rect x="14" y="4" width="6" height="6" rx="1" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <rect x="14" y="4" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="18" y="4" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="14" y="8" width="2" height="2" fill="white" opacity="0.8" />

        <rect x="4" y="14" width="6" height="6" rx="1" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <rect x="4" y="14" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="8" y="14" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="4" y="18" width="2" height="2" fill="white" opacity="0.8" />

        <rect x="14" y="14" width="6" height="6" rx="1" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <rect x="14" y="14" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="18" y="14" width="2" height="2" fill="white" opacity="0.8" />
        <rect x="14" y="18" width="2" height="2" fill="white" opacity="0.8" />

        <defs>
          <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Settings Icon - Engranajes modernos
export function SettingsIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        {/* Fondo con gradiente líquido */}
        <circle cx="12" cy="12" r="12" fill="url(#settingsGradient)" />

        {/* Engranaje principal */}
        <circle cx="12" cy="12" r="6" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.8" />

        {/* Dientes del engranaje */}
        <rect x="11" y="3" width="2" height="3" rx="1" fill="white" opacity="0.8" />
        <rect x="18" y="11" width="3" height="2" rx="1" fill="white" opacity="0.8" />
        <rect x="11" y="18" width="2" height="3" rx="1" fill="white" opacity="0.8" />
        <rect x="3" y="11" width="3" height="2" rx="1" fill="white" opacity="0.8" />

        {/* Dientes diagonales */}
        <rect x="16" y="6" width="2" height="2" rx="1" fill="white" opacity="0.6" transform="rotate(45 17 7)" />
        <rect x="16" y="16" width="2" height="2" rx="1" fill="white" opacity="0.6" transform="rotate(45 17 17)" />
        <rect x="6" y="16" width="2" height="2" rx="1" fill="white" opacity="0.6" transform="rotate(45 7 17)" />
        <rect x="6" y="6" width="2" height="2" rx="1" fill="white" opacity="0.6" transform="rotate(45 7 7)" />

        <defs>
          <linearGradient id="settingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default { DashboardIcon, EventsIcon, FoldersIcon, OrdersIcon, QrIcon, SettingsIcon };
