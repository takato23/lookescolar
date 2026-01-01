'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Star,
  SparklesIcon,
} from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface FamilyCartDrawerProps {
  onOpenWizard: () => void;
  token: string;
}

export function FamilyCartDrawer({
  onOpenWizard,
  token,
}: FamilyCartDrawerProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
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
        items: items.map((item) => ({
          photoId: item.photoId,
          quantity: item.quantity,
          priceType: 'base',
        })),
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
      alert(
        'Hubo un error al procesar tu pedido. Por favor intenta nuevamente.'
      );
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
    window.open(`/store-unified/${token}`, '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full border-l-4 border-purple-400 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 sm:max-w-lg">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center space-x-2 text-2xl font-bold text-gray-900">
              <Star className="h-6 w-6 fill-current text-purple-500" />
              <span>Tu carrito</span>
            </SheetTitle>
            <div className="rounded-full bg-purple-400 px-3 py-1 text-sm font-bold text-white shadow-lg">
              {totalItems} {totalItems === 1 ? 'foto' : 'fotos'}
            </div>
          </div>
          <SheetDescription>
            Revisa las fotos seleccionadas y elige cómo proceder con tu compra.
          </SheetDescription>

          {totalItems > 0 && (
            <div className="rounded-2xl bg-white/80 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  Total
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 max-h-[50vh] space-y-6 overflow-y-auto">
          {/* Items del carrito */}
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.photoId}
                  className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-4">
                    {/* Miniatura de la foto */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-300 to-pink-400">
                      {item.watermarkUrl ? (
                        <Image
                          src={item.watermarkUrl}
                          alt={item.filename}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            MUESTRA
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Información del item */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-gray-900">
                        {item.filename || 'Muestra'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)} c/u
                      </p>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() =>
                          handleQuantityChange(item.photoId, item.quantity - 1)
                        }
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>

                      <span className="min-w-[2rem] text-center font-semibold text-gray-900">
                        {item.quantity}
                      </span>

                      <Button
                        onClick={() =>
                          handleQuantityChange(item.photoId, item.quantity + 1)
                        }
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
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
                      className="h-8 w-8 rounded-full p-0 text-red-500 hover:bg-red-50"
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
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                Vaciar carrito
              </Button>
            </div>
          ) : (
            /* Carrito vacío */
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
                <ShoppingCart className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                ¡Comencemos a seleccionar!
              </h3>
              <p className="mb-4 text-gray-600">
                Tu carrito está vacío, pero es fácil llenarlo:
              </p>

              <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left">
                <h4 className="mb-2 font-semibold text-yellow-800">
                  📋 Cómo comprar fotos:
                </h4>
                <ol className="list-inside list-decimal space-y-1 text-sm text-yellow-700">
                  <li>Busca las fotos que te gusten en la galería</li>
                  <li>Haz click en el ✅ para agregarlas al carrito</li>
                  <li>Regresa aquí para completar tu compra</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={closeCart}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-lg font-bold text-white hover:from-purple-700 hover:to-pink-700"
                >
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
                className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 text-lg font-bold text-white shadow-lg hover:from-purple-700 hover:to-pink-700"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Completar Compra</span>
              </Button>
              <p className="text-center text-xs text-gray-600">
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
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={contactForm.phone}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="mt-1 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                    required
                  />
                </div>
              </div>

              {/* Botón de pago directo */}
              <Button
                onClick={handleDirectCheckout}
                disabled={
                  isCheckingOut ||
                  !contactForm.name ||
                  !contactForm.email ||
                  !contactForm.phone
                }
                className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-blue-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-600"
                aria-label="Proceder al pago con MercadoPago"
              >
                <div className="flex items-center space-x-2">
                  <div className="rounded bg-white px-2 py-1">
                    <span className="text-sm font-bold text-blue-500">MP</span>
                  </div>
                  <span>
                    {isCheckingOut
                      ? 'Procesando...'
                      : `Pagar ${formatCurrency(totalPrice)}`}
                  </span>
                </div>
              </Button>

              <p className="text-center text-xs text-gray-600">
                Al proceder con el pago aceptas nuestros términos y condiciones.
                Las fotos serán entregadas sin marca de agua tras la
                confirmación del pago.
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
      className={`fixed bottom-6 right-6 z-[9999] h-16 w-16 rounded-full text-white shadow-lg transition-all duration-300 hover:shadow-xl ${
        totalItems > 0
          ? 'animate-pulse bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
          : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-purple-600 hover:to-pink-600'
      }`}
      aria-label={
        totalItems > 0
          ? `Carrito con ${totalItems} items`
          : 'Ver carrito y opciones de compra'
      }
      style={{ position: 'fixed', bottom: '24px', right: '24px' }}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
            {totalItems}
          </span>
        )}
        {totalItems === 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
            !
          </span>
        )}
      </div>
    </Button>
  );
}
