'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Loader2,
  Home,
  School,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// Types
interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  event_id: string | null;
  path: string;
  depth: number;
  photo_count: number;
  child_folder_count: number;
  events?: {
    id: string;
    name: string;
    school_name: string;
  };
  children?: Folder[];
  expanded?: boolean;
  loading?: boolean;
}

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  className?: string;
}

interface FolderNodeProps {
  folder: Folder;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  level: number;
}

function FolderNode({
  folder,
  selectedFolderId,
  onFolderSelect,
  onToggleExpand,
  onCreateSubfolder,
  onDeleteFolder,
  level,
}: FolderNodeProps) {
  const isSelected = folder.id === selectedFolderId;
  const hasChildren =
    folder.child_folder_count > 0 ||
    (folder.children && folder.children.length > 0);
  const isExpanded = folder.expanded;
  const indentWidth = level * 16;


  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onFolderSelect(folder.id);
  }, [folder.id, onFolderSelect]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(folder.id);
    }
  }, [folder.id, hasChildren, onToggleExpand]);

  const getFolderIcon = () => {
    if (folder.event_id && folder.events) {
      return <School className="h-4 w-4 text-blue-600" />;
    }
    if (isExpanded && hasChildren) {
      return <FolderOpen className="h-4 w-4 text-blue-600" />;
    }
    return <Folder className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors',
          isSelected && 'bg-blue-100 text-blue-900'
        )}
        style={{ marginLeft: indentWidth }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={handleToggle}
          disabled={!hasChildren}
        >
          {folder.loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>

        {/* Folder Icon */}
        {getFolderIcon()}

        {/* Folder Name */}
        <span className={cn(
          'flex-1 text-sm font-medium truncate',
          isSelected && 'text-blue-900'
        )}>
          {folder.name}
        </span>

        {/* Photo Count Badge */}
        {folder.photo_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {folder.photo_count}
          </Badge>
        )}

        {/* Event Badge */}
        {folder.event_id && folder.events && (
          <Badge variant="outline" className="text-xs">
            Event
          </Badge>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Subfolder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder.id);
              }}
              className="text-red-600 hover:bg-red-50 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && folder.children && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubfolder={onCreateSubfolder}
              onDeleteFolder={onDeleteFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  className,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderChildren, setFolderChildren] = useState<Map<string, Folder[]>>(new Map());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Delete folder state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFolderInfo, setDeleteFolderInfo] = useState<{
    photoCount: number;
    subfolderCount: number;
    hasSubfolders: boolean;
  } | null>(null);

  // Load children for a folder
  const loadFolderChildren = useCallback(async (folderId: string) => {
    try {
      const response = await fetch(`/api/admin/folders?parentId=${folderId}`);
      if (!response.ok) throw new Error('Failed to load folder children');
      
      const data = await response.json();
      setFolderChildren(prev => new Map(prev).set(folderId, data.folders || []));
    } catch (error) {
      console.error('Error loading folder children:', error);
      toast.error('Failed to load folder children');
    }
  }, []);

  // Toggle folder expansion
  const handleToggleExpand = useCallback(async (folderId: string) => {
    const isExpanded = expandedFolders.has(folderId);
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });

    // Load children if expanding and not already loaded
    if (!isExpanded && !folderChildren.has(folderId)) {
      await loadFolderChildren(folderId);
    }
  }, [expandedFolders, folderChildren, loadFolderChildren]);

  // Create subfolder
  const handleCreateSubfolder = useCallback((parentId: string) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setShowCreateDialog(true);
  }, []);

  // Create root folder
  const handleCreateRootFolder = useCallback(() => {
    setNewFolderParentId(null);
    setNewFolderName('');
    setShowCreateDialog(true);
  }, []);

  // Submit folder creation
  const handleSubmitCreate = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: newFolderParentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      toast.success('Folder created successfully');
      setShowCreateDialog(false);
      setNewFolderName('');
      setNewFolderParentId(null);

      // Refresh folder tree
      if (newFolderParentId) {
        await loadFolderChildren(newFolderParentId);
        setExpandedFolders(prev => new Set(prev).add(newFolderParentId));
      }
      // For root folders, the parent query will refresh automatically

    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  }, [newFolderName, newFolderParentId, loadFolderChildren]);

  // Load folder details for deletion
  const loadFolderDetailsForDeletion = useCallback(async (folder: Folder) => {
    try {
      const response = await fetch(`/api/admin/folders/${folder.id}`);
      if (!response.ok) throw new Error('Failed to load folder details');
      
      const data = await response.json();
      const folderDetails = data.folder;
      
      // Count photos and subfolders
      const photoCount = folderDetails.photo_count || 0;
      const subfolderCount = folderDetails.child_folder_count || 0;
      const hasSubfolders = subfolderCount > 0;
      
      setDeleteFolderInfo({
        photoCount,
        subfolderCount,
        hasSubfolders
      });
    } catch (error) {
      console.error('Error loading folder details:', error);
      setDeleteFolderInfo({ photoCount: 0, subfolderCount: 0, hasSubfolders: false });
    }
  }, []);

  // Show delete confirmation
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const folder = [...folders, ...Array.from(folderChildren.values()).flat()]
      .find(f => f.id === folderId);
    
    if (!folder) {
      toast.error('Folder not found');
      return;
    }

    // Check if it's a system folder that shouldn't be deleted
    const systemFolderNames = ['General', 'Uncategorized', 'Root', 'System'];
    if (systemFolderNames.includes(folder.name)) {
      toast.error('System folders cannot be deleted');
      return;
    }

    setFolderToDelete(folder);
    await loadFolderDetailsForDeletion(folder);
    setShowDeleteDialog(true);
  }, [folders, folderChildren, loadFolderDetailsForDeletion]);

  // Confirm folder deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!folderToDelete) return;

    setIsDeleting(true);
    try {
      // For folders with content, move contents to parent or root
      const moveContentsTo = folderToDelete.parent_id || null;
      const queryParams = moveContentsTo 
        ? `?moveContentsTo=${moveContentsTo}`
        : '?moveContentsTo=null';
      
      const response = await fetch(`/api/admin/folders/${folderToDelete.id}${queryParams}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      toast.success(`Folder "${folderToDelete.name}" deleted successfully`);
      
      // Clear selection if deleted folder was selected
      if (folderToDelete.id === selectedFolderId) {
        onFolderSelect(null);
      }

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setFolderToDelete(null);
      setDeleteFolderInfo(null);

      // Refresh the parent folder's children if it was a subfolder
      if (folderToDelete.parent_id && folderChildren.has(folderToDelete.parent_id)) {
        await loadFolderChildren(folderToDelete.parent_id);
      }

    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete folder');
    } finally {
      setIsDeleting(false);
    }
  }, [folderToDelete, selectedFolderId, onFolderSelect, folderChildren, loadFolderChildren]);

  // Cancel folder deletion
  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setFolderToDelete(null);
    setDeleteFolderInfo(null);
  }, []);

  // Enhance folders with expansion and children data
  const enhancedFolders = React.useMemo(() => {
    return folders.map(folder => ({
      ...folder,
      expanded: expandedFolders.has(folder.id),
      children: folderChildren.get(folder.id) || [],
    }));
  }, [folders, expandedFolders, folderChildren]);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Root/All Photos Option */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors',
          selectedFolderId === null && 'bg-blue-100 text-blue-900'
        )}
        onClick={() => onFolderSelect(null)}
      >
        <div className="h-4 w-4" /> {/* Spacer for alignment */}
        <Home className="h-4 w-4 text-gray-600" />
        <span className="flex-1 text-sm font-medium">All Photos</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateRootFolder();
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-0.5">
        {enhancedFolders.map((folder) => (
          <div key={folder.id} className="group">
            <FolderNode
              folder={folder}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onToggleExpand={handleToggleExpand}
              onCreateSubfolder={handleCreateSubfolder}
              onDeleteFolder={handleDeleteFolder}
              level={0}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {folders.length === 0 && (
        <div className="text-center py-8">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 mb-4">No folders yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateRootFolder}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Folder
          </Button>
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create {newFolderParentId ? 'Sub' : ''}Folder
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitCreate();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!newFolderName.trim() || isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={() => !isDeleting && handleCancelDelete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Folder?
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the folder{' '}
              <span className="font-semibold text-gray-900">
                "{folderToDelete?.name}"
              </span>?
            </p>
            
            {deleteFolderInfo && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">Folder Contents</span>
                </div>
                
                {deleteFolderInfo.photoCount > 0 && (
                  <p className="text-sm text-yellow-700">
                    📸 <strong>{deleteFolderInfo.photoCount}</strong> photos will be moved to the parent folder
                  </p>
                )}
                
                {deleteFolderInfo.subfolderCount > 0 && (
                  <p className="text-sm text-yellow-700">
                    📁 <strong>{deleteFolderInfo.subfolderCount}</strong> subfolders will be moved to the parent folder
                  </p>
                )}
                
                {deleteFolderInfo.photoCount === 0 && deleteFolderInfo.subfolderCount === 0 && (
                  <p className="text-sm text-yellow-700">
                    This folder is empty and can be safely deleted.
                  </p>
                )}
              </div>
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ This action cannot be undone
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}