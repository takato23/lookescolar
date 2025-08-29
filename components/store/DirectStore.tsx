'use client';

import React, { useState, useEffect } from 'react';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Heart, 
  Eye, 
  Calendar, 
  Image as ImageIcon,
  X,
  Plus,
  Minus,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Star,
  Camera,
  Sparkles,
  Gift,
  Truck
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
    theme?: string;
  };
}

interface CartItem {
  id: string;
  photo: Photo;
  quantity: number;
  price: number;
}

interface DirectStoreProps {
  token: string;
  photos: Photo[];
  subject: Subject;
}

// Validation schema
const ContactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  street: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'La provincia es requerida'),
  zipCode: z.string().min(4, 'Código postal inválido'),
});

export function DirectStore({ token, photos, subject }: DirectStoreProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [contactForm, setContactForm] = useState<{
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }>({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Precio por foto (configurable)
  const PRICE_PER_PHOTO = 1500; // $15.00 en centavos

  // Agregar foto al carrito
  const addToCart = (photo: Photo) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === photo.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === photo.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: photo.id, photo, quantity: 1, price: PRICE_PER_PHOTO }];
    });
    
    toast.success(`${photo.filename} agregada al carrito`);
    setIsCartOpen(true);
  };

  // Remover foto del carrito
  const removeFromCart = (photoId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== photoId));
    toast.success('Foto removida del carrito');
  };

  // Actualizar cantidad
  const updateQuantity = (photoId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === photoId ? { ...item, quantity } : item
      )
    );
  };

  // Calcular total
  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Validar formulario de contacto
  const validateContactForm = () => {
    try {
      ContactSchema.parse(contactForm);
      setContactErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        errors[err.path[0]] = err.message;
      });
      setContactErrors(errors);
      return false;
    }
  };

  // Procesar pago
  const processPayment = async () => {
    if (!validateContactForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Aquí iría la integración con MercadoPago
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          contactInfo: contactForm,
                  items: cartItems.map(item => ({
          photoId: item.photo.id,
          quantity: item.quantity,
          price: item.price,
        })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en el procesamiento del pago');
      }

      const { redirectUrl } = await response.json();
      
      // Limpiar carrito y redirigir a MercadoPago
      setCartItems([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Error en checkout:', error);
      toast.error('Hubo un error al procesar tu pedido. Por favor intenta nuevamente.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Obtener tema del evento
  const eventTheme = subject.event.theme || 'default';

  return (
    <ThemedGalleryWrapper eventTheme={eventTheme as any}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 mr-3 text-yellow-300" />
                <h1 className="text-4xl sm:text-5xl font-bold">
                  {subject.event.name}
                </h1>
              </div>
              <p className="text-xl sm:text-2xl text-blue-100 mb-4">
                📸 {subject.name}
              </p>
              <p className="text-lg text-blue-200 max-w-2xl mx-auto">
                Selecciona las fotos que quieres comprar. Imágenes de alta calidad 
                impresas profesionalmente para conservar tus recuerdos más preciados.
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-8 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300">{photos.length}</div>
                  <div className="text-blue-200">Fotos Disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300">{formatCurrency(PRICE_PER_PHOTO)}</div>
                  <div className="text-blue-200">Por Foto</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300">24h</div>
                  <div className="text-blue-200">Envío Rápido</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header con carrito */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {photos.length} fotos
                </Badge>
                <Badge variant="outline" className="border-green-200 text-green-700">
                  <Star className="h-3 w-3 mr-1" />
                  Calidad Premium
                </Badge>
              </div>
              
              {/* Carrito flotante */}
              <Button
                variant="default"
                size="lg"
                onClick={() => setIsCartOpen(true)}
                className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Mi Carrito
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                    {cartItems.reduce((total, item) => total + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fotos Profesionales</h3>
                <p className="text-gray-600">Imágenes de alta resolución capturadas por fotógrafos expertos</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Envío Rápido</h3>
                <p className="text-gray-600">Recibe tus fotos en 24-48 horas en la puerta de tu casa</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Calidad Garantizada</h3>
                <p className="text-gray-600">Papel fotográfico premium con acabado profesional</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de fotos */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🎯 Selecciona tus Fotos Favoritas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Haz clic en las fotos que te gusten para agregarlas al carrito. 
              Puedes seleccionar múltiples fotos y ajustar cantidades.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onAddToCart={() => addToCart(photo)}
                isInCart={cartItems.some(item => item.id === photo.id)}
                price={PRICE_PER_PHOTO}
              />
            ))}
          </div>
        </div>

        {/* Carrito flotante */}
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-end p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Tu Carrito
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCartOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
                    <p className="text-gray-400">Selecciona algunas fotos para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <img
                          src={item.photo.preview_url}
                          alt={item.photo.filename}
                          className="w-20 h-20 object-cover rounded-lg shadow-sm"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate">
                            {item.photo.filename}
                          </p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {formatCurrency(getTotalPrice())}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3 shadow-lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceder al Pago
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center">
                    <CreditCard className="h-6 w-6 mr-2" />
                    Información de Envío
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                        Nombre completo *
                      </Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Tu nombre completo"
                      />
                      {contactErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="tu@email.com"
                      />
                      {contactErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                        Teléfono *
                      </Label>
                      <Input
                        id="phone"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="+54 9 11 1234-5678"
                      />
                      {contactErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="street" className="text-sm font-semibold text-gray-700">
                        Dirección *
                      </Label>
                      <Input
                        id="street"
                        value={contactForm.street}
                        onChange={(e) => setContactForm(prev => ({ ...prev, street: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.street ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Calle y número"
                      />
                      {contactErrors.street && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.street}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="city" className="text-sm font-semibold text-gray-700">
                        Ciudad *
                      </Label>
                      <Input
                        id="city"
                        value={contactForm.city}
                        onChange={(e) => setContactForm(prev => ({ ...prev, city: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Buenos Aires"
                      />
                      {contactErrors.city && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.city}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="state" className="text-sm font-semibold text-gray-700">
                        Provincia *
                      </Label>
                      <Input
                        id="state"
                        value={contactForm.state}
                        onChange={(e) => setContactForm(prev => ({ ...prev, state: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Buenos Aires"
                      />
                      {contactErrors.state && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.state}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode" className="text-sm font-semibold text-gray-700">
                        Código Postal *
                      </Label>
                      <Input
                        id="zipCode"
                        value={contactForm.zipCode}
                        onChange={(e) => setContactForm(prev => ({ ...prev, zipCode: e.target.value }))}
                        className={`mt-2 h-12 ${contactErrors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="1234"
                      />
                      {contactErrors.zipCode && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-semibold text-gray-800">Total del pedido:</span>
                        <span className="text-4xl font-bold text-blue-600">
                          {formatCurrency(getTotalPrice())}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-6">
                        <p>✅ Envío incluido en el precio</p>
                        <p>✅ Impresión profesional en papel fotográfico</p>
                        <p>✅ Entrega en 24-48 horas</p>
                      </div>
                      
                      <Button
                        onClick={processPayment}
                        disabled={isProcessingPayment}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-4 shadow-lg"
                        size="lg"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Pagar con MercadoPago
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemedGalleryWrapper>
  );
}

// Componente para cada foto
interface PhotoCardProps {
  photo: Photo;
  onAddToCart: () => void;
  isInCart: boolean;
  price: number;
}

function PhotoCard({ photo, onAddToCart, isInCart, price }: PhotoCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden border-0 bg-white shadow-lg">
      <CardContent className="p-0 relative">
        <div className="aspect-square relative overflow-hidden">
          {/* Loading state */}
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <p className="text-sm text-gray-500">Cargando...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Error al cargar</p>
              </div>
            </div>
          )}

          {/* Image */}
          {!imageError && (
            <img
              src={photo.preview_url}
              alt={photo.filename}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          )}

          {/* Overlay con precio y botón */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
            {/* Precio */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
              {formatCurrency(price)}
            </div>

            {/* Botón de agregar al carrito */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
              <Button
                variant={isInCart ? "secondary" : "default"}
                size="lg"
                className={`transition-all duration-300 transform ${
                  isInCart 
                    ? 'bg-green-600 hover:bg-green-700 shadow-lg' 
                    : 'bg-white/95 hover:bg-white text-gray-800 hover:text-gray-900 shadow-lg'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
              >
                {isInCart ? (
                  <>
                    <Heart className="h-5 w-5 mr-2" />
                    Agregada
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Badge de "Nueva" */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" />
              Nueva
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
