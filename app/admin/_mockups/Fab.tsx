'use client';

import React from 'react';
import { PlusIcon, CheckIcon } from './icons';

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

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300/50 ${
        hasSelection 
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
      } ${className}`}
      aria-label={hasSelection ? `Procesar ${selectedCount} foto${selectedCount === 1 ? '' : 's'} seleccionada${selectedCount === 1 ? '' : 's'}` : "Agregar nueva foto"}
    >
      <div className="flex items-center justify-center text-white">
        {hasSelection ? (
          <div className="flex flex-col items-center justify-center">
            <CheckIcon size={18} />
            {selectedCount > 0 && (
              <span className="text-xs font-bold leading-none mt-0.5">
                {selectedCount > 99 ? '99+' : selectedCount}
              </span>
            )}
          </div>
        ) : (
          <PlusIcon size={20} />
        )}
      </div>

      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 transition-opacity duration-150 rounded-full"></div>
      </div>
    </button>
  );
};