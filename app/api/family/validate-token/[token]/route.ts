// API endpoint para validar token y obtener eventId para redirección
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { debugMigration } from '@/lib/feature-flags';

interface TokenValidationResponse {
  valid: boolean;
  eventId?: string;
  student?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<TokenValidationResponse>> {
  try {
    const { token } = await params;
    
    debugMigration('Token validation requested', { token: token.slice(0, 8) + '...' });

    if (!token || token.length < 20) {
      debugMigration('Invalid token format', { tokenLength: token?.length });
      return NextResponse.json({
        valid: false,
        error: 'Token inválido'
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Try subject_tokens table (the main token system)
    let tokenData = null;
    let error: any = null;

    try {
      const { data: subjectTokenData, error: subjectError } = await supabase
        .from('subject_tokens')
        .select(`
          id,
          token,
          expires_at,
          subjects (
            id,
            name,
            events (
              id,
              name,
              active
            )
          )
        `)
        .eq('token', token)
        .single();

      if (subjectTokenData && !subjectError) {
        tokenData = {
          ...subjectTokenData,
          students: subjectTokenData.subjects, // Map subjects to students for compatibility
          type: 'subject'
        };
      } else {
        error = subjectError;
      }
    } catch (e) {
      error = e;
      debugMigration('Subject token validation failed', { error: e });
    }

    if (!tokenData || error) {
      debugMigration('Token not found in database', { error: error?.message || 'Unknown error' });
      return NextResponse.json({
        valid: false,
        error: 'Token no encontrado'
      }, { status: 404 });
    }

    // Verificar que el token no haya expirado
    if (new Date(tokenData.expires_at) < new Date()) {
      debugMigration('Token expired', { expiresAt: tokenData.expires_at });
      return NextResponse.json({
        valid: false,
        error: 'Token expirado'
      }, { status: 410 });
    }

    // Verificar que el evento asociado esté activo
    const student = tokenData.students;
    const hasValidEvent = student && student.events && typeof student.events === 'object';
    const isActive = hasValidEvent ? (student.events.active !== false) : false; // Default to false if no valid event
    
    if (!student || !hasValidEvent || !isActive) {
      debugMigration('Associated event not active or found', { 
        hasStudent: !!student,
        hasEvent: hasValidEvent,
        eventActive: hasValidEvent ? student.events.active : undefined
      });
      return NextResponse.json({
        valid: false,
        error: 'Evento no disponible'
      }, { status: 404 });
    }

    const response: TokenValidationResponse = {
      valid: true,
      eventId: hasValidEvent && student.events.id ? student.events.id : '',
      student: {
        id: student.id,
        name: student.name,
        event: {
          id: hasValidEvent && student.events.id ? student.events.id : '',
          name: hasValidEvent && student.events.name ? student.events.name : '',
        },
      },
    };

    debugMigration('Token validation successful', { 
      eventId: response.eventId,
      studentName: response.student?.name
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error validating token:', error);
    debugMigration('Token validation error', { error });
    
    return NextResponse.json({
      valid: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}