// Tests para FASE 4: Cart Store Unificado
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import type { GalleryContextData } from '@/lib/gallery-context';

describe('Unified Cart Store Phase 4', () => {
  beforeEach(() => {
    // Limpiar el store antes de cada test
    const { result } = renderHook(() => useUnifiedCartStore());
    act(() => {
      result.current.clearCart();
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    expect(result.current.items).toEqual([]);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.contactInfo).toBeNull();
    expect(result.current.context).toBeNull();
    expect(result.current.getTotalItems()).toBe(0);
    expect(result.current.getTotalPrice()).toBe(0);
  });

  it('should set family context correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());
    
    const familyContext: GalleryContextData = {
      context: 'family',
      eventId: 'test-event-id',
      token: '4ecebc495344b51b5b3cae049d27edd2'
    };

    act(() => {
      result.current.setContext(familyContext);
    });

    expect(result.current.context).toEqual(familyContext);
    expect(result.current.context?.context).toBe('family');
    expect(result.current.context?.token).toBe('4ecebc495344b51b5b3cae049d27edd2');
  });

  it('should set public context correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());
    
    const publicContext: GalleryContextData = {
      context: 'public',
      eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74'
    };

    act(() => {
      result.current.setContext(publicContext);
    });

    expect(result.current.context).toEqual(publicContext);
    expect(result.current.context?.context).toBe('public');
    expect(result.current.context?.token).toBeUndefined();
  });

  it('should add items with family context metadata', () => {
    const { result } = renderHook(() => useUnifiedCartStore());
    
    const familyContext: GalleryContextData = {
      context: 'family',
      eventId: 'test-event-id',
      token: '4ecebc495344b51b5b3cae049d27edd2'
    };

    act(() => {
      result.current.setContext(familyContext);
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000,
        watermarkUrl: 'http://example.com/photo.jpg'
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].photoId).toBe('photo-123');
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].metadata?.context).toBe('family');
    expect(result.current.items[0].metadata?.token).toBe('4ecebc495344b51b5b3cae049d27edd2');
    expect(result.current.items[0].metadata?.eventId).toBe('test-event-id');
    expect(result.current.items[0].watermarkUrl).toBe('http://example.com/photo.jpg');
  });

  it('should add items with public context metadata', () => {
    const { result } = renderHook(() => useUnifiedCartStore());
    
    const publicContext: GalleryContextData = {
      context: 'public',
      eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74'
    };

    act(() => {
      result.current.setContext(publicContext);
      result.current.addItem({
        photoId: 'photo-456',
        filename: 'test2.jpg',
        price: 1500,
        priceType: 'base'
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].photoId).toBe('photo-456');
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].metadata?.context).toBe('public');
    expect(result.current.items[0].metadata?.token).toBeUndefined();
    expect(result.current.items[0].metadata?.eventId).toBe('a7eed8dd-a432-4dbe-9cd8-328338fa5c74');
    expect(result.current.items[0].priceType).toBe('base');
  });

  it('should increment quantity when adding existing item', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    act(() => {
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000
      });
    });

    expect(result.current.items[0].quantity).toBe(1);

    act(() => {
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000
      });
    });

    expect(result.current.items).toHaveLength(1); // No duplicates
    expect(result.current.items[0].quantity).toBe(2); // Quantity increased
  });

  it('should remove items correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    act(() => {
      result.current.addItem({
        photoId: 'photo-1',
        filename: 'test1.jpg',
        price: 1000
      });
      result.current.addItem({
        photoId: 'photo-2',
        filename: 'test2.jpg',
        price: 1500
      });
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.removeItem('photo-1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].photoId).toBe('photo-2');
  });

  it('should update quantities correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    act(() => {
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000
      });
    });

    expect(result.current.items[0].quantity).toBe(1);

    act(() => {
      result.current.updateQuantity('photo-123', 5);
    });

    expect(result.current.items[0].quantity).toBe(5);

    // Test removing by setting quantity to 0
    act(() => {
      result.current.updateQuantity('photo-123', 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('should calculate totals correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    act(() => {
      result.current.addItem({
        photoId: 'photo-1',
        filename: 'test1.jpg',
        price: 1000
      });
      result.current.addItem({
        photoId: 'photo-2',
        filename: 'test2.jpg',
        price: 1500
      });
      result.current.updateQuantity('photo-1', 3);
    });

    expect(result.current.getTotalItems()).toBe(4); // 3 + 1
    expect(result.current.getTotalPrice()).toBe(4500); // (1000 * 3) + (1500 * 1)
    expect(result.current.getItemsCount()).toBe(2); // 2 different items
  });

  it('should handle cart state correctly', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openCart();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeCart();
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggleCart();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should check if item is in cart', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    expect(result.current.isItemInCart('photo-123')).toBe(false);
    expect(result.current.getItemQuantity('photo-123')).toBe(0);

    act(() => {
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000
      });
    });

    expect(result.current.isItemInCart('photo-123')).toBe(true);
    expect(result.current.getItemQuantity('photo-123')).toBe(1);
  });

  it('should handle contact info', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    const contactInfo = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+54911234567'
    };

    act(() => {
      result.current.setContactInfo(contactInfo);
    });

    expect(result.current.contactInfo).toEqual(contactInfo);
  });

  it('should clear cart completely', () => {
    const { result } = renderHook(() => useUnifiedCartStore());

    const contactInfo = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '123456789'
    };

    act(() => {
      result.current.addItem({
        photoId: 'photo-123',
        filename: 'test.jpg',
        price: 1000
      });
      result.current.setContactInfo(contactInfo);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.contactInfo).toEqual(contactInfo);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.contactInfo).toBeNull();
  });
});