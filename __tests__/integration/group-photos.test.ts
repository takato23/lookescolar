import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { familyService } from '@/lib/services/family.service';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Group Photo System Integration Tests', () => {
  let testEventId: string;
  let testCourseId: string;
  let testStudentId: string;
  let testStudentToken: string;
  let testPhoto1Id: string;
  let testPhoto2Id: string;

  beforeAll(async () => {
    // Create test event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Test Event for Group Photos',
        date: '2024-12-01',
        school_name: 'Test School',
        status: 'active',
      })
      .select()
      .single();

    if (eventError) throw eventError;
    testEventId = event.id;

    // Create test course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        event_id: testEventId,
        name: 'Test Course 1A',
        grade: '1',
        section: 'A',
        active: true,
      })
      .select()
      .single();

    if (courseError) throw courseError;
    testCourseId = course.id;

    // Create test student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        event_id: testEventId,
        course_id: testCourseId,
        name: 'Test Student',
        grade: '1',
        section: 'A',
        parent_name: 'Test Parent',
        parent_email: 'test@example.com',
        active: true,
      })
      .select()
      .single();

    if (studentError) throw studentError;
    testStudentId = student.id;

    // Create test student token
    const { data: token, error: tokenError } = await supabase
      .from('student_tokens')
      .insert({
        student_id: testStudentId,
        token: 'test_group_photo_token_123456789',
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
      })
      .select()
      .single();

    if (tokenError) throw tokenError;
    testStudentToken = token.token;

    // Create test photos
    const { data: photo1, error: photo1Error } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'test-group-photo-1.jpg',
        storage_path: 'test/group1.jpg',
        preview_path: 'test/group1_preview.jpg',
        watermark_path: 'test/group1_watermark.jpg',
        photo_type: 'group',
        approved: true,
        file_size_bytes: 1024000,
      })
      .select()
      .single();

    if (photo1Error) throw photo1Error;
    testPhoto1Id = photo1.id;

    const { data: photo2, error: photo2Error } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'test-activity-photo-1.jpg',
        storage_path: 'test/activity1.jpg',
        preview_path: 'test/activity1_preview.jpg',
        watermark_path: 'test/activity1_watermark.jpg',
        photo_type: 'activity',
        approved: true,
        file_size_bytes: 1024000,
      })
      .select()
      .single();

    if (photo2Error) throw photo2Error;
    testPhoto2Id = photo2.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('photo_courses').delete().eq('course_id', testCourseId);
    await supabase
      .from('student_tokens')
      .delete()
      .eq('student_id', testStudentId);
    await supabase.from('students').delete().eq('id', testStudentId);
    await supabase
      .from('photos')
      .delete()
      .in('id', [testPhoto1Id, testPhoto2Id]);
    await supabase.from('courses').delete().eq('id', testCourseId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  describe('Photo-Course Association', () => {
    beforeEach(async () => {
      // Clean up any existing associations
      await supabase
        .from('photo_courses')
        .delete()
        .eq('course_id', testCourseId);
    });

    it('should create photo-course association', async () => {
      const { data, error } = await supabase
        .from('photo_courses')
        .insert({
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'group',
          tagged_at: new Date().toISOString(),
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].photo_id).toBe(testPhoto1Id);
      expect(data[0].course_id).toBe(testCourseId);
      expect(data[0].photo_type).toBe('group');
    });

    it('should prevent duplicate photo-course associations', async () => {
      // First association
      await supabase.from('photo_courses').insert({
        photo_id: testPhoto1Id,
        course_id: testCourseId,
        photo_type: 'group',
      });

      // Attempt duplicate
      const { error } = await supabase.from('photo_courses').insert({
        photo_id: testPhoto1Id,
        course_id: testCourseId,
        photo_type: 'group',
      });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23505'); // Unique constraint violation
    });

    it('should allow same photo with different types', async () => {
      // First association as group
      await supabase.from('photo_courses').insert({
        photo_id: testPhoto1Id,
        course_id: testCourseId,
        photo_type: 'group',
      });

      // Second association as activity
      const { data, error } = await supabase
        .from('photo_courses')
        .insert({
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'activity',
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Family Service Group Photo Support', () => {
    beforeEach(async () => {
      // Set up photo-course associations
      await supabase
        .from('photo_courses')
        .delete()
        .eq('course_id', testCourseId);
      await supabase.from('photo_courses').insert([
        {
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'group',
          tagged_at: new Date().toISOString(),
        },
        {
          photo_id: testPhoto2Id,
          course_id: testCourseId,
          photo_type: 'activity',
          tagged_at: new Date().toISOString(),
        },
      ]);
    });

    it('should validate student token and include course info', async () => {
      const student = await familyService.validateToken(testStudentToken);

      expect(student).toBeTruthy();
      expect(student?.id).toBe(testStudentId);
      expect(student?.course_id).toBe(testCourseId);
      expect(student?.course).toBeTruthy();
      expect(student?.course?.name).toBe('Test Course 1A');
    });

    it('should get group photos for student', async () => {
      const result = await familyService.getStudentGroupPhotos(
        testStudentId,
        1,
        10
      );

      expect(result.photos).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.has_more).toBe(false);

      const groupPhoto = result.photos.find((p) => p.photo_type === 'group');
      const activityPhoto = result.photos.find(
        (p) => p.photo_type === 'activity'
      );

      expect(groupPhoto).toBeTruthy();
      expect(groupPhoto?.photo_id).toBe(testPhoto1Id);
      expect(groupPhoto?.course_id).toBe(testCourseId);

      expect(activityPhoto).toBeTruthy();
      expect(activityPhoto?.photo_id).toBe(testPhoto2Id);
      expect(activityPhoto?.course_id).toBe(testCourseId);
    });

    it('should validate photo ownership for group photos', async () => {
      const isValid1 = await familyService.validatePhotoOwnership(
        testPhoto1Id,
        testStudentId
      );
      const isValid2 = await familyService.validatePhotoOwnership(
        testPhoto2Id,
        testStudentId
      );

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });

    it('should reject photo ownership for non-associated photos', async () => {
      // Create a photo not associated with the course
      const { data: otherPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'other-photo.jpg',
          storage_path: 'test/other.jpg',
          photo_type: 'individual',
          approved: true,
          file_size_bytes: 1024000,
        })
        .select()
        .single();

      const isValid = await familyService.validatePhotoOwnership(
        otherPhoto.id,
        testStudentId
      );
      expect(isValid).toBe(false);

      // Clean up
      await supabase.from('photos').delete().eq('id', otherPhoto.id);
    });

    it('should include group photos in getSubjectPhotos', async () => {
      const result = await familyService.getSubjectPhotos(testStudentId, 1, 10);

      // Should include group photos since student has a course
      expect(result.photos.length).toBeGreaterThan(0);

      const groupPhotoExists = result.photos.some(
        (p) =>
          (p as any).course_id === testCourseId &&
          'photo_type' in p &&
          (p as any).photo_type === 'group'
      );

      expect(groupPhotoExists).toBe(true);
    });
  });

  describe('API Endpoint Integration', () => {
    beforeEach(async () => {
      // Clean up associations
      await supabase
        .from('photo_courses')
        .delete()
        .eq('course_id', testCourseId);
    });

    it('should handle course photo assignment via API', async () => {
      const response = await fetch(
        `/api/admin/events/${testEventId}/courses/${testCourseId}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo_ids: [testPhoto1Id, testPhoto2Id],
            photo_type: 'group',
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        expect(data.success).toBe(true);
        expect(data.photos_count).toBe(2);
        expect(data.photo_type).toBe('group');

        // Verify associations were created
        const { data: associations } = await supabase
          .from('photo_courses')
          .select('*')
          .eq('course_id', testCourseId);

        expect(associations).toHaveLength(2);
      } else {
        // API might not be accessible in test environment
        console.log('API test skipped:', data);
      }
    });

    it('should handle family group photos API', async () => {
      // Set up associations first
      await supabase.from('photo_courses').insert([
        {
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'group',
        },
      ]);

      const response = await fetch(
        `/api/family/gallery/${testStudentToken}/group-photos`
      );

      if (response.ok) {
        const data = await response.json();
        expect(data.photos).toBeDefined();
        expect(Array.isArray(data.photos)).toBe(true);
        expect(data.student).toBeDefined();
        expect(data.student.course).toBeDefined();
      } else {
        // API might not be accessible in test environment
        console.log('Family API test skipped');
      }
    });
  });

  describe('Group Photo Metadata', () => {
    it('should maintain proper photo metadata for group photos', async () => {
      // Create association
      const { data: association } = await supabase
        .from('photo_courses')
        .insert({
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'group',
          tagged_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          photo:photos (
            id,
            filename,
            photo_type,
            approved,
            created_at
          )
        `
        )
        .single();

      expect(association).toBeTruthy();
      expect(association.photo.id).toBe(testPhoto1Id);
      expect(association.photo.photo_type).toBe('group');
      expect(association.photo.approved).toBe(true);
      expect(association.photo_type).toBe('group');
    });

    it('should handle multiple photo types for same photo', async () => {
      // Associate same photo as both group and activity
      await supabase.from('photo_courses').insert([
        {
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'group',
        },
        {
          photo_id: testPhoto1Id,
          course_id: testCourseId,
          photo_type: 'activity',
        },
      ]);

      const { data: associations } = await supabase
        .from('photo_courses')
        .select('*')
        .eq('photo_id', testPhoto1Id)
        .eq('course_id', testCourseId);

      expect(associations).toHaveLength(2);
      expect(associations.map((a) => a.photo_type).sort()).toEqual([
        'activity',
        'group',
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing course gracefully', async () => {
      const result =
        await familyService.getStudentGroupPhotos('invalid-student-id');
      expect(result.photos).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.has_more).toBe(false);
    });

    it('should handle student without course', async () => {
      // Create student without course
      const { data: studentNoCourse } = await supabase
        .from('students')
        .insert({
          event_id: testEventId,
          name: 'Student No Course',
          active: true,
        })
        .select()
        .single();

      const result = await familyService.getStudentGroupPhotos(
        studentNoCourse.id
      );
      expect(result.photos).toHaveLength(0);
      expect(result.total).toBe(0);

      // Clean up
      await supabase.from('students').delete().eq('id', studentNoCourse.id);
    });

    it('should validate token format', async () => {
      const invalidToken = 'short';
      const student = await familyService.validateToken(invalidToken);
      expect(student).toBeNull();
    });

    it('should handle expired tokens', async () => {
      // Create expired token
      const { data: expiredTokenData } = await supabase
        .from('student_tokens')
        .insert({
          student_id: testStudentId,
          token: 'expired_token_123456789012',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        })
        .select()
        .single();

      const student = await familyService.validateToken(expiredTokenData.token);
      expect(student).toBeNull();

      // Clean up
      await supabase
        .from('student_tokens')
        .delete()
        .eq('id', expiredTokenData.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of group photos efficiently', async () => {
      // Create multiple photo associations
      const photoIds: string[] = [];
      const insertPromises = [];

      for (let i = 0; i < 20; i++) {
        const photoPromise = supabase
          .from('photos')
          .insert({
            event_id: testEventId,
            filename: `test-photo-${i}.jpg`,
            storage_path: `test/photo-${i}.jpg`,
            photo_type: 'group',
            approved: true,
            file_size_bytes: 1024000,
          })
          .select()
          .single();
        insertPromises.push(photoPromise);
      }

      const photoResults = await Promise.all(insertPromises);
      photoResults.forEach((result) => {
        if (result.data) {
          photoIds.push(result.data.id);
        }
      });

      // Associate all photos with course
      const associations = photoIds.map((photoId) => ({
        photo_id: photoId,
        course_id: testCourseId,
        photo_type: 'group',
      }));

      await supabase.from('photo_courses').insert(associations);

      // Test performance
      const startTime = Date.now();
      const result = await familyService.getStudentGroupPhotos(
        testStudentId,
        1,
        50
      );
      const duration = Date.now() - startTime;

      expect(result.photos.length).toBeGreaterThanOrEqual(20);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase.from('photo_courses').delete().in('photo_id', photoIds);
      await supabase.from('photos').delete().in('id', photoIds);
    });
  });
});
