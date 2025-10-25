import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// POST /public/share/[token]/validate
export async function POST(
  req: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  const requestId = crypto.randomUUID();
  const { token } = params;

  try {
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid share link',
          errorCode: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    // Parse request body for password if needed
    let password: string | undefined;
    try {
      const body = await req.json();
      password = body.password;
    } catch {
      // No body or invalid JSON - that's fine, password might not be required
    }

    // Extract request context for security logging
    const requestContext = await shareTokenSecurity.extractRequestContext();

    logger.info('Public share token validation request', {
      requestId,
      token: token.substring(0, 8) + '...',
      hasPassword: !!password,
      ip: requestContext.ip,
    });

    // Validate the token with comprehensive security checks
    const validation = await shareTokenSecurity.validateToken(
      token,
      password,
      requestContext
    );

    if (!validation.isValid) {
      logger.warn('Share token validation failed', {
        requestId,
        token: token.substring(0, 8) + '...',
        errorCode: validation.errorCode,
        error: validation.error,
        ip: requestContext.ip,
      });

      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          errorCode: validation.errorCode,
        },
        { status: validation.errorCode === 'PASSWORD_REQUIRED' ? 401 : 403 }
      );
    }

    // Token is valid, return sanitized token information
    const tokenInfo = validation.token!;

    logger.info('Share token validation successful', {
      requestId,
      tokenId: tokenInfo.id,
      shareType: tokenInfo.share_type,
      eventId: tokenInfo.event_id,
      viewCount: tokenInfo.view_count,
      ip: requestContext.ip,
    });

    // Return sanitized token data (exclude sensitive information)
    return NextResponse.json({
      success: true,
      token: {
        id: tokenInfo.id,
        shareType: tokenInfo.share_type,
        eventId: tokenInfo.event_id,
        folderId: tokenInfo.folder_id,
        photoIds: tokenInfo.photo_ids,
        allowDownload: tokenInfo.allow_download,
        allowComments: tokenInfo.allow_comments,
        viewCount: tokenInfo.view_count,
        maxViews: tokenInfo.max_views,
        expiresAt: tokenInfo.expires_at,
        hasPassword: !!tokenInfo.password_hash,
        createdAt: tokenInfo.created_at,
      },
      message: 'Share link validated successfully',
    });

  } catch (error) {
    logger.error('Unexpected error in share token validation', {
      requestId,
      token: token.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to validate share link',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET /public/share/[token]/validate - Alternative endpoint for password-less validation
export async function GET(
  req: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  const requestId = crypto.randomUUID();
  const { token } = params;

  try {
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid share link',
          errorCode: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    // Extract request context for security logging
    const requestContext = await shareTokenSecurity.extractRequestContext();

    logger.info('Public share token info request', {
      requestId,
      token: token.substring(0, 8) + '...',
      ip: requestContext.ip,
    });

    // Validate the token without password (to check if password is required)
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );

    if (!validation.isValid) {
      // Special handling for password required case
      if (validation.errorCode === 'PASSWORD_REQUIRED') {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            errorCode: validation.errorCode,
            requiresPassword: true,
          },
          { status: 401 }
        );
      }

      logger.warn('Share token info request failed', {
        requestId,
        token: token.substring(0, 8) + '...',
        errorCode: validation.errorCode,
        error: validation.error,
        ip: requestContext.ip,
      });

      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          errorCode: validation.errorCode,
        },
        { status: 403 }
      );
    }

    // Token is valid, return basic information
    const tokenInfo = validation.token!;

    logger.info('Share token info request successful', {
      requestId,
      tokenId: tokenInfo.id,
      shareType: tokenInfo.share_type,
      ip: requestContext.ip,
    });

    // Return basic token information (less detailed than POST)
    return NextResponse.json({
      success: true,
      token: {
        shareType: tokenInfo.share_type,
        hasPassword: !!tokenInfo.password_hash,
        expiresAt: tokenInfo.expires_at,
        allowDownload: tokenInfo.allow_download,
        allowComments: tokenInfo.allow_comments,
        maxViews: tokenInfo.max_views,
        viewCount: tokenInfo.view_count,
      },
      message: 'Share link information retrieved',
    });

  } catch (error) {
    logger.error('Unexpected error in share token info request', {
      requestId,
      token: token.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get share link information',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
