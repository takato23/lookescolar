/**
 * Sistema de Feature Flags para migración gradual
 * Permite activar/desactivar funcionalidades durante la transición
 */

export interface FeatureFlags {
  // Migración de galería
  UNIFIED_GALLERY_ENABLED: boolean;
  FAMILY_IN_GALLERY_ROUTE: boolean;
  TOKEN_AUTO_DETECTION: boolean;
  HYBRID_RENDERING: boolean;

  // Componentes unificados
  UNIFIED_PHOTO_CARD: boolean;
  UNIFIED_PHOTO_MODAL: boolean;
  UNIFIED_CART_SYSTEM: boolean;

  // Funcionalidades avanzadas
  VIRTUAL_SCROLLING: boolean;
  ADVANCED_FILTERS: boolean;
  FAMILY_FEATURES_IN_PUBLIC: boolean;

  // Debugging y rollback
  DEBUG_MIGRATION: boolean;
  LEGACY_FALLBACK_ENABLED: boolean;
  PERFORMANCE_MONITORING: boolean;
}

// Configuración por ambiente
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const isDev = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDev) {
    return {
      DEBUG_MIGRATION: true,
      PERFORMANCE_MONITORING: true,
      LEGACY_FALLBACK_ENABLED: true,
    };
  }

  if (isProduction) {
    return {
      DEBUG_MIGRATION: false,
      PERFORMANCE_MONITORING: true,
      LEGACY_FALLBACK_ENABLED: true,
    };
  }

  return {};
};

// Feature flags por defecto (CONSERVADORAS)
const DEFAULT_FLAGS: FeatureFlags = {
  // Inicialmente TODO DESACTIVADO para mantener sistemas actuales
  UNIFIED_GALLERY_ENABLED: false,
  FAMILY_IN_GALLERY_ROUTE: false,
  TOKEN_AUTO_DETECTION: false,
  HYBRID_RENDERING: false,

  UNIFIED_PHOTO_CARD: false,
  UNIFIED_PHOTO_MODAL: false,
  UNIFIED_CART_SYSTEM: false,

  VIRTUAL_SCROLLING: false,
  ADVANCED_FILTERS: false,
  FAMILY_FEATURES_IN_PUBLIC: false,

  DEBUG_MIGRATION: false,
  LEGACY_FALLBACK_ENABLED: true,
  PERFORMANCE_MONITORING: false,

  // Aplicar overrides de ambiente
  ...getEnvironmentFlags(),
};

// Override desde variables de entorno (para deploy gradual)
const getEnvOverrides = (): Partial<FeatureFlags> => {
  const overrides: Partial<FeatureFlags> = {};

  // Permitir override individual de flags via ENV
  Object.keys(DEFAULT_FLAGS).forEach((key) => {
    const envValue = process.env[`FF_${key}`];
    if (envValue !== undefined) {
      overrides[key as keyof FeatureFlags] = envValue === 'true';
    }
  });

  return overrides;
};

// Feature flags finales
export const FEATURE_FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ...getEnvOverrides(),
};

// Utilidades de feature flags
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return FEATURE_FLAGS[flag];
};

export const getFeatureFlag = <T extends keyof FeatureFlags>(
  flag: T
): FeatureFlags[T] => {
  return FEATURE_FLAGS[flag];
};

// Hook para componentes React
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return isFeatureEnabled(flag);
};

// Función para debugging en desarrollo
export const logFeatureFlags = () => {
  if (FEATURE_FLAGS.DEBUG_MIGRATION) {
    console.group('🚩 Feature Flags Status');
    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅' : '❌'}`);
    });
    console.groupEnd();
  }
};

// Función para monitoreo de rendimiento
export const trackFeatureUsage = (flag: keyof FeatureFlags, action: string) => {
  if (FEATURE_FLAGS.PERFORMANCE_MONITORING) {
    // Enviar métricas a servicio de monitoreo
    console.log(`[Feature Flag] ${flag} -> ${action}`);
  }
};
