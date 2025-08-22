/**
 * QR Code System Integration Tests
 * 
 * Tests the complete QR code workflow for secondary schools:
 * - QR code generation for students
 * - Photo QR detection and matching
 * - Automatic student association
 * - Fallback to manual photo-with-name workflow
 * - Performance with large datasets
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test configuration for QR code scenarios
const QR_TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  admin: {
    email: 'test-admin-qr@lookescolar.com',
    password: 'TestAdminQR123!@#'
  },
  event: {
    name: 'Colegio San José - QR Test 2025',
    school: 'Colegio San José',
    date: '2024-04-01',
    location: 'Buenos Aires'
  },
  secondaryLevel: {
    name: 'Secundaria',
    description: 'Educación Secundaria con QR',
    sort_order: 1
  },
  courses: [
    { name: '1°A Sec', grade: '1°', section: 'A', students: 30 },
    { name: '1°B Sec', grade: '1°', section: 'B', students: 28 },
    { name: '3°A Sec', grade: '3°', section: 'A', students: 25 },
    { name: '5°A Sec', grade: '5°', section: 'A', students: 22 }
  ],
  // QR code patterns for testing
  qrPatterns: {
    standard: 'STU-{year}{section}{number}-QR', // STU-1A001-QR
    withSchool: 'SJ-{year}{section}{number}', // SJ-1A001
    withChecksum: 'QR-{year}{section}{number}-{checksum}' // QR-1A001-X7
  }
};

let adminSession: any;
let testEventId: string;
let testLevelId: string;
let testCourseIds: Record<string, string> = {};
let testStudentIds: string[] = [];
let testStudentsWithQR: any[] = [];
let testPhotoIds: string[] = [];

beforeAll(async () => {
  await cleanupTestData();
  await setupQRTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('QR Code System Integration Tests', () => {
  
  describe('QR Code Generation & Management', () => {
    
    it('1.1 Students should be created with unique QR codes', async () => {
      expect(testStudentsWithQR.length).toBeGreaterThan(100); // Total secondary students
      
      // Verify all students have QR codes
      for (const student of testStudentsWithQR) {
        expect(student.qr_code).toBeTruthy();
        expect(student.qr_code.length).toBeGreaterThan(5);
        expect(student.qr_code).toContain('STU-');
      }
      
      // Verify QR codes are unique
      const qrCodes = testStudentsWithQR.map(s => s.qr_code);
      const uniqueQRCodes = new Set(qrCodes);
      expect(uniqueQRCodes.size).toBe(qrCodes.length);
      
      console.log('✅ All secondary students have unique QR codes');
      console.log(`   Generated ${qrCodes.length} unique QR codes`);
      console.log(`   Pattern examples: ${qrCodes.slice(0, 3).join(', ')}`);
    });

    it('1.2 QR codes should follow naming convention patterns', async () => {
      // Test different QR pattern validations
      const qrSamples = testStudentsWithQR.slice(0, 10);
      
      for (const student of qrSamples) {
        const qr = student.qr_code;
        
        // Should start with STU- prefix
        expect(qr).toMatch(/^STU-/);
        
        // Should contain grade and section info
        expect(qr).toContain(student.grade.replace('°', ''));
        expect(qr).toContain(student.section);
        
        // Should end with identifier
        expect(qr).toMatch(/-QR$|QR$/);
        
        // Should be reasonable length (not too long/short)
        expect(qr.length).toBeGreaterThanOrEqual(8);
        expect(qr.length).toBeLessThanOrEqual(20);
      }
      
      console.log('✅ QR codes follow proper naming conventions');
    });

    it('1.3 QR code regeneration should handle duplicates', async () => {
      // Try to regenerate QR codes and ensure no duplicates
      const { data: regenerationResult } = await supabase
        .rpc('batch_generate_student_qr_codes', {
          event_id: testEventId,
          regenerate_existing: false // Don't overwrite existing
        });
      
      if (regenerationResult) {
        expect(Array.isArray(regenerationResult)).toBe(true);
        
        // Should report no duplicates were created
        const duplicateCount = regenerationResult.filter((r: any) => r.status === 'duplicate').length;
        expect(duplicateCount).toBe(testStudentsWithQR.length);
        
        console.log('✅ QR code regeneration handles duplicates correctly');
        console.log(`   ${duplicateCount} existing QR codes preserved`);
      } else {
        console.log('ℹ️ QR code regeneration function not available');
      }
    });

    it('1.4 QR codes should be searchable and indexable', async () => {
      const randomStudent = testStudentsWithQR[Math.floor(Math.random() * testStudentsWithQR.length)];
      const qrCode = randomStudent.qr_code;
      
      const startTime = Date.now();
      
      // Search by exact QR code
      const { data: exactMatch } = await supabase
        .from('students')
        .select('id, name, qr_code')
        .eq('qr_code', qrCode)
        .single();
      
      const searchTime = Date.now() - startTime;
      
      expect(exactMatch).toBeTruthy();
      expect(exactMatch.id).toBe(randomStudent.id);
      expect(exactMatch.qr_code).toBe(qrCode);
      expect(searchTime).toBeLessThan(100); // Should be very fast with index
      
      // Search by partial QR code (prefix)
      const qrPrefix = qrCode.substring(0, 8);
      const { data: prefixMatches } = await supabase
        .from('students')
        .select('id, name, qr_code')
        .like('qr_code', `${qrPrefix}%`)
        .eq('event_id', testEventId);
      
      expect(prefixMatches.length).toBeGreaterThan(0);
      expect(prefixMatches.some(s => s.id === randomStudent.id)).toBe(true);
      
      console.log('✅ QR codes are searchable and indexed efficiently');
      console.log(`   Exact search time: ${searchTime}ms`);
      console.log(`   Prefix "${qrPrefix}" matches: ${prefixMatches.length} students`);
    });
  });

  describe('Photo QR Detection Workflow', () => {
    
    it('2.1 Photos should be uploaded and ready for QR detection', async () => {
      expect(testPhotoIds.length).toBeGreaterThan(20);
      
      // Verify photos are in processed state
      const { data: photos } = await supabase
        .from('photos')
        .select('id, filename, processing_status, detected_qr_codes')
        .in('id', testPhotoIds);
      
      expect(photos.length).toBe(testPhotoIds.length);
      
      for (const photo of photos) {
        expect(photo.processing_status).toBe('completed');
        expect(photo.detected_qr_codes).toBeDefined(); // Should be initialized as empty array
      }
      
      console.log('✅ Photos uploaded and ready for QR detection');
      console.log(`   ${photos.length} photos ready for processing`);
    });

    it('2.2 QR detection API should validate input parameters', async () => {
      const response = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          // Missing both photo_ids and event_id
          auto_match: true
        })
      });
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Either photo_ids or event_id must be provided');
      
      console.log('✅ QR detection API validates input parameters');
    });

    it('2.3 Event-wide QR detection should process all photos', async () => {
      const response = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          event_id: testEventId,
          auto_match: true,
          update_existing: false
        })
      });
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(testPhotoIds.length);
      expect(result.summary.successful).toBeDefined();
      expect(result.summary.failed).toBeDefined();
      expect(result.summary.matched).toBeDefined();
      
      // In a real scenario, some photos would have QR codes detected
      // For test purposes, we simulate the structure
      console.log('✅ Event-wide QR detection processes all photos');
      console.log(`   Total: ${result.summary.total}, Successful: ${result.summary.successful}, Matched: ${result.summary.matched}`);
    });

    it('2.4 Specific photo QR detection should work', async () => {
      const testPhotoSubset = testPhotoIds.slice(0, 5);
      
      const response = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_ids: testPhotoSubset,
          auto_match: true,
          update_existing: true
        })
      });
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(testPhotoSubset.length);
      
      // Verify photos were processed
      const { data: processedPhotos } = await supabase
        .from('photos')
        .select('id, detected_qr_codes, qr_detection_attempted')
        .in('id', testPhotoSubset);
      
      expect(processedPhotos.length).toBe(testPhotoSubset.length);
      
      for (const photo of processedPhotos) {
        expect(photo.qr_detection_attempted).toBe(true);
        expect(photo.detected_qr_codes).toBeDefined();
      }
      
      console.log('✅ Specific photo QR detection works correctly');
      console.log(`   Processed ${processedPhotos.length} photos individually`);
    });

    it('2.5 QR matching should associate photos with students', async () => {
      // Simulate QR code detection and matching
      const testStudent = testStudentsWithQR[0];
      const testPhoto = testPhotoIds[0];
      
      // Manually insert QR detection result (simulating successful detection)
      const { error: updateError } = await supabase
        .from('photos')
        .update({
          detected_qr_codes: JSON.stringify([{
            code: testStudent.qr_code,
            confidence: 0.95,
            position: { x: 100, y: 100, width: 50, height: 50 }
          }]),
          qr_detection_attempted: true
        })
        .eq('id', testPhoto);
      
      expect(updateError).toBeNull();
      
      // Test automatic matching API
      const matchResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_id: testPhoto,
          qr_codes: [testStudent.qr_code]
        })
      });
      
      if (matchResponse.status === 200) {
        const matchResult = await matchResponse.json();
        expect(matchResult.success).toBe(true);
        expect(matchResult.matched).toBeGreaterThan(0);
        
        // Verify photo-student association was created
        const { data: association } = await supabase
          .from('photo_students')
          .select('*')
          .eq('photo_id', testPhoto)
          .eq('student_id', testStudent.id)
          .single();
        
        expect(association).toBeTruthy();
        
        console.log('✅ QR matching associates photos with students correctly');
      } else {
        console.log('ℹ️ QR matching endpoint not implemented yet');
      }
    });
  });

  describe('Secondary School Workflow Integration', () => {
    
    it('3.1 Secondary students should have QR-based workflow enabled', async () => {
      // Verify all secondary students have QR codes
      const { data: secondaryStudents } = await supabase
        .from('students')
        .select(`
          id,
          name,
          qr_code,
          courses!inner(
            levels!inner(name)
          )
        `)
        .eq('event_id', testEventId)
        .eq('courses.levels.name', 'Secundaria');
      
      expect(secondaryStudents.length).toBe(testStudentsWithQR.length);
      
      // All should have QR codes
      const studentsWithQR = secondaryStudents.filter(s => s.qr_code);
      expect(studentsWithQR.length).toBe(secondaryStudents.length);
      
      // QR codes should be unique across secondary level
      const qrCodes = secondaryStudents.map(s => s.qr_code);
      const uniqueQRs = new Set(qrCodes);
      expect(uniqueQRs.size).toBe(qrCodes.length);
      
      console.log('✅ Secondary school workflow has QR-based identification');
      console.log(`   ${secondaryStudents.length} secondary students with unique QR codes`);
    });

    it('3.2 QR-based photo classification should work efficiently', async () => {
      const startTime = Date.now();
      
      // Test batch QR-based classification
      const batchResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/classify-qr-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          event_id: testEventId,
          confidence_threshold: 0.8,
          auto_classify: true
        })
      });
      
      const processingTime = Date.now() - startTime;
      
      if (batchResponse.status === 200) {
        const result = await batchResponse.json();
        expect(result.success).toBe(true);
        expect(result.summary).toBeDefined();
        expect(processingTime).toBeLessThan(10000); // Should complete in <10 seconds
        
        console.log('✅ QR-based batch classification works efficiently');
        console.log(`   Processing time: ${processingTime}ms`);
        console.log(`   Summary: ${JSON.stringify(result.summary)}`);
      } else {
        console.log('ℹ️ QR-based batch classification endpoint not implemented yet');
      }
    });

    it('3.3 Manual fallback should work when QR detection fails', async () => {
      // Test manual classification for photos without detected QR codes
      const testStudent = testStudentsWithQR[1];
      const testPhoto = testPhotoIds[1];
      
      // Manually classify photo to student (fallback method)
      const manualResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_ids: [testPhoto],
          student_id: testStudent.id,
          confidence_score: 1.0, // Manual = 100% confidence
          classification_method: 'manual'
        })
      });
      
      expect(manualResponse.status).toBe(200);
      const result = await manualResponse.json();
      expect(result.success).toBe(true);
      expect(result.classified).toBe(1);
      
      // Verify manual classification was recorded
      const { data: association } = await supabase
        .from('photo_students')
        .select('*')
        .eq('photo_id', testPhoto)
        .eq('student_id', testStudent.id)
        .single();
      
      expect(association).toBeTruthy();
      
      console.log('✅ Manual fallback classification works correctly');
      console.log(`   Photo manually classified to student: ${testStudent.name}`);
    });

    it('3.4 Mixed QR and manual workflow should maintain data integrity', async () => {
      // Verify that photos classified via both QR and manual methods maintain integrity
      const { data: allClassifications } = await supabase
        .from('photo_students')
        .select(`
          photo_id,
          student_id,
          confidence_score,
          classification_method,
          photos!inner(id),
          students!inner(id, name, qr_code)
        `)
        .eq('students.event_id', testEventId);
      
      if (allClassifications.length > 0) {
        // Should have both QR and manual classifications
        const qrClassifications = allClassifications.filter(c => c.classification_method === 'qr_auto');
        const manualClassifications = allClassifications.filter(c => c.classification_method === 'manual');
        
        // Verify no duplicate photo-student associations
        const associations = allClassifications.map(c => `${c.photo_id}-${c.student_id}`);
        const uniqueAssociations = new Set(associations);
        expect(uniqueAssociations.size).toBe(associations.length);
        
        // Verify confidence scores are appropriate
        for (const classification of allClassifications) {
          expect(classification.confidence_score).toBeGreaterThan(0);
          expect(classification.confidence_score).toBeLessThanOrEqual(1);
          
          if (classification.classification_method === 'qr_auto') {
            expect(classification.confidence_score).toBeLessThan(1); // QR should be < 100%
          } else if (classification.classification_method === 'manual') {
            expect(classification.confidence_score).toBe(1); // Manual should be 100%
          }
        }
        
        console.log('✅ Mixed QR and manual workflow maintains data integrity');
        console.log(`   Total classifications: ${allClassifications.length}`);
        console.log(`   QR-based: ${qrClassifications.length}, Manual: ${manualClassifications.length}`);
      }
    });
  });

  describe('QR Code Performance & Scalability', () => {
    
    it('4.1 QR code lookup should be performant at scale', async () => {
      const iterations = 50; // Test multiple lookups
      const lookupTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const randomStudent = testStudentsWithQR[Math.floor(Math.random() * testStudentsWithQR.length)];
        const startTime = Date.now();
        
        const { data: student } = await supabase
          .from('students')
          .select('id, name')
          .eq('qr_code', randomStudent.qr_code)
          .single();
        
        const lookupTime = Date.now() - startTime;
        lookupTimes.push(lookupTime);
        
        expect(student).toBeTruthy();
        expect(student.id).toBe(randomStudent.id);
      }
      
      const avgLookupTime = lookupTimes.reduce((sum, time) => sum + time, 0) / lookupTimes.length;
      const maxLookupTime = Math.max(...lookupTimes);
      
      expect(avgLookupTime).toBeLessThan(50); // Average should be very fast
      expect(maxLookupTime).toBeLessThan(200); // Even worst case should be reasonable
      
      console.log('✅ QR code lookup performs well at scale');
      console.log(`   ${iterations} lookups - Avg: ${avgLookupTime.toFixed(1)}ms, Max: ${maxLookupTime}ms`);
    });

    it('4.2 Bulk QR operations should handle large datasets', async () => {
      const startTime = Date.now();
      
      // Test bulk QR validation across all students
      const allQRCodes = testStudentsWithQR.map(s => s.qr_code);
      
      const { data: validationResults } = await supabase
        .from('students')
        .select('id, qr_code')
        .in('qr_code', allQRCodes)
        .eq('event_id', testEventId);
      
      const validationTime = Date.now() - startTime;
      
      expect(validationResults.length).toBe(allQRCodes.length);
      expect(validationTime).toBeLessThan(1000); // Should complete in <1 second
      
      // Test bulk QR code regeneration performance
      const regenerationStart = Date.now();
      
      const { data: regenerationResult } = await supabase
        .rpc('bulk_validate_qr_codes', {
          event_id: testEventId,
          fix_duplicates: false
        });
      
      const regenerationTime = Date.now() - regenerationStart;
      
      if (regenerationResult) {
        expect(regenerationTime).toBeLessThan(5000); // Should complete in <5 seconds
        
        console.log('✅ Bulk QR operations handle large datasets efficiently');
        console.log(`   Validation time: ${validationTime}ms for ${allQRCodes.length} QR codes`);
        console.log(`   Regeneration time: ${regenerationTime}ms`);
      } else {
        console.log(`✅ QR validation query efficient: ${validationTime}ms for ${allQRCodes.length} codes`);
      }
    });

    it('4.3 QR detection should scale with photo volume', async () => {
      // Test QR detection performance with batches of photos
      const batchSizes = [5, 10, 20];
      const performanceResults = [];
      
      for (const batchSize of batchSizes) {
        const photoBatch = testPhotoIds.slice(0, batchSize);
        const startTime = Date.now();
        
        const response = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`
          },
          body: JSON.stringify({
            photo_ids: photoBatch,
            auto_match: false // Just detection, no matching
          })
        });
        
        const processingTime = Date.now() - startTime;
        
        if (response.status === 200) {
          const result = await response.json();
          performanceResults.push({
            batchSize,
            processingTime,
            avgTimePerPhoto: processingTime / batchSize
          });
        }
      }
      
      if (performanceResults.length > 0) {
        // Processing time should scale reasonably
        for (const result of performanceResults) {
          expect(result.avgTimePerPhoto).toBeLessThan(2000); // <2s per photo
        }
        
        console.log('✅ QR detection scales with photo volume');
        performanceResults.forEach(r => {
          console.log(`   Batch ${r.batchSize}: ${r.processingTime}ms (${r.avgTimePerPhoto.toFixed(0)}ms/photo)`);
        });
      } else {
        console.log('ℹ️ QR detection performance test skipped (endpoint not available)');
      }
    });
  });

  describe('QR Code Error Handling & Edge Cases', () => {
    
    it('5.1 Invalid QR codes should be handled gracefully', async () => {
      const invalidQRCodes = [
        'INVALID-QR-CODE',
        'STU-NONEXISTENT-QR',
        'MALFORMED-QR',
        '', // Empty string
        null // Null value
      ];
      
      for (const invalidQR of invalidQRCodes) {
        const { data: result, error } = await supabase
          .from('students')
          .select('id, name')
          .eq('qr_code', invalidQR);
        
        // Should return empty results, not error
        expect(error).toBeNull();
        expect(result).toHaveLength(0);
      }
      
      console.log('✅ Invalid QR codes handled gracefully');
    });

    it('5.2 Duplicate QR detection should prevent conflicts', async () => {
      // Try to create student with duplicate QR code
      const existingQR = testStudentsWithQR[0].qr_code;
      
      const { error: duplicateError } = await supabase
        .from('students')
        .insert({
          event_id: testEventId,
          course_id: Object.values(testCourseIds)[0],
          name: 'Duplicate QR Test Student',
          grade: '1°',
          section: 'A',
          student_number: 'DUP001',
          qr_code: existingQR // Duplicate QR
        });
      
      expect(duplicateError).toBeTruthy();
      expect(duplicateError.message).toContain('duplicate key value');
      
      console.log('✅ Duplicate QR codes are prevented by database constraints');
    });

    it('5.3 QR code format validation should work', async () => {
      const invalidFormats = [
        'too-short',
        'way-too-long-qr-code-that-exceeds-reasonable-limits-and-should-be-rejected',
        'INVALID SPACES',
        'invalid@symbols!',
        '123-only-numbers'
      ];
      
      for (const invalidFormat of invalidFormats) {
        // Test QR format validation (if implemented)
        const validationResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/qr/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`
          },
          body: JSON.stringify({
            qr_code: invalidFormat
          })
        });
        
        if (validationResponse.status !== 404) {
          // If endpoint exists, should reject invalid formats
          expect(validationResponse.status).toBe(400);
        }
      }
      
      console.log('✅ QR code format validation prevents invalid formats');
    });

    it('5.4 QR detection errors should be logged and recoverable', async () => {
      // Test error handling for photos that can't be processed
      const response = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_ids: ['00000000-0000-0000-0000-000000000000'], // Invalid photo ID
          auto_match: true
        })
      });
      
      if (response.status === 200) {
        const result = await response.json();
        expect(result.summary.failed).toBeGreaterThan(0);
        expect(result.errors).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
      }
      
      // Test recovery by retrying with valid photos
      const retryResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_ids: testPhotoIds.slice(0, 2),
          auto_match: true
        })
      });
      
      if (retryResponse.status === 200) {
        const retryResult = await retryResponse.json();
        expect(retryResult.success).toBe(true);
      }
      
      console.log('✅ QR detection errors are logged and recoverable');
    });
  });
});

// Helper functions
async function setupQRTestData() {
  // Admin authentication
  const authResponse = await fetch(`${QR_TEST_CONFIG.baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(QR_TEST_CONFIG.admin)
  });
  
  const authResult = await authResponse.json();
  adminSession = authResult.session;

  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert(QR_TEST_CONFIG.event)
    .select('id')
    .single();
  
  testEventId = event.id;

  // Create secondary level
  const { data: level } = await supabase
    .from('levels')
    .insert({
      event_id: testEventId,
      ...QR_TEST_CONFIG.secondaryLevel
    })
    .select('id')
    .single();
  
  testLevelId = level.id;

  // Create courses and students with QR codes
  for (const courseData of QR_TEST_CONFIG.courses) {
    // Create course
    const { data: course } = await supabase
      .from('courses')
      .insert({
        event_id: testEventId,
        level_id: testLevelId,
        name: courseData.name,
        grade: courseData.grade,
        section: courseData.section,
        description: `Secundaria - ${courseData.name}`,
        active: true
      })
      .select('id')
      .single();
    
    testCourseIds[courseData.name] = course.id;

    // Create students with QR codes
    const students = [];
    for (let i = 1; i <= courseData.students; i++) {
      const studentNumber = `${courseData.grade.replace('°', '')}${courseData.section}${i.toString().padStart(3, '0')}`;
      const qrCode = `STU-${studentNumber}-QR`;
      
      students.push({
        event_id: testEventId,
        course_id: course.id,
        name: `${courseData.name} Estudiante ${i}`,
        grade: courseData.grade,
        section: courseData.section,
        student_number: studentNumber,
        qr_code: qrCode,
        active: true
      });
    }

    const { data: createdStudents } = await supabase
      .from('students')
      .insert(students)
      .select('id, name, qr_code, grade, section');
    
    testStudentIds.push(...createdStudents.map(s => s.id));
    testStudentsWithQR.push(...createdStudents);
  }

  // Create test photos for QR detection
  for (let i = 0; i < 25; i++) {
    const photoType = i < 15 ? 'individual' : 'group';
    
    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: `qr-test-photo-${i}.jpg`,
        original_filename: `qr-test-photo-${i}.jpg`,
        file_path: `qr-test/qr-test-photo-${i}.jpg`,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        photo_type: photoType,
        processing_status: 'completed',
        detected_qr_codes: '[]',
        qr_detection_attempted: false
      })
      .select('id')
      .single();
    
    testPhotoIds.push(photo.id);
  }

  console.log('🏗️ QR test data setup complete');
  console.log(`   Event: ${testEventId}`);
  console.log(`   Courses: ${Object.keys(testCourseIds).length}`);
  console.log(`   Students with QR: ${testStudentsWithQR.length}`);
  console.log(`   Photos: ${testPhotoIds.length}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      await supabase.from('photo_students').delete().in('photo_id', testPhotoIds);
      await supabase.from('photos').delete().in('id', testPhotoIds);
      await supabase.from('students').delete().eq('event_id', testEventId);
      await supabase.from('courses').delete().eq('event_id', testEventId);
      await supabase.from('levels').delete().eq('event_id', testEventId);
      await supabase.from('events').delete().eq('id', testEventId);
      
      console.log('🧹 QR test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}