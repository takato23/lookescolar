/**
 * @fileoverview Integration Tests for Complete QR Tagging Workflow
 * 
 * Tests the complete QR workflow:
 * 1. QR scan → decode → validate
 * 2. Photo selection → batch assignment
 * 3. Database state verification
 * 4. Error scenarios and edge cases
 * 
 * Security: Tests rate limiting, token validation, duplicate prevention
 * Performance: Tests batch operations with 50+ photos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Import API routes for testing
import { POST as decodeQR } from '@/app/api/admin/qr/decode/route';
import { POST as batchTag } from '@/app/api/admin/tagging/batch/route';
import { POST as validateToken } from '@/app/api/admin/subjects/validate-token/route';

// Test utilities
import { TestDBManager, TestDataManager, TestHelpers } from '../test-utils';

describe('QR Tagging Workflow Integration Tests', () => {
  let testDb: TestDBManager;
  let testData: TestDataManager;
  let supabase: any;

  // Test data IDs (will be set during setup)
  let eventId: string;
  let studentId: string;
  let studentToken: string;
  let photoIds: string[];
  let validQRCode: string;

  beforeAll(async () => {
    testDb = new TestDBManager();
    testData = new TestDataManager();
    supabase = await createServerSupabaseServiceClient();
    
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    // Create fresh test event with students and photos
    const event = await testData.createEvent({
      name: 'QR Test Event',
      school_name: 'QR Test School',
      event_date: new Date().toISOString().split('T')[0],
      active: true,
    });
    eventId = event.id;

    // Create test student with valid token
    const student = await testData.createSubject({
      event_id: eventId,
      name: 'Juan Pérez',
      grade: '5A',
      token: TestHelpers.generateSecureToken(24),
      token_expires_at: TestHelpers.getFutureDate(30), // 30 days
    });
    studentId = student.id;
    studentToken = student.token;

    // Create QR code in expected format
    validQRCode = `STUDENT:${studentId}:Juan Pérez:${eventId}`;

    // Create approved test photos
    photoIds = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const photo = await testData.createPhoto({
          event_id: eventId,
          filename: `test-photo-${i + 1}.jpg`,
          storage_path: `events/${eventId}/test-photo-${i + 1}.jpg`,
          approved: true,
          watermark_applied: true,
        });
        return photo.id;
      })
    );
  });

  afterEach(async () => {
    await testData.cleanup();
  });

  describe('Complete QR Workflow - Happy Path', () => {
    it('should complete entire workflow: scan → decode → batch tag → verify', async () => {
      // Step 1: Decode QR Code
      const decodeRequest = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQRCode }),
      });

      const decodeResponse = await decodeQR(decodeRequest);
      expect(decodeResponse.status).toBe(200);

      const decodeData = await decodeResponse.json();
      expect(decodeData.success).toBe(true);
      expect(decodeData.student).toMatchObject({
        id: studentId,
        name: 'Juan Pérez',
        grade: '5A',
        event_id: eventId,
        photo_count: 0, // Initially no photos assigned
      });
      expect(decodeData.student.token).toMatch(/^tok_\w{3}\*\*\*$/); // Masked token
      expect(decodeData.metadata.token_status).toBe('valid');

      // Step 2: Batch assign photos to student (QR tagging workflow)
      const batchRequest = new NextRequest('http://localhost/api/admin/tagging/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          photoIds: photoIds.slice(0, 5), // Assign first 5 photos
          studentId: studentId,
        }),
      });

      const batchResponse = await batchTag(batchRequest);
      expect(batchResponse.status).toBe(200);

      const batchData = await batchResponse.json();
      expect(batchData.success).toBe(true);
      expect(batchData.data.assignedCount).toBe(5);
      expect(batchData.data.workflowType).toBe('qr_tagging');

      // Step 3: Verify database state
      const { data: photoSubjects } = await supabase
        .from('photo_subjects')
        .select('photo_id, subject_id')
        .eq('subject_id', studentId);

      expect(photoSubjects).toHaveLength(5);
      expect(photoSubjects.map((ps: any) => ps.photo_id).sort())
        .toEqual(photoIds.slice(0, 5).sort());

      // Step 4: Verify student now has photo count
      const decodeVerifyRequest = new NextRequest('http://localhost/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQRCode }),
      });

      const decodeVerifyResponse = await decodeQR(decodeVerifyRequest);
      const decodeVerifyData = await decodeVerifyResponse.json();
      expect(decodeVerifyData.student.photo_count).toBe(5);
    });

    it('should handle sequential QR scans for different students', async () => {
      // Create second student
      const student2 = await testData.createSubject({
        event_id: eventId,
        name: 'María González',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });
      const student2QR = `STUDENT:${student2.id}:María González:${eventId}`;

      // Scan first student QR
      const scan1 = await decodeQR(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: validQRCode }),
      }));
      expect(scan1.status).toBe(200);

      // Assign photos to first student
      await batchTag(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(0, 3),
          studentId,
        }),
      }));

      // Scan second student QR
      const scan2 = await decodeQR(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: student2QR }),
      }));
      expect(scan2.status).toBe(200);

      // Assign different photos to second student
      await batchTag(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(3, 6),
          studentId: student2.id,
        }),
      }));

      // Verify both assignments are correct
      const { data: student1Photos } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .eq('subject_id', studentId);
      expect(student1Photos).toHaveLength(3);

      const { data: student2Photos } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .eq('subject_id', student2.id);
      expect(student2Photos).toHaveLength(3);
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid QR code formats', async () => {
      const invalidQRCodes = [
        'INVALID:FORMAT',
        'STUDENT:invalid-uuid:Name:invalid-event',
        'STUDENT:', // Incomplete
        '', // Empty
        'RANDOM_STRING',
        `STUDENT:${studentId}:Juan Pérez:${eventId}:EXTRA`, // Too many parts
      ];

      for (const invalidQR of invalidQRCodes) {
        const request = new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode: invalidQR }),
        });

        const response = await decodeQR(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toMatch(/Invalid QR code format/i);
      }
    });

    it('should reject expired tokens', async () => {
      // Create student with expired token
      const expiredStudent = await testData.createSubject({
        event_id: eventId,
        name: 'Pedro Vencido',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
        token_expires_at: TestHelpers.getPastDate(1), // 1 day ago
      });

      const expiredQR = `STUDENT:${expiredStudent.id}:Pedro Vencido:${eventId}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: expiredQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Token expired');
      expect(data.expiresAt).toBeTruthy();
    });

    it('should reject QR codes for inactive events', async () => {
      // Create inactive event
      const inactiveEvent = await testData.createEvent({
        name: 'Inactive Event',
        school_name: 'Test School',
        event_date: '2024-01-01',
        active: false,
      });

      const inactiveStudent = await testData.createSubject({
        event_id: inactiveEvent.id,
        name: 'Ana Inactiva',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      const inactiveQR = `STUDENT:${inactiveStudent.id}:Ana Inactiva:${inactiveEvent.id}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: inactiveQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Event not active');
    });

    it('should reject attempts to tag unapproved photos', async () => {
      // Create unapproved photos
      const unapprovedPhotoIds = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const photo = await testData.createPhoto({
            event_id: eventId,
            filename: `unapproved-photo-${i}.jpg`,
            approved: false, // Not approved
            watermark_applied: false,
          });
          return photo.id;
        })
      );

      const batchRequest = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: unapprovedPhotoIds,
          studentId,
        }),
      });

      const response = await batchTag(batchRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Cannot tag unapproved photos');
      expect(data.details.unapprovedCount).toBe(3);
    });

    it('should handle student name mismatches gracefully', async () => {
      // QR with wrong student name
      const wrongNameQR = `STUDENT:${studentId}:Wrong Name:${eventId}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: wrongNameQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Student name mismatch');
      expect(data.expected).toBe('Juan Pérez');
      expect(data.provided).toBe('Wrong Name');
    });

    it('should handle non-existent students', async () => {
      const fakeStudentId = TestHelpers.generateUUID();
      const fakeQR = `STUDENT:${fakeStudentId}:Fake Student:${eventId}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: fakeQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Student not found');
    });

    it('should handle duplicate assignments', async () => {
      // First assignment
      const firstBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(0, 3),
          studentId,
        }),
      });

      const firstResponse = await batchTag(firstBatch);
      expect(firstResponse.status).toBe(200);

      // Attempt duplicate assignment
      const duplicateBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(0, 3), // Same photos
          studentId,
        }),
      });

      const duplicateResponse = await batchTag(duplicateBatch);
      expect(duplicateResponse.status).toBe(200);

      const duplicateData = await duplicateResponse.json();
      expect(duplicateData.data.assignedCount).toBe(0);
      expect(duplicateData.data.duplicateCount).toBe(3);
      expect(duplicateData.message).toContain('already assigned');
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch assignment of 50+ photos efficiently', async () => {
      // Create 60 test photos
      const largePhotoIds = await Promise.all(
        Array.from({ length: 60 }, async (_, i) => {
          const photo = await testData.createPhoto({
            event_id: eventId,
            filename: `perf-photo-${i + 1}.jpg`,
            approved: true,
            watermark_applied: true,
          });
          return photo.id;
        })
      );

      const startTime = Date.now();

      const batchRequest = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: largePhotoIds.slice(0, 50), // Batch limit
          studentId,
        }),
      });

      const response = await batchTag(batchRequest);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data.assignedCount).toBe(50);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      // Verify database state
      const { data: assignments } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .eq('subject_id', studentId);
      
      expect(assignments).toHaveLength(50);
    });

    it('should handle concurrent QR scans without race conditions', async () => {
      // Create multiple students
      const students = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const student = await testData.createSubject({
            event_id: eventId,
            name: `Student ${i + 1}`,
            grade: '5A',
            token: TestHelpers.generateSecureToken(24),
          });
          return {
            id: student.id,
            qr: `STUDENT:${student.id}:Student ${i + 1}:${eventId}`,
          };
        })
      );

      // Simulate concurrent QR scans
      const concurrentScans = students.map(student => 
        decodeQR(new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode: student.qr }),
        }))
      );

      const responses = await Promise.all(concurrentScans);
      
      // All scans should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify each scan returned correct student data
      const results = await Promise.all(responses.map(r => r.json()));
      results.forEach((result, i) => {
        expect(result.student.id).toBe(students[i].id);
        expect(result.student.name).toBe(`Student ${i + 1}`);
      });
    });

    it('should measure QR decode performance', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        const request = new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode: validQRCode }),
        });

        const response = await decodeQR(request);
        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(500); // Average under 500ms
      expect(maxDuration).toBeLessThan(1000); // Max under 1 second

      console.log(`QR Decode Performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration}ms`);
    });
  });

  describe('Security Tests', () => {
    it('should validate token format in batch tagging', async () => {
      const maliciousBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId: 'invalid-uuid',
          photoIds: ['also-invalid'],
          studentId: 'malicious-input',
        }),
      });

      const response = await batchTag(maliciousBatch);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeInstanceOf(Array);
    });

    it('should prevent cross-event data access', async () => {
      // Create different event
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

      // Try to use student from other event with current event's photos
      const crossEventBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId, // Current event
          photoIds: photoIds.slice(0, 2),
          studentId: otherStudent.id, // Student from different event
        }),
      });

      const response = await batchTag(crossEventBatch);
      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid":json,}', // Malformed JSON
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(500); // Should handle parsing error
    });

    it('should limit batch size to prevent resource exhaustion', async () => {
      // Try to assign more than the limit (100 for standard, 50 for QR tagging)
      const tooManyPhotos = Array.from({ length: 101 }, () => TestHelpers.generateUUID());

      const oversizedBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: tooManyPhotos,
          studentId,
        }),
      });

      const response = await batchTag(oversizedBatch);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle photos that belong to different events', async () => {
      // Create photo in different event
      const otherEvent = await testData.createEvent({
        name: 'Other Event',
        school_name: 'Other School',
        event_date: '2024-01-01',
        active: true,
      });

      const otherPhoto = await testData.createPhoto({
        event_id: otherEvent.id,
        filename: 'other-photo.jpg',
        approved: true,
        watermark_applied: true,
      });

      const mixedBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId, // Current event
          photoIds: [photoIds[0], otherPhoto.id], // Mix of current and other event photos
          studentId,
        }),
      });

      const response = await batchTag(mixedBatch);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('do not belong to this event');
      expect(data.details.expected).toBe(2);
      expect(data.details.found).toBe(1); // Only one photo found in the event
    });

    it('should handle empty photo arrays', async () => {
      const emptyBatch = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: [], // Empty array
          studentId,
        }),
      });

      const response = await batchTag(emptyBatch);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle QR codes with special characters in names', async () => {
      const specialStudent = await testData.createSubject({
        event_id: eventId,
        name: 'José María Ñoño-García',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      const specialQR = `STUDENT:${specialStudent.id}:José María Ñoño-García:${eventId}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: specialQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.student.name).toBe('José María Ñoño-García');
    });

    it('should handle very long student names', async () => {
      const longName = 'María José Esperanza Concepción del Rosario Guadalupe Santos';
      const longNameStudent = await testData.createSubject({
        event_id: eventId,
        name: longName,
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      const longNameQR = `STUDENT:${longNameStudent.id}:${longName}:${eventId}`;

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: longNameQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.student.name).toBe(longName);
    });

    it('should handle fuzzy name matching for minor typos', async () => {
      // QR with minor typo in name
      const typoQR = `STUDENT:${studentId}:Juan Perez:${eventId}`; // Missing accent

      const request = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ qrCode: typoQR }),
      });

      const response = await decodeQR(request);
      expect(response.status).toBe(200); // Should be accepted with fuzzy matching

      const data = await response.json();
      expect(data.student.name).toBe('Juan Pérez'); // Original name returned
    });
  });

  describe('Database Consistency', () => {
    it('should maintain referential integrity during batch operations', async () => {
      // Assign photos
      const batchRequest = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(0, 5),
          studentId,
        }),
      });

      const response = await batchTag(batchRequest);
      expect(response.status).toBe(200);

      // Verify photo_subjects table
      const { data: photoSubjects } = await supabase
        .from('photo_subjects')
        .select(`
          photo_id,
          subject_id,
          tagged_at,
          tagged_by,
          photos (id, event_id),
          subjects (id, name, event_id)
        `)
        .eq('subject_id', studentId);

      expect(photoSubjects).toHaveLength(5);
      
      // Verify all relationships are valid
      photoSubjects.forEach((ps: any) => {
        expect(ps.photos).toBeTruthy();
        expect(ps.subjects).toBeTruthy();
        expect(ps.photos.event_id).toBe(eventId);
        expect(ps.subjects.event_id).toBe(eventId);
        expect(ps.tagged_at).toBeTruthy();
        expect(ps.tagged_by).toBe('admin');
      });
    });

    it('should handle concurrent batch operations without conflicts', async () => {
      // Create two students
      const student2 = await testData.createSubject({
        event_id: eventId,
        name: 'Ana López',
        grade: '5A',
        token: TestHelpers.generateSecureToken(24),
      });

      // Assign different photo sets concurrently
      const batch1 = batchTag(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(0, 5),
          studentId,
        }),
      }));

      const batch2 = batchTag(new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          photoIds: photoIds.slice(5, 10),
          studentId: student2.id,
        }),
      }));

      const [response1, response2] = await Promise.all([batch1, batch2]);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify no assignment conflicts
      const { data: allAssignments } = await supabase
        .from('photo_subjects')
        .select('photo_id, subject_id')
        .or(`subject_id.eq.${studentId},subject_id.eq.${student2.id}`);

      expect(allAssignments).toHaveLength(10);
      
      // No photo should be assigned to multiple students
      const photoAssignmentCounts = allAssignments.reduce((acc: any, assignment: any) => {
        acc[assignment.photo_id] = (acc[assignment.photo_id] || 0) + 1;
        return acc;
      }, {});

      Object.values(photoAssignmentCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });
  });
});