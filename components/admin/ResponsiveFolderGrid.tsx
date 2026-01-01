'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
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
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());

  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Handle action with loading state
  const handleAction = useCallback(
    async (codeId: string, action: () => Promise<void>, actionType: string) => {
      setActionLoading((prev) => ({
        ...prev,
        [`${codeId}_${actionType}`]: true,
      }));
      try {
        await action();
      } catch (error) {
        console.error(`Error ${actionType}:`, error);
      } finally {
        setActionLoading((prev) => ({
          ...prev,
          [`${codeId}_${actionType}`]: false,
        }));
      }
    },
    []
  );

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async (code: CodeRow) => {
    if (!code.token) return;

    const url = `${window.location.origin}/store-unified/${code.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied((prev) => ({ ...prev, [code.id]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [code.id]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  }, []);

  // Toggle card selection
  const handleToggleSelection = useCallback(
    (codeId: string) => {
      if (!onSelectionChange) return;

      const isSelected = selectedCodes.includes(codeId);
      if (isSelected) {
        onSelectionChange(selectedCodes.filter((id) => id !== codeId));
      } else {
        onSelectionChange([...selectedCodes, codeId]);
      }
    },
    [selectedCodes, onSelectionChange]
  );

  // Toggle card expansion
  const handleToggleExpanded = useCallback((codeId: string) => {
    setExpandedCards((prev) => {
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
    setImagesLoaded((prev) => new Set([...prev, codeId]));
  }, []);

  const handleImageError = useCallback((codeId: string) => {
    setImageErrors((prev) => new Set([...prev, codeId]));
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
      const familyUrl = code.token
        ? `${window.location.origin}/store-unified/${code.token}`
        : '';
      const qrUrl = code.token
        ? `/access?token=${encodeURIComponent(code.token)}`
        : '';

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
            'neural-glass-card rounded-xl border p-4',
            'transition-all duration-300 ease-out',
            'hover:-translate-y-0.5 hover:shadow-lg',
            'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
            isSelected && 'bg-primary-50/50 ring-2 ring-primary-500',
            code.is_published
              ? 'border-emerald-200 bg-emerald-50/30'
              : 'border-border bg-white',
            'min-h-[200px] sm:min-h-[240px]' // Minimum height for consistent layout
          )}
        >
          {/* Selection checkbox for bulk actions */}
          {enableBulkActions && (
            <div className="absolute left-3 top-3 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleSelection(code.id)}
                className="h-4 min-h-[16px] w-4 min-w-[16px] rounded border-border text-primary-600 focus:ring-primary-500"
                aria-label={`Seleccionar ${code.code_value}`}
              />
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute right-3 top-3">
            {code.is_published ? (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-xs font-medium text-emerald-800"
              >
                <Eye className="mr-1 h-3 w-3" />
                Publicado
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-xs font-medium text-foreground"
              >
                <EyeOff className="mr-1 h-3 w-3" />
                Privado
              </Badge>
            )}
          </div>

          {/* Photo preview */}
          <div className="mb-4 mt-8">
            {code.preview_photos && code.preview_photos.length > 0 ? (
              <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted">
                {!isImageLoaded && !hasImageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {/* Photo count overlay */}
                {code.photos_count > 1 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    +{code.photos_count - 1} fotos
                  </div>
                )}

                {/* Preview button */}
                {onPreview && (
                  <button
                    onClick={() => onPreview(code)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-label={`Vista previa de ${code.code_value}`}
                  >
                    <Eye className="h-6 w-6 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted">
                <Camera className="h-8 w-8 text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Sin fotos</span>
              </div>
            )}
          </div>

          {/* Card header */}
          <div className="space-y-3">
            <div>
              <h3 className="truncate text-lg font-semibold text-foreground">
                {code.code_value}
              </h3>
              <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{code.photos_count} fotos</span>
                </div>
                {code.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
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
                  onClick={() =>
                    handleAction(code.id, () => onPublish(code.id), 'publish')
                  }
                  disabled={actionLoading[`${code.id}_publish`]}
                  className="min-h-[44px] w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700"
                  aria-label={`Publicar ${code.code_value}`}
                >
                  {actionLoading[`${code.id}_publish`] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
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
                    className="min-h-[44px] flex-1 font-medium"
                    aria-label={`Copiar enlace de ${code.code_value}`}
                  >
                    {copied[code.id] ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleToggleExpanded(code.id)}
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] min-w-[44px] px-3"
                    aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} opciones`}
                  >
                    <MoreVertical
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </Button>
                </div>
              )}

              {/* Expanded actions */}
              {isExpanded && code.is_published && (
                <div className="space-y-2 border-t border-border pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => window.open(qrUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="min-h-[40px] justify-start"
                      aria-label={`Ver QR de ${code.code_value}`}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      <span>QR</span>
                    </Button>

                    <Button
                      onClick={() => window.open(familyUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="min-h-[40px] justify-start"
                      aria-label={`Abrir galería de ${code.code_value}`}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span>Abrir</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() =>
                        handleAction(
                          code.id,
                          () => onRotateToken(code.id),
                          'rotate'
                        )
                      }
                      disabled={actionLoading[`${code.id}_rotate`]}
                      variant="ghost"
                      size="sm"
                      className="min-h-[40px] justify-start text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:text-blue-800"
                      aria-label={`Rotar token de ${code.code_value}`}
                    >
                      {actionLoading[`${code.id}_rotate`] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      <span>Rotar</span>
                    </Button>

                    <Button
                      onClick={() =>
                        handleAction(
                          code.id,
                          () => onUnpublish(code.id),
                          'unpublish'
                        )
                      }
                      disabled={actionLoading[`${code.id}_unpublish`]}
                      variant="ghost"
                      size="sm"
                      className="min-h-[40px] justify-start text-red-700 hover:bg-red-50 hover:text-red-800"
                      aria-label={`Despublicar ${code.code_value}`}
                    >
                      {actionLoading[`${code.id}_unpublish`] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <EyeOff className="mr-2 h-4 w-4" />
                      )}
                      <span>Despublicar</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Last accessed info */}
            {code.last_accessed && code.is_published && (
              <div className="border-t border-border pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
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
    handleImageError,
  ]);

  if (loading) {
    return <ResponsiveFolderGridSkeleton />;
  }

  if (codes.length === 0) {
    return (
      <div className="py-16 text-center">
        <Camera className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-foreground">
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
        'grid-cols-1', // Mobile: 1 column
        'sm:grid-cols-2', // Small: 2 columns
        'lg:grid-cols-3', // Large: 3 columns
        'xl:grid-cols-4', // XL: 4 columns
        '2xl:grid-cols-5', // 2XL: 5 columns
        'auto-rows-fr', // Equal height rows
        className
      )}
    >
      {cardComponents}
    </div>
  );
}

// Skeleton loading component
export function ResponsiveFolderGridSkeleton({
  count = 8,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="neural-glass-card min-h-[240px] rounded-xl border p-4"
        >
          {/* Status badge skeleton */}
          <div className="mb-4 flex items-start justify-between">
            <div /> {/* Spacer */}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Image skeleton */}
          <Skeleton className="mb-4 h-32 w-full rounded-lg" />

          {/* Content skeleton */}
          <div className="space-y-3">
            <div>
              <Skeleton className="mb-2 h-6 w-3/4" />
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

  const handleBulkPublish = useCallback(
    async (
      codeIds: string[],
      publishAction: (codeId: string) => Promise<void>
    ) => {
      setBulkActionLoading(true);
      try {
        await Promise.all(codeIds.map((id) => publishAction(id)));
        setSelectedCodes([]);
      } catch (error) {
        console.error('Error in bulk publish:', error);
      } finally {
        setBulkActionLoading(false);
      }
    },
    []
  );

  const handleBulkUnpublish = useCallback(
    async (
      codeIds: string[],
      unpublishAction: (codeId: string) => Promise<void>
    ) => {
      setBulkActionLoading(true);
      try {
        await Promise.all(codeIds.map((id) => unpublishAction(id)));
        setSelectedCodes([]);
      } catch (error) {
        console.error('Error in bulk unpublish:', error);
      } finally {
        setBulkActionLoading(false);
      }
    },
    []
  );

  const selectAll = useCallback((codes: CodeRow[]) => {
    setSelectedCodes(codes.map((code) => code.id));
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
