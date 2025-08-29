'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { 
  PhotoActions, 
  FolderSidebar, 
  UploadQueue, 
  PhotoGridDisplay,
  PhotoItem,
  FolderItem,
  UploadQueueItem,
  ViewMode,
  SortOption,
  SortOrder,
  PhotoManagementState,
  PhotoManagementActions
} from './photo-management';

interface PhotoManagementProps {
  initialPhotos?: PhotoItem[];
  initialFolders?: FolderItem[];
  className?: string;
}

const PhotoManagementComponent = ({
  initialPhotos = [],
  initialFolders = [],
  className,
}: PhotoManagementProps) => {
  // State management
  const [state, setState] = useState<PhotoManagementState>({
    photos: initialPhotos,
    folders: initialFolders,
    currentFolder: null,
    selectedPhotos: new Set<string>(),
    viewMode: 'grid',
    sortBy: 'date',
    sortOrder: 'desc',
    searchQuery: '',
    uploadQueue: [],
    isLoading: false,
    error: null,
  });

  // Memoized filtered and sorted photos
  const filteredPhotos = useMemo(() => {
    let filtered = [...state.photos];

    // Apply folder filter
    if (state.currentFolder) {
      filtered = filtered.filter(photo => 
        photo.subjects?.some(subject => subject.id === state.currentFolder)
      );
    }

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.name.toLowerCase().includes(query) ||
        photo.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        photo.subjects?.some(subject => 
          subject.name.toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          const dateA = a.metadata?.dateCreated ? new Date(a.metadata.dateCreated) : new Date(0);
          const dateB = b.metadata?.dateCreated ? new Date(b.metadata.dateCreated) : new Date(0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [state.photos, state.currentFolder, state.searchQuery, state.sortBy, state.sortOrder]);

  // Actions implementation
  const actions: PhotoManagementActions = {
    // Photo actions
    selectPhoto: useCallback((photoId: string) => {
      setState(prev => ({
        ...prev,
        selectedPhotos: new Set([photoId])
      }));
    }, []),

    selectAllPhotos: useCallback(() => {
      setState(prev => ({
        ...prev,
        selectedPhotos: new Set(filteredPhotos.map(photo => photo.id))
      }));
    }, [filteredPhotos]),

    clearSelection: useCallback(() => {
      setState(prev => ({
        ...prev,
        selectedPhotos: new Set()
      }));
    }, []),

    deletePhotos: useCallback(async (photoIds: string[]) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        // TODO: Implement actual delete API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setState(prev => ({
          ...prev,
          photos: prev.photos.filter(photo => !photoIds.includes(photo.id)),
          selectedPhotos: new Set(),
          isLoading: false,
        }));
        
        toast.success(`Deleted ${photoIds.length} photo(s)`);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to delete photos'
        }));
        toast.error('Failed to delete photos');
      }
    }, []),

    movePhotos: useCallback(async (photoIds: string[], folderId: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        // TODO: Implement actual move API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setState(prev => ({
          ...prev,
          photos: prev.photos.map(photo =>
            photoIds.includes(photo.id)
              ? { ...photo, subjects: [{ id: folderId, name: 'Moved Folder' }] }
              : photo
          ),
          selectedPhotos: new Set(),
          isLoading: false,
        }));
        
        toast.success(`Moved ${photoIds.length} photo(s)`);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to move photos'
        }));
        toast.error('Failed to move photos');
      }
    }, []),

    // Folder actions
    createFolder: useCallback(async (name: string, parentId?: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const newFolder: FolderItem = {
          id: Date.now().toString(),
          name,
          path: parentId ? `${parentId}/${name}` : name,
          children: [],
          photoCount: 0,
          isOpen: false,
          isSelected: false,
        };
        
        setState(prev => ({
          ...prev,
          folders: [...prev.folders, newFolder],
          isLoading: false,
        }));
        
        toast.success(`Created folder "${name}"`);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to create folder'
        }));
        toast.error('Failed to create folder');
      }
    }, []),

    deleteFolder: useCallback(async (folderId: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        setState(prev => ({
          ...prev,
          folders: prev.folders.filter(folder => folder.id !== folderId),
          currentFolder: prev.currentFolder === folderId ? null : prev.currentFolder,
          isLoading: false,
        }));
        
        toast.success('Deleted folder');
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to delete folder'
        }));
        toast.error('Failed to delete folder');
      }
    }, []),

    navigateToFolder: useCallback((folderId: string | null) => {
      setState(prev => ({
        ...prev,
        currentFolder: folderId,
        selectedPhotos: new Set() // Clear selection when changing folders
      }));
    }, []),

    // View actions
    setViewMode: useCallback((mode: ViewMode) => {
      setState(prev => ({ ...prev, viewMode: mode }));
    }, []),

    setSortOrder: useCallback((sortBy: SortOption, order: SortOrder) => {
      setState(prev => ({ ...prev, sortBy, sortOrder: order }));
    }, []),

    setSearchQuery: useCallback((query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }));
    }, []),

    // Upload actions
    startUpload: useCallback((files: File[]) => {
      const newUploadItems: UploadQueueItem[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        progress: 0,
        status: 'pending',
      }));

      setState(prev => ({
        ...prev,
        uploadQueue: [...prev.uploadQueue, ...newUploadItems],
      }));

      // Start upload process
      newUploadItems.forEach(async (item, index) => {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setState(prev => ({
            ...prev,
            uploadQueue: prev.uploadQueue.map(queueItem =>
              queueItem.id === item.id
                ? { ...queueItem, progress, status: progress === 100 ? 'completed' : 'uploading' }
                : queueItem
            ),
          }));
        }

        // Add to photos after successful upload
        if (Math.random() > 0.1) { // 90% success rate
          const newPhoto: PhotoItem = {
            id: `photo-${Date.now()}-${index}`,
            name: item.file.name,
            size: item.file.size,
            type: item.file.type,
            url: URL.createObjectURL(item.file),
            selected: false,
          };

          setState(prev => ({
            ...prev,
            photos: [...prev.photos, newPhoto],
          }));
        } else {
          // Simulate error
          setState(prev => ({
            ...prev,
            uploadQueue: prev.uploadQueue.map(queueItem =>
              queueItem.id === item.id
                ? { ...queueItem, status: 'error', error: 'Upload failed' }
                : queueItem
            ),
          }));
        }
      });
    }, []),

    cancelUpload: useCallback((uploadId: string) => {
      setState(prev => ({
        ...prev,
        uploadQueue: prev.uploadQueue.filter(item => item.id !== uploadId),
      }));
    }, []),

    retryUpload: useCallback((uploadId: string) => {
      setState(prev => ({
        ...prev,
        uploadQueue: prev.uploadQueue.map(item =>
          item.id === uploadId
            ? { ...item, status: 'pending', progress: 0, error: undefined }
            : item
        ),
      }));
    }, []),

    clearUploadQueue: useCallback(() => {
      setState(prev => ({
        ...prev,
        uploadQueue: prev.uploadQueue.filter(item => item.status !== 'completed'),
      }));
    }, []),
  };

  // Photo interaction handlers
  const handlePhotoPreview = useCallback((photo: PhotoItem) => {
    // TODO: Implement photo preview modal
    // Preview functionality pending implementation
  }, []);

  const handlePhotoDownload = useCallback((photo: PhotoItem) => {
    // TODO: Implement photo download
    const link = document.createElement('a');
    link.href = photo.url || '';
    link.download = photo.name;
    link.click();
  }, []);

  const handlePhotoDelete = useCallback((photo: PhotoItem) => {
    actions.deletePhotos([photo.id]);
  }, [actions]);

  const handleToggleFavorite = useCallback((photo: PhotoItem) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.map(p =>
        p.id === photo.id
          ? {
              ...p,
              tags: p.tags?.includes('favorite')
                ? p.tags.filter(tag => tag !== 'favorite')
                : [...(p.tags || []), 'favorite']
            }
          : p
      ),
    }));
  }, []);

  const handleFolderToggle = useCallback((folderId: string) => {
    setState(prev => ({
      ...prev,
      folders: prev.folders.map(folder =>
        folder.id === folderId
          ? { ...folder, isOpen: !folder.isOpen }
          : folder
      ),
    }));
  }, []);

  return (
    <div className={cn('flex h-full bg-gray-50', className)}>
      {/* Sidebar */}
      <div className="w-64 border-r bg-white">
        <FolderSidebar
          folders={state.folders}
          currentFolder={state.currentFolder}
          onFolderSelect={actions.navigateToFolder}
          onFolderToggle={handleFolderToggle}
          onCreateFolder={(parentId) => {
            const name = prompt('Folder name:');
            if (name) {
              actions.createFolder(name, parentId);
            }
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Actions bar */}
        <PhotoActions
          selectedCount={state.selectedPhotos.size}
          totalCount={filteredPhotos.length}
          viewMode={state.viewMode}
          sortBy={state.sortBy}
          sortOrder={state.sortOrder}
          searchQuery={state.searchQuery}
          onSelectAll={actions.selectAllPhotos}
          onClearSelection={actions.clearSelection}
          onViewModeChange={actions.setViewMode}
          onSortChange={actions.setSortOrder}
          onSearchChange={actions.setSearchQuery}
          onDownload={() => {
            const selectedPhotos = state.photos.filter(photo => 
              state.selectedPhotos.has(photo.id)
            );
            selectedPhotos.forEach(handlePhotoDownload);
          }}
          onDelete={() => {
            actions.deletePhotos(Array.from(state.selectedPhotos));
          }}
          onMove={() => {
            // TODO: Implement move dialog
            // Move functionality pending implementation
          }}
          onShare={() => {
            // TODO: Implement share functionality
            // Share functionality pending implementation
          }}
          onCopy={() => {
            // TODO: Implement copy links functionality
            // Copy functionality pending implementation
          }}
          onFavorite={() => {
            const selectedPhotos = state.photos.filter(photo => 
              state.selectedPhotos.has(photo.id)
            );
            selectedPhotos.forEach(handleToggleFavorite);
          }}
        />

        {/* Photo grid */}
        <div className="flex-1 overflow-auto p-4">
          <PhotoGridDisplay
            photos={filteredPhotos}
            selectedPhotos={state.selectedPhotos}
            viewMode={state.viewMode}
            onPhotoSelect={actions.selectPhoto}
            onPhotoPreview={handlePhotoPreview}
            onPhotoDownload={handlePhotoDownload}
            onPhotoDelete={handlePhotoDelete}
            onToggleFavorite={handleToggleFavorite}
            loading={state.isLoading}
          />
        </div>

        {/* Upload queue */}
        <UploadQueue
          uploadQueue={state.uploadQueue}
          isUploading={state.uploadQueue.some(item => item.status === 'uploading')}
          onCancelUpload={actions.cancelUpload}
          onRetryUpload={actions.retryUpload}
          onClearCompleted={actions.clearUploadQueue}
          className="mx-4 mb-4"
        />
      </div>
    </div>
  );
};

export const PhotoManagement = memo(PhotoManagementComponent);
PhotoManagement.displayName = 'PhotoManagement';