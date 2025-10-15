import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  galleryService,
  GalleryServiceError,
} from '@/lib/services/gallery.service';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';
import crypto from 'crypto';

// GET /api/public/share/[token]/favorites
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const requestId = crypto.randomUUID();
  try {
    const { token } = params;
    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    const gallery = await galleryService.getGallery({
      token,
      page: 1,
      limit: 1,
      ipAddress:
        requestContext.ip ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        null,
      userAgent: requestContext.userAgent ?? req.headers.get('user-agent') ?? undefined,
      skipRateLimit: true,
    });
    const shareTokenId =
      gallery.token.shareTokenId ?? validation.token.id ?? null;
    if (!shareTokenId) {
      return NextResponse.json(
        { success: false, error: 'Share token not found' },
        { status: 404 }
      );
    }
    const supabase = await createServerSupabaseServiceClient();
    const { data, error } = await supabase
      .from('share_favorites')
      .select('asset_id')
      .eq('share_token_id', shareTokenId);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load favorites' },
        { status: 500 }
      );
    }
    const favorites = (data || []).map((r: any) => r.asset_id as string);

    SecurityLogger.logSecurityEvent(
      'family_favorites_listed',
      {
        requestId,
        token,
        shareTokenId,
        favoritesCount: favorites.length,
      },
      'info'
    );
    return NextResponse.json({ success: true, favorites });
  } catch (e) {
    if (e instanceof GalleryServiceError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/public/share/[token]/favorites { assetId }
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const requestId = crypto.randomUUID();
  try {
    const { token } = params;
    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }
    const assetId = body?.assetId as string | undefined;
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'assetId is required' },
        { status: 400 }
      );
    }
    const gallery = await galleryService.getGallery({
      token,
      page: 1,
      limit: 1,
      photoId: assetId,
      ipAddress:
        requestContext.ip ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        null,
      userAgent: requestContext.userAgent ?? req.headers.get('user-agent') ?? undefined,
      skipRateLimit: true,
    });

    if (!gallery.items.length) {
      return NextResponse.json(
        { success: false, error: 'Asset not found in share gallery' },
        { status: 404 }
      );
    }

    const shareTokenId =
      gallery.token.shareTokenId ?? validation.token.id ?? null;
    if (!shareTokenId) {
      return NextResponse.json(
        { success: false, error: 'Share token not found' },
        { status: 404 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    const { error } = await supabase
      .from('share_favorites')
      .insert({
        share_token_id: shareTokenId,
        asset_id: assetId,
      })
      .select()
      .single();
    if (error && !String(error.message || '').includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'family_favorite_added',
      {
        requestId,
        token,
        shareTokenId,
        assetId,
        duplicate: Boolean(error),
      },
      error ? 'warning' : 'info'
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof GalleryServiceError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/public/share/[token]/favorites?assetId=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const requestId = crypto.randomUUID();
  try {
    const { token } = params;
    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    const url = new URL(req.url);
    const assetId = url.searchParams.get('assetId');
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'assetId is required' },
        { status: 400 }
      );
    }
    const gallery = await galleryService.getGallery({
      token,
      page: 1,
      limit: 1,
      ipAddress:
        requestContext.ip ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        null,
      userAgent: requestContext.userAgent ?? req.headers.get('user-agent') ?? undefined,
      skipRateLimit: true,
    });
    const shareTokenId =
      gallery.token.shareTokenId ?? validation.token.id ?? null;
    if (!shareTokenId) {
      return NextResponse.json(
        { success: false, error: 'Share token not found' },
        { status: 404 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    const { error } = await supabase
      .from('share_favorites')
      .delete()
      .eq('share_token_id', shareTokenId)
      .eq('asset_id', assetId);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove favorite' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'family_favorite_removed',
      {
        requestId,
        token,
        shareTokenId,
        assetId,
      },
      'info'
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof GalleryServiceError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
