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

// Cliente de autenticación para browser
export class AuthClient {
  private supabase = createClient();

  /**
   * Login con email y contraseña
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User | null; error: AuthError | null }> {
    // En modo desarrollo, usar endpoint mock
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          return {
            user: null,
            error: {
              message: data.error || 'Error en el login',
              code: 'auth_error',
            },
          };
        }

        // Crear objeto User mock compatible con Supabase
        const mockUser: User = {
          id: data.user.id,
          email: data.user.email,
          app_metadata: {},
          user_metadata: { name: data.user.name },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          role: data.user.role,
        } as User;

        return { user: mockUser, error: null };
      } catch (err) {
        console.error('Login error:', err);
        return {
          user: null,
          error: { message: 'Error conectando con el servidor' },
        };
      }
    }

    // Código original para producción con Supabase
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          user: null,
          error: {
            message: this.getErrorMessage(error.message),
            code: error.message,
          },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: { message: 'Error inesperado durante el login' },
      };
    }
  }

  /**
   * Logout del usuario actual
   */
  async logout(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return {
          error: { message: 'Error al cerrar sesión', code: error.message },
        };
      }

      return { error: null };
    } catch (err) {
      return { error: { message: 'Error inesperado durante el logout' } };
    }
  }

  /**
   * Obtiene el usuario actual
   */
  async getCurrentUser(): Promise<{
    user: User | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return {
          user: null,
          error: { message: 'Error al obtener usuario', code: error.message },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: { message: 'Error inesperado al obtener usuario' },
      };
    }
  }

  /**
   * Refresca la sesión del usuario
   */
  async refreshSession(): Promise<{
    user: User | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return {
          user: null,
          error: { message: 'Error al refrescar sesión', code: error.message },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: { message: 'Error inesperado al refrescar sesión' },
      };
    }
  }

  /**
   * Escucha cambios en el estado de autenticación
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }

  /**
   * Convierte errores de Supabase a mensajes amigables
   */
  private getErrorMessage(errorCode: string): string {
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

// Instancia del cliente para usar en componentes
export const authClient = new AuthClient();
