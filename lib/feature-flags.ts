// Feature Flags para migración de galería
// Permite activar/desactivar funcionalidades gradualmente sin deployments

export interface FeatureFlags {
  // Migración principal
  UNIFIED_GALLERY_ENABLED: boolean;
  FAMILY_IN_GALLERY_ROUTE: boolean;
  TOKEN_AUTO_DETECTION: boolean;
  
  // Fallbacks de seguridad
  LEGACY_FALLBACK_ENABLED: boolean;
  DEBUG_MIGRATION: boolean;
  
  // Componentes específicos
  UNIFIED_CART_STORE: boolean;
  PERSISTENT_FAVORITES: boolean;
  ENHANCED_PHOTO_CARDS: boolean;
}

// Configuración por defecto (todo desactivado para seguridad)
const DEFAULT_FLAGS: FeatureFlags = {
  UNIFIED_GALLERY_ENABLED: false,
  FAMILY_IN_GALLERY_ROUTE: false,
  TOKEN_AUTO_DETECTION: false,
  LEGACY_FALLBACK_ENABLED: true,
  DEBUG_MIGRATION: false,
  UNIFIED_CART_STORE: false,
  PERSISTENT_FAVORITES: false,
  ENHANCED_PHOTO_CARDS: false,
};

// Feature flags desde environment variables
export const featureFlags: FeatureFlags = {
  UNIFIED_GALLERY_ENABLED: process.env.FF_UNIFIED_GALLERY_ENABLED === 'true',
  FAMILY_IN_GALLERY_ROUTE: process.env.FF_FAMILY_IN_GALLERY_ROUTE === 'true',
  TOKEN_AUTO_DETECTION: process.env.FF_TOKEN_AUTO_DETECTION === 'true',
  LEGACY_FALLBACK_ENABLED: process.env.FF_LEGACY_FALLBACK_ENABLED !== 'false', // Default true
  DEBUG_MIGRATION: process.env.FF_DEBUG_MIGRATION === 'true',
  UNIFIED_CART_STORE: process.env.FF_UNIFIED_CART_STORE === 'true',
  PERSISTENT_FAVORITES: process.env.FF_PERSISTENT_FAVORITES === 'true',
  ENHANCED_PHOTO_CARDS: process.env.FF_ENHANCED_PHOTO_CARDS === 'true',
};

// Hook para usar feature flags en componentes
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

// Helper para logging de debug
export function debugMigration(message: string, data?: any) {
  if (featureFlags.DEBUG_MIGRATION) {
    console.log(`🔧 [Migration Debug] ${message}`, data || '');
  }
}

// Validación de que los flags están bien configurados
export function validateFeatureFlags(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Si unified gallery está activado, otros componentes necesarios también
  if (featureFlags.UNIFIED_GALLERY_ENABLED) {
    if (!featureFlags.LEGACY_FALLBACK_ENABLED) {
      errors.push('LEGACY_FALLBACK_ENABLED debe estar activado durante migración');
    }
  }
  
  // Family route necesita token detection
  if (featureFlags.FAMILY_IN_GALLERY_ROUTE && !featureFlags.TOKEN_AUTO_DETECTION) {
    errors.push('FAMILY_IN_GALLERY_ROUTE requiere TOKEN_AUTO_DETECTION');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}