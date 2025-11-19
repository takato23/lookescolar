import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest, context: RouteContext<{ id: string }>) {
  const params = await context.params;

  console.log('🔍 Debug Gallery API called with params:', params);

  try {
    const { id: eventId } = params;
    console.log('📋 Event ID:', eventId);

    const supabase = await createServerSupabaseServiceClient();
    console.log('✅ Supabase client created');

    // Validate event - sin filtros de tenant primero
    console.log('🔍 Looking for event...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId);

    console.log('📊 Event query result:', { event, eventError });

    if (eventError) {
      console.error('❌ Event query error:', eventError);
      return NextResponse.json({ error: 'Database error', details: eventError }, { status: 500 });
    }

    if (!event || event.length === 0) {
      console.log('❌ Event not found');
      return NextResponse.json({ error: 'Event not found', eventId }, { status: 404 });
    }

    console.log('✅ Event found:', event[0]);

    return NextResponse.json({
      success: true,
      event: event[0],
      message: 'Debug successful'
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}






