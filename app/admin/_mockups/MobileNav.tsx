'use client';

import React from 'react';
import { MenuIcon, SearchIcon, BellIcon, SunIcon, MoonIcon } from './icons';
import { useTheme } from './ThemeContext';

interface MobileNavProps {
  title?: string;
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  title = "LookEscolar", 
  className = "" 
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`
      ${theme === 'dark' 
        ? 'bg-gray-900/90 border-gray-700/50' 
        : 'bg-white/90 border-gray-200/50'
      } 
      backdrop-blur-md border-b transition-colors
      ${className}
    `}>
      <nav className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        {/* Left side - Menu */}
        <button 
          className={`p-2 -m-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            theme === 'dark' 
              ? 'hover:bg-white/10 text-gray-200' 
              : 'hover:bg-black/10 text-gray-800'
          }`}
          aria-label="Abrir menú"
        >
          <MenuIcon size={20} />
        </button>

        {/* Center - Brand */}
        <div className="flex-1 text-center">
          <h1 className={`text-lg font-semibold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-1">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className={`p-2 -m-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              theme === 'dark' 
                ? 'hover:bg-white/10 text-yellow-400 hover:text-yellow-300' 
                : 'hover:bg-black/10 text-gray-600 hover:text-gray-800'
            }`}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          {/* Search - Hidden on mobile, visible on desktop */}
          <button 
            className={`p-2 -m-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 hidden sm:block ${
              theme === 'dark' 
                ? 'hover:bg-white/10 text-gray-300' 
                : 'hover:bg-black/10 text-gray-600'
            }`}
            aria-label="Buscar"
          >
            <SearchIcon size={18} />
          </button>

          {/* Notifications */}
          <button 
            className={`p-2 -m-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 relative ${
              theme === 'dark' 
                ? 'hover:bg-white/10 text-gray-300' 
                : 'hover:bg-black/10 text-gray-600'
            }`}
            aria-label="Notificaciones"
          >
            <BellIcon size={18} />
            {/* Notification badge */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>
          </button>
        </div>
      </nav>
    </div>
  );
};