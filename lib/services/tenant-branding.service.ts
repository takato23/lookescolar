/**
 * Tenant Branding Service
 *
 * Manages tenant-specific branding configuration for the white-label platform "Apertura"
 * Each tenant can customize: app name, logo, colors, tagline, etc.
 */

import { createClient } from '@/lib/supabase/server';

export interface TenantBranding {
  // Basic branding
  appName: string;
  appSubtitle: string;
  tagline: string;

  // Logo configuration
  logoUrl?: string; // Custom logo URL (optional)
  logoVariant: 'apertura' | 'camera' | 'minimal' | 'custom';

  // Color scheme
  primaryColor: string;
  accentColor: string;

  // Additional customization
  footerText?: string;
  supportEmail?: string;
  supportPhone?: string;

  // Feature flags
  showPoweredBy: boolean; // Show "Powered by Apertura"
}

// Default branding for the platform (Apertura - white label base)
export const DEFAULT_BRANDING: TenantBranding = {
  appName: 'Apertura',
  appSubtitle: 'Panel Admin',
  tagline: 'Distribución de Fotografía Profesional',
  logoVariant: 'apertura',
  primaryColor: '#8B5CF6', // Violet
  accentColor: '#10B981', // Emerald
  showPoweredBy: false,
};

/**
 * Extract branding configuration from tenant metadata
 */
export function extractBrandingFromMetadata(metadata: Record<string, unknown> | null): TenantBranding {
  if (!metadata || !metadata.branding) {
    return DEFAULT_BRANDING;
  }

  const branding = metadata.branding as Partial<TenantBranding>;

  return {
    appName: branding.appName || DEFAULT_BRANDING.appName,
    appSubtitle: branding.appSubtitle || DEFAULT_BRANDING.appSubtitle,
    tagline: branding.tagline || DEFAULT_BRANDING.tagline,
    logoUrl: branding.logoUrl,
    logoVariant: branding.logoVariant || DEFAULT_BRANDING.logoVariant,
    primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
    accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
    footerText: branding.footerText,
    supportEmail: branding.supportEmail,
    supportPhone: branding.supportPhone,
    showPoweredBy: branding.showPoweredBy ?? DEFAULT_BRANDING.showPoweredBy,
  };
}

/**
 * Get tenant branding from database (server-side)
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.warn(`[TenantBranding] Could not fetch tenant ${tenantId}, using defaults`);
      return DEFAULT_BRANDING;
    }

    return extractBrandingFromMetadata(data.metadata as Record<string, unknown>);
  } catch (error) {
    console.error('[TenantBranding] Error fetching branding:', error);
    return DEFAULT_BRANDING;
  }
}

/**
 * Update tenant branding in database (server-side)
 */
export async function updateTenantBranding(
  tenantId: string,
  branding: Partial<TenantBranding>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // First get current metadata
    const { data: currentData, error: fetchError } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Tenant not found' };
    }

    const currentMetadata = (currentData?.metadata as Record<string, unknown>) || {};
    const currentBranding = (currentMetadata.branding as Partial<TenantBranding>) || {};

    // Merge branding
    const updatedMetadata = {
      ...currentMetadata,
      branding: {
        ...currentBranding,
        ...branding,
      },
    };

    // Update in database
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[TenantBranding] Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[TenantBranding] Error updating branding:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Validate branding configuration
 */
export function validateBranding(branding: Partial<TenantBranding>): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (branding.appName && branding.appName.length > 50) {
    errors.push('El nombre de la app no puede exceder 50 caracteres');
  }

  if (branding.appName && branding.appName.length < 2) {
    errors.push('El nombre de la app debe tener al menos 2 caracteres');
  }

  if (branding.tagline && branding.tagline.length > 100) {
    errors.push('El tagline no puede exceder 100 caracteres');
  }

  if (branding.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(branding.primaryColor)) {
    errors.push('El color primario debe ser un código hexadecimal válido (ej: #8B5CF6)');
  }

  if (branding.accentColor && !/^#[0-9A-Fa-f]{6}$/.test(branding.accentColor)) {
    errors.push('El color de acento debe ser un código hexadecimal válido');
  }

  if (branding.logoUrl && !isValidUrl(branding.logoUrl)) {
    errors.push('La URL del logo no es válida');
  }

  if (branding.supportEmail && !isValidEmail(branding.supportEmail)) {
    errors.push('El email de soporte no es válido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
