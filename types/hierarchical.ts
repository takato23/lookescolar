/**
 * HIERARCHICAL SYSTEM TYPES
 * 
 * TypeScript types for the hierarchical token system
 * Covers: Events, Courses, Folders, Assets, Tokens, and API responses
 */

// ============================================================
// CORE DOMAIN TYPES
// ============================================================

export interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  firstName: string;
  lastName: string;
  familyName?: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  eventId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  memberCount?: number;
  folderCount?: number;
}

export interface CourseMember {
  courseId: string;
  subjectId: string;
  createdAt: Date;
  // Related data
  subject?: Subject;
  course?: Course;
}

// ============================================================
// FOLDER & ASSET TYPES
// ============================================================

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  eventId: string;
  depth: number;
  sortOrder: number;
  photoCount: number;
  isPublished: boolean;
  createdAt: Date;
  // Navigation helpers
  hasChildren?: boolean;
  children?: Folder[];
  parent?: Folder;
}

export interface Asset {
  id: string;
  folderId: string;
  filename: string;
  originalPath: string;
  previewPath?: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: Date;
  // Related data
  folder?: Folder;
}

export interface FolderCourse {
  folderId: string;
  courseId: string;
  createdAt: Date;
  // Related data
  folder?: Folder;
  course?: Course;
}

export interface AssetSubject {
  assetId: string;
  subjectId: string;
  createdAt: Date;
  taggedBy?: string;
  // Related data
  asset?: Asset;
  subject?: Subject;
}

// ============================================================
// TOKEN SYSTEM TYPES
// ============================================================

export type TokenScope = 'event' | 'course' | 'family';
export type AccessLevel = 'full' | 'read_only';

export interface AccessToken {
  id: string;
  scope: TokenScope;
  // Resource IDs (only one will be set based on scope)
  eventId?: string;
  courseId?: string;
  subjectId?: string;
  // Security fields (not exposed to client)
  tokenHash?: Buffer;
  salt?: Buffer;
  tokenPrefix: string;
  // Access control
  accessLevel: AccessLevel;
  canDownload: boolean;
  maxUses?: number;
  usedCount: number;
  // Time management
  expiresAt?: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
  // Metadata
  createdAt: Date;
  createdBy: string;
  metadata: Record<string, any>;
  // Computed fields
  isValid?: boolean;
  isExpired?: boolean;
  isRevoked?: boolean;
  isExhausted?: boolean;
  resourceId?: string; // Computed from eventId/courseId/subjectId
}

export interface TokenAccessLog {
  id: string;
  accessTokenId: string;
  occurredAt: Date;
  ip?: string;
  userAgent?: string;
  path?: string;
  action: 'list_folders' | 'list_assets' | 'download' | 'view';
  ok: boolean;
  responseTimeMs?: number;
  notes?: string;
  // Related data
  accessToken?: AccessToken;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface CreateTokenRequest {
  scope: TokenScope;
  resourceId: string;
  accessLevel?: AccessLevel;
  canDownload?: boolean;
  maxUses?: number;
  expiresAt?: string; // ISO string
  metadata?: Record<string, any>;
}

export interface CreateTokenResponse {
  success: boolean;
  data?: {
    token: string;
    tokenId: string;
    qrCode?: string;
  };
  error?: string;
}

export interface TokenValidationResponse {
  isValid: boolean;
  tokenId?: string;
  scope?: TokenScope;
  resourceId?: string;
  accessLevel?: AccessLevel;
  canDownload?: boolean;
  reason?: string;
}

export interface TokenContextResponse {
  scope: TokenScope;
  resourceId: string;
  resourceName: string;
  accessLevel: AccessLevel;
  canDownload: boolean;
  expiresAt?: Date;
  usageStats: TokenUsageStats;
}

export interface TokenUsageStats {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueIPs: number;
  firstAccess?: Date;
  lastAccess?: Date;
  avgResponseTimeMs?: number;
}

// ============================================================
// GALLERY ACCESS TYPES
// ============================================================

export interface GalleryFolder {
  id: string;
  name: string;
  photoCount: number;
  depth: number;
  // Navigation helpers
  hasChildren?: boolean;
  children?: GalleryFolder[];
}

export interface GalleryAsset {
  id: string;
  folderId: string;
  filename: string;
  previewPath?: string;
  originalPath: string;
  fileSize: number;
  createdAt: Date;
  // Access helpers
  canDownload?: boolean;
  previewUrl?: string;
  downloadUrl?: string;
}

export interface GalleryContext {
  scope: TokenScope;
  resourceId: string;
  resourceName: string;
  accessLevel: AccessLevel;
  canDownload: boolean;
  expiresAt?: Date;
  usageStats: TokenUsageStats;
}

export interface AccessValidation {
  isValid: boolean;
  reason?: string;
  context?: GalleryContext;
}

// ============================================================
// COURSE MANAGEMENT TYPES
// ============================================================

export interface CreateCourseRequest {
  eventId: string;
  name: string;
}

export interface UpdateCourseRequest {
  name?: string;
}

export interface EnrollFamilyRequest {
  courseId: string;
  subjectId: string;
}

export interface BulkEnrollRequest {
  courseId: string;
  subjectIds: string[];
}

export interface LinkFolderRequest {
  folderId: string;
  courseId: string;
}

export interface BulkLinkFoldersRequest {
  courseId: string;
  folderIds: string[];
}

export interface CourseStats {
  totalCourses: number;
  totalMembers: number;
  totalFolders: number;
  averageMembersPerCourse: number;
  averageFoldersPerCourse: number;
}

// ============================================================
// ADMIN API TYPES
// ============================================================

export interface AdminCreateTokenRequest extends CreateTokenRequest {
  // Additional admin-only fields
  createdBy: string;
  generateQR?: boolean;
}

export interface AdminTokenListResponse {
  tokens: AccessToken[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTokenStatsResponse {
  tokenStats: TokenUsageStats;
  recentLogs: TokenAccessLog[];
}

// ============================================================
// PAGINATION TYPES
// ============================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================
// ERROR TYPES
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================
// SEARCH & FILTER TYPES
// ============================================================

export interface SearchParams {
  query?: string;
  scope?: TokenScope[];
  accessLevel?: AccessLevel[];
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export interface AssetSearchParams {
  query?: string;
  folderId?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

// ============================================================
// SUPABASE DATABASE TYPES (Generated/Manual)
// ============================================================

export interface Database {
  public: {
    Tables: {
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Event, 'id' | 'createdAt'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Subject, 'id' | 'createdAt'>>;
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Course, 'id' | 'createdAt'>>;
      };
      course_members: {
        Row: CourseMember;
        Insert: Omit<CourseMember, 'createdAt'>;
        Update: never; // Immutable relationship
      };
      folders: {
        Row: Folder;
        Insert: Omit<Folder, 'id' | 'createdAt'>;
        Update: Partial<Omit<Folder, 'id' | 'createdAt'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'createdAt'>;
        Update: Partial<Omit<Asset, 'id' | 'createdAt'>>;
      };
      folder_courses: {
        Row: FolderCourse;
        Insert: Omit<FolderCourse, 'createdAt'>;
        Update: never; // Immutable relationship
      };
      asset_subjects: {
        Row: AssetSubject;
        Insert: Omit<AssetSubject, 'createdAt'>;
        Update: Partial<Omit<AssetSubject, 'createdAt'>>;
      };
      access_tokens: {
        Row: AccessToken;
        Insert: Omit<AccessToken, 'id' | 'createdAt' | 'usedCount'>;
        Update: Partial<Omit<AccessToken, 'id' | 'createdAt'>>;
      };
      token_access_logs: {
        Row: TokenAccessLog;
        Insert: Omit<TokenAccessLog, 'id' | 'occurredAt'>;
        Update: never; // Immutable log entries
      };
    };
    Functions: {
      // Canonical API functions
      'api.folders_for_token': {
        Args: { p_token: string };
        Returns: { folder_id: string; folder_name: string; photo_count: number; depth: number }[];
      };
      'api.assets_for_token': {
        Args: { p_token: string; p_folder_id?: string };
        Returns: {
          asset_id: string;
          folder_id: string;
          filename: string;
          preview_path: string;
          original_path: string;
          file_size: number;
          created_at: string;
        }[];
      };
      'api.can_access_asset': {
        Args: { p_token: string; p_asset_id: string };
        Returns: boolean;
      };
      'api.log_token_access': {
        Args: {
          p_token: string;
          p_action: string;
          p_ip?: string;
          p_user_agent?: string;
          p_path?: string;
          p_response_time_ms?: number;
          p_ok?: boolean;
          p_notes?: string;
        };
        Returns: string;
      };
      'api.get_token_context': {
        Args: { p_token: string };
        Returns: {
          scope: string;
          resource_id: string;
          resource_name: string;
          access_level: string;
          can_download: boolean;
          expires_at: string;
          usage_stats: any;
        }[];
      };
      // Helper functions
      validate_access_token: {
        Args: { p_token_plain: string };
        Returns: {
          token_id: string;
          scope: string;
          resource_id: string;
          access_level: string;
          can_download: boolean;
          is_valid: boolean;
          reason: string;
        }[];
      };
      get_token_usage_stats: {
        Args: { p_token_id: string };
        Returns: {
          total_accesses: number;
          successful_accesses: number;
          failed_accesses: number;
          unique_ips: number;
          first_access: string;
          last_access: string;
          avg_response_time_ms: number;
        }[];
      };
      get_event_courses: {
        Args: { p_event_id: string };
        Returns: {
          course_id: string;
          course_name: string;
          member_count: number;
          folder_count: number;
        }[];
      };
      get_course_families: {
        Args: { p_course_id: string };
        Returns: {
          subject_id: string;
          first_name: string;
          last_name: string;
          family_name: string;
          photo_count: number;
        }[];
      };
      cleanup_expired_tokens: {
        Args: {};
        Returns: { cleaned_tokens: number; cleaned_logs: number };
      };
    };
  };
}