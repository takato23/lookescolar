/**
 * FOLDER LIST COMPONENT
 *
 * Displays available folders with hierarchical structure
 * Features: Depth indication, photo counts, selection state
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FolderIcon,
  FolderOpenIcon,
  ImageIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { GalleryFolder } from '@/lib/services/hierarchical-gallery.service';

interface FolderListProps {
  folders: GalleryFolder[];
  onFolderSelect: (folderId: string) => void;
  selectedFolder?: string;
}

export function FolderList({
  folders,
  onFolderSelect,
  selectedFolder,
}: FolderListProps) {
  const getFolderIcon = (folder: GalleryFolder, isSelected: boolean) => {
    if (isSelected) {
      return <FolderOpenIcon className="h-5 w-5 text-blue-600" />;
    }
    return <FolderIcon className="h-5 w-5 text-gray-600" />;
  };

  const getDepthIndentation = (depth: number) => {
    return `${depth * 1.5}rem`; // 1.5rem per depth level
  };

  // Group folders by depth for better visual hierarchy
  const foldersByDepth = folders.reduce(
    (acc, folder) => {
      const depth = folder.depth || 0;
      if (!acc[depth]) acc[depth] = [];
      acc[depth].push(folder);
      return acc;
    },
    {} as Record<number, GalleryFolder[]>
  );

  const renderFolders = () => {
    // Sort depths to render in order (0, 1, 2, etc.)
    const depths = Object.keys(foldersByDepth)
      .map(Number)
      .sort((a, b) => a - b);

    return depths.map((depth) =>
      foldersByDepth[depth].map((folder) => (
        <Card
          key={folder.id}
          className={`transition-all duration-200 hover:shadow-md ${
            selectedFolder === folder.id
              ? 'bg-blue-50 ring-2 ring-blue-500'
              : 'hover:bg-gray-50'
          }`}
          style={{ marginLeft: getDepthIndentation(depth) }}
        >
          <CardContent className="p-4">
            <Button
              variant="ghost"
              className="h-auto w-full justify-start p-0 hover:bg-transparent"
              onClick={() => onFolderSelect(folder.id)}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFolderIcon(folder, selectedFolder === folder.id)}

                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      {folder.name}
                    </div>
                    {folder.depth > 0 && (
                      <div className="text-xs text-gray-500">
                        Subfolder (Level {folder.depth + 1})
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {folder.photoCount}
                  </Badge>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      ))
    );
  };

  if (folders.length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          No folders available
        </h3>
        <p className="text-gray-600">
          All photos are available directly without folder organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {folders.length} folder{folders.length !== 1 ? 's' : ''} available
        </div>

        {selectedFolder && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFolderSelect('')}
          >
            Clear Filter
          </Button>
        )}
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {renderFolders()}
      </div>

      <div className="mt-4 rounded bg-gray-50 p-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <FolderIcon className="h-3 w-3" />
          Click any folder to view its photos
        </div>
      </div>
    </div>
  );
}
