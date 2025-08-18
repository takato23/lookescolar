'use client';
import * as React from 'react';

interface LiquidIconProps {
  size?: number;
  className?: string;
}

// Dashboard Icon - Gráficos con círculo (azul→púrpura)
export function DashboardIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Base Container */}
        <rect 
          x="10" y="20" width="80" height="70" rx="12" ry="12"
          fill="url(#dashboardBg)"
          stroke="url(#dashboardBorder)" 
          strokeWidth="2"
        />
        
        {/* Chart Bars */}
        <rect x="20" y="60" width="12" height="20" rx="6" fill="url(#bar1)" />
        <rect x="38" y="45" width="12" height="35" rx="6" fill="url(#bar2)" />
        <rect x="56" y="50" width="12" height="30" rx="6" fill="url(#bar3)" />
        
        {/* Analytics Circle */}
        <circle cx="75" cy="40" r="12" fill="url(#circleGrad)" stroke="url(#circleBorder)" strokeWidth="2" />
        <circle cx="75" cy="40" r="6" fill="url(#circleInner)" />
        
        {/* Shine Effect */}
        <ellipse cx="45" cy="35" rx="25" ry="15" fill="url(#shine)" opacity="0.3" />
        
        <defs>
          <linearGradient id="dashboardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="dashboardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="bar1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="bar2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="bar3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="circleBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="circleInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Eventos Icon - Calendario con foto (cyan→púrpura)
export function EventsIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Calendar Base */}
        <rect 
          x="15" y="25" width="70" height="65" rx="12" ry="12"
          fill="url(#calendarBg)"
          stroke="url(#calendarBorder)" 
          strokeWidth="2"
        />
        
        {/* Calendar Header */}
        <rect x="20" y="30" width="60" height="15" rx="8" fill="url(#calendarHeader)" />
        
        {/* Ring Holes */}
        <ellipse cx="30" cy="20" rx="4" ry="8" fill="url(#ringHole)" />
        <ellipse cx="70" cy="20" rx="4" ry="8" fill="url(#ringHole)" />
        
        {/* Golden Rings */}
        <ellipse cx="30" cy="20" rx="6" ry="10" fill="none" stroke="url(#goldRing)" strokeWidth="3" />
        <ellipse cx="70" cy="20" rx="6" ry="10" fill="none" stroke="url(#goldRing)" strokeWidth="3" />
        
        {/* Photo Container */}
        <rect x="25" y="50" width="50" height="30" rx="8" fill="url(#photoBg)" stroke="url(#photoBorder)" strokeWidth="1" />
        
        {/* Mountain Scene */}
        <polygon points="30,75 40,60 50,68 60,55 70,75" fill="url(#mountains)" />
        
        {/* Sun */}
        <circle cx="60" cy="60" r="4" fill="url(#sun)" />
        
        {/* Photo Shine */}
        <rect x="25" y="50" width="50" height="30" rx="8" fill="url(#photoShine)" opacity="0.2" />
        
        <defs>
          <linearGradient id="calendarBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="calendarBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="calendarHeader" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="ringHole" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="photoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="photoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="mountains" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="sun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="photoShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Carpetas Icon - Calendario estilo rosa/púrpura
export function FoldersIcon({ size = 24, className = '' }: LiquidIconProps) {
  return (
    <div className={`${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        {/* Calendar Base */}
        <rect 
          x="15" y="25" width="70" height="65" rx="12" ry="12"
          fill="url(#folderCalendarBg)"
          stroke="url(#folderCalendarBorder)" 
          strokeWidth="2"
        />
        
        {/* Calendar Header */}
        <rect x="20" y="30" width="60" height="15" rx="8" fill="url(#folderCalendarHeader)" />
        
        {/* Ring Holes */}
        <ellipse cx="30" cy="20" rx="4" ry="8" fill="url(#folderRingHole)" />
        <ellipse cx="70" cy="20" rx="4" ry="8" fill="url(#folderRingHole)" />
        
        {/* Emerald Rings */}
        <ellipse cx="30" cy="20" rx="6" ry="10" fill="none" stroke="url(#emeraldRing)" strokeWidth="3" />
        <ellipse cx="70" cy="20" rx="6" ry="10" fill="none" stroke="url(#emeraldRing)" strokeWidth="3" />
        
        {/* Photo Container */}
        <rect x="25" y="50" width="50" height="30" rx="8" fill="url(#folderPhotoBg)" stroke="url(#folderPhotoBorder)" strokeWidth="1" />
        
        {/* Mountain Scene */}
        <polygon points="30,75 40,60 50,68 60,55 70,75" fill="url(#folderMountains)" />
        
        {/* Sun */}
        <circle cx="60" cy="60" r="4" fill="url(#folderSun)" />
        
        {/* Photo Shine */}
        <rect x="25" y="50" width="50" height="30" rx="8" fill="url(#folderPhotoShine)" opacity="0.2" />
        
        <defs>
          <linearGradient id="folderCalendarBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="folderCalendarBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id="folderCalendarHeader" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>
          <linearGradient id="folderRingHole" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <linearGradient id="emeraldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="folderPhotoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="folderPhotoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="folderMountains" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="folderSun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="folderPhotoShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default { DashboardIcon, EventsIcon, FoldersIcon };
