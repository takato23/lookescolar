import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { logger } from '@/lib/utils/logger';

// GET: Export tokens as CSV for school distribution
export const GET = withAuth(async function (request: NextRequest, context) {
  const eventId = context.params?.id as string;
  const requestId = crypto.randomUUID();

  try {
    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all subjects with their tokens
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        parent_name,
        parent_email,
        token,
        token_expires_at,
        created_at
      `
      )
      .eq('event_id', eventId)
      .order('name');

    if (subjectsError) {
      logger.error('Error fetching subjects for token export', {
        requestId,
        eventId,
        error: subjectsError.message,
      });

      return NextResponse.json(
        { error: 'Failed to fetch subjects' },
        { status: 500 }
      );
    }

    if (!subjects || subjects.length === 0) {
      return NextResponse.json(
        { error: 'No subjects found for this event' },
        { status: 404 }
      );
    }

    // Generate CSV content
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
    const csvHeaders = [
      'Nombre del Alumno',
      'Padre/Tutor',
      'Email del Padre',
      'Token',
      'Link de Acceso',
      'Fecha de Expiración',
      'Instrucciones',
    ];

    const csvRows = subjects.map((subject) => {
      const accessLink = subject.token
        ? `${baseUrl}/f/${subject.token}`
        : 'Sin token generado';
      const expirationDate = subject.token_expires_at
        ? new Date(subject.token_expires_at).toLocaleDateString('es-ES')
        : 'Sin fecha';

      return [
        subject.name || '',
        subject.parent_name || '',
        subject.parent_email || '',
        subject.token || 'Sin token',
        accessLink,
        expirationDate,
        'Comparta este link con la familia para ver y comprar las fotos',
      ];
    });

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Add BOM for proper UTF-8 handling in Excel
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    logger.info('Token export completed', {
      requestId,
      eventId,
      subjectCount: subjects.length,
      eventName: event.name,
    });

    // Return CSV file
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tokens-${event.name?.replace(/[^a-zA-Z0-9]/g, '_') || eventId}.csv"`,
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    logger.error('Error in token export', {
      requestId,
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to export tokens',
        requestId,
      },
      { status: 500 }
    );
  }
});
