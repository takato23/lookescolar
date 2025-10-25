import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizeAliasInput } from '@/lib/utils/token-alias';
import type { Database } from '@/types/database';

export interface TokenAliasRecord {
  id: string;
  alias: string;
  short_code: string;
  token_id: string;
  token?: {
    token: string;
    expires_at: string | null;
    is_active: boolean | null;
    event_id: string | null;
  } | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAliasOptions {
  alias?: string;
  shortCode?: string;
  generatedBy?: string | null;
  metadata?: Record<string, unknown>;
}

const ALIAS_WORDS = [
  'luz',
  'vida',
  'arte',
  'sol',
  'lente',
  'brillo',
  'risa',
  'sonrisa',
  'lente',
  'festival',
  'clase',
  'campo',
  'foto',
  'color',
  'album',
  'nube',
  'flash',
  'eco',
  'mundo',
  'lira',
  'magia',
  'estudio',
];

const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAliasSlug(): string {
  const word =
    ALIAS_WORDS[Math.floor(Math.random() * ALIAS_WORDS.length)] ?? 'foto';
  const suffix = Math.floor(Math.random() * 9900 + 100).toString();
  const alias = `${word}${suffix}`.slice(0, 12);
  return normalizeAliasInput(alias);
}

function generateShortCode(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * SHORT_CODE_CHARS.length);
    result += SHORT_CODE_CHARS[index] ?? 'X';
  }
  return result;
}

export class TokenAliasService {
  private clientPromise = createServerSupabaseServiceClient();

  async findPrimaryAlias(tokenId: string): Promise<TokenAliasRecord | null> {
    if (!tokenId) return null;

    const supabase = await this.clientPromise;
    const { data, error } = await supabase
      .from('token_aliases')
      .select(
        `
          id,
          alias,
          short_code,
          token_id,
          metadata,
          created_at,
          updated_at
        `
      )
      .eq('token_id', tokenId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[TokenAliasService] Error fetching primary alias', {
        tokenId,
        error,
      });
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      alias: data.alias,
      short_code: data.short_code,
      token_id: data.token_id,
      metadata: (data.metadata ?? undefined) as Record<string, unknown>,
      created_at: data.created_at ?? undefined,
      updated_at: data.updated_at ?? undefined,
    };
  }

  async findByAlias(rawAlias: string): Promise<TokenAliasRecord | null> {
    const alias = normalizeAliasInput(rawAlias);
    if (!alias) {
      return null;
    }

    const supabase = await this.clientPromise;

    const { data, error } = await supabase
      .from('token_aliases')
      .select(
        `
          id,
          alias,
          short_code,
          token_id,
          metadata,
          created_at,
          updated_at,
          enhanced_tokens!inner (
            token,
            expires_at,
            is_active,
            event_id
          )
        `
      )
      .eq('alias', alias)
      .maybeSingle();

    if (error) {
      console.error('[TokenAliasService] Error fetching alias', {
        alias,
        error,
      });
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      alias: data.alias,
      short_code: data.short_code,
      token_id: data.token_id,
      metadata: (data.metadata ?? undefined) as Record<string, unknown>,
      created_at: data.created_at ?? undefined,
      updated_at: data.updated_at ?? undefined,
      token: data.enhanced_tokens
        ? {
            token: data.enhanced_tokens.token,
            expires_at: data.enhanced_tokens.expires_at,
            is_active: data.enhanced_tokens.is_active,
            event_id: data.enhanced_tokens.event_id,
          }
        : null,
    };
  }

  async findByShortCode(shortCode: string): Promise<TokenAliasRecord | null> {
    if (!shortCode) return null;

    const normalizedShort = shortCode.trim().toUpperCase();

    const supabase = await this.clientPromise;
    const { data, error } = await supabase
      .from('token_aliases')
      .select(
        `
          id,
          alias,
          short_code,
          token_id,
          metadata,
          created_at,
          updated_at,
          enhanced_tokens!inner (
            token,
            expires_at,
            is_active,
            event_id
          )
        `
      )
      .eq('short_code', normalizedShort)
      .maybeSingle();

    if (error) {
      console.error('[TokenAliasService] Error fetching short code', {
        shortCode: normalizedShort,
        error,
      });
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      alias: data.alias,
      short_code: data.short_code,
      token_id: data.token_id,
      metadata: (data.metadata ?? undefined) as Record<string, unknown>,
      created_at: data.created_at ?? undefined,
      updated_at: data.updated_at ?? undefined,
      token: data.enhanced_tokens
        ? {
            token: data.enhanced_tokens.token,
            expires_at: data.enhanced_tokens.expires_at,
            is_active: data.enhanced_tokens.is_active,
            event_id: data.enhanced_tokens.event_id,
          }
        : null,
    };
  }

  async createAliasForToken(
    tokenId: string,
    options: CreateAliasOptions = {}
  ): Promise<TokenAliasRecord> {
    if (!tokenId) {
      throw new Error('tokenId is required to generate alias');
    }

    const supabase = await this.clientPromise;

    const alias =
      options.alias && options.alias.length > 0
        ? normalizeAliasInput(options.alias)
        : await this.generateUniqueAlias();

    if (alias.length < 3 || alias.length > 12) {
      throw new Error('El alias debe tener entre 3 y 12 caracteres alfanuméricos.');
    }

    if (!alias) {
      throw new Error('No se pudo generar un alias válido');
    }

    const shortCode =
      options.shortCode && options.shortCode.length > 0
        ? options.shortCode.trim().toUpperCase()
        : await this.generateUniqueShortCode();

    if (shortCode.length < 4 || shortCode.length > 12) {
      throw new Error('El código corto debe tener entre 4 y 12 caracteres.');
    }

    const { data, error } = await supabase
      .from('token_aliases')
      .insert({
        alias,
        short_code: shortCode,
        token_id: tokenId,
        generated_by: options.generatedBy ?? null,
        metadata: (options.metadata ?? {}) as Database['public']['Tables']['token_aliases']['Row']['metadata'],
      })
      .select(
        `
          id,
          alias,
          short_code,
          token_id,
          metadata,
          created_at,
          updated_at,
          enhanced_tokens (
            token,
            expires_at,
            is_active,
            event_id
          )
        `
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('El alias generado ya existe, intenta nuevamente');
      }
      console.error('[TokenAliasService] Error creating alias', {
        tokenId,
        alias,
        shortCode,
        error,
      });
      throw error;
    }

    return {
      id: data.id,
      alias: data.alias,
      short_code: data.short_code,
      token_id: data.token_id,
      metadata: (data.metadata ?? undefined) as Record<string, unknown>,
      created_at: data.created_at ?? undefined,
      updated_at: data.updated_at ?? undefined,
      token: data.enhanced_tokens
        ? {
            token: data.enhanced_tokens.token,
            expires_at: data.enhanced_tokens.expires_at,
            is_active: data.enhanced_tokens.is_active,
            event_id: data.enhanced_tokens.event_id,
          }
        : null,
    };
  }

  async listAliasesForToken(tokenId: string): Promise<TokenAliasRecord[]> {
    if (!tokenId) return [];

    const supabase = await this.clientPromise;
    const { data, error } = await supabase
      .from('token_aliases')
      .select(
        `
          id,
          alias,
          short_code,
          token_id,
          metadata,
          created_at,
          updated_at
        `
      )
      .eq('token_id', tokenId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TokenAliasService] Error listing aliases', {
        tokenId,
        error,
      });
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      alias: row.alias,
      short_code: row.short_code,
      token_id: row.token_id,
      metadata: (row.metadata ?? undefined) as Record<string, unknown>,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined,
    }));
  }

  private async generateUniqueAlias(attempts: number = 0): Promise<string> {
    if (attempts > 10) {
      throw new Error('No fue posible generar un alias único');
    }

    const candidate = generateAliasSlug();
    const supabase = await this.clientPromise;
    const { data } = await supabase
      .from('token_aliases')
      .select('id')
      .eq('alias', candidate)
      .maybeSingle();

    if (data) {
      return this.generateUniqueAlias(attempts + 1);
    }

    return candidate;
  }

  private async generateUniqueShortCode(
    attempts: number = 0
  ): Promise<string> {
    if (attempts > 10) {
      throw new Error('No fue posible generar un código corto único');
    }

    const candidate = generateShortCode();
    const supabase = await this.clientPromise;
    const { data } = await supabase
      .from('token_aliases')
      .select('id')
      .eq('short_code', candidate)
      .maybeSingle();

    if (data) {
      return this.generateUniqueShortCode(attempts + 1);
    }

    return candidate;
  }
}

const tokenAliasServiceSingleton = new TokenAliasService();

export async function ensureAliasForToken(
  tokenId: string
): Promise<TokenAliasRecord> {
  const existing = await tokenAliasServiceSingleton.findPrimaryAlias(tokenId);
  if (existing) {
    return existing;
  }
  return tokenAliasServiceSingleton.createAliasForToken(tokenId);
}

export const tokenAliasService = tokenAliasServiceSingleton;
