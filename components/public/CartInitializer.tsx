'use client'

import { useEffect } from 'react'
import { usePublicCartStore } from '@/lib/stores/unified-cart-store'

interface CartInitializerProps {
  eventId: string
}

export function CartInitializer({ eventId }: CartInitializerProps) {
  // usePublicCartStore returns the store directly, not a selector
  const cartStore = usePublicCartStore()
  const setContext = cartStore.setContext
  const setEventId = cartStore.setEventId

  useEffect(() => {
    if (!eventId) return

    // Persistimos el contexto público junto al evento para el carrito global
    setContext({ context: 'public', eventId })
    setEventId(eventId)
  }, [eventId, setContext, setEventId])

  return null // Este componente no renderiza nada, solo inicializa el store
}
