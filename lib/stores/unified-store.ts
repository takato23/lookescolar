// lib/stores/unified-store.ts
// Store unificado usando Zustand para manejar el flujo de compra de productos físicos

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ProductOption,
  AdditionalCopy,
  CartItem,
  ContactInfo,
  UnifiedOrder,
  PRODUCT_CATALOG,
} from '@/lib/types/unified-store';

export type CheckoutStep =
  | 'package'
  | 'photos'
  | 'extras'
  | 'contact'
  | 'payment';

interface EventInfo {
  name: string;
  schoolName: string;
  gradeSection: string;
}

interface SelectedPhotos {
  individual: string[];
  group: string[];
}

interface UnifiedStoreState {
  // Basic info
  token: string | null;
  eventInfo: EventInfo | null;

  // Product selection
  selectedPackage: ProductOption | null;
  selectedPhotos: SelectedPhotos;

  // Cart management
  cartItems: CartItem[];

  // Contact and checkout
  contactInfo: ContactInfo | null;
  checkoutStep: CheckoutStep;

  // Order tracking
  currentOrderId: string | null;
}

interface UnifiedStoreActions {
  // Basic setup
  setToken: (token: string) => void;
  setEventInfo: (info: EventInfo) => void;

  // Package selection
  selectPackage: (packageId: string) => void;

  // Photo selection
  selectIndividualPhoto: (photoId: string) => void;
  selectGroupPhoto: (photoId: string) => void;
  removeSelectedPhoto: (photoId: string, type: 'individual' | 'group') => void;
  clearSelectedPhotos: () => void;

  // Cart management
  addToCart: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Contact management
  setContactInfo: (info: ContactInfo) => void;

  // Checkout flow
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: CheckoutStep) => void;
  canProceedToNextStep: () => boolean;

  // Pricing calculations
  getBasePrice: () => number;
  getAdditionsPrice: () => number;
  getShippingCost: () => number;
  getTotalPrice: () => number;

  // Order creation
  createOrder: () => UnifiedOrder | null;
  setCurrentOrderId: (orderId: string) => void;

  // Reset
  resetStore: () => void;
}

type UnifiedStore = UnifiedStoreState & UnifiedStoreActions;

const initialState: UnifiedStoreState = {
  token: null,
  eventInfo: null,
  selectedPackage: null,
  selectedPhotos: { individual: [], group: [] },
  cartItems: [],
  contactInfo: null,
  checkoutStep: 'package',
  currentOrderId: null,
};

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic setup
      setToken: (token) => set({ token }),
      setEventInfo: (eventInfo) => set({ eventInfo }),

      // Package selection
      selectPackage: (packageId) => {
        const packageOption = PRODUCT_CATALOG.productOptions.find(
          (p) => p.id === packageId
        );
        if (packageOption) {
          set({
            selectedPackage: packageOption,
            selectedPhotos: { individual: [], group: [] }, // Reset photo selection
          });
        }
      },

      // Photo selection
      selectIndividualPhoto: (photoId) => {
        const state = get();
        const maxPhotos = state.selectedPackage?.contents.individualPhotos || 0;

        set((state) => {
          const currentIndividual = state.selectedPhotos.individual;
          let newIndividual: string[];

          if (currentIndividual.includes(photoId)) {
            // Remove if already selected
            newIndividual = currentIndividual.filter((id) => id !== photoId);
          } else if (currentIndividual.length < maxPhotos) {
            // Add if under limit
            newIndividual = [...currentIndividual, photoId];
          } else {
            // Replace the last one if at limit
            newIndividual = [...currentIndividual.slice(0, -1), photoId];
          }

          return {
            selectedPhotos: {
              ...state.selectedPhotos,
              individual: newIndividual,
            },
          };
        });
      },

      selectGroupPhoto: (photoId) => {
        set((state) => {
          const currentGroup = state.selectedPhotos.group;
          const newGroup = currentGroup.includes(photoId)
            ? currentGroup.filter((id) => id !== photoId)
            : [photoId]; // Only allow one group photo

          return {
            selectedPhotos: {
              ...state.selectedPhotos,
              group: newGroup,
            },
          };
        });
      },

      removeSelectedPhoto: (photoId, type) => {
        set((state) => ({
          selectedPhotos: {
            ...state.selectedPhotos,
            [type]: state.selectedPhotos[type].filter((id) => id !== photoId),
          },
        }));
      },

      clearSelectedPhotos: () => {
        set({ selectedPhotos: { individual: [], group: [] } });
      },

      // Cart management
      addToCart: (item) => {
        const id = `${item.type}_${item.productId}_${Date.now()}`;
        const totalPrice = item.unitPrice * item.quantity;

        set((state) => ({
          cartItems: [...state.cartItems, { ...item, id, totalPrice }],
        }));
      },

      removeFromCart: (itemId) => {
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.id !== itemId),
        }));
      },

      updateCartItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }

        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === itemId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item
          ),
        }));
      },

      clearCart: () => set({ cartItems: [] }),

      // Contact management
      setContactInfo: (contactInfo) => set({ contactInfo }),

      // Checkout flow
      nextStep: () => {
        const steps: CheckoutStep[] = [
          'package',
          'photos',
          'extras',
          'contact',
          'payment',
        ];
        const currentIndex = steps.indexOf(get().checkoutStep);
        if (currentIndex < steps.length - 1) {
          set({ checkoutStep: steps[currentIndex + 1] });
        }
      },

      prevStep: () => {
        const steps: CheckoutStep[] = [
          'package',
          'photos',
          'extras',
          'contact',
          'payment',
        ];
        const currentIndex = steps.indexOf(get().checkoutStep);
        if (currentIndex > 0) {
          set({ checkoutStep: steps[currentIndex - 1] });
        }
      },

      setStep: (step) => set({ checkoutStep: step }),

      canProceedToNextStep: () => {
        const state = get();

        switch (state.checkoutStep) {
          case 'package':
            return !!state.selectedPackage;

          case 'photos':
            if (!state.selectedPackage) return false;
            const requiredIndividual =
              state.selectedPackage.contents.individualPhotos;
            const requiredGroup = state.selectedPackage.contents.groupPhotos;
            return (
              state.selectedPhotos.individual.length === requiredIndividual &&
              state.selectedPhotos.group.length === requiredGroup
            );

          case 'extras':
            return true; // Optional step

          case 'contact':
            return !!state.contactInfo;

          case 'payment':
            return !!state.contactInfo && !!state.selectedPackage;

          default:
            return false;
        }
      },

      // Pricing calculations
      getBasePrice: () => {
        const state = get();
        return state.selectedPackage?.basePrice || 0;
      },

      getAdditionsPrice: () => {
        const state = get();
        return state.cartItems.reduce(
          (total, item) => total + item.totalPrice,
          0
        );
      },

      getShippingCost: () => {
        const state = get();
        const subtotal = state.getBasePrice() + state.getAdditionsPrice();

        // Free shipping over threshold
        if (subtotal >= PRODUCT_CATALOG.pricing.freeShippingThreshold) {
          return 0;
        }

        return PRODUCT_CATALOG.pricing.shippingCost;
      },

      getTotalPrice: () => {
        const state = get();
        return (
          state.getBasePrice() +
          state.getAdditionsPrice() +
          state.getShippingCost()
        );
      },

      // Order creation
      createOrder: () => {
        const state = get();

        if (!state.selectedPackage || !state.contactInfo || !state.token) {
          return null;
        }

        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const order: UnifiedOrder = {
          id: orderId,
          token: state.token,
          basePackage: state.selectedPackage,
          selectedPhotos: state.selectedPhotos,
          additionalCopies: state.cartItems,
          contactInfo: state.contactInfo,
          basePrice: state.getBasePrice(),
          additionsPrice: state.getAdditionsPrice(),
          shippingCost: state.getShippingCost(),
          totalPrice: state.getTotalPrice(),
          currency: PRODUCT_CATALOG.pricing.currency,
        };

        set({ currentOrderId: orderId });
        return order;
      },

      setCurrentOrderId: (orderId) => set({ currentOrderId: orderId }),

      // Reset
      resetStore: () => set(initialState),
    }),
    {
      name: 'unified-store',
      partialize: (state) => ({
        // Only persist certain fields to avoid issues with page refreshes
        token: state.token,
        selectedPackage: state.selectedPackage,
        selectedPhotos: state.selectedPhotos,
        cartItems: state.cartItems,
        contactInfo: state.contactInfo,
        checkoutStep: state.checkoutStep,
        currentOrderId: state.currentOrderId,
      }),
    }
  )
);
