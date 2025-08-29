/**
 * ASSET GRID COMPONENT
 *
 * Displays photos in responsive grid with download controls
 * Features: Lazy loading, pagination, download permissions, modal preview
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DownloadIcon,
  EyeIcon,
  ZoomInIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
} from 'lucide-react';
import { GalleryAsset } from '@/lib/services/hierarchical-gallery.service';
import { formatFileSize, formatDate } from '@/lib/utils';
import { AssetModal } from './AssetModal';

interface AssetGridProps {
  assets: GalleryAsset[];
  token: string;
  canDownload: boolean;
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
  onPageChange: (page: number) => void;
  onAssetSelect?: (asset: GalleryAsset | null) => void;
}

export function AssetGrid({
  assets,
  token,
  canDownload,
  pagination,
  onPageChange,
  onAssetSelect,
}: AssetGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<GalleryAsset | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleAssetClick = (asset: GalleryAsset) => {
    setSelectedAsset(asset);
    onAssetSelect?.(asset);
  };

  const closeModal = () => {
    setSelectedAsset(null);
    onAssetSelect?.(null);
  };

  const handleDownload = async (asset: GalleryAsset, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent modal from opening

    if (!canDownload) return;

    setDownloadingIds((prev) => new Set(prev).add(asset.id));

    try {
      // Call our download API endpoint
      const response = await fetch(`/api/s/${token}/download/${asset.id}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = asset.filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // TODO: Show error toast
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
  };

  const getPreviewUrl = (asset: GalleryAsset): string => {
    // Fallback to watermark path if no preview
    return asset.previewPath || `/api/s/${token}/preview/${asset.id}`;
  };

  const renderPaginationControls = () => {
    const { page, hasMore, total } = pagination;
    const totalPages = Math.ceil(total / 20);
    const startItem = (page - 1) * 20 + 1;
    const endItem = Math.min(page * 20, total);

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-gray-600">
          Showing {startItem}-{endItem} of {total} photos
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>

          <span className="px-2 text-sm font-medium">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Asset Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
            onClick={() => handleAssetClick(asset)}
          >
            <div className="relative aspect-square">
              {/* Image */}
              <Image
                src={getPreviewUrl(asset)}
                alt={asset.filename}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                className="object-cover transition-transform group-hover:scale-105"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-60">
                <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button size="sm" variant="secondary">
                    <ZoomInIcon className="h-4 w-4" />
                  </Button>
                  {canDownload && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => handleDownload(asset, e)}
                      disabled={downloadingIds.has(asset.id)}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Info */}
            <CardContent className="p-3">
              <div className="space-y-1">
                <div
                  className="truncate text-xs font-medium"
                  title={asset.filename}
                >
                  {asset.filename}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(asset.fileSize)}</span>
                  {canDownload ? (
                    <Badge variant="secondary" className="text-xs">
                      <DownloadIcon className="mr-1 h-2 w-2" />
                      Download
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <EyeIcon className="mr-1 h-2 w-2" />
                      View Only
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(asset.createdAt)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {assets.length === 0 && (
        <div className="py-12 text-center">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No photos found
          </h3>
          <p className="text-gray-600">
            There are no photos available in this selection.
          </p>
        </div>
      )}

      {/* Pagination */}
      {assets.length > 0 && pagination.total > 20 && renderPaginationControls()}

      {/* Asset Modal */}
      {selectedAsset && (
        <AssetModal
          asset={selectedAsset}
          token={token}
          canDownload={canDownload}
          onClose={closeModal}
          onDownload={() => handleDownload(selectedAsset)}
          isDownloading={downloadingIds.has(selectedAsset.id)}
        />
      )}
    </div>
  );
}
