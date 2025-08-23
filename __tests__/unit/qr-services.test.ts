import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QREnhancedService } from '@/lib/services/qr-enhanced.service';
import { QRAnalyticsService } from '@/lib/services/qr-analytics.service';
import { QRSecurityService } from '@/lib/security/qr-security.service';

// Mock dependencies
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/services/qr.service', () => ({
  qrService: {
    generateQRForSubject: vi.fn().mockResolvedValue({
      dataUrl: 'data:image/png;base64,mock-qr-data',
      token: 'mock-token-123',
      portalUrl: 'https://example.com/f/mock-token-123',
      subjectName: 'Test Student',
    }),
    validateStudentQRCode: vi.fn().mockResolvedValue({
      id: 'qr-code-1',
      eventId: 'event-1',
      studentId: 'student-1',
      codeValue: 'LKSTUDENT_test123',
      token: 'test123',
      type: 'student_identification',
      metadata: { studentName: 'Test Student' },
    }),
    getQRConfig: vi.fn().mockReturnValue({
      recommendedSizes: [150, 200, 300, 400],
      errorLevels: [{ level: 'M', description: 'Recommended' }],
    }),
  },
}));

describe('QREnhancedService', () => {
  let qrEnhancedService: QREnhancedService;

  beforeEach(() => {
    qrEnhancedService = new QREnhancedService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    qrEnhancedService.cleanCache();
  });

  describe('generateEnhancedQR', () => {
    it('should generate QR with default options', async () => {
      const result = await qrEnhancedService.generateEnhancedQR(
        'student-1',
        'Test Student'
      );

      expect(result).toEqual({
        dataUrl: 'data:image/png;base64,mock-qr-data',
        format: 'png',
        analytics: expect.any(Object),
        cacheKey: expect.any(String),
      });
    });

    it('should generate QR with custom options', async () => {
      const options = {
        format: 'svg' as const,
        size: 300,
        enableAnalytics: true,
        cacheDuration: 48,
      };

      const result = await qrEnhancedService.generateEnhancedQR(
        'student-1',
        'Test Student',
        options
      );

      expect(result.format).toBe('svg');
    });

    it('should use cache for duplicate requests', async () => {
      // First request
      const result1 = await qrEnhancedService.generateEnhancedQR(
        'student-1',
        'Test Student'
      );

      // Second request with same parameters
      const result2 = await qrEnhancedService.generateEnhancedQR(
        'student-1',
        'Test Student'
      );

      expect(result1.cacheKey).toBe(result2.cacheKey);
    });

    it('should handle generation errors gracefully', async () => {
      const mockError = new Error('QR generation failed');
      vi.mocked(require('@/lib/services/qr.service').qrService.generateQRForSubject)
        .mockRejectedValueOnce(mockError);

      await expect(
        qrEnhancedService.generateEnhancedQR('invalid-id', 'Test')
      ).rejects.toThrow('QR generation failed');
    });
  });

  describe('analytics', () => {
    it('should initialize analytics for new QR codes', async () => {
      await qrEnhancedService.generateEnhancedQR('new-student', 'New Student');
      
      const analytics = qrEnhancedService.getAnalytics('new-student');
      expect(analytics).toEqual({
        qrCodeId: 'new-student',
        eventId: '',
        totalScans: 0,
        uniqueScans: 0,
        lastScanAt: null,
        avgScanInterval: 0,
        deviceTypes: {},
        scanLocations: [],
      });
    });

    it('should track scans correctly', () => {
      const deviceInfo = {
        type: 'mobile',
        ip: '192.168.1.1',
        location: 'Test Location',
      };

      qrEnhancedService.trackScan('test-qr', deviceInfo);
      
      const analytics = qrEnhancedService.getAnalytics('test-qr');
      expect(analytics.totalScans).toBe(1);
      expect(analytics.deviceTypes.mobile).toBe(1);
      expect(analytics.scanLocations).toHaveLength(1);
    });
  });

  describe('cache management', () => {
    it('should clean expired cache entries', async () => {
      // Generate QR with short cache duration
      await qrEnhancedService.generateEnhancedQR('student-1', 'Test', {
        cacheDuration: 0.001, // Very short duration
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clean cache
      qrEnhancedService.cleanCache();

      const stats = qrEnhancedService.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await qrEnhancedService.generateEnhancedQR('student-1', 'Test 1');
      await qrEnhancedService.generateEnhancedQR('student-2', 'Test 2');

      const stats = qrEnhancedService.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.avgAccessCount).toBeGreaterThan(0);
    });
  });
});

describe('QRAnalyticsService', () => {
  let qrAnalyticsService: QRAnalyticsService;

  beforeEach(() => {
    qrAnalyticsService = new QRAnalyticsService();
    vi.clearAllMocks();
  });

  describe('recordScan', () => {
    it('should record scan event successfully', async () => {
      const scanEvent = {
        qrCodeId: 'qr-1',
        eventId: 'event-1',
        scannedAt: new Date(),
        deviceType: 'mobile',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        success: true,
      };

      await expect(qrAnalyticsService.recordScan(scanEvent)).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockError = new Error('Database connection failed');
      vi.mocked(require('@supabase/supabase-js').createClient().from().insert)
        .mockReturnValueOnce({ error: mockError });

      const scanEvent = {
        qrCodeId: 'qr-1',
        eventId: 'event-1',
        scannedAt: new Date(),
        deviceType: 'mobile',
        ipAddress: '192.168.1.1',
        success: true,
      };

      // Should not throw, but handle error internally
      await expect(qrAnalyticsService.recordScan(scanEvent)).resolves.not.toThrow();
    });
  });

  describe('getQRMetrics', () => {
    it('should return default metrics when no data', async () => {
      const metrics = await qrAnalyticsService.getQRMetrics('non-existent-qr');
      
      expect(metrics).toEqual({
        totalScans: 0,
        uniqueScans: 0,
        successRate: 0,
        avgScanTime: 0,
        popularDevices: [],
        scansByHour: {},
        scansByDay: {},
        errorAnalysis: {},
      });
    });

    it('should calculate metrics correctly with data', async () => {
      // Mock database response
      const mockEvents = [
        {
          qr_code_id: 'qr-1',
          scanned_at: '2024-01-01T10:00:00Z',
          device_type: 'mobile',
          ip_address: '192.168.1.1',
          success: true,
          scan_duration: 100,
        },
        {
          qr_code_id: 'qr-1',
          scanned_at: '2024-01-01T11:00:00Z',
          device_type: 'desktop',
          ip_address: '192.168.1.2',
          success: false,
          scan_duration: 200,
          error_message: 'Invalid QR',
        },
      ];

      vi.mocked(require('@supabase/supabase-js').createClient().from().select()
        .eq().gte().lte()).mockResolvedValueOnce({ data: mockEvents, error: null });

      const metrics = await qrAnalyticsService.getQRMetrics('qr-1');
      
      expect(metrics.totalScans).toBe(2);
      expect(metrics.uniqueScans).toBe(2);
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.avgScanTime).toBe(150);
      expect(metrics.popularDevices).toHaveLength(2);
      expect(metrics.errorAnalysis).toHaveProperty('Invalid QR', 1);
    });
  });
});

describe('QRSecurityService', () => {
  let qrSecurityService: QRSecurityService;

  beforeEach(() => {
    qrSecurityService = new QRSecurityService();
    vi.clearAllMocks();
  });

  describe('generateSignature', () => {
    it('should generate valid signature', () => {
      const qrData = 'test-qr-data';
      const signature = qrSecurityService.generateSignature(qrData);

      expect(signature).toEqual({
        signature: expect.any(String),
        algorithm: 'sha256',
        keyId: 'default',
        timestamp: expect.any(Date),
        expiresAt: expect.any(Date),
      });

      expect(signature.signature).toHaveLength(64); // SHA256 hex length
      expect(signature.expiresAt.getTime()).toBeGreaterThan(signature.timestamp.getTime());
    });

    it('should generate different signatures for different data', () => {
      const sig1 = qrSecurityService.generateSignature('data1');
      const sig2 = qrSecurityService.generateSignature('data2');

      expect(sig1.signature).not.toBe(sig2.signature);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const qrData = 'test-data';
      const signature = qrSecurityService.generateSignature(qrData);

      const result = qrSecurityService.verifySignature(qrData, signature);

      expect(result.valid).toBe(true);
      expect(result.securityLevel).toBe('high');
    });

    it('should reject invalid signature', () => {
      const qrData = 'test-data';
      const signature = qrSecurityService.generateSignature(qrData);
      
      // Tamper with signature
      signature.signature = 'invalid-signature';

      const result = qrSecurityService.verifySignature(qrData, signature);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid signature');
      expect(result.securityLevel).toBe('critical');
    });

    it('should reject expired signature', () => {
      const qrData = 'test-data';
      const signature = qrSecurityService.generateSignature(qrData);
      
      // Set expiration to past
      signature.expiresAt = new Date(Date.now() - 1000);

      const result = qrSecurityService.verifySignature(qrData, signature);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Signature expired');
      expect(result.securityLevel).toBe('medium');
    });
  });

  describe('recordAuditEvent', () => {
    it('should record audit event successfully', async () => {
      const auditEvent = {
        eventType: 'generate' as const,
        qrCodeId: 'qr-1',
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        securityLevel: 'medium' as const,
        success: true,
      };

      await expect(qrSecurityService.recordAuditEvent(auditEvent)).resolves.not.toThrow();
    });

    it('should handle critical security events', async () => {
      const criticalEvent = {
        eventType: 'tamper_detected' as const,
        qrCodeId: 'qr-1',
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        securityLevel: 'critical' as const,
        success: false,
        errorDetails: 'Signature tampering detected',
      };

      await expect(qrSecurityService.recordAuditEvent(criticalEvent)).resolves.not.toThrow();
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious patterns', async () => {
      // Mock audit events with suspicious patterns
      const mockEvents = Array.from({ length: 15 }, (_, i) => ({
        event_type: 'validate',
        qr_code_id: 'qr-1',
        ip_address: '192.168.1.100',
        success: false,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
      }));

      vi.mocked(require('@supabase/supabase-js').createClient().from().select()
        .gte().lte().order()).mockResolvedValueOnce({ data: mockEvents, error: null });

      const analysis = await qrSecurityService.detectSuspiciousActivity('event-1');

      expect(analysis.suspiciousIPs).toContain('192.168.1.100');
      expect(analysis.possibleBruteForce).toBe(true);
      expect(analysis.recommendations).toContain('Consider implementing stricter rate limiting');
    });

    it('should return empty analysis when no suspicious activity', async () => {
      vi.mocked(require('@supabase/supabase-js').createClient().from().select()
        .gte().lte().order()).mockResolvedValueOnce({ data: [], error: null });

      const analysis = await qrSecurityService.detectSuspiciousActivity('event-1');

      expect(analysis.suspiciousIPs).toHaveLength(0);
      expect(analysis.possibleBruteForce).toBe(false);
      expect(analysis.recommendations).toHaveLength(0);
    });
  });

  describe('device fingerprinting', () => {
    it('should generate device fingerprint', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const ipAddress = '192.168.1.1';

      const fingerprint = qrSecurityService.generateDeviceFingerprint(userAgent, ipAddress);

      expect(fingerprint).toHaveLength(16);
      expect(/^[a-f0-9]+$/i.test(fingerprint)).toBe(true);
    });

    it('should validate device fingerprint format', () => {
      const validFingerprint = 'a1b2c3d4e5f6789a';
      const invalidFingerprint = 'invalid';

      expect(qrSecurityService.validateDeviceFingerprint(
        validFingerprint,
        'test-agent',
        '192.168.1.1'
      )).toBe(true);

      expect(qrSecurityService.validateDeviceFingerprint(
        invalidFingerprint,
        'test-agent',
        '192.168.1.1'
      )).toBe(false);
    });
  });
});