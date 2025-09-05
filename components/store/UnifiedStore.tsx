'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import type { CheckoutStep } from '@/lib/stores/unified-store';
import { PRODUCT_CATALOG } from '@/lib/types/unified-store';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Image,
  Users,
  User,
  MapPin,
  CreditCard,
  Loader2,
  CheckCircle,
  Star,
  Heart,
  Camera,
  Gift,
  Truck,
  Shield,
  Zap,
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

interface UnifiedStoreProps {
  token: string;
  photos: Photo[];
  subject: Subject;
  onBack?: () => void;
  // Controls which base path MercadoPago callbacks return to
  // Defaults to 'f' to preserve existing flows (/f/[token]/payment/*)
  callbackBase?: 'share' | 'f' | 'store' | 'store-unified';
  // Optional initial step to support deep links (e.g., step=contact)
  initialStep?: CheckoutStep;
}

// Validation schemas
const ContactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  street: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'La provincia es requerida'),
  zipCode: z.string().min(4, 'Código postal inválido'),
});

export function UnifiedStore({
  token,
  photos,
  subject,
  onBack,
  callbackBase = 'f',
  initialStep,
}: UnifiedStoreProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    // State
    selectedPackage,
    selectedPhotos,
    cartItems,
    checkoutStep,
    contactInfo,

    // Actions
    setToken,
    setEventInfo,
    selectPackage,
    selectIndividualPhoto,
    selectGroupPhoto,
    addToCart,
    updateCartItemQuantity,
    setContactInfo,
    nextStep,
    prevStep,
    setStep,
    canProceedToNextStep,
    getTotalPrice,
    getAdditionsPrice,
    createOrder,
  } = useUnifiedStore();

  // Local state for contact form and payment
  const [contactForm, setContactForm] = useState({
    name: contactInfo?.name || '',
    email: contactInfo?.email || '',
    phone: contactInfo?.phone || '',
    street: contactInfo?.address?.street || '',
    city: contactInfo?.address?.city || '',
    state: contactInfo?.address?.state || '',
    zipCode: contactInfo?.address?.zipCode || '',
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>(
    {}
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // Gallery category helpers (para filtros visuales tipo mock)
  const CATEGORY_LABELS = [
    'Categoría 1',
    'Categoría 2',
    'Categoría 3',
    'Categoría 4',
    'Categoría 5',
    'Categoría 6',
  ];
  const CATEGORY_GRADIENTS = [
    'from-pink-300 to-pink-400',
    'from-rose-300 to-red-400',
    'from-orange-300 to-amber-400',
    'from-amber-300 to-yellow-400',
    'from-sky-300 to-cyan-400',
    'from-emerald-300 to-teal-400',
  ];
  const getCategoryIndex = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h % 6; // 0..5 determinístico
  };
  const [activeCategoryInd, setActiveCategoryInd] = useState<number | null>(null);
  const [activeCategoryGrp, setActiveCategoryGrp] = useState<number | null>(null);
  const PAGE_SIZE = 12;
  const [pageInd, setPageInd] = useState(0);
  const [pageGrp, setPageGrp] = useState(0);

  // Initialize store
  useEffect(() => {
    setToken(token);
    setEventInfo({
      name: subject.event.name,
      schoolName: subject.event.school_name,
      gradeSection: subject.grade_section,
    });
  }, [token, subject, setToken, setEventInfo]);

  // Apply initial step from props (if provided and valid)
  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    }
  }, [initialStep, setStep]);

  // Load favorites for legacy share tokens to keep identity with public gallery
  useEffect(() => {
    const isShareToken = /^[a-f0-9]{64}$/i.test(token);
    if (!isShareToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/share/${token}/favorites`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.favorites)) {
          setFavoriteIds(new Set<string>(data.favorites));
        }
      } catch {}
    })();
  }, [token]);

  // Get event theme
  const eventTheme = (subject.event.theme as any) || 'default';

  // Lumina flag: NEXT_PUBLIC_LUMINA_ENABLED=1 o ?lumina=1
  const luminaFlagEnv = (process.env.NEXT_PUBLIC_LUMINA_ENABLED as any) === '1';
  const luminaFlagQuery = (searchParams?.get('lumina') || '') === '1';
  const luminaEnabled = Boolean(luminaFlagEnv || luminaFlagQuery);
  const styleVariant = (searchParams?.get('style') || 'minimal') as
    | 'minimal'
    | 'editorial'
    | 'quartz';

  // Separate photos by type (this would need to come from API in real implementation)
  const individualPhotos = photos.filter(
    (p) => !p.filename.toLowerCase().includes('grupo')
  );
  const groupPhotos = photos.filter((p) =>
    p.filename.toLowerCase().includes('grupo')
  );

  const filteredInd = activeCategoryInd === null
    ? individualPhotos
    : individualPhotos.filter((p) => getCategoryIndex(p.id || p.filename) === activeCategoryInd);
  const filteredGrp = activeCategoryGrp === null
    ? groupPhotos
    : groupPhotos.filter((p) => getCategoryIndex(p.id || p.filename) === activeCategoryGrp);
  const pagedInd = filteredInd.slice(pageInd * PAGE_SIZE, pageInd * PAGE_SIZE + PAGE_SIZE);
  const pagedGrp = filteredGrp.slice(pageGrp * PAGE_SIZE, pageGrp * PAGE_SIZE + PAGE_SIZE);

  // Requirements and availability
  const requiredIndividual = selectedPackage?.contents.individualPhotos || 0;
  const requiredGroup = selectedPackage?.contents.groupPhotos || 0;
  const availableGroupCount = groupPhotos.length;

  // Handle contact form changes
  const handleContactFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (contactErrors[name as keyof typeof contactErrors]) {
      setContactErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Save contact info to store
  const saveContactInfo = () => {
    try {
      const validatedData = ContactSchema.parse(contactForm);

      const contactInfo = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || '',
        address: {
          street: validatedData.street,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          country: 'Argentina',
        },
      };

      setContactInfo(contactInfo);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setContactErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  // Process payment
  const processPayment = async () => {
    if (!selectedPackage || !contactInfo) {
      toast.error('Información incompleta');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create order
      const order = createOrder();
      if (!order) {
        throw new Error('Error creando la orden');
      }

      // Create payment preference
      const response = await fetch('/api/store/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, callbackBase }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando preferencia de pago');
      }

      const { init_point, sandbox_init_point } = await response.json();

      // Redirect to MercadoPago checkout
      const checkoutUrl =
        process.env.NODE_ENV === 'production' ? init_point : sandbox_init_point;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('URL de pago no disponible');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error procesando el pago'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderPackageSelection = () => (
    <div className="space-y-12">
      {/* Hero Section - Rediseñado como galería-escaparate */}
      <div className="relative">
        {/* Background con gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-amber-50 rounded-3xl opacity-60"></div>
        
        <div className="relative text-center space-y-6 py-12 px-8">
          {/* Badge moderno */}
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-amber-200/50 px-6 py-3 rounded-full shadow-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 tracking-wide">
              PAQUETES PREMIUM
            </span>
          </div>
          
          {/* Título principal con tipografía elegante */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-light text-slate-800 tracking-tight">
              Tu <span className="font-medium bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Galería</span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-light text-slate-600">
              Perfecta
            </h2>
          </div>
          
          {/* Descripción elegante */}
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Cada paquete está diseñado para preservar tus momentos más especiales con la máxima calidad y elegancia
          </p>
          
          {/* Indicador de favoritos mejorado */}
          {favoriteIds.size > 0 && (
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-6 py-4 rounded-2xl shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-white fill-current" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-800">
                  {favoriteIds.size} foto{favoriteIds.size !== 1 ? 's' : ''} favorita{favoriteIds.size !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600">Seleccionadas especialmente para ti</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel + Cards - Rediseñado como galería moderna */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="grid gap-8 lg:gap-12 md:grid-cols-2">
          {PRODUCT_CATALOG.productOptions.map((option, index) => {
            const isSelected = selectedPackage?.id === option.id;
            const isPopular = index === 1;
            
            return (
              <div
                key={option.id}
                className={`group cursor-pointer transition-all duration-500 ${
                  isSelected 
                    ? 'transform scale-105' 
                    : 'hover:scale-105 hover:-translate-y-2'
                }`}
                onClick={() => selectPackage(option.id)}
              >
                {/* Card Container */}
                <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
                  isSelected 
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-2xl shadow-amber-200/50' 
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50'
                }`}>
                  
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                        <Star className="h-4 w-4 inline mr-2" />
                        MÁS POPULAR
                      </div>
                    </div>
                  )}
                  
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                      {/* Icon */}
                      <div className={`mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isSelected 
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50' 
                          : 'bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-amber-100 group-hover:to-orange-100'
                      }`}>
                        <Package className={`h-10 w-10 transition-colors duration-500 ${
                          isSelected ? 'text-white' : 'text-slate-600 group-hover:text-amber-600'
                        }`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className={`text-2xl font-bold mb-3 transition-colors duration-500 ${
                        isSelected ? 'text-slate-800' : 'text-slate-700 group-hover:text-slate-800'
                      }`}>
                        {option.name}
                      </h3>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold transition-all duration-500 ${
                          isSelected 
                            ? 'bg-white text-amber-600 shadow-lg' 
                            : 'bg-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-700'
                        }`}>
                          {formatCurrency(option.basePrice)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-slate-600 text-center text-sm leading-relaxed mb-8">
                      {option.description}
                    </p>

                    {/* Features Grid - Rediseñado */}
                    <div className="space-y-4">
                      {/* Carpeta */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                          <Image className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Carpeta personalizada</p>
                          <p className="text-sm text-slate-500">{option.contents.folderSize}</p>
                        </div>
                      </div>

                      {/* Fotos individuales */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                          <User className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Fotos individuales</p>
                          <p className="text-sm text-slate-500">
                            {option.contents.individualPhotos} x {option.contents.individualSize}
                          </p>
                        </div>
                      </div>

                      {/* Fotos pequeñas */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                          <Camera className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Fotos pequeñas</p>
                          <p className="text-sm text-slate-500">
                            {option.contents.smallPhotos} x {option.contents.smallSize}
                          </p>
                        </div>
                      </div>

                      {/* Foto grupal */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-pink-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Foto grupal</p>
                          <p className="text-sm text-slate-500">
                            {option.contents.groupPhotos} x {option.contents.groupSize}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="mt-6 flex items-center justify-center gap-3 text-amber-700 font-semibold">
                        <CheckCircle className="h-5 w-5" />
                        Seleccionado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Action Button - Rediseñado */}
      <div className="text-center pt-8">
        <Button
          onClick={nextStep}
          disabled={!canProceedToNextStep()}
          className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-12 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="relative z-10 flex items-center gap-3">
            Continuar con la Selección
            <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
          </span>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </Button>
        
        {!canProceedToNextStep() && (
          <p className="text-sm text-slate-500 mt-4">
            Selecciona un paquete para continuar
          </p>
        )}
      </div>
    </div>
  );

  const renderPhotoSelection = () => (
    <div className="space-y-12">
      {/* Header Section - Rediseñado */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200/50 px-6 py-3 rounded-full shadow-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <Image className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700 tracking-wide">
            SELECCIÓN DE FOTOS
          </span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-slate-800 tracking-tight">
            Elige tus <span className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Fotos</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-light text-slate-600">
            Favoritas
          </h2>
        </div>
        
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Selecciona las fotos que quieres incluir en tu {selectedPackage?.name}
        </p>
      </div>

      {selectedPackage && (
        <div className="space-y-8">
          {/* Individual Photos Section - Rediseñado */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Fotos Individuales</h3>
                  <p className="text-sm text-slate-500">Selecciona tus mejores momentos</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 px-6 py-3 rounded-full font-bold text-lg shadow-lg">
                {selectedPhotos.individual.length}/{selectedPackage.contents.individualPhotos}
              </div>
            </div>

            {/* Filtros por categoría - Rediseñados */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setActiveCategoryInd(null); setPageInd(0); }}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeCategoryInd === null
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                Todas
              </button>
              {CATEGORY_LABELS.map((label, idx) => (
                <button
                  key={`ind-cat-${idx}`}
                  onClick={() => { setActiveCategoryInd(idx); setPageInd(0); }}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                    activeCategoryInd === idx 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200/50' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:border-amber-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Galería de fotos - Rediseñada */}
            <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6" role="list">
              {pagedInd.map((photo) => {
                const isSelected = selectedPhotos.individual.includes(photo.id);
                const categoryIndex = getCategoryIndex(photo.id || photo.filename);
                
                return (
                  <div
                    key={photo.id}
                    className={`group relative cursor-pointer transition-all duration-500 ${
                      isSelected 
                        ? 'transform scale-105' 
                        : 'hover:scale-105 hover:-translate-y-1'
                    }`}
                    onClick={() => selectIndividualPhoto(photo.id)}
                    role="button"
                    aria-pressed={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectIndividualPhoto(photo.id);
                      }
                    }}
                  >
                    {/* Card Container */}
                    <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-500 ${
                      isSelected 
                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl shadow-emerald-200/50' 
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50'
                    }`}>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Image */}
                      <div className="relative">
                        <img
                          src={photo.preview_url}
                          alt={photo.filename}
                          loading="lazy"
                          decoding="async"
                          className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
                          }}
                        />
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute bottom-0 left-0 right-0">
                        <div className={`h-6 text-center text-[10px] font-semibold text-white bg-gradient-to-r ${CATEGORY_GRADIENTS[categoryIndex]} flex items-center justify-center`}>
                          <span className="truncate max-w-[90%]">
                            {CATEGORY_LABELS[categoryIndex]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            
            {/* Paginación - Rediseñada */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageInd((p) => Math.max(0, p - 1))} 
                disabled={pageInd === 0}
                className="px-6 py-2 rounded-full border-2 hover:bg-slate-50 transition-colors"
              >
                Anterior
              </Button>
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-600">
                Página {pageInd + 1} de {Math.max(1, Math.ceil(filteredInd.length / PAGE_SIZE))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageInd((p) => (p + 1 < Math.ceil(filteredInd.length / PAGE_SIZE) ? p + 1 : p))}
                disabled={pageInd + 1 >= Math.ceil(filteredInd.length / PAGE_SIZE)}
                className="px-6 py-2 rounded-full border-2 hover:bg-slate-50 transition-colors"
              >
                Siguiente
              </Button>
            </div>
          </div>
          
          {/* Group Photos Section - Rediseñado */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Fotos Grupales</h3>
                  <p className="text-sm text-slate-500">Momentos compartidos con amigos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 px-6 py-3 rounded-full font-bold text-lg shadow-lg">
                  {selectedPhotos.group.length}/{selectedPackage.contents.groupPhotos}
                </div>
                {availableGroupCount === 0 && (
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold border border-amber-200">
                    No disponible
                  </div>
                )}
              </div>
            </div>

            {/* Filtros por categoría - Rediseñados */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setActiveCategoryGrp(null); setPageGrp(0); }}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeCategoryGrp === null
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                Todas
              </button>
              {CATEGORY_LABELS.map((label, idx) => (
                <button
                  key={`grp-cat-${idx}`}
                  onClick={() => { setActiveCategoryGrp(idx); setPageGrp(0); }}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                    activeCategoryGrp === idx 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200/50' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:border-pink-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Galería de fotos grupales - Rediseñada */}
            <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6" role="list">
              {pagedGrp.map((photo) => {
                const isSelected = selectedPhotos.group.includes(photo.id);
                const categoryIndex = getCategoryIndex(photo.id || photo.filename);
                
                return (
                  <div
                    key={photo.id}
                    className={`group relative cursor-pointer transition-all duration-500 ${
                      isSelected 
                        ? 'transform scale-105' 
                        : 'hover:scale-105 hover:-translate-y-1'
                    }`}
                    onClick={() => selectGroupPhoto(photo.id)}
                    role="button"
                    aria-pressed={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectGroupPhoto(photo.id);
                      }
                    }}
                  >
                    {/* Card Container */}
                    <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-500 ${
                      isSelected 
                        ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-xl shadow-pink-200/50' 
                        : 'border-slate-200 bg-white hover:border-pink-300 hover:shadow-lg hover:shadow-pink-100/50'
                    }`}>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Image */}
                      <div className="relative">
                        <img
                          src={photo.preview_url}
                          alt={photo.filename}
                          loading="lazy"
                          decoding="async"
                          className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
                          }}
                        />
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute bottom-0 left-0 right-0">
                        <div className={`h-6 text-center text-[10px] font-semibold text-white bg-gradient-to-r ${CATEGORY_GRADIENTS[categoryIndex]} flex items-center justify-center`}>
                          <span className="truncate max-w-[90%]">
                            {CATEGORY_LABELS[categoryIndex]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            
            {/* Paginación - Rediseñada */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageGrp((p) => Math.max(0, p - 1))} 
                disabled={pageGrp === 0}
                className="px-6 py-2 rounded-full border-2 hover:bg-slate-50 transition-colors"
              >
                Anterior
              </Button>
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-600">
                Página {pageGrp + 1} de {Math.max(1, Math.ceil(filteredGrp.length / PAGE_SIZE))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageGrp((p) => (p + 1 < Math.ceil(filteredGrp.length / PAGE_SIZE) ? p + 1 : p))}
                disabled={pageGrp + 1 >= Math.ceil(filteredGrp.length / PAGE_SIZE)}
                className="px-6 py-2 rounded-full border-2 hover:bg-slate-50 transition-colors"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Message - Rediseñado */}
      {requiredGroup > 0 && availableGroupCount === 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 text-lg">No hay foto grupal disponible</p>
              <p className="text-sm text-amber-700 mt-1">
                Podés continuar sin seleccionarla; tu paquete incluirá únicamente las fotos individuales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Rediseñada */}
      <div className="flex justify-between pt-8">
        <Button 
          variant="outline" 
          onClick={prevStep}
          className="group flex items-center gap-3 px-8 py-4 text-lg font-semibold border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl transition-all duration-300"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
          Anterior
        </Button>
        <Button
          onClick={nextStep}
          disabled={(() => {
            if (!selectedPackage) return true;
            const hasIndividuals = selectedPhotos.individual.length === requiredIndividual;
            const hasGroup = selectedPhotos.group.length === requiredGroup;
            if (requiredGroup > 0 && availableGroupCount === 0) {
              return !hasIndividuals;
            }
            return !(hasIndividuals && hasGroup);
          })()}
          className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="relative z-10 flex items-center gap-3">
            Continuar
            <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
          </span>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </Button>
      </div>
    </div>
  );

  const renderExtrasSelection = () => (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <Gift className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Copias Adicionales</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">
          Personaliza tu Pedido
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Añade copias extras en diferentes tamaños para compartir con familiares y amigos
        </p>
      </div>

      {/* Extras Grid */}
      <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto' : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'}>
        {PRODUCT_CATALOG.additionalCopies.map((copy) => {
          const existingItem = cartItems.find((item) => item.productId === copy.id);
          const quantity = existingItem?.quantity || 0;
          
          return (
            <Card 
              key={copy.id}
              className={`${luminaEnabled ? 'lumina-glass-card' : 'store-card-background enhanced-shadow'} group transition-all duration-300 hover:shadow-lg ${
                quantity > 0 && !luminaEnabled ? 'ring-2 ring-green-500 shadow-lg shadow-green-100' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className={`mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center ${luminaEnabled ? 'lumina-icon-badge' : 'bg-gradient-to-br from-green-500 to-emerald-500'}`}>
                    <Image className={luminaEnabled ? 'h-6 w-6 text-white/90' : 'h-6 w-6 text-white'} />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">{copy.name}</h4>
                  <Badge variant="secondary" className={luminaEnabled ? 'lumina-price-badge text-base px-3 py-1' : 'text-lg px-3 py-1'}>
                    {formatCurrency(copy.price)}
                  </Badge>
                  {copy.isSet && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Set de {copy.setQuantity} fotos
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (existingItem && existingItem.quantity > 0) {
                        updateCartItemQuantity(existingItem.id, existingItem.quantity - 1);
                      }
                    }}
                    disabled={quantity === 0}
                    className={`w-10 h-10 rounded-full hover:bg-gray-50 ${luminaEnabled ? 'bg-white/70 border-[rgba(232,230,227,0.9)]' : ''}`}
                  >
                    -
                  </Button>

                  <div className="w-16 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-700">{quantity}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (existingItem) {
                        updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
                      } else {
                        addToCart({
                          type: 'additional_copy',
                          productId: copy.id,
                          quantity: 1,
                          unitPrice: copy.price,
                          metadata: { size: copy.size },
                        });
                      }
                    }}
                    className={`w-10 h-10 rounded-full hover:bg-gray-50 ${luminaEnabled ? 'bg-white/70 border-[rgba(232,230,227,0.9)]' : ''}`}
                  >
                    +
                  </Button>
                </div>

                {quantity > 0 && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">
                      Total: {formatCurrency(quantity * copy.price)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {cartItems.length > 0 && (
        <div className={luminaEnabled ? 'lumina-glass-card p-6 max-w-2xl mx-auto' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto'}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-800">Resumen de Extras</h3>
          </div>
          <div className="space-y-2">
            {cartItems.map((item) => {
              const copy = PRODUCT_CATALOG.additionalCopies.find((c) => c.id === item.productId);
              return (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{copy?.name} x{item.quantity}</span>
                  <span className="font-medium text-blue-800">{formatCurrency(item.totalPrice)}</span>
                </div>
              );
            })}
            <Separator className="my-3" />
            <div className="flex justify-between items-center font-semibold text-blue-800">
              <span>Total Extras:</span>
              <span>{formatCurrency(getAdditionsPrice())}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={prevStep}
          className="nav-button ripple-effect px-6 py-3 text-lg font-medium border-2 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Anterior
        </Button>
        <Button 
          onClick={nextStep} 
          className={luminaEnabled ? 'lumina-cta px-8 py-3 text-lg font-semibold' : 'enhanced-button ripple-effect bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'}
        >
          Continuar
          <Zap className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

    const renderContactForm = () => (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Información de Contacto</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">
          Datos para el Envío
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Completa tus datos personales y dirección para recibir tu pedido en casa
        </p>
      </div>

      <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-6 grid gap-8 md:grid-cols-2 max-w-5xl mx-auto' : 'grid gap-8 md:grid-cols-2 max-w-5xl mx-auto'}>
        {/* Personal Information */}
        <Card className={luminaEnabled ? 'lumina-glass-card' : 'store-card-background enhanced-shadow border-2 border-blue-100 hover:border-blue-200 transition-colors'}>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-blue-800">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nombre completo *
              </Label>
                              <Input
                  id="name"
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactFormChange}
                  placeholder="Tu nombre completo"
                  className="enhanced-input h-12 border-2 focus:border-blue-500 focus:ring-blue-500"
                />
              {contactErrors['name'] && (
                <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['name']}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </Label>
                              <Input
                  id="email"
                  name="email"
                  type="email"
                  value={contactForm.email}
                  onChange={handleContactFormChange}
                  placeholder="tu@email.com"
                  className="enhanced-input h-12 border-2 focus:border-blue-500 focus:ring-blue-500"
                />
              {contactErrors['email'] && (
                <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['email']}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Teléfono
              </Label>
                              <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={contactForm.phone}
                  onChange={handleContactFormChange}
                  placeholder="11 1234-5678"
                  className="enhanced-input h-12 border-2 focus:border-blue-500 focus:ring-blue-500"
                />
              {contactErrors['phone'] && (
                <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['phone']}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className={luminaEnabled ? 'lumina-glass-card' : 'store-card-background enhanced-shadow border-2 border-purple-100 hover:border-purple-200 transition-colors'}>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-purple-800">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              Dirección de Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium text-gray-700">
                Dirección *
              </Label>
                              <Input
                  id="street"
                  name="street"
                  value={contactForm.street}
                  onChange={handleContactFormChange}
                  placeholder="Av. Corrientes 1234, Piso 5, Depto A"
                  className="enhanced-input h-12 border-2 focus:border-purple-500 focus:ring-purple-500"
                />
              {contactErrors['street'] && (
                <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['street']}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                  Ciudad *
                </Label>
                <Input
                  id="city"
                  name="city"
                  value={contactForm.city}
                  onChange={handleContactFormChange}
                  placeholder="Buenos Aires"
                  className="enhanced-input h-12 border-2 focus:border-purple-500 focus:ring-purple-500"
                />
                {contactErrors['city'] && (
                                  <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['city']}
                </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                  Provincia *
                </Label>
                <Input
                  id="state"
                  name="state"
                  value={contactForm.state}
                  onChange={handleContactFormChange}
                  placeholder="CABA"
                  className="enhanced-input h-12 border-2 focus:border-purple-500 focus:ring-purple-500"
                />
                {contactErrors['state'] && (
                                  <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['state']}
                </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                Código Postal *
              </Label>
                              <Input
                  id="zipCode"
                  name="zipCode"
                  value={contactForm.zipCode}
                  onChange={handleContactFormChange}
                  placeholder="1043"
                  className="enhanced-input h-12 border-2 focus:border-purple-500 focus:ring-purple-500"
                />
              {contactErrors['zipCode'] && (
                <div className="error-message flex items-center gap-2 text-red-500 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </div>
                  {contactErrors['zipCode']}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800">Tu información está segura</h3>
            <p className="text-sm text-blue-700">
              Solo utilizamos estos datos para el envío de tu pedido. No compartimos tu información con terceros.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={prevStep}
          className="nav-button ripple-effect px-6 py-3 text-lg font-medium border-2 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Anterior
        </Button>
        <Button
          onClick={() => {
            if (saveContactInfo()) {
              nextStep();
            }
          }}
          className={luminaEnabled ? 'lumina-cta px-8 py-3 text-lg font-semibold' : 'enhanced-button ripple-effect bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'}
        >
          Continuar
          <Zap className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <CreditCard className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Finalizar Pedido</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">
          Revisa y Confirma tu Pedido
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Revisa todos los detalles antes de proceder al pago seguro con MercadoPago
        </p>
      </div>

      <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-6 grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto' : 'grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto'}>
        {/* Order Summary */}
        <div className="space-y-6">
          <Card className={luminaEnabled ? 'lumina-glass-card' : 'summary-card store-card-background enhanced-shadow border-2 border-emerald-100'}>
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-emerald-800">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                </div>
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Base Package */}
              {selectedPackage && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{selectedPackage.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedPackage.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {formatCurrency(selectedPackage.basePrice)}
                  </Badge>
                </div>
              )}

              {/* Additional Copies */}
              {cartItems.length > 0 && (
                <>
                  <Separator className="enhanced-separator" />
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Copias Adicionales:</h4>
                    {cartItems.map((item) => {
                      const copy = PRODUCT_CATALOG.additionalCopies.find(
                        (c) => c.id === item.productId
                      );
                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-700">{copy?.name}</span>
                            <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>
                          </div>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Shipping */}
              <Separator className="enhanced-separator" />
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-700">Envío a domicilio</span>
                </div>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(PRODUCT_CATALOG.pricing.shippingCost || 0)}
                </span>
              </div>

              {/* Total */}
              <Separator className="enhanced-separator" />
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
                <span className="text-xl font-bold text-gray-800">Total Final</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(getTotalPrice())}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          {contactInfo && (
            <Card className={luminaEnabled ? 'lumina-glass-card' : 'summary-card store-card-background enhanced-shadow border-2 border-blue-100'}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-blue-800">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  Información de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-800">{contactInfo.name}</p>
                      <p className="text-sm text-gray-600">{contactInfo.email}</p>
                      {contactInfo.phone && (
                        <p className="text-sm text-gray-600">{contactInfo.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-800">{contactInfo.address.street}</p>
                    <p className="text-sm text-gray-600">
                      {contactInfo.address.city}, {contactInfo.address.state} {contactInfo.address.zipCode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Section */}
        <div className="space-y-6">
          {/* Security Info */}
          <Card className={luminaEnabled ? 'lumina-glass-card' : 'summary-card store-card-background enhanced-shadow border-2 border-green-100'}>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-green-800">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                Pago Seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">MercadoPago</p>
                    <p className="text-sm text-gray-600">Pago seguro y rápido</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">SSL Encriptado</p>
                    <p className="text-sm text-gray-600">Datos protegidos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Truck className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Envío Garantizado</p>
                    <p className="text-sm text-gray-600">Seguimiento incluido</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button
            onClick={processPayment}
            disabled={isProcessingPayment}
            className={luminaEnabled ? 'lumina-cta w-full py-4 text-xl font-bold' : 'enhanced-button ripple-effect w-full bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white py-4 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Procesando Pago...
              </>
            ) : (
              <>
                <CreditCard className="mr-3 h-6 w-6" />
                Pagar {formatCurrency(getTotalPrice())}
              </>
            )}
          </Button>

          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={prevStep}
            className="nav-button ripple-effect w-full py-3 text-lg font-medium border-2 hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Volver a Editar
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (checkoutStep) {
      case 'package':
        return renderPackageSelection();
      case 'photos':
        return renderPhotoSelection();
      case 'extras':
        return renderExtrasSelection();
      case 'contact':
        return renderContactForm();
      case 'payment':
        return renderPayment();
      default:
        return renderPackageSelection();
    }
  };

  return (
    <ThemedGalleryWrapper eventTheme={(luminaEnabled ? 'lumina' : eventTheme) as any}>
      {/* Scope Lumina para que las reglas .lumina .store-* apliquen sin afectar global */}
      <div
        className={
          luminaEnabled
            ? `lumina ${
                styleVariant === 'editorial'
                  ? 'lumina-style-editorial'
                  : styleVariant === 'quartz'
                    ? 'lumina-style-quartz'
                    : 'lumina-style-minimal'
              }`
            : undefined
        }
      >
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">

        
        {/* Enhanced Header - Rediseñado */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => {
                  if (checkoutStep && checkoutStep !== 'package') {
                    try { prevStep(); } catch { /* no-op */ }
                  } else {
                    onBack ? onBack() : router.back();
                  }
                }}
                className="group flex items-center gap-3 hover:bg-slate-100 px-4 py-3 rounded-xl transition-all duration-300"
              >
                <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                  <ArrowLeft className="h-4 w-4 text-slate-600" />
                </div>
                <span className="hidden sm:inline font-medium text-slate-700">Volver</span>
              </Button>

              {/* Center - Event Info */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{subject.event.name}</h1>
                <p className="text-sm text-slate-500 font-medium">{subject.event.school_name}</p>
              </div>

              {/* Right - Progress */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 text-sm">
                  <span className="text-slate-500 font-medium">Paso</span>
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full font-semibold">
                    {['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1} de 5
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mt-6">
              <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{
                    width: `${((['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1) / 5) * 100}%`,
                  }}
                />
                {/* Glow effect */}
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full opacity-50 blur-sm transition-all duration-700 ease-out"
                  style={{
                    width: `${((['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1) / 5) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-4 text-xs font-medium">
                {['Paquete', 'Fotos', 'Extras', 'Contacto', 'Pago'].map((step, index) => {
                  const isActive = index <= ['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep);
                  const isCurrent = index === ['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep);
                  return (
                    <span
                      key={step}
                      className={`transition-colors duration-300 ${
                        isCurrent 
                          ? 'text-amber-600 font-semibold' 
                          : isActive 
                            ? 'text-slate-600' 
                            : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="store-step">
              {(() => {
                switch (checkoutStep) {
                  case 'package':
                    return renderPackageSelection();
                  case 'photos':
                    return renderPhotoSelection();
                  case 'extras':
                    return renderExtrasSelection();
                  case 'contact':
                    return renderContactForm();
                  case 'payment':
                    return renderPayment();
                  default:
                    return renderPackageSelection();
                }
              })()}
            </div>
          </div>
        </div>
        </div>
      </div>
    </ThemedGalleryWrapper>
  );
}

export default UnifiedStore;
