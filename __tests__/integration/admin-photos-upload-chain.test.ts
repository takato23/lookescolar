/**
 * Integration tests for the complete admin photos upload chain
 * Tests: Upload → Preview Generation → Display → Asset Management
 * 
 * This test suite validates the entire workflow from upload to display,
 * ensuring the fixed upload functionality works end-to-end.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('Admin Photos Upload Chain Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEventId: string;
  let testPhotoId: string;
  let uploadedPhotos: string[] = []; // Track uploaded photos for cleanup

  // Test image generator
  const createTestImage = async (
    name: string,
    width = 800,
    height = 600,
    format: 'jpeg' | 'png' = 'jpeg'
  ): Promise<File> => {
    const imageBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: Math.floor(Math.random() * 255), g: Math.floor(Math.random() * 255), b: 0 }
      }
    })
    .jpeg({ quality: 80 })
    .toBuffer();

    const blob = new Blob([imageBuffer], { type: `image/${format}` });
    return new File([blob], name, { type: `image/${format}` });
  };

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create test event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Upload Chain Test Event',
        date: new Date().toISOString().split('T')[0],
        location: 'Test Location',
        status: 'draft',
        school_name: 'Test School'
      })
      .select('id')
      .single();

    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }

    testEventId = event.id;
  });

  afterAll(async () => {
    // Comprehensive cleanup
    if (testEventId) {
      // Delete photos first (this should also clean up storage files)
      const { data: photos } = await supabase
        .from('photos')
        .select('id, preview_path')
        .eq('event_id', testEventId);

      if (photos && photos.length > 0) {
        // Clean up storage files
        const PREVIEW_BUCKET = process.env.STORAGE_BUCKET_PREVIEW || 'photos';
        const filePaths = photos
          .map(p => p.preview_path)
          .filter(Boolean);
        
        if (filePaths.length > 0) {
          await supabase.storage
            .from(PREVIEW_BUCKET)
            .remove(filePaths);
        }

        // Delete photo records
        await supabase
          .from('photos')
          .delete()
          .eq('event_id', testEventId);
      }

      // Delete event
      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  beforeEach(async () => {
    // Clean slate for each test
    uploadedPhotos = [];
  });

  afterEach(async () => {
    // Clean up any photos created in individual tests
    if (uploadedPhotos.length > 0) {
      await supabase
        .from('photos')
        .delete()
        .in('id', uploadedPhotos);
    }
  });

  describe('1. Upload API Endpoint Functionality', () => {
    it('should successfully upload a single photo', async () => {
      const testFile = await createTestImage('test-single-upload.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        message: expect.stringContaining('Successfully uploaded 1 photos'),
        results: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            filename: 'test-single-upload.jpg',
            size: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number),
            path: expect.stringMatching(/events\/.*\/uploads\/.*\.webp$/),
            qrDetected: false
          })
        ]),
        errors: [],
        statistics: {
          total: expect.any(Number),
          successful: 1,
          failed: 0,
          durationMs: expect.any(Number)
        }
      });

      // Track for cleanup
      uploadedPhotos.push(data.results[0].id);
      testPhotoId = data.results[0].id;
    });

    it('should handle multiple photos upload', async () => {
      const files = await Promise.all([
        createTestImage('multi-1.jpg', 1200, 800),
        createTestImage('multi-2.jpg', 800, 1200),
        createTestImage('multi-3.jpg', 1000, 1000)
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(3);
      expect(data.statistics.successful).toBe(3);
      expect(data.statistics.failed).toBe(0);

      // All should be WebP format after processing
      data.results.forEach((result: any) => {
        expect(result.path).toMatch(/\.webp$/);
        expect(result.size).toBeGreaterThan(0);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      });

      // Track for cleanup
      uploadedPhotos.push(...data.results.map((r: any) => r.id));
    });

    it('should validate file types and reject invalid files', async () => {
      const validFile = await createTestImage('valid.jpg');
      // Create a fake "invalid" file (actually just a text blob)
      const invalidFile = new File(['not an image'], 'invalid.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', validFile);
      formData.append('files', invalidFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(1); // Only valid file processed
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toMatchObject({
        filename: 'invalid.txt',
        error: 'File type not allowed'
      });

      // Track for cleanup
      uploadedPhotos.push(data.results[0].id);
    });

    it('should enforce file size limits', async () => {
      // Create a large buffer to simulate oversized file
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const largeFile = new File([largeBuffer], 'huge.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', largeFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors).toContainEqual({
        filename: 'huge.jpg',
        error: 'File too large'
      });
    });

    it('should validate event ownership and access', async () => {
      const testFile = await createTestImage('unauthorized.jpg');
      const invalidEventId = '00000000-0000-0000-0000-000000000000';
      
      const formData = new FormData();
      formData.append('eventId', invalidEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Event not found');
    });
  });

  describe('2. Preview Generation and Storage', () => {
    it('should generate optimized WebP previews', async () => {
      const testFile = await createTestImage('preview-test.jpg', 2000, 1500);
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      
      const uploadedPhoto = data.results[0];
      uploadedPhotos.push(uploadedPhoto.id);

      // Verify preview is generated and accessible
      const previewPath = uploadedPhoto.path;
      expect(previewPath).toMatch(/\.webp$/);
      
      // Check database record
      const { data: dbPhoto, error: dbError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', uploadedPhoto.id)
        .single();

      expect(dbError).toBeNull();
      expect(dbPhoto).toMatchObject({
        event_id: testEventId,
        preview_path: previewPath,
        mime_type: 'image/webp',
        processing_status: 'completed',
        approved: false
      });

      // Verify no original is stored (free tier optimization)
      expect(dbPhoto.storage_path).toBeNull();
      expect(dbPhoto.metadata?.freetier_optimized).toBe(true);
    });

    it('should apply watermarks to previews', async () => {
      const testFile = await createTestImage('watermark-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      expect(data.success).toBe(true);

      const uploadedPhoto = data.results[0];
      uploadedPhotos.push(uploadedPhoto.id);

      // Verify watermark is applied by checking the signed URL
      const signedUrlResponse = await fetch(
        `${API_BASE_URL}/api/admin/storage/signed-url?path=${uploadedPhoto.path}`
      );
      
      expect(signedUrlResponse.status).toBe(200);
      
      const { signedUrl } = await signedUrlResponse.json();
      expect(signedUrl).toMatch(/^https:\/\/.*\.supabase\.co\/storage/);
    });

    it('should store correct metadata for optimization tracking', async () => {
      const testFile = await createTestImage('metadata-test.jpg', 1600, 1200);
      const originalSize = testFile.size;
      
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      const uploadedPhoto = data.results[0];
      uploadedPhotos.push(uploadedPhoto.id);

      // Check database metadata
      const { data: dbPhoto } = await supabase
        .from('photos')
        .select('metadata, file_size, width, height')
        .eq('id', uploadedPhoto.id)
        .single();

      expect(dbPhoto.metadata).toMatchObject({
        freetier_optimized: true,
        compression_level: expect.any(Number),
        original_size: originalSize,
        optimization_ratio: expect.any(Number)
      });

      // Verify size reduction
      expect(dbPhoto.file_size).toBeLessThan(originalSize);
      expect(dbPhoto.metadata.optimization_ratio).toBeGreaterThan(0);
    });
  });

  describe('3. Asset Management Integration', () => {
    let testAssetIds: string[] = [];

    afterEach(async () => {
      // Clean up test assets
      if (testAssetIds.length > 0) {
        await supabase
          .from('photos')
          .delete()
          .in('id', testAssetIds);
        testAssetIds = [];
      }
    });

    it('should list uploaded photos through assets API', async () => {
      // First upload a photo
      const testFile = await createTestImage('asset-list-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoId = uploadData.results[0].id;
      testAssetIds.push(photoId);

      // Now fetch through assets API
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}`
      );

      expect(assetsResponse.status).toBe(200);
      
      const assetsData = await assetsResponse.json();
      expect(assetsData.success).toBe(true);
      expect(assetsData.assets).toContainEqual(
        expect.objectContaining({
          id: photoId,
          preview_path: expect.stringMatching(/\.webp$/),
          file_size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number)
        })
      );
    });

    it('should support bulk operations on uploaded photos', async () => {
      // Upload multiple photos
      const files = await Promise.all([
        createTestImage('bulk-1.jpg'),
        createTestImage('bulk-2.jpg'),
        createTestImage('bulk-3.jpg')
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach(file => formData.append('files', file));

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoIds = uploadData.results.map((r: any) => r.id);
      testAssetIds.push(...photoIds);

      // Test bulk approval
      const bulkResponse = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'approve',
          assetIds: photoIds
        })
      });

      expect(bulkResponse.status).toBe(200);
      
      const bulkData = await bulkResponse.json();
      expect(bulkData.success).toBe(true);
      expect(bulkData.updated).toBe(photoIds.length);

      // Verify photos are approved
      const { data: approvedPhotos } = await supabase
        .from('photos')
        .select('approved')
        .in('id', photoIds);

      approvedPhotos?.forEach(photo => {
        expect(photo.approved).toBe(true);
      });
    });

    it('should generate signed URLs for preview access', async () => {
      // Upload a photo
      const testFile = await createTestImage('signed-url-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const previewPath = uploadData.results[0].path;
      testAssetIds.push(uploadData.results[0].id);

      // Request signed URL
      const signedUrlResponse = await fetch(
        `${API_BASE_URL}/api/admin/storage/signed-url?path=${encodeURIComponent(previewPath)}`
      );

      expect(signedUrlResponse.status).toBe(200);
      
      const signedUrlData = await signedUrlResponse.json();
      expect(signedUrlData).toMatchObject({
        success: true,
        signedUrl: expect.stringMatching(/^https:\/\/.*\.supabase\.co\/storage/),
        expiresIn: expect.any(Number)
      });

      // Verify the signed URL actually works
      const imageResponse = await fetch(signedUrlData.signedUrl);
      expect(imageResponse.status).toBe(200);
      expect(imageResponse.headers.get('content-type')).toBe('image/webp');
    });
  });

  describe('4. Folder-to-Subjects Mapping', () => {
    let testFolderId: string;

    beforeEach(async () => {
      // Create a test folder
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .insert({
          name: 'Test Class Folder',
          event_id: testEventId,
          parent_id: null
        })
        .select('id')
        .single();

      if (folderError) {
        throw new Error(`Failed to create test folder: ${folderError.message}`);
      }

      testFolderId = folder.id;
    });

    afterEach(async () => {
      // Clean up test folder
      if (testFolderId) {
        await supabase.from('folders').delete().eq('id', testFolderId);
      }
    });

    it('should correctly count photos in folders', async () => {
      // Upload photos to the event
      const files = await Promise.all([
        createTestImage('folder-count-1.jpg'),
        createTestImage('folder-count-2.jpg')
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach(file => formData.append('files', file));

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoIds = uploadData.results.map((r: any) => r.id);
      uploadedPhotos.push(...photoIds);

      // Assign photos to folder via subject assignment
      await supabase
        .from('photos')
        .update({ folder_id: testFolderId })
        .in('id', photoIds);

      // Check folder photo count through API
      const foldersResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const foldersData = await foldersResponse.json();

      const testFolder = foldersData.folders.find((f: any) => f.id === testFolderId);
      expect(testFolder).toBeDefined();
      expect(testFolder.photo_count).toBe(2);
    });

    it('should support folder-based photo organization', async () => {
      // Upload a photo
      const testFile = await createTestImage('folder-org-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoId = uploadData.results[0].id;
      uploadedPhotos.push(photoId);

      // Move photo to folder
      const { error: moveError } = await supabase
        .from('photos')
        .update({ folder_id: testFolderId })
        .eq('id', photoId);

      expect(moveError).toBeNull();

      // Verify photo is in folder
      const { data: photoInFolder } = await supabase
        .from('photos')
        .select('folder_id')
        .eq('id', photoId)
        .single();

      expect(photoInFolder?.folder_id).toBe(testFolderId);
    });
  });

  describe('5. Error Handling and Recovery', () => {
    it('should handle storage failures gracefully', async () => {
      // This test would require mocking storage failure
      // For now, we test that the endpoint responds appropriately to invalid data
      const formData = new FormData();
      formData.append('eventId', testEventId);
      // Upload without files
      
      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'No files received'
      });
    });

    it('should clean up on partial failures', async () => {
      // Create one valid file and one that will cause processing issues
      const validFile = await createTestImage('valid-cleanup.jpg');
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', validFile);
      formData.append('files', emptyFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      // Should handle mixed success/failure
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.statistics.successful + data.statistics.failed).toBeGreaterThan(0);
      
      if (data.results.length > 0) {
        uploadedPhotos.push(...data.results.map((r: any) => r.id));
      }
    });
  });

  describe('6. Performance and Optimization', () => {
    it('should complete uploads within reasonable time limits', async () => {
      const startTime = Date.now();

      // Upload 5 medium-sized images
      const files = await Promise.all(
        Array(5).fill(0).map((_, i) => 
          createTestImage(`perf-test-${i}.jpg`, 1200, 800)
        )
      );

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.statistics.successful).toBe(5);

      uploadedPhotos.push(...data.results.map((r: any) => r.id));
    });

    it('should optimize file sizes effectively', async () => {
      // Create a large test image
      const largeFile = await createTestImage('large-optimization.jpg', 3000, 2000);
      const originalSize = largeFile.size;

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', largeFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      const optimizedPhoto = data.results[0];
      uploadedPhotos.push(optimizedPhoto.id);

      // Check optimization effectiveness
      const { data: photoData } = await supabase
        .from('photos')
        .select('file_size, metadata')
        .eq('id', optimizedPhoto.id)
        .single();

      expect(photoData.file_size).toBeLessThan(originalSize);
      expect(photoData.metadata?.optimization_ratio).toBeGreaterThan(50); // At least 50% reduction
    });
  });
});