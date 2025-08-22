import { describe, it, expect } from 'vitest';
import { 
  PACKAGE_OPTIONS, 
  ADDITIONAL_COPIES,
  calculateUnifiedTotal,
  validatePackageSelection,
  validatePhotoSelection,
  getSelectionInstructions,
  formatPrice,
  calculatePackageSavings,
  getPackageById,
  getAdditionalCopyById,
  type PhotoSelectionState,
  type PackageOption
} from '@/lib/pricing';

describe('Pricing Structure Validation', () => {
  describe('Package Options', () => {
    it('should have exactly 2 package options', () => {
      expect(PACKAGE_OPTIONS).toHaveLength(2);
    });

    it('should have correct OPCIÓN A specifications', () => {
      const optionA = PACKAGE_OPTIONS.find(opt => opt.id === 'option-a');
      expect(optionA).toBeDefined();
      expect(optionA?.name).toBe('OPCIÓN A');
      expect(optionA?.price).toBe(18500);
      expect(optionA?.photoRequirements).toEqual({
        individualPhotos: 1,
        groupPhoto: true,
        canRepeatIndividual: true,
        totalSelections: 2
      });
      expect(optionA?.includes).toHaveLength(4);
    });

    it('should have correct OPCIÓN B specifications', () => {
      const optionB = PACKAGE_OPTIONS.find(opt => opt.id === 'option-b');
      expect(optionB).toBeDefined();
      expect(optionB?.name).toBe('OPCIÓN B');
      expect(optionB?.price).toBe(28500);
      expect(optionB?.photoRequirements).toEqual({
        individualPhotos: 2,
        groupPhoto: true,
        canRepeatIndividual: true,
        totalSelections: 3
      });
      expect(optionB?.includes).toHaveLength(4);
    });
  });

  describe('Additional Copies', () => {
    it('should have 5 additional copy options', () => {
      expect(ADDITIONAL_COPIES).toHaveLength(5);
    });

    it('should all require base package', () => {
      ADDITIONAL_COPIES.forEach(copy => {
        expect(copy.requiresBasePackage).toBe(true);
      });
    });

    it('should have correct pricing structure', () => {
      const expectedPrices = {
        'mini-4pack': 2800,
        'standard-10x15': 2200,
        'medium-13x18': 3200,
        'large-15x21': 4500,
        'poster-20x30': 7800
      };

      ADDITIONAL_COPIES.forEach(copy => {
        expect(copy.price).toBe(expectedPrices[copy.id as keyof typeof expectedPrices]);
      });
    });
  });

  describe('Price Calculations', () => {
    it('should calculate OPCIÓN A total correctly', () => {
      const optionA = getPackageById('option-a');
      const result = calculateUnifiedTotal(optionA, {});
      
      expect(result.packagePrice).toBe(18500);
      expect(result.additionalPrice).toBe(0);
      expect(result.total).toBe(18500);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should calculate OPCIÓN B total correctly', () => {
      const optionB = getPackageById('option-b');
      const result = calculateUnifiedTotal(optionB, {});
      
      expect(result.packagePrice).toBe(28500);
      expect(result.additionalPrice).toBe(0);
      expect(result.total).toBe(28500);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should calculate package + extras correctly', () => {
      const optionA = getPackageById('option-a');
      const additionalCopies = {
        'mini-4pack': 1,
        'large-15x21': 2
      };
      
      const result = calculateUnifiedTotal(optionA, additionalCopies);
      
      expect(result.packagePrice).toBe(18500);
      expect(result.additionalPrice).toBe(2800 + (4500 * 2)); // 11800
      expect(result.total).toBe(30300);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should not add extras without base package', () => {
      const additionalCopies = {
        'mini-4pack': 1,
        'large-15x21': 1
      };
      
      const result = calculateUnifiedTotal(null, additionalCopies);
      
      expect(result.packagePrice).toBe(0);
      expect(result.additionalPrice).toBe(0);
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  describe('Photo Selection Validation', () => {
    it('should validate OPCIÓN A photo requirements', () => {
      const optionA = getPackageById('option-a');
      const validSelection: PhotoSelectionState = {
        individual: ['photo1'],
        group: ['group1']
      };
      
      const result = validatePhotoSelection(validSelection, optionA);
      
      expect(result.isValid).toBe(true);
      expect(result.individual.isValid).toBe(true);
      expect(result.group.isValid).toBe(true);
      expect(result.overall.canProceed).toBe(true);
    });

    it('should validate OPCIÓN B photo requirements', () => {
      const optionB = getPackageById('option-b');
      const validSelection: PhotoSelectionState = {
        individual: ['photo1', 'photo2'],
        group: ['group1']
      };
      
      const result = validatePhotoSelection(validSelection, optionB);
      
      expect(result.isValid).toBe(true);
      expect(result.individual.isValid).toBe(true);
      expect(result.group.isValid).toBe(true);
    });

    it('should reject incomplete photo selection', () => {
      const optionA = getPackageById('option-a');
      const incompleteSelection: PhotoSelectionState = {
        individual: [],
        group: []
      };
      
      const result = validatePhotoSelection(incompleteSelection, optionA);
      
      expect(result.isValid).toBe(false);
      expect(result.individual.isValid).toBe(false);
      expect(result.group.isValid).toBe(false);
    });

    it('should reject excess individual photos', () => {
      const optionA = getPackageById('option-a');
      const excessSelection: PhotoSelectionState = {
        individual: ['photo1', 'photo2'], // Too many for Option A
        group: ['group1']
      };
      
      const result = validatePhotoSelection(excessSelection, optionA);
      
      expect(result.isValid).toBe(false);
      expect(result.individual.isValid).toBe(false);
      expect(result.group.isValid).toBe(true);
    });
  });

  describe('Package Validation', () => {
    it('should prevent extras purchase without base package', () => {
      const additionalCopies = { 'mini-4pack': 1 };
      const photos: PhotoSelectionState = { individual: [], group: [] };
      
      const result = validatePackageSelection(null, additionalCopies, photos);
      
      expect(result.isValid).toBe(false);
      expect(result.canPurchaseExtras).toBe(false);
      expect(result.errors).toContain('Debes seleccionar una opción base (OPCIÓN A o OPCIÓN B)');
    });

    it('should allow extras with base package', () => {
      const optionA = getPackageById('option-a');
      const additionalCopies = { 'mini-4pack': 1 };
      const photos: PhotoSelectionState = {
        individual: ['photo1'],
        group: ['group1']
      };
      
      const result = validatePackageSelection(optionA, additionalCopies, photos);
      
      expect(result.canPurchaseExtras).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should format ARS prices correctly', () => {
      // Test the actual format returned by the function
      const price18500 = formatPrice(18500);
      const price28500 = formatPrice(28500);
      const price2800 = formatPrice(2800);
      
      // Check that it contains the expected components
      expect(price18500).toContain('18.500');
      expect(price28500).toContain('28.500');
      expect(price2800).toContain('2.800');
      
      // Check that it starts with currency symbol
      expect(price18500).toMatch(/^\$\s?18\.500$/);
      expect(price28500).toMatch(/^\$\s?28\.500$/);
      expect(price2800).toMatch(/^\$\s?2\.800$/);
    });

    it('should find package by ID', () => {
      const optionA = getPackageById('option-a');
      expect(optionA?.name).toBe('OPCIÓN A');
      
      const nonExistent = getPackageById('non-existent');
      expect(nonExistent).toBeNull();
    });

    it('should find additional copy by ID', () => {
      const miniPack = getAdditionalCopyById('mini-4pack');
      expect(miniPack?.name).toBe('4x5 (4 fotitos)');
      
      const nonExistent = getAdditionalCopyById('non-existent');
      expect(nonExistent).toBeNull();
    });

    it('should calculate package savings', () => {
      const optionA = getPackageById('option-a');
      const savings = calculatePackageSavings(optionA!);
      
      // Savings should be positive (package is cheaper than individual items)
      expect(savings).toBeGreaterThan(0);
    });
  });

  describe('Selection Instructions', () => {
    it('should provide clear instructions for Option A', () => {
      const optionA = getPackageById('option-a');
      const emptySelection: PhotoSelectionState = {
        individual: [],
        group: []
      };
      
      const instructions = getSelectionInstructions(optionA, emptySelection);
      
      expect(instructions.individual).toBe('Selecciona 1 foto individual');
      expect(instructions.group).toBe('Selecciona 1 foto grupal');
      expect(instructions.overall).toBe('Completa la selección de fotos para continuar');
    });

    it('should provide completion confirmation', () => {
      const optionA = getPackageById('option-a');
      const completeSelection: PhotoSelectionState = {
        individual: ['photo1'],
        group: ['group1']
      };
      
      const instructions = getSelectionInstructions(optionA, completeSelection);
      
      expect(instructions.individual).toContain('✓');
      expect(instructions.group).toContain('✓');
      expect(instructions.overall).toBe('¡Perfecto! Puedes continuar con los extras');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null package gracefully', () => {
      const result = calculateUnifiedTotal(null, {});
      expect(result.total).toBe(0);
      
      const validation = validatePhotoSelection({ individual: [], group: [] }, null);
      expect(validation.isValid).toBe(false);
    });

    it('should handle empty additional copies', () => {
      const optionA = getPackageById('option-a');
      const result = calculateUnifiedTotal(optionA, {});
      
      expect(result.additionalPrice).toBe(0);
      expect(result.total).toBe(optionA?.price);
    });

    it('should handle zero quantity additional copies', () => {
      const optionA = getPackageById('option-a');
      const additionalCopies = {
        'mini-4pack': 0,
        'large-15x21': 0
      };
      
      const result = calculateUnifiedTotal(optionA, additionalCopies);
      
      expect(result.additionalPrice).toBe(0);
      expect(result.breakdown).toHaveLength(1); // Only base package
    });
  });
});