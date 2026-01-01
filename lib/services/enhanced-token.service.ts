import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Compat layer para el "enhanced token" legacy.
 *
 * La DB actual no tiene `enhanced_tokens` ni `students` (usa `subjects`, `folders.share_token` y `share_tokens`).
 * Para no romper imports, este servicio valida:
 * - `folders.share_token` (token corto)
 * - `share_tokens.token` (token largo 64)
 * - `subjects.access_token` (token legacy por sujeto)
 */

export type TokenType = 'folder' | 'share' | 'subject';

export interface TokenMetadata {
  generatedAt?: string;
  distributionMethod?: 'email' | 'whatsapp' | 'sms' | 'print' | 'direct';
  notes?: string;
}

export interface EnhancedTokenData {
  id: string;
  token: string;
  type: TokenType;
  expiresAt: Date | null;
  isActive: boolean;
  metadata?: TokenMetadata;
  eventId?: string | null;
  folderId?: string | null;
  subjectId?: string | null;
}

export interface TokenValidationResult {
  isValid: boolean;
  token?: EnhancedTokenData;
  // En el esquema actual tratamos `subjects` como "students" legacy
  students?: Array<{
    id: string;
    name: string;
    grade?: string | null;
    section?: string | null;
  }>;
  event?: {
    id: string;
    name: string;
    status: string;
    date?: string | null;
  };
  accessLevel: 'none' | 'student' | 'family' | 'group' | 'event';
  warnings?: string[];
  expiresInDays?: number;
}

export class EnhancedTokenService {
  generatePortalUrl(token: string) {
    return `/store-unified/${token}`;
  }

  generateQRCodeData(token: string) {
    return token;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    if (!token || token.length < 8) {
      return { isValid: false, accessLevel: 'none' };
    }

    const supabase = await createServerSupabaseServiceClient();
    const now = new Date();

    // 1) Folder share token
    const { data: folder } = await supabase
      .from('folders')
      .select('id, event_id, share_token, is_published, events(id, name, status, date)')
      .eq('share_token', token)
      .eq('is_published', true)
      .maybeSingle();

    if (folder?.share_token && folder.events) {
      return {
        isValid: true,
        token: {
          id: folder.id,
          token: folder.share_token,
          type: 'folder',
          expiresAt: null,
          isActive: true,
          eventId: folder.event_id,
          folderId: folder.id,
        },
        event: {
          id: folder.events.id,
          name: folder.events.name,
          status: folder.events.status ?? 'active',
          date: (folder.events as any).date ?? null,
        },
        students: [],
        accessLevel: 'event',
      };
    }

    // 2) Share token (64 chars)
    const isHex64 = /^[a-f0-9]{64}$/i.test(token);
    if (isHex64) {
      const { data: shareToken } = await supabase
        .from('share_tokens')
        .select('id, token, event_id, folder_id, subject_id, is_active, expires_at, events(id, name, status, date)')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (
        shareToken &&
        shareToken.is_active !== false &&
        (!shareToken.expires_at || new Date(shareToken.expires_at) >= now) &&
        shareToken.events
      ) {
        const students: TokenValidationResult['students'] = [];

        if (shareToken.subject_id) {
          const { data: subject } = await supabase
            .from('subjects')
            .select('id, name, grade, section')
            .eq('id', shareToken.subject_id)
            .maybeSingle();
          if (subject) {
            students.push({
              id: subject.id,
              name: subject.name,
              grade: subject.grade,
              section: subject.section,
            });
          }
        }

        const expiresAt = shareToken.expires_at
          ? new Date(shareToken.expires_at)
          : null;

        const expiresInDays = expiresAt
          ? Math.max(
              0,
              Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            )
          : undefined;

        return {
          isValid: true,
          token: {
            id: shareToken.id,
            token: shareToken.token,
            type: 'share',
            expiresAt,
            isActive: true,
            eventId: shareToken.event_id,
            folderId: shareToken.folder_id,
            subjectId: shareToken.subject_id,
          },
          event: {
            id: shareToken.events.id,
            name: shareToken.events.name,
            status: (shareToken.events as any).status ?? 'active',
            date: (shareToken.events as any).date ?? null,
          },
          students,
          accessLevel: students.length > 0 ? 'student' : 'event',
          expiresInDays,
        };
      }
    }

    // 3) Legacy subject access token
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, grade, section, token_expires_at, event_id, events(id, name, status, date)')
      .eq('access_token', token)
      .maybeSingle();

    if (
      subject &&
      subject.token_expires_at &&
      new Date(subject.token_expires_at) >= now &&
      subject.events
    ) {
      const expiresAt = new Date(subject.token_expires_at);
      const expiresInDays = Math.max(
        0,
        Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        isValid: true,
        token: {
          id: subject.id,
          token,
          type: 'subject',
          expiresAt,
          isActive: true,
          eventId: subject.event_id,
          subjectId: subject.id,
        },
        event: {
          id: subject.events.id,
          name: subject.events.name,
          status: (subject.events as any).status ?? 'active',
          date: (subject.events as any).date ?? null,
        },
        students: [
          {
            id: subject.id,
            name: subject.name,
            grade: (subject as any).grade ?? null,
            section: (subject as any).section ?? null,
          },
        ],
        accessLevel: 'student',
        expiresInDays,
      };
    }

    return { isValid: false, accessLevel: 'none' };
  }
}

export const enhancedTokenService = new EnhancedTokenService();
