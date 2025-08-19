'use client';

import React from 'react';
import { MenuIcon, SearchIcon, BellIcon } from './icons';

interface MobileNavProps {
  title?: string;
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  title = "LookEscolar", 
  className = "" 
}) => {
  return (
    <nav className={`flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 ${className}`}>
      {/* Left side - Menu */}
      <button 
        className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Abrir menú"
      >
        <MenuIcon size={20} className="text-gray-700" />
      </button>

      {/* Center - Brand */}
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        <button 
          className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Buscar"
        >
          <SearchIcon size={20} className="text-gray-700" />
        </button>
        <button 
          className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
          aria-label="Notificaciones"
        >
          <BellIcon size={20} className="text-gray-700" />
          {/* Notification badge */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </nav>
  );
};