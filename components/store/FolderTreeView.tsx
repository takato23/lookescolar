'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FolderNode {
  id: string;
  name: string;
  depth: number;
  photo_count?: number;
  has_children?: boolean;
  children?: FolderNode[];
}

interface FolderTreeViewProps {
  folders?: FolderNode[];
  currentFolderId?: string;
  currentFolderPath?: string;
  onFolderSelect?: (folderId: string, folderName: string) => void;
  className?: string;
  showPhotoCount?: boolean;
  expandAll?: boolean;
}

export function FolderTreeView({
  folders = [],
  currentFolderId,
  currentFolderPath,
  onFolderSelect,
  className,
  showPhotoCount = true,
  expandAll = false
}: FolderTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    expandAll ? new Set(folders.map(f => f.id)) : new Set()
  );

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;
    const hasChildren = folder.has_children || (folder.children && folder.children.length > 0);

    return (
      <div key={folder.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
            level > 0 && "ml-4"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleFolder(folder.id);
            }
            if (onFolderSelect) {
              onFolderSelect(folder.id, folder.name);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-gray-500" />
          )}

          {/* Folder Name */}
          <span
            className={cn(
              "flex-1 text-sm",
              isSelected ? "font-semibold text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
            )}
          >
            {folder.name}
          </span>

          {/* Photo Count */}
          {showPhotoCount && folder.photo_count !== undefined && folder.photo_count > 0 && (
            <div className="flex items-center gap-1">
              <Image className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {folder.photo_count}
              </span>
            </div>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && folder.children && (
          <div className="mt-1">
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!folders || folders.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Show current path if available */}
      {currentFolderPath && (
        <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ubicación actual:</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentFolderPath}
          </p>
        </div>
      )}

      {/* Render folder tree */}
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}

// Breadcrumb component for showing folder path
interface FolderBreadcrumbProps {
  path?: string;
  separator?: string;
  className?: string;
  onSegmentClick?: (segment: string, index: number) => void;
}

export function FolderBreadcrumb({
  path,
  separator = ' > ',
  className,
  onSegmentClick
}: FolderBreadcrumbProps) {
  if (!path) return null;

  const segments = path.split(separator);

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <button
            onClick={() => onSegmentClick?.(segment, index)}
            className={cn(
              "px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              index === segments.length - 1
                ? "font-semibold text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            {segment}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

// Simple folder list component (alternative view)
interface FolderListProps {
  folders?: FolderNode[];
  currentFolderId?: string;
  onFolderSelect?: (folderId: string, folderName: string) => void;
  className?: string;
  showPhotoCount?: boolean;
}

export function FolderList({
  folders = [],
  currentFolderId,
  onFolderSelect,
  className,
  showPhotoCount = true
}: FolderListProps) {
  if (!folders || folders.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderSelect?.(folder.id, folder.name)}
          className={cn(
            "flex items-center gap-3 p-4 rounded-lg border transition-all",
            "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700",
            currentFolderId === folder.id
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          )}
        >
          <Folder className={cn(
            "h-8 w-8",
            currentFolderId === folder.id ? "text-blue-500" : "text-gray-400"
          )} />
          <div className="flex-1 text-left">
            <p className={cn(
              "font-medium",
              currentFolderId === folder.id
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-900 dark:text-gray-100"
            )}>
              {folder.name}
            </p>
            {showPhotoCount && folder.photo_count !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {folder.photo_count} {folder.photo_count === 1 ? 'foto' : 'fotos'}
              </p>
            )}
          </div>
          {folder.has_children && (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
      ))}
    </div>
  );
}