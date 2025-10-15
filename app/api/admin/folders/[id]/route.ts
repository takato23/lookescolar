import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { folderService } from '@/lib/services/folder.service';
import { logger } from '@/lib/utils/logger';

// GET /admin/folders/{folderId}
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const { id: folderId } = params;

        logger.info('Fetching folder by ID', {
          requestId,
          folderId,
        });

        if (!folderId) {
          return NextResponse.json(
            { success: false, error: 'Folder ID is required' },
            { status: 400 }
          );
        }

        const result = await folderService.getFolderById(folderId);

        if (!result.success) {
          logger.error('Failed to fetch folder', {
            requestId,
            folderId,
            error: result.error,
          });

          const statusCode = result.error?.includes('not found') ? 404 : 500;

          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          );
        }

        logger.info('Successfully fetched folder', {
          requestId,
          folderId,
          folderName: result.folder?.name,
        });

        return NextResponse.json({
          success: true,
          folder: result.folder,
        });
      } catch (error) {
        logger.error('Unexpected error in folder GET endpoint', {
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

// PATCH /admin/folders/{folderId}
export const PATCH = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const { id: folderId } = params;

        if (!folderId) {
          return NextResponse.json(
            { success: false, error: 'Folder ID is required' },
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

        logger.info('Updating folder', {
          requestId,
          folderId,
          updateFields: Object.keys(body),
        });

        // Validate that at least one field is being updated
        if (Object.keys(body).length === 0) {
          return NextResponse.json(
            { success: false, error: 'No fields to update' },
            { status: 400 }
          );
        }

        // Validate name if provided
        if (
          name !== undefined &&
          (typeof name !== 'string' || name.trim().length === 0)
        ) {
          return NextResponse.json(
            { success: false, error: 'Invalid folder name' },
            { status: 400 }
          );
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (parent_id !== undefined) updateData.parent_id = parent_id;
        if (description !== undefined) updateData.description = description;
        if (sort_order !== undefined) updateData.sort_order = sort_order;
        if (metadata !== undefined) updateData.metadata = metadata;

        const result = await folderService.updateFolder(folderId, updateData);

        if (!result.success) {
          logger.error('Failed to update folder', {
            requestId,
            folderId,
            updateData,
            error: result.error,
          });

          let statusCode = 500;
          if (result.error?.includes('not found')) statusCode = 404;
          else if (
            result.error?.includes('already exists') ||
            result.error?.includes('circular reference') ||
            result.error?.includes('cannot move')
          )
            statusCode = 409;
          else if (result.error?.includes('maximum depth')) statusCode = 400;

          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          );
        }

        logger.info('Successfully updated folder', {
          requestId,
          folderId,
          updateData,
        });

        return NextResponse.json({
          success: true,
          folder: result.folder,
        });
      } catch (error) {
        logger.error('Unexpected error in folder PATCH endpoint', {
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

// DELETE /admin/folders/{folderId}
export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const { id: folderId } = params;
        const url = new URL(req.url);
        const moveContentsTo = url.searchParams.get('moveContentsTo');
        const force = url.searchParams.get('force') === 'true';

        logger.info('Deleting folder', {
          requestId,
          folderId,
          moveContentsTo: moveContentsTo || 'none',
          force,
        });

        if (!folderId) {
          return NextResponse.json(
            { success: false, error: 'Folder ID is required' },
            { status: 400 }
          );
        }

        // Convert empty string to null
        const normalizedMoveTarget =
          moveContentsTo === '' || moveContentsTo === 'null'
            ? null
            : moveContentsTo;

        // If force is true, we delete contents, otherwise we move them
        const moveTarget = force ? null : normalizedMoveTarget;

        const result = await folderService.deleteFolder(folderId, moveTarget);

        if (!result.success) {
          logger.error('Failed to delete folder', {
            requestId,
            folderId,
            moveContentsTo: moveTarget,
            force,
            error: result.error,
          });

          let statusCode = 500;
          if (result.error?.includes('not found')) statusCode = 404;
          else if (result.error?.includes('contains items')) statusCode = 409;
          else if (result.error?.includes('Target folder')) statusCode = 400;

          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          );
        }

        logger.info('Successfully deleted folder', {
          requestId,
          folderId,
          moveContentsTo: moveTarget,
          force,
        });

        return NextResponse.json({
          success: true,
          message: 'Folder deleted successfully',
        });
      } catch (error) {
        logger.error('Unexpected error in folder DELETE endpoint', {
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
