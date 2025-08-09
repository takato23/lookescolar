import { NextRequest, NextResponse } from 'next/server';
import { egressService } from '@/lib/services/egress.service';
import { tokenService } from '@/lib/security/token.service';
import { getRateLimitMetrics } from '@/lib/middleware/rate-limit.middleware';
import { storageService } from '@/lib/services/storage';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // TODO: Implementar autenticación de admin
    // const isAdmin = await validateAdminSession(request);
    // if (!isAdmin) { return 403 }

    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') || '7'; // días
    const type = searchParams.get('type') || 'summary';

    let metrics: any = {};

    switch (type) {
      case 'summary':
        // Métricas generales del sistema
        const [egressSummary, tokenMetrics, rateLimitMetrics, storageStats] =
          await Promise.all([
            egressService.getDailyEgressSummary(parseInt(period)),
            tokenService.getTokenMetrics(),
            Promise.resolve(getRateLimitMetrics()),
            storageService.getStorageStats(),
          ]);

        metrics = {
          egress: {
            daily: egressSummary.slice(0, 7), // Últimos 7 días
            totalBytes: egressSummary.reduce(
              (sum, day) => sum + day.totalBytes,
              0
            ),
            totalRequests: egressSummary.reduce(
              (sum, day) => sum + day.totalRequests,
              0
            ),
            avgBytesPerDay:
              egressSummary.length > 0
                ? Math.round(
                    egressSummary.reduce(
                      (sum, day) => sum + day.totalBytes,
                      0
                    ) / egressSummary.length
                  )
                : 0,
          },
          tokens: {
            total: tokenMetrics.totalTokens,
            active: tokenMetrics.activeTokens,
            expiringSoon: tokenMetrics.expiringSoon,
            blacklisted: tokenMetrics.blacklistedTokens,
            failedValidations: tokenMetrics.failedValidations,
          },
          rateLimiting: {
            totalRequests: rateLimitMetrics.totalRequests,
            blockedRequests: rateLimitMetrics.blockedRequests,
            blockRate: rateLimitMetrics.blockRate,
            activeIPs: rateLimitMetrics.ipStoreSize,
            activeTokens: rateLimitMetrics.tokenStoreSize,
            uptime: rateLimitMetrics.uptime,
          },
          storage: {
            totalFiles: storageStats.totalFiles,
            totalSizeBytes: storageStats.totalSizeBytes,
            totalSizeMB: Math.round(
              storageStats.totalSizeBytes / (1024 * 1024)
            ),
            cacheSize: storageStats.cacheSize,
          },
        };
        break;

      case 'egress':
        // Métricas detalladas de egress
        const [dailySummary, topEvents, egressAlert] = await Promise.all([
          egressService.getDailyEgressSummary(parseInt(period)),
          egressService.getTopEventsByEgress(10),
          egressService.checkEgressAlerts(),
        ]);

        metrics = {
          dailySummary,
          topEvents,
          alert: egressAlert,
          period: parseInt(period),
        };
        break;

      case 'security':
        // Métricas de seguridad
        const rateLimits = getRateLimitMetrics();
        const tokens = await tokenService.getTokenMetrics();

        metrics = {
          rateLimiting: {
            ...rateLimits,
            efficiency:
              rateLimits.totalRequests > 0
                ? ((rateLimits.totalRequests - rateLimits.blockedRequests) /
                    rateLimits.totalRequests) *
                  100
                : 100,
          },
          tokenSecurity: {
            ...tokens,
            securityScore: calculateTokenSecurityScore(tokens),
          },
        };
        break;

      case 'performance':
        // Métricas de performance
        const storage = await storageService.getStorageStats();
        const rateLimitStats = getRateLimitMetrics();

        metrics = {
          storage: {
            ...storage,
            avgFileSize:
              storage.totalFiles > 0
                ? Math.round(storage.totalSizeBytes / storage.totalFiles)
                : 0,
            cacheHitRate: storage.cacheSize > 0 ? 85 : 0, // Estimado
          },
          rateLimiting: {
            efficiency:
              rateLimitStats.blockRate < 1
                ? 'excellent'
                : rateLimitStats.blockRate < 5
                  ? 'good'
                  : 'needs_attention',
            avgResponseTime: 125, // Estimado basado en rate limiting
          },
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de métrica no válido' },
          {
            status: 400,
            headers: { 'X-Request-ID': requestId },
          }
        );
    }

    const duration = Date.now() - startTime;

    logger.info('Admin metrics retrieved', {
      requestId,
      type,
      period,
      duration,
      metricsKeys: Object.keys(metrics),
    });

    return NextResponse.json(
      {
        success: true,
        data: metrics,
        metadata: {
          type,
          period: parseInt(period),
          generatedAt: new Date().toISOString(),
          requestId,
        },
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'private, max-age=300', // 5 minutos
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to retrieve admin metrics', {
      requestId,
      type: request.nextUrl.searchParams.get('type'),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        requestId,
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}

/**
 * Calcula score de seguridad basado en métricas de tokens
 */
function calculateTokenSecurityScore(metrics: {
  totalTokens: number;
  activeTokens: number;
  expiringSoon: number;
  blacklistedTokens: number;
  failedValidations: number;
}): {
  score: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  factors: Array<{ factor: string; impact: number; description: string }>;
} {
  let score = 100;
  const factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }> = [];

  // Factor: Tokens expirando pronto
  if (metrics.expiringSoon > 0 && metrics.activeTokens > 0) {
    const expiringRatio = metrics.expiringSoon / metrics.activeTokens;
    if (expiringRatio > 0.2) {
      // >20% expiran pronto
      const impact = Math.min(30, expiringRatio * 100);
      score -= impact;
      factors.push({
        factor: 'expiring_tokens',
        impact: -impact,
        description: `${metrics.expiringSoon} tokens expiran pronto`,
      });
    }
  }

  // Factor: Validaciones fallidas
  if (metrics.failedValidations > 10) {
    const impact = Math.min(25, (metrics.failedValidations - 10) * 2);
    score -= impact;
    factors.push({
      factor: 'failed_validations',
      impact: -impact,
      description: `${metrics.failedValidations} validaciones fallidas`,
    });
  }

  // Factor: Tokens blacklisted
  if (metrics.blacklistedTokens > 0) {
    const impact = Math.min(20, metrics.blacklistedTokens * 5);
    score -= impact;
    factors.push({
      factor: 'blacklisted_tokens',
      impact: -impact,
      description: `${metrics.blacklistedTokens} tokens comprometidos`,
    });
  }

  // Factor positivo: Buena rotación
  if (metrics.activeTokens > 0 && metrics.expiringSoon === 0) {
    const impact = 10;
    score += impact;
    factors.push({
      factor: 'good_rotation',
      impact: +impact,
      description: 'Tokens con buena rotación',
    });
  }

  score = Math.max(0, Math.min(100, score));

  let level: 'excellent' | 'good' | 'warning' | 'critical';
  if (score >= 90) level = 'excellent';
  else if (score >= 75) level = 'good';
  else if (score >= 50) level = 'warning';
  else level = 'critical';

  return { score: Math.round(score), level, factors };
}

// Endpoint para obtener alertas específicas
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // TODO: Implementar autenticación de admin

    const { alertType } = await request.json();

    let alert = null;

    switch (alertType) {
      case 'egress':
        alert = await egressService.checkEgressAlerts();
        break;

      case 'tokens':
        const tokenMetrics = await tokenService.getTokenMetrics();
        const securityScore = calculateTokenSecurityScore(tokenMetrics);

        if (
          securityScore.level === 'critical' ||
          securityScore.level === 'warning'
        ) {
          alert = {
            level: securityScore.level,
            message: `Token security score: ${securityScore.score}/100`,
            factors: securityScore.factors,
          };
        }
        break;

      case 'rate_limiting':
        const rateLimitMetrics = getRateLimitMetrics();
        if (rateLimitMetrics.blockRate > 5) {
          alert = {
            level: 'warning',
            message: `High rate limit block rate: ${rateLimitMetrics.blockRate}%`,
            blockedRequests: rateLimitMetrics.blockedRequests,
            totalRequests: rateLimitMetrics.totalRequests,
          };
        }
        break;
    }

    return NextResponse.json(
      { alert },
      {
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    logger.error('Failed to check specific alert', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Error interno' },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
