import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const sb = await createServerSupabaseServiceClient();

    // Get all codes with their associated events
    const { data: codes, error } = await sb
      .from('codes')
      .select(
        `
        id,
        code_value,
        event_id,
        events (
          id,
          name
        )
      `
      )
      .order('code_value', { ascending: true });

    if (error) {
      console.error('Error fetching codes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, codes: codes || [] });
  } catch (e: any) {
    console.error('Error in codes GET:', e);
    return NextResponse.json(
      { error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, codeValue } = await req.json();
    if (!codeValue) {
      return NextResponse.json({ error: 'Missing codeValue' }, { status: 400 });
    }
    const sb = await createServerSupabaseServiceClient();
    // Resolve event: if not provided, ensure a default "General" event exists
    let finalEventId = eventId as string | null | undefined;
    if (!finalEventId) {
      // Try find existing "General" event
      const { data: existing, error: findErr } = await sb
        .from('events')
        .select('id')
        .eq('name', 'General')
        .limit(1);
      if (!findErr && Array.isArray(existing) && existing.length > 0) {
        finalEventId = (existing[0] as any).id as string;
      } else {
        // Create default event with minimal required fields
        const nowIso = new Date().toISOString();
        const { data: created, error: createErr } = await sb
          .from('events')
          .insert({ name: 'General', date: nowIso, location: 'General' })
          .select('id')
          .single();
        if (createErr) {
          return NextResponse.json(
            { error: 'Failed to create default event' },
            { status: 500 }
          );
        }
        finalEventId = (created as any).id as string;
      }
    }
    const { data, error } = await sb
      .from('codes')
      .insert({
        event_id: finalEventId as string,
        code_value: String(codeValue),
      })
      .select('id')
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
