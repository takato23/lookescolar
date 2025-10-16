/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { processImageBatch, validateImage } from '@/lib/services/watermark';
import { uploadToStorage } from '@/lib/services/storage';
// Lazy import QR detection only when needed
let qrDetectionService: any = null;

async function getQrService() {
  if (!qrDetectionService) {
    qrDetectionService = (await import('@/lib/services/qr-detection.service'))
      .qrDetectionService;
  }
  return qrDetectionService;
}
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  SecurityValidator,
  SecuritySanitizer,
  SECURITY_CONSTANTS,
} from '@/lib/security/validation';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';

// Configure runtime for server-side processing
export const runtime = 'nodejs';
export const maxDuration = 30;

// Dynamic import for Sharp to prevent bundling issues
let sharp: any = null;

async function getSharp() {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      console.error('Failed to load Sharp:', error);
      throw new Error('Image processing unavailable');
    }
  }
  return sharp;
}

// Usar el wrapper de autenticación y rate limiting
export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Verificar que es admin (ya verificado por AuthMiddleware)
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // Log del acceso
      SecurityLogger.logResourceAccess('photo_upload', authContext, request);

      // Verificar IP y User-Agent
      const ip =
        request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
      if (!SecurityValidator.isAllowedIP(ip)) {
        SecurityLogger.logSecurityEvent(
          'blocked_ip_access',
          { ip, endpoint: 'photo_upload' },
          'warn'
        );
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const userAgent = request.headers.get('user-agent');
      if (SecurityValidator.isSuspiciousUserAgent(userAgent)) {
        SecurityLogger.logSecurityEvent(
          'suspicious_user_agent',
          { userAgent, ip },
          'warn'
        );
      }

      // Obtener datos del formulario
      // En tests, algunos entornos no envían correctamente multipart; si no hay formData, devolver error
      const formData = await request.formData().catch(() => null as any);
      if (!formData) {
        return NextResponse.json(
          { success: false, error: 'Invalid form data' },
          { status: 400 }
        );
      }
      const eventId = formData.get('eventId') as string;
      const files = formData.getAll('files') as File[];

      // Validaciones de entrada (short-circuit antes de cualquier operación pesada)
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      // Validar formato UUID del eventId usando zod para fallo temprano
      const idSchema = z.string().uuid();
      const idCheck = idSchema.safeParse(eventId);
      if (!idCheck.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid event ID format' },
          { status: 400 }
        );
      }

      if (!files || files.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No files received' },
          { status: 400 }
        );
      }

      // Límite de archivos por request según constantes de seguridad
      if (files.length > 20) {
        return NextResponse.json(
          { success: false, error: 'Maximum 20 files per request' },
          { status: 400 }
        );
      }

      // Verificar que el evento existe (usar service client para evitar dependencia de sesión)
      const supabase = await createServerSupabaseServiceClient();
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, created_by')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        SecurityLogger.logSecurityEvent(
          'invalid_event_access',
          {
            eventId,
            userId: authContext.user?.id,
            error: eventError?.message,
          },
          'warn'
        );
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }

      // Verificar que el usuario tiene acceso al evento
      if (authContext.user && eventData.created_by !== authContext.user.id) {
        SecurityLogger.logSecurityEvent(
          'unauthorized_event_access',
          {
            eventId,
            userId: authContext.user.id,
            eventOwner: eventData.created_by,
          },
          'warn'
        );
        return NextResponse.json(
          { error: 'Access denied to this event' },
          { status: 403 }
        );
      }

      const event = eventData;

      SecurityLogger.logSecurityEvent('photo_upload_start', {
        requestId,
        eventId,
        userId: authContext.user?.id,
        fileCount: files.length,
      });

      const serviceClient = await createServerSupabaseServiceClient();
      const results = [];
      const uploadErrors = [];

      // Convertir archivos a buffers y validar
      const imageBuffers: Array<{
        buffer: Buffer;
        originalName: string;
        file: File;
      }> = [];

      for (const file of files) {
        try {
          // Validaciones de seguridad del archivo
          if (!SecurityValidator.isAllowedContentType(file.type)) {
            uploadErrors.push({
              filename: file.name,
              error: 'File type not allowed',
            });
            continue;
          }

          if (file.size > SECURITY_CONSTANTS.MAX_FILE_SIZE) {
            uploadErrors.push({
              filename: file.name,
              error: 'File too large',
            });
            continue;
          }

          if (!SecurityValidator.isSafeFilename(file.name)) {
            // Sanitizar el nombre del archivo
            const sanitizedName = SecurityValidator.sanitizeFilename(file.name);
            SecurityLogger.logSecurityEvent(
              'filename_sanitized',
              {
                original: file.name,
                sanitized: sanitizedName,
              },
              'warn'
            );
          }

          const buffer = Buffer.from(await file.arrayBuffer());

          // Validar que es una imagen antes de procesarla
          const isValid = await validateImage(buffer);
          if (!isValid) {
            uploadErrors.push({
              filename: file.name,
              error: 'Invalid image file',
            });
            continue;
          }

          imageBuffers.push({ buffer, originalName: file.name, file });
        } catch (error: any) {
          SecurityLogger.logSecurityEvent(
            'file_processing_error',
            {
              filename: file.name,
              error: error.message,
            },
            'error'
          );

          uploadErrors.push({
            filename: file.name,
            error: `Error processing file: ${error.message}`,
          });
        }
      }

      if (imageBuffers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'No valid images found to process',
            errors: uploadErrors,
          },
          { status: 400 }
        );
      }

      // Process all images with FreeTierOptimizer (no original storage)
      const processedImages: Array<{
        buffer: Buffer;
        originalName: string;
        width: number;
        height: number;
        actualSizeKB: number;
        compressionLevel: number;
        originalSize: number;
        source: {
          buffer: Buffer;
          file: File;
        };
      }> = [];
      const processingErrors = [];

      for (const imageBuffer of imageBuffers) {
        try {
          // Get event name for watermark
          let wmLabel = 'Look Escolar';
          try {
            const { data: evInfo } = await serviceClient
              .from('events')
              .select('name, school_name')
              .eq('id', eventId)
              .single();
            if (evInfo?.name || evInfo?.school_name) {
              wmLabel =
                `${evInfo.school_name || ''}${evInfo.school_name && evInfo.name ? ' · ' : ''}${evInfo.name || ''}`.trim() ||
                wmLabel;
            }
          } catch {}

          // Process image with FreeTierOptimizer (no original storage)
          const optimizedResult = await FreeTierOptimizer.processForFreeTier(
            imageBuffer.buffer,
            {
              targetSizeKB: 35, // Aggressive compression for free tier
              maxDimension: 500, // Reduced dimensions for better compression
              watermarkText: wmLabel,
              enableOriginalStorage: false, // NEVER store originals
            }
          );

          processedImages.push({
            buffer: optimizedResult.processedBuffer,
            originalName: imageBuffer.originalName,
            width: optimizedResult.finalDimensions.width,
            height: optimizedResult.finalDimensions.height,
            actualSizeKB: optimizedResult.actualSizeKB,
            compressionLevel: optimizedResult.compressionLevel,
            originalSize: imageBuffer.file.size,
            source: {
              buffer: imageBuffer.buffer,
              file: imageBuffer.file,
            },
          });
        } catch (error: any) {
          processingErrors.push({
            originalName: imageBuffer.originalName,
            error: error.message,
          });
        }
      }

      // Agregar errores de procesamiento
      uploadErrors.push(
        ...processingErrors.map((e) => ({
          filename: e.originalName,
          error: e.error,
        }))
      );

      // Upload processed images to storage (only previews, no originals)
      for (const processed of processedImages) {
        const originalName = processed.originalName;

        try {
          // Validar dimensiones de la imagen procesada
          if (
            !SecurityValidator.isValidImageDimensions(
              processed.width,
              processed.height
            )
          ) {
            throw new Error(
              `Invalid image dimensions: ${processed.width}x${processed.height}`
            );
          }

          // Generate unique filename
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const fileExtension = 'webp'; // Always WebP for optimized images
          const uniqueFilename = `${timestamp}-${randomSuffix}-${originalName.replace(/\.[^/.]+$/, '')}.${fileExtension}`;

          // Upload to preview bucket (NO original storage)
          // Store in uploads folder to match admin API expectations
          const containerPrefix = `events/${eventId}`;
          const previewPath = `${containerPrefix}/uploads/${uniqueFilename}`;
          const PREVIEW_BUCKET =
            process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

          const { error: uploadError } = await serviceClient.storage
            .from(PREVIEW_BUCKET)
            .upload(previewPath, processed.buffer, {
              contentType: 'image/webp',
              cacheControl: '86400', // 24h cache for public previews
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // Detect QR codes in the original image
          let detectedQRCode = null;
          let detectedStudentId = null;

          try {
            const qrSvc = await getQrService();
            const qrResults = await qrSvc.detectQRCodesInImage(
              processed.source.buffer,
              eventId,
              {
                maxWidth: 1920,
                maxHeight: 1080,
                enhanceContrast: true,
              }
            );

            if (qrResults.length > 0) {
              // Use the first detected QR code with highest confidence
              const topQR = qrResults[0];
              detectedQRCode = topQR.data?.id || null;
              detectedStudentId = topQR.data?.studentId || null;

              SecurityLogger.logSecurityEvent('qr_detected_in_photo', {
                requestId,
                filename: originalName,
                qrCodeId: detectedQRCode,
                studentId: detectedStudentId?.substring(0, 8) + '***',
                confidence: topQR.confidence,
                eventId,
              });
            }
          } catch (qrError: any) {
            // QR detection failure shouldn't block photo upload
            SecurityLogger.logSecurityEvent(
              'qr_detection_failed',
              {
                requestId,
                filename: originalName,
                error: qrError.message,
                eventId,
              },
              'warn'
            );
          }

          // Guardar en base de datos (only preview path, no original storage)
          const { data: photoData, error: dbError } = await serviceClient
            .from('photos')
            .insert({
              event_id: eventId,
              preview_path: previewPath, // Only store preview path
              width: processed.width,
              height: processed.height,
              file_size: processed.actualSizeKB * 1024, // Use optimized size
              mime_type: 'image/webp', // Always WebP for optimized images
              approved: false, // Por defecto no aprobada hasta tagging
              subject_id: detectedStudentId, // Auto-assign if QR detected
              code_id: detectedQRCode, // Link to detected QR code
              original_filename:
                SecurityValidator.sanitizeFilename(originalName),
              processing_status: 'completed',
              metadata: {
                freetier_optimized: true,
                compression_level: processed.compressionLevel,
                original_size: processed.originalSize,
                optimization_ratio: Math.round(
                  ((processed.originalSize - processed.actualSizeKB * 1024) /
                    processed.originalSize) *
                    100
                ),
              },
            })
            .select()
            .single();

          if (dbError) {
            // Clean up uploaded preview on database error
            await serviceClient.storage
              .from(PREVIEW_BUCKET)
              .remove([previewPath]);
            throw new Error(`Database error: ${dbError.message}`);
          }

          const photo = photoData;

          results.push({
            id: photo.id,
            filename: originalName,
            size: processed.actualSizeKB * 1024,
            width: processed.width,
            height: processed.height,
            path: previewPath,
            qrDetected: detectedQRCode !== null,
            qrCodeId: detectedQRCode,
            studentId: detectedStudentId,
            autoClassified: detectedStudentId !== null,
          });
        } catch (error: any) {
          SecurityLogger.logSecurityEvent(
            'photo_storage_error',
            {
              requestId,
              filename: originalName,
              error: error.message,
              eventId,
            },
            'error'
          );

          uploadErrors.push({
            filename: originalName,
            error: `Upload failed: ${error.message}`,
          });
        }
      }

      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent('photo_upload_complete', {
        requestId,
        eventId,
        userId: authContext.user?.id,
        successCount: results.length,
        errorCount: uploadErrors.length,
        duration,
      });

      return NextResponse.json({
        success: results.length > 0,
        message:
          results.length > 0
            ? `Successfully uploaded ${results.length} photos`
            : 'No photos were successfully uploaded',
        results,
        errors: uploadErrors,
        statistics: {
          total: imageBuffers.length,
          successful: results.length,
          failed: uploadErrors.length,
          durationMs: duration,
        },
      });
    } catch (error: any) {
      SecurityLogger.logSecurityEvent(
        'photo_upload_unexpected_error',
        {
          requestId,
          error: error.message,
          stack: error.stack,
        },
        'error'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred during photo upload',
        },
        { status: 500 }
      );
    }
  })
);

// Provide a small JSON response for GET to avoid test JSON parse errors on 405/HTML
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
    },
    { status: 405 }
  );
}
