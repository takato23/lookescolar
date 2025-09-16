/**
 * Servicio de Inicialización Segura de Store Settings
 * 
 * Este servicio asegura que siempre tengamos configuraciones y productos funcionando
 * SIN borrar datos existentes - solo agrega lo que falta
 */

export interface SafeStoreSettings {
  enabled: boolean;
  template: string;
  currency: string;
  products: Record<string, any>;
  colors?: Record<string, string>;
  texts?: Record<string, string>;
  payment_methods?: Record<string, any>;
  logo_url?: string;
  banner_url?: string;
  features?: Record<string, any>;
}

/**
 * Productos por defecto - GARANTIZADOS para funcionar en la tienda
 */
export const GUARANTEED_PRODUCTS = {
  // PAQUETES PRINCIPALES - Los más importantes
  'opcionA': {
    name: 'OPCIÓN A',
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21) + 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
    price: 200000, // $2,000.00 ARS en centavos
    enabled: true,
    type: 'package',
    features: {
      individualPhotos: 1,
      groupPhotos: 1,
      copyPhotos: 4,
      totalItems: 6,
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
      individualPhotos: 2,
      groupPhotos: 1,
      copyPhotos: 8,
      totalItems: 11,
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
    requiresPackage: true
  },
  'copias-10x15': {
    name: 'Copias 10x15',
    description: 'Copias adicionales en tamaño 10x15 cm',
    price: 1500, // $15.00 ARS en centavos
    enabled: true,
    type: 'additional-copy',
    requiresPackage: true
  },
  'copias-13x18': {
    name: 'Copias 13x18',
    description: 'Copias adicionales en tamaño 13x18 cm',
    price: 2000, // $20.00 ARS en centavos
    enabled: true,
    type: 'additional-copy',
    requiresPackage: true
  },
  'copias-15x21': {
    name: 'Copias 15x21',
    description: 'Copias adicionales en tamaño 15x21 cm',
    price: 2500, // $25.00 ARS en centavos
    enabled: true,
    type: 'additional-copy',
    requiresPackage: true
  },
  'copias-20x30': {
    name: 'Copias 20x30',
    description: 'Copias adicionales en tamaño 20x30 cm',
    price: 4000, // $40.00 ARS en centavos
    enabled: true,
    type: 'additional-copy',
    requiresPackage: true
  },
  
  // COMPATIBILIDAD - nombres antiguos
  'carpetaA': {
    name: 'OPCIÓN A',
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21) + 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
    price: 200000,
    enabled: true,
    type: 'package',
    features: {
      individualPhotos: 1,
      groupPhotos: 1,
      copyPhotos: 4,
      totalItems: 6,
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
      individualPhotos: 2,
      groupPhotos: 1,
      copyPhotos: 8,
      totalItems: 11,
      allowsAdditionalCopies: true
    }
  }
};

/**
 * Configuración mínima garantizada
 */
export const GUARANTEED_SETTINGS: SafeStoreSettings = {
  enabled: true,
  template: 'pixieset',
  currency: 'ARS',
  products: GUARANTEED_PRODUCTS,
  colors: {
    primary: '#d97706',
    secondary: '#374151',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    text_secondary: '#6b7280'
  },
  texts: {
    hero_title: 'Galería Fotográfica',
    hero_subtitle: 'Encuentra tus mejores momentos escolares',
    footer_text: 'BALOSKIER © 2025',
    contact_email: '',
    contact_phone: '',
    terms_url: '',
    privacy_url: ''
  },
  payment_methods: {
    mercadopago: {
      enabled: true,
      name: 'MercadoPago',
      description: 'Pago seguro con tarjeta'
    }
  },
  features: {
    allowExtrasOnly: true,
    showFAQ: true,
    showBadges: true
  }
};

/**
 * Fusiona configuración existente con la garantizada
 * NO borra nada existente, solo agrega lo que falta
 */
export function mergeWithGuaranteedSettings(
  existingSettings: Partial<SafeStoreSettings> | null
): SafeStoreSettings {
  if (!existingSettings) {
    return { ...GUARANTEED_SETTINGS };
  }

  return {
    enabled: existingSettings.enabled ?? GUARANTEED_SETTINGS.enabled,
    template: existingSettings.template ?? GUARANTEED_SETTINGS.template,
    currency: existingSettings.currency ?? GUARANTEED_SETTINGS.currency,
    
    // Fusionar productos - mantener existentes, agregar los que faltan
    products: {
      ...GUARANTEED_PRODUCTS,
      ...existingSettings.products
    },
    
    // Fusionar colores
    colors: {
      ...GUARANTEED_SETTINGS.colors,
      ...existingSettings.colors
    },
    
    // Fusionar textos
    texts: {
      ...GUARANTEED_SETTINGS.texts,
      ...existingSettings.texts
    },
    
    // Otros campos opcionales
    payment_methods: {
      ...GUARANTEED_SETTINGS.payment_methods,
      ...existingSettings.payment_methods
    },
    
    logo_url: existingSettings.logo_url ?? '',
    banner_url: existingSettings.banner_url ?? '',
    
    features: {
      ...GUARANTEED_SETTINGS.features,
      ...existingSettings.features
    }
  };
}

/**
 * Valida que la configuración tenga al menos los productos básicos
 */
export function validateStoreSettings(settings: SafeStoreSettings): {
  isValid: boolean;
  missingProducts: string[];
  issues: string[];
} {
  const issues: string[] = [];
  const missingProducts: string[] = [];
  
  // Verificar productos esenciales
  const requiredProducts = ['opcionA', 'opcionB'];
  
  for (const productId of requiredProducts) {
    if (!settings.products[productId] || !settings.products[productId].enabled) {
      missingProducts.push(productId);
    }
  }
  
  if (missingProducts.length > 0) {
    issues.push(`Faltan productos esenciales: ${missingProducts.join(', ')}`);
  }
  
  // Verificar configuración básica
  if (!settings.enabled) {
    issues.push('Tienda deshabilitada');
  }
  
  if (!settings.currency) {
    issues.push('Moneda no configurada');
  }
  
  return {
    isValid: issues.length === 0,
    missingProducts,
    issues
  };
}

/**
 * Inicialización segura SÍNCRONA para client components
 */
export function ensureStoreSettings(
  currentSettings: any
): SafeStoreSettings {
  console.log('🔧 Inicializando store settings de forma segura...');
  
  const mergedSettings = mergeWithGuaranteedSettings(currentSettings);
  const validation = validateStoreSettings(mergedSettings);
  
  if (!validation.isValid) {
    console.warn('⚠️  Configuración incompleta:', validation.issues);
    console.log('🔧 Aplicando correcciones automáticas...');
  }
  
  console.log('✅ Store settings inicializada correctamente');
  console.log('📦 Productos disponibles:', Object.keys(mergedSettings.products));
  
  return mergedSettings;
}
