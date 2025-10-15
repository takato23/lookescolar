import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateSecureToken,
  maskToken,
  getTokenExpiryDate,
} from '@/lib/utils/tokens';
import type { Database } from '@/types/database';

type SubjectToken = Database['public']['Tables']['subject_tokens']['Row'];
type SubjectTokenInsert =
  Database['public']['Tables']['subject_tokens']['Insert'];

export interface TokenGenerationOptions {
  expiryDays?: number;
  rotateExisting?: boolean;
}

export interface TokenGenerationResult {
  token: string;
  expiresAt: Date;
  isNew: boolean;
}

/**
 * Servicio para gestión segura de tokens de sujetos
 * Maneja generación, rotación y validación de tokens únicos
 */
export class TokenService {
  private supabase = createServerSupabaseClient();

  /**
   * Genera o rota un token para un sujeto específico
   */
  async generateTokenForSubject(
    subjectId: string,
    options: TokenGenerationOptions = {}
  ): Promise<TokenGenerationResult> {
    const { expiryDays = 30, rotateExisting = false } = options;
    const supabase = await this.supabase;

    try {
      // Verificar si ya existe un token válido
      const { data: existingToken } = await supabase
        .from('subject_tokens')
        .select('*')
        .eq('subject_id', subjectId)
        .single();

      // Si existe y no se quiere rotar, verificar si está vigente
      if (existingToken && !rotateExisting) {
        const expiresAt = new Date(existingToken.expires_at);
        if (expiresAt > new Date()) {
          console.log({
            event: 'token_exists',
            subjectId,
            token: maskToken(existingToken.token),
            expiresAt: existingToken.expires_at,
          });

          return {
            token: existingToken.token,
            expiresAt,
            isNew: false,
          };
        }
      }

      // Generar nuevo token único
      let token: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        token = generateSecureToken();
        attempts++;

        // Verificar unicidad
        const { data: duplicate } = await supabase
          .from('subject_tokens')
          .select('id')
          .eq('token', token)
          .single();

        if (!duplicate) break;

        if (attempts >= maxAttempts) {
          throw new Error(
            'No se pudo generar un token único después de múltiples intentos'
          );
        }
      } while (attempts < maxAttempts);

      const expiresAt = getTokenExpiryDate(expiryDays);

      // Crear o actualizar el token
      const tokenData: SubjectTokenInsert = {
        subject_id: subjectId,
        token,
        expires_at: expiresAt.toISOString(),
      };

      if (existingToken) {
        // Actualizar token existente
        await supabase
          .from('subject_tokens')
          .update(tokenData)
          .eq('subject_id', subjectId);
      } else {
        // Crear nuevo token
        await supabase.from('subject_tokens').insert(tokenData);
      }

      console.log({
        event: 'token_generated',
        subjectId,
        token: maskToken(token),
        expiresAt: expiresAt.toISOString(),
        rotated: !!existingToken,
      });

      return {
        token,
        expiresAt,
        isNew: !existingToken,
      };
    } catch (error: any) {
      console.error({
        event: 'token_generation_error',
        subjectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Genera tokens para múltiples sujetos en lote
   */
  async generateTokensForSubjects(
    subjectIds: string[],
    options: TokenGenerationOptions = {}
  ): Promise<Map<string, TokenGenerationResult>> {
    const results = new Map<string, TokenGenerationResult>();
    const errors: Array<{ subjectId: string; error: string }> = [];

    // Procesar en lotes pequeños para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < subjectIds.length; i += batchSize) {
      const batch = subjectIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subjectId) => {
          try {
            const result = await this.generateTokenForSubject(
              subjectId,
              options
            );
            results.set(subjectId, result);
          } catch (error: any) {
            errors.push({ subjectId, error: error.message });
            console.error({
              event: 'batch_token_error',
              subjectId,
              error: error.message,
            });
          }
        })
      );
    }

    if (errors.length > 0) {
      console.warn({
        event: 'batch_token_partial_failure',
        totalSubjects: subjectIds.length,
        successful: results.size,
        failed: errors.length,
        errors,
      });
    }

    console.log({
      event: 'batch_tokens_generated',
      totalSubjects: subjectIds.length,
      successful: results.size,
      failed: errors.length,
    });

    return results;
  }

  /**
   * Valida un token y obtiene información del sujeto
   */
  async validateToken(token: string): Promise<{
    isValid: boolean;
    subject?: Database['public']['Tables']['subjects']['Row'];
    tokenInfo?: SubjectToken;
  }> {
    if (!token) {
      return { isValid: false };
    }

    try {
      const supabase = await this.supabase;

      const { data: tokenInfo } = await supabase
        .from('subject_tokens')
        .select(
          `
          *,
          subjects (*)
        `
        )
        .eq('token', token)
        .single();

      if (!tokenInfo) {
        return { isValid: false };
      }

      // Verificar expiración
      const expiresAt = new Date(tokenInfo.expires_at);
      const isExpired = expiresAt < new Date();

      if (isExpired) {
        console.log({
          event: 'token_expired',
          token: maskToken(token),
          expiresAt: tokenInfo.expires_at,
        });
        return { isValid: false };
      }

      return {
        isValid: true,
        subject: tokenInfo.subjects as any,
        tokenInfo,
      };
    } catch (error: any) {
      console.error({
        event: 'token_validation_error',
        token: maskToken(token),
        error: error.message,
      });
      return { isValid: false };
    }
  }

  /**
   * Rota un token comprometido
   */
  async rotateToken(subjectId: string): Promise<TokenGenerationResult> {
    console.log({
      event: 'token_rotation_requested',
      subjectId,
    });

    return this.generateTokenForSubject(subjectId, { rotateExisting: true });
  }

  /**
   * Rota múltiples tokens próximos a expirar
   */
  async rotateExpiringTokens(daysBeforeExpiry: number = 7): Promise<{
    rotated: number;
    failed: number;
    errors: Array<{ subjectId: string; error: string }>;
  }> {
    const supabase = await this.supabase;
    const expiryCutoff = new Date();
    expiryCutoff.setDate(expiryCutoff.getDate() + daysBeforeExpiry);

    try {
      // Obtener tokens que expiran pronto
      const { data: expiringTokens } = await supabase
        .from('subject_tokens')
        .select('subject_id')
        .lt('expires_at', expiryCutoff.toISOString());

      if (!expiringTokens || expiringTokens.length === 0) {
        return { rotated: 0, failed: 0, errors: [] };
      }

      const subjectIds = expiringTokens.map((t) => t.subject_id);
      const results = await this.generateTokensForSubjects(subjectIds, {
        rotateExisting: true,
      });

      const errors: Array<{ subjectId: string; error: string }> = [];
      subjectIds.forEach((subjectId) => {
        if (!results.has(subjectId)) {
          errors.push({ subjectId, error: 'Failed to rotate token' });
        }
      });

      console.log({
        event: 'bulk_token_rotation_completed',
        totalExpiring: expiringTokens.length,
        rotated: results.size,
        failed: errors.length,
      });

      return {
        rotated: results.size,
        failed: errors.length,
        errors,
      };
    } catch (error: any) {
      console.error({
        event: 'bulk_token_rotation_error',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Invalida un token específico (para casos de seguridad)
   */
  async invalidateToken(
    token: string,
    reason: string = 'security_breach'
  ): Promise<boolean> {
    try {
      const supabase = await this.supabase;

      // Encontrar el token y actualizarlo para que expire inmediatamente
      const { data: tokenData } = await supabase
        .from('subject_tokens')
        .select('subject_id, token')
        .eq('token', token)
        .single();

      if (!tokenData) {
        console.warn({
          event: 'token_invalidation_not_found',
          token: maskToken(token),
          reason,
        });
        return false;
      }

      // Hacer que expire inmediatamente
      const now = new Date();
      await supabase
        .from('subject_tokens')
        .update({ expires_at: now.toISOString() })
        .eq('token', token);

      console.log({
        event: 'token_invalidated',
        token: maskToken(token),
        subjectId: tokenData.subject_id,
        reason,
      });

      return true;
    } catch (error: any) {
      console.error({
        event: 'token_invalidation_error',
        token: maskToken(token),
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Obtiene estadísticas de tokens para monitoreo
   */
  async getTokenStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    expiringIn7Days: number;
    expiringIn24Hours: number;
  }> {
    try {
      const supabase = await this.supabase;
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: tokens } = await supabase
        .from('subject_tokens')
        .select('expires_at');

      if (!tokens)
        return {
          total: 0,
          active: 0,
          expired: 0,
          expiringIn7Days: 0,
          expiringIn24Hours: 0,
        };

      const stats = {
        total: tokens.length,
        active: 0,
        expired: 0,
        expiringIn7Days: 0,
        expiringIn24Hours: 0,
      };

      tokens.forEach((token) => {
        const expiresAt = new Date(token.expires_at);

        if (expiresAt < now) {
          stats.expired++;
        } else {
          stats.active++;

          if (expiresAt < in24Hours) {
            stats.expiringIn24Hours++;
          } else if (expiresAt < in7Days) {
            stats.expiringIn7Days++;
          }
        }
      });

      return stats;
    } catch (error: any) {
      console.error({
        event: 'token_stats_error',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtiene todos los tokens de un evento
   */
  async getEventTokens(eventId: string): Promise<
    {
      subjectId: string;
      token: string;
      expiresAt: Date;
      subjectName: string;
    }[]
  > {
    try {
      const supabase = await this.supabase;

      const { data: tokens } = await supabase
        .from('subject_tokens')
        .select(
          `
          subject_id,
          token,
          expires_at,
          subjects (
            first_name,
            last_name,
            type,
            couple_first_name,
            couple_last_name,
            family_name
          )
        `
        )
        .eq('subjects.event_id', eventId);

      if (!tokens) return [];

      return tokens.map((tokenInfo) => {
        const subject = tokenInfo.subjects as any;
        let subjectName = subject.first_name || '';

        if (subject.type === 'student' && subject.last_name) {
          subjectName += ` ${subject.last_name}`;
        } else if (subject.type === 'couple') {
          subjectName += subject.couple_first_name
            ? ` y ${subject.couple_first_name}`
            : '';
          if (subject.last_name) subjectName += ` ${subject.last_name}`;
        } else if (subject.type === 'family' && subject.family_name) {
          subjectName = `Familia ${subject.family_name}`;
        }

        return {
          subjectId: tokenInfo.subject_id,
          token: tokenInfo.token,
          expiresAt: new Date(tokenInfo.expires_at),
          subjectName,
        };
      });
    } catch (error: any) {
      console.error({
        event: 'get_event_tokens_error',
        eventId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Genera la URL del portal familia para un token
   */
  static generatePortalUrl(token: string, baseUrl?: string): string {
    const base =
      baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/f/${token}`;
  }
}

// Instancia singleton
export const tokenService = new TokenService();
