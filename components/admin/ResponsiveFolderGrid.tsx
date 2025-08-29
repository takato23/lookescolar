'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Eye,
  EyeOff,
  MoreVertical,
  Users,
  Calendar,
  Camera,
  Link2,
  QrCode,
  Copy,
  RotateCcw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CodeRow {
  id: string;
  event_id: string;
  course_id: string | null;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count: number;
  created_at?: string;
  last_accessed?: string;
  preview_photos?: string[];
}

interface ResponsiveFolderGridProps {
  codes: CodeRow[];
  loading: boolean;
  onPublish: (codeId: string) => Promise<void>;
  onUnpublish: (codeId: string) => Promise<void>;
  onRotateToken: (codeId: string) => Promise<void>;
  onPreview?: (code: CodeRow) => void;
  selectedCodes?: string[];
  onSelectionChange?: (codeIds: string[]) => void;
  enableBulkActions?: boolean;
  className?: string;
}

export function ResponsiveFolderGrid({
  codes,
  loading,
  onPublish,
  onUnpublish,
  onRotateToken,
  onPreview,
  selectedCodes = [],
  onSelectionChange,
  enableBulkActions = false,
  className,
}: ResponsiveFolderGridProps) {
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Handle action with loading state
  const handleAction = useCallback(async (
    codeId: string,
    action: () => Promise<void>,
    actionType: string
  ) => {
    setActionLoading(prev => ({ ...prev, [`${codeId}_${actionType}`]: true }));
    try {
      await action();
    } catch (error) {
      console.error(`Error ${actionType}:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${codeId}_${actionType}`]: false }));
    }
  }, []);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async (code: CodeRow) => {
    if (!code.token) return;
    
    // Use public shared gallery route for consistent previewing
    const url = `${window.location.origin}/public/gallery/${code.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(prev => ({ ...prev, [code.id]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [code.id]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  }, []);

  // Toggle card selection
  const handleToggleSelection = useCallback((codeId: string) => {
    if (!onSelectionChange) return;
    
    const isSelected = selectedCodes.includes(codeId);
    if (isSelected) {
      onSelectionChange(selectedCodes.filter(id => id !== codeId));
    } else {
      onSelectionChange([...selectedCodes, codeId]);
    }
  }, [selectedCodes, onSelectionChange]);

  // Toggle card expansion
  const handleToggleExpanded = useCallback((codeId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codeId)) {
        newSet.delete(codeId);
      } else {
        newSet.add(codeId);
      }
      return newSet;
    });
  }, []);

  // Handle image load/error
  const handleImageLoad = useCallback((codeId: string) => {
    setImagesLoaded(prev => new Set([...prev, codeId]));
  }, []);

  const handleImageError = useCallback((codeId: string) => {
    setImageErrors(prev => new Set([...prev, codeId]));
  }, []);

  // Format date helper
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Memoized cards to avoid re-renders
  const cardComponents = useMemo(() => {
    return codes.map((code) => {
      const isSelected = selectedCodes.includes(code.id);
      const isExpanded = expandedCards.has(code.id);
      const hasImageError = imageErrors.has(code.id);
      const isImageLoaded = imagesLoaded.has(code.id);
      const familyUrl = code.token ? `${window.location.origin}/public/gallery/${code.token}` : '';
      const qrUrl = code.token ? `/api/qr?token=${encodeURIComponent(code.token)}` : '';

      return (
        <div
          key={code.id}
          ref={(el) => {
            if (el) {
              cardRefs.current.set(code.id, el);
            } else {
              cardRefs.current.delete(code.id);
            }
          }}
          className={cn(
            'group relative',
            'neural-glass-card border rounded-xl p-4',
            'transition-all duration-300 ease-out',
            'hover:shadow-lg hover:-translate-y-0.5',
            'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
            isSelected && 'ring-2 ring-primary-500 bg-primary-50/50',
            code.is_published 
              ? 'border-emerald-200 bg-emerald-50/30' 
              : 'border-gray-200 bg-white',
            'min-h-[200px] sm:min-h-[240px]' // Minimum height for consistent layout
          )}
        >
          {/* Selection checkbox for bulk actions */}
          {enableBulkActions && (
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleSelection(code.id)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 min-h-[16px] min-w-[16px]"
                aria-label={`Seleccionar ${code.code_value}`}
              />
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute top-3 right-3">
            {code.is_published ? (
              <Badge 
                variant="secondary" 
                className="bg-emerald-100 text-emerald-800 text-xs font-medium"
              >
                <Eye className="w-3 h-3 mr-1" />
                Publicado
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="bg-gray-100 text-gray-700 text-xs font-medium"
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Privado
              </Badge>
            )}
          </div>

          {/* Photo preview */}
          <div className="mb-4 mt-8">
            {code.preview_photos && code.preview_photos.length > 0 ? (
              <div className="relative h-32 w-full rounded-lg overflow-hidden bg-gray-100">
                {!isImageLoaded && !hasImageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
                
                {!hasImageError ? (
                  <Image
                    src={code.preview_photos[0]}
                    alt={`Vista previa de ${code.code_value}`}
                    fill
                    className={cn(
                      'object-cover transition-opacity duration-300',
                      isImageLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => handleImageLoad(code.id)}
                    onError={() => handleImageError(code.id)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                {/* Photo count overlay */}
                {code.photos_count > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                    +{code.photos_count - 1} fotos
                  </div>
                )}

                {/* Preview button */}
                {onPreview && (
                  <button
                    onClick={() => onPreview(code)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label={`Vista previa de ${code.code_value}`}
                  >
                    <Eye className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-32 w-full rounded-lg bg-gray-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="ml-2 text-gray-500 text-sm">Sin fotos</span>
              </div>
            )}
          </div>

          {/* Card header */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {code.code_value}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{code.photos_count} fotos</span>
                </div>
                {code.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(code.created_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Primary action button */}
              {!code.is_published ? (
                <Button
                  onClick={() => handleAction(code.id, () => onPublish(code.id), 'publish')}
                  disabled={actionLoading[`${code.id}_publish`]}
                  className="w-full font-medium min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  aria-label={`Publicar ${code.code_value}`}
                >
                  {actionLoading[`${code.id}_publish`] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      <span>Publicar</span>
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopyUrl(code)}
                    disabled={!code.token}
                    variant="outline"
                    className="flex-1 font-medium min-h-[44px]"
                    aria-label={`Copiar enlace de ${code.code_value}`}
                  >
                    {copied[code.id] ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        <span className="text-emerald-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleToggleExpanded(code.id)}
                    variant="outline"
                    size="sm"
                    className="px-3 min-h-[44px] min-w-[44px]"
                    aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} opciones`}
                  >
                    <MoreVertical className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )} />
                  </Button>
                </div>
              )}

              {/* Expanded actions */}
              {isExpanded && code.is_published && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => window.open(qrUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="justify-start min-h-[40px]"
                      aria-label={`Ver QR de ${code.code_value}`}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      <span>QR</span>
                    </Button>
                    
                    <Button
                      onClick={() => window.open(familyUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="justify-start min-h-[40px]"
                      aria-label={`Abrir galería de ${code.code_value}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span>Abrir</span>
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleAction(code.id, () => onRotateToken(code.id), 'rotate')}
                      disabled={actionLoading[`${code.id}_rotate`]}
                      variant="ghost"
                      size="sm"
                      className="justify-start min-h-[40px] text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                      aria-label={`Rotar token de ${code.code_value}`}
                    >
                      {actionLoading[`${code.id}_rotate`] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      <span>Rotar</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleAction(code.id, () => onUnpublish(code.id), 'unpublish')}
                      disabled={actionLoading[`${code.id}_unpublish`]}
                      variant="ghost"
                      size="sm"
                      className="justify-start min-h-[40px] text-red-700 hover:text-red-800 hover:bg-red-50"
                      aria-label={`Despublicar ${code.code_value}`}
                    >
                      {actionLoading[`${code.id}_unpublish`] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <EyeOff className="w-4 h-4 mr-2" />
                      )}
                      <span>Despublicar</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Last accessed info */}
            {code.last_accessed && code.is_published && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Último acceso: {formatDate(code.last_accessed)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [
    codes, 
    selectedCodes, 
    expandedCards, 
    actionLoading, 
    copied, 
    imageErrors, 
    imagesLoaded, 
    enableBulkActions,
    handleAction,
    handleCopyUrl,
    handleToggleSelection,
    handleToggleExpanded,
    onPublish,
    onUnpublish,
    onRotateToken,
    onPreview,
    formatDate,
    handleImageLoad,
    handleImageError
  ]);

  if (loading) {
    return <ResponsiveFolderGridSkeleton />;
  }

  if (codes.length === 0) {
    return (
      <div className="text-center py-16">
        <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay códigos disponibles
        </h3>
        <p className="text-gray-500">
          Los códigos aparecerán aquí cuando se generen para el evento
        </p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={cn(
        'grid gap-4',
        'grid-cols-1',                    // Mobile: 1 column
        'sm:grid-cols-2',                 // Small: 2 columns  
        'lg:grid-cols-3',                 // Large: 3 columns
        'xl:grid-cols-4',                 // XL: 4 columns
        '2xl:grid-cols-5',                // 2XL: 5 columns
        'auto-rows-fr',                   // Equal height rows
        className
      )}
    >
      {cardComponents}
    </div>
  );
}

// Skeleton loading component
export function ResponsiveFolderGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="neural-glass-card border rounded-xl p-4 min-h-[240px]"
        >
          {/* Status badge skeleton */}
          <div className="flex justify-between items-start mb-4">
            <div /> {/* Spacer */}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Image skeleton */}
          <Skeleton className="h-32 w-full rounded-lg mb-4" />

          {/* Content skeleton */}
          <div className="space-y-3">
            <div>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Button skeleton */}
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Hook to use with React Query
export function useFolderGrid() {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const handleBulkPublish = useCallback(async (
    codeIds: string[],
    publishAction: (codeId: string) => Promise<void>
  ) => {
    setBulkActionLoading(true);
    try {
      await Promise.all(codeIds.map(id => publishAction(id)));
      setSelectedCodes([]);
    } catch (error) {
      console.error('Error in bulk publish:', error);
    } finally {
      setBulkActionLoading(false);
    }
  }, []);

  const handleBulkUnpublish = useCallback(async (
    codeIds: string[],
    unpublishAction: (codeId: string) => Promise<void>
  ) => {
    setBulkActionLoading(true);
    try {
      await Promise.all(codeIds.map(id => unpublishAction(id)));
      setSelectedCodes([]);
    } catch (error) {
      console.error('Error in bulk unpublish:', error);
    } finally {
      setBulkActionLoading(false);
    }
  }, []);

  const selectAll = useCallback((codes: CodeRow[]) => {
    setSelectedCodes(codes.map(code => code.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCodes([]);
  }, []);

  return {
    selectedCodes,
    setSelectedCodes,
    bulkActionLoading,
    handleBulkPublish,
    handleBulkUnpublish,
    selectAll,
    clearSelection,
  };
}
