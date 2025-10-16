import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
  process.env.SUPABASE_ANON_KEY ??= 'anon-key';
  return {};
});

const supabaseClientMock = {
  from: vi.fn(),
};

const supabaseServiceMock = {
  from: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({
        data: { path: 'events/test/uploads/file.webp' },
        error: null,
      })),
      remove: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
};

const optimizerMock = vi.hoisted(() => ({
  processForFreeTier: vi.fn(),
}));

const qrDetectionMock = vi.hoisted(() => ({
  detectQRCodesInImage: vi.fn(async () => []),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => supabaseClientMock),
  createServerSupabaseServiceClient: vi.fn(async () => supabaseServiceMock),
}));

vi.mock('@/lib/services/free-tier-optimizer', () => ({
  FreeTierOptimizer: {
    processForFreeTier: optimizerMock.processForFreeTier,
  },
}));

vi.mock('@/lib/services/qr-detection.service', () => ({
  qrDetectionService: {
    detectQRCodesInImage: qrDetectionMock.detectQRCodesInImage,
  },
}));

vi.mock('@/lib/security/validation', () => ({
  SecurityValidator: {
    isAllowedIP: vi.fn(() => true),
    isSuspiciousUserAgent: vi.fn(() => false),
    isAllowedContentType: vi.fn(() => true),
    isSafeFilename: vi.fn(() => true),
    sanitizeFilename: vi.fn((name: string) => name),
    isValidImageDimensions: vi.fn(() => true),
    isValidStoragePath: vi.fn(() => true),
  },
  SecuritySanitizer: {
    sanitizeText: (value: string) => value,
  },
  SECURITY_CONSTANTS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024,
  },
}));

vi.mock('@/lib/services/watermark', () => ({
  validateImage: vi.fn(async () => true),
  processImageBatch: vi.fn(),
}));

vi.mock('@/lib/middleware/auth.middleware', () => ({
  AuthMiddleware: {
    withAuth: (handler: any) => async (request: NextRequest) =>
      handler(request, { isAdmin: true, user: { id: 'admin-user' } }),
  },
  SecurityLogger: {
    logResourceAccess: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}));

vi.mock('@/lib/middleware/rate-limit.middleware', () => ({
  RateLimitMiddleware: {
    withRateLimit: (handler: any) => handler,
  },
}));

const { POST } = await import('@/app/api/admin/photos/upload/route');

type StubFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer | Buffer>;
};

const createStubFile = (buffer: Buffer, name: string): StubFile => ({
  name,
  type: 'image/jpeg',
  size: buffer.length,
  async arrayBuffer() {
    return buffer;
  },
});

const createMockRequest = (eventId: string, files: StubFile[]) =>
  ({
    method: 'POST',
    headers: new Headers(),
    ip: '127.0.0.1',
    formData: async () => ({
      get: (key: string) => (key === 'eventId' ? eventId : null),
      getAll: (key: string) => (key === 'files' ? files : []),
    }),
  }) as unknown as NextRequest;

describe('photo upload partial processing', () => {
  const EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();

    supabaseClientMock.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: EVENT_ID,
                  name: 'Test Event',
                  created_by: 'admin-user',
                },
                error: null,
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const inserted: any[] = [];
    supabaseServiceMock.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  name: 'Test Event',
                  school_name: 'Look Escolar',
                  created_by: 'admin-user',
                },
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'photos') {
        return {
          insert: vi.fn((payload) => {
            inserted.push(payload);
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: `photo-${inserted.length}`,
                    preview_path: payload.preview_path,
                  },
                  error: null,
                })),
              })),
            };
          }),
          get inserted() {
            return inserted;
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('preserves buffer association when intermediate processing fails', async () => {
    const buffers = ['alpha', 'bravo', 'charlie'].map((content) =>
      Buffer.from(content)
    );
    const files = buffers.map((buffer, index) =>
      createStubFile(buffer, `file${index + 1}.jpg`)
    );

    optimizerMock.processForFreeTier
      .mockResolvedValueOnce({
        processedBuffer: Buffer.from('processed-alpha'),
        finalDimensions: { width: 640, height: 480 },
        actualSizeKB: 20,
        compressionLevel: 2,
      })
      .mockRejectedValueOnce(new Error('processing failed'))
      .mockResolvedValueOnce({
        processedBuffer: Buffer.from('processed-charlie'),
        finalDimensions: { width: 640, height: 480 },
        actualSizeKB: 18,
        compressionLevel: 3,
      });

    const response = await POST(createMockRequest(EVENT_ID, files));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results.map((r: any) => r.filename)).toEqual([
      'file1.jpg',
      'file3.jpg',
    ]);

    expect(qrDetectionMock.detectQRCodesInImage).toHaveBeenCalledTimes(2);
    const [, secondCall] = qrDetectionMock.detectQRCodesInImage.mock.calls;
    expect(Buffer.compare(secondCall[0], buffers[2])).toBe(0);
  });
});
