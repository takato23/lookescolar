import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { familyService } from '@/lib/services/family.service';
import { storageService } from '@/lib/services/storage';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

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
      { params }: { params: { token: string } }
    ) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        // Verificar que es una familia con token válido (ya verificado por AuthMiddleware)
        if (!authContext.isFamily || !authContext.subject) {
          return NextResponse.json(
            { error: 'Invalid token or access denied' },
            { status: 401 }
          );
        }

        // Log del acceso
        SecurityLogger.logResourceAccess(
          'family_gallery',
          authContext,
          request
        );

        // Validar parámetros de la URL
        const { token } = tokenParamsSchema.parse(params);
        const { searchParams } = new URL(request.url);
        const { page, limit, photo_id } = queryParamsSchema.parse(
          Object.fromEntries(searchParams)
        );

        const subject = authContext.subject;

        // Si se solicita una foto específica
        if (photo_id) {
          const photoInfo = await familyService.getPhotoInfo(
            photo_id,
            subject.id
          );
          if (!photoInfo) {
            return NextResponse.json(
              { error: 'Photo not found or access denied' },
              { status: 404 }
            );
          }

          // Generar URL firmada para la foto
          const signedUrl = await storageService.getSignedUrl(
            photoInfo.photo.storage_path,
            3600
          ); // 1 hora

          // Trackear view
          await familyService.trackPhotoView(photo_id, subject.id);

          return NextResponse.json({
            photo: {
              id: photoInfo.photo.id,
              filename: photoInfo.photo.filename,
              storage_path: photoInfo.photo.storage_path,
              created_at: photoInfo.photo.created_at,
              signed_url: signedUrl,
            },
          });
        }

        // Obtener fotos asignadas con paginación
        const { photos, total, has_more } =
          await familyService.getSubjectPhotos(subject.id, page, limit);

        // Generar URLs firmadas para todas las fotos
        const photosWithUrls = await Promise.all(
          photos.map(async (assignment) => {
            const signedUrl = await storageService.getSignedUrl(
              assignment.photo.storage_path,
              3600 // 1 hora de expiración
            );

            return {
              id: assignment.photo.id,
              filename: assignment.photo.filename,
              storage_path: assignment.photo.storage_path,
              created_at: assignment.photo.created_at,
              signed_url: signedUrl,
              assignment_id: assignment.id,
            };
          })
        );

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
            parent_name: subject.parent_name,
            parent_email: subject.parent_email,
            event: subject.event
              ? {
                  id: subject.event.id,
                  name: subject.event.name,
                  date: subject.event.date,
                  school_name: subject.event.school_name,
                  photo_prices: subject.event.photo_prices,
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
