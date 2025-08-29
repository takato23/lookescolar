/**
 * Integration tests for /api/admin/assets/* endpoints
 * Tests the asset management API that integrates with photos table
 *
 * Validates:
 * - Asset listing and filtering
 * - Bulk operations
 * - Asset upload workflow
 * - Integration with photos table
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('/api/admin/assets - Asset Management API', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEventId: string;
  let testAssetIds: string[] = [];

  // Test asset generator
  const createTestAsset = async (name: string): Promise<File> => {
    const imageBuffer = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    return new File([blob], name, { type: 'image/jpeg' });
  };

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create test event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Asset Management Test Event',
        date: new Date().toISOString().split('T')[0],
        location: 'Test Location',
        status: 'draft',
        school_name: 'Asset Test School',
      })
      .select('id')
      .single();

    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }

    testEventId = event.id;
  });

  afterAll(async () => {
    if (testEventId) {
      // Cleanup photos and storage
      const { data: photos } = await supabase
        .from('photos')
        .select('preview_path')
        .eq('event_id', testEventId);

      if (photos && photos.length > 0) {
        const PREVIEW_BUCKET = process.env.STORAGE_BUCKET_PREVIEW || 'photos';
        const filePaths = photos.map((p) => p.preview_path).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage.from(PREVIEW_BUCKET).remove(filePaths);
        }

        await supabase.from('photos').delete().eq('event_id', testEventId);
      }

      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  beforeEach(() => {
    testAssetIds = [];
  });

  afterEach(async () => {
    // Clean up test assets
    if (testAssetIds.length > 0) {
      await supabase.from('photos').delete().in('id', testAssetIds);
    }
  });

  describe('GET /api/admin/assets', () => {
    it('should return empty assets list for new event', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&limit=10`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        assets: [],
        totalCount: 0,
        pagination: expect.objectContaining({
          limit: 10,
          offset: 0,
          hasMore: false,
        }),
      });
    });

    it('should list uploaded assets correctly', async () => {
      // Upload assets via photo upload API
      const testFile = await createTestAsset('asset-listing-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      expect(uploadResponse.status).toBe(200);

      const uploadData = await uploadResponse.json();
      const assetId = uploadData.results[0].id;
      testAssetIds.push(assetId);

      // Now fetch through assets API
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}`
      );

      expect(assetsResponse.status).toBe(200);

      const assetsData = await assetsResponse.json();
      expect(assetsData.success).toBe(true);
      expect(assetsData.assets).toHaveLength(1);
      expect(assetsData.assets[0]).toMatchObject({
        id: assetId,
        event_id: testEventId,
        preview_path: expect.stringMatching(/\.webp$/),
        original_filename: 'asset-listing-test.jpg',
        file_size: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        mime_type: 'image/webp',
        processing_status: 'completed',
        approved: false,
        created_at: expect.any(String),
      });
    });

    it('should support pagination correctly', async () => {
      // Upload multiple assets
      const files = await Promise.all([
        createTestAsset('page-test-1.jpg'),
        createTestAsset('page-test-2.jpg'),
        createTestAsset('page-test-3.jpg'),
        createTestAsset('page-test-4.jpg'),
        createTestAsset('page-test-5.jpg'),
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach((file) => formData.append('files', file));

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      testAssetIds.push(...uploadData.results.map((r: any) => r.id));

      // Test first page
      const page1Response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&limit=3&offset=0`
      );

      const page1Data = await page1Response.json();
      expect(page1Data.success).toBe(true);
      expect(page1Data.assets).toHaveLength(3);
      expect(page1Data.pagination.hasMore).toBe(true);

      // Test second page
      const page2Response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&limit=3&offset=3`
      );

      const page2Data = await page2Response.json();
      expect(page2Data.success).toBe(true);
      expect(page2Data.assets).toHaveLength(2);
      expect(page2Data.pagination.hasMore).toBe(false);
    });

    it('should filter by approval status', async () => {
      // Upload and approve one asset, leave another unapproved
      const files = await Promise.all([
        createTestAsset('approved-asset.jpg'),
        createTestAsset('unapproved-asset.jpg'),
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach((file) => formData.append('files', file));

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      testAssetIds.push(...uploadData.results.map((r: any) => r.id));

      // Approve one asset
      const approvedAssetId = uploadData.results[0].id;
      await supabase
        .from('photos')
        .update({ approved: true })
        .eq('id', approvedAssetId);

      // Test filter for approved assets
      const approvedResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&approved=true`
      );

      const approvedData = await approvedResponse.json();
      expect(approvedData.success).toBe(true);
      expect(approvedData.assets).toHaveLength(1);
      expect(approvedData.assets[0].id).toBe(approvedAssetId);
      expect(approvedData.assets[0].approved).toBe(true);

      // Test filter for unapproved assets
      const unapprovedResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&approved=false`
      );

      const unapprovedData = await unapprovedResponse.json();
      expect(unapprovedData.success).toBe(true);
      expect(unapprovedData.assets).toHaveLength(1);
      expect(unapprovedData.assets[0].approved).toBe(false);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=invalid-uuid&limit=abc`
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
      });
    });
  });

  describe('POST /api/admin/assets/upload', () => {
    it('should upload assets through dedicated endpoint', async () => {
      const testFile = await createTestAsset('dedicated-upload.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/assets/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        assets: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            originalFilename: 'dedicated-upload.jpg',
            previewPath: expect.stringMatching(/\.webp$/),
            size: expect.any(Number),
          }),
        ]),
        count: 1,
      });

      testAssetIds.push(data.assets[0].id);
    });

    it('should validate file types for asset upload', async () => {
      const validFile = await createTestAsset('valid-asset.jpg');
      const invalidFile = new File(['invalid'], 'invalid.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', validFile);
      formData.append('files', invalidFile);

      const response = await fetch(`${API_BASE_URL}/api/admin/assets/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.assets).toHaveLength(1); // Only valid file uploaded
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toMatchObject({
        filename: 'invalid.txt',
        error: expect.stringContaining('not allowed'),
      });

      testAssetIds.push(data.assets[0].id);
    });
  });

  describe('POST /api/admin/assets/bulk', () => {
    let bulkTestAssetIds: string[];

    beforeEach(async () => {
      // Create test assets for bulk operations
      const files = await Promise.all([
        createTestAsset('bulk-1.jpg'),
        createTestAsset('bulk-2.jpg'),
        createTestAsset('bulk-3.jpg'),
      ]);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach((file) => formData.append('files', file));

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      bulkTestAssetIds = uploadData.results.map((r: any) => r.id);
      testAssetIds.push(...bulkTestAssetIds);
    });

    it('should approve multiple assets in bulk', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'approve',
          assetIds: bulkTestAssetIds,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        operation: 'approve',
        updated: bulkTestAssetIds.length,
        failed: 0,
      });

      // Verify assets are approved
      const { data: assets } = await supabase
        .from('photos')
        .select('approved')
        .in('id', bulkTestAssetIds);

      assets?.forEach((asset) => {
        expect(asset.approved).toBe(true);
      });
    });

    it('should reject assets in bulk', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'reject',
          assetIds: bulkTestAssetIds,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.updated).toBe(bulkTestAssetIds.length);

      // Verify assets are marked as rejected (approved = false)
      const { data: assets } = await supabase
        .from('photos')
        .select('approved')
        .in('id', bulkTestAssetIds);

      assets?.forEach((asset) => {
        expect(asset.approved).toBe(false);
      });
    });

    it('should delete assets in bulk', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          assetIds: bulkTestAssetIds,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(bulkTestAssetIds.length);

      // Verify assets are deleted
      const { data: assets, count } = await supabase
        .from('photos')
        .select('*', { count: 'exact' })
        .in('id', bulkTestAssetIds);

      expect(count).toBe(0);
      expect(assets).toHaveLength(0);

      // Remove from cleanup list since they're already deleted
      testAssetIds = testAssetIds.filter(
        (id) => !bulkTestAssetIds.includes(id)
      );
    });

    it('should handle mixed success/failure in bulk operations', async () => {
      // Include some invalid IDs
      const mixedIds = [...bulkTestAssetIds, 'invalid-id-1', 'invalid-id-2'];

      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'approve',
          assetIds: mixedIds,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.updated).toBe(bulkTestAssetIds.length); // Only valid IDs updated
      expect(data.failed).toBeGreaterThan(0); // Invalid IDs failed
    });

    it('should validate bulk operation parameters', async () => {
      // Test invalid operation
      const invalidOpResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'invalid-operation',
            assetIds: bulkTestAssetIds,
          }),
        }
      );

      expect(invalidOpResponse.status).toBe(400);

      // Test missing assetIds
      const missingIdsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'approve',
          }),
        }
      );

      expect(missingIdsResponse.status).toBe(400);

      // Test empty assetIds array
      const emptyIdsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'approve',
            assetIds: [],
          }),
        }
      );

      expect(emptyIdsResponse.status).toBe(400);
    });
  });

  describe('Integration with Photos Table', () => {
    it('should maintain consistency between assets API and photos table', async () => {
      // Upload an asset
      const testFile = await createTestAsset('consistency-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      const assetId = uploadData.results[0].id;
      testAssetIds.push(assetId);

      // Get asset from assets API
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}`
      );
      const assetsData = await assetsResponse.json();
      const assetFromAPI = assetsData.assets.find((a: any) => a.id === assetId);

      // Get same record from photos table directly
      const { data: photoFromDB } = await supabase
        .from('photos')
        .select('*')
        .eq('id', assetId)
        .single();

      // Compare key fields
      expect(assetFromAPI).toMatchObject({
        id: photoFromDB.id,
        event_id: photoFromDB.event_id,
        preview_path: photoFromDB.preview_path,
        original_filename: photoFromDB.original_filename,
        file_size: photoFromDB.file_size,
        width: photoFromDB.width,
        height: photoFromDB.height,
        mime_type: photoFromDB.mime_type,
        approved: photoFromDB.approved,
      });
    });

    it('should reflect photo table changes in assets API', async () => {
      // Upload an asset
      const testFile = await createTestAsset('reflection-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      const assetId = uploadData.results[0].id;
      testAssetIds.push(assetId);

      // Directly update in photos table
      await supabase
        .from('photos')
        .update({
          approved: true,
          processing_status: 'completed',
        })
        .eq('id', assetId);

      // Check if changes are reflected in assets API
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=${testEventId}&approved=true`
      );

      const assetsData = await assetsResponse.json();
      const updatedAsset = assetsData.assets.find((a: any) => a.id === assetId);

      expect(updatedAsset).toBeDefined();
      expect(updatedAsset.approved).toBe(true);
      expect(updatedAsset.processing_status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // This would typically require mocking database failures
      // For now, test with invalid event ID
      const response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=00000000-0000-0000-0000-000000000000`
      );

      expect(response.status).toBe(200); // Should not fail, just return empty

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.assets).toHaveLength(0);
    });

    it('should provide meaningful error messages', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/assets?event_id=invalid&limit=-1`
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
      });
    });

    it('should handle malformed JSON in POST requests', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      expect(response.status).toBe(400);
    });
  });
});
