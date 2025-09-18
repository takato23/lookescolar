/**
 * 🔄 RESTAURADO - EventPhotoManager
 * 
 * Gestor específico de fotos para eventos individuales.
 * Proporciona una interfaz contextual del evento con gestión de fotos integrada.
 * 
 * Uso: /admin/events/[id]/library
 * 
 * Diferencias con /admin/photos:
 * - Contexto específico del evento
 * - Header con información del evento
 * - Navegación contextual
 * - Métricas del evento
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  DollarSign,
  Camera,
  Users,
  ShoppingCart,
  ArrowLeft,
  Upload,
  Eye,
  Settings,
  FolderOpen,
  Folder,
  Search,
  Grid3X3,
  List,
  Star,
  Download,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Image as ImageIcon,
  RefreshCw,
  MoreVertical,
  Tag,
  Maximize2,
  X,
  Edit3,
  Package,
  Link as LinkIcon,
  CheckCircle2,
  FileUser,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadInterface } from '@/app/admin/events/[id]/library/components/UploadInterface';
import EventSelector from '@/components/admin/EventSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Components
import { useEventMetrics } from '@/hooks/useEventMetrics';
import { StoreConfigPanel } from '@/components/admin/shared/StoreConfigPanel';
import { ProductManagementPanel } from '@/components/admin/ProductManagementPanel';
import { HierarchicalFolderTreeEnhanced } from '@/components/admin/HierarchicalFolderTreeEnhanced';
import { ProfessionalShareModal } from '@/components/admin/ProfessionalShareModal';

// Types
interface Event {
  id: string;
  name: string;
  school?: string; // Mapped from name for compatibility
  date: string;
  location?: string;
  status: string;
  active: boolean;
  stats?: {
    totalPhotos?: number;
    totalSubjects?: number;
    totalRevenue?: number;
    pendingOrders?: number;
    totalOrders?: number;
  };
}

interface Folder {
  id: string;
  name: string;
  path: string;
  depth: number;
  photoCount: number;
  type: 'level' | 'course' | 'student';
  parentId?: string;
  children?: Folder[];
}

interface Photo {
  id: string;
  original_filename: string;
  preview_url?: string;
  thumbnail_url?: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  students?: Array<{ id: string; name: string }>;
}

interface EventPhotoManagerProps {
  eventId: string;
  initialEvent?: Event;
}

// PhotoCard Component
interface PhotoCardProps {
  photo: Photo;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (isSelected: boolean) => void;
  selectedIds?: string[];
}

function PhotoCard({ photo, viewMode, isSelected, onSelect, selectedIds }: PhotoCardProps) {
  if (viewMode === 'list') {
    return (
      <div className={cn(
        "flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-sm bg-white",
        isSelected ? "border-blue-500 bg-blue-50" : "border-border hover:border-border"
      )}>
        <button
          onClick={() => onSelect(!isSelected)}
          className="flex-shrink-0 p-1 rounded hover:bg-muted"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
        
        <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          <img 
            src={photo.thumbnail_url || photo.preview_url} 
            alt={photo.original_filename}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden h-full w-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{photo.original_filename}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{(photo.file_size / 1024 / 1024).toFixed(1)} MB</span>
            <span>•</span>
            <span>{photo.width}×{photo.height}</span>
            {photo.approved && (
              <>
                <span>•</span>
                <span className="text-green-600 font-medium">Aprobada</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {photo.tagged && (
            <Badge variant="outline" className="text-xs">
              Etiquetada
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative aspect-square rounded-lg border transition-all hover:shadow-md cursor-pointer bg-white",
        isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-border hover:border-border"
      )}
      draggable
      onDragStart={(e) => {
        try {
          const ids = (selectedIds && selectedIds.length > 0 && selectedIds.includes(photo.id))
            ? selectedIds
            : [photo.id];
          e.dataTransfer.setData('application/x-asset-ids', JSON.stringify(ids));
          e.dataTransfer.effectAllowed = 'move';
        } catch {}
      }}
    >
      {/* Selection checkbox */}
      <button
        onClick={() => onSelect(!isSelected)}
        className="absolute top-3 left-3 z-10 p-1 bg-white/90 backdrop-blur-sm rounded-md shadow-sm transition-all hover:bg-white"
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Square className="h-4 w-4 text-gray-400 group-hover:text-muted-foreground" />
        )}
      </button>
      
      {/* Image container */}
      <div className="h-full w-full rounded-lg bg-muted overflow-hidden">
        <img 
          src={photo.preview_url} 
          alt={photo.original_filename}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden h-full w-full flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      </div>
      
      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-3">
        <p className="text-white text-sm font-medium truncate mb-1">{photo.original_filename}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {photo.approved && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-300">Aprobada</span>
              </div>
            )}
            {photo.tagged && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-300">Etiquetada</span>
              </div>
            )}
          </div>
          <span className="text-xs text-white/80">
            {(photo.file_size / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>
      
      {/* Action button */}
      <button className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white">
        <Maximize2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}

export default function EventPhotoManager({ eventId, initialEvent }: EventPhotoManagerProps) {
  const router = useRouter();
  
  // Hook de métricas
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useEventMetrics(eventId);
  
  const [event, setEvent] = useState<Event | null>(initialEvent || null);
  
  // Estado para tabs de configuración
  const [activeTab, setActiveTab] = useState<'photos' | 'settings' | 'store' | 'sharing'>('photos');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  type EFolder = { id: string; name: string; parent_id: string | null; depth: number; photo_count: number; has_children: boolean; event_id?: string };
  const [enhancedFolders, setEnhancedFolders] = useState<EFolder[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [shareModal, setShareModal] = useState<null | { 
    type: 'event' | 'folder'; 
    url: string; 
    title: string;
    description: string; 
  }>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [, setFolderActionLoading] = useState(false);
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [initialUploadFiles, setInitialUploadFiles] = useState<File[] | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentCourseId, setManualStudentCourseId] = useState<string>('');

  // Assets pagination and loading state
  const ASSETS_PAGE_SIZE = 60;
  const [assetsOffset, setAssetsOffset] = useState(0);
  const [hasMoreAssets, setHasMoreAssets] = useState(true);
  const [loadingMoreAssets, setLoadingMoreAssets] = useState(false);

  // Helper: map raw asset to Photo
  const mapAssets = (items: Array<any>): Photo[] =>
    items.map((a) => ({
      id: a.id,
      original_filename: a.filename || 'archivo',
      preview_url: a.preview_url || null,
      thumbnail_url: a.preview_url || null,
      file_size: a.file_size || 0,
      created_at: a.created_at,
      approved: true,
      tagged: false,
    }));

  // Fetch assets page with light retry/backoff
  const fetchAssetsPage = async (
    folderId: string,
    offset: number,
    signal?: AbortSignal
  ): Promise<Photo[]> => {
    const params = new URLSearchParams({
      folder_id: folderId,
      limit: String(ASSETS_PAGE_SIZE),
      offset: String(offset),
    });
    const attempt = async (delayMs: number) => {
      const res = await fetch(`/api/admin/assets?${params.toString()}`, { signal });
      if (!res.ok) throw new Error(`Error fetching assets: ${res.status} ${res.statusText}`);
      const json = await res.json();
      const items = (json.assets || []) as Array<any>;
      return mapAssets(items);
    };

    try {
      return await attempt(0);
    } catch (e1) {
      // One simple retry (backoff ~1s)
      await new Promise((r) => setTimeout(r, 1000));
      return await attempt(1000);
    }
  };

  // Helpers for folder tree
  const refreshEnhancedFolders = async () => {
    const limit = 50;
    let offset = 0;
    let total = Infinity;
    const all: EFolder[] = [];
    while (offset < total) {
      const res = await fetch(`/api/admin/folders?event_id=${encodeURIComponent(eventId)}&limit=${limit}&offset=${offset}`);
      if (!res.ok) break;
      const json = await res.json();
      const batch: EFolder[] = (json.folders || []) as EFolder[];
      total = typeof json.count === 'number' ? json.count : batch.length;
      all.push(...batch);
      offset += limit;
      if (batch.length < limit) break;
    }
    setEnhancedFolders(all);
  };

  const ensureChildrenLoaded = async (folderId: string) => {
    const hasLoaded = enhancedFolders.some((f) => f.parent_id === folderId);
    if (hasLoaded) return;
    const res = await fetch(`/api/admin/folders?parent_id=${encodeURIComponent(folderId)}`);
    if (!res.ok) return;
    const json = await res.json();
    const batch: EFolder[] = (json.folders || []) as EFolder[];
    if (batch.length > 0) setEnhancedFolders((prev) => [...prev, ...batch]);
  };

  // Action functions
  const handleAddLevel = async (levelName: string) => {
    try {
      setShowAddLevelModal(false);
      setLoading(true);
      
      const response = await fetch(`/api/admin/events/${eventId}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: levelName,
          parent_id: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Error creando nivel');
      }

      const result = await response.json();
      const created = result.folder;
      if (created?.id) {
        const newLevel: Folder = {
          id: created.id,
          name: created.name ?? levelName,
          path: `/${(created.name ?? levelName).toLowerCase().replace(/\s+/g, '-')}`,
          depth: created.depth ?? 0,
          photoCount: created.photo_count ?? 0,
          type: 'level',
          children: [],
        };
        setFolders(prev => [...prev, newLevel]);
      }
      
      try { (await import('sonner')).toast.success(`Nivel "${levelName}" creado`); } catch {}
      
    } catch (error) {
      console.error('Error creating level:', error);
      try { (await import('sonner')).toast.error('Error creando el nivel'); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePhotos = async () => {
    if (selectedPhotoIds.length === 0) return;
    const ok = typeof window !== 'undefined'
      ? window.confirm(`¿Aprobar ${selectedPhotoIds.length} foto(s)?`)
      : true;
    if (!ok) return;
    
    try {
      setBulkActionLoading(true);
      
      const response = await fetch(`/api/admin/photos/bulk-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_ids: selectedPhotoIds,
          event_id: eventId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error aprobando fotos');
      }

      setPhotos(prev => prev.map(photo => 
        selectedPhotoIds.includes(photo.id) 
          ? { ...photo, approved: true }
          : photo
      ));

      setSelectedPhotoIds([]);
      
      console.log(`✅ ${selectedPhotoIds.length} fotos aprobadas`);
      
    } catch (error) {
      console.error('Error approving photos:', error);
      try { (await import('sonner')).toast.error('Error aprobando las fotos'); } catch {}
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleUploadPhotos = (initialFiles?: File[]) => {
    if (!selectedFolderId) {
      try {
        (async () => {
          (await import('sonner')).toast.error('Selecciona una carpeta primero para subir fotos');
        })();
      } catch {}
      return;
    }
    setInitialUploadFiles(initialFiles || null);
    setShowUploadInterface(true);
  };

  const handleDirectUploadFiles = async (files: File[]) => {
    if (!selectedFolderId) {
      try { (await import('sonner')).toast.error('Selecciona una carpeta para subir'); } catch {}
      return;
    }
    try {
      // Subir en lotes pequeños para evitar picos de memoria
      const CHUNK = 8;
      let uploadedTotal = 0;
      for (let i = 0; i < files.length; i += CHUNK) {
        const slice = files.slice(i, i + CHUNK);
        const fd = new FormData();
        slice.forEach((f) => fd.append('files', f));
        fd.append('folder_id', selectedFolderId);
        const res = await fetch('/api/admin/assets/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error || 'Fallo la carga');
        }
        uploadedTotal += Number(json.uploaded || slice.length);
      }
      try { (await import('sonner')).toast.success(`Subidas ${uploadedTotal} imágenes`); } catch {}

      // Refrescar primera página y resetear paginación
      const first = await fetchAssetsPage(selectedFolderId, 0);
      setPhotos(first);
      setAssetsOffset(first.length);
      setHasMoreAssets(first.length >= ASSETS_PAGE_SIZE);
    } catch (e) {
      console.error('Upload failed', e);
      try { (await import('sonner')).toast.error('No se pudieron subir las imágenes'); } catch {}
    }
  };

  const handleAddFolderQuick = async () => {
    try {
      const name = window.prompt('Nombre de la nueva carpeta');
      if (!name) return;
      setFolderActionLoading(true);
      
      const selected = folders
        .flatMap((f) => [f, ...(f.children || [])])
        .find((f) => f.id === selectedFolderId) as (Folder | undefined);
      const parentForNew = selected
        ? (selected.parentId || selected.id)
        : null;

      const body: any = { name: name.trim(), parent_id: parentForNew };
      const res = await fetch(`/api/admin/events/${eventId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.folder?.id) throw new Error(data?.error || 'No se pudo crear la carpeta');

      const created = data.folder;
      if (!body.parent_id) {
        setFolders((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            path: `/${created.name?.toLowerCase?.().replace(/\s+/g, '-')}`,
            depth: created.depth ?? 0,
            photoCount: created.photo_count ?? 0,
            type: 'level',
            children: [],
          },
        ]);
      } else {
        setFolders((prev) =>
          prev.map((lvl) =>
            lvl.id === body.parent_id
              ? {
                  ...lvl,
                  children: [
                    ...(lvl.children || []),
                    {
                      id: created.id,
                      name: created.name,
                      path: `${lvl.path}/${created.name?.toLowerCase?.().replace(/\s+/g, '-')}`,
                      depth: created.depth ?? lvl.depth + 1,
                      photoCount: created.photo_count ?? 0,
                      type: 'course',
                      parentId: lvl.id,
                    },
                  ],
                }
              : lvl
          )
        );
        setExpandedFolders((prev) => Array.from(new Set([...prev, body.parent_id!])));
      }
    } catch (e) {
      console.error('Error creando carpeta', e);
      try { (await import('sonner')).toast.error('No se pudo crear la carpeta'); } catch {}
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleDeleteFolder = async (folderIdArg?: string) => {
    const idToDelete = folderIdArg || selectedFolderId;
    if (!idToDelete) {
      try { (await import('sonner')).toast.error('Selecciona una carpeta para eliminar'); } catch {}
      return;
    }
    if (!confirm('¿Eliminar esta carpeta y su contenido? Esta acción no se puede deshacer.')) return;
    try {
      setFolderActionLoading(true);
      const res = await fetch(`/api/admin/folders/${idToDelete}?force=true`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudo eliminar la carpeta');

      setFolders((prev) => {
        if (prev.some((f) => f.id === idToDelete)) {
          return prev.filter((f) => f.id !== idToDelete);
        }
        return prev.map((lvl) => ({
          ...lvl,
          children: (lvl.children || []).filter((c) => c.id !== idToDelete),
        }));
      });
      setSelectedFolderId(null);
      setPhotos([]);
    } catch (e) {
      console.error('Error eliminando carpeta', e);
      try { (await import('sonner')).toast.error('No se pudo eliminar la carpeta'); } catch {}
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleDeleteSelectedPhotos = async () => {
    if (selectedPhotoIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedPhotoIds.length} foto(s)?`)) return;
    try {
      setBulkActionLoading(true);
      const res = await fetch('/api/admin/assets/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: selectedPhotoIds }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudieron eliminar las fotos');
      setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)));
      setSelectedPhotoIds([]);
    } catch (e) {
      console.error('Error eliminando fotos', e);
      try { (await import('sonner')).toast.error('No se pudieron eliminar las fotos'); } catch {}
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleMoveFolder = async (folderId: string) => {
    const target = window.prompt('ID de carpeta destino (vacío = raíz)')?.trim();
    if (target === undefined) return;
    try {
      setFolderActionLoading(true);
      const body: any = { parent_id: target === '' ? null : target };
      const res = await fetch(`/api/admin/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.folder) throw new Error(data?.error || 'No se pudo mover la carpeta');
      try { (await import('sonner')).toast.success('Carpeta movida'); } catch {}
      await loadEventData();
    } catch (e) {
      console.error('Error moviendo carpeta', e);
      try { (await import('sonner')).toast.error('No se pudo mover la carpeta'); } catch {}
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleViewClientGallery = () => {
    (async () => {
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareType: 'event', eventId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.share?.shareUrl) throw new Error(data?.error || 'No se pudo generar el enlace');
        const shareUrl = (data.share.storeUrl as string) || (data.share.shareUrl as string);
        window.open(shareUrl, '_blank');
      } catch (e) {
        console.error('Open client gallery error', e);
        try { (await import('sonner')).toast.error('No se pudo abrir la galería del cliente'); } catch {}
      }
    })();
  };

  const handleShareSelected = async () => {
    try {
      if (!selectedFolderId) {
        try { (await import('sonner')).toast.error('Selecciona una carpeta primero'); } catch {}
        return;
      }
      if (selectedPhotoIds.length === 0) {
        try { (await import('sonner')).toast.error('Selecciona al menos una foto para compartir'); } catch {}
        return;
      }

      // Share selected photos from folder
      const res = await fetch('/api/admin/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shareType: 'photos',
          folderId: selectedFolderId,
          photoIds: selectedPhotoIds,
          eventId,
          title: `${selectedPhotoIds.length} fotos seleccionadas`
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.share?.shareUrl) {
        throw new Error(data?.error || 'No se pudo generar el enlace');
      }

      const shareUrl = (data.share.storeUrl as string) || (data.share.shareUrl as string);

      setShareModal({
        type: 'photos',
        url: shareUrl,
        title: `${selectedPhotoIds.length} fotos seleccionadas`,
        description: `Fotos compartidas de ${enhancedFolders.find(f => f.id === selectedFolderId)?.name || 'carpeta'}`
      });

      // Clear selection after sharing
      setSelectedPhotoIds([]);

    } catch (error) {
      console.error('Error sharing selected photos:', error);
      try { (await import('sonner')).toast.error('No se pudo generar el enlace para las fotos seleccionadas'); } catch {}
    }
  };

  const handleShareEvent = async () => {
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareType: 'event', eventId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.share?.shareUrl) {
        throw new Error(data?.error || 'No se pudo generar el enlace de evento');
      }
      const shareUrl = (data.share.storeUrl as string) || (data.share.shareUrl as string);
      
      setShareModal({ 
        type: 'event', 
        url: shareUrl,
        title: event?.name || 'Evento Escolar',
        description: `${event?.location || 'Galería'} - ${event?.date || 'Evento de fotos'}`
      });
    } catch (error) {
      console.error('Error sharing event:', error);
      try { (await import('sonner')).toast.error('No se pudo generar el enlace del evento'); } catch {}
    }
  };

  const handleShareFolder = async (folderIdArg?: string) => {
    try {
      const folderToShare = folderIdArg || selectedFolderId;
      if (!folderToShare) {
        try { (await import('sonner')).toast.error('Selecciona una carpeta para compartir'); } catch {}
        return;
      }
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareType: 'folder', folderId: folderToShare, eventId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.share?.shareUrl) {
        throw new Error(data?.error || 'No se pudo generar el enlace de carpeta');
      }
      const shareUrl = (data.share.storeUrl as string) || (data.share.shareUrl as string);
      
      const folder = folders.find(f => f.id === folderToShare);
      const folderName = folder?.name || 'Carpeta';
      
      setShareModal({ 
        type: 'folder', 
        url: shareUrl,
        title: folderName,
        description: `Álbum de fotos - ${event?.name || 'Evento'}`
      });
    } catch (error) {
      console.error('Error sharing folder:', error);
      try { (await import('sonner')).toast.error('No se pudo generar el enlace de carpeta'); } catch {}
    }
  };

  // Load event data on mount
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const eventResponse = await fetch(`/api/admin/events/${eventId}`);
      
      if (!eventResponse.ok) {
        throw new Error('Error loading event');
      }
      const eventData = await eventResponse.json();
      setEvent(eventData.event);
      
      const fetchAllEventFolders = async () => {
        const all: EFolder[] = [];
        const limit = 50;
        let offset = 0;
        let total = Infinity;
        while (offset < total) {
          const url = `/api/admin/folders?event_id=${encodeURIComponent(eventId)}&limit=${limit}&offset=${offset}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Error loading folders');
          const json = await res.json();
          const batch: EFolder[] = (json.folders || []) as EFolder[];
          total = typeof json.count === 'number' ? json.count : batch.length;
          all.push(...batch);
          offset += limit;
          if (batch.length < limit) break;
        }
        return all;
      };

      const allFolders = await fetchAllEventFolders();
      setEnhancedFolders(allFolders);
      
      const root = allFolders.find((f) => f.parent_id === null) || allFolders[0];
      if (root) {
        setExpandedFolders([root.id]);
        setSelectedFolderId(root.id);
      } else {
        setExpandedFolders([]);
        setSelectedFolderId(null);
      }

    } catch (err) {
      console.error('Error loading event data:', err);
      setError(err instanceof Error ? err.message : 'Error loading event');
    } finally {
      setLoading(false);
    }
  };

  // Load assets when folder changes (with cancellation)
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!selectedFolderId) {
        setPhotos([]);
        setAssetsOffset(0);
        setHasMoreAssets(true);
        return;
      }
      try {
        const firstPage = await fetchAssetsPage(selectedFolderId, 0, controller.signal);
        setPhotos(firstPage);
        setAssetsOffset(firstPage.length);
        setHasMoreAssets(firstPage.length >= ASSETS_PAGE_SIZE);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('Error loading assets', e);
        setPhotos([]);
        setAssetsOffset(0);
        setHasMoreAssets(true);
      }
    };
    load();
    return () => controller.abort();
  }, [selectedFolderId]);

  const handleLoadMoreAssets = async () => {
    if (!selectedFolderId || loadingMoreAssets || !hasMoreAssets) return;
    setLoadingMoreAssets(true);
    try {
      const next = await fetchAssetsPage(selectedFolderId, assetsOffset);
      // Dedup by id
      const map = new Map<string, Photo>();
      [...photos, ...next].forEach((p) => map.set(p.id, p));
      const merged = Array.from(map.values());
      setPhotos(merged);
      setAssetsOffset(assetsOffset + next.length);
      setHasMoreAssets(next.length >= ASSETS_PAGE_SIZE);
    } catch (e) {
      console.error('Load more assets failed', e);
    } finally {
      setLoadingMoreAssets(false);
    }
  };

  // Auto-select first available folder if none selected
  useEffect(() => {
    if (!selectedFolderId && enhancedFolders.length > 0) {
      const firstFolder = enhancedFolders[0];
      setSelectedFolderId(firstFolder.id);
    }
  }, [selectedFolderId, enhancedFolders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    
    const fromFolders = folders
      .flatMap(f => [f, ...(f.children || [])])
      .find(f => f.id === selectedFolderId);
      
    const fromEnhanced = enhancedFolders.find(f => f.id === selectedFolderId);
    
    return fromFolders || fromEnhanced;
  }, [selectedFolderId, folders, enhancedFolders]);

  const filteredPhotos = photos.filter(photo =>
    photo.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePhotoSelection = (photoId: string, isSelected: boolean) => {
    setSelectedPhotoIds(prev =>
      isSelected
        ? [...prev, photoId]
        : prev.filter(id => id !== photoId)
    );
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds([]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando evento...</p>
        </div>
      </div>
    );
  }

  // Error state - only show if there's an actual error, not just loading
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar el evento</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/events')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a eventos
              </Button>
              <Button onClick={loadEventData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if no event data yet
  if (!event) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-muted">
      {/* Clean Header - Simplified Design */}
      <div className="border-b border-border bg-white shadow-sm">
        <div className="px-6 py-4">
        <div className="flex items-center justify-between">
            {/* Left: Navigation and title */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/events')}
                className="shrink-0 text-gray-500 dark:text-gray-400 hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Eventos
            </Button>
            
              <div className="h-4 w-px bg-gray-300" />
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {event.school || event.name}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <Badge 
                    variant={event.status === 'active' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {event.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {event.date ? new Date(event.date).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : 'Sin fecha'}
                  </span>
              </div>
            </div>
          </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
            <EventSelector
              value={eventId}
              onChange={(id) => router.push(`/admin/events/${id}/library`)}
                className="h-8 text-sm"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/store-settings?eventId=${eventId}`)}
                className="h-8 text-sm"
            >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Tienda
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={selectedFolderId ? () => handleShareFolder() : handleShareEvent}
                className="h-8 text-sm"
            >
                <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                Compartir
            </Button>

            <Button
              size="sm"
              onClick={handleViewClientGallery}
                className="h-8 text-sm bg-blue-600 hover:bg-blue-700"
            >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
              Vista Cliente
            </Button>
          </div>
        </div>
      </div>

        {/* Compact metrics bar */}
        <div className="px-6 py-3 bg-muted border-t border-gray-100">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {metrics?.photos?.total || event.stats?.totalPhotos || 0} fotos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {metrics?.folders?.familyFolders || event.stats?.totalSubjects || 0} familias
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {metrics?.sales?.orderCount || event.stats?.totalOrders || 0} pedidos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                ${(metrics?.sales?.totalRevenue || event.stats?.totalRevenue || 0) > 0 
                  ? ((metrics?.sales?.totalRevenue || event.stats?.totalRevenue || 0) / 100).toLocaleString() 
                  : '0'}
              </span>
            </div>
            
            <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshMetrics}
            disabled={metricsLoading}
                className="h-7 text-xs text-gray-500 hover:text-foreground"
          >
                <RefreshCw className={cn("h-3.5 w-3.5", metricsLoading && "animate-spin")} />
          </Button>
        </div>
        </div>
                  </div>
                </div>
                
      {/* Main Content Area - Simplified 2-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folder Tree and Quick Actions */}
        <div className="w-80 bg-white border-r border-border flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Estructura</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowAddLevelModal(true)}>
                    <Folder className="mr-2 h-4 w-4" />
                    Nuevo Nivel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddFolderQuick}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Nueva Carpeta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowStudentModal(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Gestionar Estudiantes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="text-xs text-gray-500">
              {enhancedFolders.length} carpetas organizadas
                </div>
              </div>
              
              {/* Folder Tree */}
              <div className="flex-1 overflow-y-auto p-4">
                <HierarchicalFolderTreeEnhanced
                  folders={enhancedFolders}
                  selectedFolderId={selectedFolderId}
                  expandedFolders={expandedFolders}
                  onFolderSelect={(fid) => setSelectedFolderId(fid)}
                  onFolderToggle={async (fid) => {
                    setExpandedFolders((prev) => prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]);
                    await ensureChildrenLoaded(fid);
                  }}
                  onFolderAction={async (action, folder) => {
                    switch (action) {
                      case 'create_child': {
                        const name = window.prompt('Nombre de la subcarpeta');
                        if (!name) return;
                        const res = await fetch('/api/admin/folders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: name.trim(), parent_id: folder.id, event_id: event?.id }),
                        });
                        if (!res.ok) { try { (await import('sonner')).toast.error('No se pudo crear la carpeta'); } catch {}; return; }
                        await refreshEnhancedFolders();
                        try { (await import('sonner')).toast.success('Carpeta creada'); } catch {}
                        break;
                      }
                      case 'rename': {
                        const newName = window.prompt('Nuevo nombre', folder.name);
                        if (!newName) return;
                        const res = await fetch(`/api/admin/folders/${folder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
                        if (!res.ok) { try { (await import('sonner')).toast.error('No se pudo renombrar'); } catch {}; return; }
                        await refreshEnhancedFolders();
                        break;
                      }
                      case 'move': {
                        await handleMoveFolder(folder.id);
                        await refreshEnhancedFolders();
                        break;
                      }
                      case 'share': {
                        setSelectedFolderId(folder.id);
                        await handleShareFolder(folder.id);
                        break;
                      }
                      case 'delete': {
                        setSelectedFolderId(folder.id);
                        await handleDeleteFolder(folder.id);
                        await refreshEnhancedFolders();
                        break;
                      }
                    }
                  }}
                  onDropPhotos={async (targetFolderId, assetIds) => {
                    try {
                      const res = await fetch('/api/admin/assets/bulk', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ asset_ids: assetIds, target_folder_id: targetFolderId }),
                      });
                      const ok = res.ok;
                      if (!ok) throw new Error('Mover fotos falló');
                      await refreshEnhancedFolders();
                      if (selectedFolderId) {
                        const params = new URLSearchParams({ folder_id: selectedFolderId, limit: '60' });
                        const list = await fetch(`/api/admin/assets?${params.toString()}`);
                        if (list.ok) {
                          const json = await list.json();
                          const mapped: Photo[] = (json.assets || []).map((a: any) => ({ id: a.id, original_filename: a.filename || 'archivo', preview_url: a.preview_url || null, thumbnail_url: a.preview_url || null, file_size: a.file_size || 0, created_at: a.created_at, approved: true, tagged: false }));
                          setPhotos(mapped);
                        }
                      }
                      try { (await import('sonner')).toast.success(`Movidas ${assetIds.length} fotos`); } catch {}
                    } catch (e) {
                      console.error(e);
                      try { (await import('sonner')).toast.error('No se pudieron mover las fotos'); } catch {}
                    }
                  }}
                />
              </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-100 p-4 bg-muted/50">
                <div className="space-y-2">
                  <Button
                    size="sm"
                onClick={() => handleUploadPhotos()}
                className="w-full justify-start h-8 bg-blue-600 hover:bg-blue-700"
                  >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Subir Fotos
                  </Button>
                  
              <div className="grid grid-cols-2 gap-2">
                  <Button
                  variant="outline"
                    size="sm"
                  onClick={() => handleShareEvent()}
                  className="h-8 text-xs"
                  >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Compartir
                  </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Más
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setActiveTab('store')}>
                      <Package className="mr-2 h-4 w-4" />
                      Configurar Tienda
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Configuración
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('sharing')}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Gestionar Enlaces
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
            </div>
        </div>

        {/* Main Content Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Content Tabs - Simplified */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
            {/* Tab List - Fixed alignment and dark theme colors */}
            <div className="border-b border-gray-700 px-6 bg-gray-800">
              <TabsList className="h-12 bg-transparent p-0 border-b-0 grid grid-cols-4 gap-0">
                <TabsTrigger 
                  value="photos" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none px-4 py-3 text-sm font-medium text-gray-300 data-[state=active]:text-blue-400 border-b-2 border-transparent hover:text-white transition-colors"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Fotos
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none px-4 py-3 text-sm font-medium text-gray-300 data-[state=active]:text-blue-400 border-b-2 border-transparent hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </TabsTrigger>
                <TabsTrigger 
                  value="store" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none px-4 py-3 text-sm font-medium text-gray-300 data-[state=active]:text-blue-400 border-b-2 border-transparent hover:text-white transition-colors"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Tienda
                </TabsTrigger>
                <TabsTrigger 
                  value="sharing" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none px-4 py-3 text-sm font-medium text-gray-300 data-[state=active]:text-blue-400 border-b-2 border-transparent hover:text-white transition-colors"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Enlaces
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <TabsContent value="photos" className="flex-1 m-0 flex flex-col overflow-hidden">
              {/* Photo Gallery Header */}
              <div className="px-6 py-4 border-b border-border bg-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {(enhancedFolders.find((f) => f.id === selectedFolderId)?.name) || 'Selecciona una carpeta'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedFolderId ? (
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {filteredPhotos.length} fotografías {searchQuery && `(filtradas de ${photos.length})`}
                        </span>
                      ) : (
                        'Selecciona una carpeta de la barra lateral para ver las fotos'
                      )}
                    </p>
                  </div>
                  
                  {/* Action bar - simplified */}
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Buscar fotos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 h-8 text-sm border-border focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                    
                    {/* View toggle */}
                    <div className="flex rounded-md border border-border bg-white">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none border-r border-border h-8 px-3"
                      >
                        <Grid3X3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none h-8 px-3"
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Selection bar */}
                  {selectedPhotoIds.length > 0 && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-100 dark:bg-blue-950/30 text-blue-700 border-blue-200">
                        {selectedPhotoIds.length} seleccionadas
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShareSelected}
                          disabled={bulkActionLoading}
                          className="h-7 text-xs text-green-600 hover:text-green-700"
                        >
                          <Share2 className="h-3.5 w-3.5 mr-1" />
                          Compartir
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleApprovePhotos}
                          disabled={bulkActionLoading}
                        className="h-7 text-xs"
                        >
                        <Star className="h-3.5 w-3.5 mr-1" />
                          Aprobar
                        </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteSelectedPhotos}
                        disabled={bulkActionLoading}
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Eliminar
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearSelection}
                        className="h-7 text-xs text-gray-500"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Limpiar
                      </Button>
                    </div>
                    </div>
                  )}
              </div>
              
              {/* Photo Grid Area */}
              <div
                className="flex-1 p-6 overflow-y-auto bg-muted min-h-0"
                onDragOver={(e) => {
                  if (e.dataTransfer?.types?.includes('Files')) {
                    e.preventDefault();
                    setIsDragOverUpload(true);
                  }
                }}
                onDragLeave={(e) => {
                  if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
                  setIsDragOverUpload(false);
                }}
                onDrop={(e) => {
                  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    setIsDragOverUpload(false);
                    void handleDirectUploadFiles(files);
                  }
                }}
              >
                {selectedFolderId && filteredPhotos.length > 0 ? (
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-5 gap-4" 
                      : "space-y-3"
                  )}>
                    {filteredPhotos.map((photo) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        viewMode={viewMode}
                        isSelected={selectedPhotoIds.includes(photo.id)}
                        onSelect={(isSelected) => handlePhotoSelection(photo.id, isSelected)}
                        selectedIds={selectedPhotoIds}
                      />
                    ))}
                  </div>
                ) : selectedFolderId && photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ImageIcon className="h-16 w-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No hay fotos en esta carpeta</p>
                    <p className="text-sm text-gray-400 mb-4">Arrastra archivos aquí o usa el botón de subir</p>
                    <Button onClick={() => handleUploadPhotos()} className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Subir fotos
                    </Button>
                  </div>
                ) : selectedFolderId ? (
                  null
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Folder className="h-16 w-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Selecciona una carpeta</p>
                    <p className="text-sm text-gray-400">Elige una carpeta de la barra lateral para ver las fotos</p>
                  </div>
                )}

                {/* Load more button */}
                {selectedFolderId && filteredPhotos.length > 0 && hasMoreAssets && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMoreAssets}
                      disabled={loadingMoreAssets}
                      className="px-6"
                    >
                      {loadingMoreAssets ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        'Cargar más'
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Drag overlay */}
              {isDragOverUpload && (
                  <div className="absolute inset-0 bg-blue-50/80 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                      <p className="text-lg font-medium text-blue-900">Suelta las fotos aquí</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Se subirán a la carpeta seleccionada</p>
                  </div>
                </div>
              )}
            </div>
            </TabsContent>
            
            <TabsContent value="settings" className="m-0 flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                              <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Configuración del Evento</h3>
                  <p className="text-gray-500 dark:text-gray-400">Gestiona las opciones y configuración avanzada del evento</p>
                              </div>
                              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* General Settings */}
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                        <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                      <h4 className="text-lg font-medium text-foreground">General</h4>
                          </div>
                    <div className="space-y-3">
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowStudentModal(true)}>
                        <Users className="h-4 w-4 mr-2" />
                            Gestionar Estudiantes
                          </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                            <Edit3 className="h-4 w-4 mr-2" />
                        Editar Información
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Configurar Fecha
                          </Button>
                        </div>
                  </Card>

                      {/* Privacy Settings */}
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                        <Eye className="h-5 w-5 text-green-600" />
                          </div>
                      <h4 className="text-lg font-medium text-foreground">Privacidad</h4>
                          </div>
                      <div className="space-y-4">
                      <div className="flex items-center justify-between">
                          <div>
                          <p className="text-sm font-medium text-foreground">Galería Pública</p>
                          <p className="text-xs text-gray-500">Permitir acceso sin autenticación</p>
                          </div>
                        <input type="checkbox" className="rounded border-border" />
                        </div>
                      <div className="flex items-center justify-between">
                          <div>
                          <p className="text-sm font-medium text-foreground">Requerir Token</p>
                          <p className="text-xs text-gray-500">Usar tokens de acceso únicos</p>
                          </div>
                        <input type="checkbox" className="rounded border-border" defaultChecked />
                        </div>
                          </div>
                  </Card>
                    </div>
            </div>
          </TabsContent>
          
            <TabsContent value="store" className="m-0 flex-1 p-6">
              <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-xl font-medium text-foreground mb-2">Configuración de Tienda</h3>
                  <p className="text-gray-500 dark:text-gray-400">Gestiona productos, precios y configuración de ventas</p>
              </div>
          
                <div className="space-y-6">
              <StoreConfigPanel 
                eventId={eventId}
                    onUpdate={() => {
                  refreshMetrics();
                }}
              />
                <ProductManagementPanel onProductChange={refreshMetrics} />
              </div>
            </div>
          </TabsContent>
          
            <TabsContent value="sharing" className="m-0 flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Compartir</h3>
                  <p className="text-gray-500 dark:text-gray-400">Genera enlaces públicos para compartir fotos con familias</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h4 className="text-lg font-medium text-foreground mb-4">Evento Completo</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Comparte todas las fotos del evento con un solo enlace</p>
                    <Button onClick={handleShareEvent} className="w-full">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Generar enlace del Evento
                    </Button>
                  </Card>
                  
                  <Card className="p-6">
                    <h4 className="text-lg font-medium text-foreground mb-4">Carpeta Específica</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Comparte solo las fotos de una carpeta seleccionada</p>
                    <Button
                      variant={selectedFolderId ? 'default' : 'outline'}
                      disabled={!selectedFolderId}
                      onClick={() => handleShareFolder()}
                      className="w-full"
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      {selectedFolderId ? 'Generar enlace de Carpeta' : 'Selecciona una carpeta'}
                    </Button>
                  </Card>
                  </div>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>💡 Tip:</strong> Los enlaces se copian automáticamente al portapapeles y incluyen códigos QR para compartir fácilmente.
                  </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Upload Interface Modal (inline) */}
      {showUploadInterface && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden">
            <UploadInterface
              eventId={eventId}
              currentFolderId={selectedFolderId}
              currentFolderName={(enhancedFolders.find((f) => f.id === selectedFolderId)?.name) || selectedFolder?.name || ''}
              onUploadComplete={async () => {
                if (selectedFolderId) {
                  try {
                    const params = new URLSearchParams({ folder_id: selectedFolderId, limit: '60' });
                    const res = await fetch(`/api/admin/assets?${params.toString()}`);
                    if (res.ok) {
                      const json = await res.json();
                      const items = (json.assets || []) as Array<any>;
                      const mapped: Photo[] = items.map((a) => ({
                        id: a.id,
                        original_filename: a.filename || 'archivo',
                        preview_url: a.preview_url || null,
                        thumbnail_url: a.preview_url || null,
                        file_size: a.file_size || 0,
                        created_at: a.created_at,
                        approved: true,
                        tagged: false,
                      }));
                      setPhotos(mapped);
                    }
                  } catch (e) {
                    console.warn('No se pudo refrescar la carpeta después de subir', e);
                  }
                }
                setShowUploadInterface(false);
                setInitialUploadFiles(null);
              }}
              onClose={() => {
                setShowUploadInterface(false);
                setInitialUploadFiles(null);
              }}
              initialFiles={initialUploadFiles || undefined}
            />
          </div>
        </div>
      )}

      {/* Add Level Modal */}
      {showAddLevelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Agregar Nuevo Nivel</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const levelName = formData.get('levelName') as string;
              if (levelName.trim()) {
                handleAddLevel(levelName.trim());
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="levelName" className="block text-sm font-medium text-foreground mb-2">
                    Nombre del Nivel
                  </label>
                  <Input
                    id="levelName"
                    name="levelName"
                    type="text"
                    placeholder="ej: Nivel Inicial, Nivel Secundario..."
                    className="w-full"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddLevelModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Crear Nivel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {shareModal && (
        <ProfessionalShareModal 
          url={shareModal.url}
          title={shareModal.title}
          description={shareModal.description}
          type={shareModal.type}
          isOpen={true}
          onClose={() => setShareModal(null)} 
        />
      )}

      {/* Student Manager Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-foreground">Gestión de Estudiantes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Carga y organiza la lista de estudiantes para este evento
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* AI-Assisted Import */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <FileUser className="h-5 w-5 mr-2" />
                    Importación Inteligente
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Pega una lista de estudiantes en cualquier formato y la organizaremos automáticamente
                  </p>
                  <textarea
                    className="w-full h-32 p-3 border border-blue-200 dark:border-blue-800 rounded-lg resize-none"
                    placeholder="Ejemplo:
Juan Pérez - 6to A
María González, Sala 3
Pedro López (4to B)
..."
                  />
                  <Button className="mt-3 bg-blue-600 hover:bg-blue-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Procesar Lista
                  </Button>
                </div>
                
                {/* Manual Entry */}
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">Entrada Manual</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nombre del estudiante"
                      value={manualStudentName}
                      onChange={(e) => setManualStudentName(e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border border-border rounded-lg"
                      value={manualStudentCourseId}
                      onChange={(e) => setManualStudentCourseId(e.target.value)}
                    >
                      <option value="">Seleccionar curso...</option>
                      {folders.flatMap((lvl) =>
                        (lvl.children || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {lvl.name} / {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3"
                    disabled={!manualStudentName.trim()}
                    onClick={() => {
                      try { (async () => { (await import('sonner')).toast.success('Usá el importador CSV para crear estudiantes. El selector ahora lista cursos reales.'); })(); } catch {}
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Estudiante
                  </Button>
                </div>
                
                {/* Current Students */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Estudiantes Actuales (0)
                  </h4>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay estudiantes cargados aún</p>
                    <p className="text-sm">Usa las opciones de arriba para comenzar</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-border mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1"
                >
                  Cerrar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  <Package className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
