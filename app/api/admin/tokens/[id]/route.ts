/**
 * ADMIN TOKEN MANAGEMENT API - /api/admin/tokens/[id]
 *
 * Individual token operations: get, revoke, rotate, usage stats
 * Features: Admin authentication, audit logging, secure operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { accessTokenService } from '../../../../../lib/services/access-token.service';
import { adminAuthMiddleware } from '../../../../../lib/security/admin-auth';
import { z } from 'zod';
import type { RouteContext } from '@/types/next-route';

type RouteParams = RouteContext<{ id: string }>;

const updateTokenSchema = z.object({
  action: z.enum(['revoke', 'rotate']),
  reason: z.string().optional(),
});

// GET /api/admin/tokens/[id] - Get token details with usage stats
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Get token details
    const token = await accessTokenService.getToken(id);

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Get usage statistics
    const usageStats = await accessTokenService.getTokenStats(id);

    // Return safe token data (no hash/salt)
    return NextResponse.json({
      token: {
        id: token.id,
        scope: token.scope,
        resourceId: token.resourceId,
        tokenPrefix: token.tokenPrefix,
        accessLevel: token.accessLevel,
        canDownload: token.canDownload,
        maxUses: token.maxUses,
        usedCount: token.usedCount,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
        createdBy: token.createdBy,
        metadata: token.metadata,
        status: {
          isValid: token.isValid,
          isExpired: token.isExpired,
          isRevoked: token.isRevoked,
          isExhausted: token.isExhausted,
        },
      },
      usageStats,
    });
  } catch (error: any) {
    console.error('Token GET error:', error);
    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/tokens/[id] - Token operations (revoke, rotate)
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    // Admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const data = updateTokenSchema.parse(body);

    // Get current token to verify it exists
    const existingToken = await accessTokenService.getToken(id);
    if (!existingToken) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (data.action === 'revoke') {
      // Revoke the token
      const success = await accessTokenService.revokeToken(id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to revoke token' },
          { status: 500 }
        );
      }

      // Log the revocation
      await accessTokenService
        .logAccess('', 'view', {
          success: true,
          notes: `Token ${existingToken.tokenPrefix} revoked by admin ${authResult.user!.id}. Reason: ${data.reason || 'No reason provided'}`,
        })
        .catch(() => {}); // Don't fail if logging fails

      return NextResponse.json({
        success: true,
        message: 'Token revoked successfully',
        data: {
          tokenId: id,
          revokedAt: new Date().toISOString(),
          revokedBy: authResult.user!.id,
          reason: data.reason,
        },
      });
    } else if (data.action === 'rotate') {
      // For token rotation, we create a new token with the same parameters
      // and revoke the old one
      const newToken = await accessTokenService.createToken({
        scope: existingToken.scope as any,
        resourceId: existingToken.resourceId,
        accessLevel: existingToken.accessLevel as any,
        canDownload: existingToken.canDownload,
        maxUses: existingToken.maxUses || undefined,
        expiresAt: existingToken.expiresAt || undefined,
        createdBy: authResult.user!.id,
        metadata: {
          ...existingToken.metadata,
          rotatedFrom: existingToken.id,
          rotationReason: data.reason || 'Token rotation requested',
        },
      });

      // Revoke the old token
      await accessTokenService.revokeToken(id);

      // Generate QR code for new token
      const qrData = accessTokenService.generateQRData(newToken.token);

      // Log the rotation
      await accessTokenService
        .logAccess('', 'view', {
          success: true,
          notes: `Token ${existingToken.tokenPrefix} rotated to ${newToken.tokenId} by admin ${authResult.user!.id}. Reason: ${data.reason || 'No reason provided'}`,
        })
        .catch(() => {}); // Don't fail if logging fails

      return NextResponse.json({
        success: true,
        message: 'Token rotated successfully',
        data: {
          oldTokenId: id,
          newTokenId: newToken.tokenId,
          newToken: newToken.token, // Only returned on creation/rotation
          qrCode: qrData,
          rotatedAt: new Date().toISOString(),
          rotatedBy: authResult.user!.id,
          reason: data.reason,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Token POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tokens/[id] - Revoke token (alias for POST with revoke action)
export async function DELETE(request: NextRequest, context: RouteParams) {
  // Delegate to POST with revoke action
  const revokeRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ action: 'revoke', reason: 'Token deleted via API' }),
  });

  return POST(revokeRequest, context);
}
