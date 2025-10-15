import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { shareService, ShareAudienceInput, ShareScopeConfig } from '@/lib/services/share.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AudienceItemSchema = z.object({
  type: z.enum(['family', 'group', 'manual']),
  subjectId: z.string().uuid().optional(),
  contactEmail: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
});

const AudienceObjectSchema = z
  .object({
    families: z.array(z.string().uuid()).optional(),
    groups: z.array(z.string().uuid()).optional(),
    emails: z.array(z.string().email()).optional(),
  })
  .optional();

const ScopeConfigSchema = z
  .object({
    scope: z.enum(['event', 'folder', 'selection']),
    anchorId: z.string().uuid().optional(),
    includeDescendants: z.boolean().optional(),
    filters: z.record(z.any()).optional(),
  })
  .optional();

const CreateShareBodySchema = z.object({
  shareType: z.enum(['event', 'folder', 'photos']).optional(),
  eventId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  photoIds: z.array(z.string().uuid()).optional(),
  scopeConfig: ScopeConfigSchema,
  includeDescendants: z.boolean().optional(),
  audiences: z.array(AudienceItemSchema).optional(),
  audience: AudienceObjectSchema,
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  password: z.string().max(100).optional(),
  expiresAt: z.string().optional(),
  maxViews: z.number().int().positive().optional(),
  allowDownload: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

function normalizeAudienceItems(items: ShareAudienceInput[] | undefined): ShareAudienceInput[] {
  if (!items || items.length === 0) return [];
  return items
    .map((item) => {
      if (item.type === 'manual') {
        if (!item.contactEmail) return null;
        return {
          type: 'manual',
          contactEmail: item.contactEmail.toLowerCase(),
          metadata: item.metadata,
        } satisfies ShareAudienceInput;
      }
      if (!item.subjectId) return null;
      return {
        type: item.type,
        subjectId: item.subjectId,
        metadata: item.metadata,
      } satisfies ShareAudienceInput;
    })
    .filter((value): value is ShareAudienceInput => Boolean(value));
}

function normalizeAudienceObject(audience?: z.infer<typeof AudienceObjectSchema>): ShareAudienceInput[] {
  if (!audience) return [];
  const inputs: ShareAudienceInput[] = [];
  if (audience.families) {
    for (const subjectId of audience.families) {
      inputs.push({ type: 'family', subjectId });
    }
  }
  if (audience.groups) {
    for (const subjectId of audience.groups) {
      inputs.push({ type: 'group', subjectId });
    }
  }
  if (audience.emails) {
    for (const contactEmail of audience.emails) {
      inputs.push({ type: 'manual', contactEmail: contactEmail.toLowerCase() });
    }
  }
  return inputs;
}

function toShareScopeConfig(input?: ShareScopeConfig): ShareScopeConfig | undefined {
  if (!input) return undefined;
  return {
    scope: input.scope,
    anchorId: input.anchorId || '',
    includeDescendants: input.includeDescendants,
    filters: input.filters ?? {},
  };
}

// POST /api/share
// Creates a new share token for event|folder|photos
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const raw = await req.json();
    const payload = CreateShareBodySchema.parse(raw);

    const explicitAudiences = normalizeAudienceItems(
      payload.audiences as ShareAudienceInput[] | undefined
    );
    const objectAudiences = normalizeAudienceObject(payload.audience);
    const audiences: ShareAudienceInput[] = [...explicitAudiences, ...objectAudiences];

    let scopeConfig = toShareScopeConfig(payload.scopeConfig);
    const includeDescendants =
      payload.includeDescendants ?? scopeConfig?.includeDescendants ?? false;

    let shareType = payload.shareType;
    if (scopeConfig?.scope) {
      shareType =
        scopeConfig.scope === 'selection'
          ? 'photos'
          : scopeConfig.scope === 'folder'
          ? 'folder'
          : 'event';
    }

    if (!shareType) {
      return NextResponse.json(
        { error: 'shareType o scopeConfig.scope es requerido' },
        { status: 400 }
      );
    }

    if (!scopeConfig) {
      if (shareType === 'folder' && payload.folderId) {
        scopeConfig = {
          scope: 'folder',
          anchorId: payload.folderId,
          includeDescendants,
          filters: {},
        } satisfies ShareScopeConfig;
      } else if (shareType === 'event' && payload.eventId) {
        scopeConfig = {
          scope: 'event',
          anchorId: payload.eventId,
          includeDescendants,
          filters: {},
        } satisfies ShareScopeConfig;
      } else if (shareType === 'photos') {
        scopeConfig = {
          scope: 'selection',
          anchorId: payload.eventId ?? '',
          includeDescendants: false,
          filters: { photoIds: payload.photoIds ?? [] },
        } satisfies ShareScopeConfig;
      }
    } else {
      scopeConfig = {
        ...scopeConfig,
        includeDescendants,
      };
    }

    if (shareType === 'photos' && (!payload.photoIds || payload.photoIds.length === 0)) {
      const filterIds = scopeConfig?.filters?.photoIds as string[] | undefined;
      if (!filterIds || filterIds.length === 0) {
        return NextResponse.json(
          { error: 'photoIds es requerido para compartir una selección' },
          { status: 400 }
        );
      }
    }

    if (shareType !== 'photos' && !payload.eventId && !scopeConfig?.anchorId) {
      return NextResponse.json(
        { error: 'eventId o scopeConfig.anchorId es requerido para este alcance' },
        { status: 400 }
      );
    }

    if (shareType === 'folder' && !payload.folderId && !scopeConfig?.anchorId) {
      return NextResponse.json(
        { error: 'folderId o scopeConfig.anchorId es requerido para compartir una carpeta' },
        { status: 400 }
      );
    }

    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : undefined;

    const result = await shareService.createShare({
      eventId: payload.eventId,
      folderId: payload.folderId ?? null,
      photoIds: payload.photoIds,
      shareType,
      scopeConfig,
      includeDescendants,
      audiences,
      title: payload.title,
      description: payload.description,
      password: payload.password,
      expiresAt,
      maxViews: payload.maxViews,
      allowDownload: payload.allowDownload,
      allowComments: payload.allowComments,
      metadata: payload.metadata ?? {},
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'No se pudo crear el share' },
        { status: 400 }
      );
    }

    const { shareToken, shareUrl, scopeConfig: resolvedScope, audiencesCount } = result.data;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://${req.headers.get('host') || 'localhost:3000'}`;
    const storeUrl = `${baseUrl}/store-unified/${shareToken.token}`;

    return NextResponse.json({
      share: {
        id: shareToken.id,
        token: shareToken.token,
        shareUrl,
        storeUrl,
        expiresAt: shareToken.expires_at,
        allowDownload: shareToken.allow_download,
        allowComments: shareToken.allow_comments,
        scopeConfig: resolvedScope,
        audiencesCount,
      },
      shareToken: {
        id: shareToken.id,
        token: shareToken.token,
        title: payload.title || payload.description || undefined,
        created_at: shareToken.created_at,
      },
      links: {
        store: storeUrl,
        gallery: shareUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload inválido', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: (error as Error)?.message || 'Error interno' },
      { status: 500 }
    );
  }
});

// GET /api/share?eventId=...
// Lists share links for an event from both share_tokens and folders with share_token
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ shares: [] });
    }

    const supabase = await createServerSupabaseServiceClient();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://${req.headers.get('host') || 'localhost:3000'}`;

    const shareResult = await shareService.getEventShares(eventId);
    if (!shareResult.success || !shareResult.data) {
      return NextResponse.json(
        { error: shareResult.error || 'No se pudieron obtener los enlaces' },
        { status: 500 }
      );
    }

    const shares: Array<{
      id: string;
      token: string;
      shareUrl: string;
      storeUrl: string;
      type: string;
      createdAt?: string | null;
      expiresAt?: string | null;
      isActive?: boolean;
      scopeConfig: ShareScopeConfig;
      audiencesCount: number;
    }> = [];

    for (const share of shareResult.data) {
      const scope = {
        scope: (share.scope_config?.scope ?? 'event') as ShareScopeConfig['scope'],
        anchorId: share.scope_config?.anchor_id ?? '',
        includeDescendants: share.scope_config?.include_descendants ?? false,
        filters: share.scope_config?.filters ?? {},
      } satisfies ShareScopeConfig;

      const url = `${baseUrl}/store-unified/${share.token}`;
      shares.push({
        id: share.id,
        token: share.token,
        shareUrl: url,
        storeUrl: url,
        type: share.share_type || 'event',
        createdAt: share.created_at,
        expiresAt: share.expires_at,
        isActive: share.is_active,
        scopeConfig: scope,
        audiencesCount: (share as any).audiences_count ?? 0,
      });
    }

    const { data: folders } = await supabase
      .from('folders')
      .select('id, name, share_token, published_at')
      .eq('event_id', eventId)
      .not('share_token', 'is', null);

    (folders || []).forEach((f: any) => {
      if (!f.share_token) return;
      const url = `${baseUrl}/store-unified/${f.share_token}`;
      shares.push({
        id: f.id,
        token: f.share_token,
        shareUrl: url,
        storeUrl: url,
        type: 'folder',
        createdAt: f.published_at,
        expiresAt: null,
        isActive: true,
        scopeConfig: {
          scope: 'folder',
          anchorId: f.id,
          includeDescendants: false,
          filters: {},
        },
        audiencesCount: 0,
      });
    });

    shares.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ shares });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
});
