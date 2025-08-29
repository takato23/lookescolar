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
  Truck,
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
  const [contactErrors, setContactErrors] = useState<Record<string, string>>(
    {}
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Precio por foto (configurable)
  const PRICE_PER_PHOTO = 1500; // $15.00 en centavos

  // Agregar foto al carrito
  const addToCart = (photo: Photo) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === photo.id);
      if (existingItem) {
        return prev.map((item) =>
          item.id === photo.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { id: photo.id, photo, quantity: 1, price: PRICE_PER_PHOTO },
      ];
    });

    toast.success(`${photo.filename} agregada al carrito`);
    setIsCartOpen(true);
  };

  // Remover foto del carrito
  const removeFromCart = (photoId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== photoId));
    toast.success('Foto removida del carrito');
  };

  // Actualizar cantidad
  const updateQuantity = (photoId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, quantity } : item))
    );
  };

  // Calcular total
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
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
          items: cartItems.map((item) => ({
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
      toast.error(
        'Hubo un error al procesar tu pedido. Por favor intenta nuevamente.'
      );
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
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <Camera className="mr-3 h-8 w-8 text-yellow-300" />
                <h1 className="text-4xl font-bold sm:text-5xl">
                  {subject.event.name}
                </h1>
              </div>
              <p className="mb-4 text-xl text-blue-100 sm:text-2xl">
                📸 {subject.name}
              </p>
              <p className="mx-auto max-w-2xl text-lg text-blue-200">
                Selecciona las fotos que quieres comprar. Imágenes de alta
                calidad impresas profesionalmente para conservar tus recuerdos
                más preciados.
              </p>

              {/* Stats */}
              <div className="mt-8 flex flex-wrap justify-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300">
                    {photos.length}
                  </div>
                  <div className="text-blue-200">Fotos Disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300">
                    {formatCurrency(PRICE_PER_PHOTO)}
                  </div>
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
        <div className="sticky top-0 z-50 border-b bg-white/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="border-blue-200 bg-blue-100 text-blue-800"
                >
                  <ImageIcon className="mr-1 h-3 w-3" />
                  {photos.length} fotos
                </Badge>
                <Badge
                  variant="outline"
                  className="border-green-200 text-green-700"
                >
                  <Star className="mr-1 h-3 w-3" />
                  Calidad Premium
                </Badge>
              </div>

              {/* Carrito flotante */}
              <Button
                variant="default"
                size="lg"
                onClick={() => setIsCartOpen(true)}
                className="relative bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:from-blue-700 hover:to-purple-700"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Mi Carrito
                {cartItems.length > 0 && (
                  <Badge className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 p-0 text-xs">
                    {cartItems.reduce(
                      (total, item) => total + item.quantity,
                      0
                    )}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  Fotos Profesionales
                </h3>
                <p className="text-gray-600">
                  Imágenes de alta resolución capturadas por fotógrafos expertos
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                  <Truck className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Envío Rápido</h3>
                <p className="text-gray-600">
                  Recibe tus fotos en 24-48 horas en la puerta de tu casa
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Gift className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  Calidad Garantizada
                </h3>
                <p className="text-gray-600">
                  Papel fotográfico premium con acabado profesional
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de fotos */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              🎯 Selecciona tus Fotos Favoritas
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Haz clic en las fotos que te gusten para agregarlas al carrito.
              Puedes seleccionar múltiples fotos y ajustar cantidades.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onAddToCart={() => addToCart(photo)}
                isInCart={cartItems.some((item) => item.id === photo.id)}
                price={PRICE_PER_PHOTO}
              />
            ))}
          </div>
        </div>

        {/* Carrito flotante */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center text-xl font-bold">
                    <ShoppingCart className="mr-2 h-5 w-5" />
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

              <div className="max-h-96 overflow-y-auto p-6">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <p className="text-lg text-gray-500">
                      Tu carrito está vacío
                    </p>
                    <p className="text-gray-400">
                      Selecciona algunas fotos para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <img
                          src={item.photo.preview_url}
                          alt={item.photo.filename}
                          className="h-20 w-20 rounded-lg object-cover shadow-sm"
                        />
                        <div className="flex-1">
                          <p className="truncate text-sm font-semibold">
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
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
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
                <div className="border-t bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                  <div className="mb-6 flex items-center justify-between">
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
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-lg shadow-lg hover:from-blue-700 hover:to-purple-700"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceder al Pago
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="rounded-t-2xl bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center text-2xl font-bold">
                    <CreditCard className="mr-2 h-6 w-6" />
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
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Nombre completo *
                      </Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Tu nombre completo"
                      />
                      {contactErrors.name && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="email"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="tu@email.com"
                      />
                      {contactErrors.email && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="phone"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Teléfono *
                      </Label>
                      <Input
                        id="phone"
                        value={contactForm.phone}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="+54 9 11 1234-5678"
                      />
                      {contactErrors.phone && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="street"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Dirección *
                      </Label>
                      <Input
                        id="street"
                        value={contactForm.street}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            street: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.street ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Calle y número"
                      />
                      {contactErrors.street && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.street}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="city"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Ciudad *
                      </Label>
                      <Input
                        id="city"
                        value={contactForm.city}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Buenos Aires"
                      />
                      {contactErrors.city && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="state"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Provincia *
                      </Label>
                      <Input
                        id="state"
                        value={contactForm.state}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Buenos Aires"
                      />
                      {contactErrors.state && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.state}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="zipCode"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Código Postal *
                      </Label>
                      <Input
                        id="zipCode"
                        value={contactForm.zipCode}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            zipCode: e.target.value,
                          }))
                        }
                        className={`mt-2 h-12 ${contactErrors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="1234"
                      />
                      {contactErrors.zipCode && (
                        <p className="mt-1 text-sm text-red-500">
                          {contactErrors.zipCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xl font-semibold text-gray-800">
                          Total del pedido:
                        </span>
                        <span className="text-4xl font-bold text-blue-600">
                          {formatCurrency(getTotalPrice())}
                        </span>
                      </div>

                      <div className="mb-6 text-sm text-gray-600">
                        <p>✅ Envío incluido en el precio</p>
                        <p>✅ Impresión profesional en papel fotográfico</p>
                        <p>✅ Entrega en 24-48 horas</p>
                      </div>

                      <Button
                        onClick={processPayment}
                        disabled={isProcessingPayment}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-4 text-lg shadow-lg hover:from-green-700 hover:to-emerald-700"
                        size="lg"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-5 w-5" />
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
    <Card className="group cursor-pointer overflow-hidden border-0 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <CardContent className="relative p-0">
        <div className="relative aspect-square overflow-hidden">
          {/* Loading state */}
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="flex flex-col items-center">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Cargando...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-500">Error al cargar</p>
              </div>
            </div>
          )}

          {/* Image */}
          {!imageError && (
            <img
              src={photo.preview_url}
              alt={photo.filename}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          )}

          {/* Overlay con precio y botón */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100">
            {/* Precio */}
            <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-2 text-sm font-bold text-gray-800 shadow-lg backdrop-blur-sm">
              {formatCurrency(price)}
            </div>

            {/* Botón de agregar al carrito */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 transform">
              <Button
                variant={isInCart ? 'secondary' : 'default'}
                size="lg"
                className={`transform transition-all duration-300 ${
                  isInCart
                    ? 'bg-green-600 shadow-lg hover:bg-green-700'
                    : 'bg-white/95 text-gray-800 shadow-lg hover:bg-white hover:text-gray-900'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
              >
                {isInCart ? (
                  <>
                    <Heart className="mr-2 h-5 w-5" />
                    Agregada
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Agregar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Badge de "Nueva" */}
          <div className="absolute right-3 top-3">
            <Badge className="border-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
              <Sparkles className="mr-1 h-3 w-3" />
              Nueva
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
