'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  Package,
  Palette,
  Type,
  CreditCard,
  Eye,
  Sparkles,
  X,
  Monitor,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';
import type { StoreConfig, StoreProduct } from '@/lib/validations/store-config';
import {
  TYPOGRAPHY_PRESETS,
  COLOR_PALETTES,
  DEFAULT_STORE_DESIGN,
} from '@/lib/store/store-design';
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

// Step definitions
const WIZARD_STEPS = [
  { id: 'template', title: 'Estilo', icon: Store, description: 'Elige cómo se ve tu tienda' },
  { id: 'products', title: 'Productos', icon: Package, description: 'Qué vas a vender' },
  { id: 'pricing', title: 'Pagos', icon: CreditCard, description: 'Moneda y métodos' },
  { id: 'texts', title: 'Textos', icon: Type, description: 'Personaliza mensajes' },
  { id: 'review', title: 'Listo', icon: Check, description: 'Confirmar' },
] as const;

type WizardStep = typeof WIZARD_STEPS[number]['id'];

// Cover Style Previews - Enhanced visual components that clearly show style differences
function StripePreview() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Photo background */}
      <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover" />
      {/* Signature stripe element */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full bg-white/85 backdrop-blur-sm px-3 py-2.5 shadow-sm">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-semibold tracking-[0.2em] text-gray-800 uppercase">Clase 2025</span>
            <span className="text-[6px] text-gray-500 tracking-wide">Colegio San Martín</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DividerPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Photo background */}
      <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/20" />
      {/* Signature divider lines */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-white/90" />
          <div className="h-1 w-1 rotate-45 border border-white/90" />
          <div className="h-px w-8 bg-white/90" />
        </div>
        <span className="my-2 font-serif text-[10px] font-medium tracking-[0.15em] text-white drop-shadow-lg uppercase">
          Clase 2025
        </span>
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-white/90" />
          <div className="h-1 w-1 rotate-45 border border-white/90" />
          <div className="h-px w-8 bg-white/90" />
        </div>
      </div>
    </div>
  );
}

function JournalPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#faf8f5]">
      {/* Text column (40%) - Editorial style */}
      <div className="flex w-[38%] flex-col justify-center px-2 py-1.5">
        <span className="text-[6px] uppercase tracking-[0.15em] text-amber-700/70 mb-0.5">Promoción</span>
        <span className="font-serif text-[9px] font-semibold text-gray-800 leading-tight">
          Clase 2025
        </span>
        {/* Text lines placeholder */}
        <div className="mt-1.5 space-y-1">
          <div className="h-[3px] w-full rounded-full bg-gray-200" />
          <div className="h-[3px] w-4/5 rounded-full bg-gray-200" />
          <div className="h-[3px] w-3/5 rounded-full bg-gray-200" />
        </div>
      </div>
      {/* Image column (60%) */}
      <div className="w-[62%]">
        <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function ClassicPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Full photo */}
      <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover" />
      {/* Strong gradient at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      {/* Title at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <span className="text-[10px] font-bold text-white drop-shadow-md block">Clase 2025</span>
        <span className="text-[6px] text-white/80">Colegio San Martín</span>
      </div>
    </div>
  );
}

function DarkPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-900">
      {/* Darkened photo */}
      <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-transparent to-zinc-900/60" />
      {/* Centered minimal text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-extralight tracking-[0.35em] text-white/90 uppercase">
          Clase 2025
        </span>
        <div className="mt-1.5 h-px w-6 bg-white/40" />
      </div>
    </div>
  );
}

function MinimalPreview() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Image takes most space */}
      <div className="flex-1 overflow-hidden">
        <img src={PLACEHOLDER_IMAGES.heroes.groupPrimary} alt="" className="h-full w-full object-cover" />
      </div>
      {/* Clean separated title area */}
      <div className="flex items-center justify-center py-2 border-t border-gray-100">
        <span className="text-[8px] font-medium text-gray-700 tracking-wide">Clase 2025</span>
      </div>
    </div>
  );
}

// Template options with visual previews
const TEMPLATE_OPTIONS = [
  {
    id: 'pixieset',
    name: 'Elegante',
    description: 'Líneas decorativas y tipografía serif',
    preview: <DividerPreview />,
    recommended: true,
    features: ['Serif', 'Centrado', 'Formal'],
  },
  {
    id: 'modern-minimal',
    name: 'Minimal',
    description: 'Diseño limpio con separación clara',
    preview: <MinimalPreview />,
    features: ['Sans-serif', 'Espacioso', 'Moderno'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Estilo revista con layout asimétrico',
    preview: <JournalPreview />,
    features: ['Asimétrico', 'Texto lateral', 'Creativo'],
  },
  {
    id: 'studio-dark',
    name: 'Studio Dark',
    description: 'Fondo oscuro, tipografía fina',
    preview: <DarkPreview />,
    features: ['Oscuro', 'Minimalista', 'Premium'],
  },
  {
    id: 'classic',
    name: 'Clásico',
    description: 'Título sobre gradiente inferior',
    preview: <ClassicPreview />,
    features: ['Tradicional', 'Bold', 'Impactante'],
  },
  {
    id: 'premium-store',
    name: 'Stripe',
    description: 'Franja central con blur elegante',
    preview: <StripePreview />,
    features: ['Moderno', 'Profesional', 'Blur'],
  },
];

// Product image mapping for visual display
const PRODUCT_IMAGES: Record<string, string> = {
  opcion_a: PLACEHOLDER_IMAGES.mockups.schoolFolderOpen,
  opcion_b: PLACEHOLDER_IMAGES.mockups.printPackage,
  copia_adicional: PLACEHOLDER_IMAGES.mockups.framedPhoto,
  digital_download: PLACEHOLDER_IMAGES.mockups.galleryOnMobile,
};

// Default products
const DEFAULT_PRODUCTS: StoreProduct[] = [
  {
    id: 'opcion_a',
    name: 'Opción A - Básica',
    type: 'physical',
    enabled: true,
    price: 250000,
    description: 'Carpeta con 4 fotos impresas',
    options: { sizes: ['10x15'], formats: ['Brillante'], quality: 'standard' },
  },
  {
    id: 'opcion_b',
    name: 'Opción B - Completa',
    type: 'physical',
    enabled: true,
    price: 450000,
    description: 'Carpeta con 8 fotos + digital',
    options: { sizes: ['10x15', '13x18'], formats: ['Brillante', 'Mate'], quality: 'premium' },
  },
  {
    id: 'copia_adicional',
    name: 'Copia Adicional',
    type: 'physical',
    enabled: true,
    price: 80000,
    description: 'Foto impresa adicional',
    options: { sizes: ['10x15', '13x18', '15x21'], formats: ['Brillante', 'Mate'] },
  },
  {
    id: 'digital_download',
    name: 'Descarga Digital',
    type: 'digital',
    enabled: false,
    price: 50000,
    description: 'Archivo digital en alta resolución',
  },
];

interface StoreSetupWizardProps {
  eventId?: string;
  initialConfig?: Partial<StoreConfig>;
  onComplete: (config: StoreConfig) => void;
  onCancel: () => void;
}

export function StoreSetupWizard({
  eventId,
  initialConfig,
  onComplete,
  onCancel,
}: StoreSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('template');
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form state
  const [config, setConfig] = useState<Partial<StoreConfig>>({
    enabled: true,
    template: initialConfig?.template || 'pixieset',
    currency: initialConfig?.currency || 'ARS',
    products: initialConfig?.products || DEFAULT_PRODUCTS,
    payment_methods: initialConfig?.payment_methods || ['mercadopago'],
    shipping_enabled: initialConfig?.shipping_enabled ?? true,
    shipping_price: initialConfig?.shipping_price ?? 50000,
    tax_rate: initialConfig?.tax_rate ?? 0,
    design: initialConfig?.design || DEFAULT_STORE_DESIGN,
    texts: initialConfig?.texts || {
      hero_title: 'Galería Fotográfica',
      hero_subtitle: 'Encuentra tus mejores momentos escolares',
      footer_text: '© 2024 LookEscolar',
      contact_email: '',
      contact_phone: '',
      terms_url: '',
      privacy_url: '',
    },
    colors: initialConfig?.colors || {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#8b7355',
      background: '#faf9f7',
      surface: '#ffffff',
      text: '#111827',
      text_secondary: '#6b7280',
    },
  });

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const goNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  }, [currentStepIndex, isLastStep]);

  const goPrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  }, [currentStepIndex, isFirstStep]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const finalConfig: StoreConfig = {
        enabled: true,
        template: config.template || 'pixieset',
        currency: config.currency || 'ARS',
        products: config.products || DEFAULT_PRODUCTS,
        payment_methods: config.payment_methods || ['mercadopago'],
        shipping_enabled: config.shipping_enabled ?? true,
        shipping_price: config.shipping_price ?? 50000,
        tax_rate: config.tax_rate ?? 0,
        design: config.design || DEFAULT_STORE_DESIGN,
        texts: config.texts,
        colors: config.colors,
      };
      await onComplete(finalConfig);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  }, [config, onComplete]);

  const updateConfig = useCallback((updates: Partial<StoreConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateProduct = useCallback((productId: string, updates: Partial<StoreProduct>) => {
    setConfig((prev) => ({
      ...prev,
      products: (prev.products || []).map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: config.currency || 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Selected template info
  const selectedTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((t) => t.id === config.template),
    [config.template]
  );

  // Render Live Preview - Enhanced store preview
  const renderLivePreview = () => {
    const heroTitle = config.texts?.hero_title || 'Galería Fotográfica';
    const heroSubtitle = config.texts?.hero_subtitle || 'Encuentra tus mejores momentos';
    const isDark = config.template === 'studio-dark';
    const enabledProducts = (config.products || []).filter(p => p.enabled);
    const lowestPrice = enabledProducts.length > 0
      ? Math.min(...enabledProducts.map(p => p.price))
      : 250000;

    return (
      <div className={cn(
        'mx-auto overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 ring-1 ring-black/5',
        previewDevice === 'mobile' ? 'w-[260px]' : 'w-full max-w-[380px]'
      )}>
        {/* Browser chrome */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-2',
          isDark ? 'bg-zinc-800' : 'bg-gray-100'
        )}>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <div className="h-2 w-2 rounded-full bg-green-400" />
          </div>
          <div className={cn(
            'ml-2 flex-1 rounded-md px-2 py-0.5 text-[8px]',
            isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-white text-gray-400'
          )}>
            tutienda.lookescolar.com
          </div>
        </div>

        {/* Cover section */}
        <div className={cn(
          'relative w-full overflow-hidden',
          config.template === 'editorial' ? 'aspect-[16/9]' : 'aspect-[16/10]'
        )}>
          {/* Background image */}
          <img
            src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
            alt="Preview"
            className={cn(
              'h-full w-full object-cover transition-all',
              isDark && 'opacity-60'
            )}
          />

          {/* Template-specific overlays */}
          {config.template === 'pixieset' && (
            <>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="h-px w-10 bg-white/80" />
                  <div className="h-1.5 w-1.5 rotate-45 border border-white/80" />
                  <div className="h-px w-10 bg-white/80" />
                </div>
                <span className="my-2.5 font-serif text-base font-medium tracking-[0.18em] text-white drop-shadow-lg uppercase">
                  {heroTitle}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-px w-10 bg-white/80" />
                  <div className="h-1.5 w-1.5 rotate-45 border border-white/80" />
                  <div className="h-px w-10 bg-white/80" />
                </div>
                <span className="mt-2 text-[10px] text-white/70 tracking-wide">{heroSubtitle}</span>
              </div>
            </>
          )}

          {config.template === 'modern-minimal' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm px-6 py-3 shadow-lg rounded-sm">
                <span className="text-sm font-semibold tracking-[0.12em] text-gray-800 uppercase block text-center">
                  {heroTitle}
                </span>
                <span className="text-[9px] text-gray-500 block text-center mt-1">{heroSubtitle}</span>
              </div>
            </div>
          )}

          {config.template === 'editorial' && (
            <div className="absolute inset-y-0 left-0 flex w-[38%] flex-col justify-center bg-[#faf8f5] px-4">
              <span className="text-[8px] uppercase tracking-[0.15em] text-amber-700/70 mb-1">Promoción 2025</span>
              <span className="font-serif text-sm font-semibold text-gray-800 leading-tight">
                {heroTitle}
              </span>
              <span className="text-[9px] text-gray-500 mt-1.5 leading-relaxed">{heroSubtitle}</span>
              <div className="mt-3 space-y-1">
                <div className="h-1 w-full rounded-full bg-gray-200" />
                <div className="h-1 w-4/5 rounded-full bg-gray-200" />
              </div>
            </div>
          )}

          {config.template === 'studio-dark' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-900/70" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-extralight tracking-[0.35em] text-white/95 uppercase">
                  {heroTitle}
                </span>
                <div className="mt-2 h-px w-8 bg-white/40" />
                <span className="mt-2 text-[9px] font-light text-white/60 tracking-wide">{heroSubtitle}</span>
              </div>
            </>
          )}

          {config.template === 'classic' && (
            <>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="text-base font-bold text-white drop-shadow-lg block">
                  {heroTitle}
                </span>
                <span className="text-[10px] text-white/80 mt-0.5 block">{heroSubtitle}</span>
              </div>
            </>
          )}

          {config.template === 'premium-store' && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full bg-white/85 backdrop-blur-sm py-4 shadow-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold tracking-[0.2em] text-gray-800 uppercase">
                      {heroTitle}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">{heroSubtitle}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Store content preview */}
        <div className={cn(
          'p-3',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}>
          {/* Products section header */}
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              isDark ? 'text-zinc-400' : 'text-gray-500'
            )}>
              Productos
            </span>
            <span className={cn(
              'text-[9px] rounded-full px-2 py-0.5',
              isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-100 text-amber-700'
            )}>
              Desde {formatPrice(lowestPrice)}
            </span>
          </div>

          {/* Mini product cards */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {enabledProducts.slice(0, 2).map((product, i) => (
              <div
                key={product.id}
                className={cn(
                  'rounded-lg p-2',
                  isDark ? 'bg-zinc-800' : 'bg-gray-50'
                )}
              >
                <span className={cn(
                  'text-[8px] font-medium block truncate',
                  isDark ? 'text-zinc-300' : 'text-gray-700'
                )}>
                  {product.name.split(' - ')[0]}
                </span>
                <span className={cn(
                  'text-[10px] font-bold',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  {formatPrice(product.price)}
                </span>
              </div>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              isDark ? 'text-zinc-400' : 'text-gray-500'
            )}>
              Galería
            </span>
            <span className={cn(
              'text-[9px]',
              isDark ? 'text-zinc-500' : 'text-gray-400'
            )}>24 fotos</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded bg-gray-200">
                <img
                  src={i % 3 === 0
                    ? PLACEHOLDER_IMAGES.gallery.portraitGirl
                    : i % 3 === 1
                      ? PLACEHOLDER_IMAGES.gallery.portraitBoy
                      : PLACEHOLDER_IMAGES.heroes.groupPrimary
                  }
                  alt=""
                  className={cn(
                    'h-full w-full object-cover',
                    isDark && 'opacity-80'
                  )}
                />
              </div>
            ))}
          </div>

          {/* Payment methods indicator */}
          <div className={cn(
            'mt-3 flex items-center justify-center gap-2 rounded-lg py-2',
            isDark ? 'bg-zinc-800' : 'bg-gray-50'
          )}>
            {(config.payment_methods || []).slice(0, 3).map((method) => (
              <span
                key={method}
                className={cn(
                  'text-[9px]',
                  isDark ? 'text-zinc-400' : 'text-gray-500'
                )}
              >
                {method === 'mercadopago' ? '💳' : method === 'cash' ? '💵' : '🏦'}
              </span>
            ))}
            <span className={cn(
              'text-[8px]',
              isDark ? 'text-zinc-500' : 'text-gray-400'
            )}>
              {config.currency}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'template':
        return (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Template Selection */}
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">Elige el estilo de tu tienda</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Selecciona cómo quieres que se vea tu galería
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {TEMPLATE_OPTIONS.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => updateConfig({ template: template.id as StoreConfig['template'] })}
                    className={cn(
                      'group relative overflow-hidden rounded-xl transition-all duration-200',
                      config.template === template.id
                        ? 'ring-2 ring-amber-500 ring-offset-2 shadow-lg shadow-amber-500/10'
                        : 'ring-1 ring-neutral-200 hover:ring-neutral-300 hover:shadow-md'
                    )}
                  >
                    {template.recommended && (
                      <span className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-xl bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                        <Sparkles className="h-3 w-3" />
                        POPULAR
                      </span>
                    )}

                    {/* Visual Preview */}
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      {template.preview}
                    </div>

                    {/* Label & Features */}
                    <div className={cn(
                      'p-3 text-left transition-colors',
                      config.template === template.id ? 'bg-amber-50' : 'bg-white'
                    )}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={cn(
                            'text-sm font-semibold transition-colors',
                            config.template === template.id ? 'text-amber-700' : 'text-neutral-800'
                          )}>
                            {template.name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{template.description}</p>
                        </div>
                      </div>
                      {/* Feature badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.features.map((feature) => (
                          <span
                            key={feature}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded-md font-medium',
                              config.template === template.id
                                ? 'bg-amber-200/60 text-amber-800'
                                : 'bg-neutral-100 text-neutral-500'
                            )}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {config.template === template.id && (
                      <div className="absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-700">Vista previa</span>
                <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={cn(
                      'rounded-md p-2 transition-all duration-200',
                      previewDevice === 'desktop' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={cn(
                      'rounded-md p-2 transition-all duration-200',
                      previewDevice === 'mobile' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-neutral-100 p-8">
                {renderLivePreview()}
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">Configura tus productos</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Activa los productos que quieres vender y ajusta sus precios
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(config.products || []).map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    'relative overflow-hidden rounded-xl transition-all duration-200',
                    product.enabled
                      ? 'ring-2 ring-amber-500 ring-offset-1 bg-white shadow-lg shadow-amber-500/10'
                      : 'ring-1 ring-neutral-200 bg-neutral-50 hover:ring-neutral-300 hover:shadow-md'
                  )}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => updateProduct(product.id, { enabled: !product.enabled })}
                    className="absolute right-4 top-4 z-20"
                  >
                    <div className={cn(
                      'relative h-6 w-11 rounded-full transition-all duration-200',
                      product.enabled ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-md shadow-amber-500/30' : 'bg-neutral-300'
                    )}>
                      <div className={cn(
                        'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
                        product.enabled ? 'left-6' : 'left-1'
                      )} />
                    </div>
                  </button>

                  {/* Product Image */}
                  <div className={cn(
                    'relative h-28 w-full overflow-hidden transition-all',
                    product.enabled ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-neutral-100'
                  )}>
                    <img
                      src={PRODUCT_IMAGES[product.id] || PLACEHOLDER_IMAGES.mockups.printPackage}
                      alt={product.name}
                      className={cn(
                        'absolute inset-0 h-full w-full object-contain p-3 transition-all duration-200',
                        product.enabled ? 'opacity-100 scale-100' : 'opacity-40 scale-95 grayscale'
                      )}
                    />
                    {/* Type badge overlay */}
                    <span className={cn(
                      'absolute left-3 top-3 rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm',
                      product.type === 'digital'
                        ? 'bg-blue-500 text-white'
                        : 'bg-amber-500 text-white'
                    )}>
                      {product.type === 'digital' ? '📱 Digital' : '📦 Físico'}
                    </span>
                  </div>

                  <div className="p-4">
                    <h4 className={cn(
                      'text-base font-semibold transition-colors',
                      product.enabled ? 'text-neutral-900' : 'text-neutral-400'
                    )}>
                      {product.name.split(' - ')[0]}
                    </h4>
                    <p className={cn(
                      'mt-0.5 text-xs transition-colors',
                      product.enabled ? 'text-neutral-500' : 'text-neutral-400'
                    )}>
                      {product.description}
                    </p>

                    {/* Price input */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          'text-lg font-medium transition-colors',
                          product.enabled ? 'text-neutral-400' : 'text-neutral-300'
                        )}>$</span>
                        <input
                          type="number"
                          value={product.price / 100}
                          onChange={(e) =>
                            updateProduct(product.id, {
                              price: Math.round(parseFloat(e.target.value) * 100) || 0,
                            })
                          }
                          disabled={!product.enabled}
                          className={cn(
                            'w-24 border-0 bg-transparent p-0 text-2xl font-bold focus:outline-none focus:ring-0 transition-colors',
                            product.enabled ? 'text-neutral-900' : 'text-neutral-300'
                          )}
                        />
                      </div>
                      {product.enabled && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                          <Check className="h-3 w-3" />
                          Activo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">Precios y pagos</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Configura moneda, envío y métodos de pago
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Currency */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-neutral-700">Moneda</label>
                <div className="flex gap-3">
                  {['ARS', 'USD'].map((currency) => (
                    <button
                      key={currency}
                      onClick={() => updateConfig({ currency: currency as 'ARS' | 'USD' })}
                      className={cn(
                        'flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200',
                        config.currency === currency
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:shadow-sm'
                      )}
                    >
                      {currency === 'ARS' ? '🇦🇷 Peso Argentino' : '🇺🇸 Dólar'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-neutral-700">Envío a domicilio</label>
                  <button
                    onClick={() => updateConfig({ shipping_enabled: !config.shipping_enabled })}
                    className={cn(
                      'relative h-7 w-12 rounded-full transition-all duration-200',
                      config.shipping_enabled ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-md shadow-amber-500/30' : 'bg-neutral-200'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                      config.shipping_enabled ? 'left-6' : 'left-1'
                    )} />
                  </button>
                </div>
                {config.shipping_enabled && (
                  <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
                    <span className="text-sm font-medium text-neutral-500">Costo:</span>
                    <span className="text-lg text-neutral-400">$</span>
                    <input
                      type="number"
                      value={(config.shipping_price || 0) / 100}
                      onChange={(e) =>
                        updateConfig({
                          shipping_price: Math.round(parseFloat(e.target.value) * 100) || 0,
                        })
                      }
                      className="w-24 border-0 bg-transparent text-xl font-bold text-neutral-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-neutral-700">Métodos de pago</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: 'mercadopago', name: 'Mercado Pago', icon: '💳', desc: 'Tarjetas y más' },
                  { id: 'cash', name: 'Efectivo', icon: '💵', desc: 'Al retirar' },
                  { id: 'transfer', name: 'Transferencia', icon: '🏦', desc: 'Bancaria' },
                ].map((method) => {
                  const isSelected = (config.payment_methods || []).includes(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        const current = config.payment_methods || [];
                        updateConfig({
                          payment_methods: isSelected
                            ? current.filter((m) => m !== method.id)
                            : [...current, method.id],
                        });
                      }}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-4 transition-all duration-200 text-left',
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:shadow-sm ring-1 ring-transparent hover:ring-neutral-300'
                      )}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <span className="block text-sm font-semibold">{method.name}</span>
                        <span className={cn(
                          'text-xs',
                          isSelected ? 'text-white/80' : 'text-neutral-500'
                        )}>{method.desc}</span>
                      </div>
                      {isSelected && (
                        <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'texts':
        return (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">Textos de la tienda</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Personaliza los mensajes que verán tus clientes
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/80">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                    Título principal
                  </label>
                  <input
                    type="text"
                    value={config.texts?.hero_title || ''}
                    onChange={(e) =>
                      updateConfig({
                        texts: { ...config.texts!, hero_title: e.target.value },
                      })
                    }
                    placeholder="Galería Fotográfica"
                    className="w-full border-0 bg-transparent px-0 py-1 text-xl font-semibold text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/80">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={config.texts?.hero_subtitle || ''}
                    onChange={(e) =>
                      updateConfig({
                        texts: { ...config.texts!, hero_subtitle: e.target.value },
                      })
                    }
                    placeholder="Encuentra tus mejores momentos"
                    className="w-full border-0 bg-transparent px-0 py-1 text-base text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/80">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                      Email de contacto
                    </label>
                    <input
                      type="email"
                      value={config.texts?.contact_email || ''}
                      onChange={(e) =>
                        updateConfig({
                          texts: { ...config.texts!, contact_email: e.target.value },
                        })
                      }
                      placeholder="contacto@ejemplo.com"
                      className="w-full border-0 bg-transparent px-0 py-1 text-sm text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/80">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={config.texts?.contact_phone || ''}
                      onChange={(e) =>
                        updateConfig({
                          texts: { ...config.texts!, contact_phone: e.target.value },
                        })
                      }
                      placeholder="+54 11 1234-5678"
                      className="w-full border-0 bg-transparent px-0 py-1 text-sm text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <span className="text-sm font-semibold text-neutral-700">Vista previa</span>
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-neutral-100 p-8">
                {renderLivePreview()}
              </div>
            </div>
          </div>
        );

      case 'review':
        const enabledProducts = (config.products || []).filter((p) => p.enabled);
        const totalProductsValue = enabledProducts.reduce((sum, p) => sum + p.price, 0);

        return (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">Todo listo</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Revisa tu configuración y activa la tienda
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Template */}
                <div className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-neutral-200 shadow-sm">
                  <div className="h-14 w-20 overflow-hidden rounded-lg ring-1 ring-neutral-200">
                    {selectedTemplate?.preview}
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Estilo</span>
                    <p className="text-base font-semibold text-neutral-900">{selectedTemplate?.name}</p>
                  </div>
                  <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/25">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Products */}
                <div className="rounded-xl bg-white p-4 ring-1 ring-neutral-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Productos activos</span>
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {enabledProducts.length} productos
                    </span>
                  </div>
                  <div className="space-y-2">
                    {enabledProducts.map((product) => (
                      <div key={product.id} className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-100 last:border-0">
                        <span className="text-neutral-700 font-medium">{product.name}</span>
                        <span className="font-bold text-neutral-900">{formatPrice(product.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-neutral-200 shadow-sm">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Métodos de pago</span>
                    <p className="mt-1 text-sm font-medium text-neutral-700">
                      {(config.payment_methods || []).map(m =>
                        m === 'mercadopago' ? 'Mercado Pago' :
                        m === 'cash' ? 'Efectivo' :
                        m === 'transfer' ? 'Transferencia' : m
                      ).join(' • ')}
                    </p>
                  </div>
                  <span className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-amber-500/25">{config.currency}</span>
                </div>
              </div>

              {/* Success message */}
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 p-5 ring-1 ring-emerald-200/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">Tu tienda está lista</p>
                  <p className="text-sm text-emerald-700">
                    Haz clic en "Activar tienda" para comenzar a vender
                  </p>
                </div>
              </div>
            </div>

            {/* Final Preview */}
            <div className="space-y-4">
              <span className="text-sm font-semibold text-neutral-700">Así se verá tu tienda</span>
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-neutral-100 p-8">
                {renderLivePreview()}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-neutral-900/70 via-neutral-900/60 to-neutral-800/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative flex h-[90vh] max-h-[800px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-stone-50 to-amber-50/50 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">Configuración Fácil</h2>
              <p className="text-sm text-neutral-500">
                Paso {currentStepIndex + 1} de {WIZARD_STEPS.length} — <span className="text-amber-700">{WIZARD_STEPS[currentStepIndex].description}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl p-2.5 text-neutral-400 transition-all hover:bg-white hover:text-neutral-600 hover:shadow-sm"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-neutral-100">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / WIZARD_STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Step indicators */}
        <div className="border-b border-neutral-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                  disabled={index > currentStepIndex}
                  className={cn(
                    'group flex items-center gap-2.5 transition-all',
                    index > currentStepIndex && 'cursor-not-allowed opacity-35'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                        : isCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    'hidden text-sm font-medium transition-colors sm:block',
                    isActive ? 'text-amber-700' : isCompleted ? 'text-neutral-800' : 'text-neutral-400'
                  )}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-stone-50/50 px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-white px-6 py-4">
          <button
            onClick={goPrev}
            disabled={isFirstStep}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200',
              isFirstStep
                ? 'cursor-not-allowed text-neutral-300'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-700"
            >
              Cancelar
            </button>

            {isLastStep ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Activar tienda
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-amber-500/40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default StoreSetupWizard;
