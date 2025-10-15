import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const PatchSchema = z.object({
  enabled: z.boolean(),
  expires_in_days: z.number().min(1).max(365).optional(),
  allow_download: z.boolean().optional(),
  allow_share: z.boolean().optional(),
  max_views: z.number().min(1).max(100000).optional(),
});

// PATCH /api/admin/events/[id]/public-gallery
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { id: eventId } = params;
      const body = await req.json();
      const {
        enabled,
        expires_in_days,
        allow_download,
        allow_share,
        max_views,
      } = PatchSchema.parse(body);

      const supabase = await createServerSupabaseServiceClient();

      // Update flag
      const { error: updErr } = await supabase
        .from('events')
        .update({ public_gallery_enabled: enabled })
        .eq('id', eventId);

      if (updErr) {
        return NextResponse.json(
          { error: 'Failed to update event', details: updErr.message },
          { status: 500 }
        );
      }

      let shareToken: string | undefined;
      let unifiedShareToken: string | undefined;

      if (enabled) {
        // Backward-compatible: check gallery_shares (optional)
        const nowIso = new Date().toISOString();
        const { data: shares } = await supabase
          .from('gallery_shares')
          .select('token, expires_at, view_count, max_views')
          .eq('event_id', eventId)
          .is('level_id', null)
          .is('course_id', null)
          .is('student_id', null)
          .order('created_at', { ascending: false })
          .limit(5);
        const active = (shares || []).find((s) => {
          const notExpired = !s.expires_at || s.expires_at > nowIso;
          const underViews = !s.max_views || s.view_count < s.max_views;
          return notExpired && underViews;
        });
        if (active) shareToken = active.token;

        // Unified sharing: ensure share_tokens row for event
        // Try to reuse active
        const { data: st } = await supabase
          .from('share_tokens')
          .select('id, token, expires_at, is_active')
          .eq('event_id', eventId)
          .eq('share_type', 'event')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (st?.token && (!st.expires_at || st.is_active)) {
          unifiedShareToken = (st as any).token as string;
        } else {
          const newToken64 = crypto.randomBytes(32).toString('hex');
          await supabase.from('share_tokens').insert({
            event_id: eventId,
            token: newToken64,
            share_type: 'event',
            is_active: true,
            allow_download: allow_download ?? true,
            allow_comments: false,
            max_views: max_views ?? null,
            expires_at: expires_in_days
              ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
              : null,
            metadata: { source: 'admin_public_gallery' },
          });
          unifiedShareToken = newToken64;
        }
      } else {
        // Disabled: expire event share_tokens
        await supabase
          .from('share_tokens')
          .update({
            expires_at: new Date().toISOString(),
            is_active: false,
            metadata: { revoked: true, revoked_reason: 'public_gallery_disabled' },
          })
          .eq('event_id', eventId)
          .eq('share_type', 'event')
          .eq('is_active', true);
      }

      return NextResponse.json({
        success: true,
        enabled,
        token: shareToken,
        unified_token: unifiedShareToken,
        store_url: unifiedShareToken
          ? `${req.headers.get('origin') || ''}/store-unified/${unifiedShareToken}`
          : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
