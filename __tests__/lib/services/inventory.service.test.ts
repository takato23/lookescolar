import {
  checkInventoryAvailability,
  checkMultipleInventoryAvailability,
  reserveInventory,
  releaseInventoryReservation,
  getInventoryStatus
} from '@/lib/services/inventory.service';

// Mock fetch global
global.fetch = jest.fn();

describe('Inventory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkInventoryAvailability', () => {
    it('debe verificar disponibilidad correctamente', async () => {
      const mockResponse = {
        available: true,
        stock: 10,
        reserved: 2,
        maxQuantity: 5
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await checkInventoryAvailability('product-1', 2);

      expect(fetch).toHaveBeenCalledWith('/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          productId: 'product-1',
          quantity: 2,
          eventId: undefined
        })
      });

      expect(result).toEqual({
        productId: 'product-1',
        available: true,
        stock: 10,
        reserved: 2,
        maxQuantity: 5
      });
    });

    it('debe manejar errores de red', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkInventoryAvailability('product-1', 2);

      expect(result).toEqual({
        productId: 'product-1',
        available: false,
        stock: 0,
        reserved: 0,
        maxQuantity: 0
      });
    });

    it('debe manejar respuestas HTTP de error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await checkInventoryAvailability('product-1', 2);

      expect(result.available).toBe(false);
    });

    it('debe sanitizar entradas', async () => {
      const mockResponse = {
        available: true,
        stock: 5,
        reserved: 0,
        maxQuantity: 3
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await checkInventoryAvailability('<script>alert("xss")</script>', 150);

      expect(fetch).toHaveBeenCalledWith('/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          productId: 'alert("xss")',
          quantity: 99, // Límite máximo
          eventId: undefined
        })
      });
    });
  });

  describe('checkMultipleInventoryAvailability', () => {
    it('debe verificar múltiples productos correctamente', async () => {
      const mockResponse1 = { available: true, stock: 10, reserved: 0, maxQuantity: 5 };
      const mockResponse2 = { available: false, stock: 0, reserved: 0, maxQuantity: 0 };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse2)
        });

      const items = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 }
      ];

      const results = await checkMultipleInventoryAvailability(items);

      expect(results).toHaveLength(2);
      expect(results[0].available).toBe(true);
      expect(results[1].available).toBe(false);
    });

    it('debe manejar errores parciales', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true, stock: 5, reserved: 0, maxQuantity: 3 })
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const items = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 }
      ];

      const results = await checkMultipleInventoryAvailability(items);

      expect(results).toHaveLength(2);
      expect(results[0].available).toBe(true);
      expect(results[1].available).toBe(false);
    });
  });

  describe('reserveInventory', () => {
    it('debe reservar inventario correctamente', async () => {
      const mockResponse = {
        success: true,
        reservationId: 'res-123',
        expiresAt: '2025-01-01T12:00:00Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await reserveInventory('product-1', 2, 'event-1', 'token-123');

      expect(fetch).toHaveBeenCalledWith('/api/inventory/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          productId: 'product-1',
          quantity: 2,
          eventId: 'event-1',
          reservationToken: 'token-123'
        })
      });

      expect(result).toEqual(mockResponse);
    });

    it('debe manejar errores de reserva', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Reservation failed'));

      const result = await reserveInventory('product-1', 2);

      expect(result).toEqual({ success: false });
    });
  });

  describe('releaseInventoryReservation', () => {
    it('debe liberar reserva correctamente', async () => {
      const mockResponse = { success: true };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await releaseInventoryReservation('res-123');

      expect(fetch).toHaveBeenCalledWith('/api/inventory/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          reservationId: 'res-123'
        })
      });

      expect(result).toEqual(mockResponse);
    });

    it('debe manejar errores de liberación', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Release failed'));

      const result = await releaseInventoryReservation('res-123');

      expect(result).toEqual({ success: false });
    });
  });

  describe('getInventoryStatus', () => {
    it('debe obtener estado del inventario correctamente', async () => {
      const mockResponse = {
        stock: 15,
        reserved: 3,
        available: 12
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getInventoryStatus('product-1');

      expect(fetch).toHaveBeenCalledWith('/api/inventory/status/product-1', {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      expect(result).toEqual(mockResponse);
    });

    it('debe manejar errores de consulta de estado', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Status check failed'));

      const result = await getInventoryStatus('product-1');

      expect(result).toEqual({ stock: 0, reserved: 0, available: 0 });
    });
  });
});
