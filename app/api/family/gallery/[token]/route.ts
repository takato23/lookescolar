/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { familyService } from '@/lib/services/family.service';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginationMeta,
  logDevRequest,
} from '@/lib/utils/api-response';

const tokenParamsSchema = z.object({
  token: z.string().min(20, 'Token must be at least 20 characters'), // Minimum 20 characters as per security requirements
});

const queryParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 50)), // Max 100 per page
  photo_id: z.string().optional(), // Para obtener una foto específica
});

// Rate limiting se maneja en middleware.ts
export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext,
      { params }: { params: Promise<{ token: string }> }
    ) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        // Verificar que es una familia con token válido (ya verificado por AuthMiddleware)
        if (!authContext.isAdmin && !authContext.user) {
          return createErrorResponse(
            'Invalid token or access denied',
            'Authentication required',
            401,
            requestId
          );
        }

        // Log del acceso
        SecurityLogger.logResourceAccess(
          'family_gallery',
          authContext,
          request
        );

        // Validar parámetros de la URL
        const { token } = tokenParamsSchema.parse(await params);
        const { searchParams } = new URL(request.url);
        const { page, limit, offset } = parsePaginationParams(searchParams);
        const photo_id = searchParams.get('photo_id');

        // Obtener subject desde el token
        const subject = await familyService.getSubjectByToken(token);
        if (!subject) {
          return createErrorResponse(
            'Invalid token',
            'Subject not found for token',
            404,
            requestId
          );
        }

        // Si se solicita una foto específica
        if (photo_id) {
          try {
            const photoInfo = await familyService.getPhotoInfo(
              photo_id,
              subject.id
            );
            if (!photoInfo) {
              return createErrorResponse(
                'Photo not found or access denied',
                'Photo does not exist or is not accessible',
                404,
                requestId
              );
            }

            // Generar URL firmada para la foto
            const key =
              (photoInfo.photo as any).watermark_path ||
              (photoInfo.photo as any).preview_path;
            if (!key) {
              return createErrorResponse(
                'Vista previa no disponible',
                'No preview or watermark path available',
                404,
                requestId
              );
            }
            const signedUrl = await signedUrlForKey(key, 900); // 15 min

            // Trackear view
            await familyService.trackPhotoView(photo_id, subject.id);

            logDevRequest(
              requestId,
              'GET',
              `/api/family/gallery/${token}`,
              Date.now() - startTime,
              200
            );

            return createSuccessResponse(
              {
                photo: {
                  id: photoInfo.photo.id,
                  filename: photoInfo.photo.filename,
                  storage_path: photoInfo.photo.storage_path,
                  created_at: photoInfo.photo.created_at,
                  signed_url: signedUrl,
                },
              },
              undefined,
              requestId
            );
          } catch (photoError) {
            return createErrorResponse(
              'Error loading photo',
              photoError instanceof Error
                ? photoError.message
                : 'Unknown error',
              500,
              requestId
            );
          }
        }

        // Obtener fotos asignadas con paginación (individuales y grupales)
        const { photos, total, has_more } =
          await familyService.getSubjectPhotos(subject.id, page, limit);

        // Generar URLs firmadas para todas las fotos (individuales y grupales)
        const photosWithUrls = (
          await Promise.all(
            photos.map(async (assignment) => {
              const key =
                (assignment.photo as any).watermark_path ||
                (assignment.photo as any).preview_path;
              if (!key) return null;
              const signedUrl = await signedUrlForKey(key, 900); // 15 min de expiración

              // Determine if this is a group photo based on the structure
              const isGroupPhoto =
                'course_id' in assignment && assignment.course_id;

              return {
                id: assignment.photo.id,
                filename: assignment.photo.filename,
                storage_path: assignment.photo.storage_path,
                created_at: assignment.photo.created_at,
                signed_url: signedUrl,
                assignment_id: assignment.id,
                photo_type: assignment.photo.photo_type || 'individual',
                is_group_photo: isGroupPhoto,
                course_id: isGroupPhoto ? (assignment as any).course_id : null,
                tagged_at: (assignment as any).tagged_at,
              };
            })
          )
        ).filter(Boolean);

        // Obtener pedido activo si existe
        const activeOrder = await familyService.getActiveOrder(subject.id);

        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent('family_gallery_success', {
          requestId,
          subjectId: subject.id,
          photoCount: photos.length,
          duration,
        });

        return NextResponse.json({
          subject: {
            id: subject.id,
            name: subject.name,
            grade: (subject as any).grade,
            section: (subject as any).section,
            parent_name: subject.parent_name,
            parent_email: subject.parent_email,
            event: subject.event
              ? {
                  id: subject.event.id,
                  name: subject.event.name,
                  date: (subject.event as any).date,
                  school_name:
                    (subject.event as any).school_name ||
                    (subject.event as any).school,
                }
              : null,
            course: (subject as any).course
              ? {
                  id: (subject as any).course.id,
                  name: (subject as any).course.name,
                  grade: (subject as any).course.grade,
                  section: (subject as any).course.section,
                }
              : null,
          },
          photos: photosWithUrls,
          pagination: {
            page,
            limit,
            total,
            has_more,
            total_pages: Math.ceil(total / limit),
          },
          active_order: activeOrder
            ? {
                id: activeOrder.id,
                status: activeOrder.status,
                total_amount: activeOrder.total_amount,
                created_at: activeOrder.created_at,
                items_count: activeOrder.items.length,
              }
            : null,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent(
          'family_gallery_error',
          {
            requestId,
            subjectId: authContext.subject?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
          },
          'error'
        );

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid parameters',
              details: error.errors.map(
                (e) => `${e.path.join('.')}: ${e.message}`
              ),
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },
    'family'
  ) // Require family token authentication
);
