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

export function EventLibraryMain({ event, initialFolderId, onNavigateBack }: EventLibraryMainProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastClickedItem, setLastClickedItem] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<Photo | null>(null);
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [showShareInterface, setShowShareInterface] = useState(false);
  const [showAssignInterface, setShowAssignInterface] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  
  // Loading states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);

  // Panel sizing
  const [leftPanelWidth, setLeftPanelWidth] = useState(250);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

  // Update URL when folder changes
  const updateUrl = useCallback((folderId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (folderId) {
      params.set('folderId', folderId);
    } else {
      params.delete('folderId');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [searchParams]);

  // Handle folder navigation
  const handleFolderChange = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set());
    setLastClickedItem(null);
    setCurrentPage(1);
    updateUrl(folderId);
  }, [updateUrl]);

  // Load folder contents (both subfolders and photos)
  const loadFolderContents = useCallback(async (folderId: string | null, page: number = 1) => {
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
        const folder = foldersData.folders?.find((f: Folder) => f.id === folderId);
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
        setPhotos(prev => [...prev, ...photosWithUrls]);
      }
      
      setHasMore(photosData.pagination?.hasMore || false);
      setTotalPhotos(photosData.pagination?.total || 0);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading folder contents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

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
    folders.forEach(folder => {
      items.push({ id: folder.id, type: 'folder' });
    });
    
    // Add photos
    photos.forEach(photo => {
      items.push({ id: photo.id, type: 'photo' });
    });
    
    return items;
  }, [folders, photos]);

  // Handle item selection with proper range support
  const handleItemSelect = useCallback((
    itemId: string, 
    itemType: 'folder' | 'photo',
    isCtrlKey = false,
    isShiftKey = false
  ) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftKey && lastClickedItem) {
        // Range selection based on item order in grid
        const visibleItems = getAllVisibleItems();
        const lastIndex = visibleItems.findIndex(item => item.id === lastClickedItem);
        const currentIndex = visibleItems.findIndex(item => item.id === itemId);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          // Clear previous selection if not holding Ctrl
          if (!isCtrlKey) {
            newSelection.clear();
          }
          
          // Select range
          const startIndex = Math.min(lastIndex, currentIndex);
          const endIndex = Math.max(lastIndex, currentIndex);
          
          for (let i = startIndex; i <= endIndex; i++) {
            newSelection.add(visibleItems[i].id);
          }
        } else {
          // Fallback to single selection if indices not found
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
    
    // Show details panel for single photo selection
    if (itemType === 'photo' && newSelection.size === 1 && newSelection.has(itemId)) {
      const photo = photos.find(p => p.id === itemId);
      if (photo) {
        setSelectedItemDetails(photo);
        setShowDetailsPanel(true);
      }
    } else {
      setSelectedItemDetails(null);
      if (newSelection.size === 0) {
        setShowDetailsPanel(false);
      }
    }
  }, [lastClickedItem, photos, getAllVisibleItems]);

  // Handle photo double-click (open in modal)
  const handlePhotoDoubleClick = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId);
    setShowPhotoModal(true);
  }, []);

  // Handle photo modal selection change (for navigation within modal)
  const handlePhotoModalSelectionChange = useCallback((photoIds: string[]) => {
    if (photoIds.length > 0) {
      setSelectedPhotoId(photoIds[0]);
      setSelectedItems(new Set(photoIds));
      setLastClickedItem(photoIds[0]);
      
      // Update details panel if showing
      const photo = photos.find(p => p.id === photoIds[0]);
      if (photo && showDetailsPanel) {
        setSelectedItemDetails(photo);
      }
    }
  }, [photos, showDetailsPanel]);

  // Create library items for PhotoModal
  const getLibraryItems = useCallback(() => {
    const items: Array<{ type: 'photo' | 'folder'; id: string; data: Photo | Folder }> = [];
    
    // Add folders
    folders.forEach(folder => {
      items.push({ type: 'folder', id: folder.id, data: folder });
    });
    
    // Add photos
    photos.forEach(photo => {
      items.push({ type: 'photo', id: photo.id, data: photo });
    });
    
    return items;
  }, [folders, photos]);

  // Handle folder double-click (navigate into folder)
  const handleFolderDoubleClick = useCallback((folderId: string) => {
    handleFolderChange(folderId);
  }, [handleFolderChange]);

  // Handle upload completion
  const handleUploadComplete = useCallback((photoIds: string[]) => {
    // Refresh current folder to show new photos
    loadFolderContents(currentFolderId);
    
    // Optionally select the newly uploaded photos
    if (photoIds.length > 0) {
      setSelectedItems(new Set(photoIds));
      setLastClickedItem(photoIds[photoIds.length - 1]);
    }
    
    // Show success message
    console.log(`Successfully uploaded ${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''}`);
  }, [currentFolderId, loadFolderContents]);

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
    const selectedPhotos = photos.filter(photo => selectedItems.has(photo.id));
    const selectedFolders = folders.filter(folder => selectedItems.has(folder.id));
    
    // For sharing, we only support photo selection, not folder selection from grid
    // Folder sharing is done via current folder context
    return selectedPhotos.map(photo => ({
      id: photo.id,
      type: 'photo' as const,
      name: photo.original_filename,
    }));
  }, [selectedItems, photos, folders]);

  // Handle photo move via drag & drop
  const handlePhotosMove = useCallback(async (photoIds: string[], targetFolderId: string | null) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/photos/batch-move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds,
          targetFolderId,
          eventId: event.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move photos');
      }

      // Refresh current folder to update counts and remove moved photos
      await loadFolderContents(currentFolderId);
      
      // Clear selection
      setSelectedItems(new Set());
      setLastClickedItem(null);
      
      console.log(`Successfully moved ${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error moving photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to move photos');
    } finally {
      setLoading(false);
    }
  }, [event.id, currentFolderId, loadFolderContents]);

  // Handle folder move via drag & drop
  const handleFolderMove = useCallback(async (folderId: string, targetFolderId: string | null) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: targetFolderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move folder');
      }

      // Refresh current folder to update the folder tree
      await loadFolderContents(currentFolderId);
      
      // Clear selection
      setSelectedItems(new Set());
      setLastClickedItem(null);
      
      console.log('Successfully moved folder');
    } catch (error) {
      console.error('Error moving folder:', error);
      setError(error instanceof Error ? error.message : 'Failed to move folder');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, loadFolderContents]);

  // Initial load
  useEffect(() => {
    loadFolderContents(currentFolderId);
  }, [currentFolderId, loadFolderContents]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setSelectedItems(new Set());
          setShowDetailsPanel(false);
          setLastClickedItem(null);
          break;
          
        case 'a':
        case 'A':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Select all visible items
            const allVisibleItems = getAllVisibleItems();
            setSelectedItems(new Set(allVisibleItems.map(item => item.id)));
            setLastClickedItem(allVisibleItems[allVisibleItems.length - 1]?.id || null);
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
          
        case 'Enter':
          if (selectedItems.size === 1) {
            e.preventDefault();
            const selectedId = Array.from(selectedItems)[0];
            const folder = folders.find(f => f.id === selectedId);
            if (folder) {
              // Navigate into folder
              handleFolderChange(selectedId);
            } else {
              // Open photo in modal
              const photo = photos.find(p => p.id === selectedId);
              if (photo) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [folders, photos, selectedItems, currentFolderId, handleFolderChange, getAllVisibleItems, handleShowUpload]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <LibraryHeader
        event={event}
        currentFolderId={currentFolderId}
        selectedItemsCount={selectedItems.size}
        onNavigateBack={onNavigateBack}
        onFolderNavigate={handleFolderChange}
        onUpload={handleShowUpload}
        onShare={handleShowShare}
        onAssignPhotos={handleShowAssign}
        onRefresh={() => loadFolderContents(currentFolderId)}
      />

      {/* Main content area with panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Folder Tree */}
        <div 
          className="bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden"
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
          className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = leftPanelWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = Math.min(Math.max(startWidth + (e.clientX - startX), 200), 400);
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
        <div className="flex-1 flex flex-col overflow-hidden">
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
          />
        </div>

        {/* Right Panel - Details (optional) */}
        {showDetailsPanel && (
          <>
            {/* Resizer for right panel */}
            <div
              className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = rightPanelWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = Math.min(Math.max(startWidth - (e.clientX - startX), 250), 500);
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
              className="bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <UploadInterface
              eventId={event.id}
              currentFolderId={currentFolderId}
              currentFolderName={currentFolder?.name}
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUploadInterface(false)}
            />
          </div>
        </div>
      )}
      
      {/* Share Interface Modal */}
      {showShareInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <ShareInterface
              eventId={event.id}
              eventName={event.name}
              currentFolderId={currentFolderId}
              currentFolderName={currentFolder?.name}
              selectedItems={getSelectedShareItems()}
              onClose={() => setShowShareInterface(false)}
            />
          </div>
        </div>
      )}
      
      {/* Assign Photos Interface Modal */}
      {showAssignInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="bg-white rounded-lg shadow-xl">
              <div className="p-4 border-b border-gray-200">
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
                  currentFolderName={currentFolder?.name}
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