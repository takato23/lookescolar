import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(),
}));

import { shareService, ShareScopeConfig } from '@/lib/services/share.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const mockedSupabaseFactory = () => ({
  from: vi.fn(),
});

type SupabaseMock = ReturnType<typeof mockedSupabaseFactory>;

const createSelectSingleMock = (data: any) => {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
};

describe('ShareService', () => {
  let supabase: SupabaseMock;
  const tables: Record<string, any> = {};

  beforeEach(() => {
    vi.resetAllMocks();
    supabase = mockedSupabaseFactory();
    supabase.rpc = vi.fn().mockResolvedValue({ data: [{ id: 'folder-2' }], error: null });
    tables['events'] = createSelectSingleMock({ id: 'event-1', name: 'Evento Test' });
    tables['folders'] = createSelectSingleMock({ id: 'folder-1', event_id: 'event-1' });
    supabase.from.mockImplementation((table: string) => tables[table]);
    vi.mocked(createServerSupabaseServiceClient).mockResolvedValue(supabase as any);
  });

  it('creates share with scope_config and precomputes contents including audiences', async () => {
    const insertedPhotos = [
      { id: 'photo-1', folder_id: 'folder-1' },
      { id: 'photo-2', folder_id: 'folder-2' },
    ];

    const photosTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: insertedPhotos, error: null }),
    };

    let insertedShareData: any;
    const shareTokenRow = {
      id: 'share-1',
      token: 'token-abc',
      event_id: 'event-1',
      share_type: 'folder',
      folder_id: 'folder-1',
      photo_ids: null,
      allow_download: true,
      allow_comments: false,
      view_count: 0,
      max_views: null,
      expires_at: null,
      is_active: true,
      metadata: {},
      scope_config: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const shareTokensTable = {
      insert: vi.fn((payload) => {
        insertedShareData = payload;
        shareTokenRow.scope_config = payload.scope_config;
        return {
          select: () => ({
            single: () => Promise.resolve({ data: shareTokenRow, error: null }),
          }),
        };
      }),
    };

    const shareTokenContentsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const shareTokenContentsTable = {
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      upsert: shareTokenContentsUpsert,
    };

    const shareAudiencesInsert = vi.fn((rows) => ({
      select: () =>
        Promise.resolve({
          data: rows.map((row, idx) => ({ ...row, id: `aud-${idx}` })),
          error: null,
        }),
    }));
    const shareAudiencesTable = { insert: shareAudiencesInsert };

    tables['photos'] = photosTable;
    tables['share_tokens'] = shareTokensTable;
    tables['share_token_contents'] = shareTokenContentsTable;
    tables['share_audiences'] = shareAudiencesTable;

    const audiences = [
      { type: 'family', subjectId: 'subject-1' },
      { type: 'manual', contactEmail: 'family@example.com' },
    ];

    const scopeConfig: ShareScopeConfig = {
      scope: 'folder',
      anchorId: 'folder-1',
      includeDescendants: true,
      filters: {},
    };

    const result = await shareService.createShare({
      eventId: 'event-1',
      folderId: 'folder-1',
      shareType: 'folder',
      scopeConfig,
      includeDescendants: true,
      allowDownload: true,
      allowComments: false,
      audiences,
    });

    expect(result.success).toBe(true);
    expect(result.data?.scopeConfig.scope).toBe('folder');
    expect(result.data?.audiencesCount).toBe(2);
    expect(insertedShareData.scope_config.anchor_id).toBe('folder-1');
    expect(shareTokenContentsUpsert).toHaveBeenCalledTimes(1);
    const [[upsertPayload]] = shareTokenContentsUpsert.mock.calls;
    expect(upsertPayload).toHaveLength(2);
    expect(shareAudiencesInsert).toHaveBeenCalledTimes(1);
  });

  it('validates access using precalculated contents and returns scope config', async () => {
    const shareTokenRow = {
      id: 'share-1',
      token: 'token-abc',
      event_id: 'event-1',
      share_type: 'folder',
      folder_id: 'folder-1',
      photo_ids: null,
      allow_download: true,
      allow_comments: false,
      view_count: 0,
      max_views: null,
      expires_at: null,
      is_active: true,
      password_hash: null,
      metadata: {},
      scope_config: {
        scope: 'folder',
        anchor_id: 'folder-1',
        include_descendants: true,
        filters: {},
      },
    };

    const shareTokensTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: shareTokenRow, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };

    const eventsTable = createSelectSingleMock({ id: 'event-1', name: 'Evento Test' });

    const shareTokenContentsTable = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [
            { photo_id: 'photo-1' },
            { photo_id: 'photo-2' },
          ],
          error: null,
        }),
      })),
    };

    const photosTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'photo-1',
            original_filename: 'p1.jpg',
            storage_path: 'p1.jpg',
            file_size: 123,
            width: 100,
            height: 100,
            metadata: {},
          },
          {
            id: 'photo-2',
            original_filename: 'p2.jpg',
            storage_path: 'p2.jpg',
            file_size: 456,
            width: 100,
            height: 100,
            metadata: {},
          },
        ],
        error: null,
      }),
    };

    const shareAudiencesTable = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      })),
    };

    tables['share_tokens'] = shareTokensTable;
    tables['events'] = eventsTable;
    tables['share_token_contents'] = shareTokenContentsTable;
    tables['photos'] = photosTable;
    tables['share_audiences'] = shareAudiencesTable;

    const access = await shareService.validateAccess({ token: 'token-abc' });

    expect(access.success).toBe(true);
    expect(access.data?.scopeConfig.scope).toBe('folder');
    expect(access.data?.audiencesCount).toBe(2);
    expect(access.data?.photos).toHaveLength(2);
  });
});
