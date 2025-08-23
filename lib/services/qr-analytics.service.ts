import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import 'server-only';

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

interface QRScanEvent {
  qrCodeId: string;
  eventId: string;
  scannedAt: Date;
  deviceType: string;
  userAgent?: string;
  ipAddress: string;
  location?: string;
  scanDuration?: number;
  success: boolean;
  errorMessage?: string;
}

interface QRUsageMetrics {
  totalScans: number;
  uniqueScans: number;
  successRate: number;
  avgScanTime: number;
  popularDevices: Array<{ device: string; count: number }>;
  scansByHour: Record<number, number>;
  scansByDay: Record<string, number>;
  errorAnalysis: Record<string, number>;
}

export class QRAnalyticsService {
  private scanEvents: QRScanEvent[] = [];
  
  /**
   * Record QR scan event
   */
  async recordScan(event: QRScanEvent): Promise<void> {
    try {
      // Store in database
      const { error } = await supabase
        .from('qr_scan_events')
        .insert({
          qr_code_id: event.qrCodeId,
          event_id: event.eventId,
          scanned_at: event.scannedAt.toISOString(),
          device_type: event.deviceType,
          user_agent: event.userAgent,
          ip_address: event.ipAddress,
          location: event.location,
          scan_duration: event.scanDuration,
          success: event.success,
          error_message: event.errorMessage,
        });

      if (error) {
        logger.error('Failed to record QR scan event', { error: error.message });
        // Keep in memory as fallback
        this.scanEvents.push(event);
      }

      logger.info('QR scan recorded', {
        qrCodeId: event.qrCodeId,
        success: event.success,
        deviceType: event.deviceType,
      });
    } catch (error) {
      logger.error('Error recording QR scan', { error });
      this.scanEvents.push(event);
    }
  }

  /**
   * Get usage metrics for QR code
   */
  async getQRMetrics(qrCodeId: string, timeRange?: { start: Date; end: Date }): Promise<QRUsageMetrics> {
    try {
      let query = supabase
        .from('qr_scan_events')
        .select('*')
        .eq('qr_code_id', qrCodeId);

      if (timeRange) {
        query = query
          .gte('scanned_at', timeRange.start.toISOString())
          .lte('scanned_at', timeRange.end.toISOString());
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to get QR metrics: ${error.message}`);
      }

      return this.calculateMetrics(events || []);
    } catch (error) {
      logger.error('Failed to get QR metrics', { qrCodeId, error });
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get aggregate metrics for event
   */
  async getEventQRMetrics(eventId: string): Promise<{
    [qrCodeId: string]: QRUsageMetrics;
  }> {
    try {
      const { data: events, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        throw new Error(`Failed to get event QR metrics: ${error.message}`);
      }

      const metricsByQR: { [qrCodeId: string]: any[] } = {};
      
      (events || []).forEach(event => {
        if (!metricsByQR[event.qr_code_id]) {
          metricsByQR[event.qr_code_id] = [];
        }
        metricsByQR[event.qr_code_id].push(event);
      });

      const result: { [qrCodeId: string]: QRUsageMetrics } = {};
      
      for (const [qrCodeId, qrEvents] of Object.entries(metricsByQR)) {
        result[qrCodeId] = this.calculateMetrics(qrEvents);
      }

      return result;
    } catch (error) {
      logger.error('Failed to get event QR metrics', { eventId, error });
      return {};
    }
  }

  /**
   * Calculate metrics from events
   */
  private calculateMetrics(events: any[]): QRUsageMetrics {
    if (events.length === 0) {
      return this.getDefaultMetrics();
    }

    const uniqueIPs = new Set(events.map(e => e.ip_address));
    const successfulScans = events.filter(e => e.success);
    const avgScanTime = events
      .filter(e => e.scan_duration)
      .reduce((sum, e) => sum + e.scan_duration, 0) / events.length;

    // Device analysis
    const deviceCounts: Record<string, number> = {};
    events.forEach(e => {
      deviceCounts[e.device_type] = (deviceCounts[e.device_type] || 0) + 1;
    });

    const popularDevices = Object.entries(deviceCounts)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    // Time analysis
    const scansByHour: Record<number, number> = {};
    const scansByDay: Record<string, number> = {};
    
    events.forEach(e => {
      const date = new Date(e.scanned_at);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];
      
      scansByHour[hour] = (scansByHour[hour] || 0) + 1;
      scansByDay[day] = (scansByDay[day] || 0) + 1;
    });

    // Error analysis
    const errorAnalysis: Record<string, number> = {};
    events
      .filter(e => !e.success && e.error_message)
      .forEach(e => {
        errorAnalysis[e.error_message] = (errorAnalysis[e.error_message] || 0) + 1;
      });

    return {
      totalScans: events.length,
      uniqueScans: uniqueIPs.size,
      successRate: successfulScans.length / events.length,
      avgScanTime,
      popularDevices,
      scansByHour,
      scansByDay,
      errorAnalysis,
    };
  }

  private getDefaultMetrics(): QRUsageMetrics {
    return {
      totalScans: 0,
      uniqueScans: 0,
      successRate: 0,
      avgScanTime: 0,
      popularDevices: [],
      scansByHour: {},
      scansByDay: {},
      errorAnalysis: {},
    };
  }

  /**
   * Get top performing QR codes
   */
  async getTopQRCodes(eventId: string, limit = 10): Promise<Array<{
    qrCodeId: string;
    totalScans: number;
    uniqueScans: number;
    successRate: number;
  }>> {
    try {
      const { data: events, error } = await supabase
        .from('qr_scan_events')
        .select('qr_code_id, success, ip_address')
        .eq('event_id', eventId);

      if (error) {
        throw new Error(`Failed to get top QR codes: ${error.message}`);
      }

      const qrStats: Record<string, {
        total: number;
        unique: Set<string>;
        successful: number;
      }> = {};

      (events || []).forEach(event => {
        if (!qrStats[event.qr_code_id]) {
          qrStats[event.qr_code_id] = {
            total: 0,
            unique: new Set(),
            successful: 0,
          };
        }
        
        const stats = qrStats[event.qr_code_id];
        stats.total++;
        stats.unique.add(event.ip_address);
        if (event.success) stats.successful++;
      });

      return Object.entries(qrStats)
        .map(([qrCodeId, stats]) => ({
          qrCodeId,
          totalScans: stats.total,
          uniqueScans: stats.unique.size,
          successRate: stats.successful / stats.total,
        }))
        .sort((a, b) => b.totalScans - a.totalScans)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top QR codes', { eventId, error });
      return [];
    }
  }
}

export const qrAnalyticsService = new QRAnalyticsService();