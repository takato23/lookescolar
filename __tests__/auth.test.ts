import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AuthClient } from '@/lib/supabase/auth-client';
import { ServerAuth } from '@/lib/supabase/auth-server';

// Mocks
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  })),
}));

describe('AuthClient', () => {
  let authClient: AuthClient;
  let mockSupabase: any;

  beforeEach(() => {
    authClient = new AuthClient();
    // Reset mocks
    vi.clearAllMocks();

    // Get the mocked supabase instance
    const { createClient } = require('@/lib/supabase/client');
    mockSupabase = createClient();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials error', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Email o contraseña incorrectos',
        code: 'Invalid login credentials',
      });
    });

    it('should handle email not confirmed error', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' },
      });

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Email no confirmado. Revisa tu bandeja de entrada',
        code: 'Email not confirmed',
      });
    });

    it('should handle rate limiting error', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Too many requests' },
      });

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Demasiados intentos. Intenta nuevamente en unos minutos',
        code: 'Too many requests',
      });
    });

    it('should handle unexpected errors', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Error inesperado durante el login',
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({
        error: null,
      });

      const result = await authClient.logout();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout error', async () => {
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const result = await authClient.logout();

      expect(result.error).toEqual({
        message: 'Error al cerrar sesión',
        code: 'Logout failed',
      });
    });

    it('should handle unexpected logout errors', async () => {
      (mockSupabase.auth.signOut as Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await authClient.logout();

      expect(result.error).toEqual({
        message: 'Error inesperado durante el logout',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authClient.getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle no user found', async () => {
      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const result = await authClient.getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Error al obtener usuario',
        code: 'User not found',
      });
    });
  });

  describe('refreshSession', () => {
    it('should successfully refresh session', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.refreshSession as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authClient.refreshSession();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle refresh session error', async () => {
      (mockSupabase.auth.refreshSession as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Refresh token is invalid' },
      });

      const result = await authClient.refreshSession();

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Error al refrescar sesión',
        code: 'Refresh token is invalid',
      });
    });
  });
});

describe('ServerAuth', () => {
  let mockServerSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    mockServerSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };
    (createServerSupabaseClient as Mock).mockResolvedValue(mockServerSupabase);
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user from server', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await ServerAuth.getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle server auth error', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      const result = await ServerAuth.getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Error al obtener usuario',
        code: 'JWT expired',
      });
    });
  });

  describe('isAdmin', () => {
    it('should return true for authenticated users', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await ServerAuth.isAdmin();

      expect(result).toBe(true);
    });

    it('should return false for unauthenticated users', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' },
      });

      const result = await ServerAuth.isAdmin();

      expect(result).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should return user for authenticated requests', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await ServerAuth.requireAuth();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should return error for unauthenticated requests', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' },
      });

      const result = await ServerAuth.requireAuth();

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'No autorizado',
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should return user for authenticated admin requests', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'admin@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await ServerAuth.requireAdmin();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should return error for unauthenticated requests', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' },
      });

      const result = await ServerAuth.requireAdmin();

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'No autorizado',
        code: 'UNAUTHORIZED',
      });
    });
  });
});
