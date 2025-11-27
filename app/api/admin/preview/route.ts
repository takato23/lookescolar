import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import crypto from 'crypto';

// Types for response
type PreviewResponse =
  | { error: string }
  | { success: boolean; token: string; expires_at: string; preview_url: string };

type CleanupResponse =
  | { error: string }
  | { success: boolean; message: string };

// =============================================================================
// POST - Generate temporary preview token for store preview
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext): Promise<NextResponse<PreviewResponse>> => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('store_preview_create', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const { folder_id, event_id } = body;

      if (!folder_id && !event_id) {
        return NextResponse.json(
          { error: 'Se requiere folder_id o event_id' },
          { status: 400 }
        );
      }

      // Generate a unique preview token
      const previewToken = `preview_${crypto.randomBytes(32).toString('hex')}`;

      // Calculate expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // If folder_id is provided, validate it exists and belongs to tenant
      if (folder_id) {
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, name, event_id, tenant_id')
          .eq('id', folder_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (folderError || !folder) {
          return NextResponse.json(
            { error: 'Carpeta no encontrada' },
            { status: 404 }
          );
        }
      }

      // If event_id is provided, validate it exists and belongs to tenant
      if (event_id) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('id, name, tenant_id')
          .eq('id', event_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (eventError || !event) {
          return NextResponse.json(
            { error: 'Evento no encontrado' },
            { status: 404 }
          );
        }
      }

      // Get user ID from authContext
      const userId = authContext.user?.id || 'system';

      // Create temporary preview token in the family_tokens table
      const insertData = {
        tenant_id: tenantId,
        folder_id: folder_id || null,
        event_id: event_id || null,
        token: previewToken,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        metadata: {
          created_by: userId,
          created_at: new Date().toISOString(),
          purpose: 'admin_preview',
          is_preview: true,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tokenError } = await supabase
        .from('family_tokens')
        .insert(insertData as any);

      if (tokenError) {
        console.error('[Preview API] Error creating preview token:', tokenError);
        return NextResponse.json(
          { error: 'Error al crear token de vista previa' },
          { status: 500 }
        );
      }

      // Build preview URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const previewUrl = `${baseUrl}/store-unified/${previewToken}?preview=true`;

      return NextResponse.json({
        success: true,
        token: previewToken,
        expires_at: expiresAt.toISOString(),
        preview_url: previewUrl,
      });
    } catch (error) {
      console.error('[Preview API] Error:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })
);

// =============================================================================
// DELETE - Clean up expired preview tokens
// =============================================================================

export const DELETE = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext): Promise<NextResponse<CleanupResponse>> => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      // Delete expired preview tokens
      const { error } = await supabase
        .from('family_tokens')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('expires_at', new Date().toISOString())
        .or('metadata->>is_preview.eq.true,metadata->>purpose.eq.admin_preview');

      if (error) {
        console.error('[Preview API] Error cleaning up preview tokens:', error);
        return NextResponse.json(
          { error: 'Error al limpiar tokens de vista previa' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Tokens de vista previa expirados eliminados',
      });
    } catch (error) {
      console.error('[Preview API] Error:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })
);
