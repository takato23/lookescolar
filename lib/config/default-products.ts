// Configuración por defecto de productos según pedido de la fotógrafa
export type ProductType = 'package' | 'physical' | 'digital' | 'print' | 'accessory';

export interface ProductFeatures {
  photos?: number;
  size?: string;
  format?: string;
  includes?: string[];
  deliveryTime?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  enabled: boolean;
  type: ProductType;
  features?: ProductFeatures;
  highlight?: boolean; // Para destacar productos principales como Opción A y B
  order?: number; // Para ordenar productos en la tienda
}

// Productos por defecto configurados según petición de la fotógrafa
export const DEFAULT_PRODUCTS: Record<string, Product> = {
  // PAQUETES PRINCIPALES (Carpetas) - Estilo Pixieset
  'opcionA': {
    id: 'opcionA',
    name: 'Opción A',
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21)+ 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
    price: 200000, // ARS$2,000.00 en centavos
    enabled: true,
    type: 'package',
    highlight: true,
    order: 1,
    features: {
      photos: 6, // 1 individual + 4 copias 4x5 + 1 grupal = 6 items total
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
      copyPhotos: 4
    }
  },
  
  'opcionB': {
    id: 'opcionB',
    name: 'Opción B',
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 2 fotos INDIVIDUALES (15x21) + 8 fotos 4x5 (de las mismas que las individuales elegidas) + foto grupal (15x21)',
    price: 250000, // ARS$2,500.00 en centavos
    enabled: true,
    type: 'package',
    highlight: true,
    order: 2,
    features: {
      photos: 11, // 2 individuales + 8 copias 4x5 + 1 grupal = 11 items total
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
      copyPhotos: 8
    }
  },

  // COPIAS ADICIONALES (disponibles después de comprar Opción A o B)
  'copy_4x5': {
    id: 'copy_4x5',
    name: '4x5 cm (4 fotitos)',
    description: 'Set de 4 fotos de la misma imagen en tamaño 4x5 cm',
    price: 60000, // $600.00 ARS
    enabled: true,
    type: 'print',
    order: 10,
    features: {
      size: '4x5cm',
      format: 'Set de 4 fotitos',
      deliveryTime: '7 días hábiles',
      requiresBasePackage: true
    }
  },

  'copy_10x15': {
    id: 'copy_10x15',
    name: '10x15 cm',
    description: 'Foto individual de 10x15 cm',
    price: 80000, // $800.00 ARS
    enabled: true,
    type: 'print',
    order: 11,
    features: {
      size: '10x15cm',
      format: 'Impreso',
      deliveryTime: '7 días hábiles',
      requiresBasePackage: true
    }
  },

  'copy_13x18': {
    id: 'copy_13x18',
    name: '13x18 cm',
    description: 'Foto individual de 13x18 cm',
    price: 100000, // $1,000.00 ARS
    enabled: true,
    type: 'print',
    order: 12,
    features: {
      size: '13x18cm',
      format: 'Impreso',
      deliveryTime: '7 días hábiles',
      requiresBasePackage: true
    }
  },

  'copy_15x21': {
    id: 'copy_15x21',
    name: '15x21 cm',
    description: 'Foto individual de 15x21 cm',
    price: 120000, // $1,200.00 ARS
    enabled: true,
    type: 'print',
    order: 11,
    features: {
      size: '15x21cm',
      format: 'Impreso',
      deliveryTime: '7 días hábiles',
      requiresBasePackage: true
    }
  },

  'copy_20x30': {
    id: 'copy_20x30',
    name: '20x30 cm',
    description: 'Foto individual de 20x30 cm',
    price: 200000, // $2,000.00 ARS
    enabled: true,
    type: 'print',
    order: 13,
    features: {
      size: '20x30cm',
      format: 'Impreso',
      deliveryTime: '10 días hábiles',
      requiresBasePackage: true
    }
  },

  // PRODUCTOS DIGITALES
  'packDigital': {
    id: 'packDigital',
    name: 'Pack Digital Completo',
    description: 'Todas las fotos del alumno en formato digital de alta resolución',
    price: 5000,
    enabled: false,
    type: 'digital',
    order: 30,
    features: {
      photos: 50,
      format: 'Digital (JPG alta resolución)',
      includes: [
        'Todas las fotos individuales',
        'Fotos grupales',
        'Fotos de actividades',
        'Descarga inmediata',
        'Sin marca de agua'
      ],
      deliveryTime: 'Inmediato'
    }
  },

  'descargaIndividual': {
    id: 'descargaIndividual',
    name: 'Descarga Foto Individual',
    description: 'Una foto individual en alta resolución para descarga',
    price: 500,
    enabled: false,
    type: 'digital',
    order: 31,
    features: {
      photos: 1,
      format: 'Digital (JPG alta resolución)',
      deliveryTime: 'Inmediato'
    }
  },

  // ACCESORIOS Y EXTRAS
  'portaretrato': {
    id: 'portaretrato',
    name: 'Portaretrato de Madera',
    description: 'Portaretrato de madera natural para foto 13x18cm',
    price: 2500,
    enabled: false,
    type: 'accessory',
    order: 40,
    features: {
      size: 'Para foto 13x18cm',
      format: 'Físico',
      deliveryTime: '10 días hábiles'
    }
  },

  'llavero': {
    id: 'llavero',
    name: 'Llavero con Foto',
    description: 'Llavero personalizado con foto del alumno',
    price: 800,
    enabled: false,
    type: 'accessory',
    order: 41,
    features: {
      size: '3x4cm',
      format: 'Físico',
      deliveryTime: '15 días hábiles'
    }
  },

  'iman': {
    id: 'iman',
    name: 'Imán para Heladera',
    description: 'Imán con foto del alumno',
    price: 600,
    enabled: false,
    type: 'accessory',
    order: 42,
    features: {
      size: '5x7cm',
      format: 'Físico',
      deliveryTime: '15 días hábiles'
    }
  },

  // PRODUCTOS ESPECIALES
  'album': {
    id: 'album',
    name: 'Álbum Fotográfico',
    description: 'Álbum personalizado con todas las fotos del evento',
    price: 35000,
    enabled: false,
    type: 'package',
    order: 50,
    features: {
      photos: 100,
      includes: [
        '100 fotos impresas',
        'Álbum de 30x30cm',
        'Tapa dura personalizada',
        'Páginas laminadas',
        'Caja de presentación'
      ],
      format: 'Álbum Premium',
      deliveryTime: '30 días hábiles'
    }
  },

  'cuadro': {
    id: 'cuadro',
    name: 'Cuadro Enmarcado',
    description: 'Fotografía enmarcada lista para colgar',
    price: 8000,
    enabled: false,
    type: 'physical',
    order: 51,
    features: {
      size: '30x40cm con marco',
      format: 'Enmarcado',
      deliveryTime: '15 días hábiles'
    }
  }
};

// Función para obtener productos por tipo
export function getProductsByType(type: ProductType): Product[] {
  return Object.values(DEFAULT_PRODUCTS)
    .filter(product => product.type === type)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

// Función para obtener productos destacados
export function getHighlightedProducts(): Product[] {
  return Object.values(DEFAULT_PRODUCTS)
    .filter(product => product.highlight)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

// Función para obtener productos habilitados
export function getEnabledProducts(): Product[] {
  return Object.values(DEFAULT_PRODUCTS)
    .filter(product => product.enabled)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}