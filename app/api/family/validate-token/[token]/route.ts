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

    // Buscar el token en la tabla family_tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('family_tokens')
      .select(`
        id,
        token,
        expires_at,
        students (
          id,
          name,
          events (
            id,
            name,
            status
          )
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      debugMigration('Token not found in database', { error: tokenError?.message });
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
    if (!student || !student.events || student.events.status !== 'active') {
      debugMigration('Associated event not active or found', { 
        hasStudent: !!student,
        hasEvent: !!student?.events,
        eventStatus: student?.events?.status
      });
      return NextResponse.json({
        valid: false,
        error: 'Evento no disponible'
      }, { status: 404 });
    }

    const response: TokenValidationResponse = {
      valid: true,
      eventId: student.events.id,
      student: {
        id: student.id,
        name: student.name,
        event: {
          id: student.events.id,
          name: student.events.name,
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