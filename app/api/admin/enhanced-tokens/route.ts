import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

const parseIntParam = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Get enhanced tokens with aliases, stats, and event info
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseIntParam(searchParams.get('limit'), 25), 100);
    const offset = parseIntParam(searchParams.get('offset'), 0);

    const supabase = await createServerSupabaseServiceClient();

    // Try to query enhanced_tokens, fallback to public_access_tokens if it doesn't exist
    let tokens: Record<string, unknown>[] | null = null;
    let tokensError: Error | null = null;
    let count: number | null = null;

    try {
      const result = await supabase
        .from('enhanced_tokens' as any)
        .select(
          `
          id,
          token,
          type,
          expires_at,
          is_active,
          usage_count,
          last_used_at,
          event_id,
          metadata,
          created_at,
          updated_at
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      tokens = result.data;
      tokensError = result.error;
      count = result.count;
    } catch (e) {
      // Table doesn't exist, return empty result
      tokens = [];
      count = 0;
    }

    if (tokensError) {
      // If error is about table not existing, return empty
      if (tokensError.message?.includes('does not exist') || tokensError.message?.includes('relation')) {
        tokens = [];
        count = 0;
      } else {
        throw tokensError;
      }
    }

    const tokenIds = (tokens ?? []).map((token: Record<string, unknown>) => token.id as string);
    const eventIds = Array.from(
      new Set(
        (tokens ?? [])
          .map((token: Record<string, unknown>) => token.event_id as string | null)
          .filter((value): value is string => Boolean(value))
      )
    );

    let aliasMap = new Map<
      string,
      Array<{
        id: string;
        alias: string;
        short_code: string;
        created_at?: string;
        updated_at?: string;
      }>
    >();

    if (tokenIds.length > 0) {
      const { data: aliases, error: aliasError } = await supabase
        .from('token_aliases')
        .select('id, alias, short_code, token_id, created_at, updated_at')
        .in('token_id', tokenIds);

      if (aliasError) {
        throw aliasError;
      }

      aliasMap = new Map(
        tokenIds.map((id) => [
          id,
          (aliases ?? []).filter((alias: Record<string, unknown>) => alias.token_id === id),
        ])
      );
    }

    let statsMap = new Map<
      string,
      { total: number; success: number; failed: number; last_access?: string | null }
    >();

    if (tokenIds.length > 0) {
      // Try to query token_access_log, but handle if table doesn't exist
      let logs: Record<string, unknown>[] | null = null;
      try {
        const logsResult = await supabase
          .from('token_access_log' as any)
          .select('token_id, access_granted, accessed_at')
          .in('token_id', tokenIds)
          .order('accessed_at', { ascending: false })
          .limit(500);
        
        if (logsResult.error && !logsResult.error.message?.includes('does not exist') && !logsResult.error.message?.includes('relation')) {
          throw logsResult.error;
        }
        logs = logsResult.data;
      } catch (e) {
        // Table doesn't exist, use empty array
        logs = [];
      }

      statsMap = new Map(
        tokenIds.map((id) => [id, { total: 0, success: 0, failed: 0 }])
      );

      (logs ?? []).forEach((log: Record<string, unknown>) => {
        const tokenId = log.token_id as string;
        const bucket =
          statsMap.get(tokenId) ||
          ({ total: 0, success: 0, failed: 0 } as {
            total: number;
            success: number;
            failed: number;
            last_access?: string | null;
          });
        bucket.total += 1;
        if (log.access_granted) {
          bucket.success += 1;
        } else {
          bucket.failed += 1;
        }
        const accessedAt = log.accessed_at as string | null;
        if (
          accessedAt &&
          (!bucket.last_access ||
            new Date(accessedAt) > new Date(bucket.last_access))
        ) {
          bucket.last_access = accessedAt;
        }
        statsMap.set(tokenId, bucket);
      });
    }

    let eventMap = new Map<
      string,
      { id: string; name: string; location?: string | null; date?: string | null }
    >();

    if (eventIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, location, date')
        .in('id', eventIds);

      if (eventsError) {
        throw eventsError;
      }

      eventMap = new Map(
        (events ?? []).map((event: Record<string, unknown>) => [
          event.id as string,
          {
            id: event.id as string,
            name: event.name as string,
            location: event.location as string | null,
            date: event.date as string | null,
          },
        ])
      );
    }

    const responseTokens = (tokens ?? []).map((token: Record<string, unknown>) => ({
      id: token.id as string,
      token: token.token as string,
      type: token.type as string,
      expires_at: token.expires_at as string | null,
      is_active: (token.is_active as boolean) ?? true,
      created_at: token.created_at as string,
      updated_at: token.updated_at as string | null,
      event: token.event_id ? eventMap.get(token.event_id as string) ?? null : null,
      aliases: aliasMap.get(token.id as string) ?? [],
      stats: statsMap.get(token.id as string) ?? {
        total: (token.usage_count as number) ?? 0,
        success: (token.usage_count as number) ?? 0,
        failed: 0,
        last_access: token.last_used_at as string | null,
      },
    }));

    logger.info('Enhanced tokens fetched', {
      requestId,
      count: responseTokens.length,
      total: count,
    });

    return NextResponse.json({
      tokens: responseTokens,
      pagination: {
        total: count ?? responseTokens.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Enhanced tokens fetch error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to load enhanced tokens',
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
