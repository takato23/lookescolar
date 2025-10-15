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
  Download,
} from 'lucide-react';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';

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

interface ModernMinimalTemplateProps extends TemplateBaseProps {
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

export function ModernMinimalTemplate({
  settings,
  photos,
  token,
  subject,
  folderHierarchy: _folderHierarchy,
  onFolderNavigate: _onFolderNavigate,
  isNavigatingFolder: _isNavigatingFolder,
  isPreselected: _isPreselected = false,
  totalPhotos: _totalPhotos = 0
}: ModernMinimalTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { favorites, toggleFavorite: toggleFavoriteApi } = useTemplateFavorites(photos, token);
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

  const handleToggleFavorite = useCallback((photoId: string) => {
    toggleFavoriteApi(photoId).catch((err) => {
      console.error('No se pudo actualizar favoritos', err);
    });
  }, [toggleFavoriteApi]);

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center shadow-2xl border-0">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Compra Exitosa!
            </h2>
            <p className="text-gray-600 mb-6">
              Recibirás un email con los detalles de tu pedido y las fotos en alta calidad.
            </p>
            <Button 
              onClick={() => setCurrentStep('browse')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            >
              Volver a la Galería
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'checkout') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full shadow-2xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Finalizar Compra
              </h2>
              <p className="text-gray-600">
                Revisa tu pedido antes de continuar
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {cart.map((item, index) => {
                const photo = photos.find(p => p.id === item.photoId);
                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-100">
                    {photo && (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={photo.url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('browse')}
                className="flex-1 border-gray-200"
              >
                Volver
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar con Mercado Pago
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Elegant Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {settings.texts.hero_title}
                </h1>
                {subject && (
                  <p className="text-sm text-gray-600">
                    {subject.grade} {subject.section} - {subject.name}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowCart(!showCart)}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs px-1 bg-gray-900"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 py-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>
                
                {favorites.length > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
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
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light text-gray-900 mb-4">
            {settings.texts.hero_subtitle}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Encuentra los mejores momentos de tu experiencia escolar. 
            Fotos profesionales de alta calidad disponibles para descarga inmediata.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredPhotos.length}
            </div>
            <div className="text-sm text-gray-600">
              Fotos Disponibles
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {activeProducts.length}
            </div>
            <div className="text-sm text-gray-600">
              Productos
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {favorites.length}
            </div>
            <div className="text-sm text-gray-600">
              Favoritos
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div className="text-sm text-gray-600">
              En Carrito
            </div>
          </div>
        </div>

        {/* Products Showcase */}
        {activeProducts.length > 0 && (
          <section className="mb-16">
            <h3 className="text-2xl font-light text-gray-900 text-center mb-12">
              Productos Disponibles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {activeProducts.map(product => (
                <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Download className="h-6 w-6 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {product.description}
                    </p>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-light text-gray-900">
              Galería de Fotos
            </h3>
            <div className="text-sm text-gray-600">
              {filteredPhotos.length} de {photos.length} fotos
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <div className="aspect-square relative">
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    
                    {/* Actions */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(photo.id);
                          }}
                        className={`w-8 h-8 p-0 rounded-full ${
                          favorites.includes(photo.id) 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-white/90 hover:bg-white'
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${favorites.includes(photo.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                    {/* Quick view */}
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto(photo);
                        }}
                        className="w-full bg-white/90 hover:bg-white text-gray-900 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <CardContent className="p-4">
                    {photo.student && (
                      <p className="font-medium text-gray-900 text-sm truncate mb-1">
                        {photo.student}
                      </p>
                    )}
                    {photo.subject && (
                      <p className="text-xs text-gray-500 truncate">
                        {photo.subject}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Favorite indicator */}
                {favorites.includes(photo.id) && (
                  <div className="absolute top-2 left-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <Heart className="h-3 w-3 text-red-600 fill-current" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Carrito</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-500 mb-2 font-medium">Tu carrito está vacío</p>
                    <p className="text-sm text-gray-400">
                      Agrega fotos para comenzar tu compra
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto mb-6">
                    {cart.map((item, index) => {
                      const photo = photos.find(p => p.id === item.photoId);
                      return (
                        <Card key={index} className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              {photo && (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                  <img
                                    src={photo.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.productName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-6 w-6 p-0"
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

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-lg font-medium text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <Button 
                        onClick={handleCheckout}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                      >
                        Proceder al Pago
                        <ArrowRight className="h-4 w-4 ml-2" />
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
          className="fixed inset-0 bg-white z-50 overflow-y-auto"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {selectedPhoto.student || 'Foto Escolar'}
                  </h3>
                  {selectedPhoto.subject && (
                    <p className="text-gray-600">{selectedPhoto.subject}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(selectedPhoto.id);
                    }}
                    className={favorites.includes(selectedPhoto.id) ? 'text-red-600' : ''}
                  >
                    <Heart className={`h-4 w-4 ${favorites.includes(selectedPhoto.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div 
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image */}
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.alt}
                      className="w-full h-auto"
                    />
                  </Card>
                </div>

                {/* Products */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Selecciona un Producto
                    </h4>
                    <div className="space-y-4">
                      {activeProducts.map(product => (
                        <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h5 className="font-medium text-gray-900">
                                {product.name}
                              </h5>
                              <span className="text-lg font-bold text-gray-900">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                              {product.description}
                            </p>
                            <Button
                              onClick={() => {
                                addToCart(selectedPhoto.id, product.id);
                                setShowCart(true);
                              }}
                              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar al Carrito
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
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
