// Enhanced Product Cart Store
// Extends the unified cart with detailed product selection and customization

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  EnhancedCartItem, 
  PhotoProduct, 
  ComboPackage, 
  PriceCalculation,
  ProductRecommendation,
  PricingContext,
  ProductCartState
} from '@/lib/types/products';
import { 
  calculateProductCartTotal, 
  generateProductRecommendations,
  formatProductPrice 
} from '@/lib/services/product-pricing';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';

interface ProductCartStore {
  // Enhanced cart state
  enhanced_items: EnhancedCartItem[];
  selected_photos: Set<string>;
  product_context: PricingContext | null;
  current_calculation: PriceCalculation | null;
  recommendations: ProductRecommendation[];
  
  // Product selection state
  selected_products: Map<string, { product_id?: string; combo_id?: string; quantity: number }>;
  customization_options: Map<string, Record<string, any>>;
  
  // UI state
  is_product_selector_open: boolean;
  selected_photo_for_customization: string | null;
  current_step: 'photos' | 'products' | 'customization' | 'review';
  
  // Actions
  setProductContext: (context: PricingContext) => void;
  
  // Photo selection
  selectPhoto: (photo_id: string, filename?: string, watermark_url?: string) => void;
  deselectPhoto: (photo_id: string) => void;
  clearPhotos: () => void;
  
  // Product selection
  selectProductForPhoto: (
    photo_id: string, 
    product_id: string, 
    product: PhotoProduct,
    quantity?: number
  ) => void;
  selectComboForPhotos: (
    photo_ids: string[], 
    combo_id: string, 
    combo: ComboPackage
  ) => void;
  updateProductQuantity: (photo_id: string, quantity: number) => void;
  removeProductFromPhoto: (photo_id: string) => void;
  
  // Customization
  setCustomizationOptions: (photo_id: string, options: Record<string, any>) => void;
  getCustomizationOptions: (photo_id: string) => Record<string, any>;
  
  // Cart synchronization
  syncWithUnifiedCart: () => void;
  
  // Calculations
  recalculatePricing: () => void;
  updateRecommendations: (
    available_products: PhotoProduct[], 
    available_combos: ComboPackage[]
  ) => void;
  
  // Validation
  validateCart: () => { is_valid: boolean; errors: string[] };
  
  // UI control
  openProductSelector: (photo_id?: string) => void;
  closeProductSelector: () => void;
  setCurrentStep: (step: ProductCartStore['current_step']) => void;
  
  // Utility
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getFormattedTotal: () => string;
  isPhotoSelected: (photo_id: string) => boolean;
  getPhotoProduct: (photo_id: string) => { product_id?: string; combo_id?: string; quantity: number } | null;
  
  // Reset
  reset: () => void;
}

const initialState = {
  enhanced_items: [],
  selected_photos: new Set<string>(),
  product_context: null,
  current_calculation: null,
  recommendations: [],
  selected_products: new Map(),
  customization_options: new Map(),
  is_product_selector_open: false,
  selected_photo_for_customization: null,
  current_step: 'photos' as const,
};

export const useProductCartStore = create<ProductCartStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setProductContext: (context) => {
        set({ product_context: context });
        get().recalculatePricing();
      },
      
      // Photo selection
      selectPhoto: (photo_id, filename, watermark_url) => {
        set((state) => {
          const new_photos = new Set(state.selected_photos);
          new_photos.add(photo_id);
          
          return {
            selected_photos: new_photos,
            // Add basic enhanced item if not exists
            enhanced_items: state.enhanced_items.some(item => item.photo_id === photo_id)
              ? state.enhanced_items
              : [
                  ...state.enhanced_items,
                  {
                    photo_id,
                    product_name: 'Foto seleccionada',
                    product_specs: { type: 'print' as const },
                    quantity: 1,
                    unit_price: 0, // Will be updated when product is selected
                    subtotal: 0,
                    filename,
                    watermark_url,
                    metadata: {
                      event_id: state.product_context?.event_id,
                      context: 'family'
                    }
                  }
                ]
          };
        });
      },
      
      deselectPhoto: (photo_id) => {
        set((state) => {
          const new_photos = new Set(state.selected_photos);
          new_photos.delete(photo_id);
          
          const new_products = new Map(state.selected_products);
          new_products.delete(photo_id);
          
          const new_options = new Map(state.customization_options);
          new_options.delete(photo_id);
          
          return {
            selected_photos: new_photos,
            enhanced_items: state.enhanced_items.filter(item => item.photo_id !== photo_id),
            selected_products: new_products,
            customization_options: new_options
          };
        });
        get().recalculatePricing();
      },
      
      clearPhotos: () => {
        set({
          selected_photos: new Set(),
          enhanced_items: [],
          selected_products: new Map(),
          customization_options: new Map(),
          current_calculation: null,
          recommendations: []
        });
      },
      
      // Product selection
      selectProductForPhoto: (photo_id, product_id, product, quantity = 1) => {
        set((state) => {
          const new_products = new Map(state.selected_products);
          new_products.set(photo_id, { product_id, quantity });
          
          const new_items = state.enhanced_items.map(item => {
            if (item.photo_id === photo_id) {
              const unit_price = product.base_price;
              return {
                ...item,
                product_id,
                product_name: product.name,
                product_specs: {
                  type: product.type,
                  width_cm: product.width_cm,
                  height_cm: product.height_cm,
                  finish: product.finish,
                  paper_quality: product.paper_quality,
                  is_digital: product.type === 'digital'
                },
                quantity,
                unit_price,
                subtotal: unit_price * quantity
              };
            }
            return item;
          });
          
          return {
            selected_products: new_products,
            enhanced_items: new_items
          };
        });
        get().recalculatePricing();
      },
      
      selectComboForPhotos: (photo_ids, combo_id, combo) => {
        set((state) => {
          const new_products = new Map(state.selected_products);
          const unit_price = Math.floor(combo.base_price / photo_ids.length); // Distribute combo price
          
          // Update all selected photos with combo
          photo_ids.forEach(photo_id => {
            new_products.set(photo_id, { combo_id, quantity: 1 });
          });
          
          const new_items = state.enhanced_items.map(item => {
            if (photo_ids.includes(item.photo_id)) {
              return {
                ...item,
                combo_id,
                product_name: `${combo.name} (${photo_ids.length} fotos)`,
                product_specs: {
                  type: 'combo' as const,
                  is_digital: false
                },
                quantity: 1,
                unit_price,
                subtotal: unit_price
              };
            }
            return item;
          });
          
          return {
            selected_products: new_products,
            enhanced_items: new_items
          };
        });
        get().recalculatePricing();
      },
      
      updateProductQuantity: (photo_id, quantity) => {
        if (quantity <= 0) {
          get().removeProductFromPhoto(photo_id);
          return;
        }
        
        set((state) => {
          const product_selection = state.selected_products.get(photo_id);
          if (!product_selection) return state;
          
          const new_products = new Map(state.selected_products);
          new_products.set(photo_id, { ...product_selection, quantity });
          
          const new_items = state.enhanced_items.map(item => {
            if (item.photo_id === photo_id) {
              return {
                ...item,
                quantity,
                subtotal: item.unit_price * quantity
              };
            }
            return item;
          });
          
          return {
            selected_products: new_products,
            enhanced_items: new_items
          };
        });
        get().recalculatePricing();
      },
      
      removeProductFromPhoto: (photo_id) => {
        set((state) => {
          const new_products = new Map(state.selected_products);
          new_products.delete(photo_id);
          
          const new_items = state.enhanced_items.map(item => {
            if (item.photo_id === photo_id) {
              return {
                ...item,
                product_id: undefined,
                combo_id: undefined,
                product_name: 'Foto seleccionada',
                product_specs: { type: 'print' as const },
                quantity: 1,
                unit_price: 0,
                subtotal: 0
              };
            }
            return item;
          });
          
          return {
            selected_products: new_products,
            enhanced_items: new_items
          };
        });
        get().recalculatePricing();
      },
      
      // Customization
      setCustomizationOptions: (photo_id, options) => {
        set((state) => {
          const new_options = new Map(state.customization_options);
          new_options.set(photo_id, options);
          return { customization_options: new_options };
        });
      },
      
      getCustomizationOptions: (photo_id) => {
        return get().customization_options.get(photo_id) || {};
      },
      
      // Cart synchronization
      syncWithUnifiedCart: () => {
        const state = get();
        const unifiedCart = useUnifiedCartStore.getState();
        
        // Clear existing items
        unifiedCart.clearCart();
        
        // Add enhanced items to unified cart
        state.enhanced_items.forEach(item => {
          if (item.unit_price > 0) { // Only add items with selected products
            unifiedCart.addItem({
              photoId: item.photo_id,
              filename: item.filename || 'Foto',
              price: item.unit_price,
              watermarkUrl: item.watermark_url,
              priceType: 'base',
              metadata: item.metadata
            });
          }
        });
      },
      
      // Calculations
      recalculatePricing: () => {
        const state = get();
        
        if (!state.product_context || state.enhanced_items.length === 0) {
          set({ current_calculation: null });
          return;
        }
        
        const calculation = calculateProductCartTotal(
          state.enhanced_items.filter(item => item.unit_price > 0),
          state.product_context
        );
        
        set({ current_calculation: calculation });
      },
      
      updateRecommendations: (available_products, available_combos) => {
        const state = get();
        
        if (!state.product_context || state.enhanced_items.length === 0) {
          set({ recommendations: [] });
          return;
        }
        
        const recommendations = generateProductRecommendations(
          state.enhanced_items.filter(item => item.unit_price > 0),
          available_products,
          available_combos,
          state.product_context
        );
        
        set({ recommendations });
      },
      
      // Validation
      validateCart: () => {
        const state = get();
        const errors: string[] = [];
        
        if (state.selected_photos.size === 0) {
          errors.push('Selecciona al menos una foto');
        }
        
        const photos_without_products = Array.from(state.selected_photos).filter(
          photo_id => !state.selected_products.has(photo_id)
        );
        
        if (photos_without_products.length > 0) {
          errors.push(`${photos_without_products.length} foto(s) sin producto seleccionado`);
        }
        
        const total = state.current_calculation?.total || 0;
        if (total < 100) { // Minimum order $1
          errors.push('El pedido mínimo es de $100');
        }
        
        return {
          is_valid: errors.length === 0,
          errors
        };
      },
      
      // UI control
      openProductSelector: (photo_id) => {
        set({ 
          is_product_selector_open: true,
          selected_photo_for_customization: photo_id || null
        });
      },
      
      closeProductSelector: () => {
        set({ 
          is_product_selector_open: false,
          selected_photo_for_customization: null
        });
      },
      
      setCurrentStep: (step) => {
        set({ current_step: step });
      },
      
      // Utility
      getTotalItems: () => {
        return get().enhanced_items.reduce((sum, item) => sum + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().current_calculation?.total || 0;
      },
      
      getFormattedTotal: () => {
        const total = get().getTotalPrice();
        return formatProductPrice(total);
      },
      
      isPhotoSelected: (photo_id) => {
        return get().selected_photos.has(photo_id);
      },
      
      getPhotoProduct: (photo_id) => {
        return get().selected_products.get(photo_id) || null;
      },
      
      // Reset
      reset: () => {
        set({
          ...initialState,
          selected_photos: new Set(),
          selected_products: new Map(),
          customization_options: new Map()
        });
      }
    }),
    {
      name: 'lookescolar-product-cart',
      partialize: (state) => ({
        enhanced_items: state.enhanced_items,
        selected_photos: Array.from(state.selected_photos), // Convert Set to Array for serialization
        product_context: state.product_context,
        selected_products: Array.from(state.selected_products.entries()), // Convert Map to Array
        customization_options: Array.from(state.customization_options.entries()),
        current_step: state.current_step
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Restore Set and Map from serialized arrays
          state.selected_photos = new Set(state.selected_photos as any);
          state.selected_products = new Map(state.selected_products as any);
          state.customization_options = new Map(state.customization_options as any);
        }
      }
    }
  )
);

// Convenience hooks
export const useProductSelection = () => {
  const store = useProductCartStore();
  return {
    selectedPhotos: store.selected_photos,
    selectPhoto: store.selectPhoto,
    deselectPhoto: store.deselectPhoto,
    isPhotoSelected: store.isPhotoSelected,
    clearPhotos: store.clearPhotos
  };
};

export const useProductCustomization = () => {
  const store = useProductCartStore();
  return {
    selectProductForPhoto: store.selectProductForPhoto,
    selectComboForPhotos: store.selectComboForPhotos,
    updateProductQuantity: store.updateProductQuantity,
    removeProductFromPhoto: store.removeProductFromPhoto,
    getPhotoProduct: store.getPhotoProduct,
    setCustomizationOptions: store.setCustomizationOptions,
    getCustomizationOptions: store.getCustomizationOptions
  };
};

export const useProductCartCalculation = () => {
  const store = useProductCartStore();
  return {
    calculation: store.current_calculation,
    recommendations: store.recommendations,
    totalItems: store.getTotalItems(),
    totalPrice: store.getTotalPrice(),
    formattedTotal: store.getFormattedTotal(),
    recalculatePricing: store.recalculatePricing,
    validateCart: store.validateCart
  };
};