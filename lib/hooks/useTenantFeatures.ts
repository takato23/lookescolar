'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeatureFlag, TenantFeatureConfig } from '@/lib/services/tenant-features.service';

// =============================================================================
// PUBLIC FEATURES HOOK (for store/checkout pages)
// =============================================================================

interface PublicFeaturesResponse {
  success: boolean;
  features: Record<string, boolean>;
}

export function usePublicFeatures() {
  return useQuery<PublicFeaturesResponse>({
    queryKey: ['public-features'],
    queryFn: async () => {
      const response = await fetch('/api/features');
      if (!response.ok) throw new Error('Failed to fetch features');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useIsFeatureEnabled(feature: FeatureFlag): boolean {
  const { data } = usePublicFeatures();
  return data?.features?.[feature] ?? getDefaultValue(feature);
}

function getDefaultValue(feature: FeatureFlag): boolean {
  const defaults: Record<FeatureFlag, boolean> = {
    coupons_enabled: true,
    digital_downloads_enabled: false,
    email_notifications_enabled: true,
    invoice_generation_enabled: true,
    receipt_generation_enabled: true,
    store_preview_enabled: true,
    whatsapp_checkout_enabled: false,
    mercadopago_enabled: true,
    cash_payment_enabled: false,
    watermark_enabled: true,
    qr_tagging_enabled: true,
    bulk_download_enabled: false,
    analytics_enabled: false,
    custom_branding_enabled: false,
    multi_currency_enabled: false,
  };
  return defaults[feature] ?? false;
}

// =============================================================================
// ADMIN FEATURES HOOK (for settings pages)
// =============================================================================

interface AdminFeaturesResponse {
  success: boolean;
  config: TenantFeatureConfig;
  definitions: Array<{
    key: FeatureFlag;
    label: string;
    description: string;
    category: string;
  }>;
}

export function useAdminFeatures() {
  return useQuery<AdminFeaturesResponse>({
    queryKey: ['admin-features'],
    queryFn: async () => {
      const response = await fetch('/api/admin/features');
      if (!response.ok) throw new Error('Failed to fetch features');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds for admin
    gcTime: 5 * 60 * 1000,
  });
}

export function useToggleFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feature,
      enabled,
    }: {
      feature: FeatureFlag;
      enabled: boolean;
    }) => {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle feature');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin and public features
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      queryClient.invalidateQueries({ queryKey: ['public-features'] });
    },
  });
}

export function useUpdateFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<TenantFeatureConfig>) => {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update features');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      queryClient.invalidateQueries({ queryKey: ['public-features'] });
    },
  });
}
