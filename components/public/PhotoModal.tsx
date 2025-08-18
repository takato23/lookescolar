'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Download, Heart, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface PhotoModalProps {
  isOpen: boolean
  onClose: () => void
  photo: {
    id: string
    signed_url: string
  } | null
  photos: Array<{
    id: string
    signed_url: string
  }>
  price?: number
}

export function PhotoModal({ isOpen, onClose, photo, photos, price = 1000 }: PhotoModalProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const { addItem, removeItem, isItemInCart, openCart } = useCartStore()
  
  const isSelected = photo ? isItemInCart(photo.id) : false

  // Actualizar índice cuando cambia la foto
  useEffect(() => {
    if (photo) {
      const index = photos.findIndex(p => p.id === photo.id)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [photo, photos])

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }

  const handleToggleSelect = () => {
    if (!photo) return
    
    if (isSelected) {
      removeItem(photo.id)
    } else {
      addItem(photo.id, price)
    }
  }

  const handleAddToCartAndClose = () => {
    if (!photo) return
    
    if (!isSelected) {
      addItem(photo.id, price)
    }
    openCart()
    onClose()
  }

  const currentPhoto = photos[currentIndex]
  
  // Detectar si es una URL firmada de Supabase (contiene token)
  const isSignedUrl = currentPhoto?.signed_url.includes('token=')

  if (!isOpen || !currentPhoto) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95 border-0">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Botón cerrar */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full p-2"
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navegación anterior */}
          {photos.length > 1 && (
            <Button
              onClick={goToPrevious}
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full p-3"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Navegación siguiente */}
          {photos.length > 1 && (
            <Button
              onClick={goToNext}
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full p-3"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Imagen principal */}
          <div className="relative max-w-full max-h-full">
            <Image
              src={currentPhoto.signed_url}
              alt="Foto del evento en tamaño completo"
              width={1200}
              height={800}
              className="object-contain max-h-[80vh] max-w-full"
              priority
              unoptimized={isSignedUrl}
              sizes="100vw"
            />
            
            {/* Watermark MUESTRA sobre la imagen */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white/30 text-6xl md:text-8xl font-bold transform rotate-12 select-none">
                MUESTRA
              </div>
            </div>
          </div>

          {/* Panel de control inferior */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Info de la foto */}
              <div className="text-white">
                <h3 className="text-lg font-semibold mb-1">Foto #{currentIndex + 1}</h3>
                <p className="text-sm text-gray-300">
                  {currentIndex + 1} de {photos.length} fotos
                </p>
              </div>

              {/* Controles */}
              <div className="flex items-center space-x-4">
                {/* Botón favorito */}
                <Button
                  onClick={() => setIsLiked(!isLiked)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full p-2"
                  aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart 
                    className={`h-5 w-5 ${
                      isLiked ? 'text-red-500 fill-current' : 'text-white'
                    }`} 
                  />
                </Button>

                {/* Botón descargar muestra */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full p-2"
                  aria-label="Descargar vista previa"
                  onClick={() => {
                    // Aquí iría la lógica para descargar la imagen con watermark
                    console.log('Descargar muestra')
                  }}
                >
                  <Download className="h-5 w-5" />
                </Button>

                {/* Precio y selección */}
                <div className="flex items-center space-x-3">
                  <div className="text-right text-white">
                    <p className="text-sm text-gray-300">Desde</p>
                    <p className="text-xl font-bold">ARS {price.toLocaleString()}</p>
                  </div>

                  <Button
                    onClick={handleToggleSelect}
                    variant={isSelected ? "secondary" : "default"}
                    className={`
                      px-6 py-2 rounded-full font-semibold transition-all
                      ${isSelected 
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
                        : 'bg-white text-black hover:bg-gray-100'
                      }
                    `}
                    aria-label={isSelected ? 'Quitar de selección' : 'Seleccionar foto'}
                  >
                    {isSelected ? 'Seleccionada ✓' : 'Seleccionar'}
                  </Button>

                  <Button
                    onClick={handleAddToCartAndClose}
                    className="bg-cyan-500 text-white hover:bg-cyan-600 px-6 py-2 rounded-full font-semibold flex items-center space-x-2"
                    aria-label="Agregar al carrito y abrir carrito"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Comprar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores de navegación */}
          {photos.length > 1 && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-white scale-125' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Ir a foto ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}