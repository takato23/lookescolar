'use client';

import { useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { ShoppingSection } from './ShoppingSection';

interface MobileShoppingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  photos: Array<{ id: string; filename: string; preview_url: string }>;
}

export function MobileShoppingDrawer({ isOpen, onClose, token, photos }: MobileShoppingDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div 
          className={`w-screen max-w-md transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 shadow-xl">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-sm px-4 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Opciones de Compra
                </h2>
                <button
                  type="button"
                  className="rounded-full bg-gray-100 p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  onClick={onClose}
                >
                  <span className="sr-only">Cerrar</span>
                  <XIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <ShoppingSection 
                token={token}
                photos={photos}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}