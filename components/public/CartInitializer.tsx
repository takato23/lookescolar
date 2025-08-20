'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/useCartStore'

interface CartInitializerProps {
  eventId: string
}

export function CartInitializer({ eventId }: CartInitializerProps) {
  const setEventId = useCartStore((state) => state.setEventId)
  
  useEffect(() => {
    if (eventId) {
      setEventId(eventId)
    }
  }, [eventId, setEventId])

  return null // Este componente no renderiza nada, solo inicializa el store
}