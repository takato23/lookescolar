import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

test.describe('Group Photo Complete Workflow', () => {
  let testEventId: string;
  let testCourseId: string;
  let testStudentId: string;
  let testStudentToken: string;
  let testPhotoId: string;

  test.beforeAll(async () => {
    // Create test data
    const { data: event } = await supabase
      .from('events')
      .insert({
        name: 'E2E Test Event',
        date: '2024-12-01',
        school_name: 'E2E Test School',
        status: 'active',
      })
      .select()
      .single();
    testEventId = event.id;

    const { data: course } = await supabase
      .from('courses')
      .insert({
        event_id: testEventId,
        name: 'E2E Test Course 1A',
        grade: '1',
        section: 'A',
        active: true,
      })
      .select()
      .single();
    testCourseId = course.id;

    const { data: student } = await supabase
      .from('students')
      .insert({
        event_id: testEventId,
        course_id: testCourseId,
        name: 'E2E Test Student',
        grade: '1',
        section: 'A',
        parent_name: 'E2E Test Parent',
        parent_email: 'e2e@test.com',
        active: true,
      })
      .select()
      .single();
    testStudentId = student.id;

    const { data: token } = await supabase
      .from('student_tokens')
      .insert({
        student_id: testStudentId,
        token: 'e2e_test_token_123456789012',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    testStudentToken = token.token;

    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'e2e-test-photo.jpg',
        storage_path: 'test/e2e-photo.jpg',
        preview_path: 'test/e2e-photo_preview.jpg',
        watermark_path: 'test/e2e-photo_watermark.jpg',
        photo_type: 'individual',
        approved: true,
        file_size_bytes: 1024000,
      })
      .select()
      .single();
    testPhotoId = photo.id;
  });

  test.afterAll(async () => {
    // Clean up test data
    await supabase.from('photo_courses').delete().eq('course_id', testCourseId);
    await supabase.from('student_tokens').delete().eq('student_id', testStudentId);
    await supabase.from('students').delete().eq('id', testStudentId);
    await supabase.from('photos').delete().eq('id', testPhotoId);
    await supabase.from('courses').delete().eq('id', testCourseId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  test('Admin can assign photos to course as group photos', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Login as admin (assuming auth is handled)
    // This would need to be implemented based on your auth flow
    
    // Navigate to event management
    await page.goto(`/admin/events/${testEventId}`);
    
    // Navigate to group photo management
    await page.click('[data-testid="group-photos-tab"]');
    
    // Select the test course
    await page.click(`[data-testid="course-${testCourseId}"]`);
    
    // Wait for course selection to load
    await page.waitForSelector('[data-testid="assign-photos-button"]');
    
    // Click assign photos
    await page.click('[data-testid="assign-photos-button"]');
    
    // Wait for photo selection dialog
    await page.waitForSelector('[data-testid="photo-assignment-dialog"]');
    
    // Select the test photo
    await page.click(`[data-testid="photo-${testPhotoId}"]`);
    
    // Select photo type as group
    await page.selectOption('[data-testid="photo-type-select"]', 'group');
    
    // Confirm assignment
    await page.click('[data-testid="confirm-assignment"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Successfully assigned');
    
    // Verify photo appears in course group photos
    await page.waitForSelector(`[data-testid="group-photo-${testPhotoId}"]`);
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"]`)).toBeVisible();
  });

  test('Family can view group photos in gallery', async ({ page }) => {
    // First ensure photo is assigned to course
    await supabase
      .from('photo_courses')
      .upsert({
        photo_id: testPhotoId,
        course_id: testCourseId,
        photo_type: 'group',
        tagged_at: new Date().toISOString(),
      });

    // Navigate to family gallery
    await page.goto(`/f/${testStudentToken}`);
    
    // Wait for gallery to load
    await page.waitForSelector('[data-testid="family-gallery"]');
    
    // Navigate to group photos section
    await page.click('[data-testid="group-photos-tab"]');
    
    // Wait for group photos to load
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Verify the group photo is displayed
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"]`)).toBeVisible();
    
    // Verify photo metadata
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"] [data-testid="photo-type"]`))
      .toContainText('Group Photos');
  });

  test('Family can add group photos to cart', async ({ page }) => {
    // Ensure photo is assigned
    await supabase
      .from('photo_courses')
      .upsert({
        photo_id: testPhotoId,
        course_id: testCourseId,
        photo_type: 'group',
        tagged_at: new Date().toISOString(),
      });

    // Navigate to family gallery
    await page.goto(`/f/${testStudentToken}`);
    
    // Navigate to group photos
    await page.click('[data-testid="group-photos-tab"]');
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Add photo to cart
    await page.click(`[data-testid="group-photo-${testPhotoId}"] [data-testid="add-to-cart"]`);
    
    // Wait for cart update
    await page.waitForSelector('[data-testid="cart-notification"]', { timeout: 5000 });
    
    // Verify cart icon shows item count
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
  });

  test('Family can view group photo in lightbox', async ({ page }) => {
    // Ensure photo is assigned
    await supabase
      .from('photo_courses')
      .upsert({
        photo_id: testPhotoId,
        course_id: testCourseId,
        photo_type: 'group',
        tagged_at: new Date().toISOString(),
      });

    // Navigate to family gallery
    await page.goto(`/f/${testStudentToken}`);
    
    // Navigate to group photos
    await page.click('[data-testid="group-photos-tab"]');
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Click on photo to open lightbox
    await page.click(`[data-testid="group-photo-${testPhotoId}"] img`);
    
    // Wait for lightbox to open
    await page.waitForSelector('[data-testid="photo-lightbox"]');
    
    // Verify lightbox content
    await expect(page.locator('[data-testid="photo-lightbox"] h2')).toContainText('e2e-test-photo.jpg');
    await expect(page.locator('[data-testid="photo-lightbox"] [data-testid="photo-description"]'))
      .toContainText('Group Photos • E2E Test Course 1A');
    
    // Verify lightbox actions
    await expect(page.locator('[data-testid="lightbox-add-to-cart"]')).toBeVisible();
    await expect(page.locator('[data-testid="lightbox-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="lightbox-share"]')).toBeVisible();
  });

  test('Admin can perform bulk operations on group photos', async ({ page }) => {
    // Ensure multiple photos are assigned
    const { data: photo2 } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'e2e-test-photo-2.jpg',
        storage_path: 'test/e2e-photo-2.jpg',
        photo_type: 'individual',
        approved: false,
        file_size_bytes: 1024000,
      })
      .select()
      .single();

    await supabase
      .from('photo_courses')
      .insert([
        {
          photo_id: testPhotoId,
          course_id: testCourseId,
          photo_type: 'group',
        },
        {
          photo_id: photo2.id,
          course_id: testCourseId,
          photo_type: 'group',
        },
      ]);

    // Navigate to admin group photo management
    await page.goto(`/admin/events/${testEventId}/group-photos`);
    
    // Select the test course
    await page.click(`[data-testid="course-${testCourseId}"]`);
    
    // Wait for photos to load
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Select multiple photos
    await page.click(`[data-testid="photo-checkbox-${testPhotoId}"]`);
    await page.click(`[data-testid="photo-checkbox-${photo2.id}"]`);
    
    // Open bulk actions menu
    await page.click('[data-testid="bulk-actions-button"]');
    
    // Approve selected photos
    await page.click('[data-testid="bulk-approve"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="bulk-success-message"]');
    await expect(page.locator('[data-testid="bulk-success-message"]'))
      .toContainText('Successfully approved 2 photo(s)');
    
    // Verify photos are now approved
    await expect(page.locator(`[data-testid="photo-${testPhotoId}"] [data-testid="approval-badge"]`))
      .toContainText('Approved');
    await expect(page.locator(`[data-testid="photo-${photo2.id}"] [data-testid="approval-badge"]`))
      .toContainText('Approved');

    // Clean up additional photo
    await supabase.from('photo_courses').delete().eq('photo_id', photo2.id);
    await supabase.from('photos').delete().eq('id', photo2.id);
  });

  test('Family can filter group photos by type', async ({ page }) => {
    // Create different types of group photos
    const { data: activityPhoto } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: 'activity-photo.jpg',
        storage_path: 'test/activity.jpg',
        photo_type: 'activity',
        approved: true,
        file_size_bytes: 1024000,
      })
      .select()
      .single();

    await supabase
      .from('photo_courses')
      .insert([
        {
          photo_id: testPhotoId,
          course_id: testCourseId,
          photo_type: 'group',
        },
        {
          photo_id: activityPhoto.id,
          course_id: testCourseId,
          photo_type: 'activity',
        },
      ]);

    // Navigate to family gallery
    await page.goto(`/f/${testStudentToken}`);
    
    // Navigate to group photos
    await page.click('[data-testid="group-photos-tab"]');
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Verify both photos are visible initially
    await expect(page.locator('[data-testid="photo-count"]')).toContainText('2 photo(s)');
    
    // Filter by group photos only
    await page.selectOption('[data-testid="photo-type-filter"]', 'group');
    await page.waitForSelector('[data-testid="filtered-results"]');
    
    // Verify only group photo is visible
    await expect(page.locator('[data-testid="photo-count"]')).toContainText('1 photo(s)');
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="group-photo-${activityPhoto.id}"]`)).not.toBeVisible();
    
    // Filter by activity photos
    await page.selectOption('[data-testid="photo-type-filter"]', 'activity');
    await page.waitForSelector('[data-testid="filtered-results"]');
    
    // Verify only activity photo is visible
    await expect(page.locator('[data-testid="photo-count"]')).toContainText('1 photo(s)');
    await expect(page.locator(`[data-testid="group-photo-${activityPhoto.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"]`)).not.toBeVisible();

    // Clean up
    await supabase.from('photo_courses').delete().eq('photo_id', activityPhoto.id);
    await supabase.from('photos').delete().eq('id', activityPhoto.id);
  });

  test('System handles group photo permissions correctly', async ({ page }) => {
    // Create another student in different course
    const { data: otherCourse } = await supabase
      .from('courses')
      .insert({
        event_id: testEventId,
        name: 'Other Course 1B',
        grade: '1',
        section: 'B',
        active: true,
      })
      .select()
      .single();

    const { data: otherStudent } = await supabase
      .from('students')
      .insert({
        event_id: testEventId,
        course_id: otherCourse.id,
        name: 'Other Student',
        active: true,
      })
      .select()
      .single();

    const { data: otherToken } = await supabase
      .from('student_tokens')
      .insert({
        student_id: otherStudent.id,
        token: 'other_student_token_123456789',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    // Assign photo to original course
    await supabase
      .from('photo_courses')
      .upsert({
        photo_id: testPhotoId,
        course_id: testCourseId,
        photo_type: 'group',
      });

    // Try to access with other student's token
    await page.goto(`/f/${otherToken.token}`);
    
    // Navigate to group photos
    await page.click('[data-testid="group-photos-tab"]');
    await page.waitForSelector('[data-testid="group-photos-grid"]');
    
    // Should not see the group photo from other course
    await expect(page.locator(`[data-testid="group-photo-${testPhotoId}"]`)).not.toBeVisible();
    await expect(page.locator('[data-testid="no-photos-message"]')).toBeVisible();

    // Clean up
    await supabase.from('student_tokens').delete().eq('id', otherToken.id);
    await supabase.from('students').delete().eq('id', otherStudent.id);
    await supabase.from('courses').delete().eq('id', otherCourse.id);
  });
});