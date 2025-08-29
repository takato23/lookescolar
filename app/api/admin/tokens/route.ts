/**
 * ADMIN TOKENS API - /api/admin/tokens
 *
 * CRUD operations for hierarchical access tokens
 * Features: Token creation, listing with stats, admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { accessTokenService } from '../../../../lib/services/access-token.service';
import { adminAuthMiddleware } from '../../../../lib/security/admin-auth';
import { z } from 'zod';

// Validation schemas
const createTokenSchema = z.object({
  scope: z.enum(['event', 'course', 'family']),
  resourceId: z.string().uuid(),
  accessLevel: z.enum(['full', 'read_only']).optional().default('read_only'),
  canDownload: z.boolean().optional().default(false),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

const listTokensSchema = z.object({
  scope: z.enum(['event', 'course', 'family']).optional(),
  resourceId: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  includeStats: z.string().optional().default('false'),
});

// GET /api/admin/tokens - List tokens with optional filters
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = listTokensSchema.parse({
      scope: searchParams.get('scope'),
      resourceId: searchParams.get('resourceId'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      includeStats: searchParams.get('includeStats'),
    });

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 100); // Max 100 per page
    const includeStats = query.includeStats === 'true';

    // Create Supabase client for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let queryBuilder = supabase
      .from('access_tokens')
      .select(
        `
        id,
        scope,
        event_id,
        course_id,
        subject_id,
        token_prefix,
        access_level,
        can_download,
        max_uses,
        used_count,
        expires_at,
        revoked_at,
        last_used_at,
        created_at,
        created_by,
        metadata
      `
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (query.scope) {
      queryBuilder = queryBuilder.eq('scope', query.scope);
    }

    if (query.resourceId) {
      // Filter by the appropriate resource column based on scope
      if (query.scope === 'event') {
        queryBuilder = queryBuilder.eq('event_id', query.resourceId);
      } else if (query.scope === 'course') {
        queryBuilder = queryBuilder.eq('course_id', query.resourceId);
      } else if (query.scope === 'family') {
        queryBuilder = queryBuilder.eq('subject_id', query.resourceId);
      }
    }

    // Apply pagination
    queryBuilder = queryBuilder.range((page - 1) * limit, page * limit - 1);

    const { data: tokens, error, count } = await queryBuilder;

    if (error) {
      console.error('Token list error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tokens', details: error.message },
        { status: 500 }
      );
    }

    // Map tokens to safe format (exclude sensitive fields)
    const mappedTokens = await Promise.all(
      (tokens || []).map(async (token) => {
        const resourceId =
          token.event_id || token.course_id || token.subject_id;
        const now = new Date();
        const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
        const revokedAt = token.revoked_at ? new Date(token.revoked_at) : null;

        const isExpired = expiresAt ? expiresAt <= now : false;
        const isRevoked = !!revokedAt;
        const isExhausted = token.max_uses
          ? token.used_count >= token.max_uses
          : false;
        const isValid = !isExpired && !isRevoked && !isExhausted;

        const mappedToken = {
          id: token.id,
          scope: token.scope,
          resourceId,
          tokenPrefix: token.token_prefix,
          accessLevel: token.access_level,
          canDownload: token.can_download,
          maxUses: token.max_uses,
          usedCount: token.used_count,
          expiresAt: token.expires_at,
          revokedAt: token.revoked_at,
          lastUsedAt: token.last_used_at,
          createdAt: token.created_at,
          createdBy: token.created_by,
          metadata: token.metadata,
          status: {
            isValid,
            isExpired,
            isRevoked,
            isExhausted,
          },
        };

        // Include usage stats if requested
        if (includeStats) {
          const stats = await accessTokenService.getTokenStats(token.id);
          return { ...mappedToken, usageStats: stats };
        }

        return mappedToken;
      })
    );

    return NextResponse.json({
      tokens: mappedTokens,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page * limit < (count || 0),
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Admin tokens GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/tokens - Create new token
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createTokenSchema.parse(body);

    // Create token
    const result = await accessTokenService.createToken({
      scope: data.scope,
      resourceId: data.resourceId,
      accessLevel: data.accessLevel,
      canDownload: data.canDownload,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      createdBy: authResult.user!.id,
      metadata: data.metadata,
    });

    // Generate QR code data
    const qrData = accessTokenService.generateQRData(result.token);

    return NextResponse.json({
      success: true,
      data: {
        tokenId: result.tokenId,
        token: result.token, // Only returned on creation
        qrCode: qrData,
        scope: data.scope,
        resourceId: data.resourceId,
        accessLevel: data.accessLevel,
        canDownload: data.canDownload,
        expiresAt: data.expiresAt,
        metadata: data.metadata,
      },
    });
  } catch (error: any) {
    console.error('Admin tokens POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create token', message: error.message },
      { status: 500 }
    );
  }
}
