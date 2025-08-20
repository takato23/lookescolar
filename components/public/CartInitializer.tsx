'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/useCartStore'

interface CartInitializerProps {
  eventId: string
}

export function CartInitializer({ eventId }: CartInitializerProps) {
  const setEventId = useCartStore((state) => state.setEventId)
  
  useEffect(() => {
    console.log('[CartInitializer] DEBUG - received eventId:', eventId)
    if (eventId) {
      console.log('[CartInitializer] DEBUG - setting eventId in store:', eventId)
      setEventId(eventId)
    } else {
      console.error('[CartInitializer] ERROR - eventId is null/undefined')
    }
  }, [eventId, setEventId])

  return null // Este componente no renderiza nada, solo inicializa el store
}