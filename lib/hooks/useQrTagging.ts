'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminFeatures } from '@/lib/hooks/useTenantFeatures';

type QrTaggingStatus = {
  enabled: boolean;
  tenantEnabled: boolean;
  eventEnabled: boolean | null;
  loading: boolean;
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

export function useQrTagging(eventId?: string | null): QrTaggingStatus {
  const { data: adminFeatures, isLoading: featuresLoading } =
    useAdminFeatures();
  const [eventEnabled, setEventEnabled] = useState<boolean | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!eventId) {
      setEventEnabled(null);
      return;
    }

    const loadEvent = async () => {
      setEventLoading(true);
      try {
        const response = await fetch(`/api/admin/events/${eventId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch event settings');
        }
        const data = await response.json();
        const metadata = data?.event?.metadata ?? null;
        const enabled = readEventQrEnabled(metadata);
        if (!cancelled) {
          setEventEnabled(enabled);
        }
      } catch (error) {
        if (!cancelled) {
          setEventEnabled(null);
        }
      } finally {
        if (!cancelled) {
          setEventLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const tenantEnabled = adminFeatures?.config?.qr_tagging_enabled ?? true;
  const enabled = tenantEnabled && (eventEnabled ?? true);

  return useMemo(
    () => ({
      enabled,
      tenantEnabled,
      eventEnabled,
      loading: featuresLoading || eventLoading,
    }),
    [enabled, tenantEnabled, eventEnabled, featuresLoading, eventLoading]
  );
}
