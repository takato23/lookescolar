'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Re-define types and defaults here to avoid importing server-only code
export interface TenantBranding {
  appName: string;
  appSubtitle: string;
  tagline: string;
  logoUrl?: string;
  logoVariant: 'apertura' | 'camera' | 'minimal' | 'custom';
  primaryColor: string;
  accentColor: string;
  footerText?: string;
  supportEmail?: string;
  supportPhone?: string;
  showPoweredBy: boolean;
}

export const DEFAULT_BRANDING: TenantBranding = {
  appName: 'Apertura',
  appSubtitle: 'Panel Admin',
  tagline: 'Distribución de Fotografía Profesional',
  logoVariant: 'apertura',
  primaryColor: '#8B5CF6',
  accentColor: '#10B981',
  showPoweredBy: false,
};

const BRANDING_QUERY_KEY = ['tenant-branding'];
const BRANDING_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const BRANDING_GC_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch branding from API
 */
async function fetchBranding(): Promise<TenantBranding> {
  try {
    const response = await fetch('/api/admin/branding', {
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[useTenantBranding] API error, using defaults');
      return DEFAULT_BRANDING;
    }

    const data = await response.json();
    return data.branding || DEFAULT_BRANDING;
  } catch (error) {
    console.error('[useTenantBranding] Fetch error:', error);
    return DEFAULT_BRANDING;
  }
}

/**
 * Update branding via API
 */
async function updateBrandingApi(
  branding: Partial<TenantBranding>
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/admin/branding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(branding),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.error || 'Error updating branding' };
  }

  return { success: true };
}

/**
 * Hook to access and manage tenant branding
 *
 * @example
 * ```tsx
 * const { branding, isLoading, updateBranding } = useTenantBranding();
 *
 * return (
 *   <h1>{branding.appName}</h1>
 * );
 * ```
 */
export function useTenantBranding() {
  const queryClient = useQueryClient();

  const {
    data: branding = DEFAULT_BRANDING,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TenantBranding>({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBranding,
    staleTime: BRANDING_STALE_TIME,
    gcTime: BRANDING_GC_TIME,
    retry: 2,
    retryDelay: 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updateBrandingApi,
    onSuccess: () => {
      // Invalidate and refetch branding
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
    },
  });

  return {
    branding,
    isLoading,
    isError,
    error,
    refetch,
    updateBranding: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}

/**
 * Hook to get only the branding data (read-only, optimized)
 */
export function useBrandingData() {
  const { data: branding = DEFAULT_BRANDING, isLoading } = useQuery<TenantBranding>({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBranding,
    staleTime: BRANDING_STALE_TIME,
    gcTime: BRANDING_GC_TIME,
  });

  return { branding, isLoading };
}
