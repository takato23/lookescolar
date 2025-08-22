import { describe, test, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as QRDecode } from '@/app/api/admin/qr/decode/route';
import { GET as StudentLookup } from '@/app/api/admin/students/[id]/route';
import { POST as BatchTagging } from '@/app/api/admin/tagging/batch/route';

describe('QR Tagging Workflow API Endpoints', () => {
  const mockStudentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const mockEventId = 'event123-4567-8901-2345-678901234567';
  const mockPhotoIds = [
    'photo123-4567-8901-2345-678901234567',
    'photo456-7890-1234-5678-901234567890',
  ];

  describe('QR Decode Endpoint', () => {
    test('should decode valid QR code format', async () => {
      const validQR = `STUDENT:${mockStudentId}:John Doe:${mockEventId}`;
      const request = new NextRequest('http://localhost:3000/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQR }),
      });

      const response = await QRDecode(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
      expect(data.student.id).toBe(mockStudentId);
      expect(data.metadata.qr_format).toBe('valid');
    });

    test('should reject invalid QR code format', async () => {
      const invalidQR = 'INVALID:FORMAT:HERE';
      const request = new NextRequest('http://localhost:3000/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: invalidQR }),
      });

      const response = await QRDecode(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid QR code format');
      expect(data.details).toContain('Expected format');
    });

    test('should reject empty QR code', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: '' }),
      });

      const response = await QRDecode(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    test('should validate UUID format in QR code', async () => {
      const invalidUuidQR = 'STUDENT:invalid-uuid:John Doe:also-invalid-uuid';
      const request = new NextRequest('http://localhost:3000/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: invalidUuidQR }),
      });

      const response = await QRDecode(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid QR code format');
      expect(data.details).toContain('valid UUIDs');
    });
  });

  describe('Student Lookup Endpoint', () => {
    test('should return student details with valid UUID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/admin/students/${mockStudentId}`, {
        method: 'GET',
      });

      const response = await StudentLookup(request, { params: { id: mockStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
      expect(data.student.id).toBe(mockStudentId);
      expect(data.student.photo_stats).toBeDefined();
      expect(data.student.token_info).toBeDefined();
      expect(data.metadata).toBeDefined();
    });

    test('should reject invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format';
      const request = new NextRequest(`http://localhost:3000/api/admin/students/${invalidId}`, {
        method: 'GET',
      });

      const response = await StudentLookup(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.message).toContain('valid UUID');
    });
  });

  describe('Batch Tagging Endpoint', () => {
    describe('QR Tagging Workflow', () => {
      test('should accept QR tagging format (simplified)', async () => {
        const qrTaggingPayload = {
          eventId: mockEventId,
          photoIds: mockPhotoIds,
          studentId: mockStudentId,
        };

        const request = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qrTaggingPayload),
        });

        const response = await BatchTagging(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.workflowType).toBe('qr_tagging');
        expect(data.message).toContain('photos to student');
      });

      test('should validate QR tagging payload', async () => {
        const invalidPayload = {
          eventId: 'invalid-uuid',
          photoIds: mockPhotoIds,
          studentId: mockStudentId,
        };

        const request = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidPayload),
        });

        const response = await BatchTagging(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });

      test('should enforce photo limit for QR tagging', async () => {
        const tooManyPhotos = Array.from({ length: 60 }, (_, i) => 
          `photo${i}-4567-8901-2345-678901234567`
        );

        const invalidPayload = {
          eventId: mockEventId,
          photoIds: tooManyPhotos,
          studentId: mockStudentId,
        };

        const request = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidPayload),
        });

        const response = await BatchTagging(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });
    });

    describe('Standard Batch Workflow', () => {
      test('should accept standard batch format', async () => {
        const standardPayload = {
          eventId: mockEventId,
          assignments: [
            { photoId: mockPhotoIds[0], subjectId: mockStudentId },
            { photoId: mockPhotoIds[1], subjectId: mockStudentId },
          ],
        };

        const request = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardPayload),
        });

        const response = await BatchTagging(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.workflowType).toBe('standard_batch');
      });

      test('should validate assignment array limits', async () => {
        const tooManyAssignments = Array.from({ length: 150 }, (_, i) => ({
          photoId: `photo${i}-4567-8901-2345-678901234567`,
          subjectId: mockStudentId,
        }));

        const invalidPayload = {
          eventId: mockEventId,
          assignments: tooManyAssignments,
        };

        const request = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidPayload),
        });

        const response = await BatchTagging(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });
    });
  });

  describe('Integration Flow', () => {
    test('should handle complete QR tagging workflow', async () => {
      // Step 1: Decode QR
      const validQR = `STUDENT:${mockStudentId}:Jane Smith:${mockEventId}`;
      const qrRequest = new NextRequest('http://localhost:3000/api/admin/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: validQR }),
      });

      const qrResponse = await QRDecode(qrRequest);
      const qrData = await qrResponse.json();

      expect(qrResponse.status).toBe(200);
      expect(qrData.success).toBe(true);

      // Step 2: Use student ID from QR decode for batch tagging
      const tagRequest = new NextRequest('http://localhost:3000/api/admin/tagging/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: mockEventId,
          photoIds: mockPhotoIds,
          studentId: qrData.student.id,
        }),
      });

      const tagResponse = await BatchTagging(tagRequest);
      const tagData = await tagResponse.json();

      expect(tagResponse.status).toBe(200);
      expect(tagData.success).toBe(true);
      expect(tagData.data.workflowType).toBe('qr_tagging');

      // Step 3: Verify student lookup includes updated stats
      const lookupRequest = new NextRequest(`http://localhost:3000/api/admin/students/${mockStudentId}`, {
        method: 'GET',
      });

      const lookupResponse = await StudentLookup(lookupRequest, { params: { id: mockStudentId } });
      const lookupData = await lookupResponse.json();

      expect(lookupResponse.status).toBe(200);
      expect(lookupData.success).toBe(true);
      expect(lookupData.student.photo_stats).toBeDefined();
    });
  });
});