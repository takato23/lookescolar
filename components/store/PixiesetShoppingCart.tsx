'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, Phone, MessageCircle, ShoppingBag, CreditCard, Check, ArrowLeft, Plus, Minus } from 'lucide-react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { getTemplateTheme } from '@/lib/utils/template-theming';
import { useTheme } from '@/components/providers/theme-provider';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  photoId: string;
  image?: string;
  description?: string;
}

interface PixiesetShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
  onSignUp?: () => void; // Ya no se usa pero mantengo compatibilidad
  settings?: StoreSettings;
  theme?: ReturnType<typeof getTemplateTheme>;
  className?: string;
}

export function PixiesetShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onContinueShopping,
  settings,
  theme,
  className
}: PixiesetShoppingCartProps) {
  const { resolvedTheme } = useTheme();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings?.currency || 'ARS',
    }).format(price / 100);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const handleWhatsApp = () => {
    const message = `¡Hola! Me interesa comprar:\n${items.map(item => 
      `• ${item.name} - Cantidad: ${item.quantity} - ${formatPrice(item.price * item.quantity)}`
    ).join('\n')}\n\nTotal: ${formatPrice(total)}`;
    
    const whatsappUrl = `https://wa.me/541112345678?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 ${className}`}>
      {/* Header with theme-aware styling - Mobile optimized */}
      <div className="bg-primary text-primary-foreground border-b border-border">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Carrito</h1>
            </div>
            <Button
              onClick={onContinueShopping}
              variant="secondary"
              size="sm"
              className="self-start sm:self-auto h-8 px-3 text-sm"
            >
              <ArrowLeft className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Continuar Comprando</span>
              <span className="sm:hidden">Seguir</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-8 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {items.length === 0 ? (
              <Card className="text-center p-4 sm:p-8">
                <CardContent className="space-y-4 sm:space-y-6">
                  <ShoppingBag className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Carrito vacío</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">¡Descubre nuestros paquetes!</p>
                  </div>
                  <Button
                    onClick={onContinueShopping}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base"
                  >
                    Ver Paquetes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        {/* Imagen - Mobile: compact, Desktop: fixed width */}
                        {item.image && (
                          <div className="w-full h-20 sm:w-20 sm:h-20 flex-shrink-0 bg-muted rounded-t-lg sm:rounded-l-lg sm:rounded-t-none">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-t-none"
                            />
                          </div>
                        )}

                        <div className="flex-1 p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div className="flex-1 space-y-2 sm:space-y-3">
                              <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{item.name}</h3>
                              {item.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
                              )}

                              {/* Quantity Control - More compact on mobile */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Cant:</span>
                                <div className="flex items-center border border-border rounded-md bg-background">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                    className="h-7 w-7 p-0 rounded-r-none hover:bg-muted"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="px-2 py-1 text-sm font-medium min-w-[2.5rem] text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                    className="h-7 w-7 p-0 rounded-l-none hover:bg-muted"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Price and Remove - More compact layout */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                              <p className="text-base sm:text-lg font-bold text-foreground">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveItem(item.id)}
                                className="text-muted-foreground hover:text-destructive p-1.5 h-8 w-8"
                                title="Eliminar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-3 sm:space-y-6">
            {/* Order Summary Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Resumen
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>

                <Separator />

                <div className="flex justify-between items-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <span className="text-base sm:text-lg font-semibold text-foreground">Total</span>
                  <span className="text-lg sm:text-xl font-bold text-primary">
                    {formatPrice(total)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground text-center bg-muted/30 p-2 rounded-lg leading-tight">
                  Envío e impuestos se calculan en checkout
                </p>
              </CardContent>
            </Card>

            {/* WhatsApp Contact Card - More prominent */}
            <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-3 sm:p-6 text-center space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-green-900 dark:text-green-100">¡Pedí por WhatsApp!</h3>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-200 leading-tight">
                    Pedido directo con ayuda personalizada
                  </p>
                </div>
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-10 sm:h-11 text-sm sm:text-base"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Pedir por WhatsApp
                </Button>
                <p className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full inline-block">
                  +54 11 1234-5678
                </p>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            {settings?.payment_methods && Object.entries(settings.payment_methods).some(([_, method]) => method.enabled) && (
              <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-blue-900 dark:text-blue-100">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Métodos de Pago Disponibles</span>
                    <span className="sm:hidden">Métodos de Pago</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                  {Object.entries(settings.payment_methods)
                    .filter(([_, method]) => method.enabled)
                    .map(([methodId, method]) => (
                      <div
                        key={methodId}
                        className="flex items-center gap-2 sm:gap-3 bg-white/60 dark:bg-white/10 p-2 sm:p-3 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm sm:text-base font-medium text-blue-900 dark:text-blue-100 block truncate">{method.name}</span>
                          {method.description && (
                            <p className="text-xs text-blue-700 dark:text-blue-200 mt-0.5 line-clamp-2">{method.description}</p>
                          )}
                        </div>
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            )}

            {/* Checkout Button */}
            <Button
              onClick={onCheckout}
              disabled={items.length === 0}
              size="lg"
              className="w-full text-sm sm:text-base font-semibold py-3 sm:py-4 h-11 sm:h-12"
            >
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Proceder al Checkout</span>
              <span className="sm:hidden">Checkout</span>
            </Button>

            {/* Footer */}
            <div className="text-center pt-3 sm:pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">LookEscolar</span> ✨
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PixiesetShoppingCart;
