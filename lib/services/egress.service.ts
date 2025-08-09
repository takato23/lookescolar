import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

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

// Configuración de límites según CLAUDE.md
const EGRESS_CONFIG = {
  MONTHLY_LIMIT_GB: 100, // Límite mensual en GB
  WARNING_THRESHOLD: 0.8, // Alertar al 80% del límite
  CRITICAL_THRESHOLD: 0.9, // Crítico al 90% del límite
  BATCH_SIZE: 100, // Tamaño de lote para bulk operations
} as const;

export interface EgressData {
  eventId?: string;
  bytes: number;
  requests: number;
  clientIP?: string;
  userAgent?: string;
}

export interface EgressMetrics {
  totalBytes: number;
  totalRequests: number;
  avgBytesPerRequest: number;
  topEvents: Array<{
    eventId: string;
    bytes: number;
    requests: number;
    percentage: number;
  }>;
}

export interface EgressAlert {
  level: 'warning' | 'critical' | 'exceeded';
  currentUsage: number;
  limit: number;
  percentage: number;
  message: string;
  recommendedActions: string[];
}

export interface DailyEgressSummary {
  date: string;
  totalBytes: number;
  totalRequests: number;
  uniqueEvents: number;
  topEvent?: {
    eventId: string;
    bytes: number;
    requests: number;
  };
}

// Cache en memoria para métricas frecuentes
const metricsCache = new Map<string, { data: any; expiresAt: number }>();

class EgressService {
  /**
   * Registra transferencia de datos (egress)
   */
  async trackEgress(data: EgressData): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Buscar entrada existente para hoy
      const { data: existing, error: selectError } = await supabase
        .from('egress_metrics')
        .select('*')
        .eq('date', today)
        .eq('event_id', data.eventId || null)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(
          `Error querying egress metrics: ${selectError.message}`
        );
      }

      if (existing) {
        // Actualizar entrada existente
        const { error: updateError } = await supabase
          .from('egress_metrics')
          .update({
            bytes_served: existing.bytes_served + data.bytes,
            requests_count: existing.requests_count + data.requests,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(
            `Error updating egress metrics: ${updateError.message}`
          );
        }
      } else {
        // Crear nueva entrada
        const { error: insertError } = await supabase
          .from('egress_metrics')
          .insert({
            event_id: data.eventId || null,
            date: today,
            bytes_served: data.bytes,
            requests_count: data.requests,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(
            `Error inserting egress metrics: ${insertError.message}`
          );
        }
      }

      // Invalidar cache relacionado
      this.invalidateMetricsCache(data.eventId);

      // Verificar alertas si es una transferencia significativa (>10MB)
      if (data.bytes > 10 * 1024 * 1024) {
        await this.checkEgressAlerts();
      }

      logger.debug('Egress tracked successfully', {
        requestId,
        eventId: data.eventId,
        bytes: data.bytes,
        requests: data.requests,
        date: today,
      });
    } catch (error) {
      logger.error('Failed to track egress', {
        requestId,
        eventId: data.eventId,
        bytes: data.bytes,
        requests: data.requests,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // No lanzar error para evitar romper el flujo principal
      // El tracking de egress es importante pero no crítico
    }
  }

  /**
   * Obtiene métricas de egress por evento
   */
  async getEgressByEvent(eventId: string): Promise<EgressMetrics> {
    const requestId = crypto.randomUUID();
    const cacheKey = `event-${eventId}`;

    try {
      // Verificar cache
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const { data, error } = await supabase
        .from('egress_metrics')
        .select('*')
        .eq('event_id', eventId)
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Error getting egress by event: ${error.message}`);
      }

      const metrics = data || [];

      const totalBytes = metrics.reduce(
        (sum, m) => sum + (m.bytes_served || 0),
        0
      );
      const totalRequests = metrics.reduce(
        (sum, m) => sum + (m.requests_count || 0),
        0
      );
      const avgBytesPerRequest =
        totalRequests > 0 ? totalBytes / totalRequests : 0;

      const result: EgressMetrics = {
        totalBytes,
        totalRequests,
        avgBytesPerRequest: Math.round(avgBytesPerRequest),
        topEvents: [
          {
            eventId,
            bytes: totalBytes,
            requests: totalRequests,
            percentage: 100,
          },
        ],
      };

      // Cachear resultado por 5 minutos
      this.setCache(cacheKey, result, 5 * 60 * 1000);

      logger.info('Egress metrics calculated for event', {
        requestId,
        eventId,
        totalBytes,
        totalRequests,
        avgBytesPerRequest: result.avgBytesPerRequest,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get egress by event', {
        requestId,
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Obtiene resumen diario de egress
   */
  async getDailyEgressSummary(
    days: number = 30
  ): Promise<DailyEgressSummary[]> {
    const requestId = crypto.randomUUID();
    const cacheKey = `daily-${days}`;

    try {
      // Verificar cache
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('egress_metrics')
        .select('*')
        .gte('date', fromDateStr)
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Error getting daily egress: ${error.message}`);
      }

      const metrics = data || [];

      // Agrupar por fecha
      const dailyGroups = metrics.reduce(
        (groups, metric) => {
          const date = metric.date;
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(metric);
          return groups;
        },
        {} as Record<string, any[]>
      );

      // Calcular resúmenes diarios
      const summaries: DailyEgressSummary[] = Object.entries(dailyGroups)
        .map(([date, dayMetrics]) => {
          const totalBytes = dayMetrics.reduce(
            (sum, m) => sum + (m.bytes_served || 0),
            0
          );
          const totalRequests = dayMetrics.reduce(
            (sum, m) => sum + (m.requests_count || 0),
            0
          );
          const uniqueEvents = new Set(
            dayMetrics.map((m) => m.event_id).filter(Boolean)
          ).size;

          // Encontrar evento con más tráfico
          const eventTotals = dayMetrics.reduce(
            (totals, m) => {
              if (m.event_id) {
                totals[m.event_id] = totals[m.event_id] || {
                  bytes: 0,
                  requests: 0,
                };
                totals[m.event_id].bytes += m.bytes_served || 0;
                totals[m.event_id].requests += m.requests_count || 0;
              }
              return totals;
            },
            {} as Record<string, { bytes: number; requests: number }>
          );

          const topEventEntry = Object.entries(eventTotals).sort(
            ([, a], [, b]) => b.bytes - a.bytes
          )[0];

          const topEvent = topEventEntry
            ? {
                eventId: topEventEntry[0],
                bytes: topEventEntry[1].bytes,
                requests: topEventEntry[1].requests,
              }
            : undefined;

          return {
            date,
            totalBytes,
            totalRequests,
            uniqueEvents,
            topEvent,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      // Cachear resultado por 10 minutos
      this.setCache(cacheKey, summaries, 10 * 60 * 1000);

      logger.info('Daily egress summary calculated', {
        requestId,
        days,
        summaryCount: summaries.length,
        totalBytes: summaries.reduce((sum, s) => sum + s.totalBytes, 0),
      });

      return summaries;
    } catch (error) {
      logger.error('Failed to get daily egress summary', {
        requestId,
        days,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verifica alertas de egress mensual
   */
  async checkEgressAlerts(): Promise<EgressAlert | null> {
    const requestId = crypto.randomUUID();

    try {
      // Obtener egress del mes actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('egress_metrics')
        .select('bytes_served')
        .gte('date', startOfMonthStr);

      if (error) {
        throw new Error(`Error checking egress alerts: ${error.message}`);
      }

      const totalBytesThisMonth = (data || []).reduce(
        (sum, m) => sum + (m.bytes_served || 0),
        0
      );

      const totalGBThisMonth = totalBytesThisMonth / (1024 * 1024 * 1024);
      const limitGB = EGRESS_CONFIG.MONTHLY_LIMIT_GB;
      const percentage = (totalGBThisMonth / limitGB) * 100;

      let alert: EgressAlert | null = null;

      if (percentage >= 100) {
        alert = {
          level: 'exceeded',
          currentUsage: totalGBThisMonth,
          limit: limitGB,
          percentage,
          message: `Monthly egress limit exceeded: ${totalGBThisMonth.toFixed(2)}GB / ${limitGB}GB`,
          recommendedActions: [
            'Implement aggressive image optimization',
            'Enable CDN caching',
            'Review and optimize image sizes',
            'Consider increasing monthly limit',
          ],
        };
      } else if (percentage >= EGRESS_CONFIG.CRITICAL_THRESHOLD * 100) {
        alert = {
          level: 'critical',
          currentUsage: totalGBThisMonth,
          limit: limitGB,
          percentage,
          message: `Critical egress usage: ${totalGBThisMonth.toFixed(2)}GB / ${limitGB}GB (${percentage.toFixed(1)}%)`,
          recommendedActions: [
            'Monitor egress closely',
            'Optimize image delivery',
            'Review high-traffic events',
          ],
        };
      } else if (percentage >= EGRESS_CONFIG.WARNING_THRESHOLD * 100) {
        alert = {
          level: 'warning',
          currentUsage: totalGBThisMonth,
          limit: limitGB,
          percentage,
          message: `Warning egress usage: ${totalGBThisMonth.toFixed(2)}GB / ${limitGB}GB (${percentage.toFixed(1)}%)`,
          recommendedActions: [
            'Review egress patterns',
            'Consider image optimization',
            'Monitor remaining budget',
          ],
        };
      }

      if (alert) {
        logger.warn('Egress alert triggered', {
          requestId,
          level: alert.level,
          currentUsage: alert.currentUsage,
          percentage: alert.percentage,
          message: alert.message,
        });
      }

      return alert;
    } catch (error) {
      logger.error('Failed to check egress alerts', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Obtiene top eventos por egress
   */
  async getTopEventsByEgress(limit: number = 10): Promise<
    Array<{
      eventId: string;
      eventName?: string;
      totalBytes: number;
      totalRequests: number;
      avgBytesPerRequest: number;
    }>
  > {
    const requestId = crypto.randomUUID();

    try {
      const { data, error } = await supabase
        .from('egress_metrics')
        .select(
          `
          event_id,
          bytes_served,
          requests_count,
          events!inner(id, name)
        `
        )
        .not('event_id', 'is', null);

      if (error) {
        throw new Error(`Error getting top events: ${error.message}`);
      }

      const metrics = data || [];

      // Agrupar por evento
      const eventTotals = metrics.reduce(
        (totals, m) => {
          const eventId = m.event_id;
          if (!eventId) return totals;

          if (!totals[eventId]) {
            totals[eventId] = {
              eventId,
              eventName: (m as any).events?.name,
              totalBytes: 0,
              totalRequests: 0,
            };
          }

          totals[eventId].totalBytes += m.bytes_served || 0;
          totals[eventId].totalRequests += m.requests_count || 0;

          return totals;
        },
        {} as Record<string, any>
      );

      // Convertir a array y ordenar
      const topEvents = Object.values(eventTotals)
        .map((event: any) => ({
          ...event,
          avgBytesPerRequest:
            event.totalRequests > 0
              ? Math.round(event.totalBytes / event.totalRequests)
              : 0,
        }))
        .sort((a, b) => b.totalBytes - a.totalBytes)
        .slice(0, limit);

      logger.info('Top events by egress calculated', {
        requestId,
        topEventsCount: topEvents.length,
        totalEvents: Object.keys(eventTotals).length,
      });

      return topEvents;
    } catch (error) {
      logger.error('Failed to get top events by egress', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Limpia métricas viejas (>90 días)
   */
  async cleanupOldMetrics(
    olderThanDays: number = 90
  ): Promise<{ deletedCount: number }> {
    const requestId = crypto.randomUUID();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const { error, count } = await supabase
        .from('egress_metrics')
        .delete()
        .lt('date', cutoffDateStr);

      if (error) {
        throw new Error(`Error cleaning up metrics: ${error.message}`);
      }

      const deletedCount = count || 0;

      // Invalidar todo el cache
      metricsCache.clear();

      logger.info('Old egress metrics cleaned up', {
        requestId,
        deletedCount,
        olderThanDays,
        cutoffDate: cutoffDateStr,
      });

      return { deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup old metrics', {
        requestId,
        olderThanDays,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = metricsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (cached) {
      metricsCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any, ttlMs: number): void {
    metricsCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private invalidateMetricsCache(eventId?: string): void {
    if (eventId) {
      metricsCache.delete(`event-${eventId}`);
    }

    // Invalidar caches que puedan incluir este evento
    const keysToDelete: string[] = [];
    for (const key of metricsCache.keys()) {
      if (key.startsWith('daily-') || key.startsWith('top-')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => metricsCache.delete(key));
  }

  /**
   * Limpieza periódica del cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of metricsCache) {
      if (cached.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => metricsCache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug('Expired egress cache cleaned', {
        count: keysToDelete.length,
      });
    }
  }
}

// Instancia singleton
export const egressService = new EgressService();

// Limpieza periódica del cache cada 10 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      (egressService as any).cleanExpiredCache();
    },
    10 * 60 * 1000
  );
}

// Configuración exportada
export const egressConfig = EGRESS_CONFIG;
