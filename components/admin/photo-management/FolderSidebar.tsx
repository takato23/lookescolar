'use client';

import React, { memo } from 'react';
import { 
  FolderIcon, 
  FolderOpenIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderItem } from './types';

interface FolderSidebarProps {
  folders: FolderItem[];
  currentFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderToggle: (folderId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  className?: string;
}

const FolderTreeItem = memo(({ 
  folder, 
  currentFolder, 
  level = 0,
  onFolderSelect,
  onFolderToggle,
  onCreateFolder 
}: {
  folder: FolderItem;
  currentFolder: string | null;
  level?: number;
  onFolderSelect: (folderId: string) => void;
  onFolderToggle: (folderId: string) => void;
  onCreateFolder: (parentId: string) => void;
}) => {
  const isSelected = currentFolder === folder.id;
  const hasChildren = folder.children.length > 0;
  const paddingLeft = level * 16 + 8;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-sm cursor-pointer group hover:bg-gray-100 transition-colors',
          isSelected && 'bg-blue-50 text-blue-700 font-medium'
        )}
        style={{ paddingLeft }}
        onClick={() => onFolderSelect(folder.id)}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onFolderToggle(folder.id);
            }}
          >
            {folder.isOpen ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}

        {/* Folder icon */}
        {folder.isOpen ? (
          <FolderOpenIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
        ) : (
          <FolderIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
        )}

        {/* Folder name */}
        <span className="flex-1 truncate text-sm">
          {folder.name}
        </span>

        {/* Photo count badge */}
        {folder.photoCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {folder.photoCount}
          </Badge>
        )}

        {/* Add subfolder button */}
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onCreateFolder(folder.id);
          }}
        >
          <PlusIcon className="h-3 w-3" />
        </Button>
      </div>

      {/* Child folders */}
      {hasChildren && folder.isOpen && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              currentFolder={currentFolder}
              level={level + 1}
              onFolderSelect={onFolderSelect}
              onFolderToggle={onFolderToggle}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FolderTreeItem.displayName = 'FolderTreeItem';

const FolderSidebarComponent = ({
  folders,
  currentFolder,
  onFolderSelect,
  onFolderToggle,
  onCreateFolder,
  className,
}: FolderSidebarProps) => {
  return (
    <div className={cn('flex flex-col h-full border-r bg-gray-50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">Folders</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCreateFolder()}
          className="h-8 px-2"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>

      {/* Folder tree */}
      <ScrollArea className="flex-1 p-2">
        {/* Root folder */}
        <div
          className={cn(
            'flex items-center gap-2 py-1 px-2 rounded-sm cursor-pointer hover:bg-gray-100 transition-colors mb-2',
            currentFolder === null && 'bg-blue-50 text-blue-700 font-medium'
          )}
          onClick={() => onFolderSelect(null)}
        >
          <FolderIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm">All Photos</span>
        </div>

        {/* Folder tree */}
        <div className="space-y-0.5">
          {folders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              currentFolder={currentFolder}
              onFolderSelect={onFolderSelect}
              onFolderToggle={onFolderToggle}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>

        {folders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FolderIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No folders yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => onCreateFolder()}
              className="mt-1"
            >
              Create your first folder
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export const FolderSidebar = memo(FolderSidebarComponent);
FolderSidebar.displayName = 'FolderSidebar';