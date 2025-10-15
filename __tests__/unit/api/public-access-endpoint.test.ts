import { describe, expect, it, beforeAll, beforeEach, vi } from 'vitest';
import type { ResolvedAccess } from '@/lib/services/public-access.service';

const mocks = vi.hoisted(() => ({
  resolveAccessToken: vi.fn<[string], Promise<ResolvedAccess | null>>(),
}));

vi.mock('@/lib/services/public-access.service', () => ({
  publicAccessService: {
    resolveAccessToken: mocks.resolveAccessToken,
  },
}));

let GET: typeof import('@/app/api/public/access/[token]/route').GET;

beforeAll(async () => {
  ({ GET } = await import('@/app/api/public/access/[token]/route'));
});

const mockResolved: ResolvedAccess = {
  token: {
    token: 'sample-token',
    shareTokenId: 'share-1',
    publicAccessId: 'pat-1',
    accessType: 'share_event',
    isLegacy: false,
    isActive: true,
    expiresAt: null,
    maxViews: null,
    viewCount: 5,
    legacySource: 'share_tokens',
  },
  event: {
    id: 'event-1',
    name: 'Fiesta 5ºB',
    date: '2025-09-20',
    status: 'active',
    school_name: 'Colegio Central',
  },
  share: {
    shareType: 'event',
    folderId: null,
    photoIds: [],
    allowDownload: true,
    allowComments: false,
  },
  folder: null,
  student: null,
  subject: null,
};

describe('GET /api/public/access/[token]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 for invalid token parameter', async () => {
    const response = await GET({} as any, {
      params: { token: '123' },
    });

    expect(response.status).toBe(400);
  });

  it('returns public access payload when token exists', async () => {
    mocks.resolveAccessToken.mockResolvedValueOnce(mockResolved);

    const response = await GET({} as any, {
      params: { token: 'sample-token' },
    });

    expect(mocks.resolveAccessToken).toHaveBeenCalledWith('sample-token');
    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload).toMatchObject({
      token: {
        token: 'sample-token',
        publicAccessId: 'pat-1',
        accessType: 'share_event',
      },
      event: {
        id: 'event-1',
        name: 'Fiesta 5ºB',
      },
      share: {
        shareType: 'event',
      },
      defaultRedirect: '/store-unified/sample-token',
      compatibility: {
        isLegacy: false,
        source: 'share_tokens',
      },
    });
  });

  it('returns 404 when token is not found', async () => {
    mocks.resolveAccessToken.mockResolvedValueOnce(null);

    const response = await GET({} as any, {
      params: { token: 'missing-token' },
    });

    expect(response.status).toBe(404);
  });
});
