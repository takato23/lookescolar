// Feature Flags para migración de galería
// Permite activar/desactivar funcionalidades gradualmente sin deployments

export interface FeatureFlags {
  // Migración principal
  UNIFIED_GALLERY_ENABLED: boolean;
  FAMILY_IN_GALLERY_ROUTE: boolean;
  TOKEN_AUTO_DETECTION: boolean;

  // Event Photo Library
  EVENT_PHOTO_LIBRARY_ENABLED: boolean;
  EVENT_PHOTO_LIBRARY_VIRTUALIZATION: boolean;
  EVENT_PHOTO_LIBRARY_DRAG_DROP: boolean;

  // Fallbacks de seguridad
  LEGACY_FALLBACK_ENABLED: boolean;
  DEBUG_MIGRATION: boolean;

  // Componentes específicos
  UNIFIED_CART_STORE: boolean;
  PERSISTENT_FAVORITES: boolean;
  ENHANCED_PHOTO_CARDS: boolean;
}

// Configuración por defecto (activando admin photo library para desarrollo)
const DEFAULT_FLAGS: FeatureFlags = {
  UNIFIED_GALLERY_ENABLED: true,
  FAMILY_IN_GALLERY_ROUTE: true,
  TOKEN_AUTO_DETECTION: false,
  EVENT_PHOTO_LIBRARY_ENABLED: true, // ✅ Activado para desarrollo
  EVENT_PHOTO_LIBRARY_VIRTUALIZATION: true, // ✅ Activado para performance
  EVENT_PHOTO_LIBRARY_DRAG_DROP: true, // ✅ Activado para UX
  LEGACY_FALLBACK_ENABLED: true,
  DEBUG_MIGRATION: true, // ✅ Activado para debugging
  UNIFIED_CART_STORE: false,
  PERSISTENT_FAVORITES: false,
  ENHANCED_PHOTO_CARDS: false,
};

// Feature flags desde environment variables con fallback a DEFAULT_FLAGS
const flags: FeatureFlags = {
  UNIFIED_GALLERY_ENABLED:
    process.env.FF_UNIFIED_GALLERY_ENABLED === 'true' ||
    DEFAULT_FLAGS.UNIFIED_GALLERY_ENABLED,
  FAMILY_IN_GALLERY_ROUTE:
    process.env.FF_FAMILY_IN_GALLERY_ROUTE === 'true' ||
    DEFAULT_FLAGS.FAMILY_IN_GALLERY_ROUTE,
  TOKEN_AUTO_DETECTION:
    process.env.FF_TOKEN_AUTO_DETECTION === 'true' ||
    DEFAULT_FLAGS.TOKEN_AUTO_DETECTION,
  EVENT_PHOTO_LIBRARY_ENABLED:
    process.env.FF_EVENT_PHOTO_LIBRARY_ENABLED === 'true' ||
    DEFAULT_FLAGS.EVENT_PHOTO_LIBRARY_ENABLED,
  EVENT_PHOTO_LIBRARY_VIRTUALIZATION:
    process.env.FF_EVENT_PHOTO_LIBRARY_VIRTUALIZATION === 'true' ||
    DEFAULT_FLAGS.EVENT_PHOTO_LIBRARY_VIRTUALIZATION,
  EVENT_PHOTO_LIBRARY_DRAG_DROP:
    process.env.FF_EVENT_PHOTO_LIBRARY_DRAG_DROP === 'true' ||
    DEFAULT_FLAGS.EVENT_PHOTO_LIBRARY_DRAG_DROP,
  LEGACY_FALLBACK_ENABLED: process.env.FF_LEGACY_FALLBACK_ENABLED !== 'false', // Default true
  DEBUG_MIGRATION:
    process.env.FF_DEBUG_MIGRATION === 'true' || DEFAULT_FLAGS.DEBUG_MIGRATION,
  UNIFIED_CART_STORE:
    process.env.FF_UNIFIED_CART_STORE === 'true' ||
    DEFAULT_FLAGS.UNIFIED_CART_STORE,
  PERSISTENT_FAVORITES:
    process.env.FF_PERSISTENT_FAVORITES === 'true' ||
    DEFAULT_FLAGS.PERSISTENT_FAVORITES,
  ENHANCED_PHOTO_CARDS:
    process.env.FF_ENHANCED_PHOTO_CARDS === 'true' ||
    DEFAULT_FLAGS.ENHANCED_PHOTO_CARDS,
};

// Export feature flags with isEnabled method
export const featureFlags = {
  ...flags,
  isEnabled: (flag: keyof FeatureFlags): boolean => {
    return flags[flag];
  },
};

// Hook para usar feature flags en componentes
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

// Helper para logging de debug
export function debugMigration(message: string, data?: any) {
  if (flags.DEBUG_MIGRATION) {
    console.log(`🔧 [Migration Debug] ${message}`, data || '');
  }
}

// Validación de que los flags están bien configurados
export function validateFeatureFlags(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Si unified gallery está activado, otros componentes necesarios también
  if (flags.UNIFIED_GALLERY_ENABLED) {
    if (!featureFlags.LEGACY_FALLBACK_ENABLED) {
      errors.push(
        'LEGACY_FALLBACK_ENABLED debe estar activado durante migración'
      );
    }
  }

  // Family route necesita token detection
  if (
    featureFlags.FAMILY_IN_GALLERY_ROUTE &&
    !featureFlags.TOKEN_AUTO_DETECTION
  ) {
    errors.push('FAMILY_IN_GALLERY_ROUTE requiere TOKEN_AUTO_DETECTION');
  }

  // Event Photo Library dependencies
  if (
    featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION &&
    !featureFlags.EVENT_PHOTO_LIBRARY_ENABLED
  ) {
    errors.push(
      'EVENT_PHOTO_LIBRARY_VIRTUALIZATION requiere EVENT_PHOTO_LIBRARY_ENABLED'
    );
  }

  if (
    featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP &&
    !featureFlags.EVENT_PHOTO_LIBRARY_ENABLED
  ) {
    errors.push(
      'EVENT_PHOTO_LIBRARY_DRAG_DROP requiere EVENT_PHOTO_LIBRARY_ENABLED'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
