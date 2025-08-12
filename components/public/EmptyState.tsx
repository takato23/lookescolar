'use client'

import React from 'react'
import { CameraOffIcon } from 'lucide-react'

export function EmptyState({ message = 'No hay fotos disponibles aún.' }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <CameraOffIcon className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>
        <p className="text-gray-600">
          El fotógrafo está procesando las imágenes. Volvé a revisar más tarde.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Tus fotos están seguras y privadas. Solo vos podés acceder con tu código único.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 rounded-lg bg-purple-600 px-6 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
        >
          Actualizar página
        </button>
      </div>
    </div>
  )
}


