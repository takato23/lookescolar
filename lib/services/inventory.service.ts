import { sanitizeText } from '@/lib/utils/sanitization';

export interface InventoryCheck {
  productId: string;
  available: boolean;
  stock: number;
  reserved: number;
  maxQuantity: number;
}

/**
 * Verifica la disponibilidad de inventario para un producto
 * @param productId - ID del producto
 * @param quantity - Cantidad solicitada
 * @param eventId - ID del evento (opcional)
 * @returns Información de disponibilidad del inventario
 */
export async function checkInventoryAvailability(
  productId: string,
  quantity: number,
  eventId?: string
): Promise<InventoryCheck> {
  try {
    // Sanitizar entradas
    const sanitizedProductId = sanitizeText(productId);
    const sanitizedQuantity = Math.max(0, Math.min(quantity, 99)); // Límite máximo
    const sanitizedEventId = eventId ? sanitizeText(eventId) : undefined;

    const response = await fetch('/api/inventory/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Prevenir CSRF
      },
      body: JSON.stringify({
        productId: sanitizedProductId,
        quantity: sanitizedQuantity,
        eventId: sanitizedEventId
      })
    });

    if (!response.ok) {
      throw new Error('Error al verificar inventario');
    }

    const data = await response.json();

    // Validar respuesta
    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta inválida del servidor');
    }

    return {
      productId: sanitizedProductId,
      available: Boolean(data.available),
      stock: Math.max(0, Number(data.stock) || 0),
      reserved: Math.max(0, Number(data.reserved) || 0),
      maxQuantity: Math.max(1, Number(data.maxQuantity) || 10)
    };
  } catch (error) {
    console.error('[InventoryService] Error:', error);
    return {
      productId: sanitizeText(productId),
      available: false,
      stock: 0,
      reserved: 0,
      maxQuantity: 0
    };
  }
}

/**
 * Verifica el inventario para múltiples productos
 * @param items - Array de items con productId y quantity
 * @param eventId - ID del evento (opcional)
 * @returns Array de resultados de verificación
 */
export async function checkMultipleInventoryAvailability(
  items: Array<{ productId: string; quantity: number }>,
  eventId?: string
): Promise<InventoryCheck[]> {
  try {
    const promises = items.map(item =>
      checkInventoryAvailability(item.productId, item.quantity, eventId)
    );

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[InventoryService] Error checking item ${index}:`, result.reason);
        return {
          productId: items[index].productId,
          available: false,
          stock: 0,
          reserved: 0,
          maxQuantity: 0
        };
      }
    });
  } catch (error) {
    console.error('[InventoryService] Error checking multiple items:', error);
    return items.map(item => ({
      productId: item.productId,
      available: false,
      stock: 0,
      reserved: 0,
      maxQuantity: 0
    }));
  }
}

/**
 * Reserva inventario temporalmente
 * @param productId - ID del producto
 * @param quantity - Cantidad a reservar
 * @param eventId - ID del evento (opcional)
 * @param reservationToken - Token de reserva único
 * @returns Información de la reserva
 */
export async function reserveInventory(
  productId: string,
  quantity: number,
  eventId?: string,
  reservationToken?: string
): Promise<{ success: boolean; reservationId?: string; expiresAt?: string }> {
  try {
    const sanitizedProductId = sanitizeText(productId);
    const sanitizedQuantity = Math.max(0, Math.min(quantity, 99));
    const sanitizedEventId = eventId ? sanitizeText(eventId) : undefined;
    const sanitizedToken = reservationToken ? sanitizeText(reservationToken) : undefined;

    const response = await fetch('/api/inventory/reserve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        productId: sanitizedProductId,
        quantity: sanitizedQuantity,
        eventId: sanitizedEventId,
        reservationToken: sanitizedToken
      })
    });

    if (!response.ok) {
      throw new Error('Error al reservar inventario');
    }

    return await response.json();
  } catch (error) {
    console.error('[InventoryService] Error reserving inventory:', error);
    return { success: false };
  }
}

/**
 * Libera una reserva de inventario
 * @param reservationId - ID de la reserva
 * @returns Resultado de la liberación
 */
export async function releaseInventoryReservation(
  reservationId: string
): Promise<{ success: boolean }> {
  try {
    const sanitizedReservationId = sanitizeText(reservationId);

    const response = await fetch('/api/inventory/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        reservationId: sanitizedReservationId
      })
    });

    if (!response.ok) {
      throw new Error('Error al liberar reserva');
    }

    return await response.json();
  } catch (error) {
    console.error('[InventoryService] Error releasing reservation:', error);
    return { success: false };
  }
}

/**
 * Obtiene el estado actual del inventario
 * @param productId - ID del producto
 * @returns Información actual del inventario
 */
export async function getInventoryStatus(
  productId: string
): Promise<{ stock: number; reserved: number; available: number }> {
  try {
    const sanitizedProductId = sanitizeText(productId);

    const response = await fetch(`/api/inventory/status/${encodeURIComponent(sanitizedProductId)}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener estado del inventario');
    }

    const data = await response.json();

    return {
      stock: Math.max(0, Number(data.stock) || 0),
      reserved: Math.max(0, Number(data.reserved) || 0),
      available: Math.max(0, Number(data.available) || 0)
    };
  } catch (error) {
    console.error('[InventoryService] Error getting inventory status:', error);
    return { stock: 0, reserved: 0, available: 0 };
  }
}
