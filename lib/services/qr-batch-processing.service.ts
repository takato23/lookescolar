/**
 * Batch QR Processing Service
 *
 * Handles batch processing of QR codes for events, including generation,
 * validation, and analytics collection.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { qrService, QRResult } from './qr.service';
import { qrAnalyticsService } from './qr-analytics.service';
import { securityAuditService } from '@/lib/security/qr-audit.service';
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

interface BatchQRRequest {
  eventId: string;
  students: Array<{
    id: string;
    name: string;
    courseId?: string;
    metadata?: Record<string, any>;
  }>;
  options?: {
    size?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  };
  userId?: string;
}

interface BatchQRResult {
  eventId: string;
  totalRequested: number;
  successfullyProcessed: number;
  failedProcessing: number;
  qrResults: Array<{
    studentId: string;
    studentName: string;
    qrData?: QRResult;
    error?: string;
  }>;
  processingTimeMs: number;
  batchId: string;
}

interface BatchValidationRequest {
  eventId: string;
  qrCodes: string[];
  validateAgainstEvent?: boolean;
}

interface BatchValidationResult {
  eventId: string;
  totalRequested: number;
  validCodes: number;
  invalidCodes: number;
  validationResults: Array<{
    qrCode: string;
    isValid: boolean;
    studentData?: any;
    error?: string;
  }>;
  processingTimeMs: number;
  batchId: string;
}

interface BatchAnalyticsRequest {
  eventId: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  metrics?: Array<'scans' | 'unique_scans' | 'success_rate' | 'avg_scan_time'>;
}

interface BatchAnalyticsResult {
  eventId: string;
  metrics: {
    totalScans: number;
    uniqueScans: number;
    successRate: number;
    avgScanTime: number;
    scansByHour: Record<number, number>;
    scansByDay: Record<string, number>;
    popularDevices: Array<{ device: string; count: number }>;
    errorAnalysis: Record<string, number>;
  };
  processingTimeMs: number;
  batchId: string;
}

export class QRBatchProcessingService {
  /**
   * Generate QR codes in batch for multiple students
   */
  async generateBatchQRCodes(request: BatchQRRequest): Promise<BatchQRResult> {
    const startTime = Date.now();
    const batchId = `batch_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('batch_qr_generation_started', {
        batchId,
        eventId: request.eventId,
        studentCount: request.students.length,
        userId: request.userId,
      });

      // Security audit
      await securityAuditService.logBatchQRGeneration({
        userId: request.userId || 'system',
        eventId: request.eventId,
        studentCount: request.students.length,
        batchId,
      });

      const results: BatchQRResult['qrResults'] = [];
      let successfullyProcessed = 0;
      let failedProcessing = 0;

      // Process in smaller batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < request.students.length; i += batchSize) {
        const batch = request.students.slice(i, i + batchSize);

        const batchPromises = batch.map(async (student) => {
          try {
            const qrResult = await qrService.generateQRForSubject(
              student.id,
              student.name,
              request.options,
              request.userId
            );

            successfullyProcessed++;
            return {
              studentId: student.id,
              studentName: student.name,
              qrData: qrResult,
            };
          } catch (error) {
            failedProcessing++;
            logger.error('batch_qr_generation_failed_for_student', {
              batchId,
              studentId: student.id,
              studentName: student.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              studentId: student.id,
              studentName: student.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const processingTimeMs = Date.now() - startTime;

      const batchResult: BatchQRResult = {
        eventId: request.eventId,
        totalRequested: request.students.length,
        successfullyProcessed,
        failedProcessing,
        qrResults: results,
        processingTimeMs,
        batchId,
      };

      logger.info('batch_qr_generation_completed', {
        batchId,
        eventId: request.eventId,
        totalRequested: request.students.length,
        successfullyProcessed,
        failedProcessing,
        processingTimeMs,
      });

      return batchResult;
    } catch (error) {
      logger.error('batch_qr_generation_failed', {
        batchId,
        eventId: request.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Validate QR codes in batch
   */
  async validateBatchQRCodes(
    request: BatchValidationRequest
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const batchId = `batch_validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('batch_qr_validation_started', {
        batchId,
        eventId: request.eventId,
        qrCodeCount: request.qrCodes.length,
      });

      const results: BatchValidationResult['validationResults'] = [];
      let validCodes = 0;
      let invalidCodes = 0;

      // Process in smaller batches
      const batchSize = 20;
      for (let i = 0; i < request.qrCodes.length; i += batchSize) {
        const batch = request.qrCodes.slice(i, i + batchSize);

        const batchPromises = batch.map(async (qrCode) => {
          try {
            // Validate QR code
            const response = await fetch('/api/qr/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                qrCode,
                eventId: request.validateAgainstEvent
                  ? request.eventId
                  : undefined,
              }),
            });

            if (response.ok) {
              const validationResult = await response.json();

              if (validationResult.success && validationResult.valid) {
                validCodes++;
                return {
                  qrCode,
                  isValid: true,
                  studentData: validationResult.data,
                };
              } else {
                invalidCodes++;
                return {
                  qrCode,
                  isValid: false,
                  error: validationResult.message || 'Invalid QR code',
                };
              }
            } else {
              invalidCodes++;
              return {
                qrCode,
                isValid: false,
                error: `Validation failed with status ${response.status}`,
              };
            }
          } catch (error) {
            invalidCodes++;
            logger.error('batch_qr_validation_failed_for_code', {
              batchId,
              qrCode: qrCode.substring(0, 20),
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              qrCode,
              isValid: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const processingTimeMs = Date.now() - startTime;

      const validationResult: BatchValidationResult = {
        eventId: request.eventId,
        totalRequested: request.qrCodes.length,
        validCodes,
        invalidCodes,
        validationResults: results,
        processingTimeMs,
        batchId,
      };

      logger.info('batch_qr_validation_completed', {
        batchId,
        eventId: request.eventId,
        totalRequested: request.qrCodes.length,
        validCodes,
        invalidCodes,
        processingTimeMs,
      });

      return validationResult;
    } catch (error) {
      logger.error('batch_qr_validation_failed', {
        batchId,
        eventId: request.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Get analytics for all QR codes in an event
   */
  async getBatchAnalytics(
    request: BatchAnalyticsRequest
  ): Promise<BatchAnalyticsResult> {
    const startTime = Date.now();
    const batchId = `batch_analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('batch_qr_analytics_started', {
        batchId,
        eventId: request.eventId,
      });

      // Get all QR codes for this event
      const { data: qrCodes, error: qrError } = await supabase
        .from('codes')
        .select('id')
        .eq('event_id', request.eventId);

      if (qrError) {
        throw new Error(`Failed to fetch QR codes: ${qrError.message}`);
      }

      if (!qrCodes || qrCodes.length === 0) {
        return {
          eventId: request.eventId,
          metrics: {
            totalScans: 0,
            uniqueScans: 0,
            successRate: 0,
            avgScanTime: 0,
            scansByHour: {},
            scansByDay: {},
            popularDevices: [],
            errorAnalysis: {},
          },
          processingTimeMs: Date.now() - startTime,
          batchId,
        };
      }

      // Get analytics for all QR codes
      const metrics = await qrAnalyticsService.getEventQRMetrics(
        request.eventId
      );

      // Aggregate metrics
      let totalScans = 0;
      let uniqueScans = 0;
      let successCount = 0;
      let totalScanTime = 0;
      let scanCount = 0;
      const scansByHour: Record<number, number> = {};
      const scansByDay: Record<string, number> = {};
      const deviceCounts: Record<string, number> = {};
      const errorCounts: Record<string, number> = {};

      Object.values(metrics).forEach((qrMetrics) => {
        totalScans += qrMetrics.totalScans;
        uniqueScans += qrMetrics.uniqueScans;
        successCount += qrMetrics.successRate * qrMetrics.totalScans;
        totalScanTime += qrMetrics.avgScanTime * qrMetrics.totalScans;
        scanCount += qrMetrics.totalScans;

        // Aggregate time-based metrics
        Object.entries(qrMetrics.scansByHour).forEach(([hour, count]) => {
          scansByHour[parseInt(hour)] =
            (scansByHour[parseInt(hour)] || 0) + count;
        });

        Object.entries(qrMetrics.scansByDay).forEach(([day, count]) => {
          scansByDay[day] = (scansByDay[day] || 0) + count;
        });

        // Aggregate device metrics
        qrMetrics.popularDevices.forEach((deviceInfo) => {
          deviceCounts[deviceInfo.device] =
            (deviceCounts[deviceInfo.device] || 0) + deviceInfo.count;
        });

        // Aggregate error metrics
        Object.entries(qrMetrics.errorAnalysis).forEach(([error, count]) => {
          errorCounts[error] = (errorCounts[error] || 0) + count;
        });
      });

      const successRate = totalScans > 0 ? successCount / totalScans : 0;
      const avgScanTime = scanCount > 0 ? totalScanTime / scanCount : 0;

      // Sort popular devices
      const popularDevices = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);

      const analyticsResult: BatchAnalyticsResult = {
        eventId: request.eventId,
        metrics: {
          totalScans,
          uniqueScans,
          successRate,
          avgScanTime,
          scansByHour,
          scansByDay,
          popularDevices,
          errorAnalysis: errorCounts,
        },
        processingTimeMs: Date.now() - startTime,
        batchId,
      };

      logger.info('batch_qr_analytics_completed', {
        batchId,
        eventId: request.eventId,
        totalScans,
        uniqueScans,
        successRate,
        avgScanTime,
        processingTimeMs: Date.now() - startTime,
      });

      return analyticsResult;
    } catch (error) {
      logger.error('batch_qr_analytics_failed', {
        batchId,
        eventId: request.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Export QR codes for an event
   */
  async exportEventQRCodes(
    eventId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      // Get all QR codes for this event
      const { data: qrCodes, error: qrError } = await supabase
        .from('codes')
        .select(
          `
          id,
          code_value,
          title,
          created_at,
          subjects (
            id,
            name
          )
        `
        )
        .eq('event_id', eventId);

      if (qrError) {
        throw new Error(`Failed to fetch QR codes: ${qrError.message}`);
      }

      if (format === 'csv') {
        // Convert to CSV format
        const headers = [
          'QR Code ID',
          'Code Value',
          'Student Name',
          'Created At',
        ];
        const rows =
          qrCodes?.map((qr) => [
            qr.id,
            qr.code_value,
            (qr.subjects as any)?.name || 'Unknown',
            qr.created_at,
          ]) || [];

        const csvContent = [
          headers.join(','),
          ...rows.map((row) => row.map((field) => `"${field}"`).join(',')),
        ].join('\n');

        return csvContent;
      } else {
        // Return as JSON
        return JSON.stringify(qrCodes, null, 2);
      }
    } catch (error) {
      logger.error('qr_export_failed', {
        eventId,
        format,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Import QR codes from file
   */
  async importQRCodes(
    eventId: string,
    qrData: any[],
    userId?: string
  ): Promise<{
    totalImported: number;
    totalFailed: number;
    results: Array<{
      codeValue: string;
      success: boolean;
      message: string;
    }>;
  }> {
    try {
      const results: Array<{
        codeValue: string;
        success: boolean;
        message: string;
      }> = [];

      let totalImported = 0;
      let totalFailed = 0;

      // Process in batches
      const batchSize = 20;
      for (let i = 0; i < qrData.length; i += batchSize) {
        const batch = qrData.slice(i, i + batchSize);

        const batchPromises = batch.map(async (qrItem) => {
          try {
            // Insert QR code into database
            const { data, error } = await supabase
              .from('codes')
              .insert({
                event_id: eventId,
                code_value: qrItem.codeValue,
                title: qrItem.title || `Imported QR - ${qrItem.codeValue}`,
                is_published: qrItem.isPublished !== false, // Default to true
              })
              .select()
              .single();

            if (error) {
              totalFailed++;
              return {
                codeValue: qrItem.codeValue,
                success: false,
                message: `Database error: ${error.message}`,
              };
            }

            // Link to subject if provided
            if (qrItem.subjectId) {
              await supabase
                .from('subjects')
                .update({
                  qr_code: data.id,
                })
                .eq('id', qrItem.subjectId);
            }

            totalImported++;
            return {
              codeValue: qrItem.codeValue,
              success: true,
              message: 'Successfully imported',
            };
          } catch (error) {
            totalFailed++;
            return {
              codeValue: qrItem.codeValue,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // Log import activity
      await securityAuditService.logBatchImport({
        userId: userId || 'system',
        eventId,
        totalImported,
        totalFailed,
      });

      return {
        totalImported,
        totalFailed,
        results,
      };
    } catch (error) {
      logger.error('qr_import_failed', {
        eventId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}

export const qrBatchProcessingService = new QRBatchProcessingService();
