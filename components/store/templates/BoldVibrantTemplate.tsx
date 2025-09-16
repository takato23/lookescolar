'use client';

import { useState, useCallback } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Heart, 
  Eye, 
  Plus,
  Minus,
  X,
  Filter,
  Search,
  CreditCard,
  ArrowRight,
  Check,
  Star,
  Download,
  Share2,
  Sparkles,
  Zap,
  Gift,
  Camera,
  Palette
} from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface Subject {
  name: string;
  grade: string;
  section: string;
}

interface BoldVibrantTemplateProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
  subject?: Subject;
  isPreselected?: boolean;
  totalPhotos?: number;
}

interface CartItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export function BoldVibrantTemplate({ 
  settings, 
  photos, 
  token,
  subject,
  isPreselected = false,
  totalPhotos = 0
}: BoldVibrantTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentStep, setCurrentStep] = useState<'browse' | 'checkout' | 'success'>('browse');

  const activeProducts = Object.entries(settings.products)
    .filter(([_, product]) => product.enabled)
    .map(([id, product]) => ({ id, ...product }));

  const addToCart = useCallback((photoId: string, productId: string) => {
    const product = activeProducts.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const existingItem = prev.find(
        item => item.photoId === photoId && item.productId === productId
      );

      if (existingItem) {
        return prev.map(item =>
          item.photoId === photoId && item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        photoId,
        productId,
        productName: product.name,
        price: product.price,
        quantity: 1,
      }];
    });
  }, [activeProducts]);

  const removeFromCart = useCallback((photoId: string, productId: string) => {
    setCart(prev => prev.filter(
      item => !(item.photoId === photoId && item.productId === productId)
    ));
  }, []);

  const updateQuantity = useCallback((photoId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId, productId);
      return;
    }

    setCart(prev => prev.map(item =>
      item.photoId === photoId && item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  }, [removeFromCart]);

  const toggleFavorite = useCallback((photoId: string) => {
    setFavorites(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  }, []);

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings.currency || 'ARS',
    }).format(price);
  };

  const filteredPhotos = photos.filter(photo => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      photo.student?.toLowerCase().includes(searchLower) ||
      photo.subject?.toLowerCase().includes(searchLower) ||
      photo.alt.toLowerCase().includes(searchLower)
    );
  });

  const handleCheckout = async () => {
    setCurrentStep('checkout');
    // Simulate checkout process
    setTimeout(() => {
      setCurrentStep('success');
      setCart([]);
    }, 2000);
  };

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-bounce delay-300"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-ping"></div>
        </div>

        <Card className="max-w-md w-full text-center shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Check className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              ¡Compra Exitosa!
            </h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-semibold text-gray-700">¡Increíble elección!</span>
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-gray-600 mb-8">
              Recibirás un email con los detalles de tu pedido y las fotos en alta calidad.
            </p>
            <Button 
              onClick={() => setCurrentStep('browse')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Camera className="h-5 w-5 mr-2" />
              Volver a la Galería
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'checkout') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-bounce delay-500"></div>
        </div>

        <Card className="max-w-2xl w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Finalizar Compra
              </h2>
              <p className="text-gray-600 text-lg">
                Revisa tu pedido antes de continuar
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {cart.map((item, index) => {
                const photo = photos.find(p => p.id === item.photoId);
                return (
                  <div key={index} className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl"></div>
                    <div className="relative flex items-center space-x-4 p-4 bg-white/80 rounded-xl border border-purple-200">
                      {photo && (
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden shadow-md">
                          <img
                            src={photo.url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">
                          {item.productName}
                        </p>
                        <p className="text-sm text-purple-600 font-medium">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-8 border border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total:</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('browse')}
                className="flex-1 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 font-semibold"
              >
                Volver
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Pagar con Mercado Pago
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Vibrant Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-gradient-to-r from-purple-400 to-pink-400">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5"></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo/Title */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {settings.texts.hero_title}
                </h1>
                {subject && (
                  <p className="text-sm font-semibold text-gray-600">
                    {subject.grade} {subject.section} - {subject.name}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex border-2 border-purple-200 text-purple-600 hover:bg-purple-50 font-semibold"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              
              <Button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 min-w-[24px] h-6 text-xs px-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-orange-900 font-bold shadow-lg animate-pulse"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="border-t border-purple-200 py-6 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Buscar por estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 text-sm bg-white/80 backdrop-blur-sm font-medium"
                  />
                </div>
                
                {favorites.length > 0 && (
                  <Badge className="bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold px-4 py-2 text-sm shadow-lg">
                    <Heart className="h-4 w-4 mr-2 fill-current" />
                    {favorites.length} favoritos
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 to-pink-100/30 rounded-3xl blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Sparkles className="h-8 w-8 text-yellow-500" />
              <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                {settings.texts.hero_subtitle}
              </h2>
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              ✨ Descubre los mejores momentos de tu experiencia escolar ✨
              <br />
              Fotos profesionales de alta calidad con descarga inmediata 🚀
            </p>
          </div>
        </div>

        {/* Animated Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {[
            { label: 'Fotos Disponibles', value: filteredPhotos.length, icon: Camera, color: 'from-blue-500 to-purple-500' },
            { label: 'Productos', value: activeProducts.length, icon: Gift, color: 'from-purple-500 to-pink-500' },
            { label: 'Favoritos', value: favorites.length, icon: Heart, color: 'from-pink-500 to-red-500' },
            { label: 'En Carrito', value: cart.reduce((sum, item) => sum + item.quantity, 0), icon: ShoppingCart, color: 'from-orange-500 to-yellow-500' }
          ].map(({ label, value, icon: Icon, color }, index) => (
            <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent mb-2`}>
                  {value}
                </div>
                <div className="text-sm font-semibold text-gray-600">
                  {label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Products Showcase */}
        {activeProducts.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Palette className="h-8 w-8 text-purple-500" />
                <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Productos Increíbles
                </h3>
                <Palette className="h-8 w-8 text-pink-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {activeProducts.map((product, index) => {
                const colors = [
                  'from-blue-500 to-purple-500',
                  'from-purple-500 to-pink-500',
                  'from-pink-500 to-red-500',
                  'from-red-500 to-orange-500',
                  'from-orange-500 to-yellow-500',
                  'from-green-500 to-blue-500'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <Card key={product.id} className="border-0 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 overflow-hidden bg-white">
                    <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                    <CardContent className="p-8 text-center relative">
                      <div className="absolute top-4 right-4">
                        <Zap className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                        <Download className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-3">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-6 font-medium">
                        {product.description}
                      </p>
                      <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                        {formatPrice(product.price)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Galería de Fotos
            </h3>
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm px-4 py-2 shadow-lg">
              {filteredPhotos.length} de {photos.length} fotos
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {filteredPhotos.map((photo, index) => {
              const borderColors = [
                'from-blue-400 to-purple-400',
                'from-purple-400 to-pink-400',
                'from-pink-400 to-red-400',
                'from-red-400 to-orange-400',
                'from-orange-400 to-yellow-400',
                'from-green-400 to-blue-400'
              ];
              const borderColor = borderColors[index % borderColors.length];
              
              return (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 bg-white">
                    <div className={`h-1 bg-gradient-to-r ${borderColor}`}></div>
                    <div className="aspect-square relative">
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      
                      {/* Animated overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-transparent group-hover:from-black/30 group-hover:to-purple-500/20 transition-all duration-300" />
                      
                      {/* Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                          className={`w-10 h-10 p-0 rounded-full shadow-lg transition-all transform hover:scale-110 ${
                            favorites.includes(photo.id) 
                              ? 'bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500' 
                              : 'bg-white/90 hover:bg-white text-gray-700'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(photo.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>

                      {/* Quick view */}
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                          }}
                          className={`w-full bg-gradient-to-r ${borderColor} hover:shadow-lg text-white text-sm font-bold shadow-md transition-all transform hover:scale-105`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    </div>

                    {/* Photo Info */}
                    <CardContent className="p-4 bg-gradient-to-r from-gray-50 to-white">
                      {photo.student && (
                        <p className="font-bold text-gray-900 text-sm truncate mb-1">
                          {photo.student}
                        </p>
                      )}
                      {photo.subject && (
                        <p className="text-xs text-purple-600 font-semibold truncate">
                          {photo.subject}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute -top-2 -left-2 z-10">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <Heart className="h-4 w-4 text-white fill-current" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 z-40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l-4 border-gradient-to-b from-purple-400 to-pink-400">
            <div className="p-6 h-full flex flex-col bg-gradient-to-b from-white to-purple-50/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Mi Carrito
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                  className="hover:bg-purple-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingCart className="h-12 w-12 text-purple-400" />
                    </div>
                    <p className="text-gray-500 mb-2 font-bold text-lg">Tu carrito está vacío</p>
                    <p className="text-sm text-gray-400">
                      ¡Agrega fotos increíbles para comenzar! ✨
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto mb-6">
                    {cart.map((item, index) => {
                      const photo = photos.find(p => p.id === item.photoId);
                      const colors = [
                        'from-blue-400 to-purple-400',
                        'from-purple-400 to-pink-400',
                        'from-pink-400 to-red-400'
                      ];
                      const color = colors[index % colors.length];
                      
                      return (
                        <Card key={index} className="border-0 shadow-lg overflow-hidden bg-white">
                          <div className={`h-1 bg-gradient-to-r ${color}`}></div>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              {photo && (
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden shadow-md">
                                  <img
                                    src={photo.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                  {item.productName}
                                </p>
                                <p className={`text-xs font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-8 w-8 p-0 hover:bg-purple-100"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-bold min-w-[24px] text-center bg-purple-100 px-2 py-1 rounded">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-8 w-8 p-0 hover:bg-purple-100"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xl font-bold text-gray-900">Total:</span>
                        <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <Button 
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        Proceder al Pago
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-purple-900/90 to-pink-900/90 z-50 overflow-y-auto backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {selectedPhoto.student || 'Foto Escolar'}
                  </h3>
                  {selectedPhoto.subject && (
                    <p className="text-gray-600 font-semibold text-lg">{selectedPhoto.subject}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(selectedPhoto.id);
                    }}
                    className={`w-12 h-12 p-0 rounded-full transition-all transform hover:scale-110 ${
                      favorites.includes(selectedPhoto.id) 
                        ? 'bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500' 
                        : 'bg-white border-2 border-purple-200 text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${favorites.includes(selectedPhoto.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    onClick={() => setSelectedPhoto(null)}
                    className="w-12 h-12 p-0 rounded-full bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div 
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image */}
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-2xl overflow-hidden bg-white">
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.alt}
                      className="w-full h-auto"
                    />
                  </Card>
                </div>

                {/* Products */}
                <div className="space-y-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                    <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
                      🎉 Selecciona un Producto
                    </h4>
                    <div className="space-y-4">
                      {activeProducts.map((product, index) => {
                        const colors = [
                          'from-blue-500 to-purple-500',
                          'from-purple-500 to-pink-500',
                          'from-pink-500 to-red-500',
                          'from-red-500 to-orange-500'
                        ];
                        const color = colors[index % colors.length];
                        
                        return (
                          <Card key={product.id} className="border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden bg-white">
                            <div className={`h-1 bg-gradient-to-r ${color}`}></div>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <h5 className="font-bold text-gray-900 text-lg">
                                  {product.name}
                                </h5>
                                <span className={`text-xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-6 font-medium">
                                {product.description}
                              </p>
                              <Button
                                onClick={() => {
                                  addToCart(selectedPhoto.id, product.id);
                                  setShowCart(true);
                                }}
                                className={`w-full bg-gradient-to-r ${color} hover:shadow-lg text-white font-bold text-lg py-3 transition-all transform hover:scale-105`}
                              >
                                <Plus className="h-5 w-5 mr-2" />
                                Agregar al Carrito
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}