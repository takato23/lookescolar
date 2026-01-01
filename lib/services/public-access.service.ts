import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PublicAccessTokenType =
  | 'share_event'
  | 'share_folder'
  | 'share_photos'
  | 'folder_share'
  | 'family_subject'
  | 'family_student';

export interface EventSummary {
  id: string;
  name: string;
  date?: string | null;
  status?: string | null;
  school_name?: string | null;
}

export interface FolderSummary {
  id: string;
  name: string;
  event_id: string;
  is_published: boolean;
  path?: string | null;
}

export interface SubjectSummary {
  id: string;
  name: string;
  event_id: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  created_at: string;
}

export interface StudentSummary {
  id: string;
  name: string;
  event_id: string;
  course_id: string | null;
  grade?: string | null;
  section?: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  created_at: string;
  course?: {
    id: string;
    name: string;
    grade: string | null;
    section: string | null;
  } | null;
}

export interface PublicAccessShareToken {
  id: string;
  publicAccessId: string | null;
  token: string;
  access_type: PublicAccessTokenType;
  event_id: string | null;
  folder_id: string | null;
  photo_ids: string[] | null;
  share_type: 'folder' | 'photos' | 'event' | null;
  title: string | null;
  description: string | null;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  allow_download: boolean;
  allow_comments: boolean;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_legacy: boolean;
  legacy_source: string;
  legacy_reference: string | null;
}

export interface ResolvedAccess {
  token: {
    token: string;
    shareTokenId: string | null;
    publicAccessId: string | null;
    accessType: PublicAccessTokenType;
    isLegacy: boolean;
    isActive: boolean;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
    legacySource: string;
  };
  event: EventSummary | null;
  share?: {
    shareType: string | null;
    folderId: string | null;
    photoIds: string[] | null;
    allowDownload: boolean;
    allowComments: boolean;
  };
  folder?: FolderSummary | null;
  subject?: SubjectSummary | null;
  student?: StudentSummary | null;
}

export type FamilyAccessResolution =
  | {
      kind: 'folder';
      token: ResolvedAccess['token'];
      event: EventSummary | null;
      folder: FolderSummary;
    }
  | {
      kind: 'student';
      token: ResolvedAccess['token'];
      event: EventSummary | null;
      student: StudentSummary;
    }
  | {
      kind: 'subject';
      token: ResolvedAccess['token'];
      event: EventSummary | null;
      subject: SubjectSummary;
    };

type DbClient = SupabaseClient<Database>;
type PublicAccessRow = Database['public']['Tables']['public_access_tokens']['Row'];
type ShareTokenRow = Database['public']['Tables']['share_tokens']['Row'];
type FolderRow = Database['public']['Tables']['folders']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];

class PublicAccessService {
  private readonly log = logger.child({ service: 'public-access' });

  private async getClient(): Promise<DbClient> {
    return await createServerSupabaseServiceClient<Database>();
  }

  private resolveShareAccessType(shareType?: string | null): PublicAccessTokenType {
    if (shareType === 'folder') return 'share_folder';
    if (shareType === 'photos') return 'share_photos';
    return 'share_event';
  }

  private mapShareToken(
    row: ShareTokenRow,
    access?: PublicAccessRow | null
  ): PublicAccessShareToken {
    return {
      id: row.id,
      publicAccessId: access?.id ?? row.public_access_token_id ?? null,
      token: row.token,
      access_type: access?.access_type ?? this.resolveShareAccessType(row.share_type),
      event_id: row.event_id ?? null,
      folder_id: row.folder_id ?? null,
      photo_ids: (row.photo_ids as string[] | null) ?? null,
      share_type: (row.share_type as any) ?? 'folder',
      title: row.title ?? null,
      description: row.description ?? null,
      password_hash: row.password_hash ?? null,
      expires_at: access?.expires_at ?? row.expires_at ?? null,
      max_views: access?.max_views ?? row.max_views ?? null,
      view_count: access?.view_count ?? row.view_count ?? 0,
      allow_download: row.allow_download ?? false,
      allow_comments: row.allow_comments ?? false,
      metadata: (row.metadata as any) ?? {},
      is_active: access?.is_active ?? row.is_active ?? true,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      is_legacy: access?.is_legacy ?? false,
      legacy_source: access?.legacy_source ?? 'share_tokens',
      legacy_reference: access?.legacy_reference ?? row.id,
    };
  }

  private mapFolder(row: FolderRow): FolderSummary {
    return {
      id: row.id,
      name: row.name,
      event_id: row.event_id,
      is_published: row.is_published ?? false,
      path: row.path ?? null,
    };
  }

  private mapEvent(row: EventRow): EventSummary {
    return {
      id: row.id,
      name: row.name,
      date: (row as any).date ?? (row as any).event_date ?? null,
      status: (row as any).status ?? null,
      school_name: (row as any).school_name ?? null,
    };
  }

  private buildResolved(
    token: string,
    shareRow: ShareTokenRow | null,
    accessRow: PublicAccessRow | null,
    folder: FolderSummary | null,
    event: EventSummary | null
  ): ResolvedAccess {
    const accessType = accessRow?.access_type ?? this.resolveShareAccessType(shareRow?.share_type);

    const sharePayload = shareRow
      ? {
          shareType: (shareRow.share_type as any) ?? accessRow?.share_type ?? 'folder',
          folderId: shareRow.folder_id ?? null,
          photoIds: (shareRow.photo_ids as string[] | null) ?? accessRow?.photo_ids ?? null,
          allowDownload: shareRow.allow_download ?? false,
          allowComments: shareRow.allow_comments ?? false,
        }
      : undefined;

    return {
      token: {
        token,
        shareTokenId: shareRow?.id ?? null,
        publicAccessId: accessRow?.id ?? shareRow?.public_access_token_id ?? null,
        accessType,
        isLegacy: accessRow?.is_legacy ?? false,
        isActive: accessRow?.is_active ?? shareRow?.is_active ?? true,
        expiresAt: accessRow?.expires_at ?? shareRow?.expires_at ?? null,
        maxViews: accessRow?.max_views ?? shareRow?.max_views ?? null,
        viewCount: accessRow?.view_count ?? shareRow?.view_count ?? 0,
        legacySource: accessRow?.legacy_source ?? 'share_tokens',
      },
      event,
      share: sharePayload,
      folder,
      subject: null,
      student: null,
    };
  }

  async resolveAccessToken(token: string): Promise<ResolvedAccess | null> {
    const supabase = await this.getClient();

    const { data: shareRow } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    let accessRow: PublicAccessRow | null = null;

    if (shareRow?.public_access_token_id) {
      const { data } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('id', shareRow.public_access_token_id)
        .maybeSingle();
      accessRow = data ?? null;
    }

    if (!accessRow) {
      const { data } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      accessRow = data ?? null;
    }

    if (!shareRow && !accessRow) {
      this.log.warn('access_token_not_found', { token });
      return null;
    }

    const folderId = shareRow?.folder_id ?? accessRow?.folder_id ?? null;
    const eventId = shareRow?.event_id ?? accessRow?.event_id ?? null;

    let folder: FolderSummary | null = null;
    if (folderId) {
      const { data } = await supabase
        .from('folders')
        .select('id, name, event_id, is_published, path')
        .eq('id', folderId)
        .maybeSingle();
      folder = data ? this.mapFolder(data) : null;
    }

    let event: EventSummary | null = null;
    if (eventId) {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();
      event = data ? this.mapEvent(data) : null;
    }

    return this.buildResolved(token, shareRow ?? null, accessRow, folder, event);
  }

  async getShareTokenById(id: string): Promise<PublicAccessShareToken | null> {
    const supabase = await this.getClient();
    const { data: row } = await supabase.from('share_tokens').select('*').eq('id', id).maybeSingle();
    if (!row) return null;

    let access: PublicAccessRow | null = null;
    if (row.public_access_token_id) {
      const { data } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('id', row.public_access_token_id)
        .maybeSingle();
      access = data ?? null;
    }

    return this.mapShareToken(row, access);
  }

  async getShareTokenByToken(token: string): Promise<PublicAccessShareToken | null> {
    const supabase = await this.getClient();
    const { data: row } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!row) return null;

    let access: PublicAccessRow | null = null;
    if (row.public_access_token_id) {
      const { data } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('id', row.public_access_token_id)
        .maybeSingle();
      access = data ?? null;
    }

    return this.mapShareToken(row, access);
  }

  async recordShareView(params: {
    token: string;
    shareTokenId?: string | null;
    publicAccessId?: string | null;
  }): Promise<number> {
    const supabase = await this.getClient();
    let viewCount = 0;

    if (params.shareTokenId) {
      const { data } = await supabase
        .from('share_tokens')
        .select('view_count')
        .eq('id', params.shareTokenId)
        .maybeSingle();
      const current = data?.view_count ?? 0;
      viewCount = current + 1;
      await supabase
        .from('share_tokens')
        .update({ view_count: viewCount })
        .eq('id', params.shareTokenId);
    }

    if (params.publicAccessId) {
      const { data } = await supabase
        .from('public_access_tokens')
        .select('view_count')
        .eq('id', params.publicAccessId)
        .maybeSingle();
      const current = data?.view_count ?? 0;
      viewCount = Math.max(viewCount, current + 1);
      await supabase
        .from('public_access_tokens')
        .update({ view_count })
        .eq('id', params.publicAccessId);
    }

    return viewCount;
  }
}

export const publicAccessService = new PublicAccessService();
