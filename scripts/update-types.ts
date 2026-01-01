#!/usr/bin/env tsx

/**
 * Script to update database types and add custom type definitions
 * Usage: npm run db:types:update
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const TYPES_PATH = join(process.cwd(), 'types', 'database.ts');
const CUSTOM_TYPES_PATH = join(process.cwd(), 'types', 'custom.ts');

async function updateDatabaseTypes() {
  console.log('🔄 Actualizando tipos de base de datos...');

  try {
    // Generate base types from Supabase
    execSync('supabase gen types typescript --local > types/database.ts', {
      stdio: 'inherit',
    });

    console.log('✅ Tipos base generados correctamente');

    // Read the generated types
    const generatedTypes = readFileSync(TYPES_PATH, 'utf-8');

    // Add our custom extensions
    const customExtensions = `
// Custom type extensions for the application

// Helper types for better developer experience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Row<T extends keyof Database['public']['Tables']> = Tables<T>['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Tables<T>['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Tables<T>['Update']

// Specific table types for common usage
export type Event = Row<'events'>
export type Subject = Row<'subjects'>
export type Photo = Row<'photos'>
export type Order = Row<'orders'>
export type OrderItem = Row<'order_items'>
export type Payment = Row<'payments'>
export type PhotoSubject = Row<'photo_subjects'>
export type SubjectToken = Row<'subject_tokens'>
export type PriceList = Row<'price_lists'>
export type PriceListItem = Row<'price_list_items'>
export type EgressMetric = Row<'egress_metrics'>
export type EmailTemplate = Row<'email_templates'>
export type EmailQueue = Row<'email_queue'>

// Enum types for better usage
export type SubjectType = Database['public']['Enums']['subject_type']
export type OrderStatus = Database['public']['Enums']['order_status']

// Insert types for forms
export type EventInsert = Insert<'events'>
export type SubjectInsert = Insert<'subjects'>
export type PhotoInsert = Insert<'photos'>
export type OrderInsert = Insert<'orders'>
export type OrderItemInsert = Insert<'order_items'>
export type PaymentInsert = Insert<'payments'>

// Update types for patches
export type EventUpdate = Update<'events'>
export type SubjectUpdate = Update<'subjects'>
export type PhotoUpdate = Update<'photos'>
export type OrderUpdate = Update<'orders'>
export type PaymentUpdate = Update<'payments'>

// Function return types
export type QrDataResult = {
  subject_id: string;
  token: string;
  qr_data: string;
  display_name: string;
}

export type OrderSummary = {
  order_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  order_status: OrderStatus;
  total_items: number;
  total_amount_cents: number;
  mp_payment_id: string | null;
  mp_status: string | null;
  created_at: string;
  delivered_at: string | null;
  subject_name: string;
  event_name: string;
}

export type EventDashboard = {
  event_name: string;
  total_subjects: number;
  total_photos: number;
  approved_photos: number;
  tagged_photos: number;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  delivered_orders: number;
  total_revenue_cents: number;
}

export type StorageStats = {
  event_id: string;
  event_name: string;
  total_photos: number;
  approved_photos: number;
  total_egress_bytes: number;
  total_requests: number;
  last_activity: string | null;
}

export type SubjectWithToken = Subject & {
  token?: string;
  token_expires_at?: string;
}

export type PhotoWithSubjects = Photo & {
  subjects?: Subject[];
}

export type OrderWithItems = Order & {
  order_items: (OrderItem & {
    photo?: Photo;
    price_list_item?: PriceListItem;
  })[];
  subject?: Subject;
}

// API response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type PaginatedResponse<T = any> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Webhook types
export type MercadoPagoWebhookData = {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export type MercadoPagoPaymentStatus = 
  | 'pending'
  | 'approved' 
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

// Form types for UI components
export type EventFormData = {
  name: string;
  school: string;
  date: string;
  active?: boolean;
}

export type SubjectFormData = {
  type: SubjectType;
  first_name: string;
  last_name?: string;
  couple_first_name?: string;
  couple_last_name?: string;
  family_name?: string;
}

export type OrderFormData = {
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  photo_selections: {
    photo_id: string;
    price_list_item_id: string;
    quantity: number;
  }[];
}

// Storage related types
export type SignedUrlRequest = {
  path: string;
  expires_in?: number;
}

export type PhotoUploadMetadata = {
  event_id: string;
  original_name: string;
  width?: number;
  height?: number;
}

// Security types
export type TokenValidationResult = {
  valid: boolean;
  subject_id?: string;
  expires_at?: string;
  error?: string;
}

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset: number;
  blocked: boolean;
}
`;

    // Append custom extensions to generated types
    const enhancedTypes = generatedTypes + customExtensions;

    // Write enhanced types
    writeFileSync(TYPES_PATH, enhancedTypes);

    console.log('✅ Tipos personalizados agregados correctamente');
  } catch (error) {
    console.error('❌ Error actualizando tipos:', error);
    process.exit(1);
  }
}

async function createCustomTypes() {
  console.log('🔄 Creando tipos personalizados adicionales...');

  const customTypes = `// Custom types that don't belong in the database schema

// Component prop types
export interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoSelect: (photo: Photo) => void;
  selectedPhotos: string[];
  loading?: boolean;
}

export interface QRCodeDisplayProps {
  token: string;
  displayName: string;
  size?: number;
  includeText?: boolean;
}

export interface OrderSummaryProps {
  order: OrderWithItems;
  showActions?: boolean;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
}

// Hook return types
export interface UsePhotosReturn {
  photos: Photo[];
  loading: boolean;
  error: string | null;
  uploadPhoto: (file: File, metadata: PhotoUploadMetadata) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  approvePhoto: (photoId: string, approved: boolean) => Promise<void>;
}

export interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (orderData: OrderFormData, subjectId: string) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  markAsDelivered: (orderId: string) => Promise<void>;
}

// Configuration types
export interface AppConfig {
  mercadoPago: {
    publicKey: string;
    sandboxMode: boolean;
  };
  storage: {
    bucket: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
  security: {
    tokenExpiryDays: number;
    maxRequestsPerMinute: number;
    requireHttps: boolean;
  };
  features: {
    enableEmailNotifications: boolean;
    enableAdvancedMetrics: boolean;
    enableBulkOperations: boolean;
  };
}

// Error types
export class PhotoUploadError extends Error {
  constructor(
    message: string,
    public code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'PROCESSING_FAILED'
  ) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

export class TokenError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'TOKEN_NOT_FOUND'
  ) {
    super(message);
    this.name = 'TokenError';
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: 'PAYMENT_FAILED' | 'INVALID_PREFERENCE' | 'WEBHOOK_ERROR'
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// State management types (for Zustand stores)
export interface AdminStore {
  currentEvent: Event | null;
  selectedPhotos: string[];
  uploadProgress: Record<string, number>;
  setCurrentEvent: (event: Event | null) => void;
  addSelectedPhoto: (photoId: string) => void;
  removeSelectedPhoto: (photoId: string) => void;
  clearSelectedPhotos: () => void;
  setUploadProgress: (photoId: string, progress: number) => void;
}

export interface FamilyStore {
  photos: Photo[];
  cart: { photoId: string; priceItemId: string; quantity: number }[];
  contactInfo: { name: string; email: string; phone: string } | null;
  addToCart: (photoId: string, priceItemId: string, quantity: number) => void;
  removeFromCart: (photoId: string) => void;
  updateQuantity: (photoId: string, quantity: number) => void;
  clearCart: () => void;
  setContactInfo: (info: { name: string; email: string; phone: string }) => void;
}
`;

  writeFileSync(CUSTOM_TYPES_PATH, customTypes);
  console.log('✅ Tipos personalizados creados correctamente');
}

async function main() {
  console.log('🚀 Iniciando actualización de tipos...\n');

  await updateDatabaseTypes();
  await createCustomTypes();

  console.log('\n✨ Actualización de tipos completada');
  console.log('📁 Archivos actualizados:');
  console.log('  - types/database.ts');
  console.log('  - types/custom.ts');
  console.log(
    '\n💡 Tip: Ejecuta "npm run typecheck" para verificar que todo esté correcto'
  );
}

// Invoke main directly as we are in ESM
main().catch(console.error);
