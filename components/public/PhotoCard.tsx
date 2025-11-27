'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Check, Star } from 'lucide-react'
import { usePublicCartStore } from '@/lib/stores/unified-cart-store'
import { Button } from '@/components/ui/button'

interface PhotoCardProps {
  photo: {
    id: string
    signed_url: string
    filename?: string
  }
  price?: number
  onOpenModal?: (photoId: string) => void
}

// Diseño sutil y profesional
const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

export function PhotoCard({ photo, price = 1000, onOpenModal }: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // usePublicCartStore returns the store directly, not a selector
  const cartStore = usePublicCartStore()
  const addItem = cartStore.addItem
  const removeItem = cartStore.removeItem
  const isItemInCart = cartStore.isItemInCart
  const getItemQuantity = cartStore.getItemQuantity

  const isSelected = isItemInCart(photo.id)
  const quantity = getItemQuantity(photo.id)
  
  const [isHovered, setIsHovered] = useState(false)

  const handleToggleSelect = () => {
    if (isSelected) {
      removeItem(photo.id)
    } else {
      addItem({
        photoId: photo.id,
        filename: photo.filename ?? photo.id,
        price,
        watermarkUrl: photo.signed_url,
      })
    }
  }

  const handleImageClick = () => {
    onOpenModal?.(photo.id)
  }

  // Detectar si es una URL firmada de Supabase (contiene token)
  const isSignedUrl = photo.signed_url.includes('token=')

  return (
    <div 
      className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="photo-card"
    >
      <div className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
        {/* Imagen de fondo con overlay gradient */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500" />
          </div>
        )}
        
        <Image
          src={photo.signed_url}
          alt="Foto del evento"
          fill
          className={`object-cover transition-all duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } ${isHovered ? 'scale-105' : 'scale-100'}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority
          unoptimized={isSignedUrl}
          onLoad={() => setImageLoaded(true)}
          onClick={handleImageClick}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />

        {/* Overlay sutil en hover */}
        <div className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-sm">
              Ver foto
            </div>
          </div>
        </div>

        {/* Badge sutil */}
        <div className="absolute top-3 left-3">
          <div className="bg-white/80 px-2 py-1 rounded text-xs font-medium text-gray-600 shadow-sm">
            MUESTRA
          </div>
        </div>

        {/* Botón de favorito sutil */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 p-1.5 bg-white/70 rounded-full shadow-sm hover:bg-white/90 transition-colors"
          aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart 
            className={`h-3.5 w-3.5 transition-colors ${
              isLiked ? 'text-red-500 fill-current' : 'text-gray-500'
            }`} 
          />
        </button>

        {/* Precio sutil */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-white/90 px-2 py-1 rounded text-xs font-medium text-gray-700 shadow-sm">
            ${price.toLocaleString()}
          </div>
        </div>

        {/* Indicador de selección sutil */}
        {isSelected && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-indigo-600 p-1.5 rounded-full shadow-sm">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Botón de selección */}
      <div className="mt-3">
        <Button
          onClick={handleToggleSelect}
          variant={isSelected ? 'default' : 'outline'}
          size="sm"
          className={`w-full rounded-lg transition-colors ${
            isSelected 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={isSelected ? 'Quitar selección' : 'Seleccionar foto'}
        >
          {isSelected ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Seleccionada
            </>
          ) : (
            'Seleccionar'
          )}
        </Button>
      </div>
    </div>
  )
}
