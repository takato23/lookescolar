// Checkout steps for e-commerce flow
export enum CheckoutStep {
  PACKAGE = 'package',
  PHOTOS = 'photos', 
  EXTRAS = 'extras',
  CONTACT = 'contact',
  PAYMENT = 'payment'
}

// Product option types
export enum ProductOptionType {
  OPTION_A = 'option_a',
  OPTION_B = 'option_b'
}

// Cart item types
export enum CartItemType {
  BASE_PACKAGE = 'base_package',
  ADDITIONAL_COPY = 'additional_copy'
}

// Payment status
export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Additional copy sizes
export enum CopySize {
  SIZE_4X5 = '4x5',
  SIZE_10X15 = '10x15',
  SIZE_13X18 = '13x18', 
  SIZE_15X21 = '15x21',
  SIZE_20X30 = '20x30'
}

// Format checkout step names
export const formatCheckoutStep = (step: CheckoutStep): string => {
  const stepMap = {
    [CheckoutStep.PACKAGE]: 'Seleccionar Paquete',
    [CheckoutStep.PHOTOS]: 'Elegir Fotos',
    [CheckoutStep.EXTRAS]: 'Copias Adicionales',
    [CheckoutStep.CONTACT]: 'Información de Contacto',
    [CheckoutStep.PAYMENT]: 'Finalizar Compra'
  };
  return stepMap[step] || step;
};

// Format product option names
export const formatProductOption = (option: ProductOptionType): string => {
  const optionMap = {
    [ProductOptionType.OPTION_A]: 'OPCIÓN A',
    [ProductOptionType.OPTION_B]: 'OPCIÓN B'
  };
  return optionMap[option] || option;
};

// Format copy size display
export const formatCopySize = (size: CopySize): string => {
  const sizeMap = {
    [CopySize.SIZE_4X5]: '4x5 cm',
    [CopySize.SIZE_10X15]: '10x15 cm', 
    [CopySize.SIZE_13X18]: '13x18 cm',
    [CopySize.SIZE_15X21]: '15x21 cm',
    [CopySize.SIZE_20X30]: '20x30 cm'
  };
  return sizeMap[size] || size;
};

// Format currency for Argentine Pesos
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format shipping information
export const formatShippingInfo = (cost: number, freeThreshold: number): string => {
  return cost === 0 ? 'Envío gratis' : `Envío: ${formatCurrency(cost)} (Gratis en compras mayores a ${formatCurrency(freeThreshold)})`;
};

// Props types for e-commerce components
export interface EcommerceFlowProps {
  token: string;
  photos: PhotoData[];
  onComplete: (orderId: string) => void;
}

export interface ProductPackage {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  type: string;
  contents: PackageContents;
  features: string[];
}

export interface PackageContents {
  folderSize: string;
  individualPhotos: number;
  individualSize: string;
  smallPhotos: number;
  smallSize: string;
  groupPhotos: number;
  groupSize: string;
}

export interface PhotoData {
  id: string;
  filename: string;
  preview_url: string;
  type: 'individual' | 'group';
  size?: number;
  width?: number;
  height?: number;
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

export interface OrderSummary {
  basePrice: number;
  additionsPrice: number;
  shippingCost: number;
  totalPrice: number;
  currency: string;
}

// Mock data for e-commerce flow
export const mockEcommerceData = {
  // Product packages from existing PRODUCT_CATALOG
  packages: [
    {
      id: 'option_a',
      name: 'OPCIÓN A',
      description: 'Carpeta personalizada completa con fotos individuales y grupales',
      basePrice: 8500,
      type: 'option_a' as const,
      contents: {
        folderSize: '20x30 cm',
        individualPhotos: 1,
        individualSize: '15x21 cm',
        smallPhotos: 4,
        smallSize: '4x5 cm',
        groupPhotos: 1,
        groupSize: '15x21 cm',
      },
      features: [
        'Carpeta personalizada de 20x30 cm',
        '1 foto individual de 15x21 cm',
        '4 fotos pequeñas de 4x5 cm',
        '1 foto grupal de 15x21 cm',
        'Impresión de alta calidad',
        'Terminación mate'
      ]
    },
    {
      id: 'option_b', 
      name: 'OPCIÓN B',
      description: 'Carpeta personalizada premium con más fotos individuales',
      basePrice: 12500,
      type: 'option_b' as const,
      contents: {
        folderSize: '20x30 cm',
        individualPhotos: 2,
        individualSize: '15x21 cm',
        smallPhotos: 8,
        smallSize: '4x5 cm',
        groupPhotos: 1,
        groupSize: '15x21 cm',
      },
      features: [
        'Carpeta personalizada de 20x30 cm',
        '2 fotos individuales de 15x21 cm',
        '8 fotos pequeñas de 4x5 cm',
        '1 foto grupal de 15x21 cm',
        'Impresión de alta calidad',
        'Terminación mate'
      ]
    }
  ],

  // Additional copy options
  additionalCopies: [
    {
      id: 'copy_4x5_set',
      name: '4x5 cm (Set de 4)',
      size: '4x5',
      price: 600,
      isSet: true,
      setQuantity: 4,
      description: 'Set de 4 fotos de la misma imagen'
    },
    {
      id: 'copy_10x15',
      name: '10x15 cm',
      size: '10x15', 
      price: 800,
      isSet: false,
      description: 'Foto individual de 10x15 cm'
    },
    {
      id: 'copy_13x18',
      name: '13x18 cm',
      size: '13x18',
      price: 1000,
      isSet: false,
      description: 'Foto individual de 13x18 cm'
    },
    {
      id: 'copy_15x21',
      name: '15x21 cm',
      size: '15x21',
      price: 1200,
      isSet: false,
      description: 'Foto individual de 15x21 cm'
    },
    {
      id: 'copy_20x30',
      name: '20x30 cm',
      size: '20x30',
      price: 2000,
      isSet: false,
      description: 'Foto individual de 20x30 cm'
    }
  ],

  // Sample photos for selection
  availablePhotos: [
    { id: 'photo_1', filename: 'individual_001.jpg', preview_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop', type: 'individual' as const },
    { id: 'photo_2', filename: 'individual_002.jpg', preview_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop', type: 'individual' as const },
    { id: 'photo_3', filename: 'individual_003.jpg', preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop', type: 'individual' as const },
    { id: 'photo_4', filename: 'group_001.jpg', preview_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop', type: 'group' as const },
    { id: 'photo_5', filename: 'group_002.jpg', preview_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop', type: 'group' as const }
  ],

  // Pricing configuration
  pricing: {
    currency: 'ARS',
    shippingCost: 1500,
    freeShippingThreshold: 15000,
    taxIncluded: true
  },

  // Sample cart items
  cartItems: [
    {
      id: 'cart_1',
      type: 'base_package' as const,
      productId: 'option_a',
      quantity: 1,
      unitPrice: 8500,
      totalPrice: 8500,
      metadata: {
        photoIds: ['photo_1', 'photo_4']
      }
    },
    {
      id: 'cart_2', 
      type: 'additional_copy' as const,
      productId: 'copy_15x21',
      quantity: 2,
      unitPrice: 1200,
      totalPrice: 2400,
      metadata: {
        size: '15x21'
      }
    }
  ],

  // Sample contact information
  contactInfo: {
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+54 9 11 1234-5678',
    address: {
      street: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1043',
      country: 'Argentina'
    }
  }
};