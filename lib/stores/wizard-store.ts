import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WizardOption {
  id: number;
  name: string;
  photos: number;
  price: number;
  mockupUrl: string;
  description: string;
}

export interface Upsell {
  id: string;
  name: string;
  price: number;
  category: 'copy' | 'size';
}

export interface WizardState {
  // Current step (1-4)
  currentStep: number;

  // Step 1: Selected option
  selectedOption: WizardOption | null;

  // Step 2: Selected photos (enhanced structure)
  selectedPhotos: {
    individual: string[]; // Individual photos
    group: string[]; // Group photo
  };

  // Legacy support for old selectedPhotos format
  selectedPhotosLegacy: string[];

  // Step 3: Selected upsells
  selectedUpsells: Record<string, number>; // upsellId -> quantity

  // Computed totals
  basePrice: number;
  upsellsPrice: number;
  totalPrice: number;

  // Session token for persistence
  token: string | null;
}

interface WizardActions {
  // Navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1: Option selection
  selectOption: (option: WizardOption) => void;

  // Step 2: Enhanced photo selection
  toggleIndividualPhoto: (photoId: string) => void;
  toggleGroupPhoto: (photoId: string) => void;
  setIndividualPhotos: (photoIds: string[]) => void;
  setGroupPhoto: (photoId: string | null) => void;
  clearPhotos: () => void;

  // Legacy photo selection (backward compatibility)
  togglePhoto: (photoId: string) => void;
  setPhotos: (photoIds: string[]) => void;

  // Step 3: Upsell selection
  setUpsell: (upsellId: string, quantity: number) => void;
  removeUpsell: (upsellId: string) => void;
  clearUpsells: () => void;

  // Validation
  canProceed: () => boolean;
  isStepValid: (step: number) => boolean;
  getPhotoValidation: () => any; // Import from pricing.ts

  // Price calculation
  calculatePrices: () => void;

  // Session management
  setToken: (token: string) => void;
  reset: () => void;
}

export type WizardStore = WizardState & WizardActions;

// Updated options to match exact client specifications
export const BASE_OPTIONS: WizardOption[] = [
  {
    id: 1,
    name: 'OPCIÓN A',
    photos: 2, // 1 individual + 1 group
    price: 18500,
    mockupUrl: '/mockups/option1.jpg',
    description:
      'Carpeta impresa con diseño personalizado (20x30) + 1 foto individual (15x21) + 4 fotos 4x5 + 1 foto grupal (15x21)',
  },
  {
    id: 2,
    name: 'OPCIÓN B',
    photos: 3, // 2 individual + 1 group
    price: 28500,
    mockupUrl: '/mockups/option2.jpg',
    description:
      'Carpeta impresa con diseño personalizado (20x30) + 2 fotos individuales (15x21) + 8 fotos 4x5 + 1 foto grupal (15x21)',
  },
];

// Updated upsells to match additional copy options
export const AVAILABLE_UPSELLS: Upsell[] = [
  { id: 'mini-4pack', name: '4x5 (4 fotitos)', price: 2800, category: 'copy' },
  { id: 'standard-10x15', name: '10x15', price: 2200, category: 'size' },
  { id: 'medium-13x18', name: '13x18', price: 3200, category: 'size' },
  { id: 'large-15x21', name: '15x21', price: 4500, category: 'size' },
  { id: 'poster-20x30', name: '20x30', price: 7800, category: 'size' },
];

const initialState: WizardState = {
  currentStep: 1,
  selectedOption: null,
  selectedPhotos: {
    individual: [],
    group: [],
  },
  selectedPhotosLegacy: [],
  selectedUpsells: {},
  basePrice: 0,
  upsellsPrice: 0,
  totalPrice: 0,
  token: null,
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setStep: (step) => set({ currentStep: Math.max(1, Math.min(4, step)) }),

      nextStep: () => {
        const state = get();
        if (state.canProceed() && state.currentStep < 4) {
          set({ currentStep: state.currentStep + 1 });
        }
      },

      prevStep: () => {
        const state = get();
        if (state.currentStep > 1) {
          set({ currentStep: state.currentStep - 1 });
        }
      },

      // Step 1: Option selection
      selectOption: (option) => {
        set({
          selectedOption: option,
          selectedPhotos: { individual: [], group: [] }, // Reset photos when changing option
          selectedPhotosLegacy: [], // Reset legacy format too
          basePrice: option.price,
        });
        get().calculatePrices();
      },

      // Step 2: Enhanced photo selection
      toggleIndividualPhoto: (photoId) => {
        const state = get();
        if (!state.selectedOption) return;

        const maxIndividual = state.selectedOption.id === 1 ? 1 : 2; // Option A: 1, Option B: 2
        const newIndividual = [...state.selectedPhotos.individual];
        const index = newIndividual.indexOf(photoId);

        if (index >= 0) {
          // Remove photo
          newIndividual.splice(index, 1);
        } else {
          // Add photo if within limit
          if (newIndividual.length < maxIndividual) {
            newIndividual.push(photoId);
          }
        }

        set({
          selectedPhotos: {
            ...state.selectedPhotos,
            individual: newIndividual,
          },
          selectedPhotosLegacy: [
            ...newIndividual,
            ...state.selectedPhotos.group,
          ], // Update legacy format
        });
      },

      toggleGroupPhoto: (photoId) => {
        const state = get();
        const currentGroup = state.selectedPhotos.group[0];
        const newGroup = currentGroup === photoId ? [] : [photoId];

        set({
          selectedPhotos: {
            ...state.selectedPhotos,
            group: newGroup,
          },
          selectedPhotosLegacy: [
            ...state.selectedPhotos.individual,
            ...newGroup,
          ], // Update legacy format
        });
      },

      setIndividualPhotos: (photoIds) => {
        const state = get();
        set({
          selectedPhotos: {
            ...state.selectedPhotos,
            individual: photoIds,
          },
          selectedPhotosLegacy: [...photoIds, ...state.selectedPhotos.group], // Update legacy format
        });
      },

      setGroupPhoto: (photoId) => {
        const state = get();
        const newGroup = photoId ? [photoId] : [];
        set({
          selectedPhotos: {
            ...state.selectedPhotos,
            group: newGroup,
          },
          selectedPhotosLegacy: [
            ...state.selectedPhotos.individual,
            ...newGroup,
          ], // Update legacy format
        });
      },

      clearPhotos: () =>
        set({
          selectedPhotos: { individual: [], group: [] },
          selectedPhotosLegacy: [],
        }),

      // Legacy photo selection (backward compatibility)
      togglePhoto: (photoId) => {
        const state = get();
        const newPhotos = [...state.selectedPhotosLegacy];
        const index = newPhotos.indexOf(photoId);

        if (index >= 0) {
          // Remove photo
          newPhotos.splice(index, 1);
        } else {
          // Add photo if within limit
          const maxPhotos = state.selectedOption?.photos || 0;
          if (newPhotos.length < maxPhotos) {
            newPhotos.push(photoId);
          }
        }

        set({ selectedPhotosLegacy: newPhotos });
      },

      setPhotos: (photoIds) => set({ selectedPhotosLegacy: photoIds }),

      // Step 3: Upsell selection
      setUpsell: (upsellId, quantity) => {
        const state = get();
        const newUpsells = { ...state.selectedUpsells };

        if (quantity <= 0) {
          delete newUpsells[upsellId];
        } else {
          newUpsells[upsellId] = quantity;
        }

        set({ selectedUpsells: newUpsells });
        get().calculatePrices();
      },

      removeUpsell: (upsellId) => {
        const state = get();
        const newUpsells = { ...state.selectedUpsells };
        delete newUpsells[upsellId];
        set({ selectedUpsells: newUpsells });
        get().calculatePrices();
      },

      clearUpsells: () => {
        set({ selectedUpsells: {} });
        get().calculatePrices();
      },

      // Validation
      canProceed: () => {
        const state = get();
        return state.isStepValid(state.currentStep);
      },

      isStepValid: (step) => {
        const state = get();

        switch (step) {
          case 1:
            return state.selectedOption !== null;
          case 2: {
            if (!state.selectedOption) return false;

            const requiredIndividual = state.selectedOption.id === 1 ? 1 : 2;
            const hasRequiredIndividual =
              state.selectedPhotos.individual.length === requiredIndividual;
            const hasRequiredGroup = state.selectedPhotos.group.length === 1; // Always required

            return hasRequiredIndividual && hasRequiredGroup;
          }
          case 3:
            return true; // Upsells are optional
          case 4: {
            if (!state.selectedOption) return false;

            const requiredIndividual = state.selectedOption.id === 1 ? 1 : 2;
            const hasRequiredIndividual =
              state.selectedPhotos.individual.length === requiredIndividual;
            const hasRequiredGroup = state.selectedPhotos.group.length === 1;

            return hasRequiredIndividual && hasRequiredGroup;
          }
          default:
            return false;
        }
      },

      getPhotoValidation: () => {
        const state = get();
        // This would import validatePhotoSelection from pricing.ts
        // Return validation object for UI display
        return {
          individual: {
            required: state.selectedOption?.id === 1 ? 1 : 2,
            selected: state.selectedPhotos.individual.length,
            isValid:
              state.selectedPhotos.individual.length ===
              (state.selectedOption?.id === 1 ? 1 : 2),
          },
          group: {
            required: true,
            selected: state.selectedPhotos.group.length,
            isValid: state.selectedPhotos.group.length === 1,
          },
        };
      },

      // Price calculation
      calculatePrices: () => {
        const state = get();
        const basePrice = state.selectedOption?.price || 0;

        const upsellsPrice = Object.entries(state.selectedUpsells).reduce(
          (total, [upsellId, quantity]) => {
            const upsell = AVAILABLE_UPSELLS.find((u) => u.id === upsellId);
            return total + (upsell ? upsell.price * quantity : 0);
          },
          0
        );

        const totalPrice = basePrice + upsellsPrice;

        set({ basePrice, upsellsPrice, totalPrice });
      },

      // Session management
      setToken: (token) => set({ token }),

      reset: () => set(initialState),
    }),
    {
      name: 'lookescolar-wizard',
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedOption: state.selectedOption,
        selectedPhotos: state.selectedPhotos,
        selectedPhotosLegacy: state.selectedPhotosLegacy,
        selectedUpsells: state.selectedUpsells,
        token: state.token,
      }),
    }
  )
);
