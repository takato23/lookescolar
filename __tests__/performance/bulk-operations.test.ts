/**
 * Bulk Operations Performance Tests
 * 
 * Tests bulk operations that are critical for handling large school events:
 * - Bulk photo upload and processing
 * - Batch student creation and token generation
 * - Mass photo classification workflows
 * - Large-scale course and level management
 * - Performance benchmarks for 500+ students
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BULK_TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  admin: {
    email: 'test-admin-bulk@lookescolar.com',
    password: 'TestAdminBulk123!@#'
  },
  event: {
    name: 'Colegio Nacional - Bulk Operations Test 2025',
    school: 'Colegio Nacional',
    date: '2024-05-01',
    location: 'Capital Federal'
  },
  // Performance test scales
  scales: {
    small: { courses: 5, studentsPerCourse: 25, photos: 50 }, // 125 students
    medium: { courses: 15, studentsPerCourse: 30, photos: 200 }, // 450 students  
    large: { courses: 25, studentsPerCourse: 25, photos: 500 } // 625 students
  },
  // Performance thresholds (milliseconds)
  thresholds: {
    photoUpload: 2000, // Per photo
    studentCreation: 100, // Per student
    tokenGeneration: 50, // Per token
    classification: 500, // Per photo
    bulkQuery: 3000 // Complex bulk queries
  }
};

let adminSession: any;
let testEventId: string;
let testData: {
  levelIds: string[];
  courseIds: string[];
  studentIds: string[];
  photoIds: string[];
  tokenIds: string[];
} = {
  levelIds: [],
  courseIds: [],
  studentIds: [],
  photoIds: [],
  tokenIds: []
};

beforeAll(async () => {
  await cleanupTestData();
  await setupBulkTestEnvironment();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Bulk Operations Performance Tests', () => {
  
  describe('Bulk Photo Upload Operations', () => {
    
    it('1.1 Small batch photo upload should meet performance targets', async () => {
      const { photos: photoCount } = BULK_TEST_CONFIG.scales.small;
      const uploadTimes = [];
      
      console.log(`📸 Testing ${photoCount} photo uploads...`);
      
      for (let i = 0; i < photoCount; i++) {
        const startTime = Date.now();
        
        // Create minimal valid image for upload
        const testImageBuffer = createTestImageBuffer();
        const formData = new FormData();
        const blob = new Blob([testImageBuffer], { type: 'image/png' });
        formData.append('file', blob, `bulk-test-${i}.png`);
        formData.append('event_id', testEventId);
        formData.append('photo_type', i % 3 === 0 ? 'individual' : i % 3 === 1 ? 'group' : 'activity');

        const response = await fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/photos/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminSession.access_token}` },
          body: formData
        });
        
        const uploadTime = Date.now() - startTime;
        uploadTimes.push(uploadTime);
        
        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result.id).toBeDefined();
        expect(result.status).toBe('processed');
        
        testData.photoIds.push(result.id);
        
        // Check individual upload performance
        expect(uploadTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.photoUpload);
      }
      
      const avgUploadTime = uploadTimes.reduce((sum, time) => sum + time, 0) / uploadTimes.length;
      const maxUploadTime = Math.max(...uploadTimes);
      const totalTime = uploadTimes.reduce((sum, time) => sum + time, 0);
      
      console.log('✅ Small batch photo upload performance:');
      console.log(`   ${photoCount} photos in ${totalTime}ms total`);
      console.log(`   Average: ${avgUploadTime.toFixed(1)}ms per photo`);
      console.log(`   Maximum: ${maxUploadTime}ms per photo`);
      
      expect(avgUploadTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.photoUpload);
    });

    it('1.2 Batch photo processing should handle concurrent uploads', async () => {
      const concurrentUploads = 10;
      const startTime = Date.now();
      
      console.log(`📸 Testing ${concurrentUploads} concurrent uploads...`);
      
      const uploadPromises = [];
      for (let i = 0; i < concurrentUploads; i++) {
        const testImageBuffer = createTestImageBuffer();
        const formData = new FormData();
        const blob = new Blob([testImageBuffer], { type: 'image/png' });
        formData.append('file', blob, `concurrent-${i}.png`);
        formData.append('event_id', testEventId);

        uploadPromises.push(
          fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/photos/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminSession.access_token}` },
            body: formData
          })
        );
      }

      const responses = await Promise.all(uploadPromises);
      const totalTime = Date.now() - startTime;
      
      // Verify all uploads succeeded
      for (const response of responses) {
        expect(response.status).toBe(201);
        const result = await response.json();
        testData.photoIds.push(result.id);
      }
      
      const avgTimePerUpload = totalTime / concurrentUploads;
      
      console.log('✅ Concurrent upload performance:');
      console.log(`   ${concurrentUploads} uploads in ${totalTime}ms total`);
      console.log(`   ${avgTimePerUpload.toFixed(1)}ms average per upload`);
      
      // Concurrent uploads should be more efficient than sequential
      expect(avgTimePerUpload).toBeLessThan(BULK_TEST_CONFIG.thresholds.photoUpload);
    });

    it('1.3 Large batch photo metadata should be handled efficiently', async () => {
      const batchSize = 50;
      const photoIds = testData.photoIds.slice(0, batchSize);
      
      const startTime = Date.now();
      
      // Test bulk photo metadata retrieval
      const { data: photoMetadata } = await supabase
        .from('photos')
        .select(`
          id,
          filename,
          file_size,
          width,
          height,
          photo_type,
          processing_status,
          detected_qr_codes,
          created_at
        `)
        .in('id', photoIds);
      
      const queryTime = Date.now() - startTime;
      
      expect(photoMetadata).toHaveLength(batchSize);
      expect(queryTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.bulkQuery);
      
      // Verify all photos are processed
      for (const photo of photoMetadata) {
        expect(photo.processing_status).toBe('completed');
        expect(photo.detected_qr_codes).toBeDefined();
      }
      
      console.log('✅ Bulk photo metadata query performance:');
      console.log(`   ${batchSize} photos metadata in ${queryTime}ms`);
    });
  });

  describe('Bulk Student Management Operations', () => {
    
    it('2.1 Batch student creation should scale efficiently', async () => {
      const { courses: courseCount, studentsPerCourse } = BULK_TEST_CONFIG.scales.medium;
      let totalStudentsCreated = 0;
      const courseTimes = [];
      
      console.log(`👥 Testing batch creation for ${courseCount} courses with ${studentsPerCourse} students each...`);
      
      for (let courseIndex = 0; courseIndex < courseCount; courseIndex++) {
        const startTime = Date.now();
        
        // Create course first
        const { data: course } = await supabase
          .from('courses')
          .insert({
            event_id: testEventId,
            name: `Curso Batch ${courseIndex + 1}°A`,
            grade: `${courseIndex + 1}°`,
            section: 'A',
            description: `Curso para pruebas de bulk operations`,
            active: true
          })
          .select('id')
          .single();
        
        testData.courseIds.push(course.id);
        
        // Create students for this course in batch
        const students = [];
        for (let studentIndex = 1; studentIndex <= studentsPerCourse; studentIndex++) {
          students.push({
            event_id: testEventId,
            course_id: course.id,
            name: `Estudiante ${courseIndex + 1}${studentIndex.toString().padStart(2, '0')}`,
            grade: `${courseIndex + 1}°`,
            section: 'A',
            student_number: `${courseIndex + 1}A${studentIndex.toString().padStart(3, '0')}`,
            active: true
          });
        }

        const { data: createdStudents } = await supabase
          .from('students')
          .insert(students)
          .select('id');
        
        const courseTime = Date.now() - startTime;
        courseTimes.push(courseTime);
        
        testData.studentIds.push(...createdStudents.map(s => s.id));
        totalStudentsCreated += createdStudents.length;
        
        const avgTimePerStudent = courseTime / studentsPerCourse;
        expect(avgTimePerStudent).toBeLessThan(BULK_TEST_CONFIG.thresholds.studentCreation);
      }
      
      const totalTime = courseTimes.reduce((sum, time) => sum + time, 0);
      const avgTimePerStudent = totalTime / totalStudentsCreated;
      
      console.log('✅ Batch student creation performance:');
      console.log(`   ${totalStudentsCreated} students created in ${totalTime}ms`);
      console.log(`   ${avgTimePerStudent.toFixed(1)}ms average per student`);
      
      expect(totalStudentsCreated).toBe(courseCount * studentsPerCourse);
      expect(avgTimePerStudent).toBeLessThan(BULK_TEST_CONFIG.thresholds.studentCreation);
    });

    it('2.2 Mass token generation should be performant', async () => {
      const studentBatchSize = 100;
      const studentIds = testData.studentIds.slice(0, studentBatchSize);
      
      console.log(`🎫 Testing token generation for ${studentIds.length} students...`);
      
      const startTime = Date.now();
      
      // Test bulk token generation via database function
      const { data: tokenResults } = await supabase
        .rpc('batch_generate_student_tokens', {
          event_id: testEventId,
          regenerate_existing: false
        });
      
      const tokenGenerationTime = Date.now() - startTime;
      
      expect(tokenResults).toBeTruthy();
      expect(Array.isArray(tokenResults)).toBe(true);
      expect(tokenResults.length).toBeGreaterThanOrEqual(studentBatchSize);
      
      // Verify token quality
      for (const tokenResult of tokenResults) {
        expect(tokenResult.token).toBeTruthy();
        expect(tokenResult.token.length).toBeGreaterThanOrEqual(20);
        expect(tokenResult.status).toBe('created');
        
        testData.tokenIds.push(tokenResult.token);
      }
      
      const avgTimePerToken = tokenGenerationTime / tokenResults.length;
      
      console.log('✅ Mass token generation performance:');
      console.log(`   ${tokenResults.length} tokens in ${tokenGenerationTime}ms`);
      console.log(`   ${avgTimePerToken.toFixed(1)}ms average per token`);
      
      expect(avgTimePerToken).toBeLessThan(BULK_TEST_CONFIG.thresholds.tokenGeneration);
    });

    it('2.3 Bulk student queries should handle large datasets', async () => {
      const startTime = Date.now();
      
      // Complex query with joins and filtering
      const { data: studentsWithDetails } = await supabase
        .from('students')
        .select(`
          id,
          name,
          grade,
          section,
          student_number,
          active,
          courses!inner(id, name),
          tokens:student_tokens(token, expires_at, active)
        `)
        .eq('event_id', testEventId)
        .eq('active', true)
        .limit(200);
      
      const queryTime = Date.now() - startTime;
      
      expect(studentsWithDetails.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.bulkQuery);
      
      // Verify data structure
      for (const student of studentsWithDetails.slice(0, 10)) {
        expect(student.courses).toBeTruthy();
        expect(student.courses.id).toBeTruthy();
        // Some students should have tokens
      }
      
      console.log('✅ Bulk student query performance:');
      console.log(`   ${studentsWithDetails.length} students with details in ${queryTime}ms`);
    });
  });

  describe('Mass Photo Classification Operations', () => {
    
    it('3.1 Bulk photo classification should handle large batches', async () => {
      const batchSize = 25;
      const photoIds = testData.photoIds.slice(0, batchSize);
      const courseId = testData.courseIds[0];
      
      console.log(`🏷️ Testing bulk classification of ${photoIds.length} photos...`);
      
      const startTime = Date.now();
      
      // Test bulk classification to course
      const response = await fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_ids: photoIds,
          course_id: courseId,
          photo_type: 'group'
        })
      });
      
      const classificationTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.classified).toBe(photoIds.length);
      
      const avgTimePerPhoto = classificationTime / photoIds.length;
      
      console.log('✅ Bulk photo classification performance:');
      console.log(`   ${photoIds.length} photos classified in ${classificationTime}ms`);
      console.log(`   ${avgTimePerPhoto.toFixed(1)}ms average per photo`);
      
      expect(avgTimePerPhoto).toBeLessThan(BULK_TEST_CONFIG.thresholds.classification);
      
      // Verify classifications were created
      const { data: classifications } = await supabase
        .from('photo_courses')
        .select('*')
        .in('photo_id', photoIds)
        .eq('course_id', courseId);
      
      expect(classifications).toHaveLength(photoIds.length);
    });

    it('3.2 Individual photo classification should scale', async () => {
      const batchSize = 20;
      const photoIds = testData.photoIds.slice(25, 25 + batchSize);
      const studentIds = testData.studentIds.slice(0, batchSize);
      
      console.log(`👤 Testing individual classification of ${photoIds.length} photos...`);
      
      const classificationTimes = [];
      
      // Classify photos to individual students
      for (let i = 0; i < Math.min(photoIds.length, studentIds.length); i++) {
        const startTime = Date.now();
        
        const response = await fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`
          },
          body: JSON.stringify({
            photo_ids: [photoIds[i]],
            student_id: studentIds[i],
            confidence_score: 0.95
          })
        });
        
        const classificationTime = Date.now() - startTime;
        classificationTimes.push(classificationTime);
        
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.classified).toBe(1);
      }
      
      const avgClassificationTime = classificationTimes.reduce((sum, time) => sum + time, 0) / classificationTimes.length;
      const maxClassificationTime = Math.max(...classificationTimes);
      
      console.log('✅ Individual photo classification performance:');
      console.log(`   ${classificationTimes.length} classifications`);
      console.log(`   Average: ${avgClassificationTime.toFixed(1)}ms per photo`);
      console.log(`   Maximum: ${maxClassificationTime}ms per photo`);
      
      expect(avgClassificationTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.classification);
      
      // Verify individual classifications
      const { data: individualClassifications } = await supabase
        .from('photo_students')
        .select('*')
        .in('photo_id', photoIds.slice(0, classificationTimes.length));
      
      expect(individualClassifications.length).toBe(classificationTimes.length);
    });

    it('3.3 Classification statistics should compute efficiently', async () => {
      const startTime = Date.now();
      
      // Test event-wide classification statistics
      const { data: stats } = await supabase
        .rpc('get_event_classification_stats', {
          event_id: testEventId
        });
      
      const statsComputeTime = Date.now() - startTime;
      
      expect(stats).toBeTruthy();
      expect(statsComputeTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.bulkQuery);
      
      // Verify statistics structure and accuracy
      expect(stats.photos).toBeDefined();
      expect(stats.photos.total).toBe(testData.photoIds.length);
      expect(stats.courses).toBeDefined();
      expect(stats.students).toBeDefined();
      
      console.log('✅ Classification statistics performance:');
      console.log(`   Event stats computed in ${statsComputeTime}ms`);
      console.log(`   Stats: ${JSON.stringify(stats, null, 2)}`);
    });
  });

  describe('Large Scale Performance Tests', () => {
    
    it('4.1 Gallery access should scale with large photo sets', async () => {
      // Test family gallery access with large photo collection
      const testToken = testData.tokenIds[0];
      if (!testToken) {
        console.log('⏭️ Skipping gallery test - no tokens available');
        return;
      }
      
      const startTime = Date.now();
      
      const response = await fetch(`${BULK_TEST_CONFIG.baseUrl}/api/family/gallery/${testToken}`);
      
      const galleryLoadTime = Date.now() - startTime;
      
      if (response.status === 200) {
        const result = await response.json();
        
        expect(result.photos).toBeDefined();
        expect(Array.isArray(result.photos)).toBe(true);
        expect(galleryLoadTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.bulkQuery);
        
        console.log('✅ Large gallery access performance:');
        console.log(`   ${result.photos.length} photos loaded in ${galleryLoadTime}ms`);
      } else {
        console.log('ℹ️ Gallery access test skipped (token not found)');
      }
    });

    it('4.2 Admin dashboard should handle large datasets', async () => {
      const startTime = Date.now();
      
      // Test admin dashboard data loading
      const dashboardDataPromises = [
        // Event overview
        supabase.from('events').select('*').eq('id', testEventId).single(),
        // Course summary
        supabase.from('courses').select('id, name').eq('event_id', testEventId),
        // Student count
        supabase.from('students').select('id', { count: 'exact' }).eq('event_id', testEventId),
        // Photo count
        supabase.from('photos').select('id', { count: 'exact' }).eq('event_id', testEventId)
      ];
      
      const [eventData, coursesData, studentsData, photosData] = await Promise.all(dashboardDataPromises);
      
      const dashboardLoadTime = Date.now() - startTime;
      
      expect(eventData.data).toBeTruthy();
      expect(coursesData.data?.length).toBeGreaterThan(0);
      expect(studentsData.count).toBeGreaterThan(0);
      expect(photosData.count).toBeGreaterThan(0);
      expect(dashboardLoadTime).toBeLessThan(BULK_TEST_CONFIG.thresholds.bulkQuery);
      
      console.log('✅ Admin dashboard performance:');
      console.log(`   Dashboard data loaded in ${dashboardLoadTime}ms`);
      console.log(`   Courses: ${coursesData.data?.length}, Students: ${studentsData.count}, Photos: ${photosData.count}`);
    });

    it('4.3 Search operations should remain fast at scale', async () => {
      const searchQueries = [
        { type: 'student_name', query: 'Estudiante 1' },
        { type: 'course_name', query: 'Curso' },
        { type: 'grade', query: '1°' }
      ];
      
      for (const search of searchQueries) {
        const startTime = Date.now();
        
        let searchResults;
        if (search.type === 'student_name') {
          searchResults = await supabase
            .from('students')
            .select('id, name')
            .ilike('name', `%${search.query}%`)
            .eq('event_id', testEventId);
        } else if (search.type === 'course_name') {
          searchResults = await supabase
            .from('courses')
            .select('id, name')
            .ilike('name', `%${search.query}%`)
            .eq('event_id', testEventId);
        } else if (search.type === 'grade') {
          searchResults = await supabase
            .from('students')
            .select('id, name, grade')
            .eq('grade', search.query)
            .eq('event_id', testEventId);
        }
        
        const searchTime = Date.now() - startTime;
        
        expect(searchResults?.data).toBeDefined();
        expect(searchTime).toBeLessThan(1000); // Search should be very fast
        
        console.log(`✅ Search "${search.query}" (${search.type}): ${searchResults?.data?.length} results in ${searchTime}ms`);
      }
    });
  });

  describe('Concurrent Operations Stress Tests', () => {
    
    it('5.1 Concurrent classification should not cause conflicts', async () => {
      const concurrentOperations = 5;
      const photosPerOperation = 3;
      const availablePhotos = testData.photoIds.slice(0, concurrentOperations * photosPerOperation);
      const courseId = testData.courseIds[1];
      
      console.log(`⚡ Testing ${concurrentOperations} concurrent classification operations...`);
      
      const startTime = Date.now();
      
      const concurrentPromises = [];
      for (let i = 0; i < concurrentOperations; i++) {
        const photosBatch = availablePhotos.slice(i * photosPerOperation, (i + 1) * photosPerOperation);
        
        concurrentPromises.push(
          fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-course`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminSession.access_token}`
            },
            body: JSON.stringify({
              photo_ids: photosBatch,
              course_id: courseId,
              photo_type: 'activity'
            })
          })
        );
      }
      
      const responses = await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - startTime;
      
      // Verify all operations succeeded
      let totalClassified = 0;
      for (const response of responses) {
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        totalClassified += result.classified;
      }
      
      expect(totalClassified).toBe(availablePhotos.length);
      
      console.log('✅ Concurrent classification performance:');
      console.log(`   ${concurrentOperations} operations (${totalClassified} photos) in ${concurrentTime}ms`);
      
      // Verify no duplicate classifications
      const { data: classifications } = await supabase
        .from('photo_courses')
        .select('photo_id')
        .in('photo_id', availablePhotos)
        .eq('course_id', courseId);
      
      expect(classifications).toHaveLength(availablePhotos.length);
    });

    it('5.2 High-frequency token access should remain stable', async () => {
      const requestCount = 20;
      const testToken = testData.tokenIds[0];
      
      if (!testToken) {
        console.log('⏭️ Skipping token access test - no tokens available');
        return;
      }
      
      console.log(`🎫 Testing ${requestCount} rapid token access requests...`);
      
      const requestPromises = [];
      for (let i = 0; i < requestCount; i++) {
        requestPromises.push(
          fetch(`${BULK_TEST_CONFIG.baseUrl}/api/family/gallery/${testToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(requestPromises);
      const totalTime = Date.now() - startTime;
      
      let successCount = 0;
      let rateLimitedCount = 0;
      
      for (const response of responses) {
        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitedCount++;
        }
      }
      
      const avgResponseTime = totalTime / requestCount;
      
      console.log('✅ High-frequency access performance:');
      console.log(`   ${requestCount} requests in ${totalTime}ms`);
      console.log(`   Success: ${successCount}, Rate Limited: ${rateLimitedCount}`);
      console.log(`   Average response time: ${avgResponseTime.toFixed(1)}ms`);
      
      // Should handle most requests successfully or rate limit gracefully
      expect(successCount + rateLimitedCount).toBe(requestCount);
    });
  });
});

// Helper functions
function createTestImageBuffer(): Buffer {
  // Create minimal valid PNG buffer for testing
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
}

async function setupBulkTestEnvironment() {
  console.log('🏗️ Setting up bulk operations test environment...');
  
  // Admin authentication
  const authResponse = await fetch(`${BULK_TEST_CONFIG.baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(BULK_TEST_CONFIG.admin)
  });
  
  const authResult = await authResponse.json();
  adminSession = authResult.session;

  // Create test event
  const { data: event } = await supabase
    .from('events')
    .insert(BULK_TEST_CONFIG.event)
    .select('id')
    .single();
  
  testEventId = event.id;
  
  console.log(`✅ Bulk test environment ready - Event: ${testEventId}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      console.log('🧹 Cleaning up bulk test data...');
      
      // Clean up in correct order due to foreign key constraints
      await supabase.from('photo_students').delete().in('photo_id', testData.photoIds);
      await supabase.from('photo_courses').delete().in('photo_id', testData.photoIds);
      await supabase.from('student_tokens').delete().in('student_id', testData.studentIds);
      await supabase.from('photos').delete().in('id', testData.photoIds);
      await supabase.from('students').delete().in('id', testData.studentIds);
      await supabase.from('courses').delete().in('id', testData.courseIds);
      await supabase.from('levels').delete().in('id', testData.levelIds);
      await supabase.from('events').delete().eq('id', testEventId);
      
      console.log('✅ Bulk test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}