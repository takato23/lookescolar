'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Heart, ShoppingCart, Search, Filter,
  Star, Download, Share2, Grid, Square, Play,
  Sparkles, Image as ImageIcon, Package, Camera,
  ChevronRight, X, Plus, Minus, Check, Eye,
  Calendar, MapPin, Users, Zap, Gift, Crown,
  Shield, CheckCircle2, CreditCard, ArrowRight,
  Loader2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

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

interface UnifiedStoreModernProps {
  token: string;
  photos: Photo[];
  subject: Subject;
  onBack?: () => void;
  callbackBase?: 'share' | 'f' | 'store' | 'store-unified';
  initialStep?: string;
}

// Album packages (paquetes disponibles)
const getAlbumPackages = (photoCount: number) => [
  {
    id: 'all_photos',
    name: 'Álbum Completo',
    description: 'Todas las fotos del evento',
    photoCount: photoCount,
    originalPrice: 25000,
    price: 18500,
    discount: 26,
    popular: true,
    features: [`${photoCount} fotos en alta resolución`, 'Descarga ilimitada', 'Formatos múltiples', 'Acceso por 12 meses']
  },
  {
    id: 'grade_album',
    name: 'Álbum Parcial',
    description: 'Selección de fotos destacadas',
    photoCount: Math.floor(photoCount * 0.3),
    originalPrice: 8500,
    price: 6800,
    discount: 20,
    features: [`${Math.floor(photoCount * 0.3)} fotos seleccionadas`, 'Alta resolución', '6 meses de acceso', 'Compartir con invitados']
  },
  {
    id: 'mini_album',
    name: 'Álbum Esencial',
    description: 'Momentos más importantes',
    photoCount: Math.floor(photoCount * 0.15),
    originalPrice: 5500,
    price: 4400,
    discount: 20,
    features: [`${Math.floor(photoCount * 0.15)} fotos esenciales`, 'Momentos destacados', 'Calidad premium', '6 meses de acceso']
  }
];

export function UnifiedStoreModern({
  token,
  photos,
  subject,
  onBack,
  callbackBase = 'f',
  initialStep,
}: UnifiedStoreModernProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState(new Set<string>());
  const [selectedPhotos, setSelectedPhotos] = useState(new Set<string>());
  const [likedPhotos, setLikedPhotos] = useState(new Set<string>());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'albums'>('albums');
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [showCart, setShowCart] = useState(false);

  const albumPackages = getAlbumPackages(photos.length);

  const handleAddToCart = (packageId: string) => {
    setCartItems(prev => new Set([...prev, packageId]));
    toast.success('Agregado al carrito');
  };

  const handleSelectPhoto = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleLikePhoto = (photoId: string) => {
    setLikedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Prepare cart data
      const cartData = {
        token,
        packages: Array.from(cartItems),
        photos: Array.from(selectedPhotos),
        subject: subject
      };

      // Store in session for checkout process
      sessionStorage.setItem('checkoutData', JSON.stringify(cartData));

      // Navigate to checkout
      router.push(`/${callbackBase}/${token}/checkout`);
    } catch (error) {
      console.error('Error preparing checkout:', error);
      toast.error('Error al preparar el checkout');
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = searchTerm === '' || 
      photo.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || true; // Categories not implemented yet
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'Retratos', 'Grupales', 'Momentos', 'Ceremonia'];

  const getTotalPrice = () => {
    let total = 0;
    
    // Add package prices
    cartItems.forEach(packageId => {
      const pkg = albumPackages.find(p => p.id === packageId);
      if (pkg) total += pkg.price;
    });
    
    // Add individual photo prices (fixed price per photo)
    const photoPrice = 1200; // Precio por foto individual
    total += selectedPhotos.size * photoPrice;
    
    return total;
  };

  const getBulkDiscount = () => {
    const selectedCount = selectedPhotos.size;
    if (selectedCount >= 20) return 25;
    if (selectedCount >= 10) return 15;
    if (selectedCount >= 5) return 10;
    return 0;
  };

  const getDiscountedPrice = () => {
    const total = getTotalPrice();
    const discount = getBulkDiscount();
    return total * (1 - discount / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-pink-950 relative overflow-hidden">
      {/* Floating background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <motion.header 
        className="backdrop-blur-xl bg-white/[0.02] border-b border-white/10 sticky top-0 z-40"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <LiquidGlassButton variant="ghost" size="sm" onClick={onBack}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span className="font-medium text-white">Volver</span>
                </LiquidGlassButton>
              )}
              <div className="flex items-center gap-2">
                <Camera className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {subject.event.name}
                  </h1>
                  <p className="text-sm text-white/60">
                    {subject.event.school_name} • {subject.grade_section}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Cart Button */}
            <div className="flex items-center gap-3">
              <LiquidGlassButton 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCart(true)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span className="font-medium text-white">
                  Carrito ({cartItems.size + selectedPhotos.size})
                </span>
              </LiquidGlassButton>
              
              <LiquidGlassButton 
                variant="primary" 
                size="sm" 
                liquid
                onClick={handleCheckout}
                disabled={loading || (cartItems.size === 0 && selectedPhotos.size === 0)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                <span className="font-semibold">Comprar</span>
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard intensity="strong" className="p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-400" />
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm">
                  Evento Especial
                </Badge>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Revive los Mejores Momentos
              </h2>
              <p className="text-lg text-white/70 mb-6 max-w-3xl">
                Cada foto captura la emoción y alegría de este día especial. Elige entre nuestros paquetes 
                especiales o selecciona fotos individuales. ¡Ofertas exclusivas por tiempo limitado!
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-semibold">{photos.length} fotos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Hasta 25% OFF en paquetes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-400" />
                  <span className="text-white font-semibold">Descarga inmediata</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-white font-semibold">Calidad garantizada</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* View Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex gap-2">
              <LiquidGlassButton
                variant={viewMode === 'albums' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('albums')}
              >
                <Package className="w-4 h-4 mr-2" />
                <span className="font-medium text-white">Paquetes Especiales</span>
              </LiquidGlassButton>
              <LiquidGlassButton
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4 mr-2" />
                <span className="font-medium text-white">Fotos Individuales</span>
              </LiquidGlassButton>
            </div>

            {viewMode === 'grid' && (
              <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Busca fotos..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto">
                  {categories.map((category) => (
                    <LiquidGlassButton
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap"
                    >
                      <span className="font-medium text-white">
                        {category === 'all' ? 'Todas' : category}
                      </span>
                    </LiquidGlassButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <>
          {/* Albums View */}
          {viewMode === 'albums' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albumPackages.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <GlassCard 
                      intensity="strong" 
                      className={`p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300 ${
                        album.popular ? 'ring-2 ring-yellow-400/50' : ''
                      }`}
                    >
                      {album.popular && (
                        <div className="absolute -top-3 -right-3">
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold">
                            MÁS POPULAR
                          </Badge>
                        </div>
                      )}
                      
                      {album.discount > 0 && (
                        <div className="absolute top-4 left-4 z-10">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold">
                            -{album.discount}% OFF
                          </Badge>
                        </div>
                      )}

                      <div className="relative">
                        <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl mb-4 flex items-center justify-center">
                          <div className="grid grid-cols-2 gap-2 w-32 h-32">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="bg-white/20 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white/60" />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">{album.name}</h3>
                        <p className="text-white/70 text-sm mb-3">{album.description}</p>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span className="text-white/80 text-sm font-medium">
                            {album.photoCount} fotos incluidas
                          </span>
                        </div>

                        <div className="space-y-2 mb-6">
                          {album.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-white/70 text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mb-6">
                          <div>
                            {album.discount > 0 && (
                              <p className="text-white/50 line-through text-sm">
                                {formatCurrency(album.originalPrice)}
                              </p>
                            )}
                            <p className="text-white font-bold text-2xl">
                              {formatCurrency(album.price)}
                            </p>
                            {album.discount > 0 && (
                              <p className="text-green-400 text-sm font-medium">
                                Ahorrás {formatCurrency(album.originalPrice - album.price)}
                              </p>
                            )}
                          </div>
                        </div>

                        <LiquidGlassButton 
                          variant="primary" 
                          size="lg"
                          liquid
                          className="w-full"
                          onClick={() => handleAddToCart(album.id)}
                        >
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          <span className="font-bold">Agregar al Carrito</span>
                        </LiquidGlassButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Custom Package CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <GlassCard intensity="strong" className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">
                    ¿Prefieres elegir tus propias fotos?
                  </h3>
                  <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                    Explora toda la galería y selecciona exactamente las fotos que más te gusten. 
                    ¡Obtén descuentos automáticos por cantidad!
                  </p>
                  <LiquidGlassButton 
                    variant="primary" 
                    size="lg"
                    liquid
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-5 h-5 mr-2" />
                    <span className="font-bold">Ver Fotos Individuales</span>
                  </LiquidGlassButton>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              {/* Selection Controls */}
              {selectedPhotos.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="sticky top-20 z-30"
                >
                  <GlassCard intensity="strong" className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="text-white font-semibold">
                            {selectedPhotos.size} fotos seleccionadas
                          </span>
                        </div>
                        {getBulkDiscount() > 0 && (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                            -{getBulkDiscount()}% OFF
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {getBulkDiscount() > 0 && (
                            <p className="text-white/50 line-through text-sm">
                              {formatCurrency(getTotalPrice())}
                            </p>
                          )}
                          <p className="text-white font-bold text-xl">
                            {formatCurrency(getDiscountedPrice())}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <LiquidGlassButton 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPhotos(new Set())}
                          >
                            <span className="font-medium text-white">Limpiar</span>
                          </LiquidGlassButton>
                          <LiquidGlassButton 
                            variant="primary" 
                            size="sm"
                            liquid
                            onClick={handleCheckout}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            <span className="font-bold">Agregar al Carrito</span>
                          </LiquidGlassButton>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Bulk Discount Info */}
              <GlassCard intensity="medium" className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="text-white font-semibold text-sm">¡Descuentos por Cantidad!</p>
                    <p className="text-white/70 text-xs">
                      5+ fotos: 10% OFF • 10+ fotos: 15% OFF • 20+ fotos: 25% OFF
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredPhotos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: Math.min(0.05 * index, 0.5) }}
                    className="group"
                  >
                    <GlassCard 
                      intensity="medium" 
                      className={`p-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                        selectedPhotos.has(photo.id) 
                          ? 'ring-2 ring-blue-400 bg-blue-500/20' 
                          : 'hover:ring-1 hover:ring-white/30'
                      }`}
                      onClick={() => handleSelectPhoto(photo.id)}
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                        <img
                          src={photo.preview_url}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Selection overlay */}
                        <div className={`absolute inset-0 transition-all ${
                          selectedPhotos.has(photo.id) 
                            ? 'bg-blue-600/30' 
                            : 'bg-black/0 group-hover:bg-black/20'
                        }`}>
                          <div className="absolute top-2 right-2">
                            {selectedPhotos.has(photo.id) ? (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-white rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikePhoto(photo.id);
                              }}
                              className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                                likedPhotos.has(photo.id)
                                  ? 'bg-red-500/80 text-white'
                                  : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              <Heart className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPhoto(photo);
                                setShowLightbox(true);
                              }}
                              className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-white text-xs font-medium mb-1 truncate">
                          {photo.filename}
                        </p>
                        <p className="text-white font-bold text-sm">
                          {formatCurrency(1200)}
                        </p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Empty State */}
              {filteredPhotos.length === 0 && (
                <GlassCard className="p-12 text-center">
                  <ImageIcon className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No encontramos fotos
                  </h3>
                  <p className="text-white/60 mb-4">
                    Intenta ajustar los filtros o buscar con otros términos
                  </p>
                  <LiquidGlassButton 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                  >
                    <span className="font-medium">Limpiar Filtros</span>
                  </LiquidGlassButton>
                </GlassCard>
              )}
            </motion.div>
          )}
        </>

        {/* CTA Final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <GlassCard intensity="strong" className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              ¿Necesitas ayuda con tu pedido?
            </h3>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              Nuestro equipo está aquí para ayudarte. Contáctanos si tienes alguna pregunta 
              sobre las fotos, pagos o entregas.
            </p>
            <div className="flex gap-4 justify-center">
              <LiquidGlassButton variant="ghost" size="lg">
                <span className="font-semibold text-white">Chat en Vivo</span>
              </LiquidGlassButton>
              <LiquidGlassButton variant="primary" size="lg" liquid>
                <span className="font-bold">Soporte</span>
              </LiquidGlassButton>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {showLightbox && currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowLightbox(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <img
                src={currentPhoto.preview_url}
                alt={currentPhoto.filename}
                className="w-full h-auto rounded-xl"
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-xl">
                <h3 className="text-white text-xl font-bold mb-2">{currentPhoto.filename}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">{formatCurrency(1200)}</p>
                  </div>
                  <div className="flex gap-2">
                    <LiquidGlassButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleLikePhoto(currentPhoto.id)}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${likedPhotos.has(currentPhoto.id) ? 'text-red-400 fill-red-400' : ''}`} />
                      <span className="font-medium text-white">
                        {likedPhotos.has(currentPhoto.id) ? 'Quitar' : 'Me Gusta'}
                      </span>
                    </LiquidGlassButton>
                    <LiquidGlassButton 
                      variant="primary" 
                      size="sm"
                      liquid
                      onClick={() => {
                        handleSelectPhoto(currentPhoto.id);
                        setShowLightbox(false);
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      <span className="font-bold">
                        {selectedPhotos.has(currentPhoto.id) ? 'Quitar' : 'Seleccionar'}
                      </span>
                    </LiquidGlassButton>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
