// lib/types/unified-store.ts
// Tipos y catálogo para la tienda unificada de productos físicos

import { Product, ProductType } from '@/lib/config/default-products';

export interface ProductOption extends Product {
  id: string;
  name: string;
  description: string;
  basePrice?: number;
  price: number;
  type: ProductType;
  enabled: boolean;
  highlight?: boolean;
  order?: number;
  contents?: {
    folderSize?: string;
    individualPhotos?: number;
    individualSize?: string;
    smallPhotos?: number;
    smallSize?: string;
    groupPhotos?: number;
    groupSize?: string;
  };
  features?: any;
}

export interface AdditionalCopy {
  id: string;
  name: string;
  size: string;
  price: number;
  isSet: boolean;
  setQuantity?: number;
  description?: string;
}

export interface CartItem {
  id: string;
  type: 'base_package' | 'additional_copy';
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: {
    size?: string;
    photoIds?: string[];
  };
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface UnifiedOrder {
  id: string;
  token: string;
  basePackage: ProductOption;
  selectedPhotos: {
    individual: string[];
    group: string[];
  };
  additionalCopies: CartItem[];
  contactInfo: ContactInfo;
  basePrice: number;
  additionsPrice: number;
  shippingCost: number;
  totalPrice: number;
  currency: string;
}

// Legacy Product catalog - use DEFAULT_PRODUCTS instead
// This is kept for backward compatibility but should be migrated to use dynamic products from settings
export const PRODUCT_CATALOG = {
  productOptions: [],  // Will be populated from settings

  additionalCopies: [
    {
      id: 'copy_4x5_set',
      name: '4x5 cm (Set de 4)',
      size: '4x5',
      price: 600, // $600 ARS
      isSet: true,
      setQuantity: 4,
      description: 'Set de 4 fotos de la misma imagen en tamaño 4x5 cm',
    },
    {
      id: 'copy_10x15',
      name: '10x15 cm',
      size: '10x15',
      price: 800, // $800 ARS
      isSet: false,
      description: 'Foto individual de 10x15 cm',
    },
    {
      id: 'copy_13x18',
      name: '13x18 cm',
      size: '13x18',
      price: 1000, // $1,000 ARS
      isSet: false,
      description: 'Foto individual de 13x18 cm',
    },
    {
      id: 'copy_15x21',
      name: '15x21 cm',
      size: '15x21',
      price: 1200, // $1,200 ARS
      isSet: false,
      description: 'Foto individual de 15x21 cm',
    },
    {
      id: 'copy_20x30',
      name: '20x30 cm',
      size: '20x30',
      price: 2000, // $2,000 ARS
      isSet: false,
      description: 'Foto individual de 20x30 cm',
    },
  ],

  pricing: {
    currency: 'ARS',
    shippingCost: 1500, // $1,500 ARS envío a domicilio
    freeShippingThreshold: 15000, // Envío gratis en compras mayores a $15,000
    taxIncluded: true, // Precios con IVA incluido
  },

  shipping: {
    estimatedDays: '3-5 días hábiles',
    productionTime: '2-3 días hábiles',
    shippingTime: '1-2 días hábiles',
    coverage: 'Todo el país',
    trackingIncluded: true,
  },

  policies: {
    returnPolicy: '30 días para devoluciones',
    warrantyPeriod: '6 meses por defectos de impresión',
    cancellationWindow: '24 horas para cancelar',
    modificationWindow: '12 horas para modificar',
  },
};
