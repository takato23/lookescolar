'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Home,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  onPhotosMove?: (photoIds: string[], targetFolderId: string | null) => Promise<void>;
  onFolderMove?: (folderId: string, targetFolderId: string | null) => Promise<void>;
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);

  // Helper to check if moving a folder would create a cycle
  const wouldCreateCycle = useCallback((folderId: string, targetFolderId: string | null): boolean => {
    if (!targetFolderId || folderId === targetFolderId) return true;
    
    // Find the target folder and check if folderId is in its ancestry
    const findInTree = (nodes: FolderNode[], searchId: string): FolderNode | null => {
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
    return targetFolder.path.includes(`/${folderId}/`) || targetFolder.path.endsWith(`/${folderId}`);
  }, [treeData]);

  // Load root folders initially
  useEffect(() => {
    loadRootFolders();
  }, [eventId]);

  const loadRootFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/events/${eventId}/folders?parentId=`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folders');
      }

      const folders = data.folders || [];
      setTreeData(folders.map((folder: any) => ({
        ...folder,
        children: [],
        expanded: false,
        loading: false,
      })));

    } catch (error) {
      console.error('Error loading root folders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  // Load children for a specific folder
  const loadFolderChildren = async (folderId: string) => {
    try {
      setTreeData(prev => updateFolderLoading(prev, folderId, true));

      const response = await fetch(`/api/admin/events/${eventId}/folders?parentId=${folderId}`);
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

      setTreeData(prev => updateFolderChildren(prev, folderId, children));

    } catch (error) {
      console.error('Error loading folder children:', error);
      setTreeData(prev => updateFolderLoading(prev, folderId, false));
    }
  };

  // Helper function to update folder loading state
  const updateFolderLoading = (folders: FolderNode[], folderId: string, loading: boolean): FolderNode[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, loading };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderLoading(folder.children, folderId, loading)
        };
      }
      return folder;
    });
  };

  // Helper function to update folder children
  const updateFolderChildren = (folders: FolderNode[], folderId: string, children: FolderNode[]): FolderNode[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { 
          ...folder, 
          children,
          expanded: true,
          loading: false 
        };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderChildren(folder.children, folderId, children)
        };
      }
      return folder;
    });
  };

  // Handle folder expand/collapse
  const handleFolderToggle = useCallback((folderId: string, hasChildren: boolean) => {
    if (!hasChildren) return;

    const isExpanded = expandedFolders.has(folderId);
    
    if (isExpanded) {
      // Collapse
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
      
      setTreeData(prev => updateFolderExpanded(prev, folderId, false));
    } else {
      // Expand
      setExpandedFolders(prev => new Set(prev).add(folderId));
      
      // Load children if not already loaded
      const folder = findFolderById(treeData, folderId);
      if (folder && (!folder.children || folder.children.length === 0)) {
        loadFolderChildren(folderId);
      } else {
        setTreeData(prev => updateFolderExpanded(prev, folderId, true));
      }
    }
  }, [expandedFolders, treeData]);

  // Helper function to find folder by ID
  const findFolderById = (folders: FolderNode[], folderId: string): FolderNode | null => {
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
  const updateFolderExpanded = (folders: FolderNode[], folderId: string, expanded: boolean): FolderNode[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, expanded };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderExpanded(folder.children, folderId, expanded)
        };
      }
      return folder;
    });
  };

  // Handle drag over folder
  const handleDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId === null ? 'root' : folderId);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the entire tree area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    setDraggedFolder(null);
    
    if (!onPhotosMove && !onFolderMove) return;
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      if (dragData.type === 'photos' && dragData.photoIds && onPhotosMove) {
        await onPhotosMove(dragData.photoIds, targetFolderId);
      } else if (dragData.type === 'folder' && dragData.folderId && onFolderMove) {
        // Prevent cycles and self-drops
        if (wouldCreateCycle(dragData.folderId, targetFolderId)) {
          console.warn('Cannot move folder: would create a cycle or invalid move');
          return;
        }
        
        await onFolderMove(dragData.folderId, targetFolderId);
      }
    } catch (error) {
      console.error('Error handling drop in folder tree:', error);
    }
  }, [onPhotosMove, onFolderMove, wouldCreateCycle]);

  // Handle drag start for folders
  const handleFolderDragStart = useCallback((e: React.DragEvent, folderId: string) => {
    setDraggedFolder(folderId);
    
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'folder',
      folderId,
      eventId,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, [eventId]);

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
    const isDropDisabled = draggedFolder ? wouldCreateCycle(draggedFolder, folder.id) : false;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors group",
            "hover:bg-gray-100",
            isSelected && "bg-blue-100 text-blue-700",
            isDragOver && !isDropDisabled && "bg-green-100 border-2 border-green-400 border-dashed",
            isDragOver && isDropDisabled && "bg-red-100 border-2 border-red-400 border-dashed",
            isDragged && "opacity-50",
            level > 0 && "ml-4"
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
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFolderToggle(folder.id, hasChildren);
                }}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors"
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
          <span 
            className="text-sm truncate flex-1 min-w-0"
            title={folder.name}
          >
            {folder.name}
          </span>

          {/* Photo count */}
          {folder.photo_count > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {folder.photo_count}
            </span>
          )}
        </div>

        {/* Render children */}
        {isExpanded && folder.children && folder.children.length > 0 && (
          <div>
            {folder.children.map(child => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">Cargando carpetas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600 mb-2">Error al cargar carpetas</div>
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
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">Carpetas</h3>
      </div>

      {/* Tree navigation */}
      <div className="flex-1 overflow-auto p-2">
        {/* Root folder */}
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors mb-1",
            "hover:bg-gray-100",
            currentFolderId === null && "bg-blue-100 text-blue-700",
            dragOverFolder === 'root' && "bg-green-100 border-2 border-green-400 border-dashed"
          )}
          onClick={() => onFolderSelect(null)}
          onDoubleClick={() => onFolderSelect(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <Home className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Fotos</span>
        </div>

        {/* Folder tree */}
        {treeData.length > 0 ? (
          <div className="space-y-0.5">
            {treeData.map(folder => renderFolderItem(folder))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">
            No hay carpetas
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => {
            // TODO: Implement create folder
            console.log('Create folder in:', currentFolderId || 'root');
          }}
        >
          <Folder className="h-3 w-3 mr-1" />
          Nueva carpeta
        </Button>
      </div>
    </div>
  );
}