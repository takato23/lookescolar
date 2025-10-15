import {
  useUnifiedCartStore,
  useFamilyCartStore,
  usePublicCartStore,
  type CartItem,
  type ContactInfo,
} from '@/lib/stores/unified-cart-store';

export { useUnifiedCartStore, useFamilyCartStore, usePublicCartStore };
export type { CartItem, ContactInfo };

// Backward-compatible alias used throughout the app
export const useCartStore = useUnifiedCartStore;
