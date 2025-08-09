import { createServerSupabaseClient } from './server';
import type { User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  code?: string;
}

// Funciones para servidor
export class ServerAuth {
  /**
   * Obtiene el usuario actual desde el servidor
   */
  static async getCurrentUser(): Promise<{
    user: User | null;
    error: AuthError | null;
  }> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser();

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
   * Verifica si el usuario actual es admin
   */
  static async isAdmin(): Promise<boolean> {
    const { user } = await this.getCurrentUser();

    if (!user) return false;

    // En el futuro se puede agregar un check en la base de datos
    // por ahora, cualquier usuario autenticado es admin
    return true;
  }

  /**
   * Middleware de protección para API routes
   */
  static async requireAuth(): Promise<
    { user: User; error: null } | { user: null; error: AuthError }
  > {
    const { user, error } = await this.getCurrentUser();

    if (error || !user) {
      return {
        user: null,
        error: { message: 'No autorizado', code: 'UNAUTHORIZED' },
      };
    }

    return { user, error: null };
  }

  /**
   * Middleware de protección para rutas admin
   */
  static async requireAdmin(): Promise<
    { user: User; error: null } | { user: null; error: AuthError }
  > {
    const authResult = await this.requireAuth();

    if (authResult.error) {
      return authResult;
    }

    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      return {
        user: null,
        error: {
          message: 'Acceso denegado. Se requieren permisos de administrador',
          code: 'FORBIDDEN',
        },
      };
    }

    return { user: authResult.user, error: null };
  }
}
