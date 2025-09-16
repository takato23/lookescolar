'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface StoreProduct {
  name: string;
  description: string;
  price: number;
  enabled: boolean;
  type?: 'package' | 'digital' | 'print' | 'physical' | 'accessory';
  features?: any;
}

export interface PaymentMethod {
  enabled: boolean;
  name: string;
  description: string;
  account_details?: string;
  icon?: string;
  config?: Record<string, string>;
  instructions?: string[];
}

export interface StoreSettings {
  enabled: boolean;
  template: 'pixieset' | 'editorial' | 'minimal' | 'modern-minimal' | 'bold-vibrant' | 'premium-photography' | 'studio-dark' | 'classic-gallery' | 'fashion-editorial' | 'modern' | 'classic' | 'premium-store';
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'PEN' | 'COP' | 'MXN';
  
  // Security settings
  password_protection?: boolean;
  store_password?: string;
  per_event_settings?: boolean;
  
  // Appearance
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    text_secondary: string;
  };
  texts: {
    hero_title: string;
    hero_subtitle: string;
    footer_text: string;
    contact_email: string;
    contact_phone: string;
    terms_url: string;
    privacy_url: string;
  };
  
  // Content
  welcome_message?: string;
  
  // Branding
  custom_branding?: {
    logo_url?: string;
    favicon_url?: string;
    custom_css?: string;
    brand_name?: string;
    brand_tagline?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
  };
  
  // Schedule
  store_schedule?: {
    enabled?: boolean;
    start_date?: string;
    end_date?: string;
    timezone?: string;
    maintenance_message?: string;
  };
  
  // Downloads
  download_limits?: {
    enabled?: boolean;
    max_downloads_per_photo?: number;
    max_downloads_per_user?: number;
    download_expiry_days?: number;
    track_downloads?: boolean;
  };
  
  // Watermark
  watermark_settings?: {
    enabled?: boolean;
    opacity?: number;
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    text?: string;
    font_size?: number;
    color?: string;
    shadow?: boolean;
    per_store_watermark?: boolean;
  };
  
  // Theme
  theme_customization?: {
    custom_css?: string;
    header_style?: 'default' | 'minimal' | 'bold';
    gallery_layout?: 'grid' | 'masonry' | 'list';
    photo_aspect_ratio?: 'auto' | 'square' | '16:9' | '4:3';
    show_photo_numbers?: boolean;
    enable_zoom?: boolean;
    enable_fullscreen?: boolean;
    mobile_columns?: number;
    desktop_columns?: number;
    template_variant?: string;
  };
  
  // SEO
  seo_settings?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    og_image?: string;
    canonical_url?: string;
  };
  
  // Social
  social_settings?: {
    enable_sharing?: boolean;
    facebook_url?: string;
    instagram_url?: string;
    whatsapp_enabled?: boolean;
    whatsapp_message?: string;
  };
  
  // Notifications
  notification_settings?: {
    email_notifications?: boolean;
    order_confirmation?: boolean;
    download_reminders?: boolean;
    expiry_warnings?: boolean;
    admin_notifications?: boolean;
  };
  
  // Products and payments
  products: {
    [key: string]: StoreProduct;
  };
  payment_methods: {
    [key: string]: PaymentMethod;
  };
  
  // Legacy fields
  logo_url: string;
  banner_url: string;
  features?: {
    allowExtrasOnly?: boolean;
    showFAQ?: boolean;
    showBadges?: boolean;
  };
  
  // Metadata
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  enabled: false,
  template: 'pixieset',
  currency: 'ARS',
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    text_secondary: '#6b7280'
  },
  texts: {
    hero_title: 'Galería Fotográfica',
    hero_subtitle: 'Encuentra tus mejores momentos escolares',
    footer_text: '© 2024 LookEscolar - Fotografía Escolar',
    contact_email: '',
    contact_phone: '',
    terms_url: '',
    privacy_url: ''
  },
  theme_customization: {
    custom_css: '',
    header_style: 'default',
    gallery_layout: 'grid',
    photo_aspect_ratio: 'auto',
    show_photo_numbers: true,
    enable_zoom: true,
    enable_fullscreen: true,
    mobile_columns: 2,
    desktop_columns: 4,
    template_variant: 'pixieset'
  },
  products: {
    // PAQUETES PRINCIPALES - Usar AMBOS nombres para compatibilidad
    'opcionA': {
      name: 'OPCIÓN A',
      description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21) + 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
      price: 200000, // $2,000.00 ARS en centavos
      enabled: true,
      type: 'package',
      features: {
        photos: 6,
        includes: [
          '1 foto INDIVIDUAL (15x21)',
          '4 fotos 4x5 (de la misma que la individual elegida)',
          '1 foto grupal (15x21)',
          'Carpeta impresa con diseño personalizado (20x30)'
        ],
        format: 'Impreso',
        deliveryTime: '7-10 días hábiles',
        individualPhotos: 1,
        groupPhotos: 1,
        copyPhotos: 4,
        allowsAdditionalCopies: true
      }
    },
    'opcionB': {
      name: 'OPCIÓN B',
      description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 2 fotos INDIVIDUALES (15x21) + 8 fotos 4x5 (de las mismas que las individuales elegidas) + foto grupal (15x21)',
      price: 300000, // $3,000.00 ARS en centavos
      enabled: true,
      type: 'package',
      features: {
        photos: 11,
        includes: [
          '2 fotos INDIVIDUALES (15x21)',
          '8 fotos 4x5 (de las mismas que las individuales elegidas)',
          '1 foto grupal (15x21)',
          'Carpeta impresa con diseño personalizado (20x30)'
        ],
        format: 'Impreso',
        deliveryTime: '7-10 días hábiles',
        individualPhotos: 2,
        groupPhotos: 1,
        copyPhotos: 8,
        allowsAdditionalCopies: true
      }
    },
    // LEGACY SUPPORT - mantener nombres antiguos por compatibilidad
    'carpetaA': {
      name: 'OPCIÓN A',
      description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21) + 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
      price: 200000,
      enabled: true,
      type: 'package',
      features: {
        photos: 6,
        includes: ['1 foto individual (15x21)', '4 copias 4x5', '1 foto grupal (15x21)', 'Carpeta personalizada (20x30)'],
        format: 'Impreso',
        deliveryTime: '7-10 días hábiles',
        individualPhotos: 1,
        groupPhotos: 1,
        copyPhotos: 4,
        allowsAdditionalCopies: true
      }
    },
    'carpetaB': {
      name: 'OPCIÓN B',
      description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 2 fotos INDIVIDUALES (15x21) + 8 fotos 4x5 (de las mismas que las individuales elegidas) + foto grupal (15x21)',
      price: 300000,
      enabled: true,
      type: 'package',
      features: {
        photos: 11,
        includes: ['2 fotos individuales (15x21)', '8 copias 4x5', '1 foto grupal (15x21)', 'Carpeta premium (20x30)'],
        format: 'Impreso',
        deliveryTime: '7-10 días hábiles',
        individualPhotos: 2,
        groupPhotos: 1,
        copyPhotos: 8,
        allowsAdditionalCopies: true
      }
    },

    // COPIAS SUELTAS ADICIONALES - Disponibles con la compra de OPCIÓN A o B
    'copias-4x5': {
      name: 'Copias 4x5 (4 fotitos)',
      description: 'Copias adicionales en tamaño 4x5 cm - 4 unidades',
      price: 3000, // $30.00 ARS en centavos
      enabled: true,
      type: 'additional-copy',
      requiresPackage: true,
      features: {
        size: '4x5 cm',
        quantity: 4,
        format: 'Impreso',
        deliveryTime: '3-5 días hábiles'
      }
    },
    'copias-10x15': {
      name: 'Copias 10x15',
      description: 'Copias adicionales en tamaño 10x15 cm',
      price: 1500, // $15.00 ARS en centavos por unidad
      enabled: true,
      type: 'additional-copy',
      requiresPackage: true,
      features: {
        size: '10x15 cm',
        quantity: 1,
        format: 'Impreso',
        deliveryTime: '3-5 días hábiles'
      }
    },
    'copias-13x18': {
      name: 'Copias 13x18',
      description: 'Copias adicionales en tamaño 13x18 cm',
      price: 2000, // $20.00 ARS en centavos por unidad
      enabled: true,
      type: 'additional-copy',
      requiresPackage: true,
      features: {
        size: '13x18 cm',
        quantity: 1,
        format: 'Impreso',
        deliveryTime: '3-5 días hábiles'
      }
    },
    'copias-15x21': {
      name: 'Copias 15x21',
      description: 'Copias adicionales en tamaño 15x21 cm',
      price: 2500, // $25.00 ARS en centavos por unidad
      enabled: true,
      type: 'additional-copy',
      requiresPackage: true,
      features: {
        size: '15x21 cm',
        quantity: 1,
        format: 'Impreso',
        deliveryTime: '3-5 días hábiles'
      }
    },
    'copias-20x30': {
      name: 'Copias 20x30',
      description: 'Copias adicionales en tamaño 20x30 cm',
      price: 4000, // $40.00 ARS en centavos por unidad
      enabled: true,
      type: 'additional-copy',
      requiresPackage: true,
      features: {
        size: '20x30 cm',
        quantity: 1,
        format: 'Impreso',
        deliveryTime: '3-5 días hábiles'
      }
    },

    // PRODUCTOS LEGACY - mantener por compatibilidad pero ocultos
    'individual-photo': {
      name: 'Foto Individual',
      description: 'Descarga digital de alta calidad',
      price: 2500,
      enabled: false,
    },
    'photo-pack': {
      name: 'Paquete de Fotos',
      description: 'Todas las fotos del alumno',
      price: 15000,
      enabled: false,
    },
    'printed-photo': {
      name: 'Foto Impresa',
      description: 'Foto impresa 15x21 cm',
      price: 3500,
      enabled: false,
    },
    'class-pack': {
      name: 'Paquete Grupal',
      description: 'Todas las fotos de la clase',
      price: 30000,
      enabled: false,
    },
    'yearbook': {
      name: 'Anuario Escolar',
      description: 'Anuario impreso con todas las fotos',
      price: 45000,
      enabled: false,
    },
    'usb-drive': {
      name: 'USB con Fotos',
      description: 'USB con todas las fotos digitales',
      price: 20000,
      enabled: false,
    },
  },
  payment_methods: {
    'mercado-pago': {
      enabled: true,
      name: 'Mercado Pago',
      description: 'Pago online con tarjetas y billeteras virtuales',
      icon: 'CreditCard'
    },
    cash: {
      enabled: false,
      name: 'Efectivo',
      description: 'Coordiná el pago de forma presencial',
      icon: 'DollarSign',
      instructions: [
        'Coordinaremos por WhatsApp la entrega y el pago',
        'Podés abonar en el colegio o en nuestro estudio'
      ]
    },
    'bank-transfer': {
      enabled: false,
      name: 'Transferencia Bancaria',
      description: 'Transferencia o depósito bancario',
      icon: 'Building2',
      config: {
        accountNumber: '',
        accountHolder: '',
        bankName: '',
        cbu: '',
        alias: ''
      }
    }
  },
  logo_url: '',
  banner_url: ''
};

// API Functions
function mergeStoreSettings(partial?: Partial<StoreSettings> | null): StoreSettings {
  const base = partial ?? {};

  return {
    ...DEFAULT_STORE_SETTINGS,
    ...base,
    colors: {
      ...DEFAULT_STORE_SETTINGS.colors,
      ...(base?.colors ?? {})
    },
    texts: {
      ...DEFAULT_STORE_SETTINGS.texts,
      ...(base?.texts ?? {})
    },
    theme_customization: {
      ...DEFAULT_STORE_SETTINGS.theme_customization,
      ...(base?.theme_customization ?? {})
    },
    products: {
      ...DEFAULT_STORE_SETTINGS.products,
      ...(base?.products ?? {})
    },
    payment_methods: {
      ...DEFAULT_STORE_SETTINGS.payment_methods,
      ...(base?.payment_methods ?? {})
    }
  };
}

async function fetchStoreSettings(): Promise<StoreSettings> {
  const response = await fetch('/api/admin/store-settings');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch store settings: ${response.status}`);
  }
  
  const data = await response.json();
  return mergeStoreSettings(data.settings);
}

type TemplateBase = 'pixieset' | 'editorial' | 'minimal';

const TEMPLATE_BASE_MAP: Record<StoreSettings['template'], TemplateBase> = {
  pixieset: 'pixieset',
  editorial: 'editorial',
  minimal: 'minimal',
  'modern-minimal': 'minimal',
  'bold-vibrant': 'editorial',
  'premium-photography': 'editorial',
  'studio-dark': 'editorial',
  'classic-gallery': 'pixieset',
  'fashion-editorial': 'editorial',
  // Legacy support
  modern: 'minimal',
  classic: 'pixieset',
  'premium-store': 'editorial'
};

function prepareSettingsForSave(settings: StoreSettings): Partial<StoreSettings> {
  const templateVariant = settings.template;
  const normalizedTemplate = TEMPLATE_BASE_MAP[templateVariant] ?? 'pixieset';

  return {
    ...settings,
    template: normalizedTemplate,
    theme_customization: {
      ...settings.theme_customization,
      template_variant: templateVariant
    }
  };
}

async function saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  console.log('🚀 Saving store settings:', settings);
  
  // ⚠️ INCLUIR payment_methods que SÍ debe guardarse
  const validSettings = {
    enabled: settings.enabled,
    template: settings.template,
    products: settings.products,
    payment_methods: settings.payment_methods // 🔥 CRUCIAL: Debe enviarse para que se guarde
  };
  
  console.log('🔧 Sending only valid fields:', JSON.stringify(validSettings, null, 2));
  
  const response = await fetch('/api/admin/store-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validSettings),
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to save store settings: ${response.status}`;
    try {
      const error = await response.json();
      console.error('❌ API Error:', error);
      errorMessage = error.error || error.message || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('✅ Save response:', data);
  
  // Return the saved settings or merge with defaults
  return mergeStoreSettings(data.settings || settings);
}

export function useStoreSettings() {
  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);

  // Query for fetching store settings
  const {
    data: settings,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['store-settings'],
    queryFn: fetchStoreSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });

  // Mutation for saving store settings
  const saveMutation = useMutation({
    mutationFn: saveStoreSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['store-settings'], updatedSettings);
      setIsDirty(false);
      toast.success('Configuración guardada exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error saving store settings:', error);
      toast.error(`Error al guardar: ${error.message}`);
    }
  });

  // Update settings function
  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    const currentSettings = mergeStoreSettings(settings);
    const updatedSettings = mergeStoreSettings({ ...currentSettings, ...newSettings });
    
    // Update query cache optimistically
    queryClient.setQueryData(['store-settings'], updatedSettings);
    setIsDirty(true);
    
    return updatedSettings;
  }, [settings, queryClient]);

  // Update specific field function
  const updateField = useCallback(<K extends keyof StoreSettings>(
    field: K,
    value: StoreSettings[K]
  ) => {
    return updateSettings({ [field]: value });
  }, [updateSettings]);

  // Update nested field function (for objects like colors, texts, etc.)
  const updateNestedField = useCallback(<
    K extends keyof StoreSettings,
    NK extends keyof StoreSettings[K]
  >(
    parentField: K,
    nestedField: NK,
    value: StoreSettings[K][NK]
  ) => {
    const currentSettings = mergeStoreSettings(settings);
    const currentParent = currentSettings[parentField];
    
    if (typeof currentParent === 'object' && currentParent !== null) {
      const updatedParent = { ...currentParent, [nestedField]: value };
      return updateSettings({ [parentField]: updatedParent });
    }
  }, [settings, updateSettings]);

  // Save settings function
  const saveSettings = useCallback(async () => {
    if (!settings) return;
    
    try {
      await saveMutation.mutateAsync(settings);
    } catch (error) {
      console.error('Error in save function:', error);
    }
  }, [settings, saveMutation]);

  // Reset to original function
  const reset = useCallback(() => {
    refetch();
    setIsDirty(false);
  }, [refetch]);

  // Get active products (enabled only)
  const getActiveProducts = useCallback(() => {
    if (!settings || !settings.products) return [];

    return Object.entries(settings.products || {})
      .filter(([_, product]) => product.enabled)
      .map(([id, product]) => ({ id, ...product }));
  }, [settings]);

  // Get currency symbol
  const getCurrencySymbol = useCallback(() => {
    const currency = settings?.currency || 'ARS';
    const symbols = {
      ARS: '$',
      USD: '$',
      EUR: '€',
      BRL: 'R$',
      CLP: '$',
      PEN: 'S/',
      COP: '$',
      MXN: '$'
    };
    return symbols[currency] || '$';
  }, [settings?.currency]);

  // Format price with currency
  const formatPrice = useCallback((price: number) => {
    const currency = settings?.currency || 'ARS';
    const symbol = getCurrencySymbol();
    
    return new Intl.NumberFormat('es-AR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price).replace(/^/, symbol);
  }, [settings?.currency, getCurrencySymbol]);

  // Calculate total products enabled
  const totalEnabledProducts = useCallback(() => {
    if (!settings || !settings.products) return 0;
    return Object.values(settings.products || {}).filter(product => product.enabled).length;
  }, [settings]);

  return {
    // Data
    settings: settings || DEFAULT_STORE_SETTINGS,
    
    // State
    loading,
    error,
    isDirty,
    isSaving: saveMutation.isPending,
    
    // Actions
    updateSettings,
    updateField,
    updateNestedField,
    saveSettings,
    reset,
    refetch,
    
    // Utilities
    getActiveProducts,
    getCurrencySymbol,
    formatPrice,
    totalEnabledProducts,
  };
}

// Hook for client-side store access (for public store pages)
export interface PublicStoreSettings extends StoreSettings {
  paymentMethods?: Record<string, any>;
  storeUrl?: string;
  mercadoPagoConnected?: boolean;
  passwordRequired?: boolean;
  available?: boolean;
  schedule?: {
    withinSchedule: boolean;
    message?: string;
    openDate?: string;
    closedDate?: string;
  };
}

export function usePublicStore(token?: string, password?: string) {
  const [settings, setSettings] = useState<PublicStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [storeAvailable, setStoreAvailable] = useState(true);

  const loadPublicSettings = useCallback(async () => {
    if (!token) {
      // Load legacy store settings if no token provided
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/store/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSettings(data.settings as PublicStoreSettings);
      } catch (err) {
        console.error('Error loading legacy store settings:', err);
        setError(err instanceof Error ? err.message : 'Error loading store');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Load comprehensive store settings with token
    try {
      setLoading(true);
      setError(null);
      setPasswordRequired(false);

      const response = await fetch('/api/public/store/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.passwordRequired) {
          setPasswordRequired(true);
          setError(data.error || 'Contraseña requerida');
          return;
        }
        
        if (!data.available) {
          setStoreAvailable(false);
          setError(data.error || 'Tienda no disponible');
          return;
        }

        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setSettings({
        ...data.settings,
        storeUrl: data.storeUrl,
        mercadoPagoConnected: data.mercadoPagoConnected
      } as PublicStoreSettings);
      setStoreAvailable(true);
    } catch (err) {
      console.error('Error loading comprehensive store settings:', err);
      setError(err instanceof Error ? err.message : 'Error loading store');
    } finally {
      setLoading(false);
    }
  }, [token, password]);

  useEffect(() => {
    loadPublicSettings();
  }, [loadPublicSettings]);

  return {
    settings,
    loading,
    error,
    passwordRequired,
    storeAvailable,
    isStoreEnabled: settings?.enabled || false,
    retry: loadPublicSettings,
    getActiveProducts: () => {
      if (!settings || !settings.products) return [];
      return Object.entries(settings.products || {})
        .filter(([_, product]) => product.enabled)
        .map(([id, product]) => ({ id, ...product }));
    },
  };
}

export default useStoreSettings;
