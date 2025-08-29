'use client';

import React, { memo } from 'react';
import { 
  DownloadIcon,
  TrashIcon,
  MoveIcon,
  ShareIcon,
  CopyIcon,
  StarIcon,
  GridIcon,
  ListIcon,
  FilterIcon,
  MoreVerticalIcon,
  SearchIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ViewMode, SortOption, SortOrder } from './types';
import { COMPONENT_CONFIG } from '@/lib/config/ui.config';

interface PhotoActionsProps {
  selectedCount: number;
  totalCount: number;
  viewMode: ViewMode;
  sortBy: SortOption;
  sortOrder: SortOrder;
  searchQuery: string;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sortBy: SortOption, order: SortOrder) => void;
  onSearchChange: (query: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onMove: () => void;
  onShare: () => void;
  onCopy: () => void;
  onFavorite: () => void;
  className?: string;
}

const PhotoActionsComponent = ({
  selectedCount,
  totalCount,
  viewMode,
  sortBy,
  sortOrder,
  searchQuery,
  onSelectAll,
  onClearSelection,
  onViewModeChange,
  onSortChange,
  onSearchChange,
  onDownload,
  onDelete,
  onMove,
  onShare,
  onCopy,
  onFavorite,
  className,
}: PhotoActionsProps) => {
  const hasSelection = selectedCount > 0;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 p-4 bg-white border-b', className)}>
      {/* Search and filters row */}
      <div className="flex-1 flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder={`Search ${totalCount} photos...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
          <div className="absolute left-2.5 top-2.5">
            <SearchIcon className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <FilterIcon className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSortChange('name', sortOrder)}>
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('date', sortOrder)}>
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('size', sortOrder)}>
              Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode toggle */}
        <div className="flex border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="px-2"
          >
            <GridIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="px-2"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection and action buttons */}
      <div className="flex items-center gap-2">
        {/* Selection summary */}
        {hasSelection ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            disabled={totalCount === 0}
            className="text-xs"
          >
            Select all
          </Button>
        )}

        {/* Action buttons */}
        {hasSelection && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-1"
            >
              <DownloadIcon className="h-4 w-4" />
              Download
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onMove}
              className="gap-1"
            >
              <MoveIcon className="h-4 w-4" />
              Move
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onFavorite} className="gap-2">
                  <StarIcon className="h-4 w-4" />
                  Add to favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopy} className="gap-2">
                  <CopyIcon className="h-4 w-4" />
                  Copy links
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare} className="gap-2">
                  <ShareIcon className="h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete} 
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export const PhotoActions = memo(PhotoActionsComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedCount === nextProps.selectedCount &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder &&
    prevProps.searchQuery === nextProps.searchQuery
  );
});

PhotoActions.displayName = 'PhotoActions';