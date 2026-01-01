'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, Circle, Square, Diamond,
  Plus, Minus, ArrowRight, Star, Info,
  Sparkles, Camera, Heart, Grid3x3,
  Calendar, Users, Download, ChevronDown,
  Eye, X, Check, ChevronLeft, Quote
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface UnifiedStoreEditorialProps {
  shareData: {
    token: string;
    type: 'event' | 'folder' | 'photos';
    event_id?: string;
    event_name?: string;
    folder_id?: string;
    folder_name?: string;
    photo_ids?: string[];
    photos?: Array<{
      id: string;
      storage_path: string;
      preview_path?: string;
      watermark_path?: string;
    }>;
  };
  studentInfo?: {
    id: string;
    first_name: string;
    last_name: string;
    qr_code: string;
  };
}

export default function UnifiedStoreEditorial({ shareData, studentInfo }: UnifiedStoreEditorialProps) {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'packages' | 'photos' | 'checkout'>('packages');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPhotoDetail, setShowPhotoDetail] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const packages = [
    {
      id: 'complete',
      name: 'COLECCIÓN',
      subtitle: 'COMPLETA',
      tagline: 'Todos los momentos del evento',
      photos: shareData.photos?.length || 156,
      price: 18500,
      originalPrice: 25000,
      discount: '26% OFF',
      color: 'bg-amber-50',
      accent: 'text-amber-600',
      border: 'border-amber-200',
      features: [
        'Acceso a todas las fotografías del evento',
        'Descarga en alta resolución sin marca de agua',
        'Diferentes formatos (digital y para impresión)',
        'Acceso durante 12 meses'
      ],
      testimonial: {
        text: 'La mejor inversión para conservar todos los recuerdos',
        author: 'María González, madre'
      },
      popular: true
    },
    {
      id: 'curated',
      name: 'SELECCIÓN',
      subtitle: 'CURADA',
      tagline: 'Las mejores tomas del día',
      photos: Math.min(45, shareData.photos?.length || 45),
      price: 6800,
      originalPrice: 8500,
      discount: '20% OFF',
      color: 'bg-slate-50',
      accent: 'text-slate-600',
      border: 'border-slate-200',
      features: [
        '45 fotografías cuidadosamente seleccionadas',
        'Los mejores momentos y retratos',
        'Alta resolución y edición profesional',
        'Acceso durante 6 meses'
      ],
      testimonial: {
        text: 'Perfecta selección de los momentos más especiales',
        author: 'Carlos Pérez, padre'
      }
    },
    {
      id: 'essential',
      name: 'MOMENTOS',
      subtitle: 'ESENCIALES',
      tagline: 'Lo imprescindible',
      photos: Math.min(20, shareData.photos?.length || 20),
      price: 4400,
      originalPrice: 5500,
      discount: '20% OFF',
      color: 'bg-stone-50',
      accent: 'text-stone-600',
      border: 'border-stone-200',
      features: [
        '20 fotografías icónicas del evento',
        'Momentos clave y mejores retratos',
        'Edición premium incluida',
        'Acceso durante 6 meses'
      ],
      testimonial: {
        text: 'Justo lo necesario para recordar este día',
        author: 'Ana Rodríguez, abuela'
      }
    }
  ];

  const categories = ['Todos', 'Ceremonia', 'Retratos', 'Grupos', 'Candids'];

  useEffect(() => {
    fetchPhotos();
  }, [shareData]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      let apiUrl = '';
      
      if (shareData.type === 'event' && shareData.event_id) {
        apiUrl = `/api/public/gallery/event/${shareData.event_id}/photos`;
      } else if (shareData.type === 'photos' && shareData.photo_ids) {
        apiUrl = `/api/public/photos?ids=${shareData.photo_ids.join(',')}`;
      } else if (shareData.photos) {
        // Use provided photos directly
        setPhotos(shareData.photos.map((photo, i) => ({
          ...photo,
          category: categories[1 + (i % 4)],
          featured: i % 7 === 0,
          student: studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `Estudiante ${Math.floor(i / 4) + 1}`
        })));
        setLoading(false);
        return;
      }

      if (apiUrl) {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success && data.photos) {
          setPhotos(data.photos.map((photo: any, i: number) => ({
            ...photo,
            category: categories[1 + (i % 4)],
            featured: i % 7 === 0,
            student: studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `Estudiante ${Math.floor(i / 4) + 1}`
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Error al cargar las fotos');
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = selectedCategory === 'Todos' 
    ? photos 
    : photos.filter(p => p.category === selectedCategory);

  const getTotalPrice = () => {
    const packagePrice = packages.find(p => p.id === selectedPackage)?.price || 0;
    const photosPrice = selectedPhotos.size * 1200;
    return packagePrice + photosPrice;
  };

  const getDiscountAmount = () => {
    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return 0;
    return pkg.originalPrice - pkg.price;
  };

  const handleCheckout = () => {
    const checkoutData = {
      token: shareData.token,
      packages: selectedPackage ? [selectedPackage] : [],
      photos: Array.from(selectedPhotos),
      total: getTotalPrice()
    };
    
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    router.push(`/store-unified/${shareData.token}`);
  };

  const getPhotoUrl = (photo: any) => {
    return photo.preview_path || photo.watermark_path || photo.storage_path || 
           `https://picsum.photos/600/800?random=${photo.id}`;
  };

  const getThumbnailUrl = (photo: any) => {
    return photo.preview_path || photo.watermark_path || photo.storage_path ||
           `https://picsum.photos/300/400?random=${photo.id}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white border-b border-gray-100"
      >
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-wider">LOOKESCOLAR</h1>
                  <p className="text-xs text-gray-500 tracking-wide">
                    {shareData.event_name || 'GALERÍA FOTOGRÁFICA'}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="hidden md:flex items-center gap-8">
                {[
                  { id: 'packages', label: 'PAQUETES' },
                  { id: 'photos', label: 'PERSONALIZAR' },
                  { id: 'checkout', label: 'FINALIZAR' }
                ].map((item, i) => (
                  <div key={item.id} className="flex items-center gap-8">
                    <button
                      className={`text-xs tracking-wider transition-all ${
                        step === item.id
                          ? 'font-semibold text-black'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${step === item.id 
                            ? 'bg-black text-white' 
                            : 'bg-gray-100 text-gray-400'
                          }
                        `}>
                          {i + 1}
                        </span>
                        {item.label}
                      </span>
                    </button>
                    {i < 2 && <span className="text-gray-200">―</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Summary */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500">TU SELECCIÓN</p>
                <p className="text-sm font-semibold">
                  {selectedPackage ? '1 paquete' : ''}
                  {selectedPackage && selectedPhotos.size > 0 ? ' + ' : ''}
                  {selectedPhotos.size > 0 ? `${selectedPhotos.size} fotos` : ''}
                  {!selectedPackage && selectedPhotos.size === 0 ? 'Vacía' : ''}
                </p>
              </div>
              <div className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">
                  {(selectedPackage ? 1 : 0) + selectedPhotos.size}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        {step === 'packages' && (
          <motion.div
            key="packages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero Section */}
            <section className="relative">
              <div className="max-w-[1400px] mx-auto px-8 py-16">
                <div className="grid grid-cols-12 gap-8">
                  {/* Text Content */}
                  <div className="col-span-5">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-sm text-gray-500 tracking-wider mb-4">
                        {shareData.event_name || shareData.folder_name || 'EVENTO ESPECIAL 2024'}
                      </p>
                      <h2 className="text-5xl font-light leading-tight mb-6">
                        Conserva los
                        <span className="block font-semibold">mejores momentos</span>
                      </h2>
                      <p className="text-gray-600 leading-relaxed mb-8">
                        Cada fotografía ha sido cuidadosamente capturada y editada 
                        para preservar la emoción y alegría de este día especial. 
                        Elige el paquete que mejor se adapte a tus necesidades.
                      </p>
                      
                      {/* Features */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Download, text: 'Descarga inmediata' },
                          { icon: Camera, text: 'Calidad profesional' },
                          { icon: Users, text: 'Para todos los invitados' },
                          { icon: Calendar, text: 'Acceso extendido' }
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <feature.icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                            <span className="text-sm text-gray-600">{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Image Collage */}
                  <div className="col-span-7">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="grid grid-cols-3 gap-4"
                    >
                      <div className="col-span-2 row-span-2">
                        <img 
                          src={photos[0] ? getPhotoUrl(photos[0]) : "https://picsum.photos/600/600?random=hero1"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <img 
                          src={photos[1] ? getPhotoUrl(photos[1]) : "https://picsum.photos/300/300?random=hero2"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <img 
                          src={photos[2] ? getPhotoUrl(photos[2]) : "https://picsum.photos/300/300?random=hero3"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            {/* Packages Section */}
            <section className="bg-gray-50 py-20">
              <div className="max-w-[1400px] mx-auto px-8">
                <div className="text-center mb-12">
                  <h3 className="text-sm tracking-wider text-gray-500 mb-2">SELECCIONA TU</h3>
                  <p className="text-3xl font-light">Paquete Fotográfico</p>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  {packages.map((pkg, i) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onHoverStart={() => setHoveredCard(pkg.id)}
                      onHoverEnd={() => setHoveredCard(null)}
                    >
                      <div
                        className={`
                          relative bg-white cursor-pointer transition-all
                          ${selectedPackage === pkg.id 
                            ? 'ring-2 ring-black shadow-xl' 
                            : 'hover:shadow-lg'
                          }
                        `}
                        onClick={() => setSelectedPackage(pkg.id)}
                      >
                        {/* Popular Badge */}
                        {pkg.popular && (
                          <div className="absolute -top-3 left-8 z-10">
                            <div className="bg-black text-white text-xs px-4 py-1.5 tracking-wider">
                              RECOMENDADO
                            </div>
                          </div>
                        )}

                        {/* Discount Badge */}
                        <div className="absolute top-6 right-6 bg-red-50 text-red-600 text-sm font-semibold px-3 py-1">
                          {pkg.discount}
                        </div>

                        {/* Package Content */}
                        <div className="p-8">
                          {/* Header */}
                          <div className="mb-8">
                            <h4 className="text-2xl font-light mb-1">
                              {pkg.name}
                              <span className="block text-3xl font-semibold">{pkg.subtitle}</span>
                            </h4>
                            <p className="text-sm text-gray-500 mt-2">{pkg.tagline}</p>
                          </div>

                          {/* Photo Count */}
                          <div className={`inline-flex items-center gap-3 px-4 py-3 ${pkg.color} rounded-lg mb-6`}>
                            <Grid3x3 className={`w-5 h-5 ${pkg.accent}`} strokeWidth={1.5} />
                            <span className={`text-sm font-medium ${pkg.accent}`}>
                              {pkg.photos} fotografías incluidas
                            </span>
                          </div>

                          {/* Features */}
                          <ul className="space-y-3 mb-8">
                            {pkg.features.map((feature, j) => (
                              <li key={j} className="flex items-start gap-3">
                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                                <span className="text-sm text-gray-600 leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Testimonial */}
                          <div className="border-t pt-6 mb-8">
                            <Quote className="w-6 h-6 text-gray-200 mb-3" />
                            <p className="text-sm text-gray-500 italic mb-2">
                              "{pkg.testimonial.text}"
                            </p>
                            <p className="text-xs text-gray-400">
                              — {pkg.testimonial.author}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="border-t pt-6">
                            <div className="flex items-baseline gap-3 mb-4">
                              <span className="text-3xl font-light">
                                {formatCurrency(pkg.price)}
                              </span>
                              <span className="text-lg text-gray-400 line-through">
                                {formatCurrency(pkg.originalPrice)}
                              </span>
                            </div>
                            
                            {/* Selection Button */}
                            <button
                              className={`
                                w-full py-3 font-medium tracking-wider text-sm transition-all
                                ${selectedPackage === pkg.id 
                                  ? 'bg-black text-white' 
                                  : 'bg-white text-black border border-gray-200 hover:bg-gray-50'
                                }
                              `}
                            >
                              {selectedPackage === pkg.id ? 'SELECCIONADO' : 'SELECCIONAR'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Continue Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-12"
                >
                  <button
                    onClick={() => setStep('photos')}
                    disabled={!selectedPackage}
                    className={`
                      inline-flex items-center gap-3 px-12 py-4 text-sm tracking-wider transition-all
                      ${selectedPackage 
                        ? 'bg-black text-white hover:bg-gray-800' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    CONTINUAR
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                    También puedes agregar fotos individuales en el siguiente paso
                  </p>
                </motion.div>
              </div>
            </section>
          </motion.div>
        )}

        {step === 'photos' && (
          <motion.div
            key="photos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="max-w-[1400px] mx-auto px-8 py-12">
              {/* Header */}
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-light mb-2">
                    Personaliza tu
                    <span className="block font-semibold">selección</span>
                  </h2>
                  <p className="text-gray-600">
                    Agrega fotos individuales a tu pedido • {formatCurrency(1200)} por fotografía
                  </p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded text-sm transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-white shadow-sm text-black' 
                          : 'text-gray-500'
                      }`}
                    >
                      Vista Grid
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded text-sm transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white shadow-sm text-black' 
                          : 'text-gray-500'
                      }`}
                    >
                      Vista Lista
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Info Bar */}
              {selectedPhotos.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          {selectedPhotos.size} fotografías adicionales seleccionadas
                        </p>
                        <p className="text-xs text-amber-700">
                          Subtotal: {formatCurrency(selectedPhotos.size * 1200)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPhotos(new Set())}
                      className="text-sm text-amber-600 hover:text-amber-700"
                    >
                      Limpiar selección
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Category Filter */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-sm text-gray-500">FILTRAR:</span>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`
                      px-4 py-2 text-sm transition-all
                      ${selectedCategory === cat 
                        ? 'bg-black text-white' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              ) : (
                <>
                  {/* Photo Grid/List */}
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-4 gap-6">
                      {filteredPhotos.map((photo, i) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className="group cursor-pointer"
                          onClick={() => {
                            const newSelection = new Set(selectedPhotos);
                            if (newSelection.has(photo.id)) {
                              newSelection.delete(photo.id);
                            } else {
                              newSelection.add(photo.id);
                            }
                            setSelectedPhotos(newSelection);
                          }}
                        >
                          <div className="relative aspect-[3/4] mb-3">
                            <img
                              src={getPhotoUrl(photo)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Featured Badge */}
                            {photo.featured && (
                              <div className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1">
                                DESTACADA
                              </div>
                            )}

                            {/* Selection Overlay */}
                            <div className={`
                              absolute inset-0 transition-all flex items-center justify-center
                              ${selectedPhotos.has(photo.id) 
                                ? 'bg-black/60' 
                                : 'bg-black/0 group-hover:bg-black/30'
                              }
                            `}>
                              {selectedPhotos.has(photo.id) ? (
                                <div className="bg-white rounded-full p-3">
                                  <Check className="w-6 h-6 text-black" strokeWidth={2} />
                                </div>
                              ) : (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-8 h-8 text-white" strokeWidth={1.5} />
                                </div>
                              )}
                            </div>

                            {/* Quick View */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPhotoDetail(photo.id);
                              }}
                              className="absolute bottom-2 right-2 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <Eye className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </div>

                          <div>
                            <p className="text-sm font-medium">{photo.student}</p>
                            <p className="text-xs text-gray-500">{photo.category}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPhotos.map((photo, i) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className={`
                            flex items-center gap-4 p-4 bg-white border rounded-lg cursor-pointer transition-all
                            ${selectedPhotos.has(photo.id) 
                              ? 'border-black shadow-md' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                          onClick={() => {
                            const newSelection = new Set(selectedPhotos);
                            if (newSelection.has(photo.id)) {
                              newSelection.delete(photo.id);
                            } else {
                              newSelection.add(photo.id);
                            }
                            setSelectedPhotos(newSelection);
                          }}
                        >
                          <img
                            src={getThumbnailUrl(photo)}
                            alt=""
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{photo.student}</p>
                            <p className="text-sm text-gray-500">{photo.category}</p>
                          </div>
                          {photo.featured && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                              DESTACADA
                            </span>
                          )}
                          <div className="text-sm font-medium">{formatCurrency(1200)}</div>
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                            ${selectedPhotos.has(photo.id) 
                              ? 'bg-black border-black' 
                              : 'border-gray-300'
                            }
                          `}>
                            {selectedPhotos.has(photo.id) && (
                              <Check className="w-4 h-4 text-white" strokeWidth={2} />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-12">
                <button
                  onClick={() => setStep('packages')}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">VOLVER</span>
                </button>
                <button
                  onClick={() => setStep('checkout')}
                  className="inline-flex items-center gap-3 px-12 py-4 bg-black text-white hover:bg-gray-800 transition-colors text-sm tracking-wider"
                >
                  PROCEDER AL PAGO
                  <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Photo Detail Modal */}
            <AnimatePresence>
              {showPhotoDetail && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
                  onClick={() => setShowPhotoDetail(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-white max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex h-full">
                      <div className="flex-1">
                        <img
                          src={getPhotoUrl(photos.find(p => p.id === showPhotoDetail) || {})}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="w-80 p-8">
                        <button
                          onClick={() => setShowPhotoDetail(null)}
                          className="ml-auto mb-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        
                        <h3 className="text-xl font-semibold mb-2">
                          {photos.find(p => p.id === showPhotoDetail)?.student}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {photos.find(p => p.id === showPhotoDetail)?.category}
                        </p>
                        
                        <div className="space-y-4 mb-8">
                          <div className="flex items-center justify-between py-3 border-b">
                            <span className="text-sm text-gray-600">Precio individual</span>
                            <span className="font-medium">{formatCurrency(1200)}</span>
                          </div>
                          <div className="flex items-center justify-between py-3 border-b">
                            <span className="text-sm text-gray-600">Resolución</span>
                            <span className="font-medium">Alta (300 DPI)</span>
                          </div>
                          <div className="flex items-center justify-between py-3 border-b">
                            <span className="text-sm text-gray-600">Formato</span>
                            <span className="font-medium">Digital</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const newSelection = new Set(selectedPhotos);
                            if (showPhotoDetail) {
                              if (newSelection.has(showPhotoDetail)) {
                                newSelection.delete(showPhotoDetail);
                              } else {
                                newSelection.add(showPhotoDetail);
                              }
                              setSelectedPhotos(newSelection);
                            }
                          }}
                          className={`
                            w-full py-3 text-sm tracking-wider transition-all
                            ${selectedPhotos.has(showPhotoDetail) 
                              ? 'bg-black text-white' 
                              : 'bg-white text-black border border-black hover:bg-gray-50'
                            }
                          `}
                        >
                          {selectedPhotos.has(showPhotoDetail) 
                            ? 'QUITAR DE LA SELECCIÓN' 
                            : 'AGREGAR A LA SELECCIÓN'
                          }
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-[1200px] mx-auto px-8 py-12"
          >
            <div className="grid grid-cols-12 gap-12">
              {/* Order Summary */}
              <div className="col-span-7">
                <h2 className="text-3xl font-light mb-8">
                  Resumen de tu
                  <span className="block font-semibold">pedido</span>
                </h2>

                <div className="bg-gray-50 p-8 mb-8">
                  {/* Package */}
                  {selectedPackage && (
                    <div className="pb-6 mb-6 border-b border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            {packages.find(p => p.id === selectedPackage)?.name} {packages.find(p => p.id === selectedPackage)?.subtitle}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {packages.find(p => p.id === selectedPackage)?.photos} fotografías profesionales
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {formatCurrency(packages.find(p => p.id === selectedPackage)?.price || 0)}
                          </p>
                          <p className="text-sm text-gray-500 line-through">
                            {formatCurrency(packages.find(p => p.id === selectedPackage)?.originalPrice || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded inline-block">
                        Ahorrás {formatCurrency(getDiscountAmount())}
                      </div>
                    </div>
                  )}

                  {/* Individual Photos */}
                  {selectedPhotos.size > 0 && (
                    <div className="pb-6 mb-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            Fotografías adicionales
                          </h4>
                          <p className="text-sm text-gray-600">
                            {selectedPhotos.size} fotos seleccionadas × {formatCurrency(1200)}
                          </p>
                        </div>
                        <p className="text-lg font-semibold">
                          {formatCurrency(selectedPhotos.size * 1200)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-semibold">Total a pagar</p>
                      <p className="text-sm text-gray-500">Impuestos incluidos</p>
                    </div>
                    <p className="text-4xl font-light">
                      {formatCurrency(getTotalPrice())}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Download, text: 'Descarga inmediata' },
                    { icon: Shield, text: 'Pago 100% seguro' },
                    { icon: Heart, text: 'Satisfacción garantizada' }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                      <benefit.icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                      <span className="text-sm">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Form */}
              <div className="col-span-5">
                <div className="bg-white border border-gray-200 p-8">
                  <h3 className="text-xl font-semibold mb-6">Información de contacto</h3>
                  
                  <form className="space-y-5" onSubmit={(e) => {
                    e.preventDefault();
                    handleCheckout();
                  }}>
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Nombre completo</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Correo electrónico</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="juan@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Teléfono</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>

                    <div className="pt-6">
                      <button
                        type="submit"
                        className="w-full py-4 bg-black text-white hover:bg-gray-800 transition-colors text-sm tracking-wider font-medium"
                      >
                        PROCEDER CON MERCADO PAGO
                      </button>
                      
                      <p className="text-xs text-center text-gray-500 mt-4">
                        Serás redirigido a Mercado Pago para completar el pago de forma segura
                      </p>
                    </div>
                  </form>
                </div>

                <button
                  onClick={() => setStep('photos')}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mt-6"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">Modificar selección</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
