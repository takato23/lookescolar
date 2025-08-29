/**
 * Shared types for photo management components
 */

export interface PhotoItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  thumbnailUrl?: string;
  selected: boolean;
  uploadProgress?: number;
  metadata?: {
    width?: number;
    height?: number;
    dateCreated?: string;
    camera?: string;
    location?: string;
  };
  tags?: string[];
  subjects?: Array<{
    id: string;
    name: string;
    grade?: string;
  }>;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
  children: FolderItem[];
  photoCount: number;
  isOpen: boolean;
  isSelected: boolean;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: PhotoItem;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface PhotoManagementState {
  photos: PhotoItem[];
  folders: FolderItem[];
  currentFolder: string | null;
  selectedPhotos: Set<string>;
  viewMode: ViewMode;
  sortBy: SortOption;
  sortOrder: SortOrder;
  searchQuery: string;
  uploadQueue: UploadQueueItem[];
  isLoading: boolean;
  error: string | null;
}

export interface PhotoManagementActions {
  // Photo actions
  selectPhoto: (photoId: string) => void;
  selectAllPhotos: () => void;
  clearSelection: () => void;
  deletePhotos: (photoIds: string[]) => Promise<void>;
  movePhotos: (photoIds: string[], folderId: string) => Promise<void>;
  
  // Folder actions
  createFolder: (name: string, parentId?: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  navigateToFolder: (folderId: string | null) => void;
  
  // View actions
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (sortBy: SortOption, order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  
  // Upload actions
  startUpload: (files: File[]) => void;
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  clearUploadQueue: () => void;
}