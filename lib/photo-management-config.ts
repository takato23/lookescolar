/**
 * Photo Management Unification Configuration
 *
 * This file manages the transition between the legacy photo management system
 * (/admin/photos) and the new Event Photo Library (/admin/events/[id]/library)
 */

export interface PhotoManagementConfig {
  // Feature flags for gradual rollout
  enableEventLibrary: boolean;
  enableCrossLinking: boolean;
  showUnificationNotices: boolean;

  // Migration settings
  preferNewLibraryForEvents: boolean;
  allowLegacyFallback: boolean;

  // User experience settings
  defaultNotificationDismissalTime: number; // in days
  showFeatureComparisons: boolean;
}

export interface SystemComparison {
  feature: string;
  legacy: string;
  advanced: string;
  advantage: 'legacy' | 'advanced' | 'equal';
}

// Current configuration - adjust based on rollout phase
export const photoManagementConfig: PhotoManagementConfig = {
  enableEventLibrary: true,
  enableCrossLinking: true,
  showUnificationNotices: true,
  preferNewLibraryForEvents: true,
  allowLegacyFallback: true,
  defaultNotificationDismissalTime: 7,
  showFeatureComparisons: true,
};

// Feature comparison matrix to help users choose
export const systemComparison: SystemComparison[] = [
  {
    feature: 'Organización',
    legacy: 'Por eventos y códigos QR',
    advanced: 'Carpetas jerárquicas personalizables',
    advantage: 'advanced',
  },
  {
    feature: 'Interfaz',
    legacy: 'Vista tradicional con filtros',
    advanced: 'Moderna con drag & drop',
    advantage: 'advanced',
  },
  {
    feature: 'Selección múltiple',
    legacy: 'Básica',
    advanced: 'Avanzada con atajos de teclado',
    advantage: 'advanced',
  },
  {
    feature: 'Rendimiento',
    legacy: 'Estándar',
    advanced: 'Optimizado con virtualización',
    advantage: 'advanced',
  },
  {
    feature: 'Filtros',
    legacy: 'Completos y detallados',
    advanced: 'Básicos por carpeta',
    advantage: 'legacy',
  },
  {
    feature: 'Búsqueda',
    legacy: 'Avanzada con múltiples criterios',
    advanced: 'Por nombre y metadatos',
    advantage: 'legacy',
  },
  {
    feature: 'Compatibilidad',
    legacy: 'Todas las funciones existentes',
    advanced: 'Funciones principales',
    advantage: 'legacy',
  },
  {
    feature: 'Usabilidad móvil',
    legacy: 'Adaptativa',
    advanced: 'Optimizada para touch',
    advantage: 'advanced',
  },
];

// Utility functions for managing user preferences
export class PhotoManagementPreferences {
  private static STORAGE_KEY = 'photo-management-preferences';

  static getPreferences() {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load photo management preferences:', error);
      return {};
    }
  }

  static setPreference(key: string, value: any) {
    if (typeof window === 'undefined') return;

    try {
      const preferences = this.getPreferences() || {};
      preferences[key] = value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save photo management preference:', error);
    }
  }

  static shouldShowNotification(
    type: 'legacy-to-advanced' | 'advanced-to-legacy'
  ): boolean {
    const preferences = this.getPreferences();
    if (!preferences) return true;

    const dismissedKey = `${type}-notification-dismissed`;
    const dismissedAt = preferences[dismissedKey];

    if (!dismissedAt) return true;

    const daysSinceDismissal =
      (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return (
      daysSinceDismissal >=
      photoManagementConfig.defaultNotificationDismissalTime
    );
  }

  static dismissNotification(
    type: 'legacy-to-advanced' | 'advanced-to-legacy'
  ) {
    const dismissedKey = `${type}-notification-dismissed`;
    this.setPreference(dismissedKey, Date.now());
  }

  static getPreferredSystem(): 'legacy' | 'advanced' | null {
    const preferences = this.getPreferences();
    return preferences?.preferredSystem || null;
  }

  static setPreferredSystem(system: 'legacy' | 'advanced') {
    this.setPreference('preferredSystem', system);
  }
}

// Helper function to determine which system to use for an event
export function getRecommendedSystemForEvent(
  eventId: string
): 'legacy' | 'advanced' {
  // For now, recommend advanced for all events
  // This can be enhanced with event-specific logic
  return photoManagementConfig.preferNewLibraryForEvents
    ? 'advanced'
    : 'legacy';
}

// Migration status tracking
export interface MigrationStatus {
  phase:
    | 'planning'
    | 'soft-launch'
    | 'gradual-rollout'
    | 'full-migration'
    | 'legacy-deprecation';
  startDate: string;
  targetCompletionDate?: string;
  currentProgress: number; // 0-100
  blockers: string[];
  nextSteps: string[];
}

export const currentMigrationStatus: MigrationStatus = {
  phase: 'soft-launch',
  startDate: '2025-08-23',
  targetCompletionDate: '2025-09-30',
  currentProgress: 25,
  blockers: [
    'Feature parity for advanced search and filtering',
    'User training and documentation',
    'Performance testing with large photo sets',
  ],
  nextSteps: [
    'Gather user feedback from soft launch',
    'Implement missing filter features in advanced library',
    'Create migration utilities for existing photo organization',
    'Develop user training materials',
  ],
};

export default photoManagementConfig;
