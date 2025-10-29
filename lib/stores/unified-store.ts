import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProductOption,
  AdditionalCopy,
  CartItem,
  ContactInfo,
  UnifiedOrder,
} from '@/lib/types/unified-store';

export type CheckoutStep = 'package' | 'photos' | 'extras' | 'contact' | 'payment';

interface EventInfo {
  name: string;
  schoolName: string;
  gradeSection: string;
}

interface SelectedPhotos {
  individual: string[];
  group: string[];
}

interface CatalogPricing {
  currency: string;
  shippingCost: number;
  freeShippingThreshold: number;
  taxIncluded?: boolean;
}

interface CatalogState {
  packages: ProductOption[];
  additionalCopies: AdditionalCopy[];
  pricing: CatalogPricing;
}

interface CatalogInput {
  packages?: ProductOption[];
  additionalCopies?: AdditionalCopy[];
  pricing?: Partial<CatalogPricing>;
}

interface StoreSession {
  selectedPackage: ProductOption | null;
  selectedPhotos: SelectedPhotos;
  cartItems: CartItem[];
  contactInfo: ContactInfo | null;
  checkoutStep: CheckoutStep;
  currentOrderId: string | null;
}

interface UnifiedStoreState extends StoreSession {
  token: string | null;
  eventInfo: EventInfo | null;
  catalog: CatalogState;
  catalogByToken: Record<string, CatalogState>;
  sessionByToken: Record<string, StoreSession>;
  eventInfoByToken: Record<string, EventInfo | null>;
}

interface UnifiedStoreActions {
  setToken: (token: string) => void;
  setEventInfo: (info: EventInfo) => void;
  setCatalog: (catalog: CatalogInput) => void;
  selectPackage: (packageId: string) => void;
  selectIndividualPhoto: (photoId: string) => void;
  selectGroupPhoto: (photoId: string) => void;
  removeSelectedPhoto: (photoId: string, type: 'individual' | 'group') => void;
  clearSelectedPhotos: () => void;
  addToCart: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setContactInfo: (info: ContactInfo) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: CheckoutStep) => void;
  canProceedToNextStep: () => boolean;
  getBasePrice: () => number;
  getAdditionsPrice: () => number;
  getShippingCost: () => number;
  getTotalPrice: () => number;
  createOrder: () => UnifiedOrder | null;
  setCurrentOrderId: (orderId: string) => void;
  resetStore: () => void;
}

type UnifiedStore = UnifiedStoreState & UnifiedStoreActions;

const createEmptySelectedPhotos = (): SelectedPhotos => ({
  individual: [],
  group: [],
});

const createEmptySession = (): StoreSession => ({
  selectedPackage: null,
  selectedPhotos: createEmptySelectedPhotos(),
  cartItems: [],
  contactInfo: null,
  checkoutStep: 'package',
  currentOrderId: null,
});

const createEmptyCatalog = (): CatalogState => ({
  packages: [],
  additionalCopies: [],
  pricing: {
    currency: 'ARS',
    shippingCost: 0,
    freeShippingThreshold: 0,
    taxIncluded: true,
  },
});

const cloneSession = (session: StoreSession): StoreSession => ({
  selectedPackage: session.selectedPackage,
  selectedPhotos: {
    individual: [...session.selectedPhotos.individual],
    group: [...session.selectedPhotos.group],
  },
  cartItems: session.cartItems.map((item) => ({ ...item })),
  contactInfo: session.contactInfo
    ? {
        ...session.contactInfo,
        address: { ...session.contactInfo.address },
      }
    : null,
  checkoutStep: session.checkoutStep,
  currentOrderId: session.currentOrderId,
});

const cloneCatalog = (catalog: CatalogState): CatalogState => ({
  packages: [...catalog.packages],
  additionalCopies: [...catalog.additionalCopies],
  pricing: { ...catalog.pricing },
});

const sessionFromState = (state: UnifiedStoreState): StoreSession =>
  cloneSession({
    selectedPackage: state.selectedPackage,
    selectedPhotos: state.selectedPhotos,
    cartItems: state.cartItems,
    contactInfo: state.contactInfo,
    checkoutStep: state.checkoutStep,
    currentOrderId: state.currentOrderId,
  });

const normalizeCatalog = (
  current: CatalogState,
  input: CatalogInput
): CatalogState => {
  const base = createEmptyCatalog();

  const pricing: CatalogPricing = {
    ...base.pricing,
    ...current.pricing,
    ...(input.pricing ?? {}),
  };

  return {
    packages: input.packages ? [...input.packages] : [...current.packages],
    additionalCopies: input.additionalCopies
      ? [...input.additionalCopies]
      : [...current.additionalCopies],
    pricing,
  };
};

const initialState: UnifiedStoreState = {
  token: null,
  eventInfo: null,
  selectedPackage: null,
  selectedPhotos: createEmptySelectedPhotos(),
  cartItems: [],
  contactInfo: null,
  checkoutStep: 'package',
  currentOrderId: null,
  catalog: createEmptyCatalog(),
  catalogByToken: {},
  sessionByToken: {},
  eventInfoByToken: {},
};

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setToken: (token) => {
        set((state) => {
          const storedSession = state.sessionByToken[token];
          const storedCatalog = state.catalogByToken[token];
          const storedEventInfo = state.eventInfoByToken[token] ?? null;

          const session = storedSession ? cloneSession(storedSession) : createEmptySession();
          const catalog = storedCatalog ? cloneCatalog(storedCatalog) : createEmptyCatalog();

          return {
            token,
            eventInfo: storedEventInfo,
            selectedPackage: session.selectedPackage,
            selectedPhotos: session.selectedPhotos,
            cartItems: session.cartItems,
            contactInfo: session.contactInfo,
            checkoutStep: session.checkoutStep,
            currentOrderId: session.currentOrderId,
            catalog,
          };
        });
      },

      setEventInfo: (info) => {
        const token = get().token;
        if (!token) return;

        set((state) => ({
          eventInfo: info,
          eventInfoByToken: {
            ...state.eventInfoByToken,
            [token]: info,
          },
        }));
      },

      setCatalog: (catalogInput) => {
        const token = get().token;
        if (!token) return;

        const currentCatalog = get().catalog;
        const normalized = normalizeCatalog(currentCatalog, catalogInput);
        const currentSession = sessionFromState(get());

        let nextSession = currentSession;

        if (currentSession.selectedPackage) {
          const replacement = normalized.packages.find(
            (pkg) => pkg.id === currentSession.selectedPackage?.id
          );
          if (replacement) {
            nextSession = {
              ...nextSession,
              selectedPackage: replacement,
            };
          } else {
            nextSession = {
              ...nextSession,
              selectedPackage: null,
              selectedPhotos: createEmptySelectedPhotos(),
            };
          }
        }

        set((state) => ({
          catalog: normalized,
          selectedPackage: nextSession.selectedPackage,
          selectedPhotos: nextSession.selectedPhotos,
          cartItems: nextSession.cartItems,
          contactInfo: nextSession.contactInfo,
          checkoutStep: nextSession.checkoutStep,
          currentOrderId: nextSession.currentOrderId,
          catalogByToken: {
            ...state.catalogByToken,
            [token]: cloneCatalog(normalized),
          },
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      selectPackage: (packageId) => {
        const token = get().token;
        if (!token) return;

        const packageOption = get().catalog.packages.find((p) => p.id === packageId);
        if (!packageOption) return;

        const nextSession: StoreSession = {
          ...createEmptySession(),
          selectedPackage: packageOption,
        };

        set((state) => ({
          selectedPackage: nextSession.selectedPackage,
          selectedPhotos: nextSession.selectedPhotos,
          cartItems: nextSession.cartItems,
          contactInfo: nextSession.contactInfo,
          checkoutStep: nextSession.checkoutStep,
          currentOrderId: nextSession.currentOrderId,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      selectIndividualPhoto: (photoId) => {
        const token = get().token;
        if (!token) return;

        const maxPhotos = get().selectedPackage?.contents?.individualPhotos ?? 0;
        const currentSession = sessionFromState(get());
        const currentIndividual = currentSession.selectedPhotos.individual;

        let newIndividual: string[] = currentIndividual;
        if (currentIndividual.includes(photoId)) {
          newIndividual = currentIndividual.filter((id) => id !== photoId);
        } else if (currentIndividual.length < maxPhotos) {
          newIndividual = [...currentIndividual, photoId];
        } else if (currentIndividual.length > 0) {
          newIndividual = [...currentIndividual.slice(0, -1), photoId];
        }

        const nextSession: StoreSession = {
          ...currentSession,
          selectedPhotos: {
            individual: newIndividual,
            group: currentSession.selectedPhotos.group,
          },
        };

        set((state) => ({
          selectedPhotos: nextSession.selectedPhotos,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      selectGroupPhoto: (photoId) => {
        const token = get().token;
        if (!token) return;

        const currentSession = sessionFromState(get());
        const currentGroup = currentSession.selectedPhotos.group;
        const newGroup = currentGroup.includes(photoId) ? [] : [photoId];

        const nextSession: StoreSession = {
          ...currentSession,
          selectedPhotos: {
            individual: currentSession.selectedPhotos.individual,
            group: newGroup,
          },
        };

        set((state) => ({
          selectedPhotos: nextSession.selectedPhotos,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      removeSelectedPhoto: (photoId, type) => {
        const token = get().token;
        if (!token) return;

        const currentSession = sessionFromState(get());
        const updatedPhotos: SelectedPhotos = {
          individual: [...currentSession.selectedPhotos.individual],
          group: [...currentSession.selectedPhotos.group],
        };

        updatedPhotos[type] = updatedPhotos[type].filter((id) => id !== photoId);

        const nextSession: StoreSession = {
          ...currentSession,
          selectedPhotos: updatedPhotos,
        };

        set((state) => ({
          selectedPhotos: nextSession.selectedPhotos,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      clearSelectedPhotos: () => {
        const token = get().token;
        if (!token) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          selectedPhotos: createEmptySelectedPhotos(),
        };

        set((state) => ({
          selectedPhotos: nextSession.selectedPhotos,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      addToCart: (item) => {
        const token = get().token;
        if (!token) return;

        const id = `${item.type}_${item.productId}_${Date.now()}`;
        const totalPrice = item.unitPrice * item.quantity;
        const currentSession = sessionFromState(get());

        const nextSession: StoreSession = {
          ...currentSession,
          cartItems: [...currentSession.cartItems, { ...item, id, totalPrice }],
        };

        set((state) => ({
          cartItems: nextSession.cartItems,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      removeFromCart: (itemId) => {
        const token = get().token;
        if (!token) return;

        const currentSession = sessionFromState(get());
        const nextSession: StoreSession = {
          ...currentSession,
          cartItems: currentSession.cartItems.filter((item) => item.id !== itemId),
        };

        set((state) => ({
          cartItems: nextSession.cartItems,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      updateCartItemQuantity: (itemId, quantity) => {
        const token = get().token;
        if (!token) return;

        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }

        const currentSession = sessionFromState(get());
        const nextSession: StoreSession = {
          ...currentSession,
          cartItems: currentSession.cartItems.map((item) =>
            item.id === itemId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item
          ),
        };

        set((state) => ({
          cartItems: nextSession.cartItems,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      clearCart: () => {
        const token = get().token;
        if (!token) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          cartItems: [],
        };

        set((state) => ({
          cartItems: nextSession.cartItems,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      setContactInfo: (info) => {
        const token = get().token;
        if (!token) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          contactInfo: { ...info, address: { ...info.address } },
        };

        set((state) => ({
          contactInfo: nextSession.contactInfo,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      nextStep: () => {
        const token = get().token;
        if (!token) return;

        const steps: CheckoutStep[] = ['package', 'photos', 'extras', 'contact', 'payment'];
        const currentIndex = steps.indexOf(get().checkoutStep);
        if (currentIndex >= steps.length - 1) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          checkoutStep: steps[currentIndex + 1],
        };

        set((state) => ({
          checkoutStep: nextSession.checkoutStep,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      prevStep: () => {
        const token = get().token;
        if (!token) return;

        const steps: CheckoutStep[] = ['package', 'photos', 'extras', 'contact', 'payment'];
        const currentIndex = steps.indexOf(get().checkoutStep);
        if (currentIndex <= 0) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          checkoutStep: steps[currentIndex - 1],
        };

        set((state) => ({
          checkoutStep: nextSession.checkoutStep,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      setStep: (step) => {
        const token = get().token;
        if (!token) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          checkoutStep: step,
        };

        set((state) => ({
          checkoutStep: nextSession.checkoutStep,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      canProceedToNextStep: () => {
        const state = get();

        switch (state.checkoutStep) {
          case 'package':
            return !!state.selectedPackage;
          case 'photos': {
            if (!state.selectedPackage) return false;
            const requiredIndividual = state.selectedPackage.contents.individualPhotos;
            const requiredGroup = state.selectedPackage.contents.groupPhotos;
            return (
              state.selectedPhotos.individual.length === requiredIndividual &&
              state.selectedPhotos.group.length === requiredGroup
            );
          }
          case 'extras':
            return true;
          case 'contact':
            return !!state.contactInfo;
          case 'payment':
            return !!state.contactInfo && !!state.selectedPackage;
          default:
            return false;
        }
      },

      getBasePrice: () => {
        return get().selectedPackage?.basePrice || 0;
      },

      getAdditionsPrice: () => {
        return get().cartItems.reduce((total, item) => total + item.totalPrice, 0);
      },

      getShippingCost: () => {
        const state = get();
        const subtotal = state.getBasePrice() + state.getAdditionsPrice();
        if (subtotal >= state.catalog.pricing.freeShippingThreshold) {
          return 0;
        }
        return state.catalog.pricing.shippingCost;
      },

      getTotalPrice: () => {
        const state = get();
        return state.getBasePrice() + state.getAdditionsPrice() + state.getShippingCost();
      },

      createOrder: () => {
        const state = get();

        if (!state.selectedPackage || !state.contactInfo || !state.token) {
          return null;
        }

        const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

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
          currency: state.catalog.pricing.currency,
        };

        get().setCurrentOrderId(orderId);
        return order;
      },

      setCurrentOrderId: (orderId) => {
        const token = get().token;
        if (!token) return;

        const nextSession: StoreSession = {
          ...sessionFromState(get()),
          currentOrderId: orderId,
        };

        set((state) => ({
          currentOrderId: orderId,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(nextSession),
          },
        }));
      },

      resetStore: () => {
        const token = get().token;
        if (!token) {
          set(initialState);
          return;
        }

        const session = createEmptySession();

        set((state) => ({
          selectedPackage: session.selectedPackage,
          selectedPhotos: session.selectedPhotos,
          cartItems: session.cartItems,
          contactInfo: session.contactInfo,
          checkoutStep: session.checkoutStep,
          currentOrderId: session.currentOrderId,
          sessionByToken: {
            ...state.sessionByToken,
            [token]: cloneSession(session),
          },
        }));
      },
    }),
    {
      name: 'unified-store-v2',
      partialize: (state) => ({
        token: state.token,
        eventInfo: state.eventInfo,
        selectedPackage: state.selectedPackage,
        selectedPhotos: state.selectedPhotos,
        cartItems: state.cartItems,
        contactInfo: state.contactInfo,
        checkoutStep: state.checkoutStep,
        currentOrderId: state.currentOrderId,
        catalog: state.catalog,
        catalogByToken: state.catalogByToken,
        sessionByToken: state.sessionByToken,
        eventInfoByToken: state.eventInfoByToken,
      }),
    }
  )
);
