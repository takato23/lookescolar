import { createClient } from './client';
import type { User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  code?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends LoginCredentials {
  confirmPassword?: string;
}

export class AuthClient {
  private readonly supabase = createClient();

  async login(credentials: LoginCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        const payload = await response.json();

        if (!response.ok || payload?.error) {
          return {
            user: null,
            error: {
              message: payload?.error ?? 'Error en el login',
              code: 'auth_error',
            },
          };
        }

        const mockUser: User = {
          id: payload.user.id,
          email: payload.user.email,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          role: payload.user.role,
          app_metadata: {},
          user_metadata: { name: payload.user.name },
        } as User;

        return { user: mockUser, error: null };
      } catch (err) {
        console.error('[AuthClient] login error (dev mode)', err);
        return {
          user: null,
          error: { message: 'Error conectando con el servidor' },
        };
      }
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          user: null,
          error: {
            message: this.mapErrorMessage(error.message),
            code: error.message,
          },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      console.error('[AuthClient] unexpected login error', err);
      return {
        user: null,
        error: { message: 'Error inesperado durante el login' },
      };
    }
  }

  async logout(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return {
          error: {
            message: this.mapErrorMessage(error.message),
            code: error.message,
          },
        };
      }

      return { error: null };
    } catch (err) {
      console.error('[AuthClient] unexpected logout error', err);
      return { error: { message: 'Error inesperado durante el logout' } };
    }
  }

  async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return {
          user: null,
          error: {
            message: this.mapErrorMessage(error.message),
            code: error.message,
          },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      console.error('[AuthClient] unexpected getCurrentUser error', err);
      return {
        user: null,
        error: { message: 'Error inesperado al obtener usuario' },
      };
    }
  }

  async refreshSession(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return {
          user: null,
          error: {
            message: 'Error al refrescar sesión',
            code: error.message,
          },
        };
      }

      return { user: data.user ?? null, error: null };
    } catch (err) {
      console.error('[AuthClient] unexpected refreshSession error', err);
      return {
        user: null,
        error: { message: 'Error inesperado al refrescar sesión' },
      };
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((_, session) => {
      callback(session?.user ?? null);
    });
  }

  private mapErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'Invalid login credentials':
        return 'Email o contraseña incorrectos';
      case 'Email not confirmed':
        return 'Email no confirmado. Revisa tu bandeja de entrada';
      case 'Too many requests':
        return 'Demasiados intentos. Intenta nuevamente en unos minutos';
      case 'User not found':
        return 'Usuario no encontrado';
      case 'Invalid email':
        return 'Email inválido';
      case 'Password should be at least 6 characters':
        return 'La contraseña debe tener al menos 6 caracteres';
      default:
        return 'Error de autenticación. Intenta nuevamente';
    }
  }
}

export const authClient = new AuthClient();
