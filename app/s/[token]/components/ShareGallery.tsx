/**
 * SHARE GALLERY COMPONENT
 *
 * Main gallery component for hierarchical token access
 * Features: Folder navigation, asset grid, download permissions, responsive design
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FolderIcon,
  ImageIcon,
  DownloadIcon,
  EyeIcon,
  ClockIcon,
  UsersIcon,
  HardDriveIcon,
} from 'lucide-react';
import {
  GalleryContext,
  GalleryFolder,
  GalleryAsset,
} from '@/lib/services/hierarchical-gallery.service';
import { AssetGrid } from './AssetGrid';
import { FolderList } from './FolderList';
import { GalleryHeader } from './GalleryHeader';
import { formatFileSize, formatDate } from '@/lib/utils';

interface ShareGalleryProps {
  token: string;
  context: GalleryContext;
  folders: GalleryFolder[];
  assets: GalleryAsset[];
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
  stats: {
    totalFolders: number;
    totalAssets: number;
    totalSize: number;
    oldestAsset?: Date;
    newestAsset?: Date;
  };
  selectedFolder?: string;
}

export function ShareGallery({
  token,
  context,
  folders,
  assets,
  pagination,
  stats,
  selectedFolder,
}: ShareGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAsset, setSelectedAsset] = useState<GalleryAsset | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'assets' | 'both'>(
    'both'
  );

  // Auto-determine view mode based on content
  useEffect(() => {
    if (folders.length === 0 && assets.length > 0) {
      setViewMode('assets');
    } else if (folders.length > 0 && assets.length === 0) {
      setViewMode('folders');
    } else {
      setViewMode('both');
    }
  }, [folders.length, assets.length]);

  const handleFolderSelect = (folderId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('folder', folderId);
    params.delete('page'); // Reset to first page
    router.push(`/s/${token}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/s/${token}?${params.toString()}`);
  };

  const clearFolderFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('folder');
    params.delete('page');
    router.push(`/s/${token}?${params.toString()}`);
  };

  const getScopeIcon = () => {
    switch (context.scope) {
      case 'event':
        return '🏫';
      case 'course':
        return '📚';
      case 'family':
        return '👨‍👩‍👧‍👦';
      default:
        return '📁';
    }
  };

  const getScopeLabel = () => {
    switch (context.scope) {
      case 'event':
        return 'School Event';
      case 'course':
        return 'Course Gallery';
      case 'family':
        return 'Family Gallery';
      default:
        return 'Gallery';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <GalleryHeader
        context={context}
        stats={stats}
        icon={getScopeIcon()}
        label={getScopeLabel()}
      />

      <div className="container mx-auto space-y-6 px-4 py-6">
        {/* Gallery Stats Overview */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FolderIcon className="mx-auto mb-2 h-6 w-6 text-blue-600" />
              <div className="text-2xl font-bold">{stats.totalFolders}</div>
              <div className="text-muted-foreground text-sm">Folders</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <ImageIcon className="mx-auto mb-2 h-6 w-6 text-green-600" />
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
              <div className="text-muted-foreground text-sm">Photos</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <HardDriveIcon className="mx-auto mb-2 h-6 w-6 text-purple-600" />
              <div className="text-2xl font-bold">
                {formatFileSize(stats.totalSize)}
              </div>
              <div className="text-muted-foreground text-sm">Total Size</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              {context.canDownload ? (
                <DownloadIcon className="mx-auto mb-2 h-6 w-6 text-green-600" />
              ) : (
                <EyeIcon className="mx-auto mb-2 h-6 w-6 text-gray-600" />
              )}
              <div className="text-sm font-medium">
                {context.canDownload ? 'Can Download' : 'View Only'}
              </div>
              <div className="text-muted-foreground text-xs">
                {context.accessLevel === 'full' ? 'Full Access' : 'Read Only'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Folder Filter */}
        {selectedFolder && (
          <div className="flex items-center gap-2 rounded-lg border bg-blue-50 p-3">
            <FolderIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm">
              Viewing folder:{' '}
              {folders.find((f) => f.id === selectedFolder)?.name || 'Unknown'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFolderFilter}
              className="ml-auto"
            >
              View All
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Folders Section */}
          {(viewMode === 'folders' || viewMode === 'both') &&
            folders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderIcon className="h-5 w-5" />
                    Folders ({folders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FolderList
                    folders={folders}
                    onFolderSelect={handleFolderSelect}
                    selectedFolder={selectedFolder}
                  />
                </CardContent>
              </Card>
            )}

          {/* Assets Section */}
          {(viewMode === 'assets' || viewMode === 'both') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos ({pagination.total})
                  {selectedFolder && (
                    <Badge variant="secondary" className="ml-2">
                      Filtered
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assets.length > 0 ? (
                  <AssetGrid
                    assets={assets}
                    token={token}
                    canDownload={context.canDownload}
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onAssetSelect={setSelectedAsset}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">
                      No photos found
                    </h3>
                    <p className="text-gray-600">
                      {selectedFolder
                        ? 'This folder contains no photos yet.'
                        : 'No photos have been shared with this access level yet.'}
                    </p>
                    {selectedFolder && (
                      <Button
                        variant="outline"
                        onClick={clearFolderFilter}
                        className="mt-4"
                      >
                        View All Folders
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {folders.length === 0 && assets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mb-4 text-6xl">{getScopeIcon()}</div>
                <h3 className="mb-2 text-xl font-medium text-gray-900">
                  Gallery is Empty
                </h3>
                <p className="mb-4 text-gray-600">
                  No content has been shared for this {context.scope} yet.
                </p>
                <div className="text-sm text-gray-500">
                  <div>
                    Access Level:{' '}
                    <Badge variant="outline">{context.accessLevel}</Badge>
                  </div>
                  <div className="mt-2">
                    Permissions:{' '}
                    {context.canDownload ? 'Download Enabled' : 'View Only'}
                  </div>
                  {context.expiresAt && (
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      Expires: {formatDate(context.expiresAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Info */}
        <div className="space-y-1 text-center text-sm text-gray-500">
          <div>Secured by LookEscolar • {getScopeLabel()}</div>
          {stats.oldestAsset && stats.newestAsset && (
            <div>
              Content from {formatDate(stats.oldestAsset)} to{' '}
              {formatDate(stats.newestAsset)}
            </div>
          )}
          {context.expiresAt && (
            <div className="flex items-center justify-center gap-1">
              <ClockIcon className="h-3 w-3" />
              Access expires: {formatDate(context.expiresAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
