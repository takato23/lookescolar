'use client';

/**
 * CleanPhotoAdmin - Rediseño del admin de fotos
 * Basado en el sistema de diseño clean (Pixieset-inspired)
 *
 * Mejoras sobre PhotoAdmin original:
 * - Header simplificado sin redundancias
 * - Panel de carpetas compacto
 * - Toolbar contextual para acciones
 * - Mejor uso del espacio
 * - Filtros colapsables
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { uploadFiles, createApiUrl } from '@/lib/utils/api-client';

// Import refactored modules
import { SafeImage } from '../photo-admin';
import { getPreviewUrl } from '../photo-admin';
import { photoAdminApi, egressMonitor, FolderTreePanel, InspectorPanel, PhotoGrid as PhotoGridPanel } from '../photo-admin';
import type { OptimizedFolder, OptimizedAsset } from '../photo-admin';

// DND Kit for drag & drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Icons
import {
  Search,
  Grid3X3,
  List,
  Upload,
  Trash2,
  FolderOpen,
  Folder,
  Image as ImageIcon,
  MoreVertical,
  RefreshCw,
  Settings,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  Users,
  AlertCircle,
  ArrowLeft,
  Move,
  Link2,
  Filter,
  ChevronUp,
  Check,
  Minus,
  Copy,
  ExternalLink,
  QrCode,
  Share2,
} from 'lucide-react';
import { PhotoUploadButton } from '../PhotoUploadButton';
import EventSelector from '../EventSelector';

// Import clean styles
import '@/styles/admin-clean.css';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedFolder extends OptimizedFolder {
  path: string;
  children?: UnifiedFolder[];
  metadata?: any;
  updated_at?: string;
}

interface UnifiedAsset extends OptimizedAsset {
  folder_id: string;
  original_path: string;
  checksum: string;
  mime_type: string;
  dimensions: { width?: number; height?: number } | null;
  metadata?: any;
  updated_at?: string;
}

interface CleanPhotoAdminProps {
  className?: string;
  enableUpload?: boolean;
  enableBulkOperations?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build a tree structure from a flat list of folders
 */
function buildFolderTree(flatFolders: OptimizedFolder[]): UnifiedFolder[] {
  const folderMap = new Map<string, UnifiedFolder>();
  const rootFolders: UnifiedFolder[] = [];

  // First pass: create all folder nodes
  for (const folder of flatFolders) {
    folderMap.set(folder.id, {
      ...folder,
      path: folder.name,
      children: [],
    });
  }

  // Second pass: build tree structure
  for (const folder of flatFolders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      const parent = folderMap.get(folder.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
      // Update path
      node.path = `${parent.path}/${folder.name}`;
    } else {
      rootFolders.push(node);
    }
  }

  return rootFolders;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Clean Filter Chip
function FilterChip({
  label,
  count,
  active,
  onClick
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'clean-filter-chip',
        active && 'clean-filter-chip--active'
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span className="clean-filter-chip-count">{count}</span>
      )}
    </button>
  );
}

// Clean Breadcrumb
function CleanBreadcrumb({
  items,
  onNavigate,
}: {
  items: { id: string; name: string }[];
  onNavigate: (id: string | null) => void;
}) {
  if (items.length === 0) {
    return (
      <span className="text-[var(--clean-text-muted)] text-sm">
        Raíz del evento
      </span>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      <button
        onClick={() => onNavigate(null)}
        className="text-[var(--clean-text-muted)] hover:text-[var(--clean-text)] transition-colors shrink-0"
      >
        <Home className="w-4 h-4" />
      </button>
      {items.map((item, idx) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 text-[var(--clean-text-muted)] shrink-0" />
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              'hover:text-[var(--clean-accent)] transition-colors truncate max-w-[150px]',
              idx === items.length - 1
                ? 'text-[var(--clean-text)] font-medium'
                : 'text-[var(--clean-text-secondary)]'
            )}
            title={item.name}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

// Selection Toolbar (aparece cuando hay selección)
function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onMove,
  onCreateAlbum,
  isDeleting,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCreateAlbum: () => void;
  isDeleting: boolean;
}) {
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div className="clean-selection-toolbar">
      <div className="clean-selection-toolbar-left">
        <button
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="clean-selection-checkbox"
          title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
        >
          {allSelected ? (
            <Check className="w-4 h-4" />
          ) : someSelected ? (
            <Minus className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4 border border-current rounded-sm" />
          )}
        </button>
        <span className="clean-selection-count">
          {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
        </span>
        {selectedCount > 0 && (
          <button
            onClick={onClearSelection}
            className="clean-selection-clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="clean-selection-toolbar-actions">
          <button
            onClick={onCreateAlbum}
            className="clean-toolbar-btn clean-toolbar-btn--primary"
            title="Generar tienda"
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Generar tienda</span>
          </button>
          <button
            onClick={onMove}
            className="clean-toolbar-btn"
            title="Mover fotos"
          >
            <Move className="w-4 h-4" />
            <span className="hidden sm:inline">Mover</span>
          </button>
          <button
            onClick={onDelete}
            className="clean-toolbar-btn clean-toolbar-btn--danger"
            disabled={isDeleting}
            title="Eliminar fotos"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Compact Folder Item
function CompactFolderItem({
  folder,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  depth = 0,
  photoCount,
}: {
  folder: UnifiedFolder;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  depth?: number;
  photoCount?: number;
}) {
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div
      className={cn(
        'clean-folder-item',
        isSelected && 'clean-folder-item--selected'
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="clean-folder-toggle"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ) : (
        <span className="clean-folder-toggle-spacer" />
      )}

      <button
        onClick={onSelect}
        className="clean-folder-content"
      >
        {isExpanded || !hasChildren ? (
          <FolderOpen className="w-4 h-4 text-[var(--clean-accent)]" />
        ) : (
          <Folder className="w-4 h-4 text-[var(--clean-text-muted)]" />
        )}
        <span className="clean-folder-name">{folder.name}</span>
        {typeof photoCount === 'number' && photoCount > 0 && (
          <span className="clean-folder-count">{photoCount}</span>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const api = photoAdminApi;

export default function CleanPhotoAdmin({
  className,
  enableUpload = true,
  enableBulkOperations = true,
}: CleanPhotoAdminProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // ---- Core State ----
  const initialFolderParam = (searchParams.get('folder_id') ||
    searchParams.get('folderId')) as string | null;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderParam);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'processing' | 'pending' | 'error'>('all');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);

  // Folder state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Event selection
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    const fromLocalStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('le:lastEventId')
        : null;
    const fromParams = (searchParams.get('event_id') ||
      searchParams.get('eventId')) as string | null;
    return fromLocalStorage || fromParams || null;
  });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    folder_name?: string;
    family_url?: string;
    store_url?: string;
    qr_url?: string;
    photo_count?: number;
    already_published?: boolean;
  } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const folderId = params.get('folder_id') || params.get('folderId');
      setSelectedFolderId(folderId);
      setSelectedAssetIds(new Set());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ---- Data Queries ----

  // Events list
  const { data: eventsList = [] } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: async () => {
      const res = await fetch(createApiUrl('/api/admin/events?limit=100'));
      if (!res.ok) return [];
      const json = await res.json();
      // API returns { data: { events: [...] } } or { events: [...] }
      return json.data?.events || json.events || json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Folders
  const {
    data: foldersData,
    isLoading: isLoadingFolders,
  } = useQuery({
    queryKey: ['optimized-folders', selectedEventId],
    queryFn: () => photoAdminApi.folders.list({ event_id: selectedEventId ?? undefined }),
    staleTime: 30 * 1000,
    enabled: !!selectedEventId,
  });

  const folders = useMemo(() => buildFolderTree(foldersData || []), [foldersData]);

  // Assets (photos)
  const {
    data: assetsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAssets,
  } = useInfiniteQuery({
    queryKey: ['optimized-assets', selectedFolderId, statusFilter, debouncedSearch, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!selectedFolderId) {
        return { assets: [], count: 0, hasMore: false };
      }
      return photoAdminApi.assets.list(selectedFolderId, {
        offset: pageParam,
        limit: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: debouncedSearch || undefined,
        include_children: true,
      });
    },
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + (p.assets?.length || 0), 0);
      return lastPage.hasMore ? totalFetched : undefined;
    },
    enabled: !!selectedFolderId,
    staleTime: 30 * 1000,
    initialPageParam: 0,
  });

  const assets = useMemo(
    () => assetsData?.pages.flatMap((p) => p.assets || []) || [],
    [assetsData]
  );

  const totalAssetsCount = assetsData?.pages[0]?.count || assets.length;

  // Breadcrumb
  const breadcrumbItems = useMemo(() => {
    if (!selectedFolderId || folders.length === 0) return [];

    const findPath = (
      folderId: string,
      folderList: UnifiedFolder[],
      path: { id: string; name: string }[] = []
    ): { id: string; name: string }[] | null => {
      for (const f of folderList) {
        if (f.id === folderId) {
          return [...path, { id: f.id, name: f.name }];
        }
        if (f.children && f.children.length > 0) {
          const found = findPath(folderId, f.children, [...path, { id: f.id, name: f.name }]);
          if (found) return found;
        }
      }
      return null;
    };

    return findPath(selectedFolderId, folders) || [];
  }, [selectedFolderId, folders]);

  // Selected assets
  const selectedAssets = useMemo(
    () => assets.filter((a) => selectedAssetIds.has(a.id)),
    [assets, selectedAssetIds]
  );

  // ---- Handlers ----

  const handleEventChange = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId);
    setSelectedFolderId(null);
    setSelectedAssetIds(new Set());
    if (eventId && typeof window !== 'undefined') {
      localStorage.setItem('le:lastEventId', eventId);
    }
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedAssetIds(new Set());
    // Close mobile sidebar when selecting a folder
    setIsMobileSidebarOpen(false);

    // Update URL with folder_id for browser navigation support
    const params = new URLSearchParams(window.location.search);
    if (folderId) {
      params.set('folder_id', folderId);
    } else {
      params.delete('folder_id');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  const toggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleAssetSelection = useCallback((assetId: string, multi = false) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(assetId)) {
          next.delete(assetId);
        } else {
          next.add(assetId);
        }
      } else {
        if (next.has(assetId) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(assetId);
        }
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAssetIds(new Set(assets.map((a) => a.id)));
  }, [assets]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssetIds(new Set());
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['optimized-folders'] });
    queryClient.invalidateQueries({ queryKey: ['optimized-assets'] });
    toast.success('Datos actualizados');
  }, [queryClient]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!selectedFolderId) {
      toast.error('Seleccioná una carpeta primero');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('folder_id', selectedFolderId);
      if (selectedEventId) formData.append('event_id', selectedEventId);

      const res = await fetch(createApiUrl('/api/admin/photos/bulk-upload'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const result = await res.json();
      toast.success(`${result.uploaded || files.length} fotos subidas`);
      handleRefresh();
    } catch (error) {
      toast.error('Error al subir fotos');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFolderId, selectedEventId, handleRefresh]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAssetIds.size === 0) return;

    setIsDeleting(true);
    try {
      const res = await fetch(createApiUrl('/api/admin/photos/bulk-delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selectedAssetIds) }),
      });

      if (!res.ok) throw new Error('Delete failed');

      toast.success(`${selectedAssetIds.size} fotos eliminadas`);
      setSelectedAssetIds(new Set());
      handleRefresh();
    } catch (error) {
      toast.error('Error al eliminar fotos');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedAssetIds, handleRefresh]);

  const handleCreateAlbum = useCallback(async () => {
    if (!selectedFolderId) {
      toast.error('Seleccioná una carpeta para publicar');
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch(createApiUrl(`/api/admin/folders/${selectedFolderId}/publish`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          settings: {
            allowDownload: false,
            watermarkLevel: 'medium',
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al publicar carpeta');
      }

      setPublishResult({
        success: true,
        folder_name: data.folder_name,
        family_url: data.family_url,
        store_url: data.store_url,
        qr_url: data.qr_url,
        photo_count: data.photo_count,
        already_published: data.already_published,
      });
      setShowPublishModal(true);

      if (data.already_published) {
        toast.success('Carpeta ya publicada - URLs disponibles');
      } else {
        toast.success('¡Carpeta publicada exitosamente!');
      }

      handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setIsPublishing(false);
    }
  }, [selectedFolderId, handleRefresh]);

  // Move photos to folder
  const handleMovePhotos = useCallback(async () => {
    if (!targetFolderId || selectedAssetIds.size === 0) {
      toast.error('Seleccioná una carpeta de destino');
      return;
    }

    setIsMoving(true);
    try {
      const res = await fetch(createApiUrl('/api/admin/photos/bulk-move'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: Array.from(selectedAssetIds),
          targetFolderId: targetFolderId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al mover fotos');
      }

      toast.success(`${selectedAssetIds.size} fotos movidas`);
      setSelectedAssetIds(new Set());
      setTargetFolderId(null);
      setShowMoveModal(false);
      handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al mover fotos');
    } finally {
      setIsMoving(false);
    }
  }, [targetFolderId, selectedAssetIds, handleRefresh]);

  // Create new folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('Ingresá un nombre para la carpeta');
      return;
    }
    if (!selectedEventId) {
      toast.error('Seleccioná un evento primero');
      return;
    }

    setIsCreatingFolder(true);
    try {
      const res = await fetch(createApiUrl('/api/admin/folders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          event_id: selectedEventId,
          parent_id: selectedFolderId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear carpeta');
      }

      toast.success(`Carpeta "${newFolderName.trim()}" creada`);
      setNewFolderName('');
      setShowCreateFolderModal(false);
      handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear carpeta');
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, selectedEventId, selectedFolderId, handleRefresh]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    // If dragging a photo not in selection, select only that photo
    if (!selectedAssetIds.has(event.active.id as string)) {
      setSelectedAssetIds(new Set([event.active.id as string]));
    }
  }, [selectedAssetIds]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Check if dropped on a folder
    const targetFolder = over.id as string;
    if (!targetFolder || targetFolder === selectedFolderId) return;

    // Move the selected photos to the target folder
    const photosToMove = selectedAssetIds.size > 0
      ? Array.from(selectedAssetIds)
      : [active.id as string];

    try {
      const res = await fetch(createApiUrl('/api/admin/photos/bulk-move'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: photosToMove,
          targetFolderId: targetFolder,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al mover fotos');
      }

      toast.success(`${photosToMove.length} foto${photosToMove.length > 1 ? 's' : ''} movida${photosToMove.length > 1 ? 's' : ''}`);
      setSelectedAssetIds(new Set());
      handleRefresh();
    } catch (error) {
      toast.error('Error al mover fotos');
    }
  }, [selectedAssetIds, selectedFolderId, handleRefresh]);

  // ---- Render Helpers ----

  const renderFolderTree = (folderList: UnifiedFolder[], depth = 0) => {
    return folderList.map((folder) => {
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;

      return (
        <React.Fragment key={folder.id}>
          <CompactFolderItem
            folder={folder}
            isSelected={isSelected}
            isExpanded={isExpanded}
            onSelect={() => handleSelectFolder(folder.id)}
            onToggle={() => toggleFolderExpand(folder.id)}
            depth={depth}
            photoCount={folder.photo_count}
          />
          {isExpanded && folder.children && folder.children.length > 0 && (
            <div className="clean-folder-children">
              {renderFolderTree(folder.children, depth + 1)}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  // ---- Error State ----
  const hasError = false; // TODO: Implement error handling
  const errorMessage = '';

  // Inspector state
  const [showInspector, setShowInspector] = useState(true);

  // Handle bulk move from inspector
  const handleBulkMove = useCallback((targetFolderId: string) => {
    if (selectedAssetIds.size === 0) return;
    // For now show modal, later implement direct move
    setShowMoveModal(true);
  }, [selectedAssetIds.size]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('clean-photo-admin', className)}>
        {/* ============================================
            MOBILE UI - Google Photos / Apple Photos Style
            Vista de álbumes con navegación simple
            ============================================ */}
        {/* Mobile view is now handled by MobilePhotoAdmin.tsx */}

        {/* ============================================
            DESKTOP HEADER - Original
            ============================================ */}
        <header className="clean-photo-admin-header hidden md:flex">
          <div className="clean-photo-admin-header-left">
            <h1 className="clean-page-title">Fotos</h1>

            {/* Event Selector - Compact */}
            <div className="clean-event-selector">
              <EventSelector
                value={selectedEventId}
                onChange={(id) => handleEventChange(id || null)}
                events={eventsList}
                className="clean-event-select"
              />
            </div>

            {/* Photo Count Badge */}
            <span className="clean-photo-count">
              {totalAssetsCount} fotos
            </span>
          </div>

          <div className="clean-photo-admin-header-right">
            {/* Upload Button */}
            {enableUpload && (
              <PhotoUploadButton
                onUpload={handleUpload}
                disabled={!selectedFolderId || isUploading}
                showIcon={true}
                variant="default"
                size="sm"
                className="clean-btn clean-btn--primary"
              >
                {isUploading ? 'Subiendo...' : 'Subir fotos'}
              </PhotoUploadButton>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="clean-icon-btn"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'clean-icon-btn',
                showFilters && 'clean-icon-btn--active'
              )}
              title="Filtros"
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* View Mode Toggle */}
            <div className="clean-view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'clean-view-toggle-btn',
                  viewMode === 'grid' && 'clean-view-toggle-btn--active'
                )}
                title="Vista en grilla"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'clean-view-toggle-btn',
                  viewMode === 'list' && 'clean-view-toggle-btn--active'
                )}
                title="Vista en lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Toggle */}
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={cn(
                'clean-icon-btn',
                showInspector && 'clean-icon-btn--active'
              )}
              title={showInspector ? 'Ocultar inspector' : 'Mostrar inspector'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ---- Filters (Collapsible) ---- */}
        {showFilters && (
          <div className="clean-filters-bar">
            <FilterChip
              label="Todas"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              label="Listas"
              active={statusFilter === 'ready'}
              onClick={() => setStatusFilter('ready')}
            />
            <FilterChip
              label="Procesando"
              active={statusFilter === 'processing'}
              onClick={() => setStatusFilter('processing')}
            />
            <FilterChip
              label="Pendientes"
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
            />
            <FilterChip
              label="Con error"
              active={statusFilter === 'error'}
              onClick={() => setStatusFilter('error')}
            />

            <div className="clean-filters-divider" />

            {/* Page Size */}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) as 25 | 50 | 100)}
            >
              <SelectTrigger className="clean-select clean-select--small w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-[var(--clean-text-muted)]">por página</span>
          </div>
        )}

        {/* ---- Selection Toolbar ---- */}
        {enableBulkOperations && (
          <SelectionToolbar
            selectedCount={selectedAssetIds.size}
            totalCount={assets.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onDelete={() => setShowDeleteConfirm(true)}
            onMove={() => setShowMoveModal(true)}
            onCreateAlbum={handleCreateAlbum}
            isDeleting={isDeleting}
          />
        )}

        {/* ---- Main Content ---- */}
        <div className="clean-photo-admin-content">
          {/* Sidebar - Folder Tree (Desktop only, hidden on mobile) */}
          <aside className={cn(
            'clean-photo-admin-sidebar',
            isSidebarCollapsed && 'clean-photo-admin-sidebar--collapsed'
          )}>
            <div className="clean-sidebar-header">
              <span className="clean-sidebar-title">Carpetas</span>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="clean-icon-btn clean-icon-btn--small"
                title={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {!isSidebarCollapsed && (
              <>
                {/* Quick Actions */}
                <div className="clean-sidebar-actions">
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    disabled={!selectedEventId}
                    className="clean-sidebar-action-btn"
                    title={!selectedEventId ? 'Seleccioná un evento primero' : 'Crear nueva carpeta'}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva carpeta
                  </button>
                </div>

                {/* Folder List */}
                <div className="clean-folder-list">
                  {isLoadingFolders ? (
                    <div className="clean-loading-placeholder">
                      Cargando carpetas...
                    </div>
                  ) : folders.length === 0 ? (
                    <div className="clean-empty-folders">
                      <Folder className="w-8 h-8 text-[var(--clean-text-muted)]" />
                      <p>Sin carpetas</p>
                      <span className="text-xs text-[var(--clean-text-muted)]">
                        Seleccioná un evento para ver sus carpetas
                      </span>
                    </div>
                  ) : (
                    renderFolderTree(folders)
                  )}
                </div>
              </>
            )}
          </aside>

          {/* Main Area - Photos */}
          <main className="clean-photo-admin-main">
            {/* Desktop: Breadcrumb bar */}
            <div className="clean-breadcrumb-bar hidden md:flex">
              <CleanBreadcrumb
                items={breadcrumbItems}
                onNavigate={handleSelectFolder}
              />
            </div>

            {/* Photo Grid/List */}
            <div className="clean-photo-grid-container">
              {hasError ? (
                <div className="clean-error-state">
                  <AlertCircle className="w-12 h-12 text-[var(--clean-error)]" />
                  <h4>Error al cargar fotos</h4>
                  <p>{errorMessage}</p>
                  <button onClick={handleRefresh} className="clean-btn">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar
                  </button>
                </div>
              ) : !selectedEventId ? (
                <div className="clean-empty-state">
                  <ImageIcon className="w-16 h-16 text-[var(--clean-text-muted)]" />
                  <h4>Seleccioná un evento</h4>
                  <p>Elegí un evento del selector para ver sus fotos</p>
                </div>
              ) : !selectedFolderId ? (
                <div className="clean-empty-state">
                  <FolderOpen className="w-16 h-16 text-[var(--clean-text-muted)]" />
                  <h4>Seleccioná una carpeta</h4>
                  <p className="hidden md:block">Elegí una carpeta del panel lateral para ver sus fotos</p>
                  <p className="md:hidden">Usá el selector de arriba para elegir una carpeta</p>
                </div>
              ) : isLoadingAssets ? (
                <div className="clean-loading-state">
                  <div className="clean-loading-spinner" />
                  <p>Cargando fotos...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="clean-empty-state">
                  <ImageIcon className="w-16 h-16 text-[var(--clean-text-muted)]" />
                  <h4>No hay fotos</h4>
                  <p>Esta carpeta no tiene fotos. Subí algunas para comenzar.</p>
                  {enableUpload && selectedFolderId && (
                    <PhotoUploadButton
                      onUpload={handleUpload}
                      disabled={isUploading}
                      showIcon={true}
                      className="clean-btn clean-btn--primary mt-4"
                    >
                      Subir fotos
                    </PhotoUploadButton>
                  )}
                </div>
              ) : (
                <PhotoGridPanel
                  assets={assets}
                  selectedAssetIds={selectedAssetIds}
                  onSelectionChange={handleAssetSelection}
                  onSelectAll={handleSelectAll}
                  onClearSelection={handleClearSelection}
                  onCreateAlbum={handleCreateAlbum}
                  onBulkDelete={() => setShowDeleteConfirm(true)}
                  onBulkMove={() => setShowMoveModal(true)}
                  folders={folders}
                  currentFolderId={selectedFolderId}
                  onLoadMore={handleLoadMore}
                  hasMore={hasNextPage}
                  isLoading={isLoadingAssets}
                  isLoadingMore={isFetchingNextPage}
                  totalCount={totalAssetsCount}
                  className="clean-photo-grid"
                />
              )}
            </div>
          </main>

          {/* Inspector Panel - Right Sidebar */}
          {showInspector && (
            <aside className="clean-photo-admin-inspector">
              <InspectorPanel
                selectedAssets={selectedAssets}
                folders={foldersData || []}
                currentFolderId={selectedFolderId}
                onBulkMove={handleBulkMove}
                onBulkDelete={() => setShowDeleteConfirm(true)}
                onCreateAlbum={handleCreateAlbum}
                className="h-full"
              />
            </aside>
          )}
        </div>

        {/* ---- Modals ---- */}

        {/* Delete Confirmation */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar {selectedAssetIds.size} fotos?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Las fotos se eliminarán permanentemente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move Modal */}
        <Dialog open={showMoveModal} onOpenChange={(open) => {
          setShowMoveModal(open);
          if (!open) setTargetFolderId(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mover {selectedAssetIds.size} fotos</DialogTitle>
              <DialogDescription>
                Seleccioná la carpeta de destino
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[300px] overflow-y-auto">
              {/* Folder selector tree */}
              {folders.length === 0 ? (
                <div className="text-center text-[var(--clean-text-muted)] py-4">
                  No hay carpetas disponibles
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Root option */}
                  <button
                    onClick={() => setTargetFolderId(null)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      targetFolderId === null
                        ? 'bg-[var(--clean-accent)] text-white'
                        : 'hover:bg-[var(--clean-bg-secondary)]'
                    )}
                  >
                    <Home className="w-4 h-4" />
                    Raíz del evento
                  </button>
                  {/* Render folder tree for selection */}
                  {(function renderMoveFolderTree(folderList: UnifiedFolder[], depth = 0): React.ReactNode {
                    return folderList.map((folder) => {
                      const isDisabled = selectedFolderId === folder.id;
                      return (
                        <React.Fragment key={folder.id}>
                          <button
                            onClick={() => !isDisabled && setTargetFolderId(folder.id)}
                            disabled={isDisabled}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              isDisabled && 'opacity-50 cursor-not-allowed',
                              targetFolderId === folder.id
                                ? 'bg-[var(--clean-accent)] text-white'
                                : 'hover:bg-[var(--clean-bg-secondary)]'
                            )}
                            style={{ paddingLeft: `${depth * 16 + 12}px` }}
                          >
                            <Folder className="w-4 h-4" />
                            {folder.name}
                            {isDisabled && <span className="text-xs ml-auto">(actual)</span>}
                          </button>
                          {folder.children && folder.children.length > 0 && renderMoveFolderTree(folder.children, depth + 1)}
                        </React.Fragment>
                      );
                    });
                  })(folders)}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMoveModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleMovePhotos}
                disabled={isMoving || (targetFolderId === selectedFolderId)}
              >
                {isMoving ? 'Moviendo...' : 'Mover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Folder Modal */}
        <Dialog open={showCreateFolderModal} onOpenChange={(open) => {
          setShowCreateFolderModal(open);
          if (!open) setNewFolderName('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva carpeta</DialogTitle>
              <DialogDescription>
                {selectedFolderId
                  ? 'Se creará como subcarpeta de la carpeta seleccionada'
                  : 'Se creará en la raíz del evento'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreatingFolder) {
                    handleCreateFolder();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolderModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={isCreatingFolder || !newFolderName.trim()}
              >
                {isCreatingFolder ? 'Creando...' : 'Crear carpeta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish Result Modal */}
        <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-green-600" />
                {publishResult?.already_published ? 'Carpeta ya publicada' : '¡Publicación exitosa!'}
              </DialogTitle>
              <DialogDescription>
                {publishResult?.folder_name && (
                  <span className="font-medium">{publishResult.folder_name}</span>
                )}
                {publishResult?.photo_count && (
                  <span> • {publishResult.photo_count} fotos</span>
                )}
              </DialogDescription>
            </DialogHeader>

            {publishResult && (
              <div className="space-y-4 py-4">
                {/* Store URL */}
                {publishResult.store_url && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Link de tienda (para familias)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={publishResult.store_url}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(publishResult.store_url!);
                          toast.success('Link copiado');
                        }}
                        title="Copiar link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(publishResult.store_url, '_blank')}
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Family URL */}
                {publishResult.family_url && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Link alternativo (galería simple)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={publishResult.family_url}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(publishResult.family_url!);
                          toast.success('Link copiado');
                        }}
                        title="Copiar link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* QR URL */}
                {publishResult.qr_url && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Link para código QR
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={publishResult.qr_url}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(publishResult.qr_url!);
                          toast.success('Link QR copiado');
                        }}
                        title="Copiar link QR"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowPublishModal(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
