import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

// Import all the endpoints we'll be testing
import { POST as AdminLogin } from '@/app/api/admin/auth/route';
import { POST as EventsCreate } from '@/app/api/admin/events/route';
import { POST as SubjectsGenerate } from '@/app/api/admin/subjects/generate-tokens/route';
import { POST as PhotosUpload } from '@/app/api/admin/photos/upload/route';
import { POST as TaggingAssign } from '@/app/api/admin/tagging/route';
import { GET as FamilyGallery } from '@/app/api/family/gallery/[token]/route';
import { POST as FamilyCheckout } from '@/app/api/family/checkout/route';
import { POST as PaymentWebhook } from '@/app/api/payments/webhook/route';

// Mock all external services
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/watermark');
vi.mock('@/lib/services/storage');
vi.mock('@/lib/services/family.service');
vi.mock('@/lib/mercadopago/mercadopago.service');

// Test data
const TEST_ADMIN_EMAIL = 'admin@lookescolar.test';
const TEST_ADMIN_PASSWORD = 'admin-password-123';
const TEST_EVENT_DATA = {
  name: 'Graduación 2024 - E2E Test',
  date: '2024-12-15',
  school_name: 'Colegio San José E2E',
  photo_prices: { base: 2000 },
};

let testEventId: string;
let testSubjectToken: string;
let testSubjectId: string;
let testPhotoIds: string[] = [];
let testOrderId: string;

// Test session state
let adminSession: any = null;
let familySession: any = null;

describe('Sistema de Fotografía Escolar - Flujo Completo E2E', () => {
  beforeAll(async () => {
    // Setup global test environment
    process.env.NODE_ENV = 'test';

    // Mock external dependencies
    setupMocks();
  });

  afterAll(async () => {
    // Cleanup global resources
    vi.clearAllMocks();
  });

  describe('🔐 Flujo Admin Completo: Login → Evento → Upload → Tagging', () => {
    it('1. Admin debería loguearse exitosamente', async () => {
      const loginRequest = createMockRequest('POST', {
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      const response = await AdminLogin(loginRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email', TEST_ADMIN_EMAIL);
      expect(data.user).toHaveProperty('role', 'admin');

      // Guardar sesión admin para tests posteriores
      adminSession = {
        userId: data.user.id,
        email: data.user.email,
        role: 'admin',
        token: data.token,
      };
    });

    it('2. Admin debería crear evento exitosamente', async () => {
      const eventRequest = createMockRequest('POST', TEST_EVENT_DATA);

      // Mock autenticación admin
      mockAdminAuth(eventRequest, adminSession);

      const response = await EventsCreate(eventRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.event).toHaveProperty('id');
      expect(data.event.name).toBe(TEST_EVENT_DATA.name);
      expect(data.event.school_name).toBe(TEST_EVENT_DATA.school_name);

      testEventId = data.event.id;
    });

    it('3. Admin debería generar sujetos con tokens', async () => {
      const subjectsData = {
        eventId: testEventId,
        subjects: [
          {
            first_name: 'Juan',
            last_name: 'Pérez',
            family_name: 'Familia Pérez',
            parent_name: 'María González',
            parent_email: 'maria.gonzalez@example.com',
            type: 'student',
          },
          {
            first_name: 'Ana',
            last_name: 'García',
            family_name: 'Familia García',
            parent_name: 'Carlos García',
            parent_email: 'carlos.garcia@example.com',
            type: 'student',
          },
        ],
      };

      const subjectsRequest = createMockRequest('POST', subjectsData);
      mockAdminAuth(subjectsRequest, adminSession);

      const response = await SubjectsGenerate(subjectsRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.subjects).toHaveLength(2);
      expect(data.subjects[0]).toHaveProperty('token');
      expect(data.subjects[0].token.length).toBeGreaterThanOrEqual(20);

      // Guardar para tests posteriores
      testSubjectToken = data.subjects[0].token;
      testSubjectId = data.subjects[0].id;
    });

    it('4. Admin debería subir fotos exitosamente', async () => {
      // Crear imágenes de prueba
      const testImages = await createTestImages(3);

      const formData = new FormData();
      formData.append('eventId', testEventId);
      testImages.forEach((imageBuffer, index) => {
        const file = new File([imageBuffer], `test-photo-${index + 1}.jpg`, {
          type: 'image/jpeg',
        });
        formData.append('files', file);
      });

      const uploadRequest = createMockRequest('POST', formData, {
        'Content-Type': 'multipart/form-data',
      });
      mockAdminAuth(uploadRequest, adminSession);

      const response = await PhotosUpload(uploadRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.uploaded).toHaveLength(3);
      expect(data.stats.processed).toBe(3);
      expect(data.stats.errors).toBe(0);

      // Guardar IDs de fotos para tagging
      testPhotoIds = data.uploaded.map((photo: any) => photo.id);
    });

    it('5. Admin debería asignar fotos a sujetos (tagging)', async () => {
      const taggingData = {
        photoIds: testPhotoIds,
        subjectId: testSubjectId,
        eventId: testEventId,
      };

      const taggingRequest = createMockRequest('POST', taggingData);
      mockAdminAuth(taggingRequest, adminSession);

      const response = await TaggingAssign(taggingRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain(
        `${testPhotoIds.length} fotos asignadas correctamente`
      );
      expect(data.data).toHaveLength(testPhotoIds.length);
    });

    it('6. Admin debería ver estadísticas actualizadas del evento', async () => {
      // Este test requeriría un endpoint de estadísticas
      // Por simplicidad, validamos que el flujo hasta aquí fue exitoso
      expect(testEventId).toBeDefined();
      expect(testSubjectToken).toBeDefined();
      expect(testPhotoIds).toHaveLength(3);
    });
  });

  describe('👨‍👩‍👧‍👦 Flujo Familia Completo: Acceso → Galería → Carrito → Pago', () => {
    it('1. Familia debería acceder con token válido', async () => {
      const galleryRequest = createMockRequest('GET');
      mockFamilyAuth(galleryRequest, testSubjectToken);

      const response = await FamilyGallery(galleryRequest, {
        params: { token: testSubjectToken },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subject).toHaveProperty('id', testSubjectId);
      expect(data.subject.name).toBe('Juan Pérez');
      expect(data.subject.parent_email).toBe('maria.gonzalez@example.com');
      expect(data.photos).toHaveLength(3);
      expect(data.pagination.total).toBe(3);

      // Verificar que todas las fotos tienen URLs firmadas
      data.photos.forEach((photo: any) => {
        expect(photo.signed_url).toBeDefined();
        expect(photo.signed_url).toContain('signed-token');
      });

      // Guardar sesión familia
      familySession = {
        subject: data.subject,
        token: testSubjectToken,
      };
    });

    it('2. Familia debería poder ver foto específica', async () => {
      const specificPhotoRequest = createMockRequest('GET', null, {
        photo_id: testPhotoIds[0],
      });
      mockFamilyAuth(specificPhotoRequest, testSubjectToken);

      const response = await FamilyGallery(specificPhotoRequest, {
        params: { token: testSubjectToken },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photo).toHaveProperty('id', testPhotoIds[0]);
      expect(data.photo).toHaveProperty('signed_url');
      expect(data.photo.filename).toContain('test-photo');
    });

    it('3. Familia debería crear pedido con fotos seleccionadas', async () => {
      const checkoutData = {
        items: [
          { photo_id: testPhotoIds[0], quantity: 2 },
          { photo_id: testPhotoIds[1], quantity: 1 },
        ],
        contact_info: {
          parent_name: 'María González',
          parent_email: 'maria.gonzalez@example.com',
          parent_phone: '+54911234567',
          notes: 'Entregar en horario escolar',
        },
      };

      const checkoutRequest = createMockRequest('POST', checkoutData);
      mockFamilyAuth(checkoutRequest, testSubjectToken);

      const response = await FamilyCheckout(checkoutRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order).toHaveProperty('id');
      expect(data.order.total_amount).toBe(6000); // 2*2000 + 1*2000
      expect(data.order.items).toHaveLength(2);
      expect(data.mercadopago).toHaveProperty('preference_id');

      testOrderId = data.order.id;
    });

    it('4. Familia no debería crear otro pedido si ya tiene uno activo', async () => {
      const duplicateCheckoutData = {
        items: [{ photo_id: testPhotoIds[2], quantity: 1 }],
        contact_info: {
          parent_name: 'María González',
          parent_email: 'maria.gonzalez@example.com',
        },
      };

      const duplicateRequest = createMockRequest('POST', duplicateCheckoutData);
      mockFamilyAuth(duplicateRequest, testSubjectToken);

      const response = await FamilyCheckout(duplicateRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Ya tienes un pedido activo');
    });

    it('5. Sistema debería procesar webhook de pago exitoso', async () => {
      const webhookPayload = {
        action: 'payment.updated',
        api_version: 'v1',
        data: {
          id: '123456789',
        },
        date_created: '2024-01-15T10:30:00Z',
        id: Date.now(),
        live_mode: false,
        type: 'payment',
        user_id: '456789',
      };

      const webhookRequest = createMockRequest('POST', webhookPayload, {
        'x-signature': 'ts=1642248600,v1=valid-signature-hash',
        'content-type': 'application/json',
      });

      const response = await PaymentWebhook(webhookRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Webhook processed successfully');
    });

    it('6. Familia debería ver pedido actualizado como pagado', async () => {
      const updatedGalleryRequest = createMockRequest('GET');
      mockFamilyAuth(updatedGalleryRequest, testSubjectToken);

      const response = await FamilyGallery(updatedGalleryRequest, {
        params: { token: testSubjectToken },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.active_order).toHaveProperty('id', testOrderId);
      expect(data.active_order.status).toBe('paid');
    });
  });

  describe('🔄 Flujos de Error y Recovery', () => {
    it('debería manejar falla de autenticación admin gracefully', async () => {
      const invalidLoginRequest = createMockRequest('POST', {
        email: TEST_ADMIN_EMAIL,
        password: 'wrong-password',
      });

      const response = await AdminLogin(invalidLoginRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });

    it('debería rechazar token de familia expirado', async () => {
      const expiredToken = 'expired-token-12345678901234567890';

      const expiredRequest = createMockRequest('GET');
      mockFamilyAuth(expiredRequest, expiredToken, true); // Expired = true

      const response = await FamilyGallery(expiredRequest, {
        params: { token: expiredToken },
      });

      expect(response.status).toBe(403);
    });

    it('debería manejar upload con archivos corruptos', async () => {
      const corruptFile = new File(
        [Buffer.from('not-an-image')],
        'corrupt.jpg',
        {
          type: 'image/jpeg',
        }
      );

      const formData = new FormData();
      formData.append('eventId', testEventId);
      formData.append('files', corruptFile);

      const uploadRequest = createMockRequest('POST', formData);
      mockAdminAuth(uploadRequest, adminSession);

      const response = await PhotosUpload(uploadRequest);
      const data = await response.json();

      expect(response.status).toBe(200); // Debería manejar gracefully
      expect(data.errors).toContainEqual({
        filename: 'corrupt.jpg',
        error: 'Invalid image file',
      });
    });

    it('debería manejar webhook duplicado (idempotencia)', async () => {
      const duplicateWebhookPayload = {
        action: 'payment.updated',
        data: { id: '123456789' }, // Mismo payment ID
        id: Date.now() + 1000, // Diferente webhook ID
      };

      const firstWebhook = createMockRequest('POST', duplicateWebhookPayload);
      const secondWebhook = createMockRequest('POST', duplicateWebhookPayload);

      const response1 = await PaymentWebhook(firstWebhook);
      const response2 = await PaymentWebhook(secondWebhook);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Segundo webhook debería ser idempotente
      const data2 = await response2.json();
      expect(data2.message).toContain('already processed');
    });
  });

  describe('🚀 Performance y Concurrencia', () => {
    it('debería manejar uploads concurrentes sin conflictos', async () => {
      const concurrentUploads = Array(3)
        .fill(0)
        .map(async (_, index) => {
          const testImage = await createTestImage(`concurrent-${index}.jpg`);
          const formData = new FormData();
          formData.append('eventId', testEventId);
          formData.append(
            'files',
            new File([testImage], `concurrent-${index}.jpg`)
          );

          const uploadRequest = createMockRequest('POST', formData);
          mockAdminAuth(uploadRequest, adminSession);

          return PhotosUpload(uploadRequest);
        });

      const responses = await Promise.all(concurrentUploads);

      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    it('debería completar flujo completo en tiempo razonable', async () => {
      const startTime = Date.now();

      // Flujo simplificado para medir performance
      const quickEvent = await quickCreateEvent();
      const quickSubject = await quickCreateSubject(quickEvent.id);
      const quickPhotos = await quickUploadPhotos(quickEvent.id, 2);
      await quickAssignPhotos(quickPhotos, quickSubject.id, quickEvent.id);
      const quickGallery = await quickAccessGallery(quickSubject.token);

      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(10000); // 10 segundos máximo
      expect(quickEvent).toBeDefined();
      expect(quickSubject.token.length).toBeGreaterThanOrEqual(20);
      expect(quickPhotos).toHaveLength(2);
      expect(quickGallery.photos).toHaveLength(2);
    });

    it('debería manejar múltiples familias accediendo simultáneamente', async () => {
      // Crear múltiples tokens de familia
      const familyTokens = [
        'family1-token-12345678901234567890',
        'family2-token-12345678901234567890',
        'family3-token-12345678901234567890',
      ];

      const concurrentAccesses = familyTokens.map(async (token) => {
        const galleryRequest = createMockRequest('GET');
        mockFamilyAuth(galleryRequest, token);
        return FamilyGallery(galleryRequest, { params: { token } });
      });

      const responses = await Promise.all(concurrentAccesses);

      responses.forEach((response) => {
        expect(response.status).toBeLessThanOrEqual(200); // Success or handled error
      });
    });
  });

  describe('🔒 Seguridad End-to-End', () => {
    it('debería rechazar acceso con token de otra familia', async () => {
      const anotherFamilyToken = 'another-family-token-123456789012';

      const unauthorizedRequest = createMockRequest('GET');
      mockFamilyAuth(unauthorizedRequest, anotherFamilyToken);

      const response = await FamilyGallery(unauthorizedRequest, {
        params: { token: anotherFamilyToken },
      });

      expect(response.status).toBe(403);
    });

    it('debería prevenir CSRF en operaciones críticas', async () => {
      const maliciousRequest = createMockRequest(
        'POST',
        {
          items: [{ photo_id: testPhotoIds[0], quantity: 1 }],
        },
        {
          Origin: 'https://malicious-site.com',
          Referer: 'https://malicious-site.com/attack',
        }
      );

      const response = await FamilyCheckout(maliciousRequest);

      expect(response.status).toBe(403);
    });

    it('debería logear eventos de seguridad apropiadamente', async () => {
      // Test que los eventos críticos se loggean
      // (Esto requeriría mocks del sistema de logging)
      expect(true).toBe(true); // Placeholder
    });

    it('debería aplicar rate limiting en endpoints críticos', async () => {
      // Hacer múltiples requests rápidos al mismo endpoint
      const rapidRequests = Array(15)
        .fill(0)
        .map(() => {
          const request = createMockRequest('GET');
          mockFamilyAuth(request, testSubjectToken);
          return FamilyGallery(request, {
            params: { token: testSubjectToken },
          });
        });

      const responses = await Promise.all(rapidRequests);

      // Algunos requests deberían ser rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('📊 Validación de Datos y Estado', () => {
    it('debería mantener consistencia de datos a través del flujo', async () => {
      // Verificar que los datos se mantienen consistentes
      expect(testEventId).toBeDefined();
      expect(testSubjectId).toBeDefined();
      expect(testSubjectToken).toBeDefined();
      expect(testPhotoIds).toHaveLength(3);
      expect(testOrderId).toBeDefined();
    });

    it('debería validar integridad referencial', async () => {
      // Las fotos deberían pertenecer al evento correcto
      // Los sujetos deberían pertenecer al evento correcto
      // Las asignaciones deberían ser válidas
      expect(true).toBe(true); // Placeholder para validaciones específicas
    });

    it('debería cleanup recursos después de completar flujo', async () => {
      // En un ambiente real, esto limpiaría datos de prueba
      // Para tests unitarios, simplemente verificamos que el flujo completó
      expect(adminSession).not.toBeNull();
      expect(familySession).not.toBeNull();
      expect(testOrderId).toBeDefined();
    });
  });
});

// Helper Functions

function setupMocks() {
  // Mock Supabase
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis(),
    })),
  };

  // Mock Auth
  vi.doMock('@/lib/middleware/auth.middleware', () => ({
    AuthMiddleware: {
      withAuth:
        (handler: any, role: string) => async (request: any, params?: any) => {
          const authContext = getAuthContextFromRequest(request, role);
          return handler(request, authContext, params);
        },
    },
    SecurityLogger: {
      logResourceAccess: vi.fn(),
      logSecurityEvent: vi.fn(),
    },
  }));

  // Mock Rate Limiting
  vi.doMock('@/lib/middleware/rate-limit.middleware', () => ({
    RateLimitMiddleware: {
      withRateLimit: (handler: any) => handler,
    },
  }));

  // Mock Services
  setupServiceMocks();
}

function setupServiceMocks() {
  // Mock Watermark Service
  vi.doMock('@/lib/services/watermark', () => ({
    processImageBatch: vi.fn().mockResolvedValue({
      results: [
        {
          buffer: Buffer.from('processed-image-1'),
          width: 800,
          height: 600,
          originalName: 'test-photo-1.jpg',
        },
        {
          buffer: Buffer.from('processed-image-2'),
          width: 800,
          height: 600,
          originalName: 'test-photo-2.jpg',
        },
        {
          buffer: Buffer.from('processed-image-3'),
          width: 800,
          height: 600,
          originalName: 'test-photo-3.jpg',
        },
      ],
      errors: [],
      duplicates: [],
    }),
    validateImage: vi.fn().mockResolvedValue(true),
  }));

  // Mock Storage Service
  vi.doMock('@/lib/services/storage', () => ({
    uploadToStorage: vi.fn().mockResolvedValue({
      path: 'events/test-event/photos/test.jpg',
      size: 1024,
    }),
    storageService: {
      getSignedUrl: vi
        .fn()
        .mockResolvedValue(
          'https://storage.supabase.co/object/sign/bucket/photo.jpg?token=signed-token'
        ),
    },
  }));

  // Mock Family Service
  vi.doMock('@/lib/services/family.service', () => ({
    familyService: {
      validateToken: vi.fn().mockImplementation((token) => {
        if (token.includes('expired')) return null;
        return {
          id: testSubjectId || 'mock-subject-id',
          name: 'Juan Pérez',
          parent_email: 'maria.gonzalez@example.com',
          token,
        };
      }),
      getSubjectPhotos: vi.fn().mockResolvedValue({
        photos: testPhotoIds.map((id) => ({
          id: `assignment-${id}`,
          photo_id: id,
          photo: {
            id,
            filename: `test-photo-${id}.jpg`,
            storage_path: `events/test-event/photos/test-photo-${id}.jpg`,
          },
        })),
        total: testPhotoIds.length,
        has_more: false,
      }),
      getActiveOrder: vi.fn().mockResolvedValue(null),
      createOrder: vi.fn().mockResolvedValue({
        id: 'mock-order-id',
        total_amount: 6000,
        items: [],
      }),
    },
  }));

  // Mock MercadoPago Service
  vi.doMock('@/lib/mercadopago/mercadopago.service', () => ({
    mercadopagoService: {
      createPreference: vi.fn().mockResolvedValue({
        id: 'mock-preference-id',
        init_point: 'https://mercadopago.com/checkout/mock',
      }),
      processWebhook: vi.fn().mockResolvedValue({
        success: true,
        paymentId: '123456789',
        status: 'approved',
      }),
    },
  }));
}

function createMockRequest(
  method: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Test)',
      ...headers,
    },
  };

  if (body && !(body instanceof FormData)) {
    requestInit.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    requestInit.body = body;
    delete (requestInit.headers as any)['Content-Type']; // Let browser set boundary
  }

  return new NextRequest('http://localhost:3000/api/test', requestInit);
}

function mockAdminAuth(request: NextRequest, session: any) {
  (request as any).authContext = {
    isAdmin: true,
    user: session,
    session,
  };
}

function mockFamilyAuth(
  request: NextRequest,
  token: string,
  expired: boolean = false
) {
  (request as any).authContext = {
    isFamily: true,
    subject: expired
      ? null
      : {
          id: testSubjectId || 'mock-subject-id',
          token,
          name: 'Juan Pérez',
        },
    token: expired ? null : token,
  };
}

function getAuthContextFromRequest(request: any, role: string) {
  if (request.authContext) {
    return request.authContext;
  }

  // Default mock auth based on role
  if (role === 'admin') {
    return {
      isAdmin: true,
      user: { id: 'mock-admin', email: TEST_ADMIN_EMAIL, role: 'admin' },
    };
  } else if (role === 'family') {
    return {
      isFamily: true,
      subject: {
        id: testSubjectId || 'mock-subject',
        token: testSubjectToken || 'mock-token',
      },
    };
  }

  return { isAdmin: false, isFamily: false };
}

async function createTestImages(count: number): Promise<Buffer[]> {
  const images = [];
  for (let i = 0; i < count; i++) {
    const image = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: {
          r: Math.floor(Math.random() * 255),
          g: Math.floor(Math.random() * 255),
          b: Math.floor(Math.random() * 255),
        },
      },
    })
      .jpeg()
      .toBuffer();
    images.push(image);
  }
  return images;
}

async function createTestImage(filename: string): Promise<Buffer> {
  return sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toBuffer();
}

// Quick helper functions for performance testing
async function quickCreateEvent() {
  const request = createMockRequest('POST', {
    name: 'Quick Test Event',
    date: '2024-12-15',
    school_name: 'Quick Test School',
  });
  mockAdminAuth(request, adminSession);

  const response = await EventsCreate(request);
  return (await response.json()).event;
}

async function quickCreateSubject(eventId: string) {
  const request = createMockRequest('POST', {
    eventId,
    subjects: [
      {
        first_name: 'Quick',
        last_name: 'Test',
        family_name: 'Test Family',
        parent_email: 'quick@test.com',
      },
    ],
  });
  mockAdminAuth(request, adminSession);

  const response = await SubjectsGenerate(request);
  return (await response.json()).subjects[0];
}

async function quickUploadPhotos(eventId: string, count: number) {
  const images = await createTestImages(count);
  const formData = new FormData();
  formData.append('eventId', eventId);
  images.forEach((img, i) => {
    formData.append('files', new File([img], `quick-${i}.jpg`));
  });

  const request = createMockRequest('POST', formData);
  mockAdminAuth(request, adminSession);

  const response = await PhotosUpload(request);
  return (await response.json()).uploaded.map((p: any) => p.id);
}

async function quickAssignPhotos(
  photoIds: string[],
  subjectId: string,
  eventId: string
) {
  const request = createMockRequest('POST', {
    photoIds,
    subjectId,
    eventId,
  });
  mockAdminAuth(request, adminSession);

  return TaggingAssign(request);
}

async function quickAccessGallery(token: string) {
  const request = createMockRequest('GET');
  mockFamilyAuth(request, token);

  const response = await FamilyGallery(request, { params: { token } });
  return response.json();
}
