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
} from '@/lib/utils/api-response';

const tokenParamsSchema = z.object({
  token: z.string().min(20, 'Token must be at least 20 characters'),
});

const queryParamsSchema = z.object({
  photo_type: z.enum(['group', 'activity', 'event']).optional(),
});

// GET /api/family/gallery/[token]/group-photos - Get only group photos for family
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
        // Verify valid family token access
        if (!authContext.isAdmin && !authContext.user) {
          return createErrorResponse(
            'Invalid token or access denied',
            'Authentication required',
            401,
            requestId
          );
        }

        // Log access
        SecurityLogger.logResourceAccess(
          'family_group_photos',
          authContext,
          request
        );

        // Validate parameters
        const { token } = tokenParamsSchema.parse(params);
        const { searchParams } = new URL(request.url);
        const { page, limit } = parsePaginationParams(searchParams);
        const { photo_type } = queryParamsSchema.parse({
          photo_type: searchParams.get('photo_type'),
        });

        // Get student from token
        const student = await familyService.getSubjectByToken(token);
        if (!student) {
          return createErrorResponse(
            'Invalid token',
            'Student not found for token',
            404,
            requestId
          );
        }

        // Get only group photos for the student
        const { photos, total, has_more } =
          await familyService.getStudentGroupPhotos(student.id, page, limit);

        // Filter by photo_type if specified
        const filteredPhotos = photo_type
          ? photos.filter((photo) => photo.photo_type === photo_type)
          : photos;

        // Generate signed URLs for group photos
        const photosWithUrls = (
          await Promise.all(
            filteredPhotos.map(async (groupPhoto) => {
              const key =
                (groupPhoto.photo as any).watermark_path ||
                (groupPhoto.photo as any).preview_path;
              if (!key) return null;

              const signedUrl = await signedUrlForKey(key, 900); // 15 min expiry

              return {
                id: groupPhoto.photo.id,
                filename: groupPhoto.photo.filename,
                storage_path: groupPhoto.photo.storage_path,
                created_at: groupPhoto.photo.created_at,
                signed_url: signedUrl,
                photo_type: groupPhoto.photo_type,
                is_group_photo: true,
                course_id: groupPhoto.course_id,
                tagged_at: groupPhoto.tagged_at,
                association_id: groupPhoto.id,
              };
            })
          )
        ).filter(Boolean);

        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent('family_group_photos_success', {
          requestId,
          studentId: student.id,
          photoCount: photosWithUrls.length,
          photoType: photo_type,
          duration,
        });

        return NextResponse.json({
          student: {
            id: student.id,
            name: student.name,
            grade: student.grade,
            section: student.section,
            course: student.course || null,
          },
          photos: photosWithUrls,
          pagination: {
            page,
            limit,
            total: photo_type ? photosWithUrls.length : total,
            has_more: photo_type ? false : has_more,
            total_pages: Math.ceil(
              (photo_type ? photosWithUrls.length : total) / limit
            ),
          },
          filters: {
            photo_type: photo_type || 'all',
          },
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent(
          'family_group_photos_error',
          {
            requestId,
            studentId: authContext.subject?.id,
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
  )
);
