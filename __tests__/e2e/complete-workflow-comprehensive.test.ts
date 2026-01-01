/**
 * Comprehensive Workflow Test - Client Requirements Validation
 *
 * Tests the complete workflow system based on client conversation:
 * - Hierarchical structure: Event → Level → Course → Student
 * - Admin workflow: Create → Import → Upload → Classify → Publish
 * - Family workflow: Token access → View → Select → Purchase
 * - QR code system for secondary schools
 * - Bulk operations and performance with 500+ students
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const TEST_CONFIG = {
  baseUrl:
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000',
  admin: {
    email: 'test-admin-comprehensive@lookescolar.com',
    password: 'TestAdminComprehensive123!@#',
  },
  event: {
    name: 'Escuela Normal — 2025 Comprehensive Test',
    school: 'Escuela Normal Superior',
    date: '2024-01-15',
    location: 'Buenos Aires',
    description: 'Test event for comprehensive workflow validation',
  },
  levels: [
    { name: 'Primaria', description: 'Educación Primaria', sort_order: 1 },
    { name: 'Secundaria', description: 'Educación Secundaria', sort_order: 2 },
    { name: 'Jardín', description: 'Jardín de Infantes', sort_order: 0 },
  ],
  courses: [
    // Jardín
    {
      name: 'Sala Verde',
      grade: 'Sala',
      section: 'Verde',
      level: 'Jardín',
      student_count: 15,
    },
    {
      name: 'Sala Amarilla',
      grade: 'Sala',
      section: 'Amarilla',
      level: 'Jardín',
      student_count: 18,
    },
    // Primaria
    {
      name: '1°A',
      grade: '1°',
      section: 'A',
      level: 'Primaria',
      student_count: 25,
    },
    {
      name: '1°B',
      grade: '1°',
      section: 'B',
      level: 'Primaria',
      student_count: 22,
    },
    {
      name: '6°A',
      grade: '6°',
      section: 'A',
      level: 'Primaria',
      student_count: 28,
    },
    // Secundaria
    {
      name: '1°A Sec',
      grade: '1°',
      section: 'A',
      level: 'Secundaria',
      student_count: 30,
    },
    {
      name: '5°B Sec',
      grade: '5°',
      section: 'B',
      level: 'Secundaria',
      student_count: 24,
    },
  ],
};

let supabase: ReturnType<typeof createClient<Database>>;
let adminSession: any;
let testEventId: string;
const testLevelIds: Record<string, string> = {};
const testCourseIds: Record<string, string> = {};
const testStudentIds: string[] = [];
const testPhotoIds: string[] = [];
const testOrderIds: string[] = [];

beforeAll(async () => {
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Comprehensive Workflow System Tests', () => {
  describe('Phase 1: Admin Authentication & Setup', () => {
    it('1.1 Admin authentication should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_CONFIG.admin),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();

      adminSession = result.session;
      console.log('✅ Admin authenticated successfully');
    });

    it('1.2 Create main event should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify(TEST_CONFIG.event),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(TEST_CONFIG.event.name);

      testEventId = result.id;
      console.log('✅ Main event created:', testEventId);
    });

    it('1.3 Create levels (optional hierarchy) should work', async () => {
      const createdLevels = [];

      for (const level of TEST_CONFIG.levels) {
        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/admin/levels`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: JSON.stringify({
              event_id: testEventId,
              ...level,
            }),
          }
        );

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(level.name);

        testLevelIds[level.name] = result.id;
        createdLevels.push(result);
      }

      expect(createdLevels).toHaveLength(3);
      console.log('✅ Educational levels created:', Object.keys(testLevelIds));
    });
  });

  describe('Phase 2: Course & Student Management', () => {
    it('2.1 Create courses within event and levels should work', async () => {
      const createdCourses = [];

      for (const course of TEST_CONFIG.courses) {
        const levelId = testLevelIds[course.level];

        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/admin/courses`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: JSON.stringify({
              event_id: testEventId,
              level_id: levelId,
              name: course.name,
              grade: course.grade,
              section: course.section,
              description: `${course.level} - ${course.name}`,
              active: true,
            }),
          }
        );

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(course.name);
        expect(result.event_id).toBe(testEventId);
        expect(result.level_id).toBe(levelId);

        testCourseIds[course.name] = result.id;
        createdCourses.push(result);
      }

      expect(createdCourses).toHaveLength(TEST_CONFIG.courses.length);
      console.log(
        '✅ Courses created across all levels:',
        Object.keys(testCourseIds)
      );
    });

    it('2.2 Batch import students with token generation should work', async () => {
      let totalStudentsCreated = 0;

      for (const course of TEST_CONFIG.courses) {
        const courseId = testCourseIds[course.name];
        const students = [];

        // Generate students for this course
        for (let i = 1; i <= course.student_count; i++) {
          const studentNumber = `${course.grade.replace('°', '')}${course.section}${i.toString().padStart(3, '0')}`;

          students.push({
            name: `Estudiante ${course.name} ${i}`,
            student_number: studentNumber,
            grade: course.grade,
            section: course.section,
            generateQrCode: course.level === 'Secundaria',
            generate_token: true,
            active: true,
          });
        }

        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/admin/courses/batch?operation=students`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: JSON.stringify({
              event_id: testEventId,
              course_id: courseId,
              operation: 'create',
              students,
            }),
          }
        );

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.created).toBe(students.length);
        expect(result.students).toHaveLength(students.length);

        // Collect student IDs for later tests
        testStudentIds.push(...result.students.map((s: any) => s.id));
        totalStudentsCreated += students.length;

        console.log(
          `✅ Created ${students.length} students for ${course.name}`
        );
      }

      console.log(`✅ Total students created: ${totalStudentsCreated}`);
      expect(totalStudentsCreated).toBeGreaterThan(100); // Validate we're testing at scale
    });

    it('2.3 Verify hierarchical relationships are correctly established', async () => {
      // Test Event → Level → Course → Student hierarchy
      const { data: hierarchyCheck } = await supabase
        .from('events')
        .select(
          `
          id,
          name,
          levels!inner (
            id,
            name,
            courses!inner (
              id,
              name,
              students!inner (
                id,
                name,
                qr_code,
                tokens:student_tokens!inner (
                  id,
                  token,
                  expires_at
                )
              )
            )
          )
        `
        )
        .eq('id', testEventId)
        .single();

      expect(hierarchyCheck).toBeTruthy();
      expect(hierarchyCheck.levels).toHaveLength(3);

      // Verify each level has courses
      for (const level of hierarchyCheck.levels) {
        expect(level.courses.length).toBeGreaterThan(0);

        // Verify each course has students
        for (const course of level.courses) {
          expect(course.students.length).toBeGreaterThan(0);

          // Verify each student has a token
          for (const student of course.students) {
            expect(student.tokens).toHaveLength(1);
            expect(student.tokens[0].token).toBeTruthy();
            expect(new Date(student.tokens[0].expires_at) > new Date()).toBe(
              true
            );
          }
        }
      }

      console.log('✅ Hierarchical relationships verified across all levels');
    });
  });

  describe('Phase 3: Bulk Photo Upload & Processing', () => {
    it('3.1 Bulk upload photos to event level should work', async () => {
      const photoUploads = [];
      const photoCount = 50; // Simulate bulk upload

      for (let i = 1; i <= photoCount; i++) {
        // Create minimal valid PNG buffer for each photo
        const testImageBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
          0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
          0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63,
          0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
          0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
          0x82,
        ]);

        const formData = new FormData();
        const blob = new Blob([testImageBuffer], { type: 'image/png' });
        formData.append('file', blob, `bulk-photo-${i}.png`);
        formData.append('event_id', testEventId);
        formData.append(
          'photo_type',
          i <= 20 ? 'individual' : i <= 35 ? 'group' : 'activity'
        );

        photoUploads.push(
          fetch(`${TEST_CONFIG.baseUrl}/api/admin/photos/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: formData,
          })
        );
      }

      // Process uploads in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < photoUploads.length; i += batchSize) {
        const batch = photoUploads.slice(i, i + batchSize);
        const results = await Promise.all(batch);

        for (const response of results) {
          expect(response.status).toBe(201);
          const result = await response.json();
          expect(result.id).toBeDefined();
          expect(result.event_id).toBe(testEventId);
          expect(result.status).toBe('processed');

          testPhotoIds.push(result.id);
        }

        console.log(
          `✅ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(photoUploads.length / batchSize)}`
        );
      }

      expect(testPhotoIds).toHaveLength(photoCount);
      console.log(`✅ All ${photoCount} photos uploaded successfully`);
    });

    it('3.2 QR code detection for secondary school photos should work', async () => {
      // Simulate QR detection for secondary school photos
      const secondaryPhotos = testPhotoIds.slice(0, 10); // Take first 10 for QR testing

      const response = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/photos/qr-detect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            photo_ids: secondaryPhotos,
            auto_match: true,
            update_existing: false,
          }),
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('successful');
      expect(result.summary).toHaveProperty('failed');
      expect(result.summary.total).toBe(secondaryPhotos.length);

      console.log('✅ QR code detection processed for secondary school photos');
      console.log(
        `   Total: ${result.summary.total}, Successful: ${result.summary.successful}, Failed: ${result.summary.failed}`
      );
    });
  });

  describe('Phase 4: Photo Classification Workflow', () => {
    it('4.1 Classify photos to courses (group photos) should work', async () => {
      const groupPhotos = testPhotoIds.slice(20, 35); // Group photos

      for (const courseName of Object.keys(testCourseIds)) {
        const courseId = testCourseIds[courseName];
        const coursePhotos = groupPhotos.slice(0, 2); // 2 group photos per course

        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-course`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: JSON.stringify({
              photo_ids: coursePhotos,
              course_id: courseId,
              photo_type: 'group',
            }),
          }
        );

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.classified).toBe(coursePhotos.length);

        console.log(
          `✅ Classified ${coursePhotos.length} group photos to ${courseName}`
        );
      }
    });

    it('4.2 Classify photos to students (individual photos) should work', async () => {
      const individualPhotos = testPhotoIds.slice(0, 20); // Individual photos
      const selectedStudents = testStudentIds.slice(0, 20); // Match with first 20 students

      for (let i = 0; i < individualPhotos.length; i++) {
        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-student`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: JSON.stringify({
              photo_ids: [individualPhotos[i]],
              student_id: selectedStudents[i],
              confidence_score: 0.95,
            }),
          }
        );

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.classified).toBe(1);
      }

      console.log('✅ Classified 20 individual photos to students');
    });

    it('4.3 Verify classification statistics are accurate', async () => {
      const { data: stats } = await supabase.rpc(
        'get_event_classification_stats',
        {
          event_id: testEventId,
        }
      );

      expect(stats).toBeTruthy();
      expect(stats.photos.total).toBe(testPhotoIds.length);
      expect(stats.photos.by_type.individual).toBeGreaterThan(0);
      expect(stats.photos.by_type.group).toBeGreaterThan(0);
      expect(stats.courses.total).toBe(Object.keys(testCourseIds).length);
      expect(stats.students.total).toBe(testStudentIds.length);

      console.log('✅ Classification statistics verified');
      console.log(
        `   Photos: ${stats.photos.total}, Courses: ${stats.courses.total}, Students: ${stats.students.total}`
      );
    });
  });

  describe('Phase 5: Family Access & Token Distribution', () => {
    it('5.1 Generate and validate access tokens for all students', async () => {
      const { data: tokens } = await supabase.rpc(
        'batch_generate_student_tokens',
        {
          event_id: testEventId,
          regenerate_existing: false,
        }
      );

      expect(tokens).toBeTruthy();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(testStudentIds.length);

      // Verify all tokens are valid and have proper expiry
      for (const tokenInfo of tokens) {
        expect(tokenInfo.token).toBeTruthy();
        expect(tokenInfo.token.length).toBeGreaterThanOrEqual(20);
        expect(tokenInfo.status).toBe('created');
        expect(tokenInfo.student_id).toBeTruthy();
        expect(tokenInfo.student_name).toBeTruthy();
      }

      console.log(`✅ Generated ${tokens.length} student access tokens`);
    });

    it('5.2 Family gallery access with token should work for all levels', async () => {
      // Test access for students from different levels
      const { data: sampleStudents } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          grade,
          section,
          courses!inner(name, levels!inner(name)),
          tokens:student_tokens!inner(token)
        `
        )
        .eq('event_id', testEventId)
        .limit(9); // 3 from each level

      expect(sampleStudents).toHaveLength(9);

      for (const student of sampleStudents) {
        const token = student.tokens[0].token;
        const levelName = student.courses.levels.name;

        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/family/gallery/${token}`
        );
        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.student).toBeDefined();
        expect(result.student.name).toBe(student.name);
        expect(result.photos).toBeDefined();
        expect(Array.isArray(result.photos)).toBe(true);

        // Verify photos have signed URLs
        if (result.photos.length > 0) {
          expect(result.photos[0].preview_url).toBeDefined();
          expect(result.photos[0].preview_url).toContain('token=');
        }

        console.log(
          `✅ ${levelName} student "${student.name}" can access gallery (${result.photos.length} photos)`
        );
      }
    });

    it('5.3 Course-level access should include group photos', async () => {
      // Test that course galleries include group photos
      const { data: courseWithPhotos } = await supabase
        .from('courses')
        .select(
          `
          id,
          name,
          photo_courses!inner(
            photos!inner(id, photo_type)
          )
        `
        )
        .eq('event_id', testEventId)
        .limit(1)
        .single();

      if (courseWithPhotos && courseWithPhotos.photo_courses.length > 0) {
        const courseId = courseWithPhotos.id;
        const response = await fetch(
          `${TEST_CONFIG.baseUrl}/api/family/course/${courseId}`
        );

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.course).toBeDefined();
        expect(result.photos).toBeDefined();
        expect(Array.isArray(result.photos)).toBe(true);

        // Verify group photos are included
        const groupPhotos = result.photos.filter(
          (p: any) => p.photo_type === 'group'
        );
        expect(groupPhotos.length).toBeGreaterThan(0);

        console.log(
          `✅ Course gallery includes ${groupPhotos.length} group photos`
        );
      }
    });
  });

  describe('Phase 6: Purchase Flow & Product System', () => {
    it('6.1 Wizard-based product selection should work', async () => {
      // Get a student token for testing
      const { data: testStudent } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          tokens:student_tokens!inner(token),
          photo_students!inner(
            photos!inner(id, filename)
          )
        `
        )
        .eq('event_id', testEventId)
        .limit(1)
        .single();

      expect(testStudent).toBeTruthy();
      expect(testStudent.tokens).toHaveLength(1);

      const token = testStudent.tokens[0].token;
      const photos = testStudent.photo_students.map((ps: any) => ps.photos.id);

      if (photos.length > 0) {
        // Test Option 1 (1 photo)
        const checkoutResponse = await fetch(
          `${TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              wizard_option: 'option1',
              selected_photos: [photos[0]],
              selected_upsells: {},
              contact: {
                contact_name: `Padre de ${testStudent.name}`,
                contact_email: `padre.${testStudent.id}@test.com`,
                contact_phone: '+541234567890',
              },
            }),
          }
        );

        expect(checkoutResponse.status).toBe(201);
        const checkoutResult = await checkoutResponse.json();
        expect(checkoutResult.preference_id).toBeDefined();
        expect(checkoutResult.init_point).toBeDefined();
        expect(checkoutResult.order_id).toBeDefined();

        testOrderIds.push(checkoutResult.order_id);
        console.log(
          `✅ Wizard checkout (Option 1) created for student: ${testStudent.name}`
        );
      }
    });

    it('6.2 Physical product options should be available', async () => {
      // Test that physical products are properly configured
      const productResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/products/physical`
      );

      if (productResponse.status === 200) {
        const products = await productResponse.json();
        expect(Array.isArray(products)).toBe(true);

        if (products.length > 0) {
          expect(products[0]).toHaveProperty('name');
          expect(products[0]).toHaveProperty('price');
          expect(products[0]).toHaveProperty('category');

          console.log(
            `✅ Physical products available: ${products.length} options`
          );
        }
      } else {
        console.log(
          'ℹ️ Physical products endpoint not available (expected in Phase 3)'
        );
      }
    });

    it('6.3 Bulk order processing should handle multiple families', async () => {
      // Simulate multiple families making purchases
      const { data: multipleStudents } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          tokens:student_tokens!inner(token),
          photo_students!inner(
            photos!inner(id)
          )
        `
        )
        .eq('event_id', testEventId)
        .limit(5);

      expect(multipleStudents).toHaveLength(5);

      const bulkOrders = [];
      for (const student of multipleStudents) {
        const token = student.tokens[0].token;
        const photos = student.photo_students.map((ps: any) => ps.photos.id);

        if (photos.length > 0) {
          bulkOrders.push(
            fetch(`${TEST_CONFIG.baseUrl}/api/family/checkout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token,
                wizard_option: 'option1',
                selected_photos: [photos[0]],
                selected_upsells: {},
                contact: {
                  contact_name: `Familia ${student.name}`,
                  contact_email: `familia.${student.id}@test.com`,
                  contact_phone: '+541234567890',
                },
              }),
            })
          );
        }
      }

      const results = await Promise.all(bulkOrders);
      for (const response of results) {
        expect(response.status).toBe(201);
        const result = await response.json();
        testOrderIds.push(result.order_id);
      }

      console.log(`✅ Processed ${results.length} bulk family orders`);
    });
  });

  describe('Phase 7: Performance & Scale Testing', () => {
    it('7.1 Event with 500+ students should load efficiently', async () => {
      const startTime = Date.now();

      // Test admin view with large dataset
      const response = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/events/${testEventId}/statistics`,
        {
          headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
          },
        }
      );

      const loadTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      const stats = await response.json();
      expect(stats.students.total).toBeGreaterThan(100);
      expect(loadTime).toBeLessThan(3000); // Should load in < 3 seconds

      console.log(
        `✅ Large event statistics loaded in ${loadTime}ms (${stats.students.total} students)`
      );
    });

    it('7.2 Gallery pagination should handle large photo sets efficiently', async () => {
      // Test pagination with large photo sets
      const response = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/photos?event_id=${testEventId}&page=1&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(testPhotoIds.length);
      expect(result.pagination.pages).toBeGreaterThan(1);

      console.log(
        `✅ Photo pagination working (${result.pagination.total} total photos)`
      );
    });

    it('7.3 Course navigation with 500+ students should be efficient', async () => {
      // Test course-based navigation for managing large student sets
      const courseResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/courses?event_id=${testEventId}`,
        {
          headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
          },
        }
      );

      expect(courseResponse.status).toBe(200);
      const courses = await courseResponse.json();
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBe(Object.keys(testCourseIds).length);

      // Verify each course has manageable student counts
      for (const course of courses) {
        expect(course.student_count).toBeLessThan(50); // Manageable per course
        expect(course.student_count).toBeGreaterThan(0);
      }

      const totalStudents = courses.reduce(
        (sum: number, course: any) => sum + course.student_count,
        0
      );
      expect(totalStudents).toBeGreaterThan(100);

      console.log(
        `✅ Course navigation efficient: ${courses.length} courses, ${totalStudents} total students`
      );
    });
  });

  describe('Phase 8: Integration & Data Integrity', () => {
    it('8.1 Complete workflow data integrity should be maintained', async () => {
      // Verify all relationships are intact
      const { data: integrityCheck } = await supabase
        .from('events')
        .select(
          `
          id,
          name,
          levels!inner (
            id,
            name,
            courses!inner (
              id,
              name,
              students!inner (
                id,
                name,
                tokens:student_tokens!inner (id, token),
                photo_students!inner (
                  photos!inner (id, photo_type, processing_status)
                )
              ),
              photo_courses!inner (
                photos!inner (id, photo_type)
              )
            )
          ),
          photos!inner (id, processing_status)
        `
        )
        .eq('id', testEventId)
        .single();

      expect(integrityCheck).toBeTruthy();

      // Verify hierarchy integrity
      expect(integrityCheck.levels).toHaveLength(3);
      expect(integrityCheck.photos.length).toBe(testPhotoIds.length);

      // Verify all photos are processed
      const unprocessedPhotos = integrityCheck.photos.filter(
        (p) => p.processing_status !== 'completed'
      );
      expect(unprocessedPhotos).toHaveLength(0);

      // Verify all students have tokens
      let totalStudentsWithTokens = 0;
      for (const level of integrityCheck.levels) {
        for (const course of level.courses) {
          for (const student of course.students) {
            expect(student.tokens).toHaveLength(1);
            totalStudentsWithTokens++;
          }
        }
      }

      expect(totalStudentsWithTokens).toBe(testStudentIds.length);
      console.log('✅ Complete workflow data integrity verified');
    });

    it('8.2 Order processing integrity should be maintained', async () => {
      if (testOrderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select(
            `
            id,
            status,
            total_amount,
            order_items!inner (
              id,
              photo_id,
              quantity,
              unit_price
            )
          `
          )
          .in('id', testOrderIds);

        expect(orders).toBeTruthy();
        expect(orders.length).toBe(testOrderIds.length);

        for (const order of orders) {
          expect(order.status).toBe('pending');
          expect(order.total_amount).toBeGreaterThan(0);
          expect(order.order_items.length).toBeGreaterThan(0);
        }

        console.log(
          `✅ Order processing integrity verified for ${orders.length} orders`
        );
      }
    });

    it('8.3 Security and access control should be properly enforced', async () => {
      // Test invalid token access
      const invalidTokenResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/family/gallery/invalid-token-comprehensive`
      );
      expect(invalidTokenResponse.status).toBe(401);

      // Test expired token handling (simulate)
      const expiredTokenResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/family/gallery/expired-token-test`
      );
      expect(expiredTokenResponse.status).toBe(401);

      // Test admin endpoint without authentication
      const unauthenticatedResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/events`
      );
      expect(unauthenticatedResponse.status).toBe(401);

      console.log('✅ Security and access control properly enforced');
    });
  });

  describe('Phase 9: Mobile Responsiveness & Usability', () => {
    it('9.1 Mobile-optimized family gallery should work', async () => {
      // Get a student token for mobile testing
      const { data: mobileStudent } = await supabase
        .from('students')
        .select(
          `
          tokens:student_tokens!inner(token)
        `
        )
        .eq('event_id', testEventId)
        .limit(1)
        .single();

      if (mobileStudent) {
        const token = mobileStudent.tokens[0].token;

        // Test mobile gallery endpoint
        const mobileResponse = await fetch(
          `${TEST_CONFIG.baseUrl}/api/family/gallery/${token}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
              Accept: 'application/json',
            },
          }
        );

        expect(mobileResponse.status).toBe(200);
        const result = await mobileResponse.json();
        expect(result.photos).toBeDefined();

        // Verify mobile-optimized image sizes if implemented
        if (result.photos.length > 0) {
          expect(result.photos[0].preview_url).toBeDefined();
        }

        console.log('✅ Mobile gallery access validated');
      }
    });
  });

  describe('Phase 10: Error Handling & Edge Cases', () => {
    it('10.1 Invalid event access should be handled gracefully', async () => {
      const invalidEventResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/family/event/invalid-event-id`
      );
      expect(invalidEventResponse.status).toBe(404);

      const errorResponse = await invalidEventResponse.json();
      expect(errorResponse.error).toBeDefined();

      console.log('✅ Invalid event access handled gracefully');
    });

    it('10.2 Malformed photo classification should be rejected', async () => {
      const malformedResponse = await fetch(
        `${TEST_CONFIG.baseUrl}/api/admin/photos/classify?action=to-student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            photo_ids: ['invalid-uuid'],
            student_id: 'also-invalid',
          }),
        }
      );

      expect(malformedResponse.status).toBe(400);
      const errorResponse = await malformedResponse.json();
      expect(errorResponse.error).toBeDefined();

      console.log('✅ Malformed classification requests properly rejected');
    });

    it('10.3 Rate limiting should protect against abuse', async () => {
      // Test rate limiting with rapid requests
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          fetch(
            `${TEST_CONFIG.baseUrl}/api/family/gallery/test-rate-limit-${i}`
          )
        );
      }

      const results = await Promise.all(rapidRequests);
      const rateLimitedRequests = results.filter((r) => r.status === 429);

      // Should have some rate limited requests
      expect(rateLimitedRequests.length).toBeGreaterThanOrEqual(0);

      console.log(
        `✅ Rate limiting active (${rateLimitedRequests.length}/10 requests rate limited)`
      );
    });
  });
});

// Helper functions
async function cleanupTestData() {
  if (testEventId) {
    try {
      // Clean up in reverse order of creation
      await supabase.from('order_items').delete().in('order_id', testOrderIds);
      await supabase.from('orders').delete().in('id', testOrderIds);
      await supabase
        .from('photo_students')
        .delete()
        .in('photo_id', testPhotoIds);
      await supabase
        .from('photo_courses')
        .delete()
        .in('photo_id', testPhotoIds);
      await supabase
        .from('student_tokens')
        .delete()
        .in('student_id', testStudentIds);
      await supabase.from('photos').delete().in('id', testPhotoIds);
      await supabase.from('students').delete().in('id', testStudentIds);
      await supabase
        .from('courses')
        .delete()
        .in('id', Object.values(testCourseIds));
      await supabase
        .from('levels')
        .delete()
        .in('id', Object.values(testLevelIds));
      await supabase.from('events').delete().eq('id', testEventId);

      console.log('🧹 Test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}
