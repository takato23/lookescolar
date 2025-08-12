'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderIcon, 
  ImageIcon, 
  UploadIcon, 
  DownloadIcon, 
  TrashIcon, 
  GridIcon, 
  ListIcon, 
  CheckIcon, 
  XIcon,
  SearchIcon,
  MoreVerticalIcon,
  MoveIcon,
  TagIcon,
  UserIcon,
  User,
  CheckSquareIcon,
  RefreshCw,
  QrCode,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildPhotosUrl } from "@/lib/utils/photos-url-builder";
import QRScannerModal, { type StudentInfo } from "./QRScannerModal";
import TaggingModal from "./TaggingModal";
import { PhotoModal as PublicPhotoModal } from "@/components/public/PhotoModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Types adapted for LookEscolar
interface PhotoItem {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  event_id?: string;
  code_id?: string;
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

interface CodeRow {
  id: string;
  event_id: string;
  course_id: string | null;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count: number;
}

interface FolderItem {
  id: string;
  name: string;
  event_date?: string;
  school_name?: string;
  photo_count?: number;
  created_at: string;
}

interface PhotoGalleryModernProps {
  initialPhotos?: PhotoItem[];
  initialEvents?: FolderItem[];
  onPhotoUpload?: (files: File[], eventId: string) => Promise<void>;
  onPhotoDelete?: (photoIds: string[]) => Promise<void>;
  onPhotoApprove?: (photoIds: string[], approved: boolean) => Promise<void>;
  onPhotoTag?: (photoId: string, subjectId: string) => Promise<void>;
  onRefresh?: () => void;
  hideSidebar?: boolean;
  externalSelectedEvent?: string | null;
  externalCodeId?: string | null; // 'null' string to represent unassigned
  onCountsChanged?: () => void;
}

// Photo Card Component
const PhotoCard: React.FC<{
  photo: PhotoItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenPreview: () => void;
  onApprove: (id: string) => void;
  onTag: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onMove: (id: string) => void;
  viewMode: 'grid' | 'list';
  handleDragStart?: (photoId: string, e: React.DragEvent) => void;
  handleDragEnd?: () => void;
}> = ({ photo, isSelected, onSelect, onOpenPreview, onApprove, onTag, onDelete, onDownload, onMove, viewMode, handleDragStart, handleDragEnd }) => {
  const [imageLoadState, setImageLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(photo.preview_url || null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    if (photo.preview_url && photo.preview_url !== imageSrc) {
      setImageSrc(photo.preview_url);
    }
  }, [photo.preview_url, imageSrc]);
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoadState('loaded');
  };

  // Handle image load error - try fallback or show error state
  const handleImageError = async () => {
    // Do not call deprecated client endpoint; just show error state
    setImageLoadState('error');
  };

  // Optimized Image Component
  const OptimizedImage = ({ className }: { className: string }) => {
    return (
      <div className={cn("relative", className)}>
        {imageSrc && imageLoadState !== 'error' && (
            <img
            src={imageSrc}
            alt={photo.original_filename}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-200",
              imageLoadState === 'loading' ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {/* Loading State */}
        {imageLoadState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}
        
        {/* Error State */}
        {imageLoadState === 'error' || !imageSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="w-8 h-8 mb-2" />
            <span className="text-xs text-center px-2">Sin preview</span>
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border transition-all duration-200",
          isSelected ? "bg-purple-50 border-purple-500" : "bg-white hover:bg-gray-50",
          photo.approved ? "border-l-4 border-l-green-500" : ""
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(photo.id)}
        />
        <OptimizedImage className="w-12 h-12 rounded flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{photo.original_filename}</h3>
            <div className="flex gap-1">
              {photo.approved && (
                <Badge variant="default" className="text-xs bg-green-500">
                  Aprobada
                </Badge>
              )}
              {photo.tagged && (
                <Badge variant="secondary" className="text-xs">
                  <TagIcon className="w-3 h-3 mr-1" />
                  Etiquetada
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatFileSize(photo.file_size)}</span>
            <span>{formatDate(photo.created_at)}</span>
            {photo.width && photo.height && (
              <span>{photo.width} × {photo.height}</span>
            )}
            {photo.subject && (
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                {photo.subject.name}
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVerticalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onOpenPreview}>
              Ver grande
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(photo.id)}>
              Mover a…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onApprove(photo.id)}>
              <CheckSquareIcon className="w-4 h-4 mr-2" />
              {photo.approved ? 'Desaprobar' : 'Aprobar'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTag}>
              <TagIcon className="w-4 h-4 mr-2" />
              Etiquetar alumno
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Descargar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={onDelete}>
              <TrashIcon className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.01 }}
      draggable
      onDragStartCapture={(e) => {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('[data-no-drag="true"]')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        setIsDragging(true);
        handleDragStart?.(photo.id, e);
      }}
      onDragEnd={() => { setIsDragging(false); handleDragEnd?.(); }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card text-card-foreground transition-all duration-200 group cursor-pointer hover:shadow-lg",
        isSelected ? "ring-2 ring-primary shadow-lg border-primary" : "hover:border-gray-400",
        isDragging ? "scale-[1.02] shadow-2xl cursor-grabbing" : "",
        "draggable"
      )}
      onClick={onOpenPreview}
    >
      <div className="aspect-square relative bg-gray-100">
        <OptimizedImage className="w-full h-full" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
        {/* 3-dot menu */}
        <div
          className="absolute top-2 right-10 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenPreview(); }}>Ver grande</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(photo.id); }}>Mover a…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(photo.id); }}>
                {photo.approved ? 'Desaprobar' : 'Aprobar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>Descargar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Selection checkbox + visual tick overlay */}
        <div
          className="absolute top-2 left-2 z-20"
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <div 
            className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                onSelect(photo.id);
              }}
              className="h-6 w-6 rounded-md border-2 border-gray-400 bg-white shadow-sm cursor-pointer hover:border-primary transition-colors data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
              onClick={(e) => e.stopPropagation()}
              aria-label="Seleccionar foto"
            />
          </div>
        </div>

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {photo.approved && (
            <Badge className="rounded px-2 py-0.5 text-xs bg-emerald-600 text-white dark:bg-emerald-500">
              Aprobada
            </Badge>
          )}
          {photo.tagged && (
            <Badge variant="secondary" className="text-xs">
              Etiquetada
            </Badge>
          )}
        </div>

        {/* Selected tick in corner removed to avoid confusion with left checkbox */}

        {/* Actions overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-default pointer-events-none"
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="flex gap-2 pointer-events-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(photo.id);
              }}
            >
              {photo.approved ? <XIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onTag();
              }}
            >
              <TagIcon className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <DownloadIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Photo info */}
      <div className="p-2 text-xs text-muted-foreground truncate">
        <h3 className="font-medium truncate text-sm">{photo.original_filename}</h3>
        <div className="flex items-center justify-between mt-1">
          <span>{formatFileSize(photo.file_size)}</span>
          <span>{formatDate(photo.created_at)}</span>
        </div>
        {photo.subject && (
          <div className="flex items-center gap-1 mt-2">
            <UserIcon className="w-3 h-3" />
            <span>{photo.subject.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// EventCard removed (not used)

// Main Component
const PhotoGalleryModern: React.FC<PhotoGalleryModernProps> = ({
  initialPhotos = [],
  initialEvents = [],
  onPhotoUpload,
  onPhotoDelete,
  onPhotoApprove,
  onPhotoTag,
  onRefresh,
  hideSidebar = false,
  externalSelectedEvent = null,
  externalCodeId = null,
  onCountsChanged,
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [events, setEvents] = useState<FolderItem[]>(initialEvents);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'tagged'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // QR Tagging Mode State
  const [isQRTagMode, setIsQRTagMode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [isAssigningPhotos, setIsAssigningPhotos] = useState(false);

  // Drag & Drop State
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [dropTargetCode, setDropTargetCode] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);

  // Manual Tagging State
  const [showTaggingModal, setShowTaggingModal] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<PhotoItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Codes state for move operations
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveSelectedCodeId, setMoveSelectedCodeId] = useState<string>("");
  const [movePhotoIds, setMovePhotoIds] = useState<string[]>([]);

  // Filter photos based on search, event, and status
  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesSearch = photo.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           photo.subject?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEvent = !selectedEvent || photo.event_id === selectedEvent;
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'approved' && photo.approved) ||
                           (filterStatus === 'pending' && !photo.approved) ||
                           (filterStatus === 'tagged' && photo.tagged);
      
      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [photos, searchQuery, selectedEvent, filterStatus]);

  // Load photos for selected event (server-side filtering)
  const fetchPhotosForEvent = useCallback(async () => {
    const effectiveEvent = typeof externalSelectedEvent !== 'undefined' ? externalSelectedEvent : selectedEvent;
    
    // Guard: no eventId = no fetch
    if (!effectiveEvent) {
      console.debug('[photos] No eventId, skipping fetch');
      setPhotos([]);
      return;
    }
    
    try {
      // Use buildPhotosUrl helper to ensure event_id is always included
      const url = buildPhotosUrl({
        eventId: effectiveEvent,
        codeId: externalCodeId === 'null' ? 'null' : externalCodeId || undefined,
        limit: 100
      });
      
      console.debug('[photos] Fetching:', url);
      const resp = await fetch(url);
      const data = await resp.json();
      if (resp.ok && data && typeof data === 'object' && 'photos' in data) {
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      } else {
        console.warn('[photos] Invalid response:', data);
        setPhotos([]);
      }
    } catch (err) {
      console.error('[photos] Fetch error:', err);
      setPhotos([]);
    }
  }, [selectedEvent, filterStatus, externalSelectedEvent, externalCodeId]);

  useEffect(() => {
    // Sync internal selectedEvent with external when provided
    if (typeof externalSelectedEvent !== 'undefined') {
      setSelectedEvent(externalSelectedEvent);
    }
  }, [externalSelectedEvent]);

  useEffect(() => {
    // Cuando el usuario cambia de evento o filtro, traer fotos reales del servidor
    // Evita que solo se vean fotos del primer lote cargado
    void fetchPhotosForEvent();
  }, [fetchPhotosForEvent]);

  // Load codes for selected event
  const fetchCodesForEvent = useCallback(async () => {
    if (!selectedEvent) {
      setCodes([]);
      return;
    }
    try {
      const resp = await fetch(`/api/admin/publish/list?eventId=${selectedEvent}`);
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : (data.rows || data.data || []);
      const rows: CodeRow[] = arr.map((c: any) => ({
        id: (c.id ?? c.code_id) as string,
        event_id: selectedEvent,
        course_id: (c.course_id as string) ?? null,
        code_value: String(c.code_value),
        token: (c.token as string) ?? null,
        is_published: Boolean(c.is_published ?? c.published),
        photos_count: Number(c.photos_count ?? 0),
      }));
      setCodes(rows);
    } catch {
      setCodes([]);
    }
  }, [selectedEvent]);

  useEffect(() => {
    void fetchCodesForEvent();
  }, [fetchCodesForEvent]);

  const ensurePreviewUrl = useCallback(async (index: number) => {
    const p = filteredPhotos[index];
    if (!p) return;
    if (p.preview_url) return;
    try {
      const resp = await fetch(`/api/admin/photos/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: [p.id], as: 'single' }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const url = Array.isArray(data.urls) ? data.urls[0] : undefined;
      if (!url) return;
      setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, preview_url: url } : ph));
    } catch {}
  }, [filteredPhotos]);

  // Update photos when props change
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  

  // Handle photo selection
  const handlePhotoSelect = useCallback((photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedPhotos.length === filteredPhotos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(filteredPhotos.map(photo => photo.id));
    }
  }, [selectedPhotos, filteredPhotos]);

  // Bulk move via codes is handled by modal; legacy event move removed

  // Handle approve toggle
  const handleApprove = useCallback(async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    try {
      await onPhotoApprove?.([photoId], !photo.approved);
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, approved: !p.approved }
          : p
      ));
      toast.success(photo.approved ? 'Foto desaprobada' : 'Foto aprobada');
    } catch (error) {
      toast.error('Error al cambiar el estado de la foto');
    }
  }, [photos, onPhotoApprove]);

  // Handle bulk approve
  const handleBulkApprove = useCallback(async (approved: boolean) => {
    if (selectedPhotos.length === 0) return;

    try {
      await onPhotoApprove?.(selectedPhotos, approved);
      setPhotos(prev => prev.map(photo => 
        selectedPhotos.includes(photo.id) 
          ? { ...photo, approved }
          : photo
      ));
      toast.success(`${selectedPhotos.length} fotos ${approved ? 'aprobadas' : 'desaprobadas'}`);
      setSelectedPhotos([]);
    } catch (error) {
      toast.error('Error al cambiar el estado de las fotos');
    }
  }, [selectedPhotos, onPhotoApprove]);

  // Add state:
  const [autoProcess, setAutoProcess] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoProcess') !== 'false';
    }
    return true;
  });

  // Effect to persist:
  useEffect(() => {
    localStorage.setItem('autoProcess', autoProcess.toString());
  }, [autoProcess]);

  // Handle file upload - works with or without event
  const handleFileUpload = useCallback(async (files: FileList) => {
    // Get effective selected event (prioritize external over internal)
    const effectiveEvent = typeof externalSelectedEvent !== 'undefined' ? externalSelectedEvent : selectedEvent;
    
    // No longer require event - can upload to general gallery
    const eventId = effectiveEvent || null;
    
    setIsUploading(true);
    try {
      await onPhotoUpload?.(Array.from(files), eventId);
      toast.success(`${files.length} fotos subidas correctamente`);
      if (autoProcess) {
        const t = toast.loading('Procesando fotos...');
        try {
          // Watermark
          const watermarkRes = await fetch(`/api/admin/photos/watermark`, {
            method: 'POST',
            body: JSON.stringify({ eventId }),
            headers: { 'Content-Type': 'application/json' }
          });
          if (!watermarkRes.ok) {
            console.warn('Watermark processing failed:', await watermarkRes.text());
          }
          
          // Anchor detection (opcional, no falla si hay error)
          try {
            const anchorRes = await fetch(`/api/admin/anchor-detect`, {
              method: 'POST',
              body: JSON.stringify({ eventId, onlyMissing: true }),
              headers: { 'Content-Type': 'application/json' }
            });
            if (!anchorRes.ok) {
              console.warn('Anchor detection skipped:', await anchorRes.text());
            }
          } catch (err) {
            console.warn('Anchor detection error (non-blocking):', err);
          }
          
          // Grouping (opcional, no falla si hay error)
          try {
            const groupRes = await fetch(`/api/admin/group`, {
              method: 'POST',
              body: JSON.stringify({ eventId }),
              headers: { 'Content-Type': 'application/json' }
            });
            if (!groupRes.ok) {
              console.warn('Photo grouping skipped:', await groupRes.text());
            }
          } catch (err) {
            console.warn('Photo grouping error (non-blocking):', err);
          }
          
          toast.success('Fotos procesadas', { id: t });
        } catch (err) {
          console.error('Processing error:', err);
          toast.warning('Procesamiento parcial completado', { id: t });
        }
      }
      onRefresh?.();
      onCountsChanged?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error al subir las fotos');
    } finally {
      setIsUploading(false);
    }
  }, [selectedEvent, onPhotoUpload, onRefresh, autoProcess, onCountsChanged]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedPhotos.length === 0) return;

    if (confirm(`¿Estás seguro de eliminar ${selectedPhotos.length} fotos?`)) {
      try {
        await onPhotoDelete?.(selectedPhotos);
        setPhotos(prev => prev.filter(photo => !selectedPhotos.includes(photo.id)));
        toast.success(`${selectedPhotos.length} fotos eliminadas`);
        setSelectedPhotos([]);
      } catch (error) {
        toast.error('Error al eliminar las fotos');
      }
    }
  }, [selectedPhotos, onPhotoDelete]);

  // QR Tagging Functions
  const handleStartQRTagging = useCallback(() => {
    setIsQRTagMode(true);
    setShowQRScanner(true);
    setSelectedPhotos([]); // Clear any existing selection
    toast.info('Modo etiquetado QR activado. Escanea un código para empezar.');
  }, []);

  const handleStopQRTagging = useCallback(() => {
    setIsQRTagMode(false);
    setCurrentStudent(null);
    setSelectedPhotos([]);
    toast.info('Modo etiquetado QR desactivado.');
  }, []);

  const handleStudentScanned = useCallback(async (student: StudentInfo) => {
    setCurrentStudent(student);
    setShowQRScanner(false);
    toast.success(`Estudiante seleccionado: ${student.name}. Ahora selecciona las fotos para etiquetar.`);
  }, []);

  const handleAssignPhotosToStudent = useCallback(async () => {
    if (!currentStudent || selectedPhotos.length === 0) return;

    setIsAssigningPhotos(true);
    try {
      // Call the tagging function for each selected photo
      for (const photoId of selectedPhotos) {
        await onPhotoTag?.(photoId, currentStudent.id);
      }

      // Update local state to reflect the tagging
      setPhotos(prev => prev.map(photo => 
        selectedPhotos.includes(photo.id) 
          ? { 
              ...photo, 
              tagged: true,
              subject: {
                id: currentStudent.id,
                name: currentStudent.name
              }
            }
          : photo
      ));

      toast.success(`${selectedPhotos.length} fotos asignadas a ${currentStudent.name}`);
      
      // Clear selection but keep student active for next batch
      setSelectedPhotos([]);
    } catch (error) {
      console.error('Error assigning photos:', error);
      toast.error('Error al asignar fotos al estudiante');
    } finally {
      setIsAssigningPhotos(false);
    }
  }, [currentStudent, selectedPhotos, onPhotoTag]);

  // Drag & Drop Functions
  const handleDragStart = useCallback((photoId: string, e: React.DragEvent) => {
    setDraggedPhoto(photoId);
    setIsDragMode(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', photoId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedPhoto(null);
    setDropTargetCode(null);
    setIsDragMode(false);
  }, []);

  const handleDragOverCode = useCallback((codeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetCode(codeId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetCode(null);
    }
  }, []);

  const handleDropToCode = useCallback(async (targetCodeId: string, e: React.DragEvent) => {
    e.preventDefault();
    const photoId = e.dataTransfer.getData('text/plain');
    if (!photoId || !draggedPhoto || draggedPhoto !== photoId) return;

    try {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[MOVE] payload', { photoId, codeId: targetCodeId });
      }
      const response = await fetch(`/api/admin/photos/${photoId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codeId: targetCodeId }),
      });

      if (!response.ok) {
        try {
          const j = await response.json();
          if (response.status === 400 && j?.error) {
            toast.error(j.error);
          } else {
            toast.error('Error al mover la foto');
          }
        } catch {
          toast.error('Error al mover la foto');
        }
        return;
      }

      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, code_id: targetCodeId } : p));
      onCountsChanged?.();
      toast.success('Foto movida');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error moving photo:', error);
      toast.error('Error al mover la foto');
    } finally {
      handleDragEnd();
    }
  }, [draggedPhoto]);

  // Download Functions
  const handleDownloadPhoto = useCallback(async (photoId: string) => {
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      // Server-side signed URL via new admin endpoint
      const response = await fetch(`/api/admin/photos/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: [photo.id], as: 'single' }),
      });

      if (!response.ok) {
        let msg = 'Failed to get download URL';
        try { const j = await response.json(); msg = j?.error || msg } catch {}
        throw new Error(msg);
      }

      const data = await response.json();
      const url = Array.isArray(data.urls) ? data.urls[0] : undefined;
      if (!url) throw new Error('Missing download URL');

      const link = document.createElement('a');
      link.href = url;
      link.download = photo.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Descarga iniciada');
    } catch (error: any) {
      console.error('Error downloading photo:', error);
      toast.error(error?.message || 'Error al descargar la foto');
    }
  }, [photos]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedPhotos.length === 0) return;

    try {
      if (selectedPhotos.length === 1) {
        const [firstId] = selectedPhotos;
        if (firstId) {
          await handleDownloadPhoto(firstId);
          return;
        }
      }

      toast.info(`Preparando ZIP de ${selectedPhotos.length} fotos...`);

      // Request ZIP stream
      const response = await fetch(`/api/admin/photos/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos, as: 'zip' }),
      });

      if (!response.ok) {
        let msg = 'No se pudo preparar el ZIP';
        try { const j = await response.json(); msg = j?.error || msg } catch {}
        throw new Error(msg);
      }

      // Create a blob from the stream
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fotos_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar las fotos seleccionadas');
    }
  }, [selectedPhotos, handleDownloadPhoto]);

  // Move modal handlers
  const openMoveModalForPhoto = useCallback((photoId: string) => {
    setMovePhotoIds([photoId]);
    setIsMoveOpen(true);
  }, []);

  const openMoveModalForSelection = useCallback(() => {
    if (selectedPhotos.length === 0) return;
    setMovePhotoIds(selectedPhotos);
    setIsMoveOpen(true);
  }, [selectedPhotos]);

  const handleConfirmMove = useCallback(async () => {
    const codeId = moveSelectedCodeId;
    if (!codeId || movePhotoIds.length === 0) return;
    try {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[MOVE] payload', { photoIds: movePhotoIds, codeId });
      }
      await Promise.all(
        movePhotoIds.map(async (pid) => {
          const resp = await fetch(`/api/admin/photos/${pid}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codeId }),
          });
          if (!resp.ok) {
            try {
              const j = await resp.json();
              throw new Error(j?.error || 'Error moviendo foto');
            } catch (e: any) {
              throw new Error(e?.message || 'Error moviendo foto');
            }
          }
        })
      );
      setPhotos(prev => prev.map(p => movePhotoIds.includes(p.id) ? { ...p, code_id: codeId } : p));
      toast.success(`Movida(s) ${movePhotoIds.length} foto(s)`);
      onCountsChanged?.();
      setSelectedPhotos([]);
      setIsMoveOpen(false);
      setMoveSelectedCodeId('');
      setMovePhotoIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron mover las fotos');
    }
  }, [moveSelectedCodeId, movePhotoIds]);

  // Manual Tagging Functions
  const handleOpenTaggingModal = useCallback((photo: PhotoItem) => {
    setTaggingPhoto(photo);
    setShowTaggingModal(true);
  }, []);

  const handleCloseTaggingModal = useCallback(() => {
    setShowTaggingModal(false);
    setTaggingPhoto(null);
  }, []);

  const handleManualTag = useCallback(async (studentId: string, studentName: string) => {
    if (!taggingPhoto) return;

    try {
      // Use the existing onPhotoTag prop
      await onPhotoTag?.(taggingPhoto.id, studentId);

      // Update local state
      setPhotos(prev => prev.map(photo => 
        photo.id === taggingPhoto.id 
          ? { 
              ...photo, 
              tagged: true,
              subject: {
                id: studentId,
                name: studentName
              }
            }
          : photo
      ));

      handleCloseTaggingModal();
      
    } catch (error) {
      console.error('Error tagging photo manually:', error);
      throw error; // Re-throw to let TaggingModal handle the error display
    }
  }, [taggingPhoto, onPhotoTag]);

  const effectiveSelectedEvent = typeof externalSelectedEvent !== 'undefined' ? externalSelectedEvent : selectedEvent;
  const currentEvent = events.find(e => e.id === effectiveSelectedEvent);
  const codesForCurrentEvent = useMemo(() => {
    return codes.filter(c => c.event_id === effectiveSelectedEvent);
  }, [codes, effectiveSelectedEvent]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Fotos</h1>
          <p className="text-gray-500">
            {currentEvent ? `${currentEvent.name} - ` : ''}{filteredPhotos.length} fotos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="auto-process"
            checked={autoProcess}
            onCheckedChange={setAutoProcess}
          />
          <Label htmlFor="auto-process">Procesar automáticamente</Label>
          <Button
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          {effectiveSelectedEvent && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              {isUploading ? 'Subiendo...' : 'Subir fotos'}
            </Button>
          )}
          
          {/* QR Tagging Toggle */}
          {!isQRTagMode ? (
            <Button
              variant="secondary"
              onClick={handleStartQRTagging}
              className="bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Modo QR
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleStopQRTagging}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <XIcon className="w-4 h-4 mr-2" />
              Salir QR
            </Button>
          )}
          {selectedPhotos.length > 0 && !isQRTagMode && (
            <>
              <Button
                variant="outline"
                onClick={() => handleBulkApprove(true)}
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Aprobar ({selectedPhotos.length})
              </Button>
              <Button variant="outline" onClick={openMoveModalForSelection}>
                <MoveIcon className="w-4 h-4 mr-2" />
                Mover a…
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadSelected}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Descargar ({selectedPhotos.length})
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSelected}
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Eliminar ({selectedPhotos.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPhotos([])}
              >
                <XIcon className="w-4 h-4 mr-2" />
                Limpiar selección
              </Button>
            </>
          )}
          
          {/* QR Tagging Actions */}
          {isQRTagMode && (
            <>
              {!currentStudent && (
                <Button
                  variant="primary"
                  onClick={() => setShowQRScanner(true)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Escanear QR
                </Button>
              )}
              
              {currentStudent && selectedPhotos.length > 0 && (
                <Button
                  variant="primary"
                  onClick={handleAssignPhotosToStudent}
                  disabled={isAssigningPhotos}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isAssigningPhotos ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Asignando...
                    </>
                  ) : (
                    <>
                      <TagIcon className="w-4 h-4 mr-2" />
                      Asignar a {currentStudent.name} ({selectedPhotos.length})
                    </>
                  )}
                </Button>
              )}
              
              {currentStudent && (
                <Button
                  variant="outline"
                  onClick={() => setShowQRScanner(true)}
                  className="border-purple-300 text-purple-700"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Cambiar estudiante
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* QR Tagging Status Panel */}
      {isQRTagMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <QrCode className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Modo Etiquetado QR Activo</h3>
                {currentStudent ? (
                  <div className="flex items-center gap-2 text-sm text-purple-700">
                    <User className="w-4 h-4" />
                    <span>Etiquetando para: <strong>{currentStudent.name}</strong></span>
                    <Badge variant="secondary" className="text-xs">
                      ID: {currentStudent.id}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-purple-600">
                    Escanea un código QR para seleccionar un estudiante
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedPhotos.length > 0 && currentStudent && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  {selectedPhotos.length} fotos seleccionadas
                </Badge>
              )}
              {!currentStudent && (
                <Button
                  size="sm"
                  onClick={() => setShowQRScanner(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Escanear QR
                </Button>
              )}
            </div>
          </div>
          
          {currentStudent && selectedPhotos.length === 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Selecciona las fotos que deseas asignar a <strong>{currentStudent.name}</strong>
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar fotos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={filterStatus === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            Todas
          </Button>
          <Button
            variant={filterStatus === 'approved' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus('approved')}
          >
            Aprobadas
          </Button>
          <Button
            variant={filterStatus === 'pending' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus('pending')}
          >
            Pendientes
          </Button>
          <Button
            variant={filterStatus === 'tagged' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus('tagged')}
          >
            Etiquetadas
          </Button>
        </div>

        <div className="flex items-center rounded-lg p-0.5 bg-transparent">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn('rounded-r-none', viewMode==='grid' ? 'ring-2 ring-offset-0' : '')}
          >
            <GridIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn('rounded-l-none -ml-px', viewMode==='list' ? 'ring-2 ring-offset-0' : '')}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
        </div>

        {filteredPhotos.length > 0 && (
          <Button
            variant="outline"
            onClick={handleSelectAll}
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            {selectedPhotos.length === filteredPhotos.length ? 'Deseleccionar' : 'Seleccionar todas'}
          </Button>
        )}
      </div>

      {/* Optional external layout: hide built-in sidebar when requested */}
      {hideSidebar ? (
        <div>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron fotos</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Intenta ajustar tu búsqueda' : 
                   !currentEvent ? 'Seleccioná un evento para comenzar' :
                   externalCodeId === 'null' ? 'No hay fotos sin carpeta. Subí fotos o elegí otra carpeta.' :
                   'Sube algunas fotos para comenzar'}
                </p>
                {currentEvent && (
                  <Button onClick={() => fileInputRef.current?.click()} aria-label="Subir fotos">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Subir fotos
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              )}>
                <AnimatePresence>
                  {filteredPhotos.map((photo, idx) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      isSelected={selectedPhotos.includes(photo.id)}
                      onSelect={(id) => {
                        handlePhotoSelect(id);
                      }}
                      onOpenPreview={() => {
                        setPreviewIndex(idx);
                        setIsPreviewOpen(true);
                        const p = filteredPhotos[idx];
                        if (!p?.preview_url) void ensurePreviewUrl(idx);
                      }}
                      onApprove={handleApprove}
                      onTag={() => handleOpenTaggingModal(photo)}
                      onDownload={() => handleDownloadPhoto(photo.id)}
                      onMove={(id) => openMoveModalForPhoto(id)}
                      onDelete={async () => {
                        if (confirm('¿Estás seguro de eliminar esta foto?')) {
                          try {
                            await onPhotoDelete?.([photo.id]);
                            setPhotos(prev => prev.filter(p => p.id !== photo.id));
                            toast.success('Foto eliminada');
                            onCountsChanged?.();
                          } catch (error) {
                            toast.error('Error al eliminar la foto');
                          }
                        }
                      }}
                      viewMode={viewMode}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Eventos</h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                <Button
                  variant={selectedEvent === null ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedEvent(null)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Todas las fotos ({photos.length})
                </Button>
                {events.map(event => (
                  <div key={event.id} className="relative">
                    <div className="flex items-center">
                      <Button
                        variant={selectedEvent === event.id ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left transition-all duration-200",
                          isDragMode ? "" : "",
                        )}
                        onClick={() => setSelectedEvent(event.id)}
                        // Drag-over on per-code pills, not the event button
                      >
                        <FolderIcon className={cn(
                          "w-4 h-4 mr-2 flex-shrink-0 transition-colors",
                          ""
                        )} />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="truncate">{event.name}</div>
                          {event.school_name && (
                            <div className="text-xs opacity-70 truncate">{event.school_name}</div>
                          )}
                        </div>
                        {event.photo_count !== undefined && (
                          <span className="text-xs opacity-70 ml-auto">({event.photo_count})</span>
                        )}
                      </Button>

                      {/* Folder actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            aria-label={`Opciones para ${event.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setSelectedEvent(event.id)}>
                            Abrir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(event.id)}>
                            Copiar ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const name = prompt('Nuevo nombre del evento:', event.name);
                              if (!name) return;
                              try {
                                const res = await fetch(`/api/admin/events/${event.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name })
                                });
                                if (!res.ok) throw new Error('Error renombrando');
                                const data = await res.json();
                                setEvents(prev => prev.map(e => e.id === event.id ? { ...e, name: data.event?.name || name } : e));
                              } catch {}
                            }}
                          >
                            Renombrar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (!confirm(`Eliminar evento "${event.name}"? Esta acción no se puede deshacer.`)) return;
                              try {
                                const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' });
                                const data = await res.json();
                                if (!res.ok) {
                                  alert(data?.error || 'No se pudo eliminar');
                                  return;
                                }
                                setEvents(prev => prev.filter(e => e.id !== event.id));
                                if (selectedEvent === event.id) setSelectedEvent(null);
                              } catch {}
                            }}
                          >
                            Eliminar evento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Statistics */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Estadísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total fotos:</span>
                <span className="font-medium">{photos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aprobadas:</span>
                <span className="font-medium text-green-600">
                  {photos.filter(p => p.approved).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pendientes:</span>
                <span className="font-medium text-yellow-600">
                  {photos.filter(p => !p.approved).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Etiquetadas:</span>
                <span className="font-medium text-blue-600">
                  {photos.filter(p => p.tagged).length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <ScrollArea className="h-[calc(100vh-300px)]">
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron fotos</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Intenta ajustar tu búsqueda' : 
                   !selectedEvent ? 'Selecciona un evento para ver las fotos' :
                   'Sube algunas fotos para comenzar'}
                </p>
                 {selectedEvent && (
                  <Button onClick={() => fileInputRef.current?.click()} aria-label="Subir fotos">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Subir fotos
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              )}>
                <AnimatePresence>
                  {filteredPhotos.map((photo, idx) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      isSelected={selectedPhotos.includes(photo.id)}
                      onSelect={(id) => {
                        handlePhotoSelect(id);
                      }}
                      onOpenPreview={() => {
                        setPreviewIndex(idx);
                        setIsPreviewOpen(true);
                        const p = filteredPhotos[idx];
                        if (!p?.preview_url) void ensurePreviewUrl(idx);
                      }}
                      onApprove={handleApprove}
                      onTag={() => handleOpenTaggingModal(photo)}
                      onDownload={() => handleDownloadPhoto(photo.id)}
                      onMove={(id) => openMoveModalForPhoto(id)}
                      onDelete={async () => {
                        if (confirm('¿Estás seguro de eliminar esta foto?')) {
                          try {
                            await onPhotoDelete?.([photo.id]);
                            setPhotos(prev => prev.filter(p => p.id !== photo.id));
                            toast.success('Foto eliminada');
                          } catch (error) {
                            toast.error('Error al eliminar la foto');
                          }
                        }
                      }}
                      viewMode={viewMode}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      )}

      {/* Per-event Codes list with DnD targets */}
      {selectedEvent && codesForCurrentEvent.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-500 mb-1">Códigos del evento</div>
          <div className="flex flex-wrap gap-2">
            {codesForCurrentEvent.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "px-2 py-1 rounded-md border text-xs cursor-default",
                  dropTargetCode === c.id && isDragMode
                    ? "bg-purple-100 border-purple-500"
                    : "bg-white border-gray-200"
                )}
                onDragOver={(e) => handleDragOverCode(c.id, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropToCode(c.id, e)}
              >
                <span className="font-mono">{c.code_value}</span>
                {typeof c.photos_count === 'number' && (
                  <span className="ml-2 opacity-60">({c.photos_count})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
          }
        }}
      />
      
      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onStudentScanned={handleStudentScanned}
      />

      {/* Manual Tagging Modal */}
      <TaggingModal
        isOpen={showTaggingModal}
        onClose={handleCloseTaggingModal}
        onTag={handleManualTag}
        photoId={taggingPhoto?.id ?? ''}
        photoName={taggingPhoto?.original_filename ?? ''}
        selectedEvent={selectedEvent ?? null}
      />

      {/* Photo Preview Modal */}
      {isPreviewOpen && filteredPhotos[previewIndex] && (
        <PublicPhotoModal
          photo={{
            id: filteredPhotos[previewIndex].id,
            preview_url: filteredPhotos[previewIndex].preview_url || '',
            filename: filteredPhotos[previewIndex].original_filename,
          }}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onPrev={() => {
            const newIndex = previewIndex > 0 ? previewIndex - 1 : previewIndex;
            setPreviewIndex(newIndex);
            if (!filteredPhotos[newIndex]?.preview_url) void ensurePreviewUrl(newIndex);
          }}
          onNext={() => {
            const newIndex = previewIndex < filteredPhotos.length - 1 ? previewIndex + 1 : previewIndex;
            setPreviewIndex(newIndex);
            if (!filteredPhotos[newIndex]?.preview_url) void ensurePreviewUrl(newIndex);
          }}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < filteredPhotos.length - 1}
          currentIndex={previewIndex + 1}
          totalPhotos={filteredPhotos.length}
        />
      )}

      {/* Move To Code Modal */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover foto(s) a…</DialogTitle>
            <DialogDescription>
              Selecciona un código del evento actual para mover las foto(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={moveSelectedCodeId} onValueChange={setMoveSelectedCodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un código" />
              </SelectTrigger>
              <SelectContent>
                {codesForCurrentEvent.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code_value}
                    {c.photos_count ? ` · ${c.photos_count}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmMove} disabled={!moveSelectedCodeId}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGalleryModern;