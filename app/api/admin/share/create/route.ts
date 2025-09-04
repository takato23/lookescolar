import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const BodySchema = z.object({
  scope: z.enum(['event', 'folder']), // nivel/curso/familia usan carpeta seleccionada por ahora
  id: z.string().uuid(), // event_id o folder_id
  options: z
    .object({
      expiresInDays: z.number().min(1).max(365).optional(),
      maxViews: z.number().min(1).max(100000).optional(),
      allowDownload: z.boolean().optional(),
      password: z.string().min(3).max(100).optional(),
      title: z.string().max(200).optional(),
      description: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional()
    .default({}),
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { scope, id, options } = BodySchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Generate 64-hex token for unified links
    const token64 = crypto.randomBytes(32).toString('hex');

    const payload: any = {
      token: token64,
      share_type: scope === 'event' ? 'event' : 'folder',
      is_active: true,
      allow_download: options.allowDownload ?? true,
      allow_comments: false,
      max_views: options.maxViews ?? null,
      expires_at: options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 86400000).toISOString()
        : null,
      title: options.title || null,
      description: options.description || null,
      metadata: options.metadata || {},
      updated_at: new Date().toISOString(),
    };

    if (scope === 'event') {
      payload.event_id = id;
    } else {
      payload.folder_id = id;
    }

    if (options.password) {
      payload.password_hash = crypto
        .createHash('sha256')
        .update(options.password)
        .digest('hex');
    }

    const { error } = await supabase.from('share_tokens').insert(payload);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    return NextResponse.json({
      success: true,
      token: token64,
      view_url: `${origin}/s/${token64}`,
      store_url: `${origin}/store-unified/${token64}`,
      options,
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
});
