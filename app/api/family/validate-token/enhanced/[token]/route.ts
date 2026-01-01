import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import {
  enhancedTokenService,
  type TokenValidationResult,
} from '@/lib/services/enhanced-token.service';
import { generateRequestId } from '@/lib/middleware/auth.middleware';
import type { EnhancedTokenValidationResponse } from '@/lib/types/family-access';

/**
 * Endpoint legado: /api/family/validate-token/enhanced/[token]
 *
 * Hoy validamos tokens contra `folders.share_token`, `share_tokens.token` y `subjects.access_token`.
 * Devolvemos una respuesta compatible con `EnhancedTokenValidationResponse`.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<{ token: string }>
): Promise<NextResponse<EnhancedTokenValidationResponse>> {
  const requestId = generateRequestId();

  try {
    const { token } = await context.params;

    if (!token || token.length < 8) {
      return NextResponse.json(
        {
          valid: false,
          access_level: 'none',
          error: 'Formato de token inválido',
          error_code: 'INVALID_TOKEN',
        },
        { status: 400 }
      );
    }

    const validationResult: TokenValidationResult =
      await enhancedTokenService.validateToken(token);

    if (!validationResult.isValid || !validationResult.event) {
      return NextResponse.json(
        {
          valid: false,
          access_level: 'none',
          error: 'Token no válido o expirado',
          error_code: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    const eventSummary = {
      id: validationResult.event.id,
      name: validationResult.event.name,
    };

    // Si tenemos un "student" (subjects) devolvemos access_level student
    if (validationResult.accessLevel === 'student' && validationResult.students?.length) {
      const student = validationResult.students[0];
      return NextResponse.json({
        valid: true,
        access_level: 'student',
        token_type: validationResult.token?.type,
        expires_in_days: validationResult.expiresInDays,
        warnings: validationResult.warnings,
        event: eventSummary,
        student: {
          id: student.id,
          name: student.name,
          event: eventSummary,
        },
      });
    }

    // Default: event-level access (folder/share tokens)
    return NextResponse.json({
      valid: true,
      access_level: 'event',
      token_type: validationResult.token?.type,
      expires_in_days: validationResult.expiresInDays,
      warnings: validationResult.warnings,
      event: eventSummary,
    });
  } catch (error) {
    console.error('[validate-token/enhanced] error', { requestId, error });
    return NextResponse.json(
      {
        valid: false,
        access_level: 'none',
        error: 'Error interno del servidor',
        error_code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
