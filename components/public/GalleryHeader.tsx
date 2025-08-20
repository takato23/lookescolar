'use client'

import { useState } from 'react'
import { Star, ShoppingCart, Menu, Search, Calendar, Users, Camera } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EventData {
  id: string
  name: string
  school: string
  date: string
  status: string
  created_at: string
}

interface GalleryHeaderProps {
  event: EventData
  photoCount: number
  formattedDate: string
}

export function GalleryHeader({ event, photoCount, formattedDate }: GalleryHeaderProps) {
  const { getTotalItems, openCart } = useCartStore()
  const [searchTerm, setSearchTerm] = useState('')
  const totalItems = getTotalItems()

  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-white/30 sticky top-0 z-40 shadow-xl shadow-cyan-500/5">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Logo y título - Diseño liquid-glass mejorado */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative bg-gradient-to-br from-cyan-400 to-purple-500 p-3 rounded-2xl shadow-xl">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-br from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                  LookEscolar
                </h1>
                <p className="text-sm text-gray-600 font-medium">Fotografía Escolar Profesional</p>
              </div>
            </div>
          </div>

          {/* Info del evento - Diseño liquid-glass mejorado */}
          <div className="hidden md:flex flex-col items-center text-center">
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-6 py-4 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {event.name}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{event.school}</span>
                </div>
                <div className="flex items-center gap-1 text-cyan-600">
                  <Camera className="h-4 w-4" />
                  <span className="font-semibold">{photoCount} fotos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Búsqueda y carrito - Diseño liquid-glass mejorado */}
          <div className="flex items-center space-x-4">
            {/* Búsqueda */}
            <div className="hidden sm:flex relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o código"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-72 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 focus:border-cyan-400 focus:ring-cyan-400 focus:bg-white/80 transition-all duration-300 shadow-lg"
                  aria-label="Buscar fotos por nombre o código"
                />
              </div>
            </div>

            {/* Selector */}
            <select 
              className="px-6 py-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 text-sm focus:border-cyan-400 focus:ring-cyan-400 focus:bg-white/80 transition-all duration-300 shadow-lg font-medium"
              aria-label="Selector de opciones"
            >
              <option>Todos los sectores</option>
              <option>Jardín</option>
              <option>Primaria</option>
              <option>Secundaria</option>
            </select>

            {/* Botón del carrito - Diseño liquid-glass mejorado */}
            <Button
              onClick={openCart}
              variant="outline"
              size="lg"
              className="relative p-4 bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 hover:scale-105 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl group"
              aria-label={`Abrir carrito con ${totalItems} elementos`}
            >
              <ShoppingCart className="h-6 w-6 text-gray-700 group-hover:text-cyan-600 transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-3 -right-3 h-8 w-8 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/25 animate-pulse">
                  {totalItems}
                </span>
              )}
            </Button>

            {/* Menú móvil - Diseño liquid-glass mejorado */}
            <Button
              variant="ghost"
              size="lg"
              className="md:hidden p-3 bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 hover:scale-105 rounded-2xl transition-all duration-300 shadow-lg"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Info del evento en móvil - Diseño liquid-glass mejorado */}
        <div className="md:hidden mt-6">
          <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-6 shadow-lg text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {event.name}
            </h2>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{event.school}</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-600">
                <Camera className="h-4 w-4" />
                <span className="font-semibold">{photoCount} fotos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda en móvil - Diseño liquid-glass mejorado */}
        <div className="sm:hidden mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o código"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-4 w-full rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 focus:border-cyan-400 focus:ring-cyan-400 focus:bg-white/80 transition-all duration-300 shadow-lg"
              aria-label="Buscar fotos por nombre o código"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
