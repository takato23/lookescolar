/**
 * Settings type definitions
 * Shared between client and server components
 */

export interface AppSettings {
  // Business Information
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessWebsite: string | null;

  // Watermark Configuration
  watermarkText: string;
  watermarkPosition:
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'top-left'
    | 'center';
  watermarkOpacity: number;
  watermarkSize: 'small' | 'medium' | 'large';

  // Upload Limits
  uploadMaxSizeMb: number;
  uploadMaxConcurrent: number;
  uploadQuality: number;
  uploadMaxResolution: number;

  // Pricing Configuration
  defaultPhotoPriceArs: number;
  bulkDiscountPercentage: number;
  bulkDiscountMinimum: number;
  packPriceArs: number;

  // Notification Preferences
  notifyNewOrders: boolean;
  notifyPayments: boolean;
  notifyWeeklyReport: boolean;
  notifyStorageAlerts: boolean;

  // Localization Settings
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currency: 'ARS' | 'USD' | 'EUR';
  language: 'es' | 'en';

  // System Configuration
  autoCleanupPreviews: boolean;
  cleanupPreviewDays: number;
}

export type SettingsPatch = Partial<AppSettings>;

/**
 * Settings validation schemas
 */
export const SETTINGS_CONSTRAINTS = {
  businessName: { minLength: 1, maxLength: 100 },
  watermarkOpacity: { min: 10, max: 100 },
  uploadMaxSizeMb: { min: 1, max: 50 },
  uploadMaxConcurrent: { min: 1, max: 10 },
  uploadQuality: { min: 50, max: 100 },
  uploadMaxResolution: [1600, 1920, 2048] as const,
  bulkDiscountPercentage: { min: 0, max: 50 },
  bulkDiscountMinimum: { min: 2 },
  cleanupPreviewDays: { min: 1 },
} as const;

/**
 * Settings categories for UI organization
 */
export const SETTINGS_CATEGORIES = {
  business: [
    'businessName',
    'businessEmail',
    'businessPhone',
    'businessAddress',
    'businessWebsite',
  ],
  watermark: [
    'watermarkText',
    'watermarkPosition',
    'watermarkOpacity',
    'watermarkSize',
  ],
  upload: [
    'uploadMaxSizeMb',
    'uploadMaxConcurrent',
    'uploadQuality',
    'uploadMaxResolution',
  ],
  pricing: [
    'defaultPhotoPriceArs',
    'bulkDiscountPercentage',
    'bulkDiscountMinimum',
    'packPriceArs',
  ],
  notifications: [
    'notifyNewOrders',
    'notifyPayments',
    'notifyWeeklyReport',
    'notifyStorageAlerts',
  ],
  localization: ['timezone', 'dateFormat', 'currency', 'language'],
  system: ['autoCleanupPreviews', 'cleanupPreviewDays'],
} as const;

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'LookEscolar',
  businessEmail: null,
  businessPhone: null,
  businessAddress: null,
  businessWebsite: null,
  watermarkText: '© LookEscolar',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 70,
  watermarkSize: 'medium',
  uploadMaxSizeMb: 10,
  uploadMaxConcurrent: 5,
  uploadQuality: 72,
  uploadMaxResolution: 1920,
  defaultPhotoPriceArs: 500,
  bulkDiscountPercentage: 10,
  bulkDiscountMinimum: 5,
  packPriceArs: 2000,
  notifyNewOrders: true,
  notifyPayments: true,
  notifyWeeklyReport: true,
  notifyStorageAlerts: true,
  timezone: 'America/Argentina/Buenos_Aires',
  dateFormat: 'DD/MM/YYYY',
  currency: 'ARS',
  language: 'es',
  autoCleanupPreviews: true,
  cleanupPreviewDays: 90,
} as const;
