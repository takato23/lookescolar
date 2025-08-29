import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  authenticateAdmin, 
  AdminAuthMiddleware, 
  AdminSecurityLogger 
} from '@/lib/middleware/admin-auth.middleware';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock rate limit middleware
vi.mock('@/lib/middleware/rate-limit.middleware', () => ({
  rateLimitMiddleware: vi.fn().mockResolvedValue({ allowed: true, limit: 30, remaining: 29 }),
}));

// Mock security validator
vi.mock('@/lib/security/validation', () => ({
  SecurityValidator: {
    maskSensitiveData: vi.fn((data, type) => {
      if (type === 'token') return 'tok_***';
      if (type === 'email') return 'u***@***.com';
      return data;
    }),
  },
}));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
};

beforeAll(() => {
  // Set up environment for testing
  process.env.NODE_ENV = 'test';
  delete process.env.ALLOW_DEV_BYPASS;
});

afterAll(() => {
  // Clean up
  vi.clearAllMocks();
});

describe('Admin Publish Authentication Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateAdmin function', () => {
    const createMockRequest = (
      url: string = 'http://localhost:3000/api/admin/folders/123/publish',
      headers: Record<string, string> = {},
      method: string = 'POST'
    ): NextRequest => {
      return new NextRequest(url, {
        method,
        headers: new Headers(headers),
      });
    };

    describe('Authentication Required (401 Tests)', () => {
      it('should return 401 when no session exists', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'No session found' },
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Authentication required');
        expect(result.requestId).toBeDefined();
        expect(result.user).toBeUndefined();
      });

      it('should return 401 when session is invalid', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid session' },
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Authentication required');
      });

      it('should return 401 when auth service throws error', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(
          new Error('Auth service unavailable')
        );

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Authentication service error');
      });
    });

    describe('Authorization Failed (403 Tests)', () => {
      it('should return 403 when user lacks admin role', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'user@example.com',
              user_metadata: { role: 'user' }, // Not admin
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Admin access required');
        expect(result.user).toBeUndefined();
      });

      it('should return 403 when user has no role metadata', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'user@example.com',
              user_metadata: {}, // No role
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Admin access required');
      });

      it('should return 403 when email not in admin list', async () => {
        // Simulate production mode
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        process.env.ADMIN_EMAILS = 'admin@lookescolar.com';

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'user@example.com', // Not in admin list
              user_metadata: {},
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Admin access required');

        // Restore environment
        process.env.NODE_ENV = originalNodeEnv;
        delete process.env.ADMIN_EMAILS;
      });
    });

    describe('Rate Limiting Tests', () => {
      it('should return 429 when rate limit exceeded', async () => {
        const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
        (rateLimitMiddleware as any).mockResolvedValueOnce({
          allowed: false,
          limit: 10,
          remaining: 0,
          resetTime: Date.now() + 60000,
          retryAfter: 60,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Rate limit exceeded');
        expect(result.rateLimitResult?.allowed).toBe(false);
        expect(result.rateLimitResult?.limit).toBe(10);
        expect(result.rateLimitResult?.remaining).toBe(0);
        expect(result.rateLimitResult?.retryAfter).toBe(60);
      });

      it('should succeed when within rate limits', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'admin-123',
              email: 'admin@lookescolar.com',
              user_metadata: { role: 'admin' },
            },
          },
          error: null,
        });

        const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
        (rateLimitMiddleware as any).mockResolvedValueOnce({
          allowed: true,
          limit: 10,
          remaining: 9,
          resetTime: Date.now() + 60000,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(true);
        expect(result.rateLimitResult?.allowed).toBe(true);
        expect(result.rateLimitResult?.remaining).toBe(9);
      });
    });

    describe('Valid Admin Access (200 Tests)', () => {
      it('should succeed with valid admin user metadata role', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'admin-123',
              email: 'admin@lookescolar.com',
              user_metadata: { role: 'admin' },
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(true);
        expect(result.user).toEqual({
          id: 'admin-123',
          email: 'admin@lookescolar.com',
          role: 'admin',
          metadata: { role: 'admin' },
        });
        expect(result.error).toBeUndefined();
        expect(result.requestId).toBeDefined();
      });

      it('should succeed with admin email in whitelist', async () => {
        // Simulate production mode with admin emails
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        process.env.ADMIN_EMAILS = 'admin@lookescolar.com,owner@lookescolar.com';

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'admin-123',
              email: 'admin@lookescolar.com',
              user_metadata: {},
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(true);
        expect(result.user?.email).toBe('admin@lookescolar.com');

        // Restore environment
        process.env.NODE_ENV = originalNodeEnv;
        delete process.env.ADMIN_EMAILS;
      });

      it('should succeed in development mode with any user', async () => {
        // Simulate development mode
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'dev-user-123',
              email: 'dev@example.com',
              user_metadata: {},
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(true);
        expect(result.user?.email).toBe('dev@example.com');

        // Restore environment
        process.env.NODE_ENV = originalNodeEnv;
      });

      it('should succeed with development bypass enabled', async () => {
        // Simulate development with bypass
        process.env.NODE_ENV = 'development';
        process.env.ALLOW_DEV_BYPASS = 'true';

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(true);
        expect(result.user?.id).toBe('dev-admin');
        expect(result.user?.email).toBe('admin@lookescolar.dev');
        expect(result.user?.role).toBe('admin');

        // Clean up
        delete process.env.ALLOW_DEV_BYPASS;
      });
    });

    describe('Security Logging Tests', () => {
      it('should log successful admin access', async () => {
        const logSpy = vi.spyOn(AdminSecurityLogger, 'logAdminAction');

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'admin-123',
              email: 'admin@lookescolar.com',
              user_metadata: { role: 'admin' },
            },
          },
          error: null,
        });

        const request = createMockRequest();
        await authenticateAdmin(request);

        expect(logSpy).toHaveBeenCalledWith(
          'admin_access_granted',
          expect.objectContaining({
            endpoint: '/api/admin/folders/123/publish',
            userId: 'admin-123',
            userEmail: 'admin@lookescolar.com',
            success: true,
          }),
          'info'
        );
      });

      it('should log unauthorized access attempts', async () => {
        const logSpy = vi.spyOn(AdminSecurityLogger, 'logAdminAction');

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        });

        const request = createMockRequest();
        await authenticateAdmin(request);

        expect(logSpy).toHaveBeenCalledWith(
          'admin_unauthorized_access',
          expect.objectContaining({
            endpoint: '/api/admin/folders/123/publish',
            reason: 'No session',
          }),
          'warning'
        );
      });

      it('should log rate limit violations', async () => {
        const logSpy = vi.spyOn(AdminSecurityLogger, 'logAdminAction');

        const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
        (rateLimitMiddleware as any).mockResolvedValueOnce({
          allowed: false,
          limit: 10,
          remaining: 0,
        });

        const request = createMockRequest();
        await authenticateAdmin(request);

        expect(logSpy).toHaveBeenCalledWith(
          'admin_rate_limit_exceeded',
          expect.objectContaining({
            endpoint: '/api/admin/folders/123/publish',
            limit: 10,
          }),
          'warning'
        );
      });
    });

    describe('Error Handling Tests', () => {
      it('should handle Supabase client creation failures', async () => {
        (createServerSupabaseClient as any).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe('Authentication service error');
      });

      it('should handle malformed user data gracefully', async () => {
        // Force production mode to avoid development bypass
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: null, // Invalid user data
              email: undefined,
            },
          },
          error: null,
        });

        const request = createMockRequest();
        const result = await authenticateAdmin(request);

        expect(result.authenticated).toBe(false);

        // Restore environment
        process.env.NODE_ENV = originalNodeEnv;
      });
    });
  });

  describe('withAdminAuth middleware wrapper', () => {
    const mockHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should call handler when authentication succeeds', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@lookescolar.com',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      const wrappedHandler = AdminAuthMiddleware.withAuth(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Admin-Authenticated')).toBe('true');
      expect(response.headers.get('X-Request-Id')).toBeDefined();
    });

    it('should return 401 when authentication fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      const wrappedHandler = AdminAuthMiddleware.withAuth(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Authentication required');
    });

    it('should return 403 when user lacks admin privileges', async () => {
      // Force production mode to avoid development bypass
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: { role: 'user' },
          },
        },
        error: null,
      });

      const wrappedHandler = AdminAuthMiddleware.withAuth(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData.error).toBe('Admin access required');

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should return 429 when rate limit is exceeded', async () => {
      const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
      (rateLimitMiddleware as any).mockResolvedValueOnce({
        allowed: false,
        limit: 10,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      const wrappedHandler = AdminAuthMiddleware.withAuth(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBe('60');

      const responseData = await response.json();
      expect(responseData.error).toContain('Too many requests');
    });

    it('should handle handler errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@lookescolar.com',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = AdminAuthMiddleware.withAuth(errorHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Internal server error');
    });

    it('should include rate limit headers in successful responses', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@lookescolar.com',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
      (rateLimitMiddleware as any).mockResolvedValueOnce({
        allowed: true,
        limit: 10,
        remaining: 5,
        resetTime: Date.now() + 60000,
      });

      const wrappedHandler = AdminAuthMiddleware.withAuth(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');
      
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('5');
      expect(response.headers.get('X-Admin-Authenticated')).toBe('true');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow for publish endpoint', async () => {
      // Set up valid admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@lookescolar.com',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      // Mock rate limiting as successful
      const { rateLimitMiddleware } = await import('@/lib/middleware/rate-limit.middleware');
      (rateLimitMiddleware as any).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      // Create a simple handler
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Folder published' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const wrappedHandler = AdminAuthMiddleware.withAuth(handler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: { allowDownload: true } }),
      });

      const response = await wrappedHandler(request);

      // Verify handler was called
      expect(handler).toHaveBeenCalledWith(request);

      // Verify successful response
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.message).toBe('Folder published');

      // Verify security headers are present
      expect(response.headers.get('X-Admin-Authenticated')).toBe('true');
      expect(response.headers.get('X-Request-Id')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
    });

    it('should block access completely when authentication fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const handler = vi.fn();
      const wrappedHandler = AdminAuthMiddleware.withAuth(handler);
      const request = new NextRequest('http://localhost:3000/api/admin/folders/123/publish');

      const response = await wrappedHandler(request);

      // Verify handler was never called
      expect(handler).not.toHaveBeenCalled();

      // Verify blocked response
      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData.error).toBe('Authentication required');
    });
  });
});