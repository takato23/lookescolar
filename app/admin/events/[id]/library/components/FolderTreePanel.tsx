'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Home,
  Loader2,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface FolderNode {
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
  children?: FolderNode[];
  expanded?: boolean;
  loading?: boolean;
}

interface FolderTreePanelProps {
  eventId: string;
  currentFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderDoubleClick: (folderId: string) => void;
  onPhotosMove?: (
    photoIds: string[],
    targetFolderId: string | null
  ) => Promise<void>;
  onFolderMove?: (
    folderId: string,
    targetFolderId: string | null
  ) => Promise<void>;
}

export function FolderTreePanel({
  eventId,
  currentFolderId,
  onFolderSelect,
  onFolderDoubleClick,
  onPhotosMove,
  onFolderMove,
}: FolderTreePanelProps) {
  const [treeData, setTreeData] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);

  // Folder creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [contextMenuFolder, setContextMenuFolder] = useState<string | null>(
    null
  );

  // Helper to check if moving a folder would create a cycle
  const wouldCreateCycle = useCallback(
    (folderId: string, targetFolderId: string | null): boolean => {
      if (!targetFolderId || folderId === targetFolderId) return true;

      // Find the target folder and check if folderId is in its ancestry
      const findInTree = (
        nodes: FolderNode[],
        searchId: string
      ): FolderNode | null => {
        for (const node of nodes) {
          if (node.id === searchId) return node;
          if (node.children) {
            const found = findInTree(node.children, searchId);
            if (found) return found;
          }
        }
        return null;
      };

      const targetFolder = findInTree(treeData, targetFolderId);
      if (!targetFolder) return false;

      // Check if target folder's path contains the dragged folder
      return (
        targetFolder.path.includes(`/${folderId}/`) ||
        targetFolder.path.endsWith(`/${folderId}`)
      );
    },
    [treeData]
  );

  // Load root folders initially
  useEffect(() => {
    loadRootFolders();
  }, [eventId]);

  const loadRootFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/events/${eventId}/folders?parentId=`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folders');
      }

      const folders = data.folders || [];
      setTreeData(
        folders.map((folder: any) => ({
          ...folder,
          children: [],
          expanded: false,
          loading: false,
        }))
      );
    } catch (error) {
      console.error('Error loading root folders:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load folders'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load children for a specific folder
  const loadFolderChildren = async (folderId: string) => {
    try {
      setTreeData((prev) => updateFolderLoading(prev, folderId, true));

      const response = await fetch(
        `/api/admin/events/${eventId}/folders?parentId=${folderId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load child folders');
      }

      const children = (data.folders || []).map((folder: any) => ({
        ...folder,
        children: [],
        expanded: false,
        loading: false,
      }));

      setTreeData((prev) => updateFolderChildren(prev, folderId, children));
    } catch (error) {
      console.error('Error loading folder children:', error);
      setTreeData((prev) => updateFolderLoading(prev, folderId, false));
    }
  };

  // Helper function to update folder loading state
  const updateFolderLoading = (
    folders: FolderNode[],
    folderId: string,
    loading: boolean
  ): FolderNode[] => {
    return folders.map((folder) => {
      if (folder.id === folderId) {
        return { ...folder, loading };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderLoading(folder.children, folderId, loading),
        };
      }
      return folder;
    });
  };

  // Helper function to update folder children
  const updateFolderChildren = (
    folders: FolderNode[],
    folderId: string,
    children: FolderNode[]
  ): FolderNode[] => {
    return folders.map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          children,
          expanded: true,
          loading: false,
        };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderChildren(folder.children, folderId, children),
        };
      }
      return folder;
    });
  };

  // Create folder functionality
  const handleCreateFolder = useCallback(async (parentId: string | null) => {
    setCreatingInFolder(parentId);
    setNewFolderName('');
    setShowCreateModal(true);
  }, []);

  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('El nombre de la carpeta es requerido');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_id: creatingInFolder,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la carpeta');
      }

      toast.success('Carpeta creada exitosamente');

      // Refresh the appropriate folder's children or root folders
      if (creatingInFolder) {
        // If creating in a specific folder, expand it and reload its children
        setExpandedFolders((prev) => new Set(prev).add(creatingInFolder));
        await loadFolderChildren(creatingInFolder);
      } else {
        // If creating in root, reload root folders
        await loadRootFolders();
      }

      // Close modal and reset state
      setShowCreateModal(false);
      setNewFolderName('');
      setCreatingInFolder(null);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear la carpeta'
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    eventId,
    newFolderName,
    creatingInFolder,
    loadRootFolders,
    loadFolderChildren,
  ]);

  // Listen for context-aware folder creation from header
  useEffect(() => {
    const handleCreateFolderInContext = (event: CustomEvent) => {
      const { parentFolderId } = event.detail;
      handleCreateFolder(parentFolderId);
    };

    window.addEventListener(
      'createFolderInContext',
      handleCreateFolderInContext as EventListener
    );
    return () => {
      window.removeEventListener(
        'createFolderInContext',
        handleCreateFolderInContext as EventListener
      );
    };
  }, [handleCreateFolder]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateModal(false);
    setNewFolderName('');
    setCreatingInFolder(null);
  }, []);

  // Handle folder expand/collapse
  const handleFolderToggle = useCallback(
    (folderId: string, hasChildren: boolean) => {
      if (!hasChildren) return;

      const isExpanded = expandedFolders.has(folderId);

      if (isExpanded) {
        // Collapse
        setExpandedFolders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderId);
          return newSet;
        });

        setTreeData((prev) => updateFolderExpanded(prev, folderId, false));
      } else {
        // Expand
        setExpandedFolders((prev) => new Set(prev).add(folderId));

        // Load children if not already loaded
        const folder = findFolderById(treeData, folderId);
        if (folder && (!folder.children || folder.children.length === 0)) {
          loadFolderChildren(folderId);
        } else {
          setTreeData((prev) => updateFolderExpanded(prev, folderId, true));
        }
      }
    },
    [expandedFolders, treeData]
  );

  // Helper function to find folder by ID
  const findFolderById = (
    folders: FolderNode[],
    folderId: string
  ): FolderNode | null => {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.children) {
        const found = findFolderById(folder.children, folderId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to update folder expanded state
  const updateFolderExpanded = (
    folders: FolderNode[],
    folderId: string,
    expanded: boolean
  ): FolderNode[] => {
    return folders.map((folder) => {
      if (folder.id === folderId) {
        return { ...folder, expanded };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderExpanded(folder.children, folderId, expanded),
        };
      }
      return folder;
    });
  };

  // Handle drag over folder
  const handleDragOver = useCallback(
    (e: React.DragEvent, folderId: string | null) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolder(folderId === null ? 'root' : folderId);
    },
    []
  );

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the entire tree area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetFolderId: string | null) => {
      e.preventDefault();
      setDragOverFolder(null);
      setDraggedFolder(null);

      if (!onPhotosMove && !onFolderMove) return;

      try {
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (dragData.type === 'photos' && dragData.photoIds && onPhotosMove) {
          await onPhotosMove(dragData.photoIds, targetFolderId);
        } else if (
          dragData.type === 'folder' &&
          dragData.folderId &&
          onFolderMove
        ) {
          // Prevent cycles and self-drops
          if (wouldCreateCycle(dragData.folderId, targetFolderId)) {
            console.warn(
              'Cannot move folder: would create a cycle or invalid move'
            );
            return;
          }

          await onFolderMove(dragData.folderId, targetFolderId);
        }
      } catch (error) {
        console.error('Error handling drop in folder tree:', error);
      }
    },
    [onPhotosMove, onFolderMove, wouldCreateCycle]
  );

  // Handle drag start for folders
  const handleFolderDragStart = useCallback(
    (e: React.DragEvent, folderId: string) => {
      setDraggedFolder(folderId);

      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          type: 'folder',
          folderId,
          eventId,
        })
      );
      e.dataTransfer.effectAllowed = 'move';
    },
    [eventId]
  );

  // Handle drag end
  const handleFolderDragEnd = useCallback(() => {
    setDraggedFolder(null);
    setDragOverFolder(null);
  }, []);

  // Render folder item
  const renderFolderItem = (folder: FolderNode, level: number = 0) => {
    const isSelected = currentFolderId === folder.id;
    const isExpanded = folder.expanded;
    const hasChildren = folder.child_folder_count > 0;
    const isLoading = folder.loading;
    const isDragOver = dragOverFolder === folder.id;
    const isDragged = draggedFolder === folder.id;
    const isDropDisabled = draggedFolder
      ? wouldCreateCycle(draggedFolder, folder.id)
      : false;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition-colors',
            'hover:bg-gray-100',
            isSelected && 'bg-blue-100 text-blue-700',
            isDragOver &&
              !isDropDisabled &&
              'border-2 border-dashed border-green-400 bg-green-100',
            isDragOver &&
              isDropDisabled &&
              'border-2 border-dashed border-red-400 bg-red-100',
            isDragged && 'opacity-50',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onFolderSelect(folder.id)}
          onDoubleClick={() => onFolderDoubleClick(folder.id)}
          draggable={true}
          onDragStart={(e) => handleFolderDragStart(e, folder.id)}
          onDragEnd={handleFolderDragEnd}
          onDragOver={(e) => !isDropDisabled && handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => !isDropDisabled && handleDrop(e, folder.id)}
        >
          {/* Expand/collapse button */}
          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFolderToggle(folder.id, hasChildren);
                }}
                className="rounded p-0.5 transition-colors hover:bg-gray-200"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          {/* Folder icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-gray-500" />
            )}
          </div>

          {/* Folder name */}
          <span className="min-w-0 flex-1 truncate text-sm" title={folder.name}>
            {folder.name}
          </span>

          {/* Photo count */}
          {folder.photo_count > 0 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {folder.photo_count}
            </span>
          )}

          {/* Context menu for folder actions */}
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuFolder(folder.id);
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateFolder(folder.id);
                  }}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Nueva subcarpeta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Render children */}
        {isExpanded && folder.children && folder.children.length > 0 && (
          <div>
            {folder.children.map((child) => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">Cargando carpetas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="mb-2 text-sm text-red-600">
          Error al cargar carpetas
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRootFolders}
          className="text-xs"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <h3 className="text-sm font-medium text-gray-700">Carpetas</h3>
      </div>

      {/* Tree navigation */}
      <div className="flex-1 overflow-auto p-2">
        {/* Root folder */}
        <div className="group">
          <div
            className={cn(
              'mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors',
              'hover:bg-gray-100',
              currentFolderId === null && 'bg-blue-100 text-blue-700',
              dragOverFolder === 'root' &&
                'border-2 border-dashed border-green-400 bg-green-100'
            )}
            onClick={() => onFolderSelect(null)}
            onDoubleClick={() => onFolderSelect(null)}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            <Home className="h-4 w-4 text-gray-500" />
            <span className="flex-1 text-sm font-medium">Fotos</span>

            {/* Root folder context menu */}
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFolder(null);
                    }}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Nueva carpeta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Folder tree */}
        {treeData.length > 0 ? (
          <div className="space-y-0.5">
            {treeData.map((folder) => renderFolderItem(folder))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">
            No hay carpetas
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-gray-200 bg-gray-50 p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => handleCreateFolder(currentFolderId)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Nueva carpeta
        </Button>
      </div>

      {/* Create Folder Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nueva carpeta
              {creatingInFolder ? (
                <span className="block text-sm font-normal text-gray-500">
                  en:{' '}
                  {findFolderById(treeData, creatingInFolder)?.name ||
                    'Carpeta'}
                </span>
              ) : (
                <span className="block text-sm font-normal text-gray-500">
                  en: Fotos (raíz)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="folder-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nombre de la carpeta
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ej: Graduación, Deportes, etc."
                maxLength={255}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isCreating &&
                    newFolderName.trim()
                  ) {
                    createFolder();
                  } else if (e.key === 'Escape') {
                    handleCancelCreate();
                  }
                }}
                className="w-full"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelCreate}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={createFolder}
              disabled={isCreating || !newFolderName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3 w-3" />
                  Crear carpeta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
