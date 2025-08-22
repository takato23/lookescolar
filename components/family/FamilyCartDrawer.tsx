'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, ShoppingCart, Star, SparklesIcon } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface FamilyCartDrawerProps {
  onOpenWizard: () => void;
  token: string;
}

export function FamilyCartDrawer({ onOpenWizard, token }: FamilyCartDrawerProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useUnifiedCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const handleDirectCheckout = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.phone) {
      alert('Por favor completa todos los campos de contacto');
      return;
    }

    if (items.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    setIsCheckingOut(true);

    try {
      // Preparar datos para el checkout directo (sin wizard)
      const checkoutData = {
        token,
        contactInfo: contactForm,
        items: items.map(item => ({
          photoId: item.photoId,
          quantity: item.quantity,
          priceType: 'base'
        }))
      };

      // Llamar al endpoint de checkout familiar
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en el procesamiento del pago');
      }

      const { redirectUrl } = await response.json();

      // Limpiar carrito y redirigir a MercadoPago
      clearCart();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('[FamilyCartDrawer] Error en checkout:', error);
      alert('Hubo un error al procesar tu pedido. Por favor intenta nuevamente.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleQuantityChange = (photoId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(photoId);
    } else {
      updateQuantity(photoId, newQuantity);
    }
  };

  const handleWizardCheckout = () => {
    closeCart();
    window.open(`/f/${token}/checkout`, '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-lg bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 border-l-4 border-purple-400">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Star className="h-6 w-6 text-purple-500 fill-current" />
              <span>Tu carrito</span>
            </SheetTitle>
            <div className="bg-purple-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {totalItems} {totalItems === 1 ? 'foto' : 'fotos'}
            </div>
          </div>
          <SheetDescription>
            Revisa las fotos seleccionadas y elige cómo proceder con tu compra.
          </SheetDescription>
          
          {totalItems > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[50vh]">
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
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-purple-300 to-pink-400 flex-shrink-0">
                      {item.watermarkUrl ? (
                        <Image
                          src={item.watermarkUrl}
                          alt={item.filename}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">MUESTRA</span>
                        </div>
                      )}
                    </div>

                    {/* Información del item */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {item.filename || 'Muestra'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)} c/u
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
            <div className="text-center py-8">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <ShoppingCart className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡Comencemos a seleccionar!
              </h3>
              <p className="text-gray-600 mb-4">
                Tu carrito está vacío, pero es fácil llenarlo:
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold text-yellow-800 mb-2">📋 Cómo comprar fotos:</h4>
                <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Busca las fotos que te gusten en la galería</li>
                  <li>Haz click en el ✅ para agregarlas al carrito</li>
                  <li>Regresa aquí para completar tu compra</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <Button onClick={closeCart} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 text-lg font-bold">
                  🖼️ Ver Galería de Fotos
                </Button>
                
                <p className="text-xs text-gray-500">
                  💡 Tip: También puedes marcar fotos como favoritas con ❤️
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Opciones de checkout */}
        {items.length > 0 && (
          <div className="mt-6 space-y-6 border-t border-white/20 pt-6">
            
            {/* Opción 1: Proceso de compra guiado */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                🌟 Recomendado
              </h3>
              <Button
                onClick={handleWizardCheckout}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Completar Compra</span>
              </Button>
              <p className="text-xs text-gray-600 text-center">
                Proceso guiado paso a paso con opciones de paquetes y extras
              </p>
            </div>

            <Separator className="bg-white/20" />

            {/* Opción 2: Checkout directo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Checkout directo
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
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
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
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
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
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                    required
                  />
                </div>
              </div>

              {/* Botón de pago directo */}
              <Button
                onClick={handleDirectCheckout}
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
                      : `Pagar ${formatCurrency(totalPrice)}`
                    }
                  </span>
                </div>
              </Button>

              <p className="text-xs text-gray-600 text-center">
                Al proceder con el pago aceptas nuestros términos y condiciones.
                Las fotos serán entregadas sin marca de agua tras la confirmación del pago.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Botón flotante del carrito
export function FamilyCartButton({ className }: { className?: string }) {
  const { openCart, getTotalItems } = useUnifiedCartStore();
  const totalItems = getTotalItems();
  
  console.log('FamilyCartButton render - totalItems:', totalItems);
  
  // Always show the cart button, but with different styling based on cart state
  return (
    <Button
      onClick={openCart}
      className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 z-[9999] ${
        totalItems > 0 
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 animate-pulse' 
          : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-purple-600 hover:to-pink-600'
      }`}
      aria-label={totalItems > 0 ? `Carrito con ${totalItems} items` : 'Ver carrito y opciones de compra'}
      style={{ position: 'fixed', bottom: '24px', right: '24px' }}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {totalItems}
          </span>
        )}
        {totalItems === 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
            !
          </span>
        )}
      </div>
    </Button>
  );
}