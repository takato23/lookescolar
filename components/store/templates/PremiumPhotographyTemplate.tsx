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
  _Star,
  Download,
  Camera,
  Award,
  Crown,
  Aperture,
  Focus,
  Image,
  Layers,
  _Play,
} from 'lucide-react';
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

interface PremiumPhotographyTemplateProps {
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

export function PremiumPhotographyTemplate({ 
  settings, 
  photos, 
  token,
  subject,
  isPreselected: _isPreselected = false,
  totalPhotos: _totalPhotos = 0,
}: PremiumPhotographyTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { favorites, toggleFavorite: toggleFavoriteApi } = useTemplateFavorites(photos, token);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentStep, setCurrentStep] = useState<'browse' | 'checkout' | 'success'>('browse');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry' | 'fullscreen'>('grid');

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Cinematic background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/5 rounded-full blur-2xl animate-pulse delay-700"></div>
        </div>

        <Card className="max-w-lg w-full text-center bg-zinc-900/90 backdrop-blur-xl border-amber-500/20 shadow-2xl relative z-10">
          <CardContent className="p-10">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Check className="h-12 w-12 text-black font-bold" />
            </div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Crown className="h-6 w-6 text-amber-400" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                Compra Premium
              </h2>
              <Crown className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-emerald-400" />
              <span className="text-xl font-bold text-zinc-300">Completada con Éxito</span>
              <Award className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-zinc-400 mb-8 text-lg leading-relaxed">
              Tu pedido ha sido procesado. Recibirás las fotos en máxima calidad 
              junto con certificado de autenticidad digital.
            </p>
            <Button 
              onClick={() => setCurrentStep('browse')}
              className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-black text-lg py-4 shadow-2xl hover:shadow-amber-500/25 transition-all font-bold"
            >
              <Camera className="h-5 w-5 mr-2" />
              Volver a la Galería Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'checkout') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Cinematic background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent"></div>
        </div>

        <Card className="max-w-3xl w-full bg-zinc-900/95 backdrop-blur-xl border-amber-500/30 shadow-2xl relative z-10">
          <CardContent className="p-10">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Aperture className="h-8 w-8 text-amber-400" />
                <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                  Finalizar Compra Premium
                </h2>
                <Aperture className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-zinc-400 text-xl">
                Revisa tu selección de fotografías profesionales
              </p>
            </div>

            <div className="space-y-6 mb-10">
              {cart.map((item, index) => {
                const photo = photos.find(p => p.id === item.photoId);
                return (
                  <div key={index} className="bg-zinc-800/50 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center space-x-6">
                      {photo && (
                        <div className="w-20 h-20 bg-zinc-700 rounded-xl overflow-hidden shadow-xl border border-amber-500/20">
                          <img
                            src={photo.url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xl font-bold text-white mb-2">
                          {item.productName}
                        </p>
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                          <span className="text-sm text-zinc-400 font-medium">
                            Cantidad: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 rounded-2xl p-8 mb-10 border border-amber-500/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Award className="h-6 w-6 text-amber-400" />
                  <span className="text-2xl font-bold text-white">Total Premium:</span>
                </div>
                <span className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
            </div>

            <div className="flex space-x-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('browse')}
                className="flex-1 border-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-500 text-lg py-3 bg-transparent"
              >
                Continuar Navegando
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-black text-lg py-3 shadow-2xl hover:shadow-amber-500/25 transition-all font-bold"
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
    <div className="min-h-screen bg-black text-white">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-amber-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-emerald-500/5"></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Premium Logo/Title */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Aperture className="h-8 w-8 text-black" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                    {settings.texts.hero_title}
                  </h1>
                  <Crown className="h-5 w-5 text-amber-400" />
                </div>
                {subject && (
                  <p className="text-sm font-medium text-zinc-400">
                    {subject.grade} {subject.section} • {subject.name}
                  </p>
                )}
              </div>
            </div>

            {/* Premium Actions */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {viewMode === 'grid' ? 'Mosaico' : 'Cuadrícula'}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
              
              <Button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-black shadow-2xl hover:shadow-amber-500/25 transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 min-w-[24px] h-6 text-xs px-2 bg-amber-400 text-black font-bold shadow-lg animate-pulse"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Premium Search and Filters */}
          {showFilters && (
            <div className="border-t border-amber-500/20 py-6 bg-gradient-to-r from-amber-500/5 to-emerald-500/5">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-400" />
                  <input
                    type="text"
                    placeholder="Buscar fotografías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent text-white placeholder-zinc-400 backdrop-blur-sm"
                  />
                </div>
                
                {favorites.length > 0 && (
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-4 py-2 shadow-lg">
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
        {/* Premium Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-emerald-500/5 rounded-3xl blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Award className="h-10 w-10 text-amber-400" />
              <h2 className="text-6xl font-bold bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
                {settings.texts.hero_subtitle}
              </h2>
              <Award className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-2xl text-zinc-300 max-w-4xl mx-auto font-light leading-relaxed">
              Fotografía escolar de <span className="text-amber-400 font-semibold">máxima calidad profesional</span>
              <br />
              Capturando momentos únicos con <span className="text-emerald-400 font-semibold">técnica artística superior</span>
            </p>
          </div>
        </div>

        {/* Premium Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {[
            { label: 'Fotografías Premium', value: filteredPhotos.length, icon: Camera, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Productos Exclusivos', value: activeProducts.length, icon: Crown, gradient: 'from-emerald-500 to-teal-500' },
            { label: 'Colección Personal', value: favorites.length, icon: Heart, gradient: 'from-red-500 to-pink-500' },
            { label: 'Seleccionados', value: cart.reduce((sum, item) => sum + item.quantity, 0), icon: ShoppingCart, gradient: 'from-purple-500 to-indigo-500' }
          ].map(({ label, value, icon: Icon, gradient }, index) => (
            <Card key={index} className="bg-zinc-900/50 border-amber-500/20 backdrop-blur-sm hover:bg-zinc-800/50 transition-all group">
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl group-hover:scale-110 transition-transform`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}>
                  {value}
                </div>
                <div className="text-sm font-medium text-zinc-400">
                  {label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Premium Products Showcase */}
        {activeProducts.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Focus className="h-8 w-8 text-amber-400" />
                <h3 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                  Colección Premium
                </h3>
                <Focus className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
                Productos fotográficos de calidad profesional con acabados de lujo
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {activeProducts.map((product, index) => {
                const gradients = [
                  'from-amber-500 to-orange-500',
                  'from-emerald-500 to-teal-500',
                  'from-purple-500 to-indigo-500',
                  'from-red-500 to-pink-500',
                  'from-blue-500 to-cyan-500',
                  'from-green-500 to-lime-500'
                ];
                const gradient = gradients[index % gradients.length];
                
                return (
                  <Card key={product.id} className="bg-zinc-900/50 border-amber-500/20 backdrop-blur-sm hover:bg-zinc-800/50 transition-all group overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${gradient}`}></div>
                    <CardContent className="p-8 text-center relative">
                      <div className="absolute top-4 right-4">
                        <Crown className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className={`w-20 h-20 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform`}>
                        <Download className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-3">
                        {product.name}
                      </h4>
                      <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                        {product.description}
                      </p>
                      <div className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                        {formatPrice(product.price)}
                      </div>
                      <Badge className="mt-4 bg-amber-500/20 text-amber-300 border-amber-500/30">
                        <Award className="h-3 w-3 mr-1" />
                        Premium Quality
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Premium Photo Gallery */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Image className="h-8 w-8 text-amber-400" />
              <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                Galería Profesional
              </h3>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-zinc-800 text-zinc-300 border border-amber-500/30 px-4 py-2">
                {filteredPhotos.length} de {photos.length} fotografías
              </Badge>
            </div>
          </div>

          <div className={viewMode === 'masonry' 
            ? "columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6"
            : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8"
          }>
            {filteredPhotos.map((photo, index) => {
              const gradients = [
                'from-amber-400 to-orange-400',
                'from-emerald-400 to-teal-400',
                'from-purple-400 to-indigo-400',
                'from-red-400 to-pink-400',
                'from-blue-400 to-cyan-400'
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <div
                  key={photo.id}
                  className={`group relative cursor-pointer ${viewMode === 'masonry' ? 'break-inside-avoid' : ''}`}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Card className="overflow-hidden bg-zinc-900/30 border-amber-500/20 backdrop-blur-sm hover:bg-zinc-800/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-amber-500/20">
                    <div className={`h-0.5 bg-gradient-to-r ${gradient}`}></div>
                    <div className={viewMode === 'masonry' ? 'relative' : 'aspect-square relative'}>
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        className={`w-full ${viewMode === 'masonry' ? 'h-auto' : 'h-full'} object-cover group-hover:scale-110 transition-transform duration-500`}
                      />
                      
                      {/* Premium overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      
                      {/* Premium badge */}
                      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Badge className="bg-amber-500/90 text-black font-bold backdrop-blur-sm">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      </div>
                      
                      {/* Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(photo.id);
                            }}
                          className={`w-10 h-10 p-0 rounded-full backdrop-blur-sm shadow-xl transition-all transform hover:scale-110 ${
                            favorites.includes(photo.id) 
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600' 
                              : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-amber-500/30'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(photo.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>

                      {/* Premium view button */}
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                          }}
                          className={`w-full bg-gradient-to-r ${gradient} hover:shadow-xl text-black text-sm font-bold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Vista Premium
                        </Button>
                      </div>
                    </div>

                    {/* Photo Info */}
                    <CardContent className="p-4 bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm">
                      {photo.student && (
                        <p className="font-bold text-white text-sm truncate mb-1">
                          {photo.student}
                        </p>
                      )}
                      {photo.subject && (
                        <p className="text-xs text-amber-400 font-medium truncate">
                          {photo.subject}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Premium favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute -top-2 -left-2 z-10">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
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

      {/* Premium Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900/95 shadow-2xl z-50 border-l border-amber-500/30 backdrop-blur-xl">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-amber-400" />
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                    Carrito Premium
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                  className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                      <ShoppingCart className="h-12 w-12 text-amber-400" />
                    </div>
                    <p className="text-zinc-300 mb-2 font-bold text-xl">Carrito Premium Vacío</p>
                    <p className="text-sm text-zinc-500">
                      Selecciona fotografías profesionales para comenzar
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto mb-6">
                    {cart.map((item, index) => {
                      const photo = photos.find(p => p.id === item.photoId);
                      const gradients = [
                        'from-amber-400 to-orange-400',
                        'from-emerald-400 to-teal-400',
                        'from-purple-400 to-indigo-400'
                      ];
                      const gradient = gradients[index % gradients.length];
                      
                      return (
                        <Card key={index} className="bg-zinc-800/50 border-amber-500/20 backdrop-blur-sm overflow-hidden">
                          <div className={`h-0.5 bg-gradient-to-r ${gradient}`}></div>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              {photo && (
                                <div className="w-16 h-16 bg-zinc-700 rounded-xl overflow-hidden shadow-xl border border-amber-500/20">
                                  <img
                                    src={photo.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                  {item.productName}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                    <Crown className="h-2 w-2 mr-1" />
                                    Premium
                                  </Badge>
                                  <p className={`text-xs font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                                    {formatPrice(item.price)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-8 w-8 p-0 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-bold min-w-[28px] text-center bg-amber-500/20 text-amber-300 px-2 py-1 rounded border border-amber-500/30">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-8 w-8 p-0 hover:bg-zinc-700 text-zinc-400 hover:text-white"
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

                  <Card className="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-amber-500/30 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-2">
                          <Award className="h-6 w-6 text-amber-400" />
                          <span className="text-xl font-bold text-white">Total Premium:</span>
                        </div>
                        <span className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <Button 
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-black h-14 text-lg font-bold shadow-2xl hover:shadow-amber-500/25 transition-all"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Checkout Premium
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

      {/* Premium Photo Detail Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 overflow-y-auto backdrop-blur-xl"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
              {/* Premium Modal Header */}
              <div className="flex items-center justify-between mb-8 bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-amber-500/20">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Camera className="h-8 w-8 text-amber-400" />
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                      {selectedPhoto.student || 'Fotografía Premium'}
                    </h3>
                    <Crown className="h-6 w-6 text-amber-400" />
                  </div>
                  {selectedPhoto.subject && (
                    <p className="text-zinc-300 font-semibold text-lg">{selectedPhoto.subject}</p>
                  )}
                  <Badge className="mt-2 bg-amber-500/20 text-amber-300 border-amber-500/30">
                    <Award className="h-3 w-3 mr-1" />
                    Calidad Profesional
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(selectedPhoto.id);
                    }}
                    className={`w-14 h-14 p-0 rounded-full backdrop-blur-sm shadow-xl transition-all transform hover:scale-110 ${
                      favorites.includes(selectedPhoto.id) 
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600' 
                        : 'bg-zinc-800 border-2 border-amber-500/30 text-amber-400 hover:bg-zinc-700'
                    }`}
                  >
                    <Heart className={`h-6 w-6 ${favorites.includes(selectedPhoto.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    onClick={() => setSelectedPhoto(null)}
                    className="w-14 h-14 p-0 rounded-full bg-zinc-800 border-2 border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-white backdrop-blur-sm"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div 
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Premium Image Display */}
                <div className="lg:col-span-2">
                  <Card className="bg-zinc-900/50 border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-xl">
                    <div className="relative group">
                      <img
                        src={selectedPhoto.url}
                        alt={selectedPhoto.alt}
                        className="w-full h-auto"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </Card>
                </div>

                {/* Premium Products */}
                <div className="space-y-6">
                  <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-amber-500/20">
                    <div className="flex items-center space-x-3 mb-6">
                      <Focus className="h-6 w-6 text-amber-400" />
                      <h4 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                        Productos Premium
                      </h4>
                    </div>
                    <div className="space-y-4">
                      {activeProducts.map((product, index) => {
                        const gradients = [
                          'from-amber-500 to-orange-500',
                          'from-emerald-500 to-teal-500',
                          'from-purple-500 to-indigo-500',
                          'from-red-500 to-pink-500'
                        ];
                        const gradient = gradients[index % gradients.length];
                        
                        return (
                          <Card key={product.id} className="bg-zinc-800/50 border-amber-500/20 hover:bg-zinc-700/50 transition-all group overflow-hidden backdrop-blur-sm">
                            <div className={`h-0.5 bg-gradient-to-r ${gradient}`}></div>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center`}>
                                    <Download className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-white text-lg">
                                      {product.name}
                                    </h5>
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                      <Crown className="h-2 w-2 mr-1" />
                                      Premium
                                    </Badge>
                                  </div>
                                </div>
                                <span className={`text-xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                {product.description}
                              </p>
                              <Button
                                onClick={() => {
                                  addToCart(selectedPhoto.id, product.id);
                                  setShowCart(true);
                                }}
                                className={`w-full bg-gradient-to-r ${gradient} hover:shadow-xl text-white font-bold text-lg py-3 transition-all transform hover:scale-105`}
                              >
                                <Plus className="h-5 w-5 mr-2" />
                                Agregar al Carrito Premium
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
