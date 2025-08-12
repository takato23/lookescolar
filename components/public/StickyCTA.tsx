'use client'

import React from 'react'
import { ShoppingCartIcon, PackageIcon } from 'lucide-react'

interface StickyCTAProps {
  selectedCount: number
  pkg: string
  setPkg: (v: string) => void
  onContinue: () => void
  disabled: boolean
  priceText?: string
}

export function StickyCTA({ selectedCount, pkg, setPkg, onContinue, disabled, priceText }: StickyCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selection counter */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 rounded-full bg-purple-100 px-4 py-2">
              <ShoppingCartIcon className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-900">
                {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'} seleccionada{selectedCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          
          {/* Package selection and continue */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
              <PackageIcon className="h-5 w-5 text-gray-600 hidden sm:block" />
              <select
                aria-label="Elegí tu paquete"
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
              >
                <option value="">Elegí tu paquete</option>
                <option value="Combo A">Combo A - $1,000</option>
                <option value="Combo B">Combo B - $1,800</option>
                <option value="Solo Digital">Solo Digital - $500</option>
              </select>
            </div>
            
            <button
              onClick={onContinue}
              disabled={disabled}
              aria-disabled={disabled}
              className={`
                rounded-lg px-6 py-2.5 font-semibold shadow-lg transition-all transform
                ${disabled 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:scale-105 active:scale-95'
                }
              `}
            >
              {disabled && !pkg ? 'Elegí un paquete' : disabled && selectedCount === 0 ? 'Seleccioná fotos' : 'Continuar'}
            </button>
          </div>
        </div>
        
        {/* Price display for mobile */}
        {priceText && (
          <div className="mt-3 text-center sm:hidden">
            <span className="text-sm text-gray-600">Precio estimado: </span>
            <span className="font-semibold text-gray-900">{priceText}</span>
          </div>
        )}
      </div>
    </div>
  )
}


