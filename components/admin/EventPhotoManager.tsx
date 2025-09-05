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

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
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
  Filter,
  Star,
  Download,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Image as ImageIcon,
  School,
  BookOpen,
  Home,
  RefreshCw,
  MoreVertical,
  Tag,
  Maximize2,
  X,
  User,
  Edit3,
  FileUser,
  Package,
  Link as LinkIcon,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimpleTooltip as Tooltip } from '@/components/ui/tooltip';
import { UploadInterface } from '@/app/admin/events/[id]/library/components/UploadInterface';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 🚀 FASE 1: Importar componentes del dashboard estilo PixieSet
import { MetricCard } from '@/components/admin/shared/MetricCard';
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



export default function EventPhotoManager({ eventId, initialEvent }: EventPhotoManagerProps) {
  const router = useRouter();
  
  // 🚀 FASE 1: Hook de métricas estilo PixieSet
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useEventMetrics(eventId);
  
  // Feature toggles for safe, incremental UI enhancements
  const UI_ENHANCEMENTS = {
    stickyTopBar: true,
    contextualActionBar: true,
    hideInspectorWhenNoSelection: true,
    enableApproveInActionBar: true,
    enableDownloadInActionBar: false, // requires bulk download endpoint or zip client
    enableMoveInActionBar: false, // requires /api/admin/photos/bulk-move
    enablePublishInActionBar: false, // expose publish/unpublish first
  } as const;
  
  const [event, setEvent] = useState<Event | null>(initialEvent || null);
  
  // 🚀 FASE 1: Estado para tabs de configuración
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
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  // Upload modal state (open inline instead of navigating away)
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [initialUploadFiles, setInitialUploadFiles] = useState<File[] | null>(null);
  // Upload handled by routing to library page - legacy comment kept for context
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  // Student modal local state
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentCourseId, setManualStudentCourseId] = useState<string>('');

  // No demo photos; always load real assets
  
  // Direct upload helper (assets API with watermark/optimization)
  const handleDirectUploadFiles = async (files: File[]) => {
    if (!selectedFolderId) {
      try { (await import('sonner')).toast.error('Selecciona una carpeta para subir'); } catch {}
      return;
    }
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      fd.append('folder_id', selectedFolderId);
      const res = await fetch('/api/admin/assets/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Fallo la carga');
      }
      try { (await import('sonner')).toast.success(`Subidas ${json.uploaded} imágenes`); } catch {}
      // Refresh current folder assets
      const params = new URLSearchParams({ folder_id: selectedFolderId, limit: '60' });
      const list = await fetch(`/api/admin/assets?${params.toString()}`);
      if (list.ok) {
        const data = await list.json();
        const mapped: Photo[] = (data.assets || []).map((a: any) => ({
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
      console.error('Upload failed', e);
      try { (await import('sonner')).toast.error('No se pudieron subir las imágenes'); } catch {}
    }
  };
  
  // Helpers for folder tree (ilimitado)
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

  // Action functions - estas son las funciones reales que conectan con el sistema
  const handleAddLevel = async (levelName: string) => {
    try {
      setShowAddLevelModal(false);
      setLoading(true);
      
      // Create a top-level folder for the event
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
      
      // Show success feedback
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
    
    try {
      setBulkActionLoading(true);
      
      // Call API to approve photos
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

      // Update photos state
      setPhotos(prev => prev.map(photo => 
        selectedPhotoIds.includes(photo.id) 
          ? { ...photo, approved: true }
          : photo
      ));

      // Clear selection
      setSelectedPhotoIds([]);
      
      console.log(`✅ ${selectedPhotoIds.length} fotos aprobadas`);
      
    } catch (error) {
      console.error('Error approving photos:', error);
      try { (await import('sonner')).toast.error('Error aprobando las fotos'); } catch {}
    } finally {
      setBulkActionLoading(false);
    }
  };

  // 🔥 UNIFIED UPLOAD HANDLER - Single point of entry for all photo uploads
  const handleUploadPhotos = (initialFiles?: File[]) => {
    if (!selectedFolderId) {
      try {
        (async () => {
          (await import('sonner')).toast.error('Selecciona una carpeta primero para subir fotos');
        })();
      } catch {}
      return;
    }
    // Open inline upload modal
    setInitialUploadFiles(initialFiles || null);
    setShowUploadInterface(true);
  };

  // Quick: add subfolder inside selected folder (or root if none selected)
  const handleAddFolderQuick = async () => {
    try {
      const name = window.prompt('Nombre de la nueva carpeta');
      if (!name) return;
      setFolderActionLoading(true);
      // UI muestra dos niveles (Nivel -> Curso). Si hay un curso seleccionado, agregamos al nivel padre.
      const selected = folders
        .flatMap((f) => [f, ...(f.children || [])])
        .find((f) => f.id === selectedFolderId) as (Folder | undefined);
      const parentForNew = selected
        ? (selected.parentId || selected.id) // si es child, usar parentId; si es level, usar su id
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
      // Update local state
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

  // Delete selected folder (force delete its contents)
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

      // Remove from UI state
      setFolders((prev) => {
        // If it's a root folder
        if (prev.some((f) => f.id === idToDelete)) {
          return prev.filter((f) => f.id !== idToDelete);
        }
        // Otherwise remove from any children array
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

  // Delete selected photos (assets)
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

  // Move folder to another parent (prompt-based quick action)
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
      // Refresh list to keep state consistent
      await loadEventData();
    } catch (e) {
      console.error('Error moviendo carpeta', e);
      try { (await import('sonner')).toast.error('No se pudo mover la carpeta'); } catch {}
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const newName = window.prompt('Nuevo nombre de carpeta', currentName);
    if (!newName || newName.trim() === currentName) return;
    try {
      setFolderActionLoading(true);
      const res = await fetch(`/api/admin/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.folder) throw new Error(data?.error || 'No se pudo renombrar');
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? { ...f, name: newName.trim() }
            : { ...f, children: (f.children || []).map((c) => (c.id === folderId ? { ...c, name: newName.trim() } : c)) }
        )
      );
    } catch (e) {
      console.error('Error renombrando carpeta', e);
      try { (await import('sonner')).toast.error('No se pudo renombrar la carpeta'); } catch {}
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleViewClientGallery = () => {
    // Create or reuse event share token and open /share/{token}
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
      
      // Show professional sharing modal
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
      
      // Find folder name
      const folder = folders.find(f => f.id === folderToShare);
      const folderName = folder?.name || 'Carpeta';
      
      // Show professional sharing modal
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

  // Simple share modal state (QR + link) — declared arriba

  // Load event data on mount
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event details
      const eventResponse = await fetch(`/api/admin/events/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Error loading event');
      }
      const eventData = await eventResponse.json();
      setEvent(eventData.event);
      // Cargar carpetas del evento (lista plana paginada)
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
      // Inicializar selección con el primer root o el primer elemento
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

  // Load assets when folder changes
  useEffect(() => {
    const fetchAssets = async () => {
      if (!selectedFolderId) {
        console.debug('EventPhotoManager - no folder selected, clearing photos');
        setPhotos([]);
        return;
      }
      try {
        console.debug('EventPhotoManager - fetching assets for folder:', selectedFolderId);
        const params = new URLSearchParams({ folder_id: selectedFolderId, limit: '60' });
        const res = await fetch(`/api/admin/assets?${params.toString()}`);
        if (!res.ok) throw new Error(`Error fetching assets: ${res.status} ${res.statusText}`);
        const json = await res.json();
        const items = (json.assets || []) as Array<any>;
        console.debug('EventPhotoManager - received assets from API:', {
          count: items.length,
          folderId: selectedFolderId,
          response: json
        });
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
      } catch (e) {
        console.error('Error loading assets', e);
        setPhotos([]);
      }
    };
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  // Auto-select first available folder if none selected
  useEffect(() => {
    if (!selectedFolderId && enhancedFolders.length > 0) {
      const firstFolder = enhancedFolders[0];
      console.debug('EventPhotoManager - auto-selecting first folder:', {
        id: firstFolder.id,
        name: firstFolder.name
      });
      setSelectedFolderId(firstFolder.id);
    }
  }, [selectedFolderId, enhancedFolders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    
    // Debug logging
    console.debug('EventPhotoManager - selectedFolder calculation:', {
      selectedFolderId,
      foldersCount: folders.length,
      enhancedFoldersCount: enhancedFolders.length,
      folderIds: folders.map(f => f.id),
      enhancedFolderIds: enhancedFolders.map(f => f.id)
    });
    
    // Try both folder sources for robustness
    const fromFolders = folders
      .flatMap(f => [f, ...(f.children || [])])
      .find(f => f.id === selectedFolderId);
      
    const fromEnhanced = enhancedFolders.find(f => f.id === selectedFolderId);
    
    const result = fromFolders || fromEnhanced;
    
    console.debug('EventPhotoManager - selectedFolder result:', {
      fromFolders: !!fromFolders,
      fromEnhanced: !!fromEnhanced,
      finalResult: !!result,
      resultName: result?.name
    });
    
    return result;
  }, [selectedFolderId, folders, enhancedFolders]);

  const filteredPhotos = photos.filter(photo =>
    photo.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPhotos = photos.filter(photo => selectedPhotoIds.includes(photo.id));

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando evento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Error al cargar el evento</h3>
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Evento no encontrado'}</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/events')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a eventos
              </Button>
              <Button
                onClick={loadEventData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handlePhotoSelection = (photoId: string, isSelected: boolean) => {
    setSelectedPhotoIds(prev =>
      isSelected
        ? [...prev, photoId]
        : prev.filter(id => id !== photoId)
    );
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(filteredPhotos.map(p => p.id));
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Simplified Header - Event Information */}
      <div className="border-b border-gray-200/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/events')}
              className="rounded-full p-2 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Link href="/admin" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/admin/events" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Eventos
                </Link>
                <span>/</span>
              </div>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                  {event.school || event.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge 
                    variant={event.status === 'active' ? 'secondary' : 'outline'}
                    className="text-xs px-2 py-1"
                  >
                    {event.status === 'active' ? 'Activo' : event.status || 'Inactivo'}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    {event.date ? new Date(event.date).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Sin fecha'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONSOLIDACIÓN: Un solo botón inteligente que detecta contexto */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={selectedFolderId ? () => handleShareFolder() : handleShareEvent}
              className="border-gray-300 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:hover:border-blue-400 transition-all"
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedFolderId ? 'Compartir Carpeta' : 'Compartir Evento'}
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleViewClientGallery}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vista Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard - Improved Typography & Dark Mode */}
      <div className="px-8 py-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Métricas del Evento</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshMetrics}
            disabled={metricsLoading}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <RefreshCw className={cn("h-4 w-4", metricsLoading && "animate-spin")} />
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            icon={Camera}
            label="Fotografías"
            value={metrics?.photos?.total || event.stats?.totalPhotos || 0}
            change={metrics?.photos?.pending ? {
              value: `${metrics.photos.pending} pendientes`,
              trend: 'neutral'
            } : undefined}
            color="blue"
            loading={metricsLoading}
            onClick={() => setActiveTab('photos')}
          />
          
          <MetricCard
            icon={Users}
            label="Familias"
            value={metrics?.folders?.familyFolders || event.stats?.totalSubjects || 0}
            change={metrics?.engagement?.uniqueVisitors ? {
              value: `${metrics.engagement.uniqueVisitors} visitantes`,
              trend: 'up'
            } : undefined}
            color="green"
            loading={metricsLoading}
            onClick={() => setActiveTab('photos')}
          />
          
          <MetricCard
            icon={ShoppingCart}
            label="Pedidos"
            value={metrics?.sales?.orderCount || event.stats?.totalOrders || 0}
            change={metrics?.sales?.pendingOrders ? {
              value: `${metrics.sales.pendingOrders} pendientes`,
              trend: 'neutral'
            } : undefined}
            color="purple"
            loading={metricsLoading}
            onClick={() => setActiveTab('store')}
          />
          
          <MetricCard
            icon={DollarSign}
            label="Ingresos"
            value={`$${(metrics?.sales?.totalRevenue || event.stats?.totalRevenue || event.stats?.revenue || 0) > 0 
              ? ((metrics?.sales?.totalRevenue || event.stats?.totalRevenue || event.stats?.revenue || 0) / 100).toLocaleString() 
              : '0'}`}
            change={metrics?.sales?.avgOrderValue ? {
              value: `Promedio: $${(metrics.sales.avgOrderValue / 100).toFixed(0)}`,
              trend: 'up'
            } : undefined}
            color="orange"
            loading={metricsLoading}
            onClick={() => setActiveTab('store')}
          />
        </div>
      </div>

      {/* Navigation Tabs - Improved Typography & Dark Mode */}
      <div className="px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="h-14 bg-transparent p-0 border-b-0">
            <TabsTrigger 
              value="photos" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              <Camera className="h-4 w-4 mr-2" />
              Gestión de Fotos
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </TabsTrigger>
            <TabsTrigger 
              value="store" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              <Package className="h-4 w-4 mr-2" />
              Tienda
            </TabsTrigger>
            <TabsTrigger 
              value="sharing" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Enlaces
            </TabsTrigger>
          </TabsList>
          {/* 🚀 FASE 1: TabsContent para organizar el contenido */}
          <TabsContent value="photos" className="m-0 flex-1">
            {/* Main Content - 3 Panel Layout */}
            <div className="flex-1">
              <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Event Navigation & Settings */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200/60 dark:border-gray-700/60">
              {/* Navigation Section - Improved Typography */}
              <div className="border-b border-gray-200/60 dark:border-gray-700/60 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Estructura del Evento</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Niveles y cursos organizados</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 transition-all"
                    onClick={() => setShowAddLevelModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Nivel
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-all"
                    onClick={() => setShowStudentModal(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cargar Alumnos
                  </Button>
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
                        // Reutilizar flujo existente
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
                      // recargar fotos de la carpeta actual
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

              {/* Simplified Quick Actions Section */}
              <div className="border-t border-gray-200/60 dark:border-gray-700/60 p-4 bg-gray-50/50 dark:bg-gray-800/50">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Acciones</h4>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all"
                    onClick={() => setActiveTab('sharing')}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Gestionar Enlaces
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center Panel - Photo Gallery */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <div
              className="relative h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
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
                  console.log('🔥 UNIFIED UPLOAD: Drag & drop detected', files.length, 'files');
                  setIsDragOverUpload(false);
                  // Subida directa a la carpeta seleccionada con watermark
                  void handleDirectUploadFiles(files);
                }
              }}
            >
              {/* Modern Toolbar */}
              <div
                className={cn(
                  'border-b border-gray-200/60 dark:border-gray-700/60 p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm',
                  UI_ENHANCEMENTS.stickyTopBar && 'sticky top-0 z-20 bg-white dark:bg-gray-900 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60'
                )}
                role="toolbar"
                aria-label="Barra de acciones de la galería"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                      {(enhancedFolders.find((f) => f.id === selectedFolderId)?.name) || selectedFolder?.name || 'Selecciona un nivel o curso'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedFolderId ? (
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {filteredPhotos.length} fotografías {searchQuery && `(filtradas de ${photos.length})`}
                        </span>
                      ) : (
                        'Navega por la estructura de niveles para ver las fotos'
                      )}
                    </p>
                  </div>
                  
                  {/* Simplified Primary Actions */}
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                      onClick={() => handleUploadPhotos()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Fotos
                    </Button>
                    
                    {/* Compact View Toggle */}
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none border-r dark:border-gray-600"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Search & Filters - Improved Dark Mode */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Buscar fotografías por nombre de archivo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  
                  <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                  
                  {selectedPhotoIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                      <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                        {selectedPhotoIds.length} seleccionadas
                      </Badge>
                      {UI_ENHANCEMENTS.contextualActionBar && UI_ENHANCEMENTS.enableApproveInActionBar && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleApprovePhotos}
                          disabled={bulkActionLoading}
                          className="border-gray-300"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                      )}
                      {UI_ENHANCEMENTS.contextualActionBar && !UI_ENHANCEMENTS.enableMoveInActionBar && (
                        <Tooltip text="Mover requiere endpoint /api/admin/photos/bulk-move">
                          <span>
                            <Button variant="outline" size="sm" disabled className="border-gray-300">
                              <FolderOpen className="h-4 w-4 mr-1" />
                              Mover
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {UI_ENHANCEMENTS.contextualActionBar && !UI_ENHANCEMENTS.enableDownloadInActionBar && (
                        <Tooltip text="Descarga masiva disponible pronto">
                          <span>
                            <Button variant="outline" size="sm" disabled className="border-gray-300">
                              <Download className="h-4 w-4 mr-1" />
                              Descargar
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleDeleteSelectedPhotos}
                        disabled={bulkActionLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearSelection}
                        className="border-gray-300"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpiar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Photo Grid */}
              <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
                {selectedFolder && filteredPhotos.length > 0 ? (
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-4 gap-4" 
                      : "space-y-2"
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
                ) : selectedFolder ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ImageIcon className="h-12 w-12 mb-4" />
                    <p>No hay fotos en esta carpeta</p>
                    <Button variant="outline" className="mt-4" onClick={() => handleUploadPhotos()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir primera foto
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Folder className="h-12 w-12 mb-4" />
                    <p>Selecciona una carpeta para ver las fotos</p>
                  </div>
                )}
              </div>
              {isDragOverUpload && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded bg-blue-50/70">
                  <div className="rounded-xl border-2 border-dashed border-blue-400 bg-white/80 px-6 py-4 text-blue-700 shadow">
                    Soltá los archivos para subirlos aquí
                  </div>
                </div>
              )}

            </div>
          </ResizablePanel>

          {(!UI_ENHANCEMENTS.hideInspectorWhenNoSelection || selectedPhotoIds.length > 0) && (
            <>
          <ResizableHandle />

          {/* Right Panel - Settings & Inspector */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full bg-white/80 backdrop-blur-sm border-l border-gray-200/60">
              <Tabs defaultValue="inspector" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                  <TabsTrigger value="inspector" className="text-xs">Inspector</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">Configuración</TabsTrigger>
                </TabsList>
                
                {/* Inspector Tab */}
                <TabsContent value="inspector" className="flex-1 m-0">
                  <div className="border-b border-gray-200/60 p-4">
                    <h3 className="font-semibold text-gray-900">Inspector de Fotos</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedPhotos.length > 0 
                        ? `${selectedPhotos.length} fotografía${selectedPhotos.length !== 1 ? 's' : ''} seleccionada${selectedPhotos.length !== 1 ? 's' : ''}`
                        : 'Selecciona fotos para ver detalles'
                      }
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedPhotos.length > 0 ? (
                      <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-gray-50/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Acciones Rápidas</h4>
                          <div className="space-y-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-all"
                              onClick={handleApprovePhotos}
                              disabled={selectedPhotoIds.length === 0 || bulkActionLoading}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {bulkActionLoading ? 'Aprobando...' : `Aprobar ${selectedPhotoIds.length > 0 ? `(${selectedPhotoIds.length})` : 'Fotos'}`}
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 transition-all">
                              <Tag className="h-4 w-4 mr-2" />
                              Etiquetar Estudiantes
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 transition-all">
                              <Download className="h-4 w-4 mr-2" />
                              Descargar Selección
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start hover:bg-red-50 hover:border-red-300 text-red-600 transition-all">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </div>
                        </div>

                        {/* Photo Details */}
                        {selectedPhotos.length === 1 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Detalles de la Fotografía</h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Archivo</p>
                                <p className="text-gray-900 break-all">{selectedPhotos[0].original_filename}</p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tamaño</p>
                                  <p className="text-gray-900">{(selectedPhotos[0].file_size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                                
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dimensiones</p>
                                  <p className="text-gray-900">{selectedPhotos[0].width}×{selectedPhotos[0].height}</p>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estado</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={selectedPhotos[0].approved ? "default" : "outline"} className="text-xs">
                                    {selectedPhotos[0].approved ? "✓ Aprobada" : "⏳ Pendiente"}
                                  </Badge>
                                  <Badge variant={selectedPhotos[0].tagged ? "default" : "outline"} className="text-xs">
                                    {selectedPhotos[0].tagged ? "🏷️ Etiquetada" : "Sin etiquetar"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {selectedPhotos[0].students && selectedPhotos[0].students.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estudiantes Asignados</p>
                                  <div className="space-y-1">
                                    {selectedPhotos[0].students.map((student) => (
                                      <div key={student.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                        <Users className="h-3 w-3 text-gray-400" />
                                        {student.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Batch Operations */}
                        {selectedPhotos.length > 1 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Selección</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Aprobadas:</span>
                                <span className="font-medium">{selectedPhotos.filter(p => p.approved).length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Etiquetadas:</span>
                                <span className="font-medium">{selectedPhotos.filter(p => p.tagged).length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Con estudiantes:</span>
                                <span className="font-medium">{selectedPhotos.filter(p => p.students && p.students.length > 0).length}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                          <CheckSquare className="h-8 w-8" />
                        </div>
                        <p className="text-center text-sm">Selecciona fotografías para ver detalles y realizar acciones</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="flex-1 m-0">
                  <div className="border-b border-gray-200/60 p-4">
                    <h3 className="font-semibold text-gray-900">Configuración del Evento</h3>
                    <p className="text-sm text-gray-500 mt-1">Gestiona las opciones del evento</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      {/* General Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">General</h4>
                            <p className="text-sm text-gray-500">Configuración básica del evento</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pl-11">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <FileUser className="h-4 w-4 mr-2" />
                            Gestionar Estudiantes
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Upload className="h-4 w-4 mr-2" />
                            Cargar Lista de Alumnos
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Editar Información del Evento
                          </Button>
                        </div>
                      </div>

                      {/* Privacy Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Eye className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Privacidad</h4>
                            <p className="text-sm text-gray-500">Control de acceso y visibilidad</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pl-11">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Galería Pública</span>
                            <input type="checkbox" className="rounded" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Requerir Token</span>
                            <input type="checkbox" className="rounded" defaultChecked />
                          </div>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Settings className="h-4 w-4 mr-2" />
                            Configurar Contraseñas
                          </Button>
                        </div>
                      </div>

                      {/* Sharing Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Upload className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Compartir</h4>
                            <p className="text-sm text-gray-500">Opciones de compartir y distribución</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pl-11">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-gray-700 hover:bg-gray-100"
                            onClick={handleShareEvent}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Compartir Evento Completo
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Star className="h-4 w-4 mr-2" />
                            Ver Álbumes Compartidos
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Download className="h-4 w-4 mr-2" />
                            Configurar Descargas
                          </Button>
                        </div>
                      </div>

                      {/* Store Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <ShoppingCart className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Tienda</h4>
                            <p className="text-sm text-gray-500">Configuración de ventas y productos</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pl-11">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Tienda Habilitada</span>
                            <input type="checkbox" className="rounded" defaultChecked />
                          </div>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Configurar Precios
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Package className="h-4 w-4 mr-2" />
                            Ver Pedidos
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
            </>
          )}
              </ResizablePanelGroup>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="m-0 flex-1">
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-xl font-semibold mb-4">Configuración del Evento</h3>
                <p className="text-gray-600">Panel de configuración avanzada - En desarrollo</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="store" className="m-0 flex-1">
            <div className="p-8">
              <StoreConfigPanel 
                eventId={eventId}
                onUpdate={(config) => {
                  // Actualizar métricas después de cambios en tienda
                  refreshMetrics();
                }}
              />
              <div className="mt-8">
                <ProductManagementPanel onProductChange={refreshMetrics} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sharing" className="m-0 flex-1">
            <div className="p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                <h3 className="text-xl font-semibold">Compartir</h3>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="mb-4 text-sm text-gray-600">Generá enlaces públicos para compartir el evento completo o la carpeta seleccionada.</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={handleShareEvent} className="sm:flex-1">
                      <LinkIcon className="mr-2 h-4 w-4" /> Generar enlace del Evento
                    </Button>
                    <Button
                      variant={selectedFolderId ? 'default' : 'outline'}
                      disabled={!selectedFolderId}
                      onClick={() => handleShareFolder()}
                      className="sm:flex-1"
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      {selectedFolderId ? 'Generar enlace de la Carpeta' : 'Selecciona una carpeta'}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">El enlace se copia al portapapeles y se muestra un QR para compartirlo fácilmente.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
                // Refresh current folder assets after upload
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
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Agregar Nuevo Nivel</h3>
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
                  <label htmlFor="levelName" className="block text-sm font-medium text-gray-700 mb-2">
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
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Gestión de Estudiantes</h3>
              <p className="text-sm text-gray-600 mt-1">
                Carga y organiza la lista de estudiantes para este evento
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* AI-Assisted Import */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <FileUser className="h-5 w-5 mr-2" />
                    Importación Inteligente
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Pega una lista de estudiantes en cualquier formato y la organizaremos automáticamente
                  </p>
                  <textarea
                    className="w-full h-32 p-3 border border-blue-200 rounded-lg resize-none"
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
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Entrada Manual</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nombre del estudiante"
                      value={manualStudentName}
                      onChange={(e) => setManualStudentName(e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg"
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
                      // Nota: creación real de estudiante ya existe vía StudentCSVUploader.
                      // Aquí solo feedback; conectar a /api/admin/subjects si se requiere flujo manual.
                      try { (async () => { (await import('sonner')).toast.success('Usá el importador CSV para crear estudiantes. El selector ahora lista cursos reales.'); })(); } catch {}
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Estudiante
                  </Button>
                </div>
                
                {/* Current Students */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Estudiantes Actuales (0)
                  </h4>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay estudiantes cargados aún</p>
                    <p className="text-sm">Usa las opciones de arriba para comenzar</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
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

// PhotoCard Component
interface PhotoCardProps {
  photo: Photo;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (isSelected: boolean) => void;
  selectedIds?: string[]; // para drag de múltiples fotos
}

function PhotoCard({ photo, viewMode, isSelected, onSelect, selectedIds }: PhotoCardProps) {
  if (viewMode === 'list') {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
      )}>
        <button
          onClick={() => onSelect(!isSelected)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        
        <div className="h-12 w-12 rounded bg-gray-200 overflow-hidden">
          <img 
            src={photo.thumbnail_url} 
            alt={photo.original_filename}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden h-full w-full flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{photo.original_filename}</p>
          <p className="text-xs text-gray-500">
            {(photo.file_size / 1024 / 1024).toFixed(1)} MB • {photo.width}×{photo.height}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {photo.approved && <Badge variant="secondary" className="text-xs">Aprobada</Badge>}
          {photo.tagged && <Badge variant="outline" className="text-xs">Etiquetada</Badge>}
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
      "group relative aspect-square rounded-lg border-2 transition-all hover:shadow-lg",
      isSelected ? "border-blue-500" : "border-gray-200 hover:border-gray-300"
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
      <button
        onClick={() => onSelect(!isSelected)}
        className="absolute top-2 left-2 z-10 bg-white rounded shadow-sm"
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4 text-blue-600" />
        ) : (
          <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        )}
      </button>
      
      <div className="h-full w-full rounded-lg bg-gray-100 overflow-hidden">
        <img 
          src={photo.preview_url} 
          alt={photo.original_filename}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden h-full w-full flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-3">
        <p className="text-white text-xs font-medium truncate">{photo.original_filename}</p>
        <div className="flex items-center gap-1 mt-1">
          {photo.approved && <Badge variant="secondary" className="text-xs">✓</Badge>}
          {photo.tagged && <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">🏷️</Badge>}
          {photo.students && photo.students.length > 0 && (
            <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
              {photo.students.length} estudiante{photo.students.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      
      <button className="absolute top-2 right-2 bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  );
}

// Old ShareModal removed - now using ProfessionalShareModal
