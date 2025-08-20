'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ImageIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  TagIcon,
  MoreVerticalIcon,
  EyeIcon,
  TrashIcon,
  DownloadIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  event_id?: string;
  event?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  width?: number;
  height?: number;
}

interface PhotoListViewProps {
  photos: Photo[];
  selectedPhotos: string[];
  onPhotoSelect: (photoId: string, selected: boolean) => void;
  onPhotoView: (photo: Photo) => void;
  onPhotoApprove?: (photoId: string, approved: boolean) => void;
  onPhotoDelete?: (photoId: string) => void;
  onPhotoTag?: (photoId: string) => void;
  className?: string;
}

export function PhotoListView({
  photos,
  selectedPhotos,
  onPhotoSelect,
  onPhotoView,
  onPhotoApprove,
  onPhotoDelete,
  onPhotoTag,
  className
}: PhotoListViewProps) {
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  const handleImageError = (photoId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(photoId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {photos.map((photo) => {
        const isSelected = selectedPhotos.includes(photo.id);
        const hasImageError = imageLoadErrors.has(photo.id);
        
        return (
          <div
            key={photo.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-all duration-200",
              "hover:shadow-md hover:border-primary/20",
              isSelected 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-border bg-card"
            )}
          >
            {/* Checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onPhotoSelect(photo.id, !!checked)}
              className="shrink-0"
            />

            {/* Image Thumbnail */}
            <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
              {!hasImageError && photo.preview_url ? (
                <Image
                  src={photo.preview_url}
                  alt={photo.original_filename}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(photo.id)}
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Photo Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 
                  className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onPhotoView(photo)}
                  title={photo.original_filename}
                >
                  {photo.original_filename}
                </h3>
                
                {/* Status Badges */}
                <div className="flex gap-1 shrink-0">
                  {photo.approved ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Aprobada
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                      <XCircleIcon className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                  
                  {photo.tagged && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5">
                      <TagIcon className="w-3 h-3 mr-1" />
                      Etiquetada
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(photo.file_size)}</span>
                <span>{formatDate(photo.created_at)}</span>
                {photo.width && photo.height && (
                  <span>{photo.width} × {photo.height}</span>
                )}
                {photo.event && (
                  <Badge variant="outline" className="text-xs">
                    📸 {photo.event.name}
                  </Badge>
                )}
                {photo.subject && (
                  <Badge variant="outline" className="text-xs">
                    👤 {photo.subject.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPhotoView(photo)}
                className="h-8 w-8 p-0"
                title="Ver foto"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVerticalIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onPhotoApprove && (
                    <DropdownMenuItem
                      onClick={() => onPhotoApprove(photo.id, !photo.approved)}
                    >
                      {photo.approved ? (
                        <>
                          <XCircleIcon className="w-4 h-4 mr-2" />
                          Desaprobar
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          Aprobar
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {onPhotoTag && (
                    <DropdownMenuItem onClick={() => onPhotoTag(photo.id)}>
                      <TagIcon className="w-4 h-4 mr-2" />
                      Etiquetar
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem
                    onClick={() => window.open(photo.preview_url || '', '_blank')}
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Descargar
                  </DropdownMenuItem>
                  
                  {onPhotoDelete && (
                    <DropdownMenuItem
                      onClick={() => onPhotoDelete(photo.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}

      {photos.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron fotos
          </p>
        </div>
      )}
    </div>
  );
}