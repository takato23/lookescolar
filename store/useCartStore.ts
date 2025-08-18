import { create } from 'zustand'

interface CartItem {
  photoId: string
  quantity: number
  priceType: 'base'
  price: number
}

interface ContactInfo {
  name: string
  email: string
  phone: string
}

interface CartStore {
  items: CartItem[]
  isCartOpen: boolean
  contactInfo: ContactInfo | null
  
  // Acciones del carrito
  addItem: (photoId: string, price: number) => void
  removeItem: (photoId: string) => void
  updateQuantity: (photoId: string, quantity: number) => void
  clearCart: () => void
  
  // Control del drawer
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Información de contacto
  setContactInfo: (info: ContactInfo) => void
  
  // Cálculos
  getTotalItems: () => number
  getTotalPrice: () => number
  isItemInCart: (photoId: string) => boolean
  getItemQuantity: (photoId: string) => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isCartOpen: false,
  contactInfo: null,

  addItem: (photoId: string, price: number) => {
    set((state) => {
      const existingItem = state.items.find(item => item.photoId === photoId)
      
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.photoId === photoId 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      }
      
      return {
        items: [...state.items, {
          photoId,
          quantity: 1,
          priceType: 'base' as const,
          price
        }]
      }
    })
  },

  removeItem: (photoId: string) => {
    set((state) => ({
      items: state.items.filter(item => item.photoId !== photoId)
    }))
  },

  updateQuantity: (photoId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(photoId)
      return
    }
    
    set((state) => ({
      items: state.items.map(item =>
        item.photoId === photoId 
          ? { ...item, quantity }
          : item
      )
    }))
  },

  clearCart: () => {
    set({ items: [], contactInfo: null })
  },

  toggleCart: () => {
    set((state) => ({ isCartOpen: !state.isCartOpen }))
  },

  openCart: () => {
    set({ isCartOpen: true })
  },

  closeCart: () => {
    set({ isCartOpen: false })
  },

  setContactInfo: (info: ContactInfo) => {
    set({ contactInfo: info })
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0)
  },

  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },

  isItemInCart: (photoId: string) => {
    return get().items.some(item => item.photoId === photoId)
  },

  getItemQuantity: (photoId: string) => {
    const item = get().items.find(item => item.photoId === photoId)
    return item?.quantity || 0
  }
}))
