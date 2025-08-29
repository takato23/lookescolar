/**
 * Integration tests for folder-to-subjects mapping and photo count accuracy
 * Tests the critical relationship between folders, photos, and subjects
 * 
 * Validates:
 * - Photo count accuracy in folders
 * - Subject assignment and folder mapping
 * - Photo organization and movement
 * - Hierarchical folder structures
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('Folder-Photo Mapping Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEventId: string;
  let testFolderIds: string[] = [];
  let testPhotoIds: string[] = [];

  // Test image generator
  const createTestImage = async (name: string): Promise<File> => {
    const imageBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 200, g: 100, b: 50 }
      }
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
        name: 'Folder Mapping Test Event',
        date: new Date().toISOString().split('T')[0],
        location: 'Test Location',
        status: 'draft',
        school_name: 'Mapping Test School'
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
      // Comprehensive cleanup
      
      // Clean up storage files first
      if (testPhotoIds.length > 0) {
        const { data: photos } = await supabase
          .from('photos')
          .select('preview_path')
          .in('id', testPhotoIds);

        if (photos && photos.length > 0) {
          const PREVIEW_BUCKET = process.env.STORAGE_BUCKET_PREVIEW || 'photos';
          const filePaths = photos
            .map(p => p.preview_path)
            .filter(Boolean);
          
          if (filePaths.length > 0) {
            await supabase.storage
              .from(PREVIEW_BUCKET)
              .remove(filePaths);
          }
        }

        // Delete photo records
        await supabase
          .from('photos')
          .delete()
          .in('id', testPhotoIds);
      }

      // Delete folders
      if (testFolderIds.length > 0) {
        await supabase
          .from('folders')
          .delete()
          .in('id', testFolderIds);
      }

      // Delete event
      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  beforeEach(() => {
    testFolderIds = [];
    testPhotoIds = [];
  });

  afterEach(async () => {
    // Clean up test data
    if (testPhotoIds.length > 0) {
      await supabase
        .from('photos')
        .delete()
        .in('id', testPhotoIds);
    }

    if (testFolderIds.length > 0) {
      await supabase
        .from('folders')
        .delete()
        .in('id', testFolderIds);
    }
  });

  describe('1. Folder Creation and Photo Count', () => {
    it('should create folders with zero photo count initially', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Empty Test Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      const folderId = data.folder.id;
      testFolderIds.push(folderId);

      // Verify folder appears in listing with zero photos
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const createdFolder = listData.folders.find((f: any) => f.id === folderId);
      expect(createdFolder).toMatchObject({
        id: folderId,
        name: 'Empty Test Folder',
        event_id: testEventId,
        photo_count: 0
      });
    });

    it('should accurately count photos after uploads and assignments', async () => {
      // Create a folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Count Test Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Upload 3 photos
      const files = await Promise.all([
        createTestImage('count-1.jpg'),
        createTestImage('count-2.jpg'),
        createTestImage('count-3.jpg')
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
      testPhotoIds.push(...photoIds);

      // Assign all photos to the folder
      const { error: assignError } = await supabase
        .from('photos')
        .update({ folder_id: folderId })
        .in('id', photoIds);

      expect(assignError).toBeNull();

      // Check folder photo count
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const updatedFolder = listData.folders.find((f: any) => f.id === folderId);
      expect(updatedFolder.photo_count).toBe(3);
    });

    it('should update photo counts when photos are moved between folders', async () => {
      // Create two folders
      const folder1Response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Source Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folder2Response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Destination Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folder1Data = await folder1Response.json();
      const folder2Data = await folder2Response.json();
      const folder1Id = folder1Data.folder.id;
      const folder2Id = folder2Data.folder.id;

      testFolderIds.push(folder1Id, folder2Id);

      // Upload and assign photos to folder1
      const files = await Promise.all([
        createTestImage('move-1.jpg'),
        createTestImage('move-2.jpg')
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
      testPhotoIds.push(...photoIds);

      // Assign photos to folder1
      await supabase
        .from('photos')
        .update({ folder_id: folder1Id })
        .in('id', photoIds);

      // Verify initial counts
      let listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      let listData = await listResponse.json();

      let folder1 = listData.folders.find((f: any) => f.id === folder1Id);
      let folder2 = listData.folders.find((f: any) => f.id === folder2Id);

      expect(folder1.photo_count).toBe(2);
      expect(folder2.photo_count).toBe(0);

      // Move one photo to folder2
      await supabase
        .from('photos')
        .update({ folder_id: folder2Id })
        .eq('id', photoIds[0]);

      // Verify updated counts
      listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      listData = await listResponse.json();

      folder1 = listData.folders.find((f: any) => f.id === folder1Id);
      folder2 = listData.folders.find((f: any) => f.id === folder2Id);

      expect(folder1.photo_count).toBe(1);
      expect(folder2.photo_count).toBe(1);
    });
  });

  describe('2. Photo Organization by Subjects', () => {
    it('should support subject-based folder organization', async () => {
      // Create a folder for a specific subject
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grade 5A',
          event_id: testEventId,
          parent_id: null,
          subject_type: 'class',
          metadata: { grade: '5', section: 'A' }
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Create a subject/student
      const { data: subject, error: subjectError } = await supabase
        .from('students')
        .insert({
          name: 'Test Student',
          event_id: testEventId,
          grade: '5A',
          email: 'test@example.com'
        })
        .select('id')
        .single();

      expect(subjectError).toBeNull();

      // Upload photos and assign to subject
      const testFile = await createTestImage('subject-photo.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoId = uploadData.results[0].id;
      testPhotoIds.push(photoId);

      // Link photo to subject and folder
      await supabase
        .from('photos')
        .update({ 
          subject_id: subject.id,
          folder_id: folderId 
        })
        .eq('id', photoId);

      // Verify organization
      const { data: organizedPhoto } = await supabase
        .from('photos')
        .select(`
          id,
          subject_id,
          folder_id,
          students:subject_id(name, grade)
        `)
        .eq('id', photoId)
        .single();

      expect(organizedPhoto).toMatchObject({
        subject_id: subject.id,
        folder_id: folderId,
        students: {
          name: 'Test Student',
          grade: '5A'
        }
      });
    });

    it('should handle bulk photo assignment to folders', async () => {
      // Create a folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bulk Assignment Test',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Upload multiple photos
      const files = await Promise.all([
        createTestImage('bulk-1.jpg'),
        createTestImage('bulk-2.jpg'),
        createTestImage('bulk-3.jpg'),
        createTestImage('bulk-4.jpg')
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
      testPhotoIds.push(...photoIds);

      // Bulk assign to folder
      const { error: bulkAssignError } = await supabase
        .from('photos')
        .update({ folder_id: folderId })
        .in('id', photoIds);

      expect(bulkAssignError).toBeNull();

      // Verify folder count
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const updatedFolder = listData.folders.find((f: any) => f.id === folderId);
      expect(updatedFolder.photo_count).toBe(4);

      // Verify all photos are assigned
      const { data: assignedPhotos } = await supabase
        .from('photos')
        .select('id, folder_id')
        .in('id', photoIds);

      assignedPhotos?.forEach(photo => {
        expect(photo.folder_id).toBe(folderId);
      });
    });
  });

  describe('3. Hierarchical Folder Structure', () => {
    it('should support parent-child folder relationships', async () => {
      // Create parent folder
      const parentResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grade 5',
          event_id: testEventId,
          parent_id: null
        })
      });

      const parentData = await parentResponse.json();
      const parentId = parentData.folder.id;
      testFolderIds.push(parentId);

      // Create child folders
      const child1Response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Section A',
          event_id: testEventId,
          parent_id: parentId
        })
      });

      const child2Response = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Section B',
          event_id: testEventId,
          parent_id: parentId
        })
      });

      const child1Data = await child1Response.json();
      const child2Data = await child2Response.json();
      const child1Id = child1Data.folder.id;
      const child2Id = child2Data.folder.id;

      testFolderIds.push(child1Id, child2Id);

      // Verify hierarchy in listing
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const parentFolder = listData.folders.find((f: any) => f.id === parentId);
      const child1Folder = listData.folders.find((f: any) => f.id === child1Id);
      const child2Folder = listData.folders.find((f: any) => f.id === child2Id);

      expect(parentFolder).toMatchObject({
        id: parentId,
        name: 'Grade 5',
        parent_id: null
      });

      expect(child1Folder).toMatchObject({
        id: child1Id,
        name: 'Section A',
        parent_id: parentId
      });

      expect(child2Folder).toMatchObject({
        id: child2Id,
        name: 'Section B',
        parent_id: parentId
      });
    });

    it('should calculate nested photo counts correctly', async () => {
      // Create hierarchy: Grade 6 -> Section A
      const parentResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grade 6',
          event_id: testEventId,
          parent_id: null
        })
      });

      const childResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Section A',
          event_id: testEventId,
          parent_id: (await parentResponse.json()).folder.id
        })
      });

      const parentId = (await parentResponse.json()).folder.id;
      const childId = (await childResponse.json()).folder.id;
      testFolderIds.push(parentId, childId);

      // Upload photos to child folder
      const files = await Promise.all([
        createTestImage('nested-1.jpg'),
        createTestImage('nested-2.jpg')
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
      testPhotoIds.push(...photoIds);

      // Assign to child folder
      await supabase
        .from('photos')
        .update({ folder_id: childId })
        .in('id', photoIds);

      // Verify counts
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const parentFolder = listData.folders.find((f: any) => f.id === parentId);
      const childFolder = listData.folders.find((f: any) => f.id === childId);

      expect(childFolder.photo_count).toBe(2);
      // Parent folder direct count should be 0 (photos are in child)
      expect(parentFolder.photo_count).toBe(0);
    });
  });

  describe('4. Photo Retrieval by Folder', () => {
    it('should retrieve photos assigned to specific folders', async () => {
      // Create folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Retrieval Test Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Upload photos
      const files = await Promise.all([
        createTestImage('retrieve-1.jpg'),
        createTestImage('retrieve-2.jpg')
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
      testPhotoIds.push(...photoIds);

      // Assign to folder
      await supabase
        .from('photos')
        .update({ folder_id: folderId })
        .in('id', photoIds);

      // Retrieve photos by folder
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?folder_id=${folderId}`
      );

      expect(assetsResponse.status).toBe(200);

      const assetsData = await assetsResponse.json();
      expect(assetsData.success).toBe(true);
      expect(assetsData.assets).toHaveLength(2);

      // Verify all returned photos belong to the folder
      assetsData.assets.forEach((asset: any) => {
        expect(asset.folder_id).toBe(folderId);
        expect(photoIds).toContain(asset.id);
      });
    });

    it('should handle empty folder requests gracefully', async () => {
      // Create empty folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Empty Retrieval Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Request photos from empty folder
      const assetsResponse = await fetch(
        `${API_BASE_URL}/api/admin/assets?folder_id=${folderId}`
      );

      expect(assetsResponse.status).toBe(200);

      const assetsData = await assetsResponse.json();
      expect(assetsData.success).toBe(true);
      expect(assetsData.assets).toHaveLength(0);
      expect(assetsData.totalCount).toBe(0);
    });
  });

  describe('5. Data Consistency and Integrity', () => {
    it('should maintain referential integrity when deleting folders', async () => {
      // Create folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Delete Test Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;

      // Upload and assign photo
      const testFile = await createTestImage('integrity-test.jpg');
      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', testFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoId = uploadData.results[0].id;
      testPhotoIds.push(photoId);

      await supabase
        .from('photos')
        .update({ folder_id: folderId })
        .eq('id', photoId);

      // Delete folder
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      expect(deleteError).toBeNull();

      // Verify photo folder_id is cleared (or handle as per business rules)
      const { data: orphanedPhoto } = await supabase
        .from('photos')
        .select('folder_id')
        .eq('id', photoId)
        .single();

      // Depending on DB constraints, this should either be null or the photo should be deleted
      expect(orphanedPhoto.folder_id).toBeNull();
    });

    it('should handle concurrent photo assignments correctly', async () => {
      // Create folder
      const folderResponse = await fetch(`${API_BASE_URL}/api/admin/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Concurrent Test Folder',
          event_id: testEventId,
          parent_id: null
        })
      });

      const folderData = await folderResponse.json();
      const folderId = folderData.folder.id;
      testFolderIds.push(folderId);

      // Upload multiple photos
      const files = await Promise.all(
        Array(10).fill(0).map((_, i) => createTestImage(`concurrent-${i}.jpg`))
      );

      const formData = new FormData();
      formData.append('eventId', testEventId);
      files.forEach(file => formData.append('files', file));

      const uploadResponse = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const photoIds = uploadData.results.map((r: any) => r.id);
      testPhotoIds.push(...photoIds);

      // Simulate concurrent assignments
      const assignments = photoIds.map(photoId =>
        supabase
          .from('photos')
          .update({ folder_id: folderId })
          .eq('id', photoId)
      );

      const results = await Promise.all(assignments);

      // All assignments should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Verify final count is correct
      const listResponse = await fetch(`${API_BASE_URL}/api/admin/folders`);
      const listData = await listResponse.json();

      const updatedFolder = listData.folders.find((f: any) => f.id === folderId);
      expect(updatedFolder.photo_count).toBe(10);
    });
  });
});