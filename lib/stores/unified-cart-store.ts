// FASE 4: Cart Store Unificado para contextos público y familiar
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GalleryContextData } from '@/lib/gallery-context';
import { debugMigration } from '@/lib/feature-flags';

export interface CartItem {
  photoId: string;
  filename: string;
  price: number;
  quantity: number;
  watermarkUrl?: string; // Para preview (contexto familiar)
  priceType?: 'base' | 'premium'; // Para tipos de precio (contexto público)
  metadata?: {
    eventId?: string;
    context?: 'public' | 'family';
    token?: string; // Solo para contexto familiar
  };
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

export interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  discountCents: number; // Calculated discount amount in cents
  couponId: string;
}

interface UnifiedCartStore {
  // Estado
  items: CartItem[];
  isOpen: boolean;
  contactInfo: ContactInfo | null;
  context: GalleryContextData | null;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  isValidatingCoupon: boolean;

  // Acciones del carrito
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (photoId: string) => void;
  updateQuantity: (photoId: string, quantity: number) => void;
  clearCart: () => void;

  // Control del drawer
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Información de contacto
  setContactInfo: (info: ContactInfo) => void;

  // Contexto
  setContext: (context: GalleryContextData) => void;
  setEventId: (eventId: string | null) => void;
  getEventId: () => string | null;

  // Cálculos
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getTotalPriceWithDiscount: () => number;
  getDiscountAmount: () => number;
  getItemsCount: () => number;
  isItemInCart: (photoId: string) => boolean;
  getItemQuantity: (photoId: string) => number;

  // Cupones
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  recalculateCouponDiscount: () => void;
}

export const useUnifiedCartStore = create<UnifiedCartStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      items: [],
      isOpen: false,
      contactInfo: null,
      context: null,
      appliedCoupon: null,
      couponError: null,
      isValidatingCoupon: false,

      // Acciones del carrito
      addItem: (item) =>
        set((state) => {
          debugMigration('Adding item to unified cart', {
            photoId: item.photoId,
            context: state.context?.context,
            currentItemCount: state.items.length,
          });

          const existingItem = state.items.find(
            (i) => i.photoId === item.photoId
          );

          if (existingItem) {
            // Incrementar cantidad si el item ya existe
            return {
              items: state.items.map((i) =>
                i.photoId === item.photoId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }

          // Agregar nuevo item con cantidad 1 y contexto
          const newItem: CartItem = {
            ...item,
            price: item.price || 1000, // Precio por defecto: $10.00 ARS
            quantity: 1,
            metadata: {
              ...item.metadata,
              eventId: state.context?.eventId,
              context: state.context?.context,
              ...(state.context?.context === 'family' && {
                token: state.context.token,
              }),
            },
          };

          return {
            items: [...state.items, newItem],
          };
        }),

      removeItem: (photoId) =>
        set((state) => {
          debugMigration('Removing item from unified cart', { photoId });

          return {
            items: state.items.filter((item) => item.photoId !== photoId),
          };
        }),

      updateQuantity: (photoId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            // Remover item si la cantidad es 0 o menos
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

      clearCart: () => {
        debugMigration('Clearing unified cart');
        set({ items: [], contactInfo: null });
      },

      // Control del drawer
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      openCart: () => {
        debugMigration('Opening unified cart');
        set({ isOpen: true });
      },

      closeCart: () => {
        debugMigration('Closing unified cart');
        set({ isOpen: false });
      },

      // Información de contacto
      setContactInfo: (info) => {
        debugMigration('Setting contact info in unified cart');
        set({ contactInfo: info });
      },

      // Contexto
      setContext: (context) => {
        debugMigration('Setting context in unified cart', {
          context: context.context,
          eventId: context.eventId,
        });

        set({ context });
      },

      setEventId: (eventId) => {
        if (!eventId) {
          return;
        }

        debugMigration('Updating eventId in unified cart store', { eventId });

        set((state) => ({
          context: state.context
            ? { ...state.context, eventId }
            : { context: 'public', eventId },
        }));
      },

      getEventId: () => {
        const ctx = get().context;
        return ctx?.eventId ?? null;
      },

      // Cálculos
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getTotalPriceWithDiscount: () => {
        const totalPrice = get().getTotalPrice();
        const discount = get().getDiscountAmount();
        return Math.max(0, totalPrice - discount);
      },

      getDiscountAmount: () => {
        const coupon = get().appliedCoupon;
        if (!coupon) return 0;
        return coupon.discountCents;
      },

      getItemsCount: () => {
        return get().items.length;
      },

      isItemInCart: (photoId: string) => {
        return get().items.some((item) => item.photoId === photoId);
      },

      getItemQuantity: (photoId: string) => {
        const item = get().items.find((item) => item.photoId === photoId);
        return item?.quantity || 0;
      },

      // Cupones
      applyCoupon: async (code: string) => {
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) {
          set({ couponError: 'Ingresa un código de cupón' });
          return false;
        }

        set({ isValidatingCoupon: true, couponError: null });

        try {
          const subtotalCents = get().getTotalPrice();
          const response = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: trimmedCode,
              subtotalCents,
              hasPhysicalItems: true,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.valid) {
            set({
              couponError: data.error || 'Cupón inválido',
              isValidatingCoupon: false
            });
            return false;
          }

          const appliedCoupon: AppliedCoupon = {
            code: data.couponCode || trimmedCode,
            discountType: data.couponType === 'percentage' ? 'percentage' : 'fixed_amount',
            discountValue: data.couponType === 'percentage'
              ? Math.round((data.discountCents / get().getTotalPrice()) * 100)
              : data.discountCents,
            discountCents: data.discountCents,
            couponId: data.couponId,
          };

          set({
            appliedCoupon,
            couponError: null,
            isValidatingCoupon: false
          });

          debugMigration('Coupon applied successfully', {
            code: trimmedCode,
            discountCents: data.discountCents
          });

          return true;
        } catch (error) {
          console.error('[CartStore] Error validating coupon:', error);
          set({
            couponError: 'Error al validar el cupón',
            isValidatingCoupon: false
          });
          return false;
        }
      },

      removeCoupon: () => {
        debugMigration('Removing coupon from cart');
        set({ appliedCoupon: null, couponError: null });
      },

      recalculateCouponDiscount: () => {
        const coupon = get().appliedCoupon;
        if (!coupon) return;

        const totalCents = get().getTotalPrice();
        let discountCents = 0;

        if (coupon.discountType === 'percentage') {
          discountCents = Math.round(totalCents * (coupon.discountValue / 100));
        } else {
          discountCents = coupon.discountValue;
        }

        // Asegurar que el descuento no exceda el total
        discountCents = Math.min(discountCents, totalCents);

        set({
          appliedCoupon: { ...coupon, discountCents },
        });
      },
    }),
    {
      name: 'unified-lookescolar-cart',
      partialize: (state) => ({
        items: state.items,
        contactInfo: state.contactInfo,
        appliedCoupon: state.appliedCoupon,
        // No persistir isOpen, context, couponError, isValidatingCoupon
      }),
    }
  )
);

// Compatibility hooks para mantener API existente
export const useCartStore = useUnifiedCartStore; // Alias principal

// Hook específico para contexto familiar (compatibilidad con componentes existentes)
export const useFamilyCartStore = () => {
  const store = useUnifiedCartStore();

  // Verificar que estamos en contexto familiar
  if (store.context?.context !== 'family') {
    debugMigration('Warning: useFamilyCartStore used outside family context');
  }

  return store;
};

// Hook específico para contexto público (compatibilidad con componentes existentes)
export const usePublicCartStore = () => {
  const store = useUnifiedCartStore();

  // Verificar que estamos en contexto público
  if (store.context?.context !== 'public') {
    debugMigration('Warning: usePublicCartStore used outside public context');
  }

  return store;
};
