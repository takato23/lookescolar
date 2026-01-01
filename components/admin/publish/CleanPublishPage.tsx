'use client';

import { useState, useEffect, useMemo, useCallback, useRef, DragEvent } from 'react';
import {
  FolderOpen,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Share2,
  Copy,
  ExternalLink,
  Zap,
  Lock,
  CheckCircle2,
  Link as LinkIcon,
  QrCode,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCheck,
  Download,
  Sparkles,
  Layers,
  GripVertical,
  BarChart3,
  FileDown,
  Info,
  ShoppingBag,
} from 'lucide-react';
import { StorePreview } from '@/components/admin/preview';
import { cn } from '@/lib/utils';
import {
  FilterChip,
  CleanStatCard,
  CleanPageHeader,
  CleanEmptyState,
  CleanSearchInput,
  CleanGrid,
  CleanDropdown,
  CleanBulkActions,
  CleanLoadingSpinner,
  CleanSkeletonGrid,
  CleanSkeletonStat,
  CleanTooltip,
  CleanIconButton,
  CleanAnimatedCard,
} from '@/components/admin/shared/CleanComponents';
import { useFolderPublishData } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { useEventManagement } from '@/lib/stores/event-workflow-store';

// Types - match useFolderPublishData hook types exactly
interface FolderRow {
  id: string;
  name: string;
  event_id: string | null;
  photo_count: number;
  is_published: boolean | null;
  share_token: string | null;
  unified_share_token?: string | null;
  store_url?: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  event_name: string | null;
  event_date: string | null;
  thumbnail_url?: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  date?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

type FilterStatus = 'all' | 'published' | 'unpublished';
type SortOption = 'name_asc' | 'name_desc' | 'photos_desc' | 'photos_asc' | 'date_desc' | 'date_asc';

interface CleanPublishPageProps {
  initialSelectedEventId?: string;
  initialData?: {
    folders: FolderRow[];
    event: EventInfo | null;
    pagination?: PaginationInfo;
  };
}

// Toast notification component
function Toast({
  message,
  type = 'success',
  onClose
}: {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Sparkles,
  };
  const Icon = icons[type];

  return (
    <div className={cn('publish-toast', `publish-toast--${type}`)}>
      <Icon className="w-4 h-4" />
      <span>{message}</span>
      <button onClick={onClose} className="publish-toast-close">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// Confirmation modal component
function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div className="clean-modal clean-modal--sm publish-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="publish-confirm-icon">
          <AlertTriangle className={cn('w-8 h-8', danger ? 'text-[var(--clean-error)]' : 'text-[var(--clean-warning)]')} />
        </div>
        <h3 className="publish-confirm-title">{title}</h3>
        <p className="publish-confirm-description">{description}</p>
        <div className="publish-confirm-actions">
          <button className="clean-btn clean-btn--secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={cn('clean-btn', danger ? 'clean-btn--danger' : 'clean-btn--primary')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <CleanLoadingSpinner className="w-4 h-4" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CleanPublishPage({
  initialSelectedEventId,
  initialData,
}: CleanPublishPageProps) {
  // State
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialSelectedEventId || '');
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [publicStoreUrl, setPublicStoreUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [qrModalFolder, setQrModalFolder] = useState<FolderRow | null>(null);
  const [previewFolder, setPreviewFolder] = useState<FolderRow | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<{ id: string; url: string; name: string }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<FolderRow | null>(null);
  const [confirmBulkUnpublish, setConfirmBulkUnpublish] = useState(false);
  const [folderThumbnails, setFolderThumbnails] = useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [statsExpanded, setStatsExpanded] = useState<string | null>(null);
  const [downloadingQRs, setDownloadingQRs] = useState(false);
  // Store Preview state - simplified to use UnifiedPreview component
  const [storePreviewFolder, setStorePreviewFolder] = useState<FolderRow | null>(null);
  const [storePreviewLoading, setStorePreviewLoading] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Data Hooks
  const baseData = useFolderPublishData({ enablePagination: false, enabled: !selectedEventId });
  const eventData = useFolderPublishData({
    enablePagination: false,
    event_id: selectedEventId || undefined,
    enabled: !!selectedEventId,
    initialData: initialSelectedEventId === selectedEventId ? initialData : undefined,
  });

  const { initializeEvent } = useEventManagement();
  const { showPublishSuccess, showUnpublishSuccess } = usePublishSuccessToast();

  // Derived data
  const isScoped = Boolean(selectedEventId);
  const folders = isScoped ? eventData.folders : baseData.folders;
  const event = isScoped ? eventData.event : baseData.event;
  const isLoading = isScoped ? eventData.isLoading : baseData.isLoading;
  const refetch = isScoped ? eventData.refetch : baseData.refetch;

  // Mutations
  const publishMutation = isScoped ? eventData.publish : baseData.publish;
  const unpublishMutation = isScoped ? eventData.unpublish : baseData.unpublish;
  const bulkPublish = isScoped ? eventData.bulkPublish : baseData.bulkPublish;
  const bulkUnpublish = isScoped ? eventData.bulkUnpublish : baseData.bulkUnpublish;

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        let res = await fetch('/api/admin/events');
        if (!res.ok) res = await fetch('/api/admin/events-robust');
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.events || json.data || [];
        setEvents(list.map((e: { id: string; name: string; date?: string }) => ({
          id: e.id,
          name: e.name,
          date: e.date,
        })));
      } catch (e) {
        console.error('Error loading events:', e);
      }
    };
    loadEvents();
  }, []);

  // Load public flag and share URL
  useEffect(() => {
    const loadEventDetails = async () => {
      const evId = event?.id || selectedEventId;
      if (!evId) {
        setIsPublicEnabled(null);
        setPublicStoreUrl('');
        return;
      }

      try {
        const resp = await fetch(`/api/admin/events/${evId}`);
        if (resp.ok) {
          const json = await resp.json();
          const ev = json.event || json;
          if (typeof ev?.public_gallery_enabled === 'boolean') {
            setIsPublicEnabled(ev.public_gallery_enabled);
          }
        }

        const params = new URLSearchParams({ event_id: evId, active: 'true' });
        const shareRes = await fetch(`/api/admin/share/list?${params}`);
        if (shareRes.ok) {
          const data = await shareRes.json();
          const eventToken = (data.tokens || []).find(
            (t: { share_type: string; is_active: boolean; store_url?: string }) =>
              t.share_type === 'event' && t.is_active
          );
          setPublicStoreUrl(eventToken?.store_url || '');
        }
      } catch (error) {
        console.error('Error loading event details:', error);
      }
    };
    loadEventDetails();
  }, [event?.id, selectedEventId]);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (!isLoading && folders.length >= 0) {
      setLastUpdated(new Date());
    }
  }, [isLoading, folders.length]);

  // Load folder thumbnails in parallel with skeleton loading
  useEffect(() => {
    const loadThumbnails = async () => {
      const foldersNeedingThumbnails = folders.filter(
        f => f.photo_count > 0 && !folderThumbnails[f.id] && !loadingThumbnails.has(f.id)
      );

      if (foldersNeedingThumbnails.length === 0) return;

      // Mark folders as loading
      const newLoadingSet = new Set(loadingThumbnails);
      foldersNeedingThumbnails.slice(0, 12).forEach(f => newLoadingSet.add(f.id));
      setLoadingThumbnails(newLoadingSet);

      // Load in parallel with concurrency limit
      const BATCH_SIZE = 4;
      const toLoad = foldersNeedingThumbnails.slice(0, 12);

      for (let i = 0; i < toLoad.length; i += BATCH_SIZE) {
        const batch = toLoad.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (folder) => {
          try {
            const res = await fetch(`/api/admin/folders/${folder.id}/photos?limit=1`);
            if (res.ok) {
              const data = await res.json();
              const photos = data.photos || data || [];
              if (photos.length > 0) {
                const photo = photos[0];
                const thumbUrl = photo.thumbnail_url || photo.preview_url || photo.watermark_url;
                if (thumbUrl) {
                  setFolderThumbnails(prev => ({ ...prev, [folder.id]: thumbUrl }));
                }
              }
            }
          } catch (e) {
            // Silently fail for thumbnails
          } finally {
            setLoadingThumbnails(prev => {
              const newSet = new Set(prev);
              newSet.delete(folder.id);
              return newSet;
            });
          }
        }));
      }
    };

    if (folders.length > 0) {
      loadThumbnails();
    }
  }, [folders]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all visible folders
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        setSelectedFolders(filteredFolders.map(f => f.id));
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedFolders([]);
        setQrModalFolder(null);
        setPreviewFolder(null);
        setConfirmUnpublish(null);
        setConfirmBulkUnpublish(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered and sorted folders
  const filteredFolders = useMemo(() => {
    let result = folders.filter((folder) => {
      const matchesSearch =
        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (folder.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === 'all'
          ? true
          : filterStatus === 'published'
          ? folder.is_published
          : !folder.is_published;
      return matchesSearch && matchesFilter;
    });

    // Sort folders
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'photos_desc':
          return b.photo_count - a.photo_count;
        case 'photos_asc':
          return a.photo_count - b.photo_count;
        case 'date_desc':
          return (b.published_at || '').localeCompare(a.published_at || '');
        case 'date_asc':
          return (a.published_at || '').localeCompare(b.published_at || '');
        default:
          return 0;
      }
    });

    return result;
  }, [folders, searchQuery, filterStatus, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: folders.length,
      published: folders.filter((f) => f.is_published).length,
      unpublished: folders.filter((f) => !f.is_published).length,
    };
  }, [folders]);

  // Stats
  const stats = useMemo(() => ({
    total: folders.length,
    published: folders.filter((f) => f.is_published).length,
    photos: folders.reduce((acc, f) => acc + f.photo_count, 0),
    links: folders.filter((f) => f.family_url).length,
  }), [folders]);

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Format relative time
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins === 1) return 'Hace 1 minuto';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;

    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }, []);

  // Actions
  const handlePublish = useCallback(async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    setLoadingAction(folderId);
    publishMutation(folderId, {
      onSuccess: (data: { share_token?: string; family_url?: string; qr_url?: string }) => {
        setLoadingAction(null);
        if (data.share_token) {
          showPublishSuccess({
            codeId: folder.id,
            codeValue: folder.name,
            token: data.share_token,
            familyUrl: data.family_url || `${window.location.origin}/s/${data.share_token}`,
            qrUrl: data.qr_url || `/access?token=${encodeURIComponent(data.share_token)}`,
            photosCount: folder.photo_count,
            eventName: event?.name,
            action: 'published',
          });
        }
        showToast(`"${folder.name}" publicada exitosamente`, 'success');
        if (event?.id) initializeEvent(event.id).catch(() => {});
      },
      onError: () => {
        setLoadingAction(null);
        showToast(`Error al publicar "${folder.name}"`, 'error');
      },
    });
  }, [folders, publishMutation, showPublishSuccess, event, initializeEvent, showToast]);

  const handleUnpublish = useCallback(async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    setLoadingAction(folderId);
    unpublishMutation(folderId, {
      onSuccess: () => {
        setLoadingAction(null);
        setConfirmUnpublish(null);
        showUnpublishSuccess(folder.name, folder.id, handlePublish);
        showToast(`"${folder.name}" despublicada`, 'info');
        if (event?.id) initializeEvent(event.id).catch(() => {});
      },
      onError: () => {
        setLoadingAction(null);
        showToast(`Error al despublicar "${folder.name}"`, 'error');
      },
    });
  }, [folders, unpublishMutation, showUnpublishSuccess, event, initializeEvent, handlePublish, showToast]);

  const handleBulkAction = useCallback(async (action: 'publish' | 'unpublish') => {
    if (selectedFolders.length === 0) return;
    setBulkLoading(true);
    try {
      if (action === 'publish') {
        const publishable = selectedFolders.filter((id) => {
          const f = folders.find((x) => x.id === id);
          return f && f.photo_count > 0;
        });
        if (publishable.length > 0) {
          await bulkPublish(publishable);
          showToast(`${publishable.length} carpetas publicadas`, 'success');
        }
      } else {
        await bulkUnpublish(selectedFolders);
        showToast(`${selectedFolders.length} carpetas despublicadas`, 'info');
        setConfirmBulkUnpublish(false);
      }
      setSelectedFolders([]);
    } catch (error) {
      showToast('Error en la operación', 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedFolders, folders, bulkPublish, bulkUnpublish, showToast]);

  const togglePublicGallery = useCallback(async () => {
    const targetEventId = event?.id || selectedEventId;
    if (!targetEventId || isPublicEnabled === null) return;

    setTogglingPublic(true);
    try {
      const next = !isPublicEnabled;
      const resp = await fetch(`/api/admin/events/${targetEventId}/public-gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (resp.ok) {
        setIsPublicEnabled(next);
        showToast(next ? 'Galería pública activada' : 'Galería pública desactivada', 'success');
        await initializeEvent(targetEventId);
      }
    } catch (e) {
      console.error('Toggle failed', e);
      showToast('Error al cambiar el estado', 'error');
    } finally {
      setTogglingPublic(false);
    }
  }, [event?.id, selectedEventId, isPublicEnabled, initializeEvent, showToast]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Link copiado al portapapeles', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToast]);

  // Copy multiple links
  const copySelectedLinks = useCallback(() => {
    const links = selectedFolders
      .map(id => folders.find(f => f.id === id))
      .filter((f): f is FolderRow => f !== undefined && f.is_published === true && !!f.family_url)
      .map(f => `${f.name}: ${f.family_url}`)
      .join('\n');

    if (links) {
      navigator.clipboard.writeText(links);
      showToast(`${selectedFolders.length} links copiados`, 'success');
    } else {
      showToast('No hay links publicados para copiar', 'info');
    }
  }, [selectedFolders, folders, showToast]);

  const toggleFolderSelection = useCallback((folderId: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedFolders(filteredFolders.map(f => f.id));
  }, [filteredFolders]);

  // Event dropdown options
  const eventOptions = useMemo(() => {
    return events.map((e) => ({ value: e.id, label: e.name }));
  }, [events]);

  // Sort options
  const sortOptions = [
    { value: 'name_asc', label: 'Nombre A-Z', icon: SortAsc },
    { value: 'name_desc', label: 'Nombre Z-A', icon: SortDesc },
    { value: 'photos_desc', label: 'Más fotos', icon: ImageIcon },
    { value: 'photos_asc', label: 'Menos fotos', icon: ImageIcon },
    { value: 'date_desc', label: 'Recientes', icon: Calendar },
    { value: 'date_asc', label: 'Antiguos', icon: Calendar },
  ];

  // Load preview photos for a folder
  const loadPreviewPhotos = useCallback(async (folder: FolderRow) => {
    setPreviewFolder(folder);
    setPreviewLoading(true);
    setPreviewIndex(0);
    try {
      const res = await fetch(`/api/admin/folders/${folder.id}/photos?limit=12`);
      if (res.ok) {
        const data = await res.json();
        const photos = (data.photos || data || []).map((p: { id: string; preview_url?: string; watermark_url?: string; name?: string }) => ({
          id: p.id,
          url: p.preview_url || p.watermark_url || '',
          name: p.name || 'Foto',
        }));
        setPreviewPhotos(photos);
      }
    } catch (e) {
      console.error('Error loading preview photos:', e);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Generate QR code URL
  const getQrCodeUrl = useCallback((folder: FolderRow) => {
    if (!folder.family_url && !folder.share_token) return null;
    const targetUrl = folder.family_url || `${window.location.origin}/s/${folder.share_token}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
  }, []);

  // Download QR code
  const downloadQrCode = useCallback(async (folder: FolderRow) => {
    const qrUrl = getQrCodeUrl(folder);
    if (!qrUrl) return;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('QR descargado', 'success');
    } catch (e) {
      console.error('Error downloading QR:', e);
      showToast('Error al descargar QR', 'error');
    }
  }, [getQrCodeUrl, showToast]);

  // Download all selected QRs
  const downloadSelectedQRs = useCallback(async () => {
    const publishedSelected = selectedFolders
      .map(id => folders.find(f => f.id === id))
      .filter((f): f is FolderRow => f !== undefined && f.is_published === true);

    if (publishedSelected.length === 0) {
      showToast('No hay carpetas publicadas seleccionadas', 'info');
      return;
    }

    setDownloadingQRs(true);
    showToast(`Descargando ${publishedSelected.length} códigos QR...`, 'info');

    try {
      // Download each QR with small delay to avoid overwhelming the API
      for (let i = 0; i < publishedSelected.length; i++) {
        const folder = publishedSelected[i];
        const qrUrl = getQrCodeUrl(folder);
        if (!qrUrl) continue;

        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Small delay between downloads
        if (i < publishedSelected.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      showToast(`${publishedSelected.length} QRs descargados`, 'success');
    } catch (e) {
      console.error('Error downloading QRs:', e);
      showToast('Error al descargar algunos QRs', 'error');
    } finally {
      setDownloadingQRs(false);
    }
  }, [selectedFolders, folders, getQrCodeUrl, showToast]);

  // Open Store Preview - uses UnifiedPreview component
  const openStorePreview = useCallback((folder: FolderRow) => {
    if (folder.photo_count === 0) {
      showToast('La carpeta no tiene fotos para previsualizar', 'info');
      return;
    }
    setStorePreviewFolder(folder);
  }, [showToast]);

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, folderId: string) => {
    setDraggedFolder(folderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folderId);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedFolder && draggedFolder !== folderId) {
      setDragOverFolder(folderId);
    }
  }, [draggedFolder]);

  const handleDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (!draggedFolder || draggedFolder === targetFolderId) {
      setDraggedFolder(null);
      return;
    }

    // Reorder the folders
    const currentOrder = folderOrder.length > 0 ? folderOrder : filteredFolders.map(f => f.id);
    const draggedIndex = currentOrder.indexOf(draggedFolder);
    const targetIndex = currentOrder.indexOf(targetFolderId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedFolder(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedFolder);

    setFolderOrder(newOrder);
    setDraggedFolder(null);
    showToast('Orden actualizado', 'success');
  }, [draggedFolder, folderOrder, filteredFolders, showToast]);

  const handleDragEnd = useCallback(() => {
    setDraggedFolder(null);
    setDragOverFolder(null);
  }, []);

  // Apply custom ordering to filtered folders
  const orderedFolders = useMemo(() => {
    if (folderOrder.length === 0) return filteredFolders;

    return [...filteredFolders].sort((a, b) => {
      const aIndex = folderOrder.indexOf(a.id);
      const bIndex = folderOrder.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [filteredFolders, folderOrder]);

  // Handle refresh with animation
  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
    showToast('Datos actualizados', 'success');
  }, [refetch, showToast]);

  return (
    <div className="publish-premium">
      {/* Toast notifications */}
      {toast && (
        <div className="publish-toast-container">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Premium Hero Section */}
      <div className="publish-hero">
        <div className="publish-hero-bg">
          <div className="publish-hero-gradient" />
          <div className="publish-hero-orbs">
            <div className="publish-hero-orb publish-hero-orb--1" />
            <div className="publish-hero-orb publish-hero-orb--2" />
            <div className="publish-hero-orb publish-hero-orb--3" />
          </div>
        </div>

        <div className="publish-hero-content">
          <div className="publish-hero-title-group">
            <div className="publish-hero-icon">
              <Globe className="w-8 h-8" />
            </div>
            <div>
              <h1 className="publish-hero-title">Centro de Publicación</h1>
              <p className="publish-hero-subtitle">
                Gestiona y comparte tus galerías con clientes e invitados
              </p>
            </div>
          </div>

          <div className="publish-hero-actions">
            {lastUpdated && (
              <div className="publish-sync-badge">
                <div className="publish-sync-dot" />
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(lastUpdated)}</span>
              </div>
            )}
            <CleanDropdown
              options={eventOptions}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder="Todos los eventos"
              className="publish-event-dropdown"
            />
            <button
              className="publish-refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="publish-stats-premium">
          {isLoading ? (
            <>
              <div className="publish-stat-card publish-stat-card--skeleton" />
              <div className="publish-stat-card publish-stat-card--skeleton" />
              <div className="publish-stat-card publish-stat-card--skeleton" />
              <div className="publish-stat-card publish-stat-card--skeleton" />
            </>
          ) : (
            <>
              <div className="publish-stat-card">
                <div className="publish-stat-card-icon publish-stat-card-icon--folders">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="publish-stat-card-content">
                  <span className="publish-stat-card-value">{stats.total}</span>
                  <span className="publish-stat-card-label">Total carpetas</span>
                </div>
                <div className="publish-stat-card-bg" />
              </div>

              <div className="publish-stat-card publish-stat-card--accent">
                <div className="publish-stat-card-icon publish-stat-card-icon--published">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="publish-stat-card-content">
                  <span className="publish-stat-card-value">{stats.published}</span>
                  <span className="publish-stat-card-label">Publicadas</span>
                  <span className="publish-stat-card-percent">
                    {Math.round((stats.published / (stats.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="publish-stat-card-progress">
                  <div
                    className="publish-stat-card-progress-bar"
                    style={{ width: `${Math.round((stats.published / (stats.total || 1)) * 100)}%` }}
                  />
                </div>
                <div className="publish-stat-card-bg" />
              </div>

              <div className="publish-stat-card">
                <div className="publish-stat-card-icon publish-stat-card-icon--photos">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="publish-stat-card-content">
                  <span className="publish-stat-card-value">{stats.photos.toLocaleString()}</span>
                  <span className="publish-stat-card-label">Total fotos</span>
                </div>
                <div className="publish-stat-card-bg" />
              </div>

              <div className="publish-stat-card">
                <div className="publish-stat-card-icon publish-stat-card-icon--links">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="publish-stat-card-content">
                  <span className="publish-stat-card-value">{stats.links}</span>
                  <span className="publish-stat-card-label">Links activos</span>
                </div>
                <div className="publish-stat-card-bg" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="publish-main-content">
        {/* Public Gallery Toggle (if event selected) */}
        {event && (
          <div className="publish-public-card">
            <div className="publish-public-card-glow" />
            <div className="publish-public-card-content">
              <div className="publish-public-card-info">
                <div className={cn('publish-public-card-icon', isPublicEnabled && 'publish-public-card-icon--active')}>
                  <Zap className="w-5 h-5" />
                </div>
                <div className="publish-public-card-text">
                  <div className="publish-public-card-label-row">
                    <span className="publish-public-card-label">Galería Pública</span>
                    <CleanTooltip content="Permite que todas las fotos publicadas del evento sean accesibles desde un único link público. Ideal para compartir el evento completo con clientes e invitados.">
                      <Info className="w-4 h-4 text-[var(--clean-text-muted)] cursor-help" />
                    </CleanTooltip>
                  </div>
                  <span className={cn('publish-public-card-status', isPublicEnabled && 'publish-public-card-status--active')}>
                    {isPublicEnabled ? '● Activa - Visible para todos' : '○ Inactiva - Solo links individuales'}
                  </span>
                </div>
              </div>
              <div className="publish-public-card-actions">
                <button
                  className={cn('publish-toggle-premium', isPublicEnabled && 'publish-toggle-premium--active')}
                  onClick={togglePublicGallery}
                  disabled={togglingPublic}
                  aria-label={isPublicEnabled ? 'Desactivar galería pública' : 'Activar galería pública'}
                >
                  <span className="publish-toggle-premium-handle" />
                </button>
                {publicStoreUrl && isPublicEnabled && (
                  <div className="publish-public-card-links">
                    <CleanTooltip content="Abrir galería pública">
                      <button
                        className="publish-icon-btn-premium"
                        onClick={() => window.open(publicStoreUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </CleanTooltip>
                    <CleanTooltip content={copiedId === 'public' ? '¡Link copiado!' : 'Copiar link de galería'}>
                      <button
                        className="publish-icon-btn-premium"
                        onClick={() => copyToClipboard(publicStoreUrl, 'public')}
                      >
                        {copiedId === 'public' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </CleanTooltip>
                  </div>
                )}
              </div>
            </div>
            {/* Helpful message when disabled */}
            {isPublicEnabled === false && (
              <p className="publish-public-card-hint">
                💡 Activa la galería pública para que los clientes e invitados puedan ver todas las fotos del evento desde un único enlace.
              </p>
            )}
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="publish-toolbar">
          <div className="publish-search-wrapper">
            <CleanSearchInput
              placeholder="Buscar carpetas..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="publish-search-input"
            />
          </div>

          <div className="publish-filters-premium">
            <div className="publish-filter-chips">
              <button
                className={cn('publish-chip', filterStatus === 'all' && 'publish-chip--active')}
                onClick={() => setFilterStatus('all')}
              >
                <span>Todas</span>
                <span className="publish-chip-count">{statusCounts.all}</span>
              </button>
              <button
                className={cn('publish-chip', filterStatus === 'published' && 'publish-chip--active', 'publish-chip--success')}
                onClick={() => setFilterStatus('published')}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publicadas</span>
                <span className="publish-chip-count">{statusCounts.published}</span>
              </button>
              <button
                className={cn('publish-chip', filterStatus === 'unpublished' && 'publish-chip--active', 'publish-chip--muted')}
                onClick={() => setFilterStatus('unpublished')}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Borradores</span>
                <span className="publish-chip-count">{statusCounts.unpublished}</span>
              </button>
            </div>

            <div className="publish-sort-premium">
              <ArrowUpDown className="w-4 h-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="publish-sort-select-premium"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Bar */}
        <div className="publish-results-bar-premium">
          <div className="publish-results-info">
            <span className="publish-results-count">{filteredFolders.length}</span>
            <span className="publish-results-label">{filteredFolders.length === 1 ? 'carpeta' : 'carpetas'}</span>
          </div>
          {filteredFolders.length > 0 && (
            <button
              className="publish-select-all-btn"
              onClick={selectAllVisible}
            >
              <CheckCheck className="w-4 h-4" />
              Seleccionar todo
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        <CleanBulkActions
          selectedCount={selectedFolders.length}
          onClear={() => setSelectedFolders([])}
        >
          <button
            className="clean-btn clean-btn--success"
            onClick={() => handleBulkAction('publish')}
            disabled={bulkLoading}
          >
            {bulkLoading ? <CleanLoadingSpinner className="w-4 h-4" /> : <Globe className="clean-btn-icon" />}
            Publicar
          </button>
          <button
            className="clean-btn clean-btn--danger"
            onClick={() => setConfirmBulkUnpublish(true)}
            disabled={bulkLoading}
          >
            <EyeOff className="clean-btn-icon" />
            Ocultar
          </button>
          <button
            className="clean-btn clean-btn--secondary"
            onClick={copySelectedLinks}
            disabled={bulkLoading}
          >
            <Copy className="clean-btn-icon" />
            Copiar links
          </button>
          <button
            className="clean-btn clean-btn--secondary"
            onClick={downloadSelectedQRs}
            disabled={bulkLoading || downloadingQRs}
          >
            {downloadingQRs ? <CleanLoadingSpinner className="w-4 h-4" /> : <FileDown className="clean-btn-icon" />}
            Descargar QRs
          </button>
        </CleanBulkActions>

        {/* Folders Grid */}
        <div ref={gridRef} className="publish-folders-container">
          {isLoading ? (
            <CleanSkeletonGrid count={8} cols={4} />
          ) : orderedFolders.length > 0 ? (
            <div className="publish-folders-grid">
              {orderedFolders.map((folder, index) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  index={index}
                  isSelected={selectedFolders.includes(folder.id)}
                  onSelect={() => toggleFolderSelection(folder.id)}
                  onPublish={() => handlePublish(folder.id)}
                  onUnpublish={() => setConfirmUnpublish(folder)}
                  onCopyLink={() => folder.family_url && copyToClipboard(folder.family_url, folder.id)}
                  copied={copiedId === folder.id}
                  onShowQr={() => setQrModalFolder(folder)}
                  onPreview={() => loadPreviewPhotos(folder)}
                  onStorePreview={() => openStorePreview(folder)}
                  isStorePreviewLoading={storePreviewLoading === folder.id}
                  onStatsExpand={() => setStatsExpanded(statsExpanded === folder.id ? null : folder.id)}
                  isStatsExpanded={statsExpanded === folder.id}
                  thumbnailUrl={folderThumbnails[folder.id]}
                  thumbnailLoading={loadingThumbnails.has(folder.id)}
                  isLoading={loadingAction === folder.id}
                  isDragging={draggedFolder === folder.id}
                  isDragOver={dragOverFolder === folder.id}
                  onDragStart={(e) => handleDragStart(e, folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  onDragEnd={handleDragEnd}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <div className="publish-empty-state">
              <div className="publish-empty-icon">
                <Layers className="w-16 h-16" />
              </div>
              <h3 className="publish-empty-title">
                {folders.length > 0 ? 'No hay carpetas con este filtro' : 'No hay carpetas'}
              </h3>
              <p className="publish-empty-description">
                {folders.length > 0
                  ? 'Prueba cambiando los filtros o términos de búsqueda.'
                  : 'Las carpetas aparecerán aquí cuando crees contenido en tus eventos.'}
              </p>
              {searchQuery && (
                <button
                  className="clean-btn clean-btn--secondary mt-4"
                  onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Unpublish */}
      <ConfirmModal
        open={!!confirmUnpublish}
        onClose={() => setConfirmUnpublish(null)}
        onConfirm={() => confirmUnpublish && handleUnpublish(confirmUnpublish.id)}
        title="¿Despublicar carpeta?"
        description={`"${confirmUnpublish?.name}" dejará de estar accesible para los clientes e invitados. Podrás volver a publicarla en cualquier momento.`}
        confirmText="Despublicar"
        danger
        loading={loadingAction === confirmUnpublish?.id}
      />

      {/* Confirmation Modal for Bulk Unpublish */}
      <ConfirmModal
        open={confirmBulkUnpublish}
        onClose={() => setConfirmBulkUnpublish(false)}
        onConfirm={() => handleBulkAction('unpublish')}
        title={`¿Despublicar ${selectedFolders.length} carpetas?`}
        description="Las carpetas seleccionadas dejarán de estar accesibles para los clientes e invitados. Podrás volver a publicarlas en cualquier momento."
        confirmText="Despublicar todo"
        danger
        loading={bulkLoading}
      />

      {/* QR Code Modal */}
      {qrModalFolder && qrModalFolder.is_published && (
        <div className="clean-modal-overlay" onClick={() => setQrModalFolder(null)}>
          <div className="clean-modal clean-modal--sm publish-qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3 className="clean-modal-title">Código QR</h3>
              <button
                className="clean-icon-btn"
                onClick={() => setQrModalFolder(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="clean-modal-body text-center">
              <p className="text-sm text-[var(--clean-text-muted)] mb-4">
                {qrModalFolder.name}
              </p>
              <div className="publish-qr-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getQrCodeUrl(qrModalFolder) || ''}
                  alt={`QR Code para ${qrModalFolder.name}`}
                  className="publish-qr-image"
                />
              </div>
              <p className="text-xs text-[var(--clean-text-muted)] mt-3 break-all px-4">
                {qrModalFolder.family_url || `${window.location.origin}/s/${qrModalFolder.share_token}`}
              </p>
            </div>
            <div className="clean-modal-footer">
              <button
                className="clean-btn clean-btn--secondary"
                onClick={() => setQrModalFolder(null)}
              >
                Cerrar
              </button>
              <button
                className="clean-btn clean-btn--primary"
                onClick={() => {
                  downloadQrCode(qrModalFolder);
                }}
              >
                <Download className="clean-btn-icon" />
                Descargar QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Photos Modal */}
      {previewFolder && (
        <div className="clean-modal-overlay" onClick={() => setPreviewFolder(null)}>
          <div className="clean-modal clean-modal--lg publish-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3 className="clean-modal-title">
                <Eye className="w-5 h-5 inline mr-2" />
                Vista previa: {previewFolder.name}
              </h3>
              <button
                className="clean-icon-btn"
                onClick={() => setPreviewFolder(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="clean-modal-body">
              {previewLoading ? (
                <div className="publish-preview-loading">
                  <CleanLoadingSpinner />
                  <p className="text-sm text-[var(--clean-text-muted)] mt-4">Cargando fotos...</p>
                </div>
              ) : previewPhotos.length > 0 ? (
                <>
                  {/* Main preview image */}
                  <div className="publish-preview-main">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewPhotos[previewIndex]?.url || ''}
                      alt={previewPhotos[previewIndex]?.name || 'Preview'}
                      className="publish-preview-image"
                    />
                    {previewPhotos.length > 1 && (
                      <>
                        <button
                          className="publish-preview-nav publish-preview-nav--prev"
                          onClick={() => setPreviewIndex((i) => (i - 1 + previewPhotos.length) % previewPhotos.length)}
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          className="publish-preview-nav publish-preview-nav--next"
                          onClick={() => setPreviewIndex((i) => (i + 1) % previewPhotos.length)}
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    <div className="publish-preview-counter">
                      {previewIndex + 1} / {previewPhotos.length}
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="publish-preview-thumbs">
                    {previewPhotos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        className={cn(
                          'publish-preview-thumb',
                          idx === previewIndex && 'publish-preview-thumb--active'
                        )}
                        onClick={() => setPreviewIndex(idx)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.name} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="publish-preview-empty">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay fotos en esta carpeta</p>
                </div>
              )}
            </div>
            <div className="clean-modal-footer">
              <button
                className="clean-btn clean-btn--secondary"
                onClick={() => setPreviewFolder(null)}
              >
                Cerrar
              </button>
              <span className="text-sm text-[var(--clean-text-muted)]">
                {previewFolder.photo_count} {previewFolder.photo_count === 1 ? 'foto' : 'fotos'} en total
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Store Preview Modal - Uses UnifiedPreview component */}
      {storePreviewFolder && storePreviewFolder.event_id && (
        <StorePreview
          open={true}
          onClose={() => setStorePreviewFolder(null)}
          eventId={storePreviewFolder.event_id}
          folderId={storePreviewFolder.id}
          variant="modal"
          title="Vista Previa de Tienda"
          subtitle={storePreviewFolder.name}
        />
      )}
    </div>
  );
}

// =============================================================================
// FOLDER CARD COMPONENT
// =============================================================================

interface FolderCardProps {
  folder: FolderRow;
  index?: number;
  isSelected: boolean;
  onSelect: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onCopyLink: () => void;
  copied: boolean;
  onShowQr: () => void;
  onPreview: () => void;
  onStorePreview: () => void;
  isStorePreviewLoading?: boolean;
  onStatsExpand?: () => void;
  isStatsExpanded?: boolean;
  thumbnailUrl?: string;
  thumbnailLoading?: boolean;
  isLoading?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  searchQuery?: string;
}

// Helper to highlight search matches
function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || query.length < 2) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="publish-highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function FolderCard({
  folder,
  index,
  isSelected,
  onSelect,
  onPublish,
  onUnpublish,
  onCopyLink,
  copied,
  onShowQr,
  onPreview,
  onStorePreview,
  isStorePreviewLoading,
  onStatsExpand,
  isStatsExpanded,
  thumbnailUrl,
  thumbnailLoading,
  isLoading,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  searchQuery,
}: FolderCardProps) {
  const isPublished = folder.is_published;

  return (
    <div
      className={cn(
        'publish-folder-card',
        isSelected && 'publish-folder-card--selected',
        isPublished && 'publish-folder-card--published',
        isLoading && 'publish-folder-card--loading',
        isDragging && 'publish-folder-card--dragging',
        isDragOver && 'publish-folder-card--drag-over'
      )}
      style={{ animationDelay: index !== undefined ? `${index * 30}ms` : undefined }}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div className="publish-folder-card-drag-handle" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Thumbnail header */}
      <div className="publish-folder-card-thumb">
        {thumbnailLoading ? (
          <div className="publish-folder-card-thumb-skeleton">
            <div className="publish-thumb-skeleton-shimmer" />
          </div>
        ) : thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={folder.name}
            className="publish-folder-card-thumb-img"
          />
        ) : (
          <div className="publish-folder-card-thumb-placeholder">
            <ImageIcon className="w-8 h-8" />
            <span>{folder.photo_count} fotos</span>
          </div>
        )}

        {/* Selection checkbox */}
        <div className="publish-folder-card-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="publish-checkbox"
          />
        </div>

        {/* Status badge */}
        <div className={cn(
          'publish-folder-card-badge',
          isPublished ? 'publish-folder-card-badge--published' : 'publish-folder-card-badge--draft'
        )}>
          {isPublished ? (
            <>
              <Globe className="w-3 h-3" />
              Publicada
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              Borrador
            </>
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="publish-folder-card-loading">
            <CleanLoadingSpinner />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="publish-folder-card-body">
        <h3 className="publish-folder-card-name" title={folder.name}>
          <HighlightText text={folder.name} query={searchQuery} />
        </h3>
        <div className="publish-folder-card-meta">
          <span className="publish-folder-card-meta-item">
            <ImageIcon className="w-3.5 h-3.5" />
            {folder.photo_count} {folder.photo_count === 1 ? 'foto' : 'fotos'}
          </span>
          {folder.event_name && (
            <span className="publish-folder-card-meta-event" title={`Evento: ${folder.event_name}`}>
              <Calendar className="w-3 h-3" />
              {folder.event_name}
            </span>
          )}
        </div>
        {/* Published date if available */}
        {isPublished && folder.published_at && (
          <div className="publish-folder-card-date">
            <Calendar className="w-3 h-3" />
            {new Date(folder.published_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="publish-folder-card-actions" onClick={(e) => e.stopPropagation()}>
        {folder.photo_count > 0 && (
          <>
            <CleanIconButton
              icon={Eye}
              tooltip="Vista previa fotos"
              onClick={onPreview}
              variant="ghost"
              size="sm"
            />
            {isStorePreviewLoading ? (
              <div className="clean-icon-btn clean-icon-btn--ghost clean-icon-btn--sm opacity-50">
                <CleanLoadingSpinner className="w-4 h-4" />
              </div>
            ) : (
              <CleanIconButton
                icon={ShoppingBag}
                tooltip="Vista previa tienda"
                onClick={onStorePreview}
                variant="ghost"
                size="sm"
              />
            )}
          </>
        )}
        {isPublished && (
          <>
            <CleanIconButton
              icon={QrCode}
              tooltip="Ver código QR"
              onClick={onShowQr}
              variant="ghost"
              size="sm"
            />
            <CleanIconButton
              icon={copied ? CheckCircle2 : Share2}
              tooltip={copied ? '¡Copiado!' : 'Copiar link'}
              onClick={onCopyLink}
              variant={copied ? 'success' : 'ghost'}
              size="sm"
            />
            <CleanIconButton
              icon={ExternalLink}
              tooltip="Ver galería"
              onClick={() => folder.family_url && window.open(folder.family_url, '_blank')}
              variant="ghost"
              size="sm"
            />
            <CleanIconButton
              icon={BarChart3}
              tooltip="Ver detalles"
              onClick={onStatsExpand}
              variant={isStatsExpanded ? 'primary' : 'ghost'}
              size="sm"
            />
          </>
        )}
      </div>

      {/* Quick info panel when card is expanded */}
      {isStatsExpanded && isPublished && (
        <div className="publish-folder-card-stats" onClick={(e) => e.stopPropagation()}>
          <div className="publish-folder-card-info-panel">
            <div className="publish-folder-card-info-item">
              <span className="publish-folder-card-info-label">Link para compartir:</span>
              <code className="publish-folder-card-info-value">
                {folder.family_url ? folder.family_url.replace(/^https?:\/\//, '').slice(0, 30) + '...' : 'N/A'}
              </code>
            </div>
            <div className="publish-folder-card-info-item">
              <span className="publish-folder-card-info-label">Publicada:</span>
              <span className="publish-folder-card-info-value">
                {folder.published_at ? new Date(folder.published_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer with action button */}
      <div className="publish-folder-card-footer" onClick={(e) => e.stopPropagation()}>
        {isPublished ? (
          <button
            className="clean-btn clean-btn--danger clean-btn--sm clean-btn--full"
            onClick={onUnpublish}
            disabled={isLoading}
          >
            <EyeOff className="clean-btn-icon" />
            Despublicar
          </button>
        ) : (
          <button
            className="clean-btn clean-btn--success clean-btn--sm clean-btn--full"
            onClick={onPublish}
            disabled={folder.photo_count === 0 || isLoading}
          >
            <Globe className="clean-btn-icon" />
            Publicar
          </button>
        )}
      </div>
    </div>
  );
}
