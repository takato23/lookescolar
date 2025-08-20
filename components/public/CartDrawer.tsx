'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Minus, Plus, Trash2, ShoppingCart, Star } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

export function CartDrawer() {
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const {
    items,
    isCartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    setContactInfo,
    eventId
  } = useCartStore()

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  const handleCheckout = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.phone) {
      alert('Por favor completa todos los campos de contacto')
      return
    }

    if (items.length === 0) {
      alert('Tu carrito está vacío')
      return
    }

    if (!eventId) {
      alert('Error: ID de evento no encontrado')
      return
    }

    setIsCheckingOut(true)

    try {
      // Guardar información de contacto
      setContactInfo(contactForm)

      // Preparar datos para el checkout según el esquema esperado por /api/gallery/checkout
      const checkoutData = {
        eventId: eventId,
        photoIds: items.map(item => item.photoId),
        contactInfo: contactForm,
        package: `Selección personalizada (${items.length} fotos)`
      }

      // Llamar al endpoint de checkout
      const response = await fetch('/api/gallery/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en el procesamiento del pago')
      }

      const result = await response.json()
      const { redirectUrl } = result.success ? result.data : result

      // Redirigir a MercadoPago
      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (error) {
      console.error('[CartDrawer] Error en checkout:', error)
      alert('Hubo un error al procesar tu pedido. Por favor intenta nuevamente.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleQuantityChange = (photoId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(photoId)
    } else {
      updateQuantity(photoId, newQuantity)
    }
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-lg bg-gradient-to-br from-yellow-50 via-orange-50 to-rose-50 border-l-4 border-yellow-400">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-500 fill-current" />
              <span>Tu carrito</span>
            </SheetTitle>
            <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {totalItems} {totalItems === 1 ? 'foto' : 'fotos'}
            </div>
          </div>
          <SheetDescription>
            Revisa las fotos seleccionadas y completa tu información para proceder con la compra.
          </SheetDescription>
          
          {totalItems > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {totalPrice.toLocaleString()} ARS
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Items del carrito */}
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.photoId}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50"
                >
                  <div className="flex items-center space-x-4">
                    {/* Miniatura de la foto */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-300 to-blue-400 flex-shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">MUESTRA</span>
                      </div>
                    </div>

                    {/* Información del item */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        Muestra
                      </h4>
                      <p className="text-sm text-gray-600">
                        ARS {item.price.toLocaleString()} c/u
                      </p>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleQuantityChange(item.photoId, item.quantity - 1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="font-semibold text-gray-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      
                      <Button
                        onClick={() => handleQuantityChange(item.photoId, item.quantity + 1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Botón eliminar */}
                    <Button
                      onClick={() => removeItem(item.photoId)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-full"
                      aria-label="Eliminar del carrito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Botón limpiar carrito */}
              <Button
                onClick={clearCart}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                Vaciar carrito
              </Button>
            </div>
          ) : (
            /* Carrito vacío */
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tu carrito está vacío
              </h3>
              <p className="text-gray-600 mb-6">
                Selecciona las fotos que deseas comprar
              </p>
              <Button onClick={closeCart} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Explorar fotos
              </Button>
            </div>
          )}
        </div>

        {/* Formulario de contacto y checkout */}
        {items.length > 0 && (
          <div className="mt-6 space-y-6 border-t border-white/20 pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Información de contacto
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 rounded-xl border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 rounded-xl border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 rounded-xl border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                    required
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Botón de pago */}
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut || !contactForm.name || !contactForm.email || !contactForm.phone}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
              aria-label="Proceder al pago con MercadoPago"
            >
              <div className="flex items-center space-x-2">
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-blue-500 font-bold text-sm">MP</span>
                </div>
                <span>
                  {isCheckingOut 
                    ? 'Procesando...' 
                    : `Pagar con MercadoPago`
                  }
                </span>
              </div>
            </Button>

            <p className="text-xs text-gray-600 text-center">
              Al proceder con el pago aceptas nuestros términos y condiciones.
              Las fotos serán entregadas sin marca de agua tras la confirmación del pago.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
