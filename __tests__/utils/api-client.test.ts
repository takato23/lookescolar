/**
 * Test suite for API client utilities
 * Tests dynamic URL detection and port-agnostic operation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getApiBaseUrl, createApiUrl, apiFetch, uploadFiles } from '@/lib/utils/api-client';

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000/admin/photos',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Client Utils', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiBaseUrl', () => {
    it('should return current window.location.origin in browser', () => {
      mockLocation.origin = 'http://localhost:3001';
      expect(getApiBaseUrl()).toBe('http://localhost:3001');
    });

    it('should return localhost:3000 origin in browser', () => {
      mockLocation.origin = 'http://localhost:3000';
      expect(getApiBaseUrl()).toBe('http://localhost:3000');
    });

    it('should return custom origin in browser', () => {
      mockLocation.origin = 'https://myapp.vercel.app';
      expect(getApiBaseUrl()).toBe('https://myapp.vercel.app');
    });

    it('should return process.env.NEXT_PUBLIC_APP_URL in SSR', () => {
      // Simulate SSR by removing window
      const originalWindow = global.window;
      delete (global as any).window;
      
      process.env.NEXT_PUBLIC_APP_URL = 'https://production.app';
      expect(getApiBaseUrl()).toBe('https://production.app');
      
      // Restore window
      global.window = originalWindow;
    });

    it('should fallback to localhost:3000 in SSR without env var', () => {
      // Simulate SSR by removing window
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(getApiBaseUrl()).toBe('http://localhost:3000');
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('createApiUrl', () => {
    beforeEach(() => {
      mockLocation.origin = 'http://localhost:3001';
    });

    it('should create API URL with current origin', () => {
      const url = createApiUrl('/api/admin/photos/upload');
      expect(url).toBe('http://localhost:3001/api/admin/photos/upload');
    });

    it('should handle paths without leading slash', () => {
      const url = createApiUrl('api/admin/photos/upload');
      expect(url).toBe('http://localhost:3001/api/admin/photos/upload');
    });

    it('should work with different ports', () => {
      mockLocation.origin = 'http://localhost:3002';
      const url = createApiUrl('/api/health');
      expect(url).toBe('http://localhost:3002/api/health');
    });

    it('should work with production domain', () => {
      mockLocation.origin = 'https://lookescolar.vercel.app';
      const url = createApiUrl('/api/admin/folders');
      expect(url).toBe('https://lookescolar.vercel.app/api/admin/folders');
    });

    it('should work with localhost:3000', () => {
      mockLocation.origin = 'http://localhost:3000';
      const url = createApiUrl('/api/admin/assets');
      expect(url).toBe('http://localhost:3000/api/admin/assets');
    });
  });

  describe('apiFetch', () => {
    beforeEach(() => {
      mockLocation.origin = 'http://localhost:3001';
      global.fetch = vi.fn();
    });

    it('should use full URL if provided', async () => {
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiFetch('https://api.external.com/data');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.external.com/data',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should create full URL from relative path', async () => {
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiFetch('/api/admin/photos');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/admin/photos',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should merge custom headers', async () => {
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiFetch('/api/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'Custom-Header': 'value',
        },
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'Custom-Header': 'value',
          },
        })
      );
    });
  });

  describe('uploadFiles', () => {
    beforeEach(() => {
      mockLocation.origin = 'http://localhost:3001';
      global.fetch = vi.fn();
    });

    it('should upload FormData to correct URL', async () => {
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('files', new File(['content'], 'test.jpg', { type: 'image/jpeg' }));
      formData.append('eventId', 'event123');

      await uploadFiles('/api/admin/photos/upload', formData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/admin/photos/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );

      // Verify Content-Type is NOT set (browser sets it with boundary)
      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Content-Type');
    });

    it('should work with different ports', async () => {
      mockLocation.origin = 'http://localhost:3000';
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const formData = new FormData();
      await uploadFiles('/api/upload', formData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });

    it('should merge custom options', async () => {
      const mockResponse = { ok: true, json: vi.fn() };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const formData = new FormData();
      await uploadFiles('/api/upload', formData, {
        headers: { 'Authorization': 'Bearer token' },
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer token',
          },
        })
      );
    });
  });

  describe('Real-world scenarios', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should work with user accessing admin on port 3001', async () => {
      mockLocation.origin = 'http://localhost:3001';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      (global.fetch as any).mockResolvedValue(mockResponse);

      // This simulates the exact scenario user reported
      const formData = new FormData();
      formData.append('files', new File(['test'], 'test.jpg'));
      formData.append('eventId', 'event-123');

      await uploadFiles('/api/admin/photos/upload', formData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/admin/photos/upload', // Should use port 3001
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });

    it('should work with user accessing admin on port 3000', async () => {
      mockLocation.origin = 'http://localhost:3000';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      (global.fetch as any).mockResolvedValue(mockResponse);

      // This simulates accessing from the "correct" server
      const formData = new FormData();
      formData.append('files', new File(['test'], 'test.jpg'));
      formData.append('eventId', 'event-123');

      await uploadFiles('/api/admin/photos/upload', formData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/photos/upload', // Should use port 3000
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });

    it('should work in production environment', async () => {
      mockLocation.origin = 'https://lookescolar.vercel.app';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url = createApiUrl('/api/admin/photos/upload');
      expect(url).toBe('https://lookescolar.vercel.app/api/admin/photos/upload');
    });
  });
});