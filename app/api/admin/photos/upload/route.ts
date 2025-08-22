import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';
import { processImageBatch, validateImage } from '@/lib/services/watermark';
import { uploadToStorage } from '@/lib/services/storage';
import { qrDetectionService } from '@/lib/services/qr-detection.service';
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
      const formData = await request.formData();
      const eventId = formData.get('eventId') as string;
      const files = formData.getAll('files') as File[];

      // Validaciones de entrada
      if (!eventId) {
        return NextResponse.json(
          { error: 'Event ID is required' },
          { status: 400 }
        );
      }

      // Validar formato UUID del eventId
      try {
        new URL(`urn:uuid:${eventId}`);
      } catch {
        return NextResponse.json(
          { error: 'Invalid event ID format' },
          { status: 400 }
        );
      }

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: 'No files received' },
          { status: 400 }
        );
      }

      // Límite de archivos por request según constantes de seguridad
      if (files.length > 20) {
        return NextResponse.json(
          { error: 'Maximum 20 files per request' },
          { status: 400 }
        );
      }

      // Verificar que el evento existe y pertenece al usuario
      const supabase = await createServerSupabaseClient();
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
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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

      // Procesar todas las imágenes con watermark usando p-limit internamente
      const {
        results: processedImages,
        errors: processingErrors,
        duplicates,
      } = await processImageBatch(
        imageBuffers.map((item) => ({
          buffer: item.buffer,
          originalName: item.originalName,
        })),
        {
          text: `© ${event.name} - PREVIEW`,
          position: 'center',
        },
        3 // Límite de concurrencia según CLAUDE.md
      );

      // Agregar errores de procesamiento
      uploadErrors.push(
        ...processingErrors.map((e) => ({
          filename: e.originalName,
          error: e.error,
        }))
      );

      // Agregar duplicados como errores informativos
      uploadErrors.push(
        ...duplicates.map((d) => ({
          filename: d.originalName,
          error: `Imagen duplicada de ${d.duplicateOf} (hash: ${d.hash.substring(0, 8)}...)`,
        }))
      );

      // Subir imágenes procesadas al storage y guardar en DB
      for (let i = 0; i < processedImages.length; i++) {
        const processed = processedImages[i];
        const originalBuffer = imageBuffers[i];
        const originalName = originalBuffer?.originalName || `image_${i}`;

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

          // Subir al storage
          const storageResult = await uploadToStorage(processed, eventId);
          const path = storageResult.path;
          const size = storageResult.size;

          // Validar que el path de storage es seguro
          if (!SecurityValidator.isValidStoragePath(path)) {
            throw new Error('Invalid storage path generated');
          }

          // Detect QR codes in the original image
          let detectedQRCode = null;
          let detectedStudentId = null;
          
          try {
            const qrResults = await qrDetectionService.detectQRCodesInImage(
              originalBuffer.buffer,
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
            SecurityLogger.logSecurityEvent('qr_detection_failed', {
              requestId,
              filename: originalName,
              error: qrError.message,
              eventId,
            }, 'warn');
          }

          // Guardar en base de datos
          const { data: photoData, error: dbError } = await serviceClient
            .from('photos')
            .insert({
              event_id: eventId,
              storage_path: path,
              watermark_path: path, // Por ahora es lo mismo
              width: processed.width,
              height: processed.height,
              file_size: size,
              mime_type: 'image/webp',
              approved: false, // Por defecto no aprobada hasta tagging
              subject_id: detectedStudentId, // Auto-assign if QR detected
              code_id: detectedQRCode, // Link to detected QR code
              original_filename:
                SecurityValidator.sanitizeFilename(originalName),
              processing_status: 'completed',
            })
            .select()
            .single();

          if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
          }

          const photo = photoData;

          results.push({
            id: photo.id,
            filename: originalName,
            size: size,
            width: processed.width,
            height: processed.height,
            path: path,
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
        uploaded: results,
        errors: uploadErrors.length > 0 ? uploadErrors : undefined,
        duplicates: duplicates.length > 0 ? duplicates : undefined,
        stats: {
          processed: results.length,
          errors: processingErrors.length,
          duplicates: duplicates.length,
          total: imageBuffers.length,
        },
        message:
          results.length > 0
            ? `${results.length} photos uploaded successfully${uploadErrors.length > 0 ? ` (${uploadErrors.length} with errors)` : ''}${duplicates.length > 0 ? ` (${duplicates.length} duplicates skipped)` : ''}`
            : 'No images could be processed',
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent(
        'photo_upload_fatal_error',
        {
          requestId,
          error: error.message,
          duration,
          eventId: request.nextUrl.searchParams.get('eventId'),
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Failed to process images' },
        { status: 500 }
      );
    }
  }, 'admin') // Require admin authentication
);

// Configuración para archivos grandes
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos timeout
