// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminAuthMiddleware } from '@/lib/security/admin-auth';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const parseIntParam = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export async function GET(request: NextRequest) {
  const authResult = await adminAuthMiddleware(request);
  if (
    !authResult ||
    ('success' in authResult && !authResult.success) ||
    ('ok' in authResult && !authResult.ok)
  ) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseIntParam(searchParams.get('limit'), 25), 100);
    const offset = parseIntParam(searchParams.get('offset'), 0);

    const supabase = await createServerSupabaseServiceClient();

    const { data: tokens, error: tokensError, count } = await supabase
      .from('enhanced_tokens')
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

    if (tokensError) {
      throw tokensError;
    }

    const tokenIds = (tokens ?? []).map((token) => token.id);
    const eventIds = Array.from(
      new Set(
        (tokens ?? [])
          .map((token) => token.event_id)
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
          (aliases ?? []).filter((alias) => alias.token_id === id),
        ])
      );
    }

    let statsMap = new Map<
      string,
      { total: number; success: number; failed: number; last_access?: string | null }
    >();

    if (tokenIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from('token_access_log')
        .select('token_id, access_granted, accessed_at')
        .in('token_id', tokenIds)
        .order('accessed_at', { ascending: false })
        .limit(500);

      if (logsError) {
        throw logsError;
      }

      statsMap = new Map(
        tokenIds.map((id) => [id, { total: 0, success: 0, failed: 0 }])
      );

      (logs ?? []).forEach((log) => {
        const bucket =
          statsMap.get(log.token_id) ||
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
        if (
          log.accessed_at &&
          (!bucket.last_access ||
            new Date(log.accessed_at) > new Date(bucket.last_access))
        ) {
          bucket.last_access = log.accessed_at;
        }
        statsMap.set(log.token_id, bucket);
      });
    }

    let eventMap = new Map<
      string,
      { id: string; name: string; school_name?: string | null; start_date?: string | null }
    >();

    if (eventIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, school_name, start_date, end_date')
        .in('id', eventIds);

      if (eventsError) {
        throw eventsError;
      }

      eventMap = new Map(
        (events ?? []).map((event) => [
          event.id,
          {
            id: event.id,
            name: event.name,
            school_name: event.school_name,
            start_date: event.start_date,
          },
        ])
      );
    }

    const responseTokens = (tokens ?? []).map((token) => ({
      id: token.id,
      token: token.token,
      type: token.type,
      expires_at: token.expires_at,
      is_active: token.is_active ?? true,
      created_at: token.created_at,
      updated_at: token.updated_at,
      event: token.event_id ? eventMap.get(token.event_id) ?? null : null,
      aliases: aliasMap.get(token.id) ?? [],
      stats: statsMap.get(token.id) ?? {
        total: token.usage_count ?? 0,
        success: token.usage_count ?? 0,
        failed: 0,
        last_access: token.last_used_at,
      },
    }));

    return NextResponse.json({
      tokens: responseTokens,
      pagination: {
        total: count ?? responseTokens.length,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[EnhancedTokensAdmin] Failed to fetch tokens', error);
    return NextResponse.json(
      {
        error: 'Failed to load enhanced tokens',
        message: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
