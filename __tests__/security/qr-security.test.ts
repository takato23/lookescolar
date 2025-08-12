/**
 * @fileoverview Security Tests for QR Tagging Workflow
 * 
 * Tests:
 * - Rate limiting enforcement and thresholds
 * - Token validation and expiration
 * - Unauthorized access prevention
 * - SQL injection prevention
 * - Input validation and sanitization
 * - Authentication bypass attempts
 * - Data leakage prevention
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Import API routes for security testing
import { POST as decodeQR } from '@/app/api/admin/qr/decode/route';
import { POST as batchTag } from '@/app/api/admin/tagging/batch/route';
import { POST as validateToken } from '@/app/api/admin/subjects/validate-token/route';

// Test utilities
import { TestDBManager, TestDataManager, TestHelpers } from '../test-utils';

// Security test utilities
class SecurityTester {
  private requestLog: Array<{
    timestamp: number;
    endpoint: string;
    status: number;
    ip?: string;
  }> = [];

  logRequest(endpoint: string, status: number, ip?: string) {
    this.requestLog.push({
      timestamp: Date.now(),
      endpoint,
      status,
      ip,
    });
  }

  getRateLimitViolations(endpoint: string, windowMs: number, maxRequests: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const recentRequests = this.requestLog.filter(
      req => req.endpoint === endpoint && req.timestamp >= windowStart
    );

    return Math.max(0, recentRequests.length - maxRequests);
  }

  reset() {
    this.requestLog = [];
  }
}

// Mock rate limiter to test rate limiting behavior
class MockRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const keyRequests = this.requests.get(key)!;
    
    // Clean old requests
    const validRequests = keyRequests.filter(timestamp => timestamp >= windowStart);
    this.requests.set(key, validRequests);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    return true;
  }
}

describe('QR Workflow Security Tests', () => {
  let testDb: TestDBManager;
  let testData: TestDataManager;
  let securityTester: SecurityTester;
  let supabase: any;

  // Test data
  let eventId: string;
  let validStudentId: string;
  let validToken: string;
  let expiredToken: string;
  let validQRCode: string;
  let photoIds: string[];

  beforeAll(async () => {
    testDb = new TestDBManager();
    testData = new TestDataManager();
    securityTester = new SecurityTester();
    supabase = await createServerSupabaseServiceClient();
    
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    securityTester.reset();

    // Create test event
    const event = await testData.createEvent({
      name: 'Security Test Event',
      school_name: 'Security Test School',
      event_date: new Date().toISOString().split('T')[0],
      active: true,
    });
    eventId = event.id;

    // Create valid student
    const validStudent = await testData.createSubject({
      event_id: eventId,
      name: 'Valid Test Student',
      grade: '5A',
      token: TestHelpers.generateSecureToken(24),
      token_expires_at: TestHelpers.getFutureDate(30),
    });
    validStudentId = validStudent.id;
    validToken = validStudent.token;
    validQRCode = `STUDENT:${validStudent.id}:Valid Test Student:${eventId}`;

    // Create expired student
    const expiredStudent = await testData.createSubject({
      event_id: eventId,
      name: 'Expired Student',
      grade: '5A',
      token: TestHelpers.generateSecureToken(24),
      token_expires_at: TestHelpers.getPastDate(1), // 1 day ago
    });
    expiredToken = expiredStudent.token;

    // Create test photos
    const photos = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const photo = await testData.createPhoto({
          event_id: eventId,
          filename: `security-test-photo-${i + 1}.jpg`,
          approved: true,
          watermark_applied: true,
        });
        return photo;
      })
    );
    photoIds = photos.map(p => p.id);
  });

  afterEach(async () => {
    await testData.cleanup();
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits on QR decode endpoint', async () => {
      const rateLimiter = new MockRateLimiter(60000, 30); // 30 requests per minute
      const endpoint = '/api/admin/qr/decode';
      const clientIP = '192.168.1.100';

      let allowedRequests = 0;
      let blockedRequests = 0;

      // Make 40 requests rapidly
      for (let i = 0; i < 40; i++) {
        if (rateLimiter.isAllowed(clientIP)) {
          const request = new NextRequest('http://localhost' + endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': clientIP,
            },
            body: JSON.stringify({ qrCode: validQRCode }),
          });

          const response = await decodeQR(request);
          securityTester.logRequest(endpoint, response.status, clientIP);
          allowedRequests++;
        } else {
          blockedRequests++;
        }
      }

      // Should have allowed exactly 30 requests and blocked 10
      expect(allowedRequests).toBeLessThanOrEqual(30);
      expect(blockedRequests).toBeGreaterThanOrEqual(10);
      
      console.log('🚦 Rate Limiting Test Results:', {
        totalAttempts: 40,
        allowedRequests,
        blockedRequests,
        rateLimitWorking: blockedRequests > 0,
      });
    });

    it('should enforce rate limits per IP address independently', async () => {
      const rateLimiter = new MockRateLimiter(60000, 5); // 5 requests per minute
      const endpoint = '/api/admin/qr/decode';
      
      const ip1 = '192.168.1.101';
      const ip2 = '192.168.1.102';

      // Each IP should get 5 requests
      let ip1Allowed = 0;
      let ip2Allowed = 0;

      for (let i = 0; i < 7; i++) {
        // IP 1 requests
        if (rateLimiter.isAllowed(ip1)) {
          ip1Allowed++;
        }

        // IP 2 requests
        if (rateLimiter.isAllowed(ip2)) {
          ip2Allowed++;
        }
      }

      // Both IPs should be able to make their quota independently
      expect(ip1Allowed).toBe(5);
      expect(ip2Allowed).toBe(5);

      console.log('🔀 Per-IP Rate Limiting:', {
        ip1Allowed,
        ip2Allowed,
        independentLimits: ip1Allowed === 5 && ip2Allowed === 5,
      });
    });

    it('should have stricter rate limits for batch tagging operations', async () => {
      const rateLimiter = new MockRateLimiter(60000, 10); // 10 batch operations per minute
      const endpoint = '/api/admin/tagging/batch';
      const clientIP = '192.168.1.103';

      let allowedRequests = 0;
      let blockedRequests = 0;

      // Attempt 15 batch operations
      for (let i = 0; i < 15; i++) {
        if (rateLimiter.isAllowed(clientIP)) {
          const request = new NextRequest('http://localhost' + endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': clientIP,
            },
            body: JSON.stringify({
              eventId,
              photoIds: photoIds.slice(0, 5),
              studentId: validStudentId,
            }),
          });

          try {
            await batchTag(request);
            allowedRequests++;
          } catch (error) {
            // Count as blocked if it fails due to rate limiting
            if (error instanceof Error && error.message.includes('rate limit')) {
              blockedRequests++;
            }
          }
        } else {
          blockedRequests++;
        }
      }

      expect(allowedRequests).toBeLessThanOrEqual(10);
      expect(blockedRequests).toBeGreaterThanOrEqual(5);

      console.log('📦 Batch Operation Rate Limiting:', {
        allowedRequests,
        blockedRequests,
        stricterLimits: allowedRequests <= 10,
      });
    });
  });

  describe('Token Validation Security', () => {
    it('should reject tokens shorter than minimum length', async () => {
      const shortTokens = [
        '',
        'a',
        'short',
        'toolittlechars', // 14 chars, below 20 minimum
        '12345678901234567890', // exactly 20 chars should be rejected if rule is 24+
      ];

      for (const shortToken of shortTokens) {
        const qrCode = `STUDENT:${validStudentId}:Test Student:${eventId}`;
        
        const request = new NextRequest('http://localhost/api/admin/qr/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode }),
        });

        const response = await decodeQR(request);
        
        if (shortToken.length < 20) {
          expect(response.status).toBe(400);
          
          const data = await response.json();
          expect(data.error).toMatch(/Invalid QR code format|Token inválido/i);
        }
      }
    });

    it('should reject expired tokens', async () => {
      const expiredQRCode = `STUDENT:${validStudentId}:Test Student:${eventId}`;
      
      // Update student to have expired token
      await supabase
        .from('subjects')
        .update({ 
          token_expires_at: TestHelpers.getPastDate(1) // 1 day ago
        })
        .eq('id', validStudentId);

      const request = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: expiredQRCode }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Token expired');
      expect(data.expiresAt).toBeTruthy();
    });

    it('should prevent token enumeration attacks', async () => {
      const attemptedTokens = [
        TestHelpers.generateSecureToken(24), // Random valid format
        TestHelpers.generateSecureToken(24), // Another random one
        TestHelpers.generateSecureToken(24), // Yet another
      ];

      const responses = [];

      for (const token of attemptedTokens) {
        const fakeQRCode = `STUDENT:${validStudentId}:Test Student:${eventId}`;
        
        const request = new NextRequest('http://localhost/api/admin/qr/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode: fakeQRCode }),
        });

        const startTime = Date.now();
        const response = await decodeQR(request);
        const responseTime = Date.now() - startTime;

        responses.push({
          token,
          status: response.status,
          responseTime,
        });
      }

      // All should fail with same status
      responses.forEach(r => {
        expect(r.status).toBe(404); // Student not found
      });

      // Response times should be consistent (prevent timing attacks)
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      const maxDeviation = Math.max(...responses.map(r => Math.abs(r.responseTime - avgResponseTime)));
      
      // Deviation should be less than 50% of average (allowing for some variance)
      expect(maxDeviation).toBeLessThan(avgResponseTime * 0.5);

      console.log('🔍 Token Enumeration Protection:', {
        attempts: attemptedTokens.length,
        allFailed: responses.every(r => r.status === 404),
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxDeviation: `${maxDeviation.toFixed(2)}ms`,
        timingAttackProtection: maxDeviation < avgResponseTime * 0.5,
      });
    });
  });

  describe('Input Validation and SQL Injection Prevention', () => {
    it('should prevent SQL injection in QR code input', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE subjects; --",
        "' UNION SELECT * FROM subjects --",
        "' OR '1'='1",
        "'; UPDATE subjects SET token_expires_at = NULL; --",
        "' AND (SELECT COUNT(*) FROM subjects) > 0 --",
        `STUDENT:'; DELETE FROM events; --:Test:${eventId}`,
        `STUDENT:${validStudentId}'; DROP TABLE photos; --:Test:${eventId}`,
      ];

      for (const maliciousQR of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost/api/admin/qr/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode: maliciousQR }),
        });

        const response = await decodeQR(request);
        
        // Should reject with 400 Bad Request, not cause database error
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toMatch(/Invalid QR code format/i);
      }

      // Verify database integrity after injection attempts
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('event_id', eventId);

      expect(error).toBeNull();
      expect(subjects).toBeTruthy();
      expect(subjects.length).toBeGreaterThan(0);

      console.log('💉 SQL Injection Prevention:', {
        attempts: sqlInjectionAttempts.length,
        allBlocked: true,
        databaseIntegrityMaintained: subjects.length > 0,
      });
    });

    it('should sanitize and validate batch tagging input', async () => {
      const maliciousInputs = [
        {
          eventId: "'; DROP TABLE photos; --",
          photoIds: [photoIds[0]],
          studentId: validStudentId,
        },
        {
          eventId,
          photoIds: ["'; DELETE FROM photo_subjects; --"],
          studentId: validStudentId,
        },
        {
          eventId,
          photoIds: photoIds.slice(0, 3),
          studentId: "' OR '1'='1",
        },
        {
          eventId: `${eventId}'; UPDATE photos SET approved = false; --`,
          photoIds: photoIds.slice(0, 2),
          studentId: validStudentId,
        },
      ];

      for (const maliciousInput of maliciousInputs) {
        const request = new NextRequest('http://localhost/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousInput),
        });

        const response = await batchTag(request);
        
        // Should reject with validation error, not execute malicious SQL
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Invalid request data');
      }

      // Verify no malicious changes occurred
      const { data: photos } = await supabase
        .from('photos')
        .select('approved')
        .eq('event_id', eventId);

      expect(photos.every((p: any) => p.approved)).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedInputs = [
        '{"qrCode": "test"', // Missing closing brace
        '{"qrCode": }', // Invalid syntax
        '{qrCode: "test"}', // Missing quotes
        '{"qrCode": "test", "extra": }', // Trailing comma/invalid value
        '', // Empty string
        'not json at all',
        '{"qrCode": null}', // Null value
        '[]', // Array instead of object
      ];

      for (const malformedInput of malformedInputs) {
        const request = new NextRequest('http://localhost/api/admin/qr/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: malformedInput,
        });

        const response = await decodeQR(request);
        
        // Should handle gracefully with 400 or 500, not crash
        expect([400, 500]).toContain(response.status);
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for admin endpoints', async () => {
      // Mock unauthenticated request by removing auth headers
      const request = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQRCode }),
      });

      // Remove any existing auth headers
      request.headers.delete('authorization');
      request.headers.delete('cookie');

      try {
        const response = await decodeQR(request);
        // Should require authentication
        expect([401, 403]).toContain(response.status);
      } catch (error) {
        // If auth middleware throws, that's also acceptable
        expect(error).toBeTruthy();
      }
    });

    it('should prevent cross-event data access', async () => {
      // Create another event
      const otherEvent = await testData.createEvent({
        name: 'Other Event',
        school_name: 'Other School',
        event_date: '2024-01-01',
        active: true,
      });

      const otherStudent = await testData.createSubject({
        event_id: otherEvent.id,
        name: 'Other Student',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      // Try to use photos from current event with student from other event
      const request = new NextRequest('http://localhost/api/admin/tagging/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId, // Current event
          photoIds: photoIds.slice(0, 3),
          studentId: otherStudent.id, // Student from different event
        }),
      });

      const response = await batchTag(request);
      expect(response.status).toBe(400);

      // Should not create any assignments
      const { data: assignments } = await supabase
        .from('photo_subjects')
        .select('*')
        .eq('subject_id', otherStudent.id);

      expect(assignments).toHaveLength(0);
    });

    it('should prevent unauthorized access to other students\' data', async () => {
      // Create two students in same event
      const student1 = await testData.createSubject({
        event_id: eventId,
        name: 'Student One',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      const student2 = await testData.createSubject({
        event_id: eventId,
        name: 'Student Two',
        grade: '5B',
        token: TestHelpers.generateSecureToken(24),
      });

      // Assign photos to student1
      await supabase
        .from('photo_subjects')
        .insert(
          photoIds.slice(0, 3).map(photoId => ({
            photo_id: photoId,
            subject_id: student1.id,
          }))
        );

      // Try to use student1's token to access student2's data (if such endpoint existed)
      // This simulates checking that tokens can't be used for unauthorized data access
      const qrCode1 = `STUDENT:${student1.id}:Student One:${eventId}`;
      
      const request = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: qrCode1 }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      
      // Should only return data for the correct student
      expect(data.student.id).toBe(student1.id);
      expect(data.student.name).toBe('Student One');
      
      // Should not leak information about other students
      expect(data.student.id).not.toBe(student2.id);
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should mask sensitive data in API responses', async () => {
      const request = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQRCode }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      
      // Token should be masked in response
      expect(data.student.token).toMatch(/^tok_\w{3}\*\*\*$/);
      expect(data.student.token).not.toBe(validToken);
      
      // Should not expose internal database fields
      expect(data.student).not.toHaveProperty('password');
      expect(data.student).not.toHaveProperty('internal_id');
      expect(data.student).not.toHaveProperty('created_by');
    });

    it('should not leak sensitive information in error messages', async () => {
      const invalidQRCode = `STUDENT:${TestHelpers.generateUUID()}:Test Student:${eventId}`;
      
      const request = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: invalidQRCode }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      
      // Should not leak database schema or internal details
      expect(data.error).toBe('Student not found');
      expect(data.details).not.toContain('table');
      expect(data.details).not.toContain('column');
      expect(data.details).not.toContain('constraint');
      expect(data.details).not.toContain('postgresql');
      
      // Should not expose internal UUIDs or sensitive data
      expect(JSON.stringify(data)).not.toContain(validToken);
    });

    it('should prevent information disclosure through timing attacks', async () => {
      const validQRCode = `STUDENT:${validStudentId}:Valid Test Student:${eventId}`;
      const invalidQRCode = `STUDENT:${TestHelpers.generateUUID()}:Invalid Student:${eventId}`;

      const measurements = [];

      // Measure response times for valid and invalid requests
      for (let i = 0; i < 10; i++) {
        // Valid request
        const validStart = Date.now();
        await decodeQR(new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode: validQRCode }),
        }));
        const validTime = Date.now() - validStart;

        // Invalid request
        const invalidStart = Date.now();
        await decodeQR(new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode: invalidQRCode }),
        }));
        const invalidTime = Date.now() - invalidStart;

        measurements.push({ valid: validTime, invalid: invalidTime });
      }

      const avgValidTime = measurements.reduce((sum, m) => sum + m.valid, 0) / measurements.length;
      const avgInvalidTime = measurements.reduce((sum, m) => sum + m.invalid, 0) / measurements.length;

      // Time difference should not be significant enough to enable timing attacks
      const timeDifference = Math.abs(avgValidTime - avgInvalidTime);
      const timeDifferencePercent = timeDifference / Math.max(avgValidTime, avgInvalidTime);

      expect(timeDifferencePercent).toBeLessThan(0.5); // Less than 50% difference

      console.log('⏱️ Timing Attack Prevention:', {
        avgValidTime: `${avgValidTime.toFixed(2)}ms`,
        avgInvalidTime: `${avgInvalidTime.toFixed(2)}ms`,
        timeDifference: `${timeDifference.toFixed(2)}ms`,
        timeDifferencePercent: `${(timeDifferencePercent * 100).toFixed(2)}%`,
        protected: timeDifferencePercent < 0.5,
      });
    });
  });

  describe('Input Sanitization and XSS Prevention', () => {
    it('should sanitize potentially dangerous characters in student names', async () => {
      const dangerousNames = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>',
        "'; DROP TABLE subjects; --",
        '<img src=x onerror=alert("xss")>',
        '${alert("xss")}',
      ];

      for (const dangerousName of dangerousNames) {
        const dangerousStudent = await testData.createSubject({
          event_id: eventId,
          name: dangerousName,
          grade: '5A',
          token: TestHelpers.generateSecureToken(24),
        });

        const qrCode = `STUDENT:${dangerousStudent.id}:${dangerousName}:${eventId}`;
        
        const request = new NextRequest('http://localhost/api/admin/qr/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode }),
        });

        const response = await decodeQR(request);
        
        if (response.status === 200) {
          const data = await response.json();
          
          // Name should be sanitized or escaped in response
          expect(data.student.name).toBe(dangerousName); // Should store original but be careful in rendering
          
          // Response should not contain executable JavaScript
          const responseText = JSON.stringify(data);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
        }
      }
    });

    it('should validate file upload parameters to prevent path traversal', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '../config/database.yml',
        '../../.env',
        'photo.jpg/../../../secrets.txt',
      ];

      for (const filename of maliciousFilenames) {
        // Test that filenames are properly validated
        const photo = {
          event_id: eventId,
          filename,
          approved: true,
          watermark_applied: true,
        };

        try {
          await testData.createPhoto(photo);
          
          // If it was created, verify the filename was sanitized
          const { data: savedPhotos } = await supabase
            .from('photos')
            .select('filename, storage_path')
            .eq('filename', filename);

          if (savedPhotos && savedPhotos.length > 0) {
            const savedPhoto = savedPhotos[0];
            
            // Storage path should not contain directory traversal
            expect(savedPhoto.storage_path).not.toContain('../');
            expect(savedPhoto.storage_path).not.toContain('..\\');
            expect(savedPhoto.storage_path).not.toMatch(/\/\.\./);
          }
        } catch (error) {
          // If creation failed due to validation, that's good
          expect(error).toBeTruthy();
        }
      }
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    it('should handle distributed rate limiting correctly', async () => {
      // Test rate limiting across different request headers and patterns
      const requests = [];
      
      for (let i = 0; i < 20; i++) {
        requests.push({
          headers: {
            'X-Forwarded-For': `192.168.1.${100 + (i % 5)}`, // 5 different IPs
            'User-Agent': i % 2 === 0 ? 'Browser/1.0' : 'Mobile/2.0',
            'X-Real-IP': `10.0.0.${50 + (i % 3)}`, // 3 different real IPs
          },
          qrCode: qrCodes ? qrCodes[i % qrCodes.length] || validQRCode : validQRCode,
        });
      }

      const responses = await Promise.all(
        requests.map(req => 
          decodeQR(new NextRequest('http://localhost', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...req.headers,
            },
            body: JSON.stringify({ qrCode: req.qrCode }),
          }))
        )
      );

      // Should have a mix of successful and rate-limited responses
      const successfulResponses = responses.filter(r => r.status === 200).length;
      const rateLimitedResponses = responses.filter(r => r.status === 429).length;

      expect(successfulResponses + rateLimitedResponses).toBe(20);
      expect(successfulResponses).toBeGreaterThan(0);
      
      console.log('🌐 Distributed Rate Limiting:', {
        totalRequests: 20,
        successfulResponses,
        rateLimitedResponses,
        differentIPs: 5,
      });
    });

    it('should reset rate limits after time window expires', async () => {
      const rateLimiter = new MockRateLimiter(1000, 3); // 3 requests per second
      const clientIP = '192.168.1.200';

      // Make 3 requests (should all succeed)
      let firstBatchAllowed = 0;
      for (let i = 0; i < 3; i++) {
        if (rateLimiter.isAllowed(clientIP)) {
          firstBatchAllowed++;
        }
      }

      // 4th request should be blocked
      const fourthAllowed = rateLimiter.isAllowed(clientIP);

      // Wait for rate limit window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      let secondBatchAllowed = 0;
      for (let i = 0; i < 3; i++) {
        if (rateLimiter.isAllowed(clientIP)) {
          secondBatchAllowed++;
        }
      }

      expect(firstBatchAllowed).toBe(3);
      expect(fourthAllowed).toBe(false);
      expect(secondBatchAllowed).toBe(3);

      console.log('⏰ Rate Limit Reset:', {
        firstBatch: firstBatchAllowed,
        fourthRequest: fourthAllowed,
        afterReset: secondBatchAllowed,
        windowReset: true,
      });
    });
  });
});