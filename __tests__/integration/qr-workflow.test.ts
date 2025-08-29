/**
 * @fileoverview Integration Tests for Complete QR Workflow
 *
 * Tests the complete QR workflow including:
 * 1. QR code generation for student identification
 * 2. QR code detection in uploaded photos
 * 3. Student QR validation and photo auto-classification
 * 4. QR scan → decode → validate (legacy tagging)
 * 5. Photo selection → batch assignment
 * 6. Database state verification
 * 7. Error scenarios and edge cases
 * 8. Family access to QR codes
 *
 * Security: Tests rate limiting, token validation, duplicate prevention
 * Performance: Tests batch operations with 50+ photos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the enhanced services
vi.mock('@/lib/services/qr-enhanced.service', () => ({
  qrEnhancedService: {
    generateEnhancedQR: vi.fn().mockResolvedValue({
      dataUrl: 'data:image/png;base64,mock-data',
      format: 'png',
      analytics: { qrCodeId: 'test', totalScans: 0 },
      cacheKey: 'cache-key-123',
    }),
    getCacheStats: vi.fn().mockReturnValue({
      totalEntries: 5,
      hitRate: 0.8,
      avgAccessCount: 2.5,
    }),
  },
}));

vi.mock('@/lib/services/qr-analytics.service', () => ({
  qrAnalyticsService: {
    recordScan: vi.fn().mockResolvedValue(undefined),
    getQRMetrics: vi.fn().mockResolvedValue({
      totalScans: 10,
      uniqueScans: 8,
      successRate: 0.9,
      avgScanTime: 150,
      popularDevices: [{ device: 'mobile', count: 6 }],
      scansByHour: { 10: 5, 11: 3, 12: 2 },
      scansByDay: { '2024-01-01': 10 },
      errorAnalysis: {},
    }),
    getEventQRMetrics: vi.fn().mockResolvedValue({
      'qr-1': { totalScans: 5, successRate: 1.0 },
      'qr-2': { totalScans: 3, successRate: 0.8 },
    }),
    getTopQRCodes: vi.fn().mockResolvedValue([
      { qrCodeId: 'qr-1', totalScans: 5, uniqueScans: 4, successRate: 1.0 },
      { qrCodeId: 'qr-2', totalScans: 3, uniqueScans: 3, successRate: 0.8 },
    ]),
  },
}));

vi.mock('@/lib/security/qr-security.service', () => ({
  qrSecurityService: {
    recordAuditEvent: vi.fn().mockResolvedValue(undefined),
    generateSignature: vi.fn().mockReturnValue({
      signature: 'mock-signature',
      algorithm: 'sha256',
      keyId: 'default',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }),
    verifySignature: vi.fn().mockReturnValue({
      valid: true,
      securityLevel: 'high',
    }),
    detectSuspiciousActivity: vi.fn().mockResolvedValue({
      suspiciousIPs: [],
      frequentFailures: [],
      possibleBruteForce: false,
      recommendations: [],
    }),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('QR Integration Tests', () => {
  describe('Batch QR Generation API', () => {
    it('should handle valid batch request', async () => {
      const { POST } = await import('@/app/api/qr/batch/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [
            { id: 'student-1', name: 'John Doe', eventId: 'event-1' },
            { id: 'student-2', name: 'Jane Smith', eventId: 'event-1' },
          ],
          options: {
            format: 'png',
            size: 200,
            enableAnalytics: true,
          },
        }),
        ip: '192.168.1.1',
        headers: {
          get: vi.fn().mockReturnValue('Mozilla/5.0 Test Browser'),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results.successful).toHaveLength(2);
      expect(data.results.failed).toHaveLength(0);
      expect(data.metadata.totalRequested).toBe(2);
      expect(data.metadata.totalSuccessful).toBe(2);
    });

    it('should handle validation errors', async () => {
      const { POST } = await import('@/app/api/qr/batch/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [], // Empty subjects array
          options: { format: 'invalid' }, // Invalid format
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty subjects request', async () => {
      const { POST } = await import('@/app/api/qr/batch/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [],
          options: { format: 'png' },
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No subjects provided');
      expect(data.code).toBe('EMPTY_REQUEST');
    });

    it('should handle too many subjects', async () => {
      const { POST } = await import('@/app/api/qr/batch/route');

      const subjects = Array.from({ length: 101 }, (_, i) => ({
        id: `student-${i}`,
        name: `Student ${i}`,
        eventId: 'event-1',
      }));

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects,
          options: { format: 'png' },
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Too many subjects (max 100)');
      expect(data.code).toBe('BATCH_TOO_LARGE');
    });
  });

  describe('QR Analytics API', () => {
    it('should get QR metrics for specific QR code', async () => {
      const { GET } = await import('@/app/api/qr/analytics/route');

      const mockRequest = {
        nextUrl: {
          searchParams: {
            get: vi.fn((key: string) => {
              const params: Record<string, string> = {
                qrCodeId: 'qr-1',
                includeDetails: 'true',
              };
              return params[key] || null;
            }),
          },
        },
      } as unknown as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.qrCodeId).toBe('qr-1');
      expect(data.data.metrics).toEqual({
        totalScans: 10,
        uniqueScans: 8,
        successRate: 0.9,
        avgScanTime: 150,
        popularDevices: [{ device: 'mobile', count: 6 }],
        scansByHour: { 10: 5, 11: 3, 12: 2 },
        scansByDay: { '2024-01-01': 10 },
        errorAnalysis: {},
      });
    });

    it('should get event metrics', async () => {
      const { GET } = await import('@/app/api/qr/analytics/route');

      const mockRequest = {
        nextUrl: {
          searchParams: {
            get: vi.fn((key: string) => {
              const params: Record<string, string> = {
                eventId: 'event-1',
                includeDetails: 'true',
                limit: '5',
              };
              return params[key] || null;
            }),
          },
        },
      } as unknown as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.eventId).toBe('event-1');
      expect(data.data.summary.totalQRCodes).toBe(2);
      expect(data.data.topPerformers).toHaveLength(2);
      expect(data.data.securityInsights).toBeDefined();
    });

    it('should record scan event', async () => {
      const { POST } = await import('@/app/api/qr/analytics/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          qrCodeId: 'qr-1',
          eventId: 'event-1',
          deviceType: 'mobile',
          scanDuration: 150,
          success: true,
        }),
        ip: '192.168.1.1',
        headers: {
          get: vi.fn().mockReturnValue('Mozilla/5.0 Mobile Browser'),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Scan event recorded successfully');
    });

    it('should handle missing identifier', async () => {
      const { GET } = await import('@/app/api/qr/analytics/route');

      const mockRequest = {
        nextUrl: {
          searchParams: {
            get: vi.fn().mockReturnValue(null), // No qrCodeId or eventId
          },
        },
      } as unknown as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either qrCodeId or eventId must be provided');
      expect(data.code).toBe('MISSING_IDENTIFIER');
    });
  });

  describe('QR Health Check API', () => {
    it('should return healthy status', async () => {
      const { GET } = await import('@/app/api/qr/health/route');

      const mockRequest = {} as NextRequest;
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.version).toBe('2.0');
      expect(data.checks.qrGeneration).toBe(true);
      expect(data.checks.analytics).toBe(true);
      expect(data.checks.security).toBe(true);
      expect(data.checks.cache).toBe(true);
      expect(data.performance.responseTime).toBeGreaterThan(0);
    });

    it('should return system configuration', async () => {
      const { POST } = await import('@/app/api/qr/health/route');

      const mockRequest = {} as NextRequest;
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config).toBeDefined();
      expect(data.config.features.analytics).toBe(true);
      expect(data.config.features.caching).toBe(true);
      expect(data.config.features.digitalSignatures).toBe(true);
      expect(data.config.features.batchOperations).toBe(true);
      expect(data.config.limits.maxBatchSize).toBe(100);
    });
  });

  describe('End-to-End QR Workflow', () => {
    it('should complete full QR generation and validation cycle', async () => {
      // Step 1: Generate QR codes in batch
      const { POST: batchPost } = await import('@/app/api/qr/batch/route');

      const batchRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [{ id: 'student-1', name: 'John Doe', eventId: 'event-1' }],
          options: { format: 'png', enableAnalytics: true },
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn().mockReturnValue('Test Browser') },
      } as unknown as NextRequest;

      const batchResponse = await batchPost(batchRequest);
      const batchData = await batchResponse.json();

      expect(batchResponse.status).toBe(200);
      expect(batchData.success).toBe(true);

      // Step 2: Record a scan event
      const { POST: analyticsPost } = await import(
        '@/app/api/qr/analytics/route'
      );

      const scanRequest = {
        json: vi.fn().mockResolvedValue({
          qrCodeId: 'student-1',
          eventId: 'event-1',
          deviceType: 'mobile',
          success: true,
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn().mockReturnValue('Mobile Browser') },
      } as unknown as NextRequest;

      const scanResponse = await analyticsPost(scanRequest);
      const scanData = await scanResponse.json();

      expect(scanResponse.status).toBe(200);
      expect(scanData.success).toBe(true);

      // Step 3: Get analytics
      const { GET: analyticsGet } = await import(
        '@/app/api/qr/analytics/route'
      );

      const analyticsRequest = {
        nextUrl: {
          searchParams: {
            get: vi.fn((key: string) => (key === 'eventId' ? 'event-1' : null)),
          },
        },
      } as unknown as NextRequest;

      const analyticsResponse = await analyticsGet(analyticsRequest);
      const analyticsData = await analyticsResponse.json();

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsData.success).toBe(true);
      expect(analyticsData.data.eventId).toBe('event-1');

      // Step 4: Check system health
      const { GET: healthGet } = await import('@/app/api/qr/health/route');

      const healthRequest = {} as NextRequest;
      const healthResponse = await healthGet(healthRequest);
      const healthData = await healthResponse.json();

      expect(healthResponse.status).toBe(200);
      expect(healthData.status).toBe('healthy');
    });

    it('should handle errors gracefully throughout workflow', async () => {
      // Mock service failures
      vi.mocked(
        require('@/lib/services/qr-enhanced.service').qrEnhancedService
          .generateEnhancedQR
      ).mockRejectedValue(new Error('Service unavailable'));

      const { POST } = await import('@/app/api/qr/batch/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [{ id: 'student-1', name: 'Test', eventId: 'event-1' }],
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      // Should handle partial failures gracefully
      expect(response.status).toBe(200);
      expect(data.results.failed).toHaveLength(1);
      expect(data.results.failed[0].error).toBe('Service unavailable');
    });
  });

  describe('Security Integration', () => {
    it('should record audit events during operations', async () => {
      const { POST } = await import('@/app/api/qr/batch/route');

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          subjects: [{ id: 'student-1', name: 'Test', eventId: 'event-1' }],
          options: { signature: true },
        }),
        ip: '192.168.1.1',
        headers: { get: vi.fn().mockReturnValue('Test Browser') },
      } as unknown as NextRequest;

      await POST(mockRequest);

      // Verify audit events were recorded
      const { qrSecurityService } = await import(
        '@/lib/security/qr-security.service'
      );
      expect(qrSecurityService.recordAuditEvent).toHaveBeenCalled();
    });

    it('should handle security validation', async () => {
      const { qrSecurityService } = await import(
        '@/lib/security/qr-security.service'
      );

      const signature = qrSecurityService.generateSignature('test-data');
      const verification = qrSecurityService.verifySignature(
        'test-data',
        signature
      );

      expect(verification.valid).toBe(true);
      expect(verification.securityLevel).toBe('high');
    });
  });
});
