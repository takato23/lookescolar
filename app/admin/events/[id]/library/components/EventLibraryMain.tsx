'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LibraryHeader } from './LibraryHeader';
import { FolderTreePanel } from './FolderTreePanel';
import { ContentGridPanel } from './ContentGridPanel';
import { DetailsPanel } from './DetailsPanel';
import { UploadInterface } from './UploadInterface';
import { ShareInterface } from './ShareInterface';
import { LibraryPhotoModal } from './LibraryPhotoModal';
import { AssignFolderPhotos } from './AssignFolderPhotos';
import { featureFlags } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  status: string;
}

interface Folder {
  id: string;
  event_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  depth: number;
  sort_order: number;
  child_folder_count: number;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

interface Photo {
  id: string;
  event_id: string;
  folder_id: string | null;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  watermark_path?: string;
  file_size: number;
  width: number;
  height: number;
  approved: boolean;
  processing_status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  signed_url?: string;
}

interface EventLibraryMainProps {
  event: Event;
  initialFolderId?: string | null;
  onNavigateBack: () => void;
}

export function EventLibraryMain({
  event,
  initialFolderId,
  onNavigateBack: onExitLibrary,
}: EventLibraryMainProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management with caching for performance
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId || null
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastClickedItem, setLastClickedItem] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<Photo | null>(
    null
  );
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [showShareInterface, setShowShareInterface] = useState(false);
  const [showAssignInterface, setShowAssignInterface] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);

  // Performance cache for folders and photos
  const [folderCache, setFolderCache] = useState<
    Map<string, { folders: Folder[]; timestamp: number }>
  >(new Map());
  const [photoCache, setPhotoCache] = useState<
    Map<
      string,
      {
        photos: Photo[];
        hasMore: boolean;
        totalPhotos: number;
        timestamp: number;
      }
    >
  >(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Loading states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);

  // Folder hierarchy state for proper back navigation
  const [folderHierarchy, setFolderHierarchy] = useState<
    Array<{ id: string | null; name: string }>
  >([]);

  // Panel sizing
  const [leftPanelWidth, setLeftPanelWidth] = useState(250);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

  // Load folder hierarchy for breadcrumb support
  const loadFolderHierarchy = useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setFolderHierarchy([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/folders/${folderId}`);
      const data = await response.json();

      if (response.ok && data.success && data.folder) {
        // Parse the folder path to build hierarchy
        const pathParts = data.folder.path.split(' / ');
        const hierarchy = pathParts.map((name: string, index: number) => ({
          id:
            index === 0
              ? null
              : index === pathParts.length - 1
                ? folderId
                : null,
          name,
        }));
        setFolderHierarchy(hierarchy);
      }
    } catch (error) {
      console.error('Error loading folder hierarchy:', error);
      setFolderHierarchy([{ id: folderId, name: 'Carpeta actual' }]);
    }
  }, []);

  // Handle proper back navigation through folder hierarchy
  const handleNavigateBack = useCallback(async () => {
    if (!currentFolderId) {
      // If we're at root, exit the library
      onExitLibrary();
      return;
    }

    try {
      // Get current folder details to find parent
      const response = await fetch(`/api/admin/folders/${currentFolderId}`);
      const data = await response.json();

      if (response.ok && data.success && data.folder) {
        const parentId = data.folder.parent_id;
        // Navigate to parent folder (or root if parent is null)
        handleFolderChange(parentId);
      } else {
        // Fallback: navigate to root if we can't get folder details
        handleFolderChange(null);
      }
    } catch (error) {
      console.error('Error navigating back:', error);
      // Fallback: navigate to root on error
      handleFolderChange(null);
    }
  }, [currentFolderId, onExitLibrary]);

  // Update URL when folder changes
  const updateUrl = useCallback(
    (folderId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (folderId) {
        params.set('folderId', folderId);
      } else {
        params.delete('folderId');
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    },
    [searchParams]
  );

  // Handle folder navigation
  const handleFolderChange = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSelectedItems(new Set());
      setLastClickedItem(null);
      setCurrentPage(1);
      updateUrl(folderId);

      // Load hierarchy for the new folder
      loadFolderHierarchy(folderId);
    },
    [updateUrl, loadFolderHierarchy]
  );

  // Load folder contents (both subfolders and photos)
  const loadFolderContents = useCallback(
    async (folderId: string | null, page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        // Load subfolders
        const foldersResponse = await fetch(
          `/api/admin/events/${event.id}/folders${folderId ? `?parentId=${folderId}` : '?parentId='}`
        );
        const foldersData = await foldersResponse.json();

        if (!foldersResponse.ok) {
          throw new Error(foldersData.error || 'Failed to load folders');
        }

        // Load photos with pagination (without signed URLs initially)
        const photosResponse = await fetch(
          `/api/admin/events/${event.id}/photos?${new URLSearchParams({
            folderId: folderId || '',
            page: page.toString(),
            limit: '50',
            includeSignedUrls: 'false', // We'll batch load these separately
            sortBy: 'created_at',
            sortOrder: 'desc',
          })}`
        );
        const photosData = await photosResponse.json();

        if (!photosResponse.ok) {
          throw new Error(photosData.error || 'Failed to load photos');
        }

        setFolders(foldersData.folders || []);

        // Find current folder details for upload interface
        if (folderId) {
          const folder = foldersData.folders?.find(
            (f: Folder) => f.id === folderId
          );
          setCurrentFolder(folder || null);
        } else {
          setCurrentFolder(null);
        }

        let photosWithUrls = photosData.photos || [];

        // Batch load signed URLs for better performance if there are photos
        if (photosWithUrls.length > 0) {
          try {
            const urlResponse = await fetch('/api/admin/photos/batch-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photoIds: photosWithUrls.map((p: Photo) => p.id),
                usePreview: true,
                expiryMinutes: 60,
                concurrencyLimit: 8,
              }),
            });

            if (urlResponse.ok) {
              const urlData = await urlResponse.json();
              if (urlData.success) {
                // Add signed URLs to photos
                photosWithUrls = photosWithUrls.map((photo: Photo) => ({
                  ...photo,
                  signed_url: urlData.urls[photo.id],
                  signed_url_expires_at: urlData.expiresAt[photo.id],
                }));
              }
            }
          } catch (urlError) {
            console.warn('Failed to batch load signed URLs:', urlError);
            // Continue without URLs - they'll load individually as needed
          }
        }

        if (page === 1) {
          setPhotos(photosWithUrls);
        } else {
          // Append for pagination
          setPhotos((prev) => [...prev, ...photosWithUrls]);
        }

        setHasMore(photosData.pagination?.hasMore || false);
        setTotalPhotos(photosData.pagination?.total || 0);
        setCurrentPage(page);
      } catch (error) {
        console.error('Error loading folder contents:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load folder contents'
        );
      } finally {
        setLoading(false);
      }
    },
    [event.id]
  );

  // Load more photos (pagination)
  const loadMorePhotos = useCallback(() => {
    if (!loading && hasMore) {
      loadFolderContents(currentFolderId, currentPage + 1);
    }
  }, [loading, hasMore, currentFolderId, currentPage, loadFolderContents]);

  // Create ordered list of all visible items
  const getAllVisibleItems = useCallback(() => {
    const items: Array<{ id: string; type: 'folder' | 'photo' }> = [];

    // Add folders first (they appear before photos in the grid)
    folders.forEach((folder) => {
      items.push({ id: folder.id, type: 'folder' });
    });

    // Add photos
    photos.forEach((photo) => {
      items.push({ id: photo.id, type: 'photo' });
    });

    return items;
  }, [folders, photos]);

  // Enhanced item selection with stable ID-based range support
  const handleItemSelect = useCallback(
    (
      itemId: string,
      itemType: 'folder' | 'photo',
      isCtrlKey = false,
      isShiftKey = false,
      itemIndex?: number
    ) => {
      setSelectedItems((prev) => {
        const newSelection = new Set(prev);

        if (isShiftKey && lastClickedItem && itemIndex !== undefined) {
          // Range selection using provided itemIndex from grid
          const visibleItems = getAllVisibleItems();
          const lastIndex = visibleItems.findIndex(
            (item) => item.id === lastClickedItem
          );

          if (lastIndex !== -1) {
            // Clear previous selection if not holding Ctrl
            if (!isCtrlKey) {
              newSelection.clear();
            }

            // Select range using stable indices
            const startIndex = Math.min(lastIndex, itemIndex);
            const endIndex = Math.max(lastIndex, itemIndex);

            for (let i = startIndex; i <= endIndex; i++) {
              if (visibleItems[i]) {
                newSelection.add(visibleItems[i]!.id);
              }
            }
          } else {
            // Fallback to single selection if last item not found
            if (!isCtrlKey) {
              newSelection.clear();
            }
            newSelection.add(itemId);
          }
        } else if (isCtrlKey) {
          // Multi-selection (toggle)
          if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
          } else {
            newSelection.add(itemId);
          }
        } else {
          // Single selection
          if (newSelection.has(itemId) && newSelection.size === 1) {
            // If it's the only selected item, deselect it
            newSelection.clear();
          } else {
            newSelection.clear();
            newSelection.add(itemId);
          }
        }

        return newSelection;
      });

      setLastClickedItem(itemId);

      // Update details panel based on selection
      if (itemType === 'photo') {
        const photo = photos.find((p) => p.id === itemId);
        if (photo) {
          setSelectedItemDetails(photo);
          setShowDetailsPanel(true);
        }
      } else {
        setSelectedItemDetails(null);
        if (selectedItems.size === 0) {
          setShowDetailsPanel(false);
        }
      }
    },
    [lastClickedItem, photos, getAllVisibleItems, selectedItems.size]
  );

  // Bulk selection helper
  const handleBulkSelect = useCallback(
    (itemIds: string[]) => {
      setSelectedItems(new Set(itemIds));
      if (itemIds.length > 0) {
        setLastClickedItem(itemIds[itemIds.length - 1] || null);

        // Update details panel if single item selected
        if (itemIds.length === 1) {
          const photo = photos.find((p) => p.id === itemIds[0]);
          if (photo) {
            setSelectedItemDetails(photo);
            setShowDetailsPanel(true);
          }
        } else {
          setSelectedItemDetails(null);
          setShowDetailsPanel(itemIds.length > 0);
        }
      }
    },
    [photos]
  );

  // Clear selection helper
  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastClickedItem(null);
    setSelectedItemDetails(null);
    setShowDetailsPanel(false);
  }, []);

  // Enhanced keyboard shortcuts
  const handleKeyboardShortcuts = useCallback(
    (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClearSelection();
          break;

        case 'a':
        case 'A':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Select all visible items
            const allVisibleItems = getAllVisibleItems();
            handleBulkSelect(allVisibleItems.map((item) => item.id));
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (selectedItems.size > 0) {
            e.preventDefault();
            // TODO: Implement delete functionality
            console.log('Delete selected items:', Array.from(selectedItems));
          }
          break;

        case 'c':
        case 'C':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // TODO: Implement copy functionality
            console.log('Copy selected items:', Array.from(selectedItems));
          }
          break;

        case 'v':
        case 'V':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // TODO: Implement paste functionality
            console.log('Paste items');
          }
          break;
      }
    },
    [selectedItems, getAllVisibleItems, handleBulkSelect, handleClearSelection]
  );

  // Handle photo double-click (open in modal)
  const handlePhotoDoubleClick = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId);
    setShowPhotoModal(true);
  }, []);

  // Handle photo modal selection change (for navigation within modal)
  const handlePhotoModalSelectionChange = useCallback(
    (photoIds: string[]) => {
      if (photoIds.length > 0) {
        setSelectedPhotoId(photoIds[0] || null);
        setSelectedItems(new Set(photoIds));
        setLastClickedItem(photoIds[0] || null);

        // Update details panel if showing
        const photo = photos.find((p) => p.id === photoIds[0]);
        if (photo && showDetailsPanel) {
          setSelectedItemDetails(photo);
        }
      }
    },
    [photos, showDetailsPanel]
  );

  // Create library items for PhotoModal
  const getLibraryItems = useCallback(() => {
    const items: Array<{
      type: 'photo' | 'folder';
      id: string;
      data: Photo | { id: string; name: string };
    }> = [];

    // Add folders
    folders.forEach((folder) => {
      items.push({
        type: 'folder',
        id: folder.id,
        data: { id: folder.id, name: folder.name },
      });
    });

    // Add photos with proper type casting
    photos.forEach((photo) => {
      items.push({
        type: 'photo',
        id: photo.id,
        data: {
          ...photo,
          processing_status: photo.processing_status as
            | 'completed'
            | 'pending'
            | 'processing'
            | 'failed',
        },
      });
    });

    return items as any; // Type assertion to satisfy LibraryPhotoModal interface
  }, [folders, photos]);

  // Handle folder double-click (navigate into folder)
  const handleFolderDoubleClick = useCallback(
    (folderId: string) => {
      handleFolderChange(folderId);
    },
    [handleFolderChange]
  );

  // Handle upload completion
  const handleUploadComplete = useCallback(
    (photoIds: string[]) => {
      // Close upload modal first
      setShowUploadInterface(false);

      // Refresh current folder to show new photos
      loadFolderContents(currentFolderId);

      // Optionally select the newly uploaded photos
      if (photoIds.length > 0) {
        setSelectedItems(new Set(photoIds));
        setLastClickedItem(photoIds[photoIds.length - 1] || null);
      }

      // Show success message
      console.log(
        `Successfully uploaded ${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''}`
      );
    },
    [currentFolderId, loadFolderContents]
  );

  // Handle folder creation (context-aware)
  const handleCreateFolder = useCallback(() => {
    // Trigger folder creation in the current folder context
    // This will communicate with FolderTreePanel to open the create modal
    // with the current folder as the parent
    const event = new CustomEvent('createFolderInContext', {
      detail: { parentFolderId: currentFolderId },
    });
    window.dispatchEvent(event);
  }, [currentFolderId]);

  // Show upload interface
  const handleShowUpload = useCallback(() => {
    setShowUploadInterface(true);
  }, []);

  // Show share interface
  const handleShowShare = useCallback(() => {
    setShowShareInterface(true);
  }, []);

  // Show assign interface
  const handleShowAssign = useCallback(() => {
    setShowAssignInterface(true);
  }, []);
  const getSelectedShareItems = useCallback(() => {
    const selectedPhotos = photos.filter((photo) =>
      selectedItems.has(photo.id)
    );
    const selectedFolders = folders.filter((folder) =>
      selectedItems.has(folder.id)
    );

    // For sharing, we only support photo selection, not folder selection from grid
    // Folder sharing is done via current folder context
    return selectedPhotos.map((photo) => ({
      id: photo.id,
      type: 'photo' as const,
      name: photo.original_filename,
    }));
  }, [selectedItems, photos, folders]);

  // Handle photo move via drag & drop with enhanced error handling
  const handlePhotosMove = useCallback(
    async (photoIds: string[], targetFolderId: string | null) => {
      // Prevent moving to the same folder
      const photosToMove = photos.filter(
        (photo) =>
          photoIds.includes(photo.id) && photo.folder_id !== targetFolderId
      );

      if (photosToMove.length === 0) {
        console.log('No photos need to be moved (already in target folder)');
        return;
      }

      const moveRequestId = crypto.randomUUID();
      console.log(`Starting photo move operation ${moveRequestId}:`, {
        photoCount: photosToMove.length,
        targetFolderId: targetFolderId || 'root',
        photoIds: photosToMove.map((p) => p.id),
      });

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/photos/batch-move', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoIds: photosToMove.map((p) => p.id),
            folderId: targetFolderId, // API expects 'folderId', not 'targetFolderId'
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Failed to move photos (HTTP ${response.status})`
          );
        }

        console.log(`Photo move operation ${moveRequestId} completed:`, {
          moved: data.moved,
          alreadyInTarget: data.alreadyInTarget,
          total: data.total,
        });

        // Force refresh current folder to show updated state
        await loadFolderContents(currentFolderId);

        // Clear selection after successful move
        setSelectedItems(new Set());
        setLastClickedItem(null);

        // Show success feedback
        const targetName = targetFolderId
          ? folders.find((f) => f.id === targetFolderId)?.name ||
            'carpeta seleccionada'
          : 'carpeta raíz';

        console.log(`Successfully moved ${data.moved} photos to ${targetName}`);
      } catch (error) {
        console.error(`Photo move operation ${moveRequestId} failed:`, error);
        setError(
          error instanceof Error ? error.message : 'Failed to move photos'
        );
      } finally {
        setLoading(false);
      }
    },
    [photos, currentFolderId, folders, loadFolderContents]
  );

  // Handle folder move via drag & drop with enhanced error handling
  const handleFolderMove = useCallback(
    async (folderId: string, targetFolderId: string | null) => {
      // Prevent moving to itself or creating cycles
      if (folderId === targetFolderId) {
        console.warn('Cannot move folder to itself');
        return;
      }

      const moveRequestId = crypto.randomUUID();
      console.log(`Starting folder move operation ${moveRequestId}:`, {
        folderId,
        targetFolderId: targetFolderId || 'root',
      });

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/folders/${folderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: targetFolderId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Failed to move folder (HTTP ${response.status})`
          );
        }

        console.log(
          `Folder move operation ${moveRequestId} completed successfully`
        );

        // Force refresh current folder to update the folder tree and grid
        await loadFolderContents(currentFolderId, 1);

        // Clear selection
        setSelectedItems(new Set());
        setLastClickedItem(null);

        console.log('Successfully moved folder');
      } catch (error) {
        console.error(`Folder move operation ${moveRequestId} failed:`, error);
        setError(
          error instanceof Error ? error.message : 'Failed to move folder'
        );

        // Don't clear loading state immediately on error
        setTimeout(() => setLoading(false), 1000);
      } finally {
        if (!error) {
          setLoading(false);
        }
      }
    },
    [currentFolderId, loadFolderContents]
  );

  // Initial load
  useEffect(() => {
    loadFolderContents(currentFolderId);
  }, [currentFolderId, loadFolderContents]);

  // Enhanced keyboard shortcuts with useEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedItems.size > 0) {
            e.preventDefault();
            // TODO: Implement delete functionality
            console.log('Delete selected items:', Array.from(selectedItems));
          }
          break;

        case 'Enter':
          if (selectedItems.size === 1) {
            e.preventDefault();
            const selectedId = Array.from(selectedItems)[0];
            const folder = folders.find((f) => f.id === selectedId);
            if (folder && selectedId) {
              // Navigate into folder
              handleFolderChange(selectedId);
            } else {
              // Open photo in modal
              const photo = photos.find((p) => p.id === selectedId);
              if (photo && selectedId) {
                setSelectedPhotoId(selectedId);
                setShowPhotoModal(true);
              }
            }
          }
          break;

        case 'F2':
          if (selectedItems.size === 1) {
            e.preventDefault();
            // TODO: Implement rename functionality
            console.log('Rename item:', Array.from(selectedItems)[0]);
          }
          break;

        case 'n':
        case 'N':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // TODO: Implement new folder functionality
            console.log('Create new folder in:', currentFolderId);
          }
          break;

        case 'u':
        case 'U':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleShowUpload();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    folders,
    photos,
    selectedItems,
    currentFolderId,
    handleFolderChange,
    getAllVisibleItems,
    handleShowUpload,
  ]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <LibraryHeader
        event={event}
        currentFolderId={currentFolderId}
        selectedItemsCount={selectedItems.size}
        onNavigateBack={handleNavigateBack}
        onFolderNavigate={handleFolderChange}
        onCreateFolder={handleCreateFolder}
        onUpload={handleShowUpload}
        onShare={handleShowShare}
        onAssignPhotos={handleShowAssign}
        onRefresh={() => loadFolderContents(currentFolderId)}
      />

      {/* Main content area with panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Folder Tree */}
        <div
          className="flex-shrink-0 overflow-hidden border-r border-gray-200 bg-white"
          style={{ width: leftPanelWidth }}
        >
          <FolderTreePanel
            eventId={event.id}
            currentFolderId={currentFolderId}
            onFolderSelect={handleFolderChange}
            onFolderDoubleClick={handleFolderDoubleClick}
            onPhotosMove={handlePhotosMove}
            onFolderMove={handleFolderMove}
          />
        </div>

        {/* Resizer for left panel */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-gray-300"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = leftPanelWidth;

            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = Math.min(
                Math.max(startWidth + (e.clientX - startX), 200),
                400
              );
              setLeftPanelWidth(newWidth);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Center Panel - Content Grid */}
        <div
          className="relative flex flex-1 flex-col overflow-hidden"
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              setIsDragOverUpload(true);
            }
          }}
          onDragLeave={(e) => {
            // Only clear when leaving container
            if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
            setIsDragOverUpload(false);
          }}
          onDrop={(e) => {
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              setDroppedFiles(files);
              setIsDragOverUpload(false);
              setShowUploadInterface(true);
            }
          }}
        >
          <ContentGridPanel
            eventId={event.id}
            currentFolderId={currentFolderId}
            folders={folders}
            photos={photos}
            selectedItems={selectedItems}
            loading={loading}
            error={error}
            hasMore={hasMore}
            totalPhotos={totalPhotos}
            onItemSelect={handleItemSelect}
            onFolderDoubleClick={handleFolderDoubleClick}
            onLoadMore={loadMorePhotos}
            onRefresh={() => loadFolderContents(currentFolderId)}
            onShowUpload={handleShowUpload}
            onPhotosMove={handlePhotosMove}
            onFolderMove={handleFolderMove}
            onPhotoDoubleClick={handlePhotoDoubleClick}
            onBulkSelect={handleBulkSelect}
            onClearSelection={handleClearSelection}
          />

          {isDragOverUpload && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded bg-blue-50/70">
              <div className="rounded-xl border-2 border-dashed border-blue-400 bg-white/80 px-6 py-4 text-blue-700 shadow">
                Suelta archivos para subir a esta carpeta
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Details (optional) */}
        {showDetailsPanel && (
          <>
            {/* Resizer for right panel */}
            <div
              className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-gray-300"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = rightPanelWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = Math.min(
                    Math.max(startWidth - (e.clientX - startX), 250),
                    500
                  );
                  setRightPanelWidth(newWidth);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />

            <div
              className="flex-shrink-0 overflow-hidden border-l border-gray-200 bg-white"
              style={{ width: rightPanelWidth }}
            >
              <DetailsPanel
                selectedPhoto={selectedItemDetails}
                selectedItemsCount={selectedItems.size}
                onClose={() => setShowDetailsPanel(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Upload Interface Modal */}
      {showUploadInterface && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden">
            <UploadInterface
              eventId={event.id}
              currentFolderId={currentFolderId}
              currentFolderName={currentFolder?.name || ''}
              onUploadComplete={handleUploadComplete}
              onClose={() => {
                setShowUploadInterface(false);
                setDroppedFiles(null);
              }}
              initialFiles={droppedFiles || undefined}
            />
          </div>
        </div>
      )}

      {/* Share Interface Modal */}
      {showShareInterface && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto">
            <ShareInterface
              eventId={event.id}
              eventName={event.name}
              currentFolderId={currentFolderId}
              currentFolderName={currentFolder?.name || ''}
              selectedItems={getSelectedShareItems()}
              onClose={() => setShowShareInterface(false)}
            />
          </div>
        </div>
      )}

      {/* Assign Photos Interface Modal */}
      {showAssignInterface && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto">
            <div className="rounded-lg bg-white shadow-xl">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Asignar Fotos a Estudiantes
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAssignInterface(false)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <AssignFolderPhotos
                  eventId={event.id}
                  currentFolderId={currentFolderId}
                  currentFolderName={currentFolder?.name || ''}
                  onAssignmentComplete={() => {
                    // Refresh the folder contents and close modal
                    loadFolderContents(currentFolderId);
                    setShowAssignInterface(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      <LibraryPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        selectedPhotoId={selectedPhotoId}
        allItems={getLibraryItems()}
        onSelectionChange={handlePhotoModalSelectionChange}
        selectedPhotoIds={Array.from(selectedItems)}
      />
    </div>
  );
}
