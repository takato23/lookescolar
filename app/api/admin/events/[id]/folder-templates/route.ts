import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { SchoolFolderTemplatesService } from '@/lib/services/school-folder-templates.service';
import { logger } from '@/lib/utils/logger';

// GET /api/admin/events/{eventId}/folder-templates
// Get available folder templates and optionally apply one
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const requestId = crypto.randomUUID();

      try {
        const { id: eventId } = params;
        const url = new URL(req.url);
        const action = url.searchParams.get('action');
        const templateId = url.searchParams.get('templateId');
        const search = url.searchParams.get('search');

        logger.info('Folder templates request', {
          requestId,
          eventId,
          action,
          templateId,
          search,
        });

        // Handle different actions
        switch (action) {
          case 'list':
          default:
            // Get available templates
            const templates = search
              ? SchoolFolderTemplatesService.searchTemplates(search)
              : SchoolFolderTemplatesService.getAvailableTemplates();

            return NextResponse.json({
              success: true,
              templates,
              count: templates.length,
            });

          case 'preview':
            if (!templateId) {
              return NextResponse.json(
                { success: false, error: 'Template ID required for preview' },
                { status: 400 }
              );
            }

            const preview =
              SchoolFolderTemplatesService.generateTemplatePreview(templateId);
            return NextResponse.json({
              success: preview.success,
              preview: preview.preview,
              error: preview.error,
            });

          case 'validate':
            if (!templateId) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Template ID required for validation',
                },
                { status: 400 }
              );
            }

            const validation =
              await SchoolFolderTemplatesService.validateTemplateForEvent(
                eventId,
                templateId
              );

            return NextResponse.json({
              success: true,
              validation,
            });
        }
      } catch (error) {
        logger.error('Error in folder templates GET endpoint', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  )
);

// POST /api/admin/events/{eventId}/folder-templates
// Apply a folder template to an event
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const requestId = crypto.randomUUID();

      try {
        const { id: eventId } = params;

        let body;
        try {
          body = await req.json();
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON in request body' },
            { status: 400 }
          );
        }

        const { templateId, replaceExisting = false, customizations } = body;

        logger.info('Applying folder template', {
          requestId,
          eventId,
          templateId,
          replaceExisting,
        });

        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'Template ID is required' },
            { status: 400 }
          );
        }

        // Validate template first
        const validation =
          await SchoolFolderTemplatesService.validateTemplateForEvent(
            eventId,
            templateId
          );

        if (!validation.canApply) {
          return NextResponse.json(
            {
              success: false,
              error: 'Cannot apply template',
              conflicts: validation.conflicts,
              warnings: validation.warnings,
            },
            { status: 409 }
          );
        }

        // Apply the template
        const result = await SchoolFolderTemplatesService.applyTemplateToEvent(
          eventId,
          templateId,
          {
            replaceExisting,
            customizations,
          }
        );

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        logger.info('Successfully applied folder template', {
          requestId,
          eventId,
          templateId,
          createdCount: result.createdFolders?.length || 0,
        });

        return NextResponse.json({
          success: true,
          message: `Template applied successfully. Created ${result.createdFolders?.length || 0} folders.`,
          createdFolders: result.createdFolders,
          warnings: validation.warnings,
        });
      } catch (error) {
        logger.error('Error in folder templates POST endpoint', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  )
);
