import { WizardOption, Upsell } from './stores/wizard-store';

// Note: Legacy functions are exported below with their implementations

export interface PriceBreakdown {
  basePrice: number;
  upsellsPrice: number;
  subtotal: number;
  tax?: number;
  total: number;
  items: PriceItem[];
}

export interface PriceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'base' | 'copy' | 'size';
}

/**
 * Calculates complete price breakdown for wizard selection
 */
export function calculatePriceBreakdown(
  selectedOption: WizardOption | null,
  selectedUpsells: Record<string, number>,
  availableUpsells: Upsell[]
): PriceBreakdown {
  const items: PriceItem[] = [];
  
  // Base option
  const basePrice = selectedOption?.price || 0;
  if (selectedOption) {
    items.push({
      id: `option-${selectedOption.id}`,
      name: selectedOption.name,
      quantity: 1,
      unitPrice: basePrice,
      totalPrice: basePrice,
      category: 'base'
    });
  }
  
  // Upsells
  let upsellsPrice = 0;
  Object.entries(selectedUpsells).forEach(([upsellId, quantity]) => {
    const upsell = availableUpsells.find(u => u.id === upsellId);
    if (upsell && quantity > 0) {
      const totalPrice = upsell.price * quantity;
      upsellsPrice += totalPrice;
      
      items.push({
        id: upsell.id,
        name: upsell.name,
        quantity,
        unitPrice: upsell.price,
        totalPrice,
        category: upsell.category
      });
    }
  });
  
  const subtotal = basePrice + upsellsPrice;
  const total = subtotal; // No tax for now
  
  return {
    basePrice,
    upsellsPrice,
    subtotal,
    total,
    items
  };
}

/**
 * Formats price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Enhanced photo selection validation for new package structure
 */
export interface PhotoSelectionState {
  individual: string[];
  group: string[];
}

export interface PhotoValidationResult {
  isValid: boolean;
  individual: {
    required: number;
    selected: number;
    isValid: boolean;
    message: string;
  };
  group: {
    required: boolean;
    selected: number;
    isValid: boolean;
    message: string;
  };
  overall: {
    canProceed: boolean;
    message: string;
  };
}

/**
 * Validates photo selection against package requirements
 */
export function validatePhotoSelection(
  selectedPhotos: PhotoSelectionState,
  selectedPackage: PackageOption | null
): PhotoValidationResult {
  if (!selectedPackage) {
    return {
      isValid: false,
      individual: {
        required: 0,
        selected: 0,
        isValid: false,
        message: 'Selecciona un paquete primero'
      },
      group: {
        required: false,
        selected: 0,
        isValid: false,
        message: 'Selecciona un paquete primero'
      },
      overall: {
        canProceed: false,
        message: 'Debes seleccionar una opción (A o B) primero'
      }
    };
  }
  
  const req = selectedPackage.photoRequirements;
  const individualSelected = selectedPhotos.individual.length;
  const groupSelected = selectedPhotos.group.length;
  
  // Validate individual photos
  const individualValid = individualSelected === req.individualPhotos;
  let individualMessage = '';
  
  if (individualSelected === 0) {
    individualMessage = `Selecciona ${req.individualPhotos} foto${req.individualPhotos > 1 ? 's' : ''} individual${req.individualPhotos > 1 ? 'es' : ''}`;
  } else if (individualSelected < req.individualPhotos) {
    const missing = req.individualPhotos - individualSelected;
    individualMessage = `Falta${missing > 1 ? 'n' : ''} ${missing} foto${missing > 1 ? 's' : ''} individual${missing > 1 ? 'es' : ''}`;
  } else if (individualSelected > req.individualPhotos) {
    const excess = individualSelected - req.individualPhotos;
    individualMessage = `Quita ${excess} foto${excess > 1 ? 's' : ''} individual${excess > 1 ? 'es' : ''}`;
  } else {
    individualMessage = `✓ ${individualSelected} foto${individualSelected > 1 ? 's' : ''} individual${individualSelected > 1 ? 'es' : ''} seleccionada${individualSelected > 1 ? 's' : ''}`;
  }
  
  // Validate group photo
  const groupValid = req.groupPhoto ? groupSelected === 1 : groupSelected === 0;
  let groupMessage = '';
  
  if (req.groupPhoto) {
    if (groupSelected === 0) {
      groupMessage = 'Selecciona 1 foto grupal';
    } else if (groupSelected === 1) {
      groupMessage = '✓ Foto grupal seleccionada';
    } else {
      groupMessage = 'Solo puedes seleccionar 1 foto grupal';
    }
  } else {
    if (groupSelected === 0) {
      groupMessage = 'No se requiere foto grupal';
    } else {
      groupMessage = 'Este paquete no incluye foto grupal';
    }
  }
  
  // Overall validation
  const isValid = individualValid && groupValid;
  let overallMessage = '';
  
  if (isValid) {
    overallMessage = '¡Perfecto! Todas las fotos requeridas están seleccionadas';
  } else {
    const issues = [];
    if (!individualValid) issues.push('fotos individuales');
    if (!groupValid) issues.push('foto grupal');
    overallMessage = `Revisa la selección de: ${issues.join(', ')}`;
  }
  
  return {
    isValid,
    individual: {
      required: req.individualPhotos,
      selected: individualSelected,
      isValid: individualValid,
      message: individualMessage
    },
    group: {
      required: req.groupPhoto,
      selected: groupSelected,
      isValid: groupValid,
      message: groupMessage
    },
    overall: {
      canProceed: isValid,
      message: overallMessage
    }
  };
}

/**
 * Legacy validation function for backward compatibility
 */
export function validatePhotoSelectionLegacy(
  selectedPhotos: string[],
  selectedOption: WizardOption | null
): {
  isValid: boolean;
  required: number;
  selected: number;
  canRepeat: boolean;
  message: string;
} {
  if (!selectedOption) {
    return {
      isValid: false,
      required: 0,
      selected: 0,
      canRepeat: false,
      message: 'Debes seleccionar una opción primero'
    };
  }
  
  const required = selectedOption.photos;
  const selected = selectedPhotos.length;
  const canRepeat = selectedOption.photos > 1; // Allow repetition in Option 2
  
  if (selected === 0) {
    return {
      isValid: false,
      required,
      selected,
      canRepeat,
      message: `Selecciona ${required} foto${required > 1 ? 's' : ''}`
    };
  }
  
  if (selected < required) {
    const remaining = required - selected;
    return {
      isValid: false,
      required,
      selected,
      canRepeat,
      message: `Selecciona ${remaining} foto${remaining > 1 ? 's' : ''} más`
    };
  }
  
  if (selected > required) {
    return {
      isValid: false,
      required,
      selected,
      canRepeat,
      message: `Solo puedes seleccionar ${required} foto${required > 1 ? 's' : ''}`
    };
  }
  
  return {
    isValid: true,
    required,
    selected,
    canRepeat,
    message: `${selected} foto${selected > 1 ? 's' : ''} seleccionada${selected > 1 ? 's' : ''}`
  };
}

/**
 * Gets detailed photo selection instructions based on package requirements
 */
export function getSelectionInstructions(
  selectedPackage: PackageOption | null,
  selectedPhotos: PhotoSelectionState
): {
  individual: string;
  group: string;
  overall: string;
} {
  if (!selectedPackage) {
    return {
      individual: 'Selecciona un paquete primero',
      group: 'Selecciona un paquete primero',
      overall: 'Elige OPCIÓN A o OPCIÓN B para comenzar'
    };
  }
  
  const req = selectedPackage.photoRequirements;
  const individualCount = selectedPhotos.individual.length;
  const groupCount = selectedPhotos.group.length;
  
  // Individual photo instructions
  let individualInstr = '';
  if (individualCount === 0) {
    individualInstr = `Selecciona ${req.individualPhotos} foto${req.individualPhotos > 1 ? 's' : ''} individual${req.individualPhotos > 1 ? 'es' : ''}`;
  } else if (individualCount < req.individualPhotos) {
    const remaining = req.individualPhotos - individualCount;
    individualInstr = `Selecciona ${remaining} foto${remaining > 1 ? 's' : ''} individual${remaining > 1 ? 'es' : ''} más`;
  } else if (individualCount === req.individualPhotos) {
    individualInstr = '✓ Fotos individuales completas';
    if (req.canRepeatIndividual) {
      individualInstr += ' (se usarán también para las fotos 4x5)';
    }
  } else {
    const excess = individualCount - req.individualPhotos;
    individualInstr = `Quita ${excess} foto${excess > 1 ? 's' : ''} individual${excess > 1 ? 'es' : ''}`;
  }
  
  // Group photo instructions
  let groupInstr = '';
  if (req.groupPhoto) {
    if (groupCount === 0) {
      groupInstr = 'Selecciona 1 foto grupal';
    } else if (groupCount === 1) {
      groupInstr = '✓ Foto grupal seleccionada';
    } else {
      groupInstr = 'Solo puedes seleccionar 1 foto grupal';
    }
  } else {
    groupInstr = 'Este paquete no incluye foto grupal';
  }
  
  // Overall instructions
  let overallInstr = '';
  const validation = validatePhotoSelection(selectedPhotos, selectedPackage);
  if (validation.isValid) {
    overallInstr = '¡Perfecto! Puedes continuar con los extras';
  } else {
    overallInstr = 'Completa la selección de fotos para continuar';
  }
  
  return {
    individual: individualInstr,
    group: groupInstr,
    overall: overallInstr
  };
}

/**
 * Legacy instructions function for backward compatibility
 */
export function getSelectionInstructionsLegacy(
  selectedOption: WizardOption | null,
  selectedPhotos: string[]
): string {
  if (!selectedOption) return '';
  
  const required = selectedOption.photos;
  const selected = selectedPhotos.length;
  
  if (selected === 0) {
    if (required === 1) {
      return 'Toca una foto para seleccionarla';
    } else {
      return `Toca ${required} fotos para seleccionarlas (puedes repetir la misma)`;
    }
  }
  
  if (selected < required) {
    const remaining = required - selected;
    return `Selecciona ${remaining} foto${remaining > 1 ? 's' : ''} más`;
  }
  
  if (selected === required) {
    return '¡Perfecto! Puedes continuar al siguiente paso';
  }
  
  return `Solo puedes seleccionar ${required} foto${required > 1 ? 's' : ''}`;
}

/**
 * Updated Package Options based on exact client requirements
 */
export interface PackageOption {
  id: string;
  name: string;
  description: string;
  price: number;
  includes: PackageInclude[];
  photoRequirements: PhotoRequirement;
  mockupUrl?: string;
}

export interface PackageInclude {
  type: 'carpeta' | 'individual' | 'grupo' | 'mini';
  size: string;
  quantity: number;
  description: string;
}

export interface PhotoRequirement {
  individualPhotos: number; // Number of individual photos to select
  groupPhoto: boolean; // Whether group photo is included
  canRepeatIndividual: boolean; // Whether same individual photo can be used for mini copies
  totalSelections: number; // Total photos user needs to select
}

export interface AdditionalCopy {
  id: string;
  name: string;
  size: string;
  price: number;
  description: string;
  requiresBasePackage: boolean;
}

/**
 * Client-specified package options - Exact specifications
 */
export const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: 'option-a',
    name: 'OPCIÓN A',
    description: 'Carpeta impresa con diseño personalizado',
    price: 18500, // Updated realistic pricing for Argentina
    includes: [
      { type: 'carpeta', size: '20x30', quantity: 1, description: 'Carpeta impresa con diseño personalizado (20x30)' },
      { type: 'individual', size: '15x21', quantity: 1, description: '1 foto INDIVIDUAL (15x21)' },
      { type: 'mini', size: '4x5', quantity: 4, description: '4 fotos 4x5 (de la misma que la individual elegida)' },
      { type: 'grupo', size: '15x21', quantity: 1, description: '1 foto grupal (15x21)' }
    ],
    photoRequirements: {
      individualPhotos: 1,
      groupPhoto: true,
      canRepeatIndividual: true,
      totalSelections: 2 // 1 individual + 1 group
    },
    mockupUrl: '/mockups/option1.jpg'
  },
  {
    id: 'option-b',
    name: 'OPCIÓN B',
    description: 'Carpeta impresa con diseño personalizado (opción premium)',
    price: 28500, // Updated realistic pricing for Argentina
    includes: [
      { type: 'carpeta', size: '20x30', quantity: 1, description: 'Carpeta impresa con diseño personalizado (20x30)' },
      { type: 'individual', size: '15x21', quantity: 2, description: '2 fotos INDIVIDUALES (15x21)' },
      { type: 'mini', size: '4x5', quantity: 8, description: '8 fotos 4x5 (de las mismas que las individuales elegidas)' },
      { type: 'grupo', size: '15x21', quantity: 1, description: '1 foto grupal (15x21)' }
    ],
    photoRequirements: {
      individualPhotos: 2,
      groupPhoto: true,
      canRepeatIndividual: true,
      totalSelections: 3 // 2 individual + 1 group
    },
    mockupUrl: '/mockups/option2.jpg'
  }
];

/**
 * Additional copy options - Only available with base package purchase
 */
export const ADDITIONAL_COPIES: AdditionalCopy[] = [
  {
    id: 'mini-4pack',
    name: '4x5 (4 fotitos)',
    size: '4x5',
    price: 2800,
    description: '4 fotos mini adicionales (4x5)',
    requiresBasePackage: true
  },
  {
    id: 'standard-10x15',
    name: '10x15',
    size: '10x15',
    price: 2200,
    description: 'Foto estándar (10x15)',
    requiresBasePackage: true
  },
  {
    id: 'medium-13x18',
    name: '13x18',
    size: '13x18',
    price: 3200,
    description: 'Foto mediana (13x18)',
    requiresBasePackage: true
  },
  {
    id: 'large-15x21',
    name: '15x21',
    size: '15x21',
    price: 4500,
    description: 'Foto grande (15x21)',
    requiresBasePackage: true
  },
  {
    id: 'poster-20x30',
    name: '20x30',
    size: '20x30',
    price: 7800,
    description: 'Poster grande (20x30)',
    requiresBasePackage: true
  }
];

/**
 * Validation result for package and extras selection
 */
export interface PackageValidationResult {
  isValid: boolean;
  canPurchaseExtras: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate package selection and additional copies
 */
export function validatePackageSelection(
  selectedPackage: PackageOption | null,
  additionalCopies: Record<string, number>,
  selectedPhotos: { individual: string[]; group: string[] }
): PackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if base package is selected
  if (!selectedPackage) {
    errors.push('Debes seleccionar una opción base (OPCIÓN A o OPCIÓN B)');
    return {
      isValid: false,
      canPurchaseExtras: false,
      errors,
      warnings
    };
  }
  
  // Validate photo selection requirements
  const photoReq = selectedPackage.photoRequirements;
  const individualCount = selectedPhotos.individual.length;
  const hasGroupPhoto = selectedPhotos.group.length > 0;
  
  if (individualCount < photoReq.individualPhotos) {
    const missing = photoReq.individualPhotos - individualCount;
    errors.push(`Falta${missing > 1 ? 'n' : ''} ${missing} foto${missing > 1 ? 's' : ''} individual${missing > 1 ? 'es' : ''}`);
  }
  
  if (individualCount > photoReq.individualPhotos) {
    const excess = individualCount - photoReq.individualPhotos;
    errors.push(`Has seleccionado ${excess} foto${excess > 1 ? 's' : ''} individual${excess > 1 ? 'es' : ''} de más`);
  }
  
  if (photoReq.groupPhoto && !hasGroupPhoto) {
    errors.push('Debes seleccionar una foto grupal');
  }
  
  if (!photoReq.groupPhoto && hasGroupPhoto) {
    warnings.push('Has seleccionado una foto grupal que no está incluida en este paquete');
  }
  
  // Validate extras can only be purchased with base package
  const hasExtras = Object.values(additionalCopies).some(qty => qty > 0);
  if (hasExtras) {
    // Check if any additional copy requires base package
    Object.entries(additionalCopies).forEach(([copyId, quantity]) => {
      if (quantity > 0) {
        const copy = ADDITIONAL_COPIES.find(c => c.id === copyId);
        if (copy?.requiresBasePackage && !selectedPackage) {
          errors.push(`${copy.name} solo se puede comprar junto con una opción base`);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    canPurchaseExtras: !!selectedPackage,
    errors,
    warnings
  };
}

/**
 * Calculate total for package and additional copies with validation
 */
export function calculateUnifiedTotal(
  selectedPackage: PackageOption | null,
  additionalCopies: Record<string, number>,
  selectedPhotos?: { individual: string[]; group: string[] }
): {
  packagePrice: number;
  additionalPrice: number;
  total: number;
  breakdown: Array<{ name: string; quantity: number; price: number; total: number }>;
  validation?: PackageValidationResult;
} {
  const breakdown: Array<{ name: string; quantity: number; price: number; total: number }> = [];
  
  // Package price
  const packagePrice = selectedPackage?.price || 0;
  if (selectedPackage) {
    breakdown.push({
      name: selectedPackage.name,
      quantity: 1,
      price: packagePrice,
      total: packagePrice
    });
  }
  
  // Additional copies (only if base package is selected)
  let additionalPrice = 0;
  if (selectedPackage) {
    Object.entries(additionalCopies).forEach(([copyId, quantity]) => {
      if (quantity > 0) {
        const copy = ADDITIONAL_COPIES.find(c => c.id === copyId);
        if (copy) {
          const total = copy.price * quantity;
          additionalPrice += total;
          breakdown.push({
            name: copy.name,
            quantity,
            price: copy.price,
            total
          });
        }
      }
    });
  }
  
  const result = {
    packagePrice,
    additionalPrice,
    total: packagePrice + additionalPrice,
    breakdown
  };
  
  // Add validation if photo selection is provided
  if (selectedPhotos) {
    result.validation = validatePackageSelection(selectedPackage, additionalCopies, selectedPhotos);
  }
  
  return result;
}

/**
 * Default pricing configuration
 */
export const PRICING_CONFIG = {
  // Tax rate (0 = no tax)
  taxRate: 0,
  
  // Currency settings
  currency: 'ARS',
  locale: 'es-AR',
  
  // Discount thresholds (future use)
  discounts: {
    bulk: { threshold: 5, percentage: 0.1 }, // 10% off 5+ items
    firstTime: { percentage: 0.05 }, // 5% off first purchase
  },
  
  // Price limits for validation (updated for Argentina 2024)
  limits: {
    maxTotal: 150000, // Maximum order total (ARS)
    minTotal: 15000,  // Minimum order total (ARS)
  },
  
  // Package-specific rules
  packageRules: {
    requiresBasePackage: true, // Extras require base package
    allowPhotoRepetition: true, // Same photo can be used for mini copies
    groupPhotoMandatory: true, // Group photo is mandatory in both packages
  }
} as const;

/**
 * Helper function to get package by ID
 */
export function getPackageById(packageId: string): PackageOption | null {
  return PACKAGE_OPTIONS.find(pkg => pkg.id === packageId) || null;
}

/**
 * Helper function to get additional copy by ID
 */
export function getAdditionalCopyById(copyId: string): AdditionalCopy | null {
  return ADDITIONAL_COPIES.find(copy => copy.id === copyId) || null;
}

/**
 * Calculate savings compared to buying individually
 */
export function calculatePackageSavings(packageOption: PackageOption): number {
  // Estimate individual pricing for comparison
  const individualPrices = {
    carpeta: 8000,
    individual_15x21: 4500,
    mini_4x5: 2800 / 4, // Price per unit
    grupo_15x21: 4500
  };
  
  let individualTotal = 0;
  packageOption.includes.forEach(item => {
    switch (item.type) {
      case 'carpeta':
        individualTotal += individualPrices.carpeta * item.quantity;
        break;
      case 'individual':
        individualTotal += individualPrices.individual_15x21 * item.quantity;
        break;
      case 'mini':
        individualTotal += individualPrices.mini_4x5 * item.quantity;
        break;
      case 'grupo':
        individualTotal += individualPrices.grupo_15x21 * item.quantity;
        break;
    }
  });
  
  return Math.max(0, individualTotal - packageOption.price);
}