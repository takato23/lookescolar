import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { qrService } from '@/lib/services/qr.service';

// Mock dependencies
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'qr-code-id-123',
              event_id: 'event-123',
              code_value: 'LKSTUDENT_test-token',
              token: 'test-token',
            },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'qr-code-id-123',
              event_id: 'event-123',
              code_value: 'LKSTUDENT_test-token',
              token: 'test-token',
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(() =>
    Promise.resolve('data:image/png;base64,test-image-data')
  ),
  toBuffer: vi.fn(() => Promise.resolve(Buffer.from('test-buffer'))),
}));

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: vi.fn(() => 'test-request-id-123'),
  },
});

describe('QR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateStudentIdentificationQR', () => {
    it('should generate QR code for student identification', async () => {
      const result = await qrService.generateStudentIdentificationQR(
        'event-123',
        'student-456',
        'John Doe',
        'course-789'
      );

      expect(result).toEqual({
        qrCode: 'qr-code-id-123',
        dataUrl: 'data:image/png;base64,test-image-data',
        token: expect.any(String),
      });
    });

    it('should generate QR code with custom options', async () => {
      const options = {
        size: 300,
        errorCorrectionLevel: 'H' as const,
        margin: 5,
      };

      const result = await qrService.generateStudentIdentificationQR(
        'event-123',
        'student-456',
        'Jane Smith',
        undefined,
        options
      );

      expect(result.qrCode).toBe('qr-code-id-123');
      expect(result.dataUrl).toBe('data:image/png;base64,test-image-data');
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      createClientMock.mockReturnValueOnce({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => ({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      await expect(
        qrService.generateStudentIdentificationQR(
          'event-123',
          'student-456',
          'John Doe'
        )
      ).rejects.toThrow('Failed to store student QR code: Database error');
    });
  });

  describe('generateBatchStudentQRCodes', () => {
    it('should generate QR codes for multiple students', async () => {
      const request = {
        eventId: 'event-123',
        students: [
          { id: 'student-1', name: 'John Doe', courseId: 'course-1' },
          { id: 'student-2', name: 'Jane Smith', courseId: 'course-2' },
        ],
        options: {
          size: 200,
          errorCorrectionLevel: 'M' as const,
        },
      };

      const result = await qrService.generateBatchStudentQRCodes(request);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        studentId: 'student-1',
        qrCode: 'qr-code-id-123',
        dataUrl: 'data:image/png;base64,test-image-data',
        token: expect.any(String),
      });
    });

    it('should handle partial failures in batch generation', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      let callCount = 0;
      createClientMock.mockImplementation(() => ({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => {
                callCount++;
                if (callCount === 1) {
                  return {
                    data: {
                      id: 'qr-code-id-123',
                      event_id: 'event-123',
                      code_value: 'LKSTUDENT_test-token',
                      token: 'test-token',
                    },
                    error: null,
                  };
                } else {
                  return {
                    data: null,
                    error: { message: 'Database error' },
                  };
                }
              },
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }));

      const request = {
        eventId: 'event-123',
        students: [
          { id: 'student-1', name: 'John Doe' },
          { id: 'student-2', name: 'Jane Smith' },
        ],
      };

      const result = await qrService.generateBatchStudentQRCodes(request);

      expect(result).toHaveLength(2);
      expect(result[0].error).toBeUndefined();
      expect(result[1].error).toBeDefined();
    });
  });

  describe('validateStudentQRCode', () => {
    it('should validate a valid student QR code', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      createClientMock.mockReturnValueOnce({
        from: (table: string) => {
          if (table === 'codes') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: 'qr-code-id-123',
                      event_id: 'event-123',
                      code_value: 'LKSTUDENT_test-token',
                      token: 'test-token',
                      title: 'QR Identificación - John Doe',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'subjects') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: 'student-456',
                      name: 'John Doe',
                      metadata: {},
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      });

      const result = await qrService.validateStudentQRCode(
        'LKSTUDENT_test-token',
        'event-123'
      );

      expect(result).toEqual({
        id: 'qr-code-id-123',
        eventId: 'event-123',
        courseId: undefined,
        studentId: 'student-456',
        codeValue: 'LKSTUDENT_test-token',
        token: 'test-token',
        type: 'student_identification',
        metadata: {
          title: 'QR Identificación - John Doe',
          studentName: 'John Doe',
          createdAt: undefined,
        },
      });
    });

    it('should return null for invalid QR code format', async () => {
      const result = await qrService.validateStudentQRCode(
        'INVALID_FORMAT_token',
        'event-123'
      );

      expect(result).toBeNull();
    });

    it('should return null for non-existent QR code', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      createClientMock.mockReturnValueOnce({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => ({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await qrService.validateStudentQRCode(
        'LKSTUDENT_nonexistent-token',
        'event-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('getEventStudentQRCodes', () => {
    it('should retrieve all student QR codes for an event', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      let callCount = 0;
      createClientMock.mockImplementation(() => ({
        from: (table: string) => {
          if (table === 'codes') {
            return {
              select: () => ({
                eq: () => ({
                  like: () => ({
                    order: () => ({
                      data: [
                        {
                          id: 'qr-code-1',
                          event_id: 'event-123',
                          code_value: 'LKSTUDENT_token1',
                          token: 'token1',
                          title: 'QR Identificación - Student 1',
                        },
                        {
                          id: 'qr-code-2',
                          event_id: 'event-123',
                          code_value: 'LKSTUDENT_token2',
                          token: 'token2',
                          title: 'QR Identificación - Student 2',
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          } else if (table === 'subjects') {
            callCount++;
            return {
              select: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: `student-${callCount}`,
                      name: `Student ${callCount}`,
                      metadata: {},
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      }));

      const result = await qrService.getEventStudentQRCodes('event-123');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('student_identification');
      expect(result[0].metadata?.studentName).toBe('Student 1');
    });

    it('should return empty array for event with no QR codes', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      createClientMock.mockReturnValueOnce({
        from: () => ({
          select: () => ({
            eq: () => ({
              like: () => ({
                order: () => ({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await qrService.getEventStudentQRCodes('event-456');

      expect(result).toEqual([]);
    });
  });

  describe('getQRCodeStats', () => {
    it('should calculate QR code statistics correctly', async () => {
      const mockSupabase = await import('@supabase/supabase-js');
      const createClientMock = mockSupabase.createClient as any;

      let tableCallCount = 0;
      createClientMock.mockImplementation(() => ({
        from: (table: string) => {
          tableCallCount++;

          if (table === 'codes') {
            return {
              select: () => ({
                eq: () => ({
                  like: () => ({
                    data: [
                      { id: 'qr-1', is_published: true },
                      { id: 'qr-2', is_published: true },
                      { id: 'qr-3', is_published: false },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'subjects') {
            return {
              select: () => ({
                eq: () => ({
                  data: [
                    { id: 'student-1', qr_code: 'qr-1' },
                    { id: 'student-2', qr_code: 'qr-2' },
                    { id: 'student-3', qr_code: null },
                    { id: 'student-4', qr_code: null },
                  ],
                  error: null,
                }),
              }),
            };
          } else if (table === 'photos') {
            return {
              select: () => ({
                eq: () => ({
                  not: () => ({
                    data: [
                      { id: 'photo-1', code_id: 'qr-1' },
                      { id: 'photo-2', code_id: 'qr-1' },
                      { id: 'photo-3', code_id: 'qr-2' },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }

          return {};
        },
      }));

      const result = await qrService.getQRCodeStats('event-123');

      expect(result).toEqual({
        totalStudentCodes: 3,
        activeStudentCodes: 2,
        detectedStudentCodes: 2, // qr-1 and qr-2 appear in photos
        studentsWithCodes: 2,
        studentsWithoutCodes: 2,
      });
    });
  });

  describe('QR Config', () => {
    it('should return correct QR configuration', () => {
      const config = qrService.getQRConfig();

      expect(config).toEqual({
        recommendedSizes: [150, 200, 300, 400],
        errorLevels: [
          { level: 'L', description: '~7% - Para uso digital' },
          { level: 'M', description: '~15% - Recomendado para impresión' },
          {
            level: 'Q',
            description: '~25% - Para ambientes con interferencia',
          },
          { level: 'H', description: '~30% - Máxima corrección de errores' },
        ],
        printRecommendations: {
          dpi: 300,
          sizeInches: 0.5,
          pixelSize: 150,
        },
      });
    });
  });
});
