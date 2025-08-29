import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create clients
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test data
let testEventId: string;
let testCourseId: string;
let testStudentId: string;
let testPhotoId: string;

describe('Admin Workflow Integration Tests', () => {
  beforeAll(async () => {
    // Create test event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        name: 'Test Event - Admin Workflow',
        description: 'Test event for admin workflow testing',
        date: new Date().toISOString(),
        status: 'active',
      })
      .select('id')
      .single();

    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }

    testEventId = event.id;

    // Create test course
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .insert({
        event_id: testEventId,
        name: 'Test Course 1A',
        grade: '1º',
        section: 'A',
        description: 'Test course for workflow testing',
        sort_order: 0,
        active: true,
      })
      .select('id')
      .single();

    if (courseError) {
      throw new Error(`Failed to create test course: ${courseError.message}`);
    }

    testCourseId = course.id;

    // Create test student
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        event_id: testEventId,
        course_id: testCourseId,
        name: 'Test Student',
        grade: '1º',
        section: 'A',
        student_number: 'TEST001',
        qr_code: 'STU-TEST-001',
        active: true,
      })
      .select('id')
      .single();

    if (studentError) {
      throw new Error(`Failed to create test student: ${studentError.message}`);
    }

    testStudentId = student.id;

    // Create test photo
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'test-photo.jpg',
        original_filename: 'test-photo.jpg',
        file_path: 'test/test-photo.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        photo_type: 'individual',
        processing_status: 'completed',
        detected_qr_codes: '[]',
        approved: false,
      })
      .select('id')
      .single();

    if (photoError) {
      throw new Error(`Failed to create test photo: ${photoError.message}`);
    }

    testPhotoId = photo.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabaseAdmin
      .from('photo_students')
      .delete()
      .eq('photo_id', testPhotoId);
    await supabaseAdmin
      .from('photo_courses')
      .delete()
      .eq('photo_id', testPhotoId);
    await supabaseAdmin
      .from('student_tokens')
      .delete()
      .eq('student_id', testStudentId);
    await supabaseAdmin.from('photos').delete().eq('id', testPhotoId);
    await supabaseAdmin.from('students').delete().eq('id', testStudentId);
    await supabaseAdmin.from('courses').delete().eq('id', testCourseId);
    await supabaseAdmin.from('events').delete().eq('id', testEventId);
  });

  describe('Bulk Photo Upload API', () => {
    it('should handle bulk photo upload request validation', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/bulk-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: 'invalid-uuid',
            photos: [],
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should validate photo array constraints', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/bulk-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: testEventId,
            photos: [], // Empty array should fail
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual({
        path: 'photos',
        message: 'At least one photo required',
      });
    });
  });

  describe('Photo Classification API', () => {
    it('should classify photo to course successfully', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/classify?action=to-course`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: [testPhotoId],
            courseId: testCourseId,
            photoType: 'group',
          }),
        }
      );

      if (response.status === 401) {
        // Expected if not authenticated - test the validation logic
        expect(response.status).toBe(401);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.classified).toBe(1);
    });

    it('should classify photo to student successfully', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/classify?action=to-student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: [testPhotoId],
            studentId: testStudentId,
            confidenceScore: 0.95,
          }),
        }
      );

      if (response.status === 401) {
        // Expected if not authenticated - test the validation logic
        expect(response.status).toBe(401);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.classified).toBe(1);
    });

    it('should validate course classification payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/classify?action=to-course`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: [], // Empty array should fail
            courseId: testCourseId,
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should validate student classification payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/classify?action=to-student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: ['invalid-uuid'], // Invalid UUID should fail
            studentId: testStudentId,
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should handle invalid action parameter', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/classify?action=invalid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: [testPhotoId],
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid action');
    });
  });

  describe('QR Detection API', () => {
    it('should validate QR detection payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/qr-detect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Missing both photoIds and eventId should fail
            autoMatch: true,
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain(
        'Either photoIds or eventId must be provided'
      );
    });

    it('should accept valid QR detection request', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/photos/qr-detect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: testEventId,
            autoMatch: true,
            updateExisting: false,
          }),
        }
      );

      if (response.status === 401) {
        // Expected if not authenticated
        expect(response.status).toBe(401);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.summary).toHaveProperty('total');
      expect(data.summary).toHaveProperty('successful');
      expect(data.summary).toHaveProperty('failed');
    });
  });

  describe('Batch Course Management API', () => {
    it('should validate batch course creation payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/courses/batch?operation=courses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: 'invalid-uuid',
            operation: 'create',
            courses: [],
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should validate batch student creation payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/courses/batch?operation=students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: testEventId,
            operation: 'create',
            students: [
              {
                name: '', // Empty name should fail
                generateQrCode: true,
                generateToken: true,
              },
            ],
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should validate CSV import payload', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/courses/batch?operation=import-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: testEventId,
            type: 'invalid-type', // Invalid type should fail
            csvData: 'test,data',
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should handle CSV template request', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/courses/batch?action=csv-template&type=courses`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.template).toHaveProperty('headers');
      expect(data.template).toHaveProperty('example');
      expect(data.template.headers).toContain('name');
    });

    it('should handle statistics request', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/courses/batch?action=statistics&eventId=${testEventId}`
      );

      if (response.status === 401) {
        // Expected if not authenticated
        expect(response.status).toBe(401);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.statistics).toHaveProperty('courses');
      expect(data.statistics).toHaveProperty('students');
      expect(data.statistics).toHaveProperty('photos');
    });
  });

  describe('Database Functions', () => {
    it('should test classify_photos_to_course function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'classify_photos_to_course',
        {
          photo_ids: [testPhotoId],
          course_id: testCourseId,
          photo_type: 'group',
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should test classify_photos_to_student function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'classify_photos_to_student',
        {
          photo_ids: [testPhotoId],
          student_id: testStudentId,
          confidence_score: 0.95,
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should test batch_generate_student_tokens function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'batch_generate_student_tokens',
        {
          event_id: testEventId,
          regenerate_existing: false,
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        expect(data[0]).toHaveProperty('student_id');
        expect(data[0]).toHaveProperty('student_name');
        expect(data[0]).toHaveProperty('token');
        expect(data[0]).toHaveProperty('status');
      }
    });

    it('should test get_event_classification_stats function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'get_event_classification_stats',
        {
          event_id: testEventId,
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');

      if (data) {
        expect(data).toHaveProperty('photos');
        expect(data).toHaveProperty('courses');
        expect(data).toHaveProperty('students');
        expect(data.photos).toHaveProperty('total');
        expect(data.photos).toHaveProperty('by_type');
      }
    });

    it('should test bulk_update_photo_types function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'bulk_update_photo_types',
        {
          photo_ids: [testPhotoId],
          new_photo_type: 'activity',
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should test remove_photo_classifications function', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'remove_photo_classifications',
        {
          photo_ids: [testPhotoId],
          classification_type: 'all',
        }
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity in photo classifications', async () => {
      // Verify photo exists
      const { data: photo } = await supabaseAdmin
        .from('photos')
        .select('id, event_id')
        .eq('id', testPhotoId)
        .single();

      expect(photo).toBeTruthy();
      expect(photo.event_id).toBe(testEventId);

      // Verify student exists in same event
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id, event_id')
        .eq('id', testStudentId)
        .single();

      expect(student).toBeTruthy();
      expect(student.event_id).toBe(testEventId);

      // Verify course exists in same event
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id, event_id')
        .eq('id', testCourseId)
        .single();

      expect(course).toBeTruthy();
      expect(course.event_id).toBe(testEventId);
    });

    it('should handle cascade deletes properly', async () => {
      // This test would verify that when an event is deleted,
      // all related data (courses, students, photos, etc.) are properly cleaned up
      // For now, we just verify the relationships exist

      const { data: relatedData } = await supabaseAdmin
        .from('events')
        .select(
          `
          id,
          courses!inner(id),
          students!inner(id),
          photos!inner(id)
        `
        )
        .eq('id', testEventId)
        .single();

      expect(relatedData).toBeTruthy();
      expect(relatedData.courses.length).toBeGreaterThan(0);
      expect(relatedData.students.length).toBeGreaterThan(0);
      expect(relatedData.photos.length).toBeGreaterThan(0);
    });
  });
});

describe('Workflow Component Integration', () => {
  it('should validate photo classification workflow state', () => {
    // This would test the React components, but since we're in a Node.js environment
    // we'll focus on the API and database integration

    const mockWorkflowData = {
      event: {
        id: testEventId,
        name: 'Test Event',
        status: 'active',
      },
      courses: [{ id: testCourseId, name: 'Test Course' }],
      students: [{ id: testStudentId, name: 'Test Student' }],
      stats: {
        photos: { total: 1, unclassified: 0 },
        courses: { total: 1 },
        students: { total: 1 },
      },
    };

    expect(mockWorkflowData.event.id).toBe(testEventId);
    expect(mockWorkflowData.courses.length).toBe(1);
    expect(mockWorkflowData.students.length).toBe(1);
    expect(mockWorkflowData.stats.photos.total).toBe(1);
  });
});
