import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// POST /admin/share
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest) => {
    const requestId = crypto.randomUUID();

    try {
      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }

      const {
        eventId,
        folderId,
        photoIds,
        shareType,
        expiresAt,
        password,
        allowDownload = false,
        allowComments = false,
        maxViews,
        title,
        description,
      } = body;

      logger.info('Creating share token', {
        requestId,
        eventId,
        folderId: folderId || 'none',
        shareType,
        photoCount: photoIds?.length || 0,
        allowDownload,
        allowComments,
        maxViews,
      });

      // Validate required fields (eventId can be derived later)

      if (!shareType || typeof shareType !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Share type is required' },
          { status: 400 }
        );
      }

      const validShareTypes = ['folder', 'photos', 'event'];
      if (!validShareTypes.includes(shareType)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid share type. Must be folder, photos, or event',
          },
          { status: 400 }
        );
      }

      // Validate share type specific requirements
      if (shareType === 'folder' && !folderId) {
        return NextResponse.json(
          { success: false, error: 'Folder ID is required for folder sharing' },
          { status: 400 }
        );
      }

      if (
        shareType === 'photos' &&
        (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Photo IDs array is required for photo sharing',
          },
          { status: 400 }
        );
      }

      if (shareType === 'photos' && photoIds.length > 100) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot share more than 100 photos at once',
          },
          { status: 400 }
        );
      }

      // Validate expiration date
      let expirationDate: Date | null = null;
      if (expiresAt) {
        expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid expiration date format' },
            { status: 400 }
          );
        }

        if (expirationDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }

        // Maximum 1 year expiration
        const maxExpiration = new Date();
        maxExpiration.setFullYear(maxExpiration.getFullYear() + 1);
        if (expirationDate > maxExpiration) {
          return NextResponse.json(
            {
              success: false,
              error: 'Expiration date cannot be more than 1 year in the future',
            },
            { status: 400 }
          );
        }
      }

      // Validate max views
      if (
        maxViews !== undefined &&
        (typeof maxViews !== 'number' || maxViews <= 0 || maxViews > 10000)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Max views must be a positive number up to 10,000',
          },
          { status: 400 }
        );
      }

      // Validate password if provided
      if (
        password &&
        (typeof password !== 'string' ||
          password.length < 4 ||
          password.length > 50)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password must be between 4 and 50 characters',
          },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Derive event: prefer folder/photos; fallback to provided eventId
      let derivedEventId: string | null = null;
      let folderEventId: string | null = null;
      if (shareType === 'folder' && folderId) {
        try {
          const { data: folder } = await supabase
            .from('folders')
            .select('event_id')
            .eq('id', folderId)
            .maybeSingle();
          if (folder && 'event_id' in folder) folderEventId = (folder as any).event_id || null;
        } catch {}
        if (!folderEventId) {
          try {
            const { data: legacyFolder } = await supabase
              .from('event_folders')
              .select('event_id')
              .eq('id', folderId)
              .maybeSingle();
            folderEventId = (legacyFolder as any)?.event_id || null;
          } catch {}
        }
        if (folderEventId) derivedEventId = folderEventId;
      }

      let photosEventId: string | null = null;
      if (!derivedEventId && shareType === 'photos' && photoIds?.length) {
        // Get event_id from assets via folders
        const { data: assets, error: photosErr } = await supabase
          .from('assets')
          .select('id, folder_id, folders(event_id)')
          .in('id', photoIds);
        if (photosErr) {
          return NextResponse.json(
            { success: false, error: 'Failed to validate photos' },
            { status: 500 }
          );
        }
        if (!assets || assets.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Photos not found' },
            { status: 404 }
          );
        }
        photosEventId = assets[0].folders?.event_id || null;
        // Ensure all photos share same event
        const mixed = assets.some((a) => a.folders?.event_id !== photosEventId);
        if (mixed) {
          return NextResponse.json(
            { success: false, error: 'Photos belong to different events' },
            { status: 400 }
          );
        }
        derivedEventId = photosEventId;
      }

      // If still not derived, accept provided eventId as last resort
      if (!derivedEventId && typeof eventId === 'string') {
        derivedEventId = eventId;
      }

      if (!derivedEventId) {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }

      // If sharing a specific folder, validate it exists and belongs to the event
      if (shareType === 'folder' && folderId) {
        // If both folder and derived exist and differ, force to folder's event
        if (folderEventId && derivedEventId && folderEventId !== derivedEventId) {
          derivedEventId = folderEventId;
        }
      }

      // If sharing specific photos, validate they exist and belong to the event
      if (shareType === 'photos' && photoIds && photoIds.length > 0) {
        const { data: assets, error: photosError } = await supabase
          .from('assets')
          .select('id, folder_id, folders(event_id), status')
          .in('id', photoIds);

        if (photosError) {
          return NextResponse.json(
            { success: false, error: 'Failed to validate photos' },
            { status: 500 }
          );
        }

        if (!assets || assets.length !== photoIds.length) {
          return NextResponse.json(
            { success: false, error: 'One or more photos not found' },
            { status: 404 }
          );
        }

        // Check all assets belong to the event
        const invalidAssets = assets.filter((asset) => asset.folders?.event_id !== derivedEventId);
        if (invalidAssets.length > 0) {
          // Override to assets event if possible
          derivedEventId = assets[0].folders?.event_id || derivedEventId;
        }

        // Check if all assets are ready (equivalent to approved)
        const notReadyAssets = assets.filter((asset) => asset.status !== 'ready');
        if (notReadyAssets.length > 0) {
          logger.warn('Sharing non-ready assets', {
            requestId,
            eventId: derivedEventId,
            notReadyCount: notReadyAssets.length,
          });
        }
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (password) {
        hashedPassword = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');
      }

      // Prepare share token data
      const shareTokenData = {
        token,
        event_id: derivedEventId,
        folder_id: shareType === 'folder' ? folderId : null,
        photo_ids: shareType === 'photos' ? photoIds : null,
        share_type: shareType,
        title: title || null,
        description: description || null,
        password_hash: hashedPassword,
        expires_at: expirationDate?.toISOString() || null,
        max_views: maxViews || null,
        view_count: 0,
        allow_download: allowDownload,
        allow_comments: allowComments,
        metadata: {
          created_by: req.headers.get('user-id') || 'unknown',
          created_at: new Date().toISOString(),
          user_agent: req.headers.get('user-agent') || 'unknown',
          ip_address:
            req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown',
        },
      };

      // Insert share token
      const { data: shareToken, error: shareError } = await supabase
        .from('share_tokens')
        .insert(shareTokenData)
        .select()
        .single();

      if (shareError) {
        logger.error('Failed to create share token', {
          requestId,
          eventId: derivedEventId,
          shareType,
          error: shareError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to create share token' },
          { status: 500 }
        );
      }

      // Generate public URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/share/${token}`;

      logger.info('Successfully created share token', {
        requestId,
        shareTokenId: shareToken.id,
        token: token.substring(0, 8) + '...',
        eventId: derivedEventId,
        shareType,
        expiresAt: expirationDate?.toISOString(),
        hasPassword: !!password,
      });

      // Return share token info (exclude sensitive data)
      return NextResponse.json(
        {
          success: true,
          share: {
            id: shareToken.id,
            token,
            shareUrl,
            shareType,
            eventId: derivedEventId,
            folderId: shareToken.folder_id,
            photoIds: shareToken.photo_ids,
            title: shareToken.title,
            description: shareToken.description,
            expiresAt: shareToken.expires_at,
            maxViews: shareToken.max_views,
            viewCount: shareToken.view_count,
            allowDownload: shareToken.allow_download,
            allowComments: shareToken.allow_comments,
            hasPassword: !!password,
            createdAt: shareToken.created_at,
            updatedAt: shareToken.updated_at,
          },
          message: 'Share token created successfully',
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Unexpected error in share endpoint', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
