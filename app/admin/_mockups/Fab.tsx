'use client';

import React from 'react';
import { PlusIcon, CheckIcon } from './icons';
import { useTheme } from './ThemeContext';

interface FabProps {
  onClick: () => void;
  selectedCount: number;
  className?: string;
}

export const Fab: React.FC<FabProps> = ({ 
  onClick, 
  selectedCount, 
  className = "" 
}) => {
  const hasSelection = selectedCount > 0;
  const { theme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full transform transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 group ${
        hasSelection 
          ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 shadow-2xl shadow-emerald-500/40 focus:ring-emerald-300/50' 
          : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-2xl shadow-blue-500/40 focus:ring-blue-300/50'
      } ${className}`}
      style={{
        boxShadow: `
          0 20px 25px -5px rgb(0 0 0 / 0.1),
          0 10px 10px -5px rgb(0 0 0 / 0.04),
          ${hasSelection 
            ? '0 0 0 1px rgb(16 185 129 / 0.2), 0 4px 20px rgb(16 185 129 / 0.3)' 
            : '0 0 0 1px rgb(59 130 246 / 0.2), 0 4px 20px rgb(59 130 246 / 0.3)'
          }
        `
      }}
      aria-label={hasSelection ? `Procesar ${selectedCount} foto${selectedCount === 1 ? '' : 's'} seleccionada${selectedCount === 1 ? '' : 's'}` : "Agregar nueva foto"}
    >
      {/* Animated background glow */}
      <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        hasSelection 
          ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30' 
          : 'bg-gradient-to-br from-blue-400/30 to-blue-600/30'
      } blur-md -z-10`} />

      <div className="flex items-center justify-center text-white relative z-10">
        {hasSelection ? (
          <div className="flex flex-col items-center justify-center animate-pulse">
            <CheckIcon size={20} className="drop-shadow-sm" />
            {selectedCount > 0 && (
              <span className="text-xs font-bold leading-none mt-1 bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {selectedCount > 99 ? '99+' : selectedCount}
              </span>
            )}
          </div>
        ) : (
          <PlusIcon size={22} className="drop-shadow-sm group-hover:rotate-90 transition-transform duration-300" />
        )}
      </div>

      {/* Enhanced ripple effect */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-30 transition-all duration-200 rounded-full transform group-active:scale-110"></div>
      </div>

      {/* Subtle inner glow */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-60 pointer-events-none" />
    </button>
  );
};