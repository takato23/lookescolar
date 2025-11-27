import { resolveParams, type RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { ensureAliasForToken } from '@/lib/services/token-alias.service';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseServiceClient>>;
type EnhancedTokenRow = Database['public']['Tables']['enhanced_tokens']['Row'];

interface AliasSummary {
  alias: string;
  short_code: string;
}

async function fetchEnhancedTokens(client: SupabaseClient, eventId: string): Promise<EnhancedTokenRow[]> {
  const { data, error } = await client
    .from('enhanced_tokens')
    .select(
      `
        id,
        token,
        type,
        expires_at,
        is_active,
        family_email,
        student_ids,
        metadata,
        access_rules
      `
    )
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchAliasMap(client: SupabaseClient, tokenIds: string[]): Promise<Map<string, AliasSummary>> {
  if (tokenIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('token_aliases')
    .select('token_id, alias, short_code')
    .in('token_id', tokenIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const aliasMap = new Map<string, AliasSummary>();
  (data ?? []).forEach((record: Record<string, unknown>) => {
    const tokenId = record?.token_id as string | undefined;
    const alias = record?.alias as string | undefined;
    const shortCode = record?.short_code as string | undefined;
    if (tokenId && alias && shortCode && !aliasMap.has(tokenId)) {
      aliasMap.set(tokenId, {
        alias,
        short_code: shortCode,
      });
    }
  });

  return aliasMap;
}

async function ensureMissingAliases(tokenIds: string[], aliasMap: Map<string, AliasSummary>) {
  if (tokenIds.length === 0) return;

  const results = await Promise.allSettled(
    tokenIds.map(async (tokenId) => {
      const ensured = await ensureAliasForToken(tokenId);
      return {
        tokenId,
        alias: ensured.alias,
        short_code: ensured.short_code,
      };
    })
  );

  results.forEach((result, index) => {
    const tokenId = tokenIds[index];
    if (result.status === 'fulfilled') {
      aliasMap.set(tokenId, {
        alias: result.value.alias,
        short_code: result.value.short_code,
      });
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.warn('[AliasesList] Failed to ensure alias for token', {
        tokenId,
        errorContext: { reason },
      });
    }
  });
}

function mapTokenResponse(token: EnhancedTokenRow, alias: AliasSummary | null) {
  return {
    id: token.id,
    token: token.token,
    type: token.type,
    expires_at: token.expires_at,
    family_email: token.family_email,
    student_ids: token.student_ids || [],
    metadata: token.metadata,
    access_rules: token.access_rules,
    alias: alias?.alias ?? null,
    short_code: alias?.short_code ?? null,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export const GET = withAdminAuth(async (_req: NextRequest, context: RouteContext<{ id: string }>) => {
  const { id: eventId } = await resolveParams(context);
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Parámetro de evento faltante', tokens: [] },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseServiceClient();
    const shareTokens = await fetchEnhancedTokens(supabase, eventId);
    if (shareTokens.length === 0) {
      return NextResponse.json({ success: true, tokens: [] });
    }

    const tokenIds = shareTokens.map((token) => token.id);
    const aliasMap = await fetchAliasMap(supabase, tokenIds);
    const missingAliasIds = tokenIds.filter((tokenId) => !aliasMap.has(tokenId));

    if (missingAliasIds.length > 0) {
      await ensureMissingAliases(missingAliasIds, aliasMap);
    }

    const tokensWithAlias = shareTokens.map((token) => mapTokenResponse(token, aliasMap.get(token.id) ?? null));

    return NextResponse.json({
      success: true,
      tokens: tokensWithAlias,
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    logger.error('[AliasesList] CRITICAL error fetching aliases', {
      errorContext: {
        message,
      },
    });
    return NextResponse.json(
      { success: false, error: message || 'Error al cargar alias' },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth(async (_req: NextRequest, context: RouteContext<{ id: string }>) => {
  const { id: eventId } = await resolveParams(context);
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Parámetro de evento faltante', ensured: 0, aliases: [] },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseServiceClient();
    const shareTokens = await fetchEnhancedTokens(supabase, eventId);
    if (shareTokens.length === 0) {
      return NextResponse.json({ success: true, ensured: 0, aliases: [] });
    }

    const results = await Promise.allSettled(
      shareTokens.map(async (token) => {
        const alias = await ensureAliasForToken(token.id);
        return {
          tokenId: token.id,
          alias: alias.alias,
          shortCode: alias.short_code,
        };
      })
    );

    const ensured: Array<{ tokenId: string; alias: string; shortCode: string }> = [];
    results.forEach((result, index) => {
      const tokenId = shareTokens[index]?.id;
      if (result.status === 'fulfilled') {
        ensured.push(result.value);
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        logger.warn('[AliasesEnsure] Failed to ensure alias', {
          tokenId,
          errorContext: { reason },
        });
      }
    });

    return NextResponse.json({
      success: true,
      ensured: ensured.length,
      aliases: ensured,
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    logger.error('[AliasesEnsure] error ensuring aliases', {
      errorContext: {
        message,
      },
    });
    return NextResponse.json(
      { success: false, error: message || 'Error al generar alias' },
      { status: 500 }
    );
  }
});
