import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { tenantFeaturesService } from '@/lib/services/tenant-features.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export type QrFeatureStatus = {
  enabled: boolean;
  tenantEnabled: boolean;
  eventEnabled: boolean | null;
};

function readEventQrEnabled(metadata: unknown): boolean | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const meta = metadata as Record<string, unknown>;
  const settings =
    (meta.settings as Record<string, unknown> | undefined) ?? {};

  const candidates = [
    settings.qrTaggingEnabled,
    settings.qr_tagging_enabled,
    meta.qrTaggingEnabled,
    meta.qr_tagging_enabled,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate;
  }

  return null;
}

export async function getQrTaggingStatus({
  supabase,
  tenantId,
  eventId,
}: {
  supabase?: SupabaseClient<Database>;
  tenantId?: string | null;
  eventId?: string | null;
}): Promise<QrFeatureStatus> {
  const client = supabase ?? (await createServerSupabaseServiceClient());

  let resolvedTenantId = tenantId ?? null;
  let eventEnabled: boolean | null = null;

  if (eventId) {
    const { data: event } = await client
      .from('events')
      .select('tenant_id, metadata')
      .eq('id', eventId)
      .maybeSingle();

    if (event?.metadata) {
      eventEnabled = readEventQrEnabled(event.metadata);
    }

    if (!resolvedTenantId && event?.tenant_id) {
      resolvedTenantId = event.tenant_id;
    }
  }

  const tenantEnabled = resolvedTenantId
    ? await tenantFeaturesService.isFeatureEnabled(
        client,
        resolvedTenantId,
        'qr_tagging_enabled'
      )
    : true;

  const enabled = tenantEnabled && (eventEnabled ?? true);

  return { enabled, tenantEnabled, eventEnabled };
}
