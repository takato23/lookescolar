import { NextRequest, NextResponse } from 'next/server';
import { enhancedTokenService } from '@/lib/services/enhanced-token.service';
import { tokenAliasService } from '@/lib/services/token-alias.service';
import { normalizeAliasInput } from '@/lib/utils/token-alias';
import {
  AliasLookupResponse,
  AliasLookupErrorCode,
} from '@/lib/types/family-access';

export async function GET(
  _request: NextRequest,
  { params }: { params: { alias: string } }
) {
  try {
    const { alias: rawAlias } = params;
    const alias = normalizeAliasInput(rawAlias);

    if (!alias) {
      return NextResponse.json(
        { error: 'Alias no válido', error_code: 'INVALID_ALIAS' },
        { status: 400 }
      );
    }

    const aliasRecord = await tokenAliasService.findByAlias(alias);

    if (!aliasRecord || !aliasRecord.token) {
      return NextResponse.json(
        { error: 'Alias no encontrado', error_code: 'ALIAS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const tokenData = aliasRecord.token;

    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'El acceso está inactivo', error_code: 'INACTIVE_TOKEN' },
        { status: 410 }
      );
    }

    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      if (Number.isFinite(expiresAt.getTime()) && expiresAt <= new Date()) {
        return NextResponse.json(
          { error: 'El acceso ha expirado', error_code: 'EXPIRED_TOKEN' },
          { status: 410 }
        );
      }
    }

    const validation = await enhancedTokenService.validateToken(
      tokenData.token
    );

    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { error: 'El token asociado no es válido', error_code: 'INVALID_TOKEN' },
        { status: 410 }
      );
    }

    const response: AliasLookupResponse = {
      alias: aliasRecord.alias,
      short_code: aliasRecord.short_code,
      token: validation.token.token,
      token_id: aliasRecord.token_id,
      event_id: validation.event?.id ?? tokenData.event_id ?? null,
      expires_at: validation.token.expiresAt
        ? validation.token.expiresAt.toISOString()
        : null,
      warnings: validation.warnings ?? undefined,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Alias API] Unexpected error resolving alias', {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: 'Error interno en la resolución de alias', error_code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
