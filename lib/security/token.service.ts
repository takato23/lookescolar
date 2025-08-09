import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { endpointRateLimits } from '@/lib/middleware/rate-limit.middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Configuración de tokens según CLAUDE.md
const TOKEN_CONFIG = {
  MIN_LENGTH: 20,
  DEFAULT_EXPIRY_DAYS: 30,
  ROTATION_THRESHOLD_DAYS: 7, // Rotar tokens que expiran en 7 días
  MAX_FAILED_ATTEMPTS: 5,
  BLACKLIST_TTL_HOURS: 24,
} as const;

// Alfabeto seguro para tokens (sin caracteres ambiguos)
const SAFE_ALPHABET =
  '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

// Blacklist en memoria de tokens comprometidos
const tokenBlacklist = new Map<string, { reason: string; expiresAt: number }>();

// Rate limiting por token
const tokenRateLimits = new Map<
  string,
  { count: number; resetTime: number; failedAttempts: number }
>();

export interface TokenValidationResult {
  valid: boolean;
  subjectId?: string;
  eventId?: string;
  reason?: string;
  remainingDays?: number;
}

export interface TokenRotationResult {
  newToken: string;
  oldToken: string;
  subjectId: string;
  expiresAt: Date;
}

export interface TokenMetrics {
  totalTokens: number;
  activeTokens: number;
  expiringSoon: number;
  blacklistedTokens: number;
  failedValidations: number;
}

class TokenService {
  /**
   * Genera token seguro con crypto.randomBytes
   */
  generateSecureToken(length: number = TOKEN_CONFIG.MIN_LENGTH): string {
    if (length < TOKEN_CONFIG.MIN_LENGTH) {
      throw new Error(
        `Token length must be at least ${TOKEN_CONFIG.MIN_LENGTH} characters`
      );
    }

    const bytes = crypto.getRandomValues(
      new Uint8Array(Math.ceil(length * 1.2))
    ); // Generar más bytes para compensar el alfabeto
    let token = '';

    for (let i = 0; i < bytes.length && token.length < length; i++) {
      const index = bytes[i] % SAFE_ALPHABET.length;
      token += SAFE_ALPHABET[index];
    }

    return token.substring(0, length);
  }

  /**
   * Crea nuevo sujeto con token seguro
   */
  async createSubjectWithToken(
    eventId: string,
    name: string,
    expiresInDays: number = TOKEN_CONFIG.DEFAULT_EXPIRY_DAYS
  ): Promise<{ subjectId: string; token: string; expiresAt: Date }> {
    const requestId = crypto.randomUUID();

    try {
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data: subject, error } = await supabase
        .from('subjects')
        .insert({
          event_id: eventId,
          name,
          token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create subject: ${error.message}`);
      }

      if (!subject) {
        throw new Error('No subject data returned');
      }

      logger.info('Subject created with secure token', {
        requestId,
        subjectId: subject.id,
        eventId,
        name,
        token: this.maskToken(token),
        expiresAt: expiresAt.toISOString(),
      });

      return {
        subjectId: subject.id,
        token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to create subject with token', {
        requestId,
        eventId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Valida token con verificaciones de seguridad
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    const requestId = crypto.randomUUID();

    try {
      // Validación básica de formato
      if (!token || token.length < TOKEN_CONFIG.MIN_LENGTH) {
        logger.warn('Token validation failed: invalid format', {
          requestId,
          token: this.maskToken(token),
          reason: 'invalid-format',
        });
        return { valid: false, reason: 'invalid-format' };
      }

      // Verificar blacklist
      const blacklistEntry = tokenBlacklist.get(token);
      if (blacklistEntry && blacklistEntry.expiresAt > Date.now()) {
        logger.warn('Token validation failed: blacklisted', {
          requestId,
          token: this.maskToken(token),
          reason: blacklistEntry.reason,
        });
        return { valid: false, reason: 'blacklisted' };
      }

      // Rate limiting por token
      const rateLimitResult = this.checkTokenRateLimit(token);
      if (!rateLimitResult.allowed) {
        logger.warn('Token validation failed: rate limited', {
          requestId,
          token: this.maskToken(token),
          attempts: rateLimitResult.attempts,
        });
        return { valid: false, reason: 'rate-limited' };
      }

      // Consultar base de datos
      const { data: subject, error } = await supabase
        .from('subjects')
        .select('id, event_id, expires_at, name')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Token no encontrado
          this.recordFailedAttempt(token);
          logger.warn('Token validation failed: not found', {
            requestId,
            token: this.maskToken(token),
          });
          return { valid: false, reason: 'not-found' };
        }

        throw new Error(`Database error: ${error.message}`);
      }

      // Verificar expiración
      const expiresAt = new Date(subject.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        logger.warn('Token validation failed: expired', {
          requestId,
          token: this.maskToken(token),
          expiresAt: subject.expires_at,
        });
        return { valid: false, reason: 'expired' };
      }

      // Calcular días restantes
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

      logger.info('Token validated successfully', {
        requestId,
        subjectId: subject.id,
        eventId: subject.event_id,
        token: this.maskToken(token),
        remainingDays,
      });

      return {
        valid: true,
        subjectId: subject.id,
        eventId: subject.event_id,
        remainingDays,
      };
    } catch (error) {
      logger.error('Token validation error', {
        requestId,
        token: this.maskToken(token),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { valid: false, reason: 'system-error' };
    }
  }

  /**
   * Rota token antes de expirar
   */
  async rotateToken(currentToken: string): Promise<TokenRotationResult> {
    const requestId = crypto.randomUUID();

    try {
      // Validar token actual
      const validation = await this.validateToken(currentToken);
      if (!validation.valid || !validation.subjectId) {
        throw new Error('Current token is invalid');
      }

      // Generar nuevo token
      const newToken = this.generateSecureToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(
        newExpiresAt.getDate() + TOKEN_CONFIG.DEFAULT_EXPIRY_DAYS
      );

      // Actualizar en base de datos
      const { error } = await supabase
        .from('subjects')
        .update({
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', validation.subjectId);

      if (error) {
        throw new Error(`Failed to rotate token: ${error.message}`);
      }

      // Blacklistear token anterior
      this.blacklistToken(currentToken, 'rotated');

      logger.info('Token rotated successfully', {
        requestId,
        subjectId: validation.subjectId,
        oldToken: this.maskToken(currentToken),
        newToken: this.maskToken(newToken),
        newExpiresAt: newExpiresAt.toISOString(),
      });

      return {
        newToken,
        oldToken: currentToken,
        subjectId: validation.subjectId,
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      logger.error('Token rotation failed', {
        requestId,
        currentToken: this.maskToken(currentToken),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Identifica tokens próximos a expirar para rotación automática
   */
  async getTokensExpiringsoon(): Promise<
    Array<{
      subjectId: string;
      token: string;
      name: string;
      expiresAt: Date;
      daysRemaining: number;
    }>
  > {
    const requestId = crypto.randomUUID();

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(
        thresholdDate.getDate() + TOKEN_CONFIG.ROTATION_THRESHOLD_DAYS
      );

      const { data: subjects, error } = await supabase
        .from('subjects')
        .select('id, token, name, expires_at')
        .lte('expires_at', thresholdDate.toISOString())
        .gt('expires_at', new Date().toISOString()) // Solo tokens válidos
        .order('expires_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to query expiring tokens: ${error.message}`);
      }

      const result = (subjects || []).map((subject) => {
        const expiresAt = new Date(subject.expires_at);
        const daysRemaining = Math.ceil(
          (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return {
          subjectId: subject.id,
          token: subject.token,
          name: subject.name,
          expiresAt,
          daysRemaining,
        };
      });

      logger.info('Found tokens expiring soon', {
        requestId,
        count: result.length,
        thresholdDays: TOKEN_CONFIG.ROTATION_THRESHOLD_DAYS,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get expiring tokens', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Blacklistea token comprometido
   */
  blacklistToken(token: string, reason: string): void {
    const expiresAt =
      Date.now() + TOKEN_CONFIG.BLACKLIST_TTL_HOURS * 60 * 60 * 1000;

    tokenBlacklist.set(token, {
      reason,
      expiresAt,
    });

    logger.warn('Token blacklisted', {
      token: this.maskToken(token),
      reason,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  /**
   * Rate limiting por token
   */
  private checkTokenRateLimit(token: string): {
    allowed: boolean;
    attempts?: number;
  } {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxAttempts = endpointRateLimits.familyGallery.requests;

    let entry = tokenRateLimits.get(token);

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        failedAttempts: 0,
      };
      tokenRateLimits.set(token, entry);
    }

    // Reset si expiró la ventana
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    entry.count++;

    // Bloquear si excede intentos fallidos
    if (entry.failedAttempts >= TOKEN_CONFIG.MAX_FAILED_ATTEMPTS) {
      return { allowed: false, attempts: entry.failedAttempts };
    }

    // Bloquear si excede rate limit
    if (entry.count > maxAttempts) {
      return { allowed: false, attempts: entry.count };
    }

    return { allowed: true };
  }

  /**
   * Registra intento fallido de validación
   */
  private recordFailedAttempt(token: string): void {
    const entry = tokenRateLimits.get(token);
    if (entry) {
      entry.failedAttempts++;

      // Auto-blacklist si excede máximo de intentos fallidos
      if (entry.failedAttempts >= TOKEN_CONFIG.MAX_FAILED_ATTEMPTS) {
        this.blacklistToken(token, 'too-many-failed-attempts');
      }
    }
  }

  /**
   * Obtiene métricas de tokens
   */
  async getTokenMetrics(): Promise<TokenMetrics> {
    const requestId = crypto.randomUUID();

    try {
      const now = new Date();
      const soonThreshold = new Date();
      soonThreshold.setDate(
        soonThreshold.getDate() + TOKEN_CONFIG.ROTATION_THRESHOLD_DAYS
      );

      // Consulta agregada para obtener métricas
      const { data, error } = await supabase
        .from('subjects')
        .select('expires_at')
        .not('token', 'is', null);

      if (error) {
        throw new Error(`Failed to get token metrics: ${error.message}`);
      }

      const subjects = data || [];

      const totalTokens = subjects.length;
      const activeTokens = subjects.filter(
        (s) => new Date(s.expires_at) > now
      ).length;
      const expiringSoon = subjects.filter((s) => {
        const expires = new Date(s.expires_at);
        return expires > now && expires <= soonThreshold;
      }).length;

      const blacklistedTokens = Array.from(tokenBlacklist.values()).filter(
        (entry) => entry.expiresAt > Date.now()
      ).length;

      const failedValidations = Array.from(tokenRateLimits.values()).reduce(
        (sum, entry) => sum + entry.failedAttempts,
        0
      );

      logger.info('Token metrics calculated', {
        requestId,
        totalTokens,
        activeTokens,
        expiringSoon,
        blacklistedTokens,
        failedValidations,
      });

      return {
        totalTokens,
        activeTokens,
        expiringSoon,
        blacklistedTokens,
        failedValidations,
      };
    } catch (error) {
      logger.error('Failed to calculate token metrics', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Limpieza de blacklist expirada
   */
  cleanupExpiredBlacklist(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [token, entry] of tokenBlacklist) {
      if (entry.expiresAt <= now) {
        tokenBlacklist.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Expired blacklist entries cleaned', {
        count: cleanedCount,
      });
    }
  }

  /**
   * Enmascara token para logging seguro
   */
  private maskToken(token: string): string {
    if (!token) {
      return 'null';
    }

    if (token.length <= 6) {
      return 'tok_***';
    }

    return `tok_${token.substring(0, 3)}***`;
  }
}

// Instancia singleton
export const tokenService = new TokenService();

// Limpieza periódica cada 30 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      tokenService.cleanupExpiredBlacklist();
    },
    30 * 60 * 1000
  );
}

// Configuración exportada
export const tokenConfig = TOKEN_CONFIG;
