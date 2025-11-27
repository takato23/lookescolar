'use client'

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  X,
  CreditCard,
  Sparkles,
  Package,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { usePublicCartStore } from '@/lib/stores/unified-cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CartDrawerPremiumProps {
  variant?: 'default' | 'minimal' | 'immersive'
  /** Callback when checkout succeeds */
  onCheckoutSuccess?: () => void
  /** Callback when checkout fails */
  onCheckoutError?: (error: Error) => void
  /** Enable reduced motion animations */
  reducedMotion?: boolean
}

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/

// Form field configuration
const FORM_FIELDS = [
  { id: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', autocomplete: 'name' },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', autocomplete: 'email' },
  { id: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+54 9 11 1234-5678', autocomplete: 'tel' },
] as const

// Memoized quantity control buttons
const QuantityButton = memo(function QuantityButton({
  onClick,
  direction,
  disabled,
}: {
  onClick: () => void
  direction: 'increment' | 'decrement'
  disabled?: boolean
}) {
  const Icon = direction === 'increment' ? Plus : Minus
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        'bg-neutral-100 dark:bg-neutral-800',
        'text-neutral-600 dark:text-neutral-400',
        'transition-all duration-200',
        'hover:bg-neutral-200 dark:hover:bg-neutral-700',
        'active:scale-90',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      aria-label={direction === 'increment' ? 'Aumentar cantidad' : 'Disminuir cantidad'}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  )
})

// Cart item component with animations
const CartItem = memo(function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  index,
  reducedMotion,
}: {
  item: {
    photoId: string
    filename: string
    price: number
    quantity: number
    watermarkUrl?: string
  }
  onUpdateQuantity: (photoId: string, quantity: number) => void
  onRemove: (photoId: string) => void
  index: number
  reducedMotion?: boolean
}) {
  const [isRemoving, setIsRemoving] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleRemove = useCallback(() => {
    if (reducedMotion) {
      onRemove(item.photoId)
    } else {
      setIsRemoving(true)
      setTimeout(() => onRemove(item.photoId), 300)
    }
  }, [item.photoId, onRemove, reducedMotion])

  const handleDecrement = useCallback(() => {
    onUpdateQuantity(item.photoId, item.quantity - 1)
  }, [item.photoId, item.quantity, onUpdateQuantity])

  const handleIncrement = useCallback(() => {
    onUpdateQuantity(item.photoId, item.quantity + 1)
  }, [item.photoId, item.quantity, onUpdateQuantity])

  // Memoize subtotal calculation
  const subtotal = useMemo(
    () => (item.price * item.quantity).toLocaleString('es-AR'),
    [item.price, item.quantity]
  )

  // Animation delay
  const animationDelay = reducedMotion ? '0s' : `${Math.min(index * 0.05, 0.3)}s`

  return (
    <article
      ref={itemRef}
      className={cn(
        'group relative overflow-hidden',
        'bg-white dark:bg-neutral-900',
        'rounded-2xl p-4',
        'border border-neutral-100 dark:border-neutral-800',
        'shadow-sm hover:shadow-md',
        'transition-all ease-out',
        !reducedMotion && 'duration-500 animate-fade-in-up',
        isRemoving && 'opacity-0 scale-95 -translate-x-full'
      )}
      style={{
        animationDelay,
        animationFillMode: 'backwards',
      }}
      aria-label={`${item.filename || 'Foto'} - Cantidad: ${item.quantity} - Subtotal: $${subtotal}`}
    >
      {/* Gradient hover effect - skip if reduced motion */}
      {!reducedMotion && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        </div>
      )}

      <div className="relative flex items-center gap-4">
        {/* Photo thumbnail with shimmer */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          {item.watermarkUrl ? (
            <Image
              src={item.watermarkUrl}
              alt={`Vista previa de ${item.filename || 'foto'}`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold tracking-wider">
                MUESTRA
              </span>
            </div>
          )}
          {/* Shine effect - skip if reduced motion */}
          {!reducedMotion && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {item.filename || 'Foto seleccionada'}
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            ${item.price.toLocaleString('es-AR')}
          </p>
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-1" role="group" aria-label="Controles de cantidad">
          <QuantityButton
            onClick={handleDecrement}
            direction="decrement"
            disabled={item.quantity <= 1}
          />

          <span
            className="w-8 text-center font-semibold text-sm text-neutral-900 dark:text-white"
            aria-live="polite"
            aria-atomic="true"
          >
            {item.quantity}
          </span>

          <QuantityButton
            onClick={handleIncrement}
            direction="increment"
          />
        </div>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            'text-neutral-400 hover:text-red-500',
            'hover:bg-red-50 dark:hover:bg-red-500/10',
            'transition-all duration-200',
            'active:scale-90',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1'
          )}
          aria-label={`Eliminar ${item.filename || 'foto'} del carrito`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Subtotal */}
      <div className="flex justify-end mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
          ${subtotal}
        </span>
      </div>
    </article>
  )
})

// Empty state component
const EmptyState = memo(function EmptyState({
  onClose,
  reducedMotion,
}: {
  onClose: () => void
  reducedMotion?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        !reducedMotion && 'animate-fade-in'
      )}
      role="status"
      aria-label="Carrito vacío"
    >
      <div className="relative mb-6">
        {/* Cart icon */}
        <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <ShoppingCart className="w-12 h-12 text-neutral-400" aria-hidden="true" />
        </div>
        {/* Floating sparkles - skip if reduced motion */}
        {!reducedMotion && (
          <>
            <Sparkles
              className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-pulse"
              aria-hidden="true"
            />
            <Sparkles
              className="absolute -bottom-1 -left-3 w-4 h-4 text-indigo-400 animate-pulse"
              style={{ animationDelay: '0.5s' }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
        Tu carrito está vacío
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-xs">
        Explora la galería y selecciona las fotos que deseas conservar
      </p>

      <Button
        onClick={onClose}
        className={cn(
          'px-6 py-3 rounded-xl',
          'bg-neutral-900 dark:bg-white',
          'text-white dark:text-neutral-900',
          'font-medium',
          'hover:bg-neutral-800 dark:hover:bg-neutral-100',
          'transition-all duration-300',
          !reducedMotion && 'hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
        )}
      >
        Explorar galería
      </Button>
    </div>
  )
})

// Progress step indicator
const ProgressIndicator = memo(function ProgressIndicator({
  currentStep,
}: {
  currentStep: 'cart' | 'contact' | 'payment'
}) {
  const steps = [
    { id: 'cart', label: 'Carrito', icon: ShoppingCart },
    { id: 'contact', label: 'Datos', icon: Package },
    { id: 'payment', label: 'Pago', icon: CreditCard },
  ] as const

  return (
    <nav className="flex items-center gap-2 mt-4" aria-label="Progreso del checkout">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = currentStep === step.id
        const isPast = steps.findIndex(s => s.id === currentStep) > index

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-neutral-300 mx-1" aria-hidden="true" />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                isActive ? 'text-indigo-600' : isPast ? 'text-emerald-600' : 'text-neutral-400'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{step.label}</span>
              {isPast && <Check className="w-3 h-3" aria-hidden="true" />}
            </div>
          </div>
        )
      })}
    </nav>
  )
})

// Form field component with validation
const FormField = memo(function FormField({
  id,
  label,
  type,
  placeholder,
  autocomplete,
  value,
  onChange,
  error,
  required = true,
}: {
  id: string
  label: string
  type: string
  placeholder: string
  autocomplete: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}) {
  const inputId = `cart-form-${id}`
  const errorId = `${inputId}-error`

  return (
    <div>
      <Label
        htmlFor={inputId}
        className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </Label>
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        autoComplete={autocomplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 rounded-xl border-neutral-200 dark:border-neutral-700',
          'focus:border-indigo-500 focus:ring-indigo-500',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        aria-required={required}
      />
      {error && (
        <p
          id={errorId}
          className="text-xs text-red-500 mt-1 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
})

// Price summary component
const PriceSummary = memo(function PriceSummary({
  totalItems,
  totalPrice,
  discountAmount,
  totalWithDiscount,
  appliedCoupon,
}: {
  totalItems: number
  totalPrice: number
  discountAmount: number
  totalWithDiscount: number
  appliedCoupon?: { code: string } | null
}) {
  return (
    <div
      className="bg-white dark:bg-neutral-800 rounded-xl p-4 space-y-2"
      aria-label="Resumen de precios"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">
          Subtotal ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'})
        </span>
        <span className="text-neutral-900 dark:text-white font-medium">
          ${totalPrice.toLocaleString('es-AR')}
        </span>
      </div>

      {discountAmount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-emerald-600 flex items-center gap-1">
            <Check className="w-4 h-4" aria-hidden="true" />
            Descuento ({appliedCoupon?.code})
          </span>
          <span className="text-emerald-600 font-medium">
            -${discountAmount.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700">
        <span className="text-lg font-semibold text-neutral-900 dark:text-white">
          Total
        </span>
        <span
          className="text-2xl font-bold text-neutral-900 dark:text-white"
          aria-live="polite"
        >
          ${totalWithDiscount.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  )
})

export const CartDrawerPremium = memo(function CartDrawerPremium({
  variant = 'default',
  onCheckoutSuccess,
  onCheckoutError,
  reducedMotion: reducedMotionProp = false,
}: CartDrawerPremiumProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'contact' | 'payment'>('cart')
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotionProp)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const pathname = usePathname()

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (reducedMotionProp) {
      setPrefersReducedMotion(true)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [reducedMotionProp])

  // Cart store - using selectors for better performance
  const items = usePublicCartStore((state) => state.items)
  const isCartOpen = usePublicCartStore((state) => state.isOpen)
  const closeCart = usePublicCartStore((state) => state.closeCart)
  const removeItem = usePublicCartStore((state) => state.removeItem)
  const updateQuantity = usePublicCartStore((state) => state.updateQuantity)
  const clearCart = usePublicCartStore((state) => state.clearCart)
  const getTotalItems = usePublicCartStore((state) => state.getTotalItems)
  const getTotalPrice = usePublicCartStore((state) => state.getTotalPrice)
  const getTotalPriceWithDiscount = usePublicCartStore((state) => state.getTotalPriceWithDiscount)
  const getDiscountAmount = usePublicCartStore((state) => state.getDiscountAmount)
  const appliedCoupon = usePublicCartStore((state) => state.appliedCoupon)
  const setContactInfo = usePublicCartStore((state) => state.setContactInfo)
  const getEventId = usePublicCartStore((state) => state.getEventId)
  const setEventId = usePublicCartStore((state) => state.setEventId)

  // Extract eventId from URL if not in store
  const eventIdFromUrl = useMemo(() => {
    const match = pathname.match(/\/gallery\/([^\/]+)/)
    return match ? match[1] : null
  }, [pathname])

  const storedEventId = getEventId()
  const finalEventId = storedEventId || eventIdFromUrl

  useEffect(() => {
    if (!storedEventId && finalEventId) {
      setEventId(finalEventId)
    }
  }, [storedEventId, finalEventId, setEventId])

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isCartOpen) return

    // Focus close button when drawer opens
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart()
        return
      }

      // Focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isCartOpen])

  // Memoized totals
  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()
  const totalWithDiscount = getTotalPriceWithDiscount()
  const discountAmount = getDiscountAmount()

  // Field-level validation
  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido'
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres'
        return undefined
      case 'email':
        if (!value.trim()) return 'El email es requerido'
        if (!EMAIL_REGEX.test(value)) return 'Email inválido'
        return undefined
      case 'phone':
        if (!value.trim()) return 'El teléfono es requerido'
        if (!PHONE_REGEX.test(value)) return 'Teléfono inválido'
        return undefined
      default:
        return undefined
    }
  }, [])

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    for (const field of FORM_FIELDS) {
      const error = validateField(field.id, contactForm[field.id as keyof typeof contactForm])
      if (error) {
        newErrors[field.id] = error
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [contactForm, validateField])

  // Handle field change with real-time validation
  const handleFieldChange = useCallback((field: string, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  // Handle field blur for validation
  const handleFieldBlur = useCallback((field: string) => {
    const value = contactForm[field as keyof typeof contactForm]
    const error = validateField(field, value)
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }, [contactForm, validateField])

  const handleCheckout = useCallback(async () => {
    if (!validateForm()) {
      // Focus first field with error
      const firstErrorField = FORM_FIELDS.find(f => errors[f.id])
      if (firstErrorField) {
        document.getElementById(`cart-form-${firstErrorField.id}`)?.focus()
      }
      return
    }

    if (items.length === 0) {
      return
    }

    if (!finalEventId) {
      onCheckoutError?.(new Error('ID de evento no encontrado'))
      return
    }

    setIsCheckingOut(true)
    setCheckoutStep('payment')

    try {
      setContactInfo(contactForm)

      const checkoutData = {
        eventId: finalEventId,
        photoIds: items.map((item) => item.photoId),
        contactInfo: contactForm,
        package: `Selección personalizada (${items.length} fotos)`,
        ...(appliedCoupon && {
          couponCode: appliedCoupon.code,
          couponId: appliedCoupon.couponId,
          discountCents: appliedCoupon.discountCents,
        }),
      }

      const response = await fetch('/api/gallery/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en el procesamiento del pago')
      }

      const result = await response.json()
      const { redirectUrl } = result.success ? result.data : result

      onCheckoutSuccess?.()

      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (error) {
      console.error('[CartDrawerPremium] Error en checkout:', error)
      onCheckoutError?.(error instanceof Error ? error : new Error('Error desconocido'))
      setCheckoutStep('contact')
    } finally {
      setIsCheckingOut(false)
    }
  }, [validateForm, items, finalEventId, contactForm, appliedCoupon, setContactInfo, onCheckoutSuccess, onCheckoutError, errors])

  const handleQuantityChange = useCallback(
    (photoId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeItem(photoId)
      } else {
        updateQuantity(photoId, newQuantity)
      }
    },
    [removeItem, updateQuantity]
  )

  // Determine checkout step based on form state
  useEffect(() => {
    if (items.length === 0) {
      setCheckoutStep('cart')
    } else if (contactForm.name || contactForm.email || contactForm.phone) {
      setCheckoutStep('contact')
    } else {
      setCheckoutStep('cart')
    }
  }, [items.length, contactForm])

  if (!isCartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'transition-opacity',
          !prefersReducedMotion && 'duration-300',
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50',
          'w-full sm:max-w-md',
          'bg-white dark:bg-neutral-950',
          'shadow-2xl',
          'transform transition-transform ease-out',
          !prefersReducedMotion && 'duration-500',
          isCartOpen ? 'translate-x-0' : 'translate-x-full',
          'flex flex-col'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        aria-describedby="cart-description"
      >
        {/* Screen reader description */}
        <p id="cart-description" className="sr-only">
          Panel lateral del carrito de compras. Contiene {totalItems} {totalItems === 1 ? 'foto' : 'fotos'}.
          Total: ${totalWithDiscount.toLocaleString('es-AR')}
        </p>

        {/* Header */}
        <header className="flex-shrink-0 px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-neutral-900 dark:text-white" aria-hidden="true" />
                {totalItems > 0 && (
                  <span
                    className={cn(
                      'absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center',
                      !prefersReducedMotion && 'animate-scale-in'
                    )}
                    aria-label={`${totalItems} items en el carrito`}
                  >
                    {totalItems}
                  </span>
                )}
              </div>
              <h2
                id="cart-title"
                className="text-xl font-semibold text-neutral-900 dark:text-white"
              >
                Tu carrito
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              onClick={closeCart}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-all duration-200',
                !prefersReducedMotion && 'active:scale-90',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              )}
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Progress indicator */}
          {items.length > 0 && <ProgressIndicator currentStep={checkoutStep} />}
        </header>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          role="region"
          aria-label="Contenido del carrito"
        >
          {items.length === 0 ? (
            <EmptyState onClose={closeCart} reducedMotion={prefersReducedMotion} />
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <CartItem
                  key={item.photoId}
                  item={item}
                  onUpdateQuantity={handleQuantityChange}
                  onRemove={removeItem}
                  index={index}
                  reducedMotion={prefersReducedMotion}
                />
              ))}

              {/* Clear cart button */}
              <button
                onClick={clearCart}
                className={cn(
                  'w-full py-2 text-sm font-medium',
                  'text-red-500 hover:text-red-600',
                  'hover:bg-red-50 dark:hover:bg-red-500/10',
                  'rounded-xl transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                )}
                aria-label={`Vaciar carrito (${totalItems} fotos)`}
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>

        {/* Footer with checkout */}
        {items.length > 0 && (
          <footer className="flex-shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-6 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/50">
            {/* Contact form */}
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                handleCheckout()
              }}
              aria-label="Formulario de contacto"
              noValidate
            >
              {FORM_FIELDS.map((field) => (
                <FormField
                  key={field.id}
                  id={field.id}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  autocomplete={field.autocomplete}
                  value={contactForm[field.id as keyof typeof contactForm]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  error={errors[field.id]}
                />
              ))}
            </form>

            {/* Price summary */}
            <PriceSummary
              totalItems={totalItems}
              totalPrice={totalPrice}
              discountAmount={discountAmount}
              totalWithDiscount={totalWithDiscount}
              appliedCoupon={appliedCoupon}
            />

            {/* Checkout button */}
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={cn(
                'w-full py-4 rounded-xl',
                'bg-gradient-to-r from-indigo-600 to-purple-600',
                'hover:from-indigo-700 hover:to-purple-700',
                'text-white font-semibold text-base',
                'shadow-lg shadow-indigo-500/25',
                'transition-all duration-300',
                !prefersReducedMotion && 'hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              )}
              aria-busy={isCheckingOut}
              aria-describedby="checkout-disclaimer"
            >
              {isCheckingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Procesando...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" aria-hidden="true" />
                  <span>Pagar con MercadoPago</span>
                </span>
              )}
            </Button>

            <p
              id="checkout-disclaimer"
              className="text-[10px] text-neutral-500 text-center"
            >
              Al continuar aceptas nuestros términos. Las fotos se entregarán sin marca de agua.
            </p>
          </footer>
        )}
      </aside>

      {/* Live region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isCheckingOut && 'Procesando tu pedido, por favor espera...'}
      </div>
    </>
  )
})

export default CartDrawerPremium
