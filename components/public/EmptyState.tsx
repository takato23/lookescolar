'use client'

import React from 'react'
import { CameraIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({ message = 'No hay fotos disponibles aún.' }: { message?: string }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-cyan-500/10">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 shadow-2xl shadow-cyan-500/20">
            <CameraIcon className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            ¡Aún no hay fotos aquí!
          </h3>
          <p className="mx-auto max-w-md text-gray-600 text-lg leading-relaxed mb-6">{message}</p>
          <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-2xl p-6 mb-8">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Mientras esperas:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• El fotógrafo está procesando las imágenes</li>
              <li>• Las fotos aparecerán automáticamente cuando estén listas</li>
              <li>• Tus fotos están seguras y privadas</li>
              <li>• Solo vos podés acceder con tu código único</li>
            </ul>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 px-10 py-4 font-bold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:scale-110 hover:shadow-3xl hover:shadow-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex items-center gap-3">
              <RefreshCwIcon className="h-5 w-5" />
              <span>Actualizar página</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}


