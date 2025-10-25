// API endpoint para validar token y obtener eventId para redirección
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { debugMigration } from '@/lib/feature-flags';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import type { RouteContext } from '@/types/next-route';

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
  folder?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

export const GET = RateLimitMiddleware.withRateLimit(async (
  request: NextRequest,
  context: RouteContext<{ token: string }>
): Promise<NextResponse<TokenValidationResponse>> => {
  try {
    const params = await context.params;
    const { token } = params;

    debugMigration('Token validation requested', {
      token: token.slice(0, 8) + '...',
    });

    if (!token || token.length < 20) {
      debugMigration('Invalid token format', { tokenLength: token?.length });
      return NextResponse.json(
        {
          valid: false,
          error: 'Token inválido',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Try folder share tokens first (new system)
    let tokenData = null;
    let error: any = null;

    try {
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select(
          `
          id,
          name,
          share_token,
          is_published,
          event_id,
          events (
            id,
            name
          )
        `
        )
        .eq('share_token', token)
        .eq('is_published', true)
        .single();

      if (folderData && !folderError) {
        tokenData = {
          id: folderData.id,
          token: folderData.share_token,
          expires_at: null, // Folder tokens don't expire
          folder: {
            id: folderData.id,
            name: folderData.name,
            event_id: folderData.event_id,
            events: folderData.events,
          },
          type: 'folder',
        };
        debugMigration('Folder token found', {
          folderId: folderData.id,
          folderName: folderData.name,
        });
      } else {
        debugMigration('Folder token not found, trying subject tokens', {
          error: folderError,
        });
      }
    } catch (e) {
      debugMigration('Folder token validation failed', { error: e });
    }

    // If not a folder token, try subject_tokens table (legacy system)
    if (!tokenData) {
      try {
        const { data: subjectTokenData, error: subjectError } = await supabase
          .from('subject_tokens')
          .select(
            `
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
          `
          )
          .eq('token', token)
          .single();

        if (subjectTokenData && !subjectError) {
          tokenData = {
            ...subjectTokenData,
            students: subjectTokenData.subjects, // Map subjects to students for compatibility
            type: 'subject',
          };
          debugMigration('Subject token found', {
            subjectId: subjectTokenData.subjects?.id,
          });
        } else {
          error = subjectError;
        }
      } catch (e) {
        error = e;
        debugMigration('Subject token validation failed', { error: e });
      }
    }

    if (!tokenData || error) {
      debugMigration('Token not found in database', {
        error: error?.message || 'Unknown error',
      });
      return NextResponse.json(
        {
          valid: false,
          error: 'Token no encontrado',
        },
        { status: 404 }
      );
    }

    // Verificar que el token no haya expirado (solo para subject tokens)
    if (
      tokenData.type === 'subject' &&
      tokenData.expires_at &&
      new Date(tokenData.expires_at) < new Date()
    ) {
      debugMigration('Token expired', { expiresAt: tokenData.expires_at });
      return NextResponse.json(
        {
          valid: false,
          error: 'Token expirado',
        },
        { status: 410 }
      );
    }

    let response: TokenValidationResponse;

    if (tokenData.type === 'folder') {
      // Handle folder token response
      const folder = tokenData.folder;
      const hasValidEvent =
        folder && folder.events && typeof folder.events === 'object';

      if (!hasValidEvent) {
        debugMigration('Associated event not found for folder', {
          hasEvent: hasValidEvent,
        });
        return NextResponse.json(
          {
            valid: false,
            error: 'Evento no disponible',
          },
          { status: 404 }
        );
      }

      response = {
        valid: true,
        eventId: folder.events.id,
        folder: {
          id: folder.id,
          name: folder.name,
          event: {
            id: folder.events.id,
            name: folder.events.name,
          },
        },
      };
    } else {
      // Handle subject token response (legacy)
      const student = tokenData.students;
      const hasValidEvent =
        student && student.events && typeof student.events === 'object';
      const isActive = hasValidEvent ? student.events.active !== false : false; // Default to false if no valid event

      if (!student || !hasValidEvent || !isActive) {
        debugMigration('Associated event not active or found', {
          hasStudent: !!student,
          hasEvent: hasValidEvent,
          eventActive: hasValidEvent ? student.events.active : undefined,
        });
        return NextResponse.json(
          {
            valid: false,
            error: 'Evento no disponible',
          },
          { status: 404 }
        );
      }

      response = {
        valid: true,
        eventId: hasValidEvent && student.events.id ? student.events.id : '',
        student: {
          id: student.id,
          name: student.name,
          event: {
            id: hasValidEvent && student.events.id ? student.events.id : '',
            name:
              hasValidEvent && student.events.name ? student.events.name : '',
          },
        },
      };
    }

    debugMigration('Token validation successful', {
      eventId: response.eventId,
      studentName: response.student?.name,
      folderName: response.folder?.name,
      tokenType: tokenData.type,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error validating token:', error);
    debugMigration('Token validation error', { error });

    return NextResponse.json(
      {
        valid: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
});
