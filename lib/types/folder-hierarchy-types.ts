/**
 * Folder hierarchy types for unified template support
 * Provides consistent interfaces for folder navigation across all store templates
 */

export interface FolderMetadata {
  id: string;
  name: string;
  path: string[];
  photoCount: number;
  hasChildren: boolean;
  depth: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChildFolder {
  id: string;
  name: string;
  photoCount: number;
  hasChildren: boolean;
  thumbnailUrl?: string;
}

export interface FolderHierarchyProps {
  path?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  depth?: number;
  childFolders?: Array<{
    id: string;
    name: string;
    depth: number;
    photo_count?: number;
    has_children?: boolean;
  }>;
  shareType?: string | null;
}

export interface FolderNavigationHandlers {
  onFolderNavigate?: (folderId: string, folderName: string) => void;
  onBreadcrumbClick?: (folderId: string | null) => void;
}

export interface TemplateBaseProps {
  /** Folder hierarchy data and metadata */
  folderHierarchy?: FolderHierarchyProps;
  
  /** Navigation handler for folder selection */
  onFolderNavigate?: (folderId: string, folderName: string) => void;
  
  /** Whether folder navigation is loading */
  isNavigatingFolder?: boolean;
}

// Navigation state for tracking folder history
export interface FolderNavigationState {
  currentFolderId: string | null;
  currentFolderName: string | null;
  navigationHistory: Array<{
    folderId: string | null;
    folderName: string | null;
    timestamp: number;
  }>;
  isNavigating: boolean;
}

// Constants for folder navigation
export const FOLDER_NAVIGATION_LIMITS = {
  MAX_DEPTH: 10,
  MAX_HISTORY_SIZE: 20,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
} as const;

export const FOLDER_DEFAULTS = {
  ROOT_FOLDER_ID: null,
  ROOT_FOLDER_NAME: 'Root',
  DEFAULT_DEPTH: 0,
} as const;

// Utility type for folder tree traversal
export type FolderTreeNode = {
  id: string;
  name: string;
  children: FolderTreeNode[];
  metadata: FolderMetadata;
};

// API response type for folder navigation
export interface FolderNavigationResponse {
  currentFolder: FolderMetadata;
  childFolders: ChildFolder[];
  breadcrumbs: Array<{
    id: string | null;
    name: string;
  }>;
  assets: any[]; // Photo/asset data
  totalAssets: number;
}