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
  id: string; // share_tokens.id
  publicAccessId: string; // public_access_tokens.id
  token: string;
  access_type: PublicAccessTokenType;
  event_id: string;
  folder_id: string | null;
  photo_ids: string[] | null;
  share_type: 'folder' | 'photos' | 'event';
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
    publicAccessId: string;
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
type SubjectTokenRow = Database['public']['Tables']['subject_tokens']['Row'];
type StudentTokenRow = Database['public']['Tables']['student_tokens']['Row'];
type FolderRow = Database['public']['Tables']['folders']['Row'];
type SubjectRow = Database['public']['Tables']['subjects']['Row'];
type StudentRow = Database['public']['Tables']['students']['Row'];

type MetadataRecord = Record<string, any>;

const ACCESS_TYPES_FOR_SHARES: PublicAccessTokenType[] = [
  'share_event',
  'share_folder',
  'share_photos',
];

interface AccessContext {
  event: EventSummary | null;
  folder: FolderSummary | null;
  subject: SubjectSummary | null;
  student: StudentSummary | null;
}

class PublicAccessService {
  private async getClient(): Promise<DbClient> {
    return await createServerSupabaseServiceClient<Database>();
  }

  private resolveShareAccessType(shareType?: string | null): PublicAccessTokenType {
    if (shareType === 'folder') return 'share_folder';
    if (shareType === 'photos') return 'share_photos';
    return 'share_event';
  }

  private coerceMetadata(metadata: any): MetadataRecord {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    return metadata as MetadataRecord;
  }

  private mapShareRecord(row: PublicAccessRow): PublicAccessShareToken {
    return {
      id: row.share_token_id ?? row.id,
      publicAccessId: row.id,
      token: row.token,
      access_type: row.access_type as PublicAccessTokenType,
      event_id: row.event_id || '',
      folder_id: row.folder_id ?? null,
      photo_ids: row.photo_ids ?? null,
      share_type: ((row.share_type as any) ?? 'event') as 'folder' | 'photos' | 'event',
      title: row.title ?? null,
      description: row.description ?? null,
      password_hash: row.password_hash ?? null,
      expires_at: row.expires_at ?? null,
      max_views: row.max_views ?? null,
      view_count: row.view_count ?? 0,
      allow_download: row.allow_download ?? false,
      allow_comments: row.allow_comments ?? false,
      metadata: this.coerceMetadata(row.metadata),
      is_active: row.is_active ?? false,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      is_legacy: row.is_legacy ?? false,
      legacy_source: row.legacy_source,
      legacy_reference: row.legacy_reference ?? null,
    };
  }

  private buildSharePayload(
    shareToken: ShareTokenRow,
    options: { isLegacy?: boolean }
  ) {
    return {
      id: shareToken.public_access_token_id ?? undefined,
      token: shareToken.token,
      access_type: this.resolveShareAccessType(shareToken.share_type),
      event_id: shareToken.event_id,
      share_token_id: shareToken.id,
      folder_id: shareToken.folder_id,
      share_type: shareToken.share_type,
      photo_ids: shareToken.photo_ids,
      title: shareToken.title,
      description: shareToken.description,
      password_hash: shareToken.password_hash,
      metadata: shareToken.metadata ?? {},
      allow_download: shareToken.allow_download ?? false,
      allow_comments: shareToken.allow_comments ?? false,
      expires_at: shareToken.expires_at,
      max_views: shareToken.max_views,
      view_count: shareToken.view_count ?? 0,
      is_active: shareToken.is_active ?? true,
      is_legacy: options.isLegacy ?? false,
      legacy_source: 'share_tokens' as const,
      legacy_reference: shareToken.id,
      legacy_payload: {
        share_type: shareToken.share_type,
        photo_ids: shareToken.photo_ids,
      },
      legacy_migrated_at: shareToken.legacy_migrated_at ?? new Date().toISOString(),
      created_at: shareToken.created_at ?? new Date().toISOString(),
      updated_at: shareToken.updated_at ?? new Date().toISOString(),
    };
  }

  private buildSubjectPayload(
    subjectToken: SubjectTokenRow,
    eventId: string | null,
    options: { isLegacy?: boolean }
  ) {
    return {
      id: subjectToken.public_access_token_id ?? undefined,
      token: subjectToken.token,
      access_type: 'family_subject' as const,
      event_id: eventId,
      subject_token_id: subjectToken.id,
      subject_id: subjectToken.subject_id,
      expires_at: subjectToken.expires_at,
      is_active:
        subjectToken.expires_at === null ||
        new Date(subjectToken.expires_at) > new Date(),
      is_legacy: options.isLegacy ?? false,
      legacy_source: 'subject_tokens' as const,
      legacy_reference: subjectToken.id,
      legacy_payload: {
        subject_id: subjectToken.subject_id,
      },
      legacy_migrated_at: subjectToken.legacy_migrated_at ?? new Date().toISOString(),
      created_at: subjectToken.created_at ?? new Date().toISOString(),
      updated_at: subjectToken.updated_at ?? subjectToken.created_at ?? new Date().toISOString(),
    };
  }

  private buildStudentPayload(
    studentToken: StudentTokenRow,
    eventId: string | null,
    options: { isLegacy?: boolean }
  ) {
    return {
      id: studentToken.public_access_token_id ?? undefined,
      token: studentToken.token,
      access_type: 'family_student' as const,
      event_id: eventId,
      student_token_id: studentToken.id,
      student_id: studentToken.student_id,
      expires_at: studentToken.expires_at,
      is_active:
        studentToken.expires_at === null ||
        new Date(studentToken.expires_at) > new Date(),
      is_legacy: options.isLegacy ?? false,
      legacy_source: 'student_tokens' as const,
      legacy_reference: studentToken.id,
      legacy_payload: {
        student_id: studentToken.student_id,
      },
      legacy_migrated_at: studentToken.legacy_migrated_at ?? new Date().toISOString(),
      created_at: studentToken.created_at ?? new Date().toISOString(),
      updated_at: studentToken.created_at ?? new Date().toISOString(),
    };
  }

  private buildFolderPayload(
    folder: FolderRow,
    options: { isLegacy?: boolean }
  ) {
    return {
      id: folder.public_access_token_id ?? undefined,
      token: folder.share_token!,
      access_type: 'folder_share' as const,
      event_id: folder.event_id,
      folder_id: folder.id,
      is_active: folder.is_published ?? false,
      is_legacy: options.isLegacy ?? false,
      legacy_source: 'folders' as const,
      legacy_reference: folder.id,
      legacy_payload: {
        name: folder.name,
        is_published: folder.is_published,
        published_at: (folder as any).published_at ?? null,
      },
      legacy_migrated_at: folder.legacy_public_access_migrated_at ?? new Date().toISOString(),
      created_at: folder.created_at ?? new Date().toISOString(),
      updated_at: folder.updated_at ?? new Date().toISOString(),
    };
  }

  private async updateShareBridge(
    client: DbClient,
    shareTokenId: string,
    publicAccessId: string,
    legacyMigratedAt: string
  ) {
    await client
      .from('share_tokens')
      .update({
        public_access_token_id: publicAccessId,
        legacy_migrated_at: legacyMigratedAt,
      })
      .eq('id', shareTokenId);
  }

  private async updateSubjectBridge(
    client: DbClient,
    subjectTokenId: string,
    publicAccessId: string,
    legacyMigratedAt: string
  ) {
    await client
      .from('subject_tokens')
      .update({
        public_access_token_id: publicAccessId,
        legacy_migrated_at: legacyMigratedAt,
      })
      .eq('id', subjectTokenId);
  }

  private async updateStudentBridge(
    client: DbClient,
    studentTokenId: string,
    publicAccessId: string,
    legacyMigratedAt: string
  ) {
    await client
      .from('student_tokens')
      .update({
        public_access_token_id: publicAccessId,
        legacy_migrated_at: legacyMigratedAt,
      })
      .eq('id', studentTokenId);
  }

  private async updateFolderBridge(
    client: DbClient,
    folderId: string,
    publicAccessId: string,
    legacyMigratedAt: string
  ) {
    await client
      .from('folders')
      .update({
        public_access_token_id: publicAccessId,
        legacy_public_access_migrated_at: legacyMigratedAt,
      })
      .eq('id', folderId);
  }

  async upsertShareTokenFromLegacy(
    shareToken: ShareTokenRow,
    options: { isLegacy?: boolean } = {}
  ): Promise<PublicAccessShareToken> {
    const client = await this.getClient();
    const payload = this.buildSharePayload(shareToken, options);

    const { data, error } = await client
      .from('public_access_tokens')
      .upsert(payload, { onConflict: 'token' })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      logger.error('Failed to upsert public access share token', {
        shareTokenId: shareToken.id,
        token: shareToken.token,
        error: error?.message,
      });
      throw error ?? new Error('Failed to upsert public access share token');
    }

    await this.updateShareBridge(
      client,
      shareToken.id,
      data.id,
      payload.legacy_migrated_at
    );

    return this.mapShareRecord(data);
  }

  private async upsertSubjectTokenFromLegacy(
    subjectToken: SubjectTokenRow,
    options: { isLegacy?: boolean } = {}
  ): Promise<PublicAccessRow> {
    const client = await this.getClient();
    const eventId = await this.resolveSubjectEventId(client, subjectToken.subject_id);
    const payload = this.buildSubjectPayload(subjectToken, eventId, options);

    const { data, error } = await client
      .from('public_access_tokens')
      .upsert(payload, { onConflict: 'token' })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      logger.error('Failed to upsert public access subject token', {
        subjectTokenId: subjectToken.id,
        token: subjectToken.token,
        error: error?.message,
      });
      throw error ?? new Error('Failed to upsert public access subject token');
    }

    await this.updateSubjectBridge(
      client,
      subjectToken.id,
      data.id,
      payload.legacy_migrated_at
    );

    return data;
  }

  private async upsertStudentTokenFromLegacy(
    studentToken: StudentTokenRow,
    options: { isLegacy?: boolean } = {}
  ): Promise<PublicAccessRow> {
    const client = await this.getClient();
    const eventId = await this.resolveStudentEventId(client, studentToken.student_id);
    const payload = this.buildStudentPayload(studentToken, eventId, options);

    const { data, error } = await client
      .from('public_access_tokens')
      .upsert(payload, { onConflict: 'token' })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      logger.error('Failed to upsert public access student token', {
        studentTokenId: studentToken.id,
        token: studentToken.token,
        error: error?.message,
      });
      throw error ?? new Error('Failed to upsert public access student token');
    }

    await this.updateStudentBridge(
      client,
      studentToken.id,
      data.id,
      payload.legacy_migrated_at
    );

    return data;
  }

  private async upsertFolderTokenFromLegacy(
    folder: FolderRow,
    options: { isLegacy?: boolean } = {}
  ): Promise<PublicAccessRow> {
    if (!folder.share_token) {
      throw new Error('Folder token missing share_token value');
    }
    const client = await this.getClient();
    const payload = this.buildFolderPayload(folder, options);

    const { data, error } = await client
      .from('public_access_tokens')
      .upsert(payload, { onConflict: 'token' })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      logger.error('Failed to upsert public access folder token', {
        folderId: folder.id,
        token: folder.share_token,
        error: error?.message,
      });
      throw error ?? new Error('Failed to upsert public access folder token');
    }

    await this.updateFolderBridge(
      client,
      folder.id,
      data.id,
      payload.legacy_migrated_at
    );

    return data;
  }

  private async fetchPublicAccessRowByToken(token: string): Promise<PublicAccessRow | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('public_access_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch public access token', { token, error: error.message });
      throw error;
    }

    return data ?? null;
  }

  private async fetchPublicAccessRowByShareId(shareTokenId: string): Promise<PublicAccessRow | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('public_access_tokens')
      .select('*')
      .eq('share_token_id', shareTokenId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch public access token by share id', {
        shareTokenId,
        error: error.message,
      });
      throw error;
    }

    return data ?? null;
  }

  private async hydrateLegacyToken(token: string): Promise<PublicAccessRow | null> {
    const client = await this.getClient();

    // Share tokens
    const { data: share } = await client
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (share) {
      await this.upsertShareTokenFromLegacy(share, { isLegacy: true });
      return await this.fetchPublicAccessRowByToken(token);
    }

    // Student tokens (guard if table exists)
    let student: StudentTokenRow | null = null;
    try {
      const response = await client
        .from('student_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      student = response.data ?? null;
    } catch (err: any) {
      if (err?.code !== 'PGRST116') {
        logger.warn('student_tokens lookup failed', { token, error: err?.message });
      }
    }
    if (student) {
      await this.upsertStudentTokenFromLegacy(student, { isLegacy: true });
      return await this.fetchPublicAccessRowByToken(token);
    }

    // Subject tokens
    const { data: subject } = await client
      .from('subject_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (subject) {
      await this.upsertSubjectTokenFromLegacy(subject, { isLegacy: true });
      return await this.fetchPublicAccessRowByToken(token);
    }

    // Folder share token
    const { data: folder } = await client
      .from('folders')
      .select('*')
      .eq('share_token', token)
      .maybeSingle();
    if (folder) {
      await this.upsertFolderTokenFromLegacy(folder, { isLegacy: true });
      return await this.fetchPublicAccessRowByToken(token);
    }

    return null;
  }

  async getShareTokenByToken(token: string): Promise<PublicAccessShareToken | null> {
    let row = await this.fetchPublicAccessRowByToken(token);

    if (!row) {
      row = await this.hydrateLegacyToken(token);
    }

    if (!row || !row.share_token_id) {
      return null;
    }

    return this.mapShareRecord(row);
  }

  async getShareTokenById(shareTokenId: string): Promise<PublicAccessShareToken | null> {
    let row = await this.fetchPublicAccessRowByShareId(shareTokenId);

    if (!row) {
      const client = await this.getClient();
      const { data: share } = await client
        .from('share_tokens')
        .select('*')
        .eq('id', shareTokenId)
        .maybeSingle();
      if (share) {
        await this.upsertShareTokenFromLegacy(share, { isLegacy: true });
        row = await this.fetchPublicAccessRowByShareId(shareTokenId);
      }
    }

    if (!row || !row.share_token_id) {
      return null;
    }

    return this.mapShareRecord(row);
  }

  async listEventShareTokens(eventId: string): Promise<PublicAccessShareToken[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('public_access_tokens')
      .select('*')
      .eq('event_id', eventId)
      .in('access_type', ACCESS_TYPES_FOR_SHARES)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list event share tokens', { eventId, error: error.message });
      throw error;
    }

    return (data || []).map((row) => this.mapShareRecord(row));
  }

  async setShareActiveState(
    shareTokenId: string,
    isActive: boolean
  ): Promise<PublicAccessShareToken | null> {
    const client = await this.getClient();
    const row = await this.fetchPublicAccessRowByShareId(shareTokenId);
    if (!row) {
      return null;
    }

    const updatedAt = new Date().toISOString();

    await client
      .from('public_access_tokens')
      .update({ is_active: isActive, updated_at: updatedAt })
      .eq('id', row.id);

    await client
      .from('share_tokens')
      .update({ is_active: isActive, updated_at: updatedAt })
      .eq('id', shareTokenId);

    return this.mapShareRecord({ ...row, is_active: isActive, updated_at: updatedAt });
  }

  async recordShareView(params: {
    publicAccessId: string;
    shareTokenId: string | null;
    viewCount: number;
    metadata: MetadataRecord;
  }): Promise<void> {
    const client = await this.getClient();
    const { publicAccessId, shareTokenId, viewCount, metadata } = params;
    const metadataJson = metadata ?? {};

    await client
      .from('public_access_tokens')
      .update({
        view_count: viewCount,
        metadata: metadataJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', publicAccessId);

    if (shareTokenId) {
      await client
        .from('share_tokens')
        .update({
          view_count: viewCount,
          metadata: metadataJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareTokenId);
    }
  }

  async resolveAccessToken(token: string): Promise<ResolvedAccess | null> {
    let row = await this.fetchPublicAccessRowByToken(token);

    if (!row) {
      row = await this.hydrateLegacyToken(token);
    }

    if (!row) {
      return null;
    }

    const client = await this.getClient();
    const context = await this.buildContext(row, client);

    return {
      token: {
        token: row.token,
        shareTokenId: row.share_token_id ?? null,
        publicAccessId: row.id,
        accessType: row.access_type as PublicAccessTokenType,
        isLegacy: row.is_legacy ?? false,
        isActive: row.is_active ?? false,
        expiresAt: row.expires_at ?? null,
        maxViews: row.max_views ?? null,
        viewCount: row.view_count ?? 0,
        legacySource: row.legacy_source,
      },
      event: context.event,
      share: row.share_token_id
        ? {
            shareType: row.share_type,
            folderId: row.folder_id ?? null,
            photoIds: row.photo_ids ?? null,
            allowDownload: row.allow_download ?? false,
            allowComments: row.allow_comments ?? false,
          }
        : undefined,
      folder: context.folder,
      subject: context.subject,
      student: context.student,
    };
  }

  async resolveFamilyAccess(token: string): Promise<FamilyAccessResolution | null> {
    const resolved = await this.resolveAccessToken(token);
    if (!resolved) {
      return null;
    }

    const { accessType } = resolved.token;

    if ((accessType === 'share_folder' || accessType === 'folder_share') && resolved.folder) {
      return {
        kind: 'folder',
        token: resolved.token,
        event: resolved.event,
        folder: resolved.folder,
      };
    }

    if (accessType === 'family_student' && resolved.student) {
      return {
        kind: 'student',
        token: resolved.token,
        event: resolved.event,
        student: resolved.student,
      };
    }

    if (accessType === 'family_subject' && resolved.subject) {
      return {
        kind: 'subject',
        token: resolved.token,
        event: resolved.event,
        subject: resolved.subject,
      };
    }

    return null;
  }

  private async buildContext(row: PublicAccessRow, client: DbClient): Promise<AccessContext> {
    let event: EventSummary | null = null;
    let folderSummary: FolderSummary | null = null;
    let subjectSummary: SubjectSummary | null = null;
    let studentSummary: StudentSummary | null = null;

    let eventId: string | null = row.event_id ?? null;

    if (row.folder_id) {
      const { data: folder } = await client
        .from('folders')
        .select('id, name, event_id, is_published, path')
        .eq('id', row.folder_id)
        .maybeSingle();
      if (folder) {
        folderSummary = {
          id: folder.id,
          name: folder.name,
          event_id: folder.event_id,
          is_published: folder.is_published ?? false,
          path: folder.path ?? null,
        };
        eventId = eventId ?? folder.event_id;
      }
    } else if (row.access_type === 'folder_share') {
      // attempt to resolve folder by token if folder_id missing
      const { data: folderByToken } = await client
        .from('folders')
        .select('id, name, event_id, is_published, path')
        .eq('share_token', row.token)
        .maybeSingle();
      if (folderByToken) {
        folderSummary = {
          id: folderByToken.id,
          name: folderByToken.name,
          event_id: folderByToken.event_id,
          is_published: folderByToken.is_published ?? false,
          path: folderByToken.path ?? null,
        };
        eventId = eventId ?? folderByToken.event_id;
      }
    }

    if (row.subject_id) {
      const subject = await this.fetchSubject(client, row.subject_id);
      if (subject) {
        subjectSummary = subject.summary;
        eventId = eventId ?? subject.eventId;
        if (!event && subject.event) {
          event = subject.event;
        }
      }
    }

    if (row.student_id) {
      const student = await this.fetchStudent(client, row.student_id);
      if (student) {
        studentSummary = student.summary;
        eventId = eventId ?? student.eventId;
        if (!event && student.event) {
          event = student.event;
        }
      }
    }

    if (!event && eventId) {
      event = await this.fetchEvent(client, eventId);
    }

    return {
      event,
      folder: folderSummary,
      subject: subjectSummary,
      student: studentSummary,
    };
  }

  private async fetchEvent(client: DbClient, eventId: string): Promise<EventSummary | null> {
    const { data, error } = await client
      .from('events')
      .select('id, name, date, status, school_name')
      .eq('id', eventId)
      .maybeSingle();
    if (error) {
      logger.warn('Failed to fetch event summary', { eventId, error: error.message });
      return null;
    }
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      date: (data as any).date ?? null,
      status: data.status ?? null,
      school_name: (data as any).school_name ?? null,
    };
  }

  private async fetchSubject(
    client: DbClient,
    subjectId: string
  ): Promise<{
    summary: SubjectSummary;
    eventId: string | null;
    event: EventSummary | null;
  } | null> {
    const { data, error } = await client
      .from('subjects')
      .select('id, name, event_id, parent_name, parent_email, created_at')
      .eq('id', subjectId)
      .maybeSingle();
    if (error) {
      logger.warn('Failed to fetch subject summary', {
        subjectId,
        error: error.message,
      });
      return null;
    }
    if (!data) {
      return null;
    }

    const event = data.event_id ? await this.fetchEvent(client, data.event_id) : null;

    return {
      summary: {
        id: data.id,
        name: data.name,
        event_id: data.event_id,
        parent_name: (data as any).parent_name ?? null,
        parent_email: (data as any).parent_email ?? null,
        created_at: data.created_at ?? new Date().toISOString(),
      },
      eventId: data.event_id,
      event,
    };
  }

  private async fetchStudent(
    client: DbClient,
    studentId: string
  ): Promise<{
    summary: StudentSummary;
    eventId: string;
    event: EventSummary | null;
  } | null> {
    const { data, error } = await client
      .from('students')
      .select(
        'id, name, event_id, course_id, grade, section, parent_name, parent_email, created_at'
      )
      .eq('id', studentId)
      .maybeSingle();
    if (error) {
      logger.warn('Failed to fetch student summary', {
        studentId,
        error: error.message,
      });
      return null;
    }
    if (!data) {
      return null;
    }

    let courseSummary: StudentSummary['course'] = null;
    if (data.course_id) {
      const { data: courseData } = await client
        .from('courses')
        .select('id, name, grade, section')
        .eq('id', data.course_id)
        .maybeSingle();
      if (courseData) {
        courseSummary = {
          id: courseData.id,
          name: courseData.name,
          grade: courseData.grade ?? null,
          section: courseData.section ?? null,
        };
      }
    }

    const event = data.event_id ? await this.fetchEvent(client, data.event_id) : null;

    return {
      summary: {
        id: data.id,
        name: data.name,
        event_id: data.event_id,
        course_id: data.course_id ?? null,
        grade: (data as any).grade ?? null,
        section: (data as any).section ?? null,
        parent_name: (data as any).parent_name ?? null,
        parent_email: (data as any).parent_email ?? null,
        created_at: data.created_at ?? new Date().toISOString(),
        course: courseSummary,
      },
      eventId: data.event_id,
      event,
    };
  }

  private async resolveSubjectEventId(client: DbClient, subjectId: string): Promise<string | null> {
    if (!subjectId) return null;
    const { data } = await client
      .from('subjects')
      .select('event_id')
      .eq('id', subjectId)
      .maybeSingle();
    return data?.event_id ?? null;
  }

  private async resolveStudentEventId(client: DbClient, studentId: string): Promise<string | null> {
    if (!studentId) return null;
    const { data } = await client
      .from('students')
      .select('event_id')
      .eq('id', studentId)
      .maybeSingle();
    return data?.event_id ?? null;
  }
}

export const publicAccessService = new PublicAccessService();
