'use client'

import { useState } from 'react'
import { Star, ShoppingCart, Menu, Search } from 'lucide-react'
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
    <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo y título */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Star className="h-8 w-8 text-cyan-500 fill-current" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LookEscolar</h1>
            </div>
          </div>

          {/* Info del evento */}
          <div className="hidden md:flex flex-col items-center text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Evento: {event.name}
            </h2>
            <p className="text-sm text-gray-600">{event.school}</p>
            <p className="text-xs text-gray-500">{photoCount} fotos disponibles</p>
          </div>

          {/* Búsqueda y carrito */}
          <div className="flex items-center space-x-4">
            {/* Búsqueda */}
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 rounded-full border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                aria-label="Buscar fotos por nombre o código"
              />
            </div>

            {/* Selector */}
            <select 
              className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm focus:border-cyan-400 focus:ring-cyan-400"
              aria-label="Selector de opciones"
            >
              <option>Sector</option>
              <option>Jardín</option>
              <option>Primaria</option>
              <option>Secundaria</option>
            </select>

            {/* Botón del carrito */}
            <Button
              onClick={openCart}
              variant="outline"
              size="sm"
              className="relative p-2 bg-white border-gray-200 hover:bg-gray-50 rounded-full"
              aria-label={`Abrir carrito con ${totalItems} elementos`}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {totalItems}
                </span>
              )}
            </Button>

            {/* Menú móvil */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Info del evento en móvil */}
        <div className="md:hidden mt-4 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Evento: {event.name}
          </h2>
          <p className="text-sm text-gray-600">{event.school}</p>
          <p className="text-xs text-gray-500">{photoCount} fotos disponibles</p>
        </div>

        {/* Búsqueda en móvil */}
        <div className="sm:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o código"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-full border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
              aria-label="Buscar fotos por nombre o código"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
