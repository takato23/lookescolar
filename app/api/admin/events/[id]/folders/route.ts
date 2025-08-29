import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { folderService } from '@/lib/services/folder.service';
import crypto from 'crypto';
import { logger } from '@/lib/utils/logger';

// GET /admin/events/{eventId}/folders?parentId={parentId}
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const { id: eventId } = await params;
        const url = new URL(req.url);
        const parentId = url.searchParams.get('parentId');

        logger.info('Fetching folders for event', {
          requestId,
          eventId,
          parentId: parentId || 'root',
        });

        if (!eventId) {
          return NextResponse.json(
            { success: false, error: 'Event ID is required' },
            { status: 400 }
          );
        }

        // Convert empty string to null for root folders
        const normalizedParentId =
          parentId === '' || parentId === 'null' ? null : parentId;

        // Fetch folders directly via service to avoid delegation issues
        const result = await folderService.getFolders(
          eventId,
          normalizedParentId
        );

        if (!result.success) {
          logger.error('Failed to fetch folders', {
            requestId,
            eventId,
            parentId: normalizedParentId,
            error: result.error,
          });

          return NextResponse.json(
            {
              success: false,
              error: result.error || 'Failed to fetch folders',
            },
            { status: 500 }
          );
        }

        logger.info('Successfully fetched folders', {
          requestId,
          eventId,
          parentId: normalizedParentId,
          count: result.folders?.length || 0,
        });

        return NextResponse.json({
          success: true,
          folders: result.folders || [],
          count: result.folders?.length || 0,
        });
      } catch (error) {
        logger.error('Unexpected error in folders GET endpoint', {
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

// POST /admin/events/{eventId}/folders
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const { id: eventId } = await params;

        if (!eventId) {
          return NextResponse.json(
            { success: false, error: 'Event ID is required' },
            { status: 400 }
          );
        }

        let body;
        try {
          body = await req.json();
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON in request body' },
            { status: 400 }
          );
        }

        const { name, parent_id, description, sort_order, metadata } = body;

        logger.info('Creating folder', {
          requestId,
          eventId,
          name,
          parentId: parent_id || 'root',
        });

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return NextResponse.json(
            { success: false, error: 'Folder name is required' },
            { status: 400 }
          );
        }

        const result = await folderService.createFolder(eventId, {
          name,
          parent_id,
          description,
          sort_order,
          metadata,
        });

        if (!result.success) {
          logger.error('Failed to create folder', {
            requestId,
            eventId,
            name,
            error: result.error,
          });

          const statusCode = result.error?.includes('already exists')
            ? 409
            : 500;

          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          );
        }

        logger.info('Successfully created folder', {
          requestId,
          eventId,
          folderId: result.folder?.id,
          name,
        });

        return NextResponse.json(
          {
            success: true,
            folder: result.folder,
          },
          { status: 201 }
        );
      } catch (error) {
        logger.error('Unexpected error in folders POST endpoint', {
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
