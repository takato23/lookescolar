'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import type { CheckoutStep } from '@/lib/stores/unified-store';
import { PRODUCT_CATALOG } from '@/lib/types/unified-store';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import '@/styles/store-enhanced.css';
import '@/styles/lumina-tokens.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Image,
  Users,
  User,
  MapPin,
  Mail,
  Phone,
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
    removeSelectedPhoto,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    setContactInfo,
    nextStep,
    prevStep,
    setStep,
    canProceedToNextStep,
    getTotalPrice,
    getBasePrice,
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className={
          luminaEnabled
            ? 'lumina-hero-badge mx-auto'
            : 'inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full'
        }>
          <Gift className={luminaEnabled ? 'h-4 w-4 text-[var(--lumina-accent)]' : 'h-4 w-4 text-gray-600'} />
          <span className={luminaEnabled ? 'text-sm font-medium' : 'text-sm font-medium text-gray-700'}>
            Paquetes Personalizados
          </span>
        </div>
        <h2 className={luminaEnabled ? 'lumina-hero-title text-4xl font-semibold' : 'text-4xl font-bold text-slate-800'}>
          Elige tu Paquete Perfecto
        </h2>
        <p className={luminaEnabled ? 'lumina-hero-subtitle text-base max-w-2xl mx-auto' : 'text-lg text-muted-foreground max-w-2xl mx-auto'}>
          Diseñamos cada paquete pensando en crear recuerdos únicos y duraderos
        </p>
        {favoriteIds.size > 0 && (
          <div className={
            luminaEnabled
              ? 'inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)]'
              : 'inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg'
          }>
            <Heart className={luminaEnabled ? 'h-4 w-4 text-[var(--lumina-accent)]' : 'h-4 w-4 text-amber-600 fill-current'} />
            <span className={luminaEnabled ? 'text-sm font-medium' : 'text-sm font-medium text-amber-700'}>
              {favoriteIds.size} foto{favoriteIds.size !== 1 ? 's' : ''} marcada{favoriteIds.size !== 1 ? 's' : ''} como favorita{favoriteIds.size !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Panel + Cards */}
      <div className={luminaEnabled ? 'lumina-aurora max-w-6xl mx-auto' : 'max-w-6xl mx-auto'}>
        <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-8 md:p-10' : ''}>
          <div className="grid gap-8 md:grid-cols-2">
          {PRODUCT_CATALOG.productOptions.map((option, index) => {
            const isSelected = selectedPackage?.id === option.id;
            return (
              <Card
                key={option.id}
                className={`package-card store-card-background group cursor-pointer transition-all duration-300 ${
                  luminaEnabled ? 'lumina-package-card-light lumina-tilt lumina-sparkles' : 'hover:scale-105'
                } ${
                  isSelected && luminaEnabled ? 'lumina-selected' : ''
                }`}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => selectPackage(option.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`icon-container mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${luminaEnabled ? 'lumina-icon-badge' : 'bg-gray-500'}`}>
                    <Package className={luminaEnabled ? 'h-8 w-8 text-white/90' : 'h-8 w-8 text-white'} />
                  </div>
                  <CardTitle className={luminaEnabled ? 'text-xl font-semibold text-white/90' : 'text-2xl font-bold text-gray-800'}>
                    {option.name}
                  </CardTitle>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className={`${luminaEnabled ? 'lumina-price-badge text-base px-4 py-2' : 'enhanced-badge text-lg px-4 py-2'}`}>
                      {formatCurrency(option.basePrice)}
                    </Badge>
                    {index === 1 && (
                      <Badge variant="default" className={luminaEnabled ? 'bg-[rgba(212,175,55,0.15)] text-[var(--lumina-accent)] border border-[rgba(212,175,55,0.35)]' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'}>
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className={luminaEnabled ? 'text-center text-sm text-[rgba(45,42,38,0.75)] leading-relaxed' : 'text-muted-foreground text-center text-sm leading-relaxed'}>
                    {option.description}
                  </p>

                  {/* Features Grid */}
                  <div className="grid gap-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${luminaEnabled ? 'lumina-feature-item--light' : 'bg-gray-50'}`}>
                      <div className={`icon-container w-8 h-8 rounded-full flex items-center justify-center ${luminaEnabled ? '' : 'bg-gray-100'}`}>
                        <Image className={luminaEnabled ? 'h-4 w-4 text-[rgba(45,42,38,0.75)]' : 'h-4 w-4 text-gray-600'} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Carpeta personalizada</span>
                        <p className={luminaEnabled ? 'text-xs text-[rgba(45,42,38,0.55)]' : 'text-xs text-muted-foreground'}>{option.contents.folderSize}</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${luminaEnabled ? 'lumina-feature-item--light' : 'bg-gray-50'}`}>
                      <div className={`icon-container w-8 h-8 rounded-full flex items-center justify-center ${luminaEnabled ? '' : 'bg-gray-100'}`}>
                        <User className={luminaEnabled ? 'h-4 w-4 text-[rgba(45,42,38,0.75)]' : 'h-4 w-4 text-gray-600'} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Fotos individuales</span>
                        <p className={luminaEnabled ? 'text-xs text-[rgba(45,42,38,0.55)]' : 'text-xs text-muted-foreground'}>
                          {option.contents.individualPhotos} x {option.contents.individualSize}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${luminaEnabled ? 'lumina-feature-item--light' : 'bg-gray-50'}`}>
                      <div className={`icon-container w-8 h-8 rounded-full flex items-center justify-center ${luminaEnabled ? '' : 'bg-gray-100'}`}>
                        <Camera className={luminaEnabled ? 'h-4 w-4 text-[rgba(45,42,38,0.75)]' : 'h-4 w-4 text-gray-600'} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Fotos pequeñas</span>
                        <p className={luminaEnabled ? 'text-xs text-[rgba(45,42,38,0.55)]' : 'text-xs text-muted-foreground'}>
                          {option.contents.smallPhotos} x {option.contents.smallSize}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${luminaEnabled ? 'lumina-feature-item--light' : 'bg-gray-50'}`}>
                      <div className={`icon-container w-8 h-8 rounded-full flex items-center justify-center ${luminaEnabled ? '' : 'bg-pink-100'}`}>
                        <Users className={luminaEnabled ? 'h-4 w-4 text-[rgba(45,42,38,0.75)]' : 'h-4 w-4 text-pink-600'} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Foto grupal</span>
                        <p className={luminaEnabled ? 'text-xs text-[rgba(45,42,38,0.55)]' : 'text-xs text-muted-foreground'}>
                          {option.contents.groupPhotos} x {option.contents.groupSize}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className={luminaEnabled ? 'flex items-center justify-center gap-2 text-white/90 font-medium' : 'flex items-center justify-center gap-2 text-gray-800 font-medium'}>
                      <CheckCircle className="h-5 w-5" />
                      Seleccionado
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <Button
          onClick={nextStep}
          disabled={!canProceedToNextStep()}
          className={luminaEnabled ? 'lumina-cta px-8 py-4 text-lg font-semibold' : 'enhanced-button ripple-effect bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'}
        >
          Continuar con la Selección
          <Zap className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderPhotoSelection = () => (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <Image className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Selección de Fotos</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">
          Elige tus Fotos Favoritas
        </h2>
        <p className="text-lg text-muted-foreground">
          Selecciona las fotos que quieres incluir en tu {selectedPackage?.name}
        </p>
      </div>

      {selectedPackage && (
        <div className="space-y-8">
          {/* Individual Photos Section */}
          <div className="space-y-4 lumina-liquid">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                Fotos Individuales
              </h3>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {selectedPhotos.individual.length}/{selectedPackage.contents.individualPhotos}
              </Badge>
            </div>

            <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6' : 'grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6'} role="list">
              {individualPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={
                    luminaEnabled
                      ? `photo-selection-card lumina-photo-card lumina-tilt lumina-sparkles group relative cursor-pointer ${selectedPhotos.individual.includes(photo.id) ? 'selected' : ''}`
                      : `photo-selection-card store-card-background enhanced-shadow group relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                          selectedPhotos.individual.includes(photo.id)
                            ? 'ring-4 ring-green-500 shadow-lg shadow-green-200 selected'
                            : 'hover:ring-2 hover:ring-gray-300 hover:shadow-md'
                        } rounded-xl overflow-hidden`
                  }
                  onClick={() => selectIndividualPhoto(photo.id)}
                  role="button"
                  aria-pressed={selectedPhotos.individual.includes(photo.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectIndividualPhoto(photo.id);
                    }
                  }}
                >
                  <div className="relative">
                    <img
                      src={photo.preview_url}
                      alt={photo.filename}
                      loading="lazy"
                      decoding="async"
                      className={luminaEnabled ? 'lumina-photo-thumb' : 'photo-image h-32 w-full object-cover transition-transform duration-300 group-hover:scale-110'}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
                      }}
                    />
                    {luminaEnabled && <div className="lumina-photo-gradient" />}
                    {luminaEnabled && (
                      <div className="lumina-photo-caption">
                        <span className="truncate max-w-[70%]">{photo.filename}</span>
                        {favoriteIds.has(photo.id) && (
                          <span className="lumina-photo-fav">Favorita</span>
                        )}
                      </div>
                    )}
                    {selectedPhotos.individual.includes(photo.id) && (
                      luminaEnabled ? (
                        <div className="lumina-photo-check">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-green-600 bg-white rounded-full" />
                        </div>
                      )
                    )}
                  </div>
                  {!luminaEnabled && (
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate">{photo.filename}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Group Photos Section */}
          <div className="space-y-4 lumina-liquid">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-pink-600" />
                </div>
                Fotos Grupales
              </h3>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {selectedPhotos.group.length}/{selectedPackage.contents.groupPhotos}
                </Badge>
                {availableGroupCount === 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                    No disponible
                  </Badge>
                )}
              </div>
            </div>

            <div className={luminaEnabled ? 'lumina-surface-cream lumina-glow-border p-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6' : 'grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6'} role="list">
              {groupPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={
                    luminaEnabled
                      ? `photo-selection-card lumina-photo-card lumina-tilt lumina-sparkles group relative cursor-pointer ${selectedPhotos.group.includes(photo.id) ? 'selected' : ''}`
                      : `photo-selection-card store-card-background enhanced-shadow group relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                          selectedPhotos.group.includes(photo.id)
                            ? 'ring-4 ring-pink-500 shadow-lg shadow-pink-200 selected'
                            : 'hover:ring-2 hover:ring-gray-300 hover:shadow-md'
                        } rounded-xl overflow-hidden`
                  }
                  onClick={() => selectGroupPhoto(photo.id)}
                  role="button"
                  aria-pressed={selectedPhotos.group.includes(photo.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectGroupPhoto(photo.id);
                    }
                  }}
                >
                  <div className="relative">
                    <img
                      src={photo.preview_url}
                      alt={photo.filename}
                      loading="lazy"
                      decoding="async"
                      className={luminaEnabled ? 'lumina-photo-thumb' : 'photo-image h-32 w-full object-cover transition-transform duration-300 group-hover:scale-110'}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
                      }}
                    />
                    {luminaEnabled && <div className="lumina-photo-gradient" />}
                    {luminaEnabled && (
                      <div className="lumina-photo-caption">
                        <span className="truncate max-w-[70%]">{photo.filename}</span>
                        {favoriteIds.has(photo.id) && (
                          <span className="lumina-photo-fav">Favorita</span>
                        )}
                      </div>
                    )}
                    {selectedPhotos.group.includes(photo.id) && (
                      luminaEnabled ? (
                        <div className="lumina-photo-check">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-pink-500 bg-opacity-20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-pink-600 bg-white rounded-full" />
                        </div>
                      )
                    )}
                  </div>
                  {!luminaEnabled && (
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate">{photo.filename}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning Message */}
      {requiredGroup > 0 && availableGroupCount === 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium">No hay foto grupal disponible</p>
              <p className="text-sm text-amber-700">
                Podés continuar sin seleccionarla; tu paquete incluirá únicamente las fotos individuales.
              </p>
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
          disabled={(() => {
            if (!selectedPackage) return true;
            const hasIndividuals = selectedPhotos.individual.length === requiredIndividual;
            const hasGroup = selectedPhotos.group.length === requiredGroup;
            // Si el paquete exige grupal pero no hay disponible, sólo validar individuales
            if (requiredGroup > 0 && availableGroupCount === 0) {
              return !hasIndividuals;
            }
            return !(hasIndividuals && hasGroup);
          })()}
          className={luminaEnabled ? 'lumina-cta px-8 py-3 text-lg font-semibold' : 'enhanced-button ripple-effect bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'}
        >
          Continuar
          <Zap className="ml-2 h-5 w-5" />
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
        <div className="min-h-screen store-background">

        
        {/* Enhanced Header */}
        <div className="sticky-header store-content-background border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  if (checkoutStep && checkoutStep !== 'package') {
                    // Preferir retroceder de paso en el flujo del wizard
                    try { prevStep(); } catch { /* no-op */ }
                  } else {
                    onBack ? onBack() : router.back();
                  }
                }}
                className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Volver</span>
              </Button>

              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900">{subject.event.name}</h1>
                <p className="text-sm text-gray-600">{subject.event.school_name}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <span>Paso</span>
                  <Badge variant="secondary" className="px-3 py-1">
                    {['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1} de 5
                  </Badge>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mt-4">
              <div className="progress-bar h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    luminaEnabled
                      ? 'lumina-progress-fill'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                  style={{
                    width: `${((['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1) / 5) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs" style={{ color: luminaEnabled ? 'var(--lumina-muted)' : undefined }}>
                {['Paquete', 'Fotos', 'Extras', 'Contacto', 'Pago'].map((step, index) => {
                  const isActive = index <= ['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep);
                  return (
                    <span
                      key={step}
                      className={isActive ? 'font-medium' : ''}
                      style={luminaEnabled && isActive ? { color: 'var(--lumina-primary)' } : undefined}
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
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="store-content-background rounded-2xl p-8">
            <div className="store-step">
              {renderCurrentStep()}
            </div>
          </div>
        </div>
        </div>
      </div>
    </ThemedGalleryWrapper>
  );
}

export default UnifiedStore;
