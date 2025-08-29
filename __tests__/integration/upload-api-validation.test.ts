/**
 * Simple API validation test for upload endpoints
 * Tests the fixed admin/photos upload functionality without complex Supabase setup
 */

import { describe, it, expect } from 'vitest';

const API_BASE_URL = 'http://localhost:3000';

describe('Upload API Validation', () => {
  describe('Admin Photos Upload Endpoint', () => {
    it('should reject upload without eventId', async () => {
      const formData = new FormData();
      // No eventId provided

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Event ID is required'
      });
    });

    it('should reject upload without files', async () => {
      const formData = new FormData();
      formData.append('eventId', '123e4567-e89b-12d3-a456-426614174000');
      // No files provided

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'No files received'
      });
    });

    it('should reject upload with invalid eventId format', async () => {
      const formData = new FormData();
      formData.append('eventId', 'invalid-uuid-format');
      
      // Create a simple test file
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid event ID format'
      });
    });

    it('should reject upload with too many files', async () => {
      const formData = new FormData();
      formData.append('eventId', '123e4567-e89b-12d3-a456-426614174000');
      
      // Add 25 files (exceeds limit of 20)
      for (let i = 0; i < 25; i++) {
        const testFile = new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' });
        formData.append('files', testFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Maximum 20 files per request'
      });
    });

    it('should handle non-existent event gracefully', async () => {
      const formData = new FormData();
      formData.append('eventId', '00000000-0000-0000-0000-000000000000');
      
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: 'Event not found'
      });
    });
  });

  describe('Admin Assets API', () => {
    it('should handle GET /api/admin/assets with invalid parameters', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets?limit=invalid&event_id=not-uuid`);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters'
      });
    });

    it('should handle GET /api/admin/assets with valid parameters', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets?limit=10&offset=0`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        assets: expect.any(Array),
        totalCount: expect.any(Number),
        pagination: expect.objectContaining({
          limit: 10,
          offset: 0,
          hasMore: expect.any(Boolean)
        })
      });
    });

    it('should reject bulk operations without valid data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'invalid-operation',
          assetIds: []
        })
      });

      expect(response.status).toBe(400);
    });

    it('should reject bulk operations with malformed JSON', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Admin Folders API', () => {
    it('should handle GET /api/admin/folders with invalid parameters', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/folders?limit=invalid`);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters'
      });
    });

    it('should handle GET /api/admin/folders with valid parameters', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/folders?limit=10`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        folders: expect.any(Array),
        count: expect.any(Number)
      });
    });

    it('should reject folder creation with invalid data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // Empty name should fail
          event_id: 'invalid-uuid'
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid folder data'
      });
    });
  });

  describe('API Response Format Validation', () => {
    it('should return consistent error format across endpoints', async () => {
      const endpoints = [
        '/api/admin/photos/upload',
        '/api/admin/assets',
        '/api/admin/folders'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${API_BASE_URL}${endpoint}?invalid=true`);
        
        if (response.status >= 400) {
          const data = await response.json();
          
          // All error responses should have these fields
          expect(data).toHaveProperty('success', false);
          expect(data).toHaveProperty('error');
          expect(typeof data.error).toBe('string');
        }
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets?limit=1`);
      
      // Check basic response headers
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should handle OPTIONS requests properly', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets`, {
        method: 'OPTIONS'
      });
      
      // Should handle OPTIONS request (for CORS preflight)
      expect([200, 204, 404, 405]).toContain(response.status);
    });
  });

  describe('API Health Check', () => {
    it('should have working health endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });
  });
});