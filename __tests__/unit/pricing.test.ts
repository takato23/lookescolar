import { describe, it, expect } from 'vitest';
import { 
  calculatePriceBreakdown, 
  formatPrice, 
  validatePhotoSelection,
  getSelectionInstructions 
} from '@/lib/pricing';
import { BASE_OPTIONS, AVAILABLE_UPSELLS } from '@/lib/stores/wizard-store';

describe('Pricing Functions', () => {
  describe('calculatePriceBreakdown', () => {
    it('should calculate base price only', () => {
      const option = BASE_OPTIONS[0];
      const result = calculatePriceBreakdown(option, {}, AVAILABLE_UPSELLS);
      
      expect(result.basePrice).toBe(option.price);
      expect(result.upsellsPrice).toBe(0);
      expect(result.total).toBe(option.price);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('base');
    });

    it('should calculate with upsells', () => {
      const option = BASE_OPTIONS[0];
      const upsells = {
        [AVAILABLE_UPSELLS[0].id]: 2,
        [AVAILABLE_UPSELLS[1].id]: 1
      };
      
      const result = calculatePriceBreakdown(option, upsells, AVAILABLE_UPSELLS);
      
      const expectedUpsellsPrice = (AVAILABLE_UPSELLS[0].price * 2) + AVAILABLE_UPSELLS[1].price;
      
      expect(result.basePrice).toBe(option.price);
      expect(result.upsellsPrice).toBe(expectedUpsellsPrice);
      expect(result.total).toBe(option.price + expectedUpsellsPrice);
      expect(result.items).toHaveLength(3); // 1 base + 2 upsells
    });

    it('should handle null option', () => {
      const result = calculatePriceBreakdown(null, {}, AVAILABLE_UPSELLS);
      
      expect(result.basePrice).toBe(0);
      expect(result.upsellsPrice).toBe(0);
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should ignore invalid upsells', () => {
      const option = BASE_OPTIONS[0];
      const upsells = {
        'invalid-upsell': 5,
        [AVAILABLE_UPSELLS[0].id]: 1
      };
      
      const result = calculatePriceBreakdown(option, upsells, AVAILABLE_UPSELLS);
      
      expect(result.upsellsPrice).toBe(AVAILABLE_UPSELLS[0].price);
      expect(result.items).toHaveLength(2); // 1 base + 1 valid upsell
    });
  });

  describe('formatPrice', () => {
    it('should format Argentine pesos correctly', () => {
      expect(formatPrice(2500)).toContain('2.500');
      expect(formatPrice(1000)).toContain('1.000');
      expect(formatPrice(0)).toContain('0');
    });

    it('should handle large numbers', () => {
      expect(formatPrice(25000)).toContain('25.000');
      expect(formatPrice(100000)).toContain('100.000');
    });
  });

  describe('validatePhotoSelection', () => {
    it('should validate Option 1 (1 photo)', () => {
      const option = BASE_OPTIONS[0]; // 1 photo
      
      // No photos selected
      let result = validatePhotoSelection([], option);
      expect(result.isValid).toBe(false);
      expect(result.required).toBe(1);
      expect(result.selected).toBe(0);
      expect(result.canRepeat).toBe(false);
      
      // Correct number of photos
      result = validatePhotoSelection(['photo1'], option);
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('1 foto seleccionada');
      
      // Too many photos
      result = validatePhotoSelection(['photo1', 'photo2'], option);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Solo puedes seleccionar 1 foto');
    });

    it('should validate Option 2 (2 photos)', () => {
      const option = BASE_OPTIONS[1]; // 2 photos
      
      // No photos selected
      let result = validatePhotoSelection([], option);
      expect(result.isValid).toBe(false);
      expect(result.canRepeat).toBe(true);
      
      // One photo selected
      result = validatePhotoSelection(['photo1'], option);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Selecciona 1 foto más');
      
      // Correct number (same photo repeated)
      result = validatePhotoSelection(['photo1', 'photo1'], option);
      expect(result.isValid).toBe(true);
      
      // Correct number (different photos)
      result = validatePhotoSelection(['photo1', 'photo2'], option);
      expect(result.isValid).toBe(true);
    });

    it('should handle null option', () => {
      const result = validatePhotoSelection(['photo1'], null);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Debes seleccionar una opción primero');
    });
  });

  describe('getSelectionInstructions', () => {
    it('should provide instructions for Option 1', () => {
      const option = BASE_OPTIONS[0]; // 1 photo
      
      let instructions = getSelectionInstructions(option, []);
      expect(instructions).toBe('Toca una foto para seleccionarla');
      
      instructions = getSelectionInstructions(option, ['photo1']);
      expect(instructions).toBe('¡Perfecto! Puedes continuar al siguiente paso');
    });

    it('should provide instructions for Option 2', () => {
      const option = BASE_OPTIONS[1]; // 2 photos
      
      let instructions = getSelectionInstructions(option, []);
      expect(instructions).toBe('Toca 2 fotos para seleccionarlas (puedes repetir la misma)');
      
      instructions = getSelectionInstructions(option, ['photo1']);
      expect(instructions).toBe('Selecciona 1 foto más');
      
      instructions = getSelectionInstructions(option, ['photo1', 'photo2']);
      expect(instructions).toBe('¡Perfecto! Puedes continuar al siguiente paso');
    });

    it('should handle null option', () => {
      const instructions = getSelectionInstructions(null, []);
      expect(instructions).toBe('');
    });
  });
});