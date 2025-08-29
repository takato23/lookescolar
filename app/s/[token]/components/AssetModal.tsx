/**
 * ASSET MODAL COMPONENT
 * 
 * Full-screen modal for photo viewing with download controls
 * Features: High-res viewing, metadata display, download permissions
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DownloadIcon, 
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
  EyeIcon,
  CalendarIcon,
  HardDriveIcon
} from 'lucide-react';
import { GalleryAsset } from '@/lib/services/hierarchical-gallery.service';
import { formatFileSize, formatDate } from '@/lib/utils';

interface AssetModalProps {
  asset: GalleryAsset;
  token: string;
  canDownload: boolean;
  onClose: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

export function AssetModal({ 
  asset, 
  token, 
  canDownload, 
  onClose, 
  onDownload, 
  isDownloading 
}: AssetModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getImageUrl = () => {
    // Use preview for viewing, original for download would require different endpoint
    return asset.previewPath || `/api/s/${token}/preview/${asset.id}`;
  };

  const handleImageClick = () => {
    setZoom(!zoom);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {asset.filename}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {canDownload && (
                <Button
                  size="sm"
                  onClick={handleDownloadClick}
                  disabled={isDownloading}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div className="flex-1 overflow-auto">
          <div 
            className={`relative w-full min-h-[400px] cursor-pointer transition-all ${
              zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={handleImageClick}
          >
            <Image
              src={getImageUrl()}
              alt={asset.filename}
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className={`object-contain transition-transform duration-200 ${
                zoom ? 'scale-150' : 'scale-100'
              }`}
              onLoad={() => setImageLoaded(true)}
              priority
            />
            
            {/* Loading State */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-gray-500">Loading image...</div>
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 rounded-md p-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(!zoom);
                }}
              >
                {zoom ? (
                  <ZoomOutIcon className="h-4 w-4" />
                ) : (
                  <ZoomInIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer with Metadata */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* File Info */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">File Details</h4>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center gap-2">
                  <HardDriveIcon className="h-3 w-3" />
                  <span>{formatFileSize(asset.fileSize)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{formatDate(asset.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Permissions</h4>
              <div className="space-y-2">
                {canDownload ? (
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <DownloadIcon className="h-3 w-3" />
                    Download Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <EyeIcon className="h-3 w-3" />
                    View Only
                  </Badge>
                )}
              </div>
            </div>

            {/* Usage Instructions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
              <div className="text-gray-600 text-xs space-y-1">
                <div>• Click image to zoom in/out</div>
                <div>• Use ESC key to close</div>
                {canDownload && <div>• Download button saves original quality</div>}
                {!canDownload && <div>• Contact admin for download access</div>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}