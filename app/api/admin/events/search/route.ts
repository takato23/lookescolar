import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Schema for query parameters
const querySchema = z.object({
  q: z.string().trim().min(2).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    let params: z.infer<typeof querySchema>;
    try {
      params = querySchema.parse({
        q: url.searchParams.get('q') || undefined,
        limit: url.searchParams.get('limit') || undefined,
        offset: url.searchParams.get('offset') || undefined,
      });
    } catch {
      // On validation issues, return safe defaults
      params = { limit: 20, offset: 0 } as any;
    }

    const supabase = await createServerSupabaseServiceClient();

    // Build base query
    let query = supabase
      .from('events')
      .select('id, name, created_at, school, location')
      .order('created_at', { ascending: false });

    // Apply search if provided (name, school, location)
    if (params.q) {
      // Use OR filter across supported columns; tolerate missing columns with ilike on existing ones
      query = query.or(
        `name.ilike.%${params.q}%,school.ilike.%${params.q}%,location.ilike.%${params.q}%`
      );
    }

    // Fetch limit + 1 to detect hasMore without extra count query
    const { data, error } = await query.range(
      params.offset,
      params.offset + params.limit // fetch one extra to check hasMore
    );

    if (error) {
      // Avoid failing the UI on DB errors
      return NextResponse.json(
        { success: true, events: [], hasMore: false, nextOffset: params.offset },
        { status: 200 }
      );
    }

    const events = (data || []).slice(0, params.limit).map((e: any) => ({
      id: e.id,
      name: e.name || 'Sin nombre',
    }));

    const hasMore = (data || []).length > params.limit;
    const nextOffset = hasMore ? params.offset + params.limit : params.offset;

    return NextResponse.json(
      { success: true, events, hasMore, nextOffset },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: true, events: [], hasMore: false, nextOffset: 0 },
      { status: 200 }
    );
  }
});

