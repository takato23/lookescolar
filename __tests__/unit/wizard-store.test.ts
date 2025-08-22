import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore, BASE_OPTIONS, AVAILABLE_UPSELLS } from '@/lib/stores/wizard-store';

describe('WizardStore', () => {
  beforeEach(() => {
    // Clear localStorage to reset persisted state
    localStorage.clear();
    // Reset store state before each test
    useWizardStore.getState().reset();
    useWizardStore.setState({
      currentStep: 1,
      selectedOption: null,
      selectedPhotos: [],
      selectedUpsells: {},
      basePrice: 0,
      upsellsPrice: 0,
      totalPrice: 0,
      token: null,
    });
  });

  describe('Navigation', () => {
    it('should start at step 1', () => {
      const { currentStep } = useWizardStore.getState();
      expect(currentStep).toBe(1);
    });

    it('should navigate to next step when canProceed is true', () => {
      const store = useWizardStore.getState();
      
      // Select an option to proceed from step 1
      store.selectOption(BASE_OPTIONS[0]);
      expect(store.isStepValid(1)).toBe(true);
      
      store.nextStep();
      expect(store.currentStep).toBe(2);
    });

    it('should not navigate past step 4', () => {
      const store = useWizardStore.getState();
      store.setStep(4);
      store.nextStep();
      expect(store.currentStep).toBe(4);
    });

    it('should navigate backwards correctly', () => {
      const store = useWizardStore.getState();
      store.setStep(3);
      store.prevStep();
      expect(store.currentStep).toBe(2);
    });

    it('should not navigate before step 1', () => {
      const store = useWizardStore.getState();
      store.prevStep();
      expect(store.currentStep).toBe(1);
    });
  });

  describe('Option Selection', () => {
    it('should select an option and update base price', () => {
      const store = useWizardStore.getState();
      const option = BASE_OPTIONS[0];
      
      store.selectOption(option);
      
      expect(store.selectedOption).toEqual(option);
      expect(store.basePrice).toBe(option.price);
    });

    it('should reset photos when changing option', () => {
      const store = useWizardStore.getState();
      
      // Select option 1 and add photos
      store.selectOption(BASE_OPTIONS[0]);
      store.setPhotos(['photo1']);
      
      // Change to option 2 - should reset photos
      store.selectOption(BASE_OPTIONS[1]);
      
      expect(store.selectedPhotos).toEqual([]);
    });
  });

  describe('Photo Selection', () => {
    beforeEach(() => {
      // Select option 2 (2 photos) for testing
      useWizardStore.getState().selectOption(BASE_OPTIONS[1]);
    });

    it('should add photos up to the limit', () => {
      const store = useWizardStore.getState();
      
      store.togglePhoto('photo1');
      expect(store.selectedPhotos).toEqual(['photo1']);
      
      store.togglePhoto('photo2');
      expect(store.selectedPhotos).toEqual(['photo1', 'photo2']);
    });

    it('should not exceed photo limit', () => {
      const store = useWizardStore.getState();
      
      store.togglePhoto('photo1');
      store.togglePhoto('photo2');
      store.togglePhoto('photo3'); // Should not be added
      
      expect(store.selectedPhotos).toHaveLength(2);
      expect(store.selectedPhotos).toEqual(['photo1', 'photo2']);
    });

    it('should allow photo repetition in Option 2', () => {
      const store = useWizardStore.getState();
      
      store.togglePhoto('photo1');
      store.togglePhoto('photo1'); // Repeat same photo
      
      expect(store.selectedPhotos).toEqual(['photo1', 'photo1']);
    });

    it('should remove photos when toggled again', () => {
      const store = useWizardStore.getState();
      
      store.setPhotos(['photo1', 'photo2']);
      store.togglePhoto('photo1'); // Should remove one occurrence
      
      expect(store.selectedPhotos).toEqual(['photo2']);
    });
  });

  describe('Upsell Selection', () => {
    it('should add upsells and calculate prices', () => {
      const store = useWizardStore.getState();
      const upsell = AVAILABLE_UPSELLS[0];
      
      store.selectOption(BASE_OPTIONS[0]); // Select base option first
      store.setUpsell(upsell.id, 2);
      
      expect(store.selectedUpsells[upsell.id]).toBe(2);
      expect(store.upsellsPrice).toBe(upsell.price * 2);
      expect(store.totalPrice).toBe(BASE_OPTIONS[0].price + (upsell.price * 2));
    });

    it('should remove upsells when quantity is 0', () => {
      const store = useWizardStore.getState();
      const upsell = AVAILABLE_UPSELLS[0];
      
      store.setUpsell(upsell.id, 2);
      store.setUpsell(upsell.id, 0);
      
      expect(store.selectedUpsells[upsell.id]).toBeUndefined();
    });

    it('should calculate total price correctly with multiple upsells', () => {
      const store = useWizardStore.getState();
      
      store.selectOption(BASE_OPTIONS[0]);
      store.setUpsell(AVAILABLE_UPSELLS[0].id, 1);
      store.setUpsell(AVAILABLE_UPSELLS[1].id, 2);
      
      const expectedUpsellsPrice = AVAILABLE_UPSELLS[0].price + (AVAILABLE_UPSELLS[1].price * 2);
      const expectedTotal = BASE_OPTIONS[0].price + expectedUpsellsPrice;
      
      expect(store.upsellsPrice).toBe(expectedUpsellsPrice);
      expect(store.totalPrice).toBe(expectedTotal);
    });
  });

  describe('Step Validation', () => {
    it('should validate step 1 (option selection)', () => {
      const store = useWizardStore.getState();
      
      expect(store.isStepValid(1)).toBe(false);
      
      store.selectOption(BASE_OPTIONS[0]);
      expect(store.isStepValid(1)).toBe(true);
    });

    it('should validate step 2 (photo selection)', () => {
      const store = useWizardStore.getState();
      
      // Need option first
      store.selectOption(BASE_OPTIONS[0]); // 1 photo required
      expect(store.isStepValid(2)).toBe(false);
      
      store.setPhotos(['photo1']);
      expect(store.isStepValid(2)).toBe(true);
      
      // Test with Option 2
      store.selectOption(BASE_OPTIONS[1]); // 2 photos required
      expect(store.isStepValid(2)).toBe(false);
      
      store.setPhotos(['photo1', 'photo2']);
      expect(store.isStepValid(2)).toBe(true);
    });

    it('should validate step 3 (upsells are optional)', () => {
      const store = useWizardStore.getState();
      expect(store.isStepValid(3)).toBe(true);
    });

    it('should validate step 4 (complete selection)', () => {
      const store = useWizardStore.getState();
      
      expect(store.isStepValid(4)).toBe(false);
      
      // Complete all required steps
      store.selectOption(BASE_OPTIONS[0]);
      store.setPhotos(['photo1']);
      
      expect(store.isStepValid(4)).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      const store = useWizardStore.getState();
      
      // Set some state
      store.selectOption(BASE_OPTIONS[0]);
      store.setPhotos(['photo1']);
      store.setUpsell(AVAILABLE_UPSELLS[0].id, 1);
      store.setStep(3);
      
      // Reset
      store.reset();
      
      expect(store.currentStep).toBe(1);
      expect(store.selectedOption).toBe(null);
      expect(store.selectedPhotos).toEqual([]);
      expect(store.selectedUpsells).toEqual({});
      expect(store.basePrice).toBe(0);
      expect(store.upsellsPrice).toBe(0);
      expect(store.totalPrice).toBe(0);
    });
  });
});