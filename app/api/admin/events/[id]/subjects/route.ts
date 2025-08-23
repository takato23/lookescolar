import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// GET: Get all subjects for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabaseServiceClient();

    logger.info('Get event subjects request received', {
      requestId,
      eventId: `event_${eventId.substring(0, 8)}***`,
    });

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get all subjects for the event
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, grade_section, created_at')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (subjectsError) {
      logger.error('Error fetching subjects', {
        requestId,
        error: subjectsError.message,
        eventId,
      });

      return NextResponse.json(
        { error: 'Failed to fetch subjects', details: subjectsError.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    logger.info('Get event subjects completed', {
      requestId,
      eventId,
      subjectCount: subjects?.length || 0,
      duration,
    });

    return NextResponse.json({
      success: true,
      subjects: subjects || [],
      count: subjects?.length || 0,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Get event subjects failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}