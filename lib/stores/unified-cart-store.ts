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

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

interface UnifiedCartStore {
  // Estado
  items: CartItem[];
  isOpen: boolean;
  contactInfo: ContactInfo | null;
  context: GalleryContextData | null;
  
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
  
  // Cálculos
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsCount: () => number;
  isItemInCart: (photoId: string) => boolean;
  getItemQuantity: (photoId: string) => number;
}

export const useUnifiedCartStore = create<UnifiedCartStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      items: [],
      isOpen: false,
      contactInfo: null,
      context: null,

      // Acciones del carrito
      addItem: (item) =>
        set((state) => {
          debugMigration('Adding item to unified cart', { 
            photoId: item.photoId, 
            context: state.context?.context,
            currentItemCount: state.items.length
          });

          const existingItem = state.items.find((i) => i.photoId === item.photoId);
          
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
              ...(state.context?.context === 'family' && { token: state.context.token }),
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
          eventId: context.eventId
        });
        
        set({ context });
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
      
      getItemsCount: () => {
        return get().items.length;
      },
      
      isItemInCart: (photoId: string) => {
        return get().items.some(item => item.photoId === photoId);
      },
      
      getItemQuantity: (photoId: string) => {
        const item = get().items.find(item => item.photoId === photoId);
        return item?.quantity || 0;
      },
    }),
    {
      name: 'unified-lookescolar-cart',
      partialize: (state) => ({ 
        items: state.items,
        contactInfo: state.contactInfo,
        // No persistir isOpen ni context - se recalculan en cada sesión
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