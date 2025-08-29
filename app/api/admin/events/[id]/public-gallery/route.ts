import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
      const eventId = params.id;
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

      if (enabled) {
        // Check if an active event-level share exists
        const nowIso = new Date().toISOString();
        const { data: shares, error: shareErr } = await supabase
          .from('gallery_shares')
          .select('token, expires_at, view_count, max_views')
          .eq('event_id', eventId)
          .is('level_id', null)
          .is('course_id', null)
          .is('student_id', null)
          .order('created_at', { ascending: false })
          .limit(5);
        if (shareErr) {
          return NextResponse.json(
            { error: 'Failed to check existing shares' },
            { status: 500 }
          );
        }
        const active = (shares || []).find((s) => {
          const notExpired = !s.expires_at || s.expires_at > nowIso;
          const underViews = !s.max_views || s.view_count < s.max_views;
          return notExpired && underViews;
        });

        if (active) {
          shareToken = active.token;
        } else {
          // Create a new event-level share via RPC
          const { data, error } = await supabase.rpc('create_gallery_share', {
            p_event_id: eventId,
            p_level_id: null,
            p_course_id: null,
            p_student_id: null,
            p_expires_in_days: expires_in_days ?? 30,
            p_max_views: max_views ?? null,
            p_allow_download: allow_download ?? true,
            p_allow_share: allow_share ?? true,
            p_custom_message: null,
            p_created_by: 'system',
          });
          if (error) {
            return NextResponse.json(
              {
                error: 'Failed to create public share',
                details: error.message,
              },
              { status: 500 }
            );
          }
          shareToken = data?.token as string | undefined;
        }
      }

      return NextResponse.json({ success: true, enabled, token: shareToken });
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
