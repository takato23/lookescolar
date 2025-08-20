// Tests para sistema de detección de contexto de galería
import { describe, it, expect } from 'vitest';
import { detectGalleryContext } from '@/lib/gallery-context';

describe('Gallery Context Detection', () => {
  describe('detectGalleryContext', () => {
    it('should detect public context with valid eventId', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      
      const result = detectGalleryContext({ eventId });
      
      expect(result.context).toBe('public');
      expect(result.eventId).toBe(eventId);
      expect(result.token).toBeUndefined();
    });

    it('should detect family context with token in params', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      const token = '4ecebc495344b51b5b3cae049d27edd2';
      
      const result = detectGalleryContext({ eventId, token });
      
      expect(result.context).toBe('family');
      expect(result.eventId).toBe(eventId);
      expect(result.token).toBe(token);
    });

    it('should detect family context with token in searchParams', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      const token = '4ecebc495344b51b5b3cae049d27edd2';
      const searchParams = new URLSearchParams();
      searchParams.set('token', token);
      
      const result = detectGalleryContext({ eventId, searchParams });
      
      expect(result.context).toBe('family');
      expect(result.eventId).toBe(eventId);
      expect(result.token).toBe(token);
    });

    it('should detect legacy redirect flag', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      const token = '4ecebc495344b51b5b3cae049d27edd2';
      const searchParams = new URLSearchParams();
      searchParams.set('token', token);
      searchParams.set('from', 'legacy');
      
      const result = detectGalleryContext({ eventId, searchParams });
      
      expect(result.context).toBe('family');
      expect(result.isLegacyRedirect).toBe(true);
    });

    it('should throw error with invalid eventId format', () => {
      const invalidEventId = 'invalid-uuid';
      
      expect(() => {
        detectGalleryContext({ eventId: invalidEventId });
      }).toThrow('Invalid eventId format for public gallery');
    });

    it('should require token to be at least 20 characters', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      const shortToken = 'short';
      
      const result = detectGalleryContext({ eventId, token: shortToken });
      
      expect(result.context).toBe('public');
      expect(result.token).toBeUndefined();
    });

    it('should prefer token from searchParams over direct token', () => {
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      const directToken = '4ecebc495344b51b5b3cae049d27edd2';
      const queryToken = '5fdfcd506455c62c6c4dbf059e38fee3';
      const searchParams = new URLSearchParams();
      searchParams.set('token', queryToken);
      
      const result = detectGalleryContext({ 
        eventId, 
        token: directToken, 
        searchParams 
      });
      
      expect(result.context).toBe('family');
      expect(result.token).toBe(queryToken);
    });
  });
});