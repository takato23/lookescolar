import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  photoId: string;
  filename: string;
  price: number;
  quantity: number;
  watermarkUrl?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (photoId: string) => void;
  updateQuantity: (photoId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.photoId === item.photoId
          );

          if (existingItem) {
            // Increment quantity if item already exists
            return {
              items: state.items.map((i) =>
                i.photoId === item.photoId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }

          // Add new item with quantity 1
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        }),

      removeItem: (photoId) =>
        set((state) => ({
          items: state.items.filter((item) => item.photoId !== photoId),
        })),

      updateQuantity: (photoId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return {
              items: state.items.filter((item) => item.photoId !== photoId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.photoId === photoId ? { ...item, quantity } : item
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      openCart: () => set({ isOpen: true }),

      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getItemsCount: () => {
        const state = get();
        return state.items.length;
      },
    }),
    {
      name: 'lookescolar-cart',
      partialize: (state) => ({ items: state.items }), // Only persist items, not UI state
    }
  )
);
