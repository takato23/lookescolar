'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Check, Star } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface PhotoCardProps {
  photo: {
    id: string
    signed_url: string
  }
  price?: number
  onOpenModal?: (photoId: string) => void
}

// Gradientes coloridos para las cards
const gradients = [
  'from-orange-400 via-yellow-300 to-orange-500',
  'from-cyan-400 via-teal-300 to-blue-500', 
  'from-blue-400 via-purple-300 to-indigo-500',
  'from-pink-400 via-rose-300 to-red-500',
  'from-green-400 via-emerald-300 to-teal-500',
  'from-purple-400 via-pink-300 to-rose-500'
]

export function PhotoCard({ photo, price = 1000, onOpenModal }: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const { addItem, removeItem, isItemInCart, getItemQuantity } = useCartStore()
  
  const isSelected = isItemInCart(photo.id)
  const quantity = getItemQuantity(photo.id)
  
  // Seleccionar gradiente basado en el ID de la foto
  const gradientIndex = parseInt(photo.id.slice(-1), 16) % gradients.length
  const gradient = gradients[gradientIndex]

  const handleToggleSelect = () => {
    if (isSelected) {
      removeItem(photo.id)
    } else {
      addItem(photo.id, price)
    }
  }

  const handleImageClick = () => {
    onOpenModal?.(photo.id)
  }

  // Detectar si es una URL firmada de Supabase (contiene token)
  const isSignedUrl = photo.signed_url.includes('token=')

  return (
    <div className="group relative">
      <div 
        className={`
          relative aspect-square rounded-2xl overflow-hidden shadow-lg
          bg-gradient-to-br ${gradient}
          transition-all duration-300 hover:scale-105 hover:shadow-xl
          ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}
        `}
      >
        {/* Imagen de fondo con overlay gradient */}
        <div className="absolute inset-0">
          <Image
            src={photo.signed_url}
            alt="Foto del evento"
            fill
            className={`
              object-cover transition-opacity duration-300
              ${imageLoaded ? 'opacity-80' : 'opacity-0'}
            `}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority
            unoptimized={isSignedUrl}
            onLoad={() => setImageLoaded(true)}
            onClick={handleImageClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleImageClick()
              }
            }}
            aria-label="Ver foto en tamaño completo"
          />
          
          {/* Overlay gradient para mejor legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        {/* Badge MUESTRA */}
        <div className="absolute top-3 left-3">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
            <span className="text-sm font-bold text-gray-700 flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span>MUESTRA</span>
            </span>
          </div>
        </div>

        {/* Botón de favorito */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/90 transition-colors"
          aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart 
            className={`h-4 w-4 transition-colors ${
              isLiked ? 'text-red-500 fill-current' : 'text-gray-600'
            }`} 
          />
        </button>

        {/* Contenido inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            {/* Checkbox y precio */}
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleToggleSelect}
                className="h-6 w-6 bg-white/90 border-2 border-gray-300 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                aria-label="Seleccionar para compra"
              />
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg">
                <span className="text-sm font-bold text-gray-900">MUESTRA</span>
              </div>
            </div>

            {/* Precio */}
            <div className="text-right">
              <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
                <p className="text-xs text-gray-600">Desde</p>
                <p className="text-lg font-bold text-gray-900">ARS {price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Indicador de cantidad si está seleccionada */}
          {quantity > 1 && (
            <div className="mt-2 flex justify-center">
              <div className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                {quantity} seleccionadas
              </div>
            </div>
          )}
        </div>

        {/* Overlay de selección */}
        {isSelected && (
          <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center">
            <div className="bg-yellow-400 p-3 rounded-full shadow-lg">
              <Check className="h-6 w-6 text-black" />
            </div>
          </div>
        )}

        {/* Loading placeholder si la imagen no ha cargado */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/80 text-6xl font-bold">MUESTRA</div>
          </div>
        )}
      </div>

      {/* Botón de selección rápida (solo visible en hover) */}
      <Button
        onClick={handleToggleSelect}
        variant={isSelected ? "default" : "secondary"}
        size="sm"
        className={`
          absolute -bottom-2 left-1/2 transform -translate-x-1/2 
          opacity-0 group-hover:opacity-100 transition-all duration-200
          shadow-lg z-10 text-xs font-bold
          ${isSelected 
            ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
            : 'bg-white text-gray-900 hover:bg-gray-50'
          }
        `}
        aria-label={isSelected ? 'Quitar selección' : 'Seleccionar foto'}
      >
        {isSelected ? 'Seleccionada' : 'Seleccionar'}
      </Button>
    </div>
  )
}