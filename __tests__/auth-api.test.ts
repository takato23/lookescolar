import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, DELETE, PUT } from '@/app/api/admin/auth/route';

// Mock the Supabase modules
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/auth', () => ({
  ServerAuth: {
    getCurrentUser: vi.fn(),
  },
}));

describe('/api/admin/auth', () => {
  let mockSupabase: any;
  let mockServerAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      },
    };

    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabase);

    const { ServerAuth } = require('@/lib/supabase/auth');
    mockServerAuth = ServerAuth;
  });

  describe('POST /api/admin/auth (login)', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: 1234567890,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        created_at: mockUser.created_at,
      });
      expect(data.session).toEqual(mockSession);
    });

    it('should handle invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Email o contraseña incorrectos');
    });

    it('should handle missing email or password', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // missing password
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email y contraseña son requeridos');
    });

    it('should handle invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email o contraseña inválidos');
    });

    it('should handle short password', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123', // too short
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email o contraseña inválidos');
    });

    it('should handle rate limiting', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Simulate failed login attempts
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      // Make multiple failed attempts
      await POST(request);
      await POST(request);
      await POST(request);

      // Fourth attempt should be rate limited
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Demasiados intentos');
      expect(data.retryAfter).toBeDefined();
    });
  });

  describe('GET /api/admin/auth (get current user)', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockServerAuth.getCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        created_at: mockUser.created_at,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockServerAuth.getCurrentUser.mockResolvedValue({
        user: null,
        error: { message: 'No user found' },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });
  });

  describe('DELETE /api/admin/auth (logout)', () => {
    it('should successfully logout', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout error gracefully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const response = await DELETE();
      const data = await response.json();

      // Should still return success even if Supabase logout fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PUT /api/admin/auth (refresh session)', () => {
    it('should successfully refresh session', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: 1234567890,
      };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        created_at: mockUser.created_at,
      });
      expect(data.session).toEqual(mockSession);
    });

    it('should handle invalid refresh token', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Refresh token is invalid' },
      });

      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Sesión inválida');
    });
  });
});
