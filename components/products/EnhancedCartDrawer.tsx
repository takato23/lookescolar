'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Star, 
  Package, 
  Camera,
  ArrowRight,
  CreditCard,
  Gift,
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  useProductCartStore,
  useProductCartCalculation,
  useProductCustomization 
} from '@/lib/stores/product-cart-store';
import { 
  EnhancedCartItem,
  ProductRecommendation,
  formatProductSpecs,
  isPhysicalProduct 
} from '@/lib/types/products';
import { formatProductPrice } from '@/lib/services/product-pricing';

interface EnhancedCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  recommendations?: ProductRecommendation[];
  eventId?: string;
  token?: string;
}

export function EnhancedCartDrawer({
  isOpen,
  onClose,
  onCheckout,
  recommendations = [],
  eventId,
  token
}: EnhancedCartDrawerProps) {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  const {
    enhanced_items,
    current_step,
    setCurrentStep,
    syncWithUnifiedCart,
    reset
  } = useProductCartStore();

  const {
    calculation,
    recommendations: storeRecommendations,
    totalItems,
    totalPrice,
    formattedTotal,
    validateCart
  } = useProductCartCalculation();

  const {
    updateProductQuantity,
    removeProductFromPhoto,
    getPhotoProduct
  } = useProductCustomization();

  const validation = validateCart();
  const allRecommendations = [...recommendations, ...storeRecommendations];

  useEffect(() => {
    // Sync with unified cart when items change
    if (enhanced_items.length > 0) {
      syncWithUnifiedCart();
    }
  }, [enhanced_items, syncWithUnifiedCart]);

  const handleQuantityChange = (photo_id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProductFromPhoto(photo_id);
    } else {
      updateProductQuantity(photo_id, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (!validation.is_valid) {
      return;
    }

    if (!contactForm.name || !contactForm.email || !contactForm.phone) {
      alert('Por favor completa todos los campos de contacto');
      return;
    }

    setIsCheckingOut(true);

    try {
      // Sync with unified cart before checkout
      syncWithUnifiedCart();
      
      // Call the checkout handler
      await onCheckout();
      
      // Clear cart after successful checkout
      reset();
    } catch (error) {
      console.error('[EnhancedCartDrawer] Error en checkout:', error);
      alert('Hubo un error al procesar tu pedido. Por favor intenta nuevamente.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const CartItemCard = ({ item }: { item: EnhancedCartItem }) => {
    const product_selection = getPhotoProduct(item.photo_id);
    
    return (
      <Card className="border border-gray-200 hover:border-purple-300 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Photo Preview */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex-shrink-0">
              {item.watermark_url ? (
                <Image
                  src={item.watermark_url}
                  alt={item.filename || 'Foto'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-purple-500" />
                </div>
              )}
              
              {item.combo_id && (
                <Badge className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs">
                  <Package className="h-3 w-3" />
                </Badge>
              )}
            </div>

            {/* Item Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {item.product_name}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {item.filename || 'Archivo de foto'}
                  </p>
                  <div className="text-xs text-gray-500">
                    {formatProductSpecs({
                      type: item.product_specs.type,
                      width_cm: item.product_specs.width_cm,
                      height_cm: item.product_specs.height_cm,
                      finish: item.product_specs.finish,
                      paper_quality: item.product_specs.paper_quality
                    } as any)}
                  </div>
                </div>
                
                <Button
                  onClick={() => removeProductFromPhoto(item.photo_id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity and Price Controls */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleQuantityChange(item.photo_id, item.quantity - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="font-semibold text-gray-900 min-w-[2rem] text-center">
                    {item.quantity}
                  </span>
                  
                  <Button
                    onClick={() => handleQuantityChange(item.photo_id, item.quantity + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {formatProductPrice(item.unit_price)} c/u
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatProductPrice(item.subtotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PriceBreakdown = () => {
    if (!calculation) return null;

    return (
      <Collapsible open={showPriceBreakdown} onOpenChange={setShowPriceBreakdown}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Ver desglose de precios
            </span>
            <ArrowRight className={`h-4 w-4 transition-transform ${showPriceBreakdown ? 'rotate-90' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2 mt-4">
          {calculation.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.name} {item.quantity > 1 && `x${item.quantity}`}
              </span>
              <span className={`font-medium ${
                item.item_type === 'discount' ? 'text-green-600' : 'text-gray-900'
              }`}>
                {formatProductPrice(item.total_price)}
              </span>
            </div>
          ))}
          
          <Separator />
          
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatProductPrice(calculation.total)}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const RecommendationsSection = () => {
    if (allRecommendations.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Gift className="h-5 w-5 mr-2 text-purple-500" />
          Recomendaciones para ti
        </h3>
        
        <div className="space-y-3">
          {allRecommendations.slice(0, 3).map((rec, index) => (
            <Card key={index} className="border border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {rec.product?.name || rec.combo?.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {rec.description}
                    </p>
                    {rec.savings && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Ahorra {formatProductPrice(rec.savings)}
                      </div>
                    )}
                  </div>
                  
                  <Button size="sm" variant="outline" className="ml-4">
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const ContactForm = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Información de contacto</h3>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nombre completo *
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Tu nombre completo"
            value={contactForm.name}
            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={contactForm.email}
            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Teléfono *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            value={contactForm.phone}
            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1"
            required
          />
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 border-l-4 border-purple-400 overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Star className="h-6 w-6 text-purple-500 fill-current" />
              <span>Tu Carrito</span>
            </SheetTitle>
            <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </div>
          </div>
          
          {totalPrice > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-purple-600">
                  {formattedTotal}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Validation Errors */}
          {!validation.is_valid && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Cart Items */}
          {enhanced_items.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Productos seleccionados</h3>
              
              <div className="space-y-3">
                {enhanced_items.map((item) => (
                  <CartItemCard key={`${item.photo_id}-${item.product_id}-${item.combo_id}`} item={item} />
                ))}
              </div>

              {/* Price Breakdown */}
              {calculation && (
                <Card className="bg-white/60 border-purple-200">
                  <CardContent className="p-4">
                    <PriceBreakdown />
                  </CardContent>
                </Card>
              )}

              {/* Clear Cart Button */}
              <Button
                onClick={reset}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                Vaciar carrito
              </Button>
            </div>
          ) : (
            /* Empty Cart State */
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tu carrito está vacío
              </h3>
              <p className="text-gray-600 mb-6">
                Selecciona fotos y productos para comenzar tu compra
              </p>
              <Button onClick={onClose} className="bg-purple-500 hover:bg-purple-600 text-white">
                Explorar productos
              </Button>
            </div>
          )}

          {/* Recommendations */}
          {enhanced_items.length > 0 && <RecommendationsSection />}

          {/* Contact Form and Checkout */}
          {enhanced_items.length > 0 && validation.is_valid && (
            <div className="space-y-6 border-t border-white/20 pt-6">
              <ContactForm />
              
              <div className="space-y-4">
                <Button
                  onClick={handleCheckout}
                  disabled={
                    isCheckingOut || 
                    !validation.is_valid || 
                    !contactForm.name || 
                    !contactForm.email || 
                    !contactForm.phone
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>Pagar {formattedTotal}</span>
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-600 text-center">
                  Al proceder con el pago aceptas nuestros términos y condiciones.
                  Las fotos serán entregadas sin marca de agua tras la confirmación del pago.
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Cart Button with Enhanced Features
export function EnhancedCartButton({ className }: { className?: string }) {
  const { totalItems, isOpen, openCart } = useProductCartStore();
  
  if (totalItems === 0) return null;
  
  return (
    <Button
      onClick={openCart}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-[9999]"
      style={{ position: 'fixed', bottom: '24px', right: '24px' }}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {totalItems}
        </span>
      </div>
    </Button>
  );
}