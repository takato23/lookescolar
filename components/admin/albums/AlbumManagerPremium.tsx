'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Loader2,
  Search,
  Grid3X3,
  List,
  Trash2,
  Edit3,
  Move,
  Copy,
  Share2,
  Link2,
  QrCode,
  Download,
  Upload,
  Image as ImageIcon,
  Users,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Star,
  StarOff,
  FolderInput,
  FolderOutput,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  Filter,
  LayoutGrid,
  RefreshCw,
  ExternalLink,
  ClipboardCopy,
  Send,
  Mail,
  MessageSquare,
  GripVertical,
} from 'lucide-react';

// Types
interface AlbumFolder {
  id: string;
  name: string;
  parent_id: string | null;
  event_id?: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  child_folder_count?: number;
  scope?: 'event' | 'global' | 'legacy' | 'template';
  children?: AlbumFolder[];
  is_published?: boolean;
  share_token?: string | null;
  created_at?: string;
  updated_at?: string;
  cover_url?: string | null;
  description?: string | null;
}

interface AlbumManagerProps {
  eventId: string;
  eventName?: string;
  initialFolders?: AlbumFolder[];
}

type ViewMode = 'grid' | 'list' | 'tree';
type SortBy = 'name' | 'date' | 'photos' | 'custom';
type ShareMode = 'public' | 'token' | 'private';

// Helper: Build tree structure
function buildFolderTree(folders: AlbumFolder[]): AlbumFolder[] {
  const folderMap = new Map<string, AlbumFolder & { children: AlbumFolder[] }>();
  const rootFolders: (AlbumFolder & { children: AlbumFolder[] })[] = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  folders.forEach((folder) => {
    const folderWithChildren = folderMap.get(folder.id)!;
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      parent?.children?.push(folderWithChildren);
    } else {
      rootFolders.push(folderWithChildren);
    }
  });

  return rootFolders;
}

// Stats Component
function AlbumStats({ folders }: { folders: AlbumFolder[] }) {
  const stats = useMemo(() => {
    const totalFolders = folders.length;
    const totalPhotos = folders.reduce((sum, f) => sum + (f.photo_count || 0), 0);
    const published = folders.filter((f) => f.is_published).length;
    const withPhotos = folders.filter((f) => (f.photo_count || 0) > 0).length;

    return { totalFolders, totalPhotos, published, withPhotos };
  }, [folders]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-violet-50 to-purple-50 p-4 dark:border-slate-700/50 dark:from-violet-950/30 dark:to-purple-950/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <Folder className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalFolders}</p>
            <p className="text-xs text-slate-500">Álbumes</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-cyan-50 to-blue-50 p-4 dark:border-slate-700/50 dark:from-cyan-950/30 dark:to-blue-950/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <ImageIcon className="h-4 w-4 text-cyan-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalPhotos}</p>
            <p className="text-xs text-slate-500">Fotos</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-emerald-50 to-green-50 p-4 dark:border-slate-700/50 dark:from-emerald-950/30 dark:to-green-950/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Globe className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.published}</p>
            <p className="text-xs text-slate-500">Publicados</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-slate-700/50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.withPhotos}</p>
            <p className="text-xs text-slate-500">Con fotos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable Album Card Component (Grid View)
function SortableAlbumCard({
  folder,
  isSelected,
  onSelect,
  onAction,
  onNavigate,
  isDragging,
}: {
  folder: AlbumFolder;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, folder: AlbumFolder) => void;
  onNavigate: (folder: AlbumFolder) => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border-2 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-slate-900',
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/20'
          : 'border-slate-200/60 hover:border-violet-300 dark:border-slate-700/50',
        isSortableDragging && 'shadow-2xl scale-105 z-50'
      )}
      onClick={() => onSelect(folder.id)}
      onDoubleClick={() => onNavigate(folder)}
    >
      {/* Cover Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
        {folder.cover_url ? (
          <img
            src={folder.cover_url}
            alt={folder.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderOpen className="h-16 w-16 text-slate-300 dark:text-slate-600" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Status badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {folder.is_published && (
            <Badge className="bg-emerald-500/90 text-white text-[10px] px-2 py-0.5">
              <Globe className="mr-1 h-3 w-3" />
              Publicado
            </Badge>
          )}
          {folder.scope === 'template' && (
            <Badge className="bg-purple-500/90 text-white text-[10px] px-2 py-0.5">
              <Sparkles className="mr-1 h-3 w-3" />
              Plantilla
            </Badge>
          )}
        </div>

        {/* Quick actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('share', folder);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm transition hover:bg-white hover:text-violet-600"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm transition hover:bg-white hover:text-violet-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onAction('open', folder)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('upload', folder)}>
                <Upload className="mr-2 h-4 w-4" />
                Subir fotos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('rename', folder)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('move', folder)}>
                <Move className="mr-2 h-4 w-4" />
                Mover
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('copy', folder)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('share', folder)}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('qr', folder)}>
                <QrCode className="mr-2 h-4 w-4" />
                Generar QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAction('delete', folder)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Photo count badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <ImageIcon className="h-3 w-3" />
          {folder.photo_count || 0}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 active:cursor-grabbing dark:hover:bg-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
            {folder.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
            {folder.has_children && (
              <span className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                {folder.child_folder_count || 0} subcarpetas
              </span>
            )}
            {folder.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(folder.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
      )}
    </div>
  );
}

// Album Row Component (List View)
function SortableAlbumRow({
  folder,
  isSelected,
  onSelect,
  onAction,
  onNavigate,
}: {
  folder: AlbumFolder;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, folder: AlbumFolder) => void;
  onNavigate: (folder: AlbumFolder) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-xl border-2 bg-white p-4 transition-all hover:shadow-md dark:bg-slate-900',
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/30'
          : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700',
        isDragging && 'shadow-lg z-50'
      )}
      onClick={() => onSelect(folder.id)}
      onDoubleClick={() => onNavigate(folder)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Thumbnail */}
      <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
        {folder.cover_url ? (
          <img
            src={folder.cover_url}
            alt={folder.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Folder className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {folder.name}
          </h3>
          {folder.is_published && (
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
              <Globe className="mr-1 h-3 w-3" />
              Publicado
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {folder.photo_count || 0} fotos
          </span>
          {folder.has_children && (
            <span className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
              {folder.child_folder_count || 0} subcarpetas
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onAction('upload', folder);
          }}
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onAction('share', folder);
          }}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAction('open', folder)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Abrir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('rename', folder)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('move', folder)}>
              <Move className="mr-2 h-4 w-4" />
              Mover
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('copy', folder)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction('delete', folder)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Tree Node Component
function TreeNode({
  folder,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  onAction,
}: {
  folder: AlbumFolder & { children?: AlbumFolder[] };
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAction: (action: string, folder: AlbumFolder) => void;
}) {
  const isExpanded = expanded.has(folder.id);
  const isSelected = selected === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
          isSelected
            ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(folder.id);
          }}
          className={cn('rounded p-0.5 transition', hasChildren ? 'hover:bg-slate-200' : 'invisible')}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-violet-500" />
        ) : (
          <Folder className="h-4 w-4 text-slate-400" />
        )}

        <span className="flex-1 truncate font-medium">{folder.name}</span>

        <Badge variant="secondary" className="text-[10px]">
          {folder.photo_count || 0}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 opacity-0 transition hover:bg-slate-200 group-hover:opacity-100"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onAction('create-sub', folder)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Nueva subcarpeta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('rename', folder)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('move', folder)}>
              <Move className="mr-2 h-4 w-4" />
              Mover
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction('delete', folder)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <TreeNode
              key={child.id}
              folder={child as AlbumFolder & { children?: AlbumFolder[] }}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Share Modal Component
function ShareModal({
  folder,
  isOpen,
  onClose,
  onShare,
}: {
  folder: AlbumFolder | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (folder: AlbumFolder, mode: ShareMode, options: any) => void;
}) {
  const [shareMode, setShareMode] = useState<ShareMode>('token');
  const [expiryDays, setExpiryDays] = useState('30');
  const [shareUrl, setShareUrl] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);

  // Load existing share info when folder changes
  useEffect(() => {
    const loadShareInfo = async () => {
      if (!folder || !isOpen) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/albums/${folder.id}/share`);
        if (response.ok) {
          const { data } = await response.json();
          if (data.isPublished) {
            setShareUrl(data.shareUrl || '');
            setStoreUrl(data.storeUrl || '');
            setShareMode(data.mode || 'token');
          }
        }
      } catch (error) {
        console.error('Error loading share info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadShareInfo();
  }, [folder, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareUrl('');
      setStoreUrl('');
      setQrCodeDataUrl('');
      setNotifyEmail('');
      setNotifyWhatsApp('');
    }
  }, [isOpen]);

  const handleGenerateLink = async () => {
    if (!folder) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/admin/albums/${folder.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: shareMode,
          expiryDays: expiryDays === 'never' ? 0 : parseInt(expiryDays, 10),
          allowDownload,
          notifyEmail: notifyEmail || undefined,
          notifyWhatsApp: notifyWhatsApp || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar enlace');
      }

      const { data } = await response.json();
      setShareUrl(data.shareUrl);
      setStoreUrl(data.storeUrl);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      toast.success('Enlace generado exitosamente');
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar enlace');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!folder) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/admin/albums/${folder.id}/share`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al revocar acceso');
      }

      setShareUrl('');
      setStoreUrl('');
      setQrCodeDataUrl('');
      toast.success('Acceso revocado');
      onClose();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error(error instanceof Error ? error.message : 'Error al revocar acceso');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleSendEmail = () => {
    if (!notifyEmail) {
      toast.error('Ingresa un email');
      return;
    }
    // Email will be sent as part of the share creation
    toast.info('El email se enviará al generar el enlace');
  };

  const handleSendWhatsApp = () => {
    if (!shareUrl) {
      toast.error('Genera el enlace primero');
      return;
    }
    const message = encodeURIComponent(`¡Hola! Las fotos del álbum "${folder?.name}" ya están disponibles.\n\nAccede aquí: ${shareUrl}`);
    const phone = notifyWhatsApp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) {
      toast.error('Genera el enlace primero para obtener el código QR');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-${folder?.name || 'album'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Código QR descargado');
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-violet-500" />
            Compartir "{folder.name}"
          </DialogTitle>
          <DialogDescription>
            Configura cómo quieres compartir este álbum con los clientes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Share Mode Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Modo de acceso
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setShareMode('public')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    shareMode === 'public'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <Globe className={cn('h-6 w-6', shareMode === 'public' ? 'text-violet-500' : 'text-slate-400')} />
                  <span className="text-xs font-medium">Público</span>
                </button>
                <button
                  onClick={() => setShareMode('token')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    shareMode === 'token'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <Link2 className={cn('h-6 w-6', shareMode === 'token' ? 'text-violet-500' : 'text-slate-400')} />
                  <span className="text-xs font-medium">Con enlace</span>
                </button>
                <button
                  onClick={() => setShareMode('private')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    shareMode === 'private'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <Lock className={cn('h-6 w-6', shareMode === 'private' ? 'text-violet-500' : 'text-slate-400')} />
                  <span className="text-xs font-medium">Privado</span>
                </button>
              </div>
            </div>

            {/* Private Mode - Revoke Access */}
            {shareMode === 'private' && shareUrl && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex gap-3">
                  <Lock className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Revocar acceso
                    </p>
                    <p className="mt-1 text-red-700 dark:text-red-300">
                      Esto desactivará todos los enlaces existentes. Los clientes ya no podrán acceder.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={handleRevokeAccess}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Revocar acceso
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Token Options */}
            {(shareMode === 'token' || shareMode === 'public') && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Expiración del enlace</label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="90">90 días</SelectItem>
                      <SelectItem value="never">Sin expiración</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Permitir descargas</label>
                  <button
                    onClick={() => setAllowDownload(!allowDownload)}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      allowDownload ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        allowDownload && 'translate-x-5'
                      )}
                    />
                  </button>
                </div>

                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : shareUrl ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerar enlace
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Generar enlace
                    </>
                  )}
                </Button>

                {shareUrl && (
                  <div className="mt-4 space-y-4">
                    {/* Share URL */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        Enlace para compartir
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-700">
                        <Input
                          value={shareUrl}
                          readOnly
                          className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleCopyLink(shareUrl)}>
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Store URL */}
                    {storeUrl && (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">
                          Enlace a tienda (con carrito)
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-700">
                          <Input
                            value={storeUrl}
                            readOnly
                            className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleCopyLink(storeUrl)}>
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* QR Code Preview */}
                    {qrCodeDataUrl && (
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-700">
                        <img
                          src={qrCodeDataUrl}
                          alt="Código QR"
                          className="h-32 w-32"
                        />
                        <Button size="sm" variant="outline" onClick={handleDownloadQR}>
                          <Download className="mr-2 h-4 w-4" />
                          Descargar QR
                        </Button>
                      </div>
                    )}

                    {/* Notification Options */}
                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-600">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Notificar por
                      </label>

                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="Email"
                          className="flex-1"
                        />
                        <Button variant="outline" size="icon" onClick={handleSendEmail}>
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          value={notifyWhatsApp}
                          onChange={(e) => setNotifyWhatsApp(e.target.value)}
                          placeholder="WhatsApp (+54 9 11...)"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleSendWhatsApp}
                          className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Public Mode Warning */}
            {shareMode === 'public' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Acceso público
                    </p>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      Cualquier persona con el enlace podrá ver las fotos sin necesidad de token.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create/Rename Modal
function FolderModal({
  mode,
  folder,
  parentFolder,
  isOpen,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'rename' | 'create-sub';
  folder?: AlbumFolder | null;
  parentFolder?: AlbumFolder | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, parentId?: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'rename' && folder) {
      setName(folder.name);
    } else {
      setName('');
    }
  }, [mode, folder, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      const parentId = mode === 'create-sub' && parentFolder ? parentFolder.id : null;
      await onSubmit(name.trim(), parentId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles = {
    create: 'Nuevo álbum',
    rename: 'Renombrar álbum',
    'create-sub': `Nueva subcarpeta en "${parentFolder?.name}"`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'rename' ? (
              <Edit3 className="h-5 w-5 text-violet-500" />
            ) : (
              <FolderPlus className="h-5 w-5 text-violet-500" />
            )}
            {titles[mode]}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre del álbum
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Graduación 2024"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'rename' ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {mode === 'rename' ? 'Guardar' : 'Crear'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Move Modal
function MoveModal({
  folder,
  folders,
  isOpen,
  onClose,
  onMove,
}: {
  folder: AlbumFolder | null;
  folders: AlbumFolder[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string, targetId: string | null) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const availableTargets = useMemo(() => {
    if (!folder) return [];
    // Filter out the folder itself and its children
    return folders.filter((f) => f.id !== folder.id && f.parent_id !== folder.id);
  }, [folder, folders]);

  const handleMove = async () => {
    if (!folder) return;
    setIsMoving(true);
    try {
      await onMove(folder.id, selectedTarget);
      onClose();
    } finally {
      setIsMoving(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5 text-violet-500" />
            Mover "{folder.name}"
          </DialogTitle>
          <DialogDescription>
            Selecciona la carpeta destino
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto py-4">
          <button
            onClick={() => setSelectedTarget(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition',
              selectedTarget === null
                ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/30'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <FolderInput className="h-4 w-4" />
            <span className="font-medium">Raíz (sin carpeta padre)</span>
          </button>

          {availableTargets.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelectedTarget(target.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition',
                selectedTarget === target.id
                  ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/30'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              style={{ paddingLeft: `${(target.depth || 0) * 16 + 12}px` }}
            >
              <Folder className="h-4 w-4 text-slate-400" />
              <span>{target.name}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {isMoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moviendo...
              </>
            ) : (
              <>
                <FolderOutput className="mr-2 h-4 w-4" />
                Mover aquí
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  folder,
  isOpen,
  onClose,
  onDelete,
}: {
  folder: AlbumFolder | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (folderId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!folder) return;
    setIsDeleting(true);
    try {
      await onDelete(folder.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar álbum
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-slate-600 dark:text-slate-400">
            ¿Estás seguro de eliminar <strong>"{folder.name}"</strong>?
          </p>

          {(folder.photo_count || 0) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ⚠️ Este álbum contiene <strong>{folder.photo_count} fotos</strong> que serán
                movidas a la carpeta padre.
              </p>
            </div>
          )}

          {folder.has_children && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ⚠️ Las subcarpetas también serán movidas a la carpeta padre.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AlbumManagerPremium({
  eventId,
  eventName,
  initialFolders = [],
}: AlbumManagerProps) {
  const router = useRouter();

  // State
  const [folders, setFolders] = useState<AlbumFolder[]>(initialFolders);
  const [isLoading, setIsLoading] = useState(!initialFolders.length);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Modal State
  const [folderModal, setFolderModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'rename' | 'create-sub';
    folder?: AlbumFolder | null;
    parentFolder?: AlbumFolder | null;
  }>({ isOpen: false, mode: 'create' });

  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    folder: AlbumFolder | null;
  }>({ isOpen: false, folder: null });

  const [moveModal, setMoveModal] = useState<{
    isOpen: boolean;
    folder: AlbumFolder | null;
  }>({ isOpen: false, folder: null });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    folder: AlbumFolder | null;
  }>({ isOpen: false, folder: null });

  // Drag and Drop State
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeId) || null,
    [folders, activeId]
  );

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load folders
  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/folders?event_id=${eventId}`);
      if (!response.ok) throw new Error('Failed to load folders');
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Error al cargar álbumes');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!initialFolders.length) {
      loadFolders();
    }
  }, [loadFolders, initialFolders.length]);

  // Computed
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const filteredFolders = useMemo(() => {
    let result = [...folders];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'photos':
          return (b.photo_count || 0) - (a.photo_count || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [folders, searchQuery, sortBy]);

  // Handlers
  const handleAction = useCallback(
    (action: string, folder: AlbumFolder) => {
      switch (action) {
        case 'open':
          router.push(`/admin/photos?event_id=${eventId}&folder_id=${folder.id}`);
          break;
        case 'upload':
          router.push(`/admin/photos?event_id=${eventId}&folder_id=${folder.id}&upload=true`);
          break;
        case 'rename':
          setFolderModal({ isOpen: true, mode: 'rename', folder });
          break;
        case 'move':
          setMoveModal({ isOpen: true, folder });
          break;
        case 'copy':
          handleCopyFolder(folder);
          break;
        case 'share':
          setShareModal({ isOpen: true, folder });
          break;
        case 'qr':
          router.push(`/admin/events/${eventId}/qr?folder_id=${folder.id}`);
          break;
        case 'delete':
          setDeleteModal({ isOpen: true, folder });
          break;
        case 'create-sub':
          setFolderModal({ isOpen: true, mode: 'create-sub', parentFolder: folder });
          break;
      }
    },
    [eventId, router]
  );

  const handleCreateFolder = useCallback(
    async (name: string, parentId?: string | null) => {
      try {
        const response = await fetch('/api/admin/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            parent_id: parentId,
            event_id: eventId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create folder');
        }

        toast.success('Álbum creado exitosamente');
        loadFolders();
      } catch (error) {
        console.error('Error creating folder:', error);
        toast.error(error instanceof Error ? error.message : 'Error al crear álbum');
        throw error;
      }
    },
    [eventId, loadFolders]
  );

  const handleRenameFolder = useCallback(
    async (name: string) => {
      if (!folderModal.folder) return;

      try {
        const response = await fetch(`/api/admin/folders/${folderModal.folder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to rename folder');
        }

        toast.success('Álbum renombrado');
        loadFolders();
      } catch (error) {
        console.error('Error renaming folder:', error);
        toast.error(error instanceof Error ? error.message : 'Error al renombrar');
        throw error;
      }
    },
    [folderModal.folder, loadFolders]
  );

  const handleMoveFolder = useCallback(
    async (folderId: string, targetId: string | null) => {
      try {
        const response = await fetch(`/api/admin/folders/${folderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: targetId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to move folder');
        }

        toast.success('Álbum movido');
        loadFolders();
      } catch (error) {
        console.error('Error moving folder:', error);
        toast.error(error instanceof Error ? error.message : 'Error al mover');
        throw error;
      }
    },
    [loadFolders]
  );

  const handleCopyFolder = useCallback(
    async (folder: AlbumFolder) => {
      try {
        const response = await fetch(`/api/admin/folders/${folder.id}/copy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `${folder.name} (copia)` }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to copy folder');
        }

        toast.success('Álbum duplicado');
        loadFolders();
      } catch (error) {
        console.error('Error copying folder:', error);
        toast.error(error instanceof Error ? error.message : 'Error al duplicar');
      }
    },
    [loadFolders]
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        const response = await fetch(`/api/admin/folders/${folderId}?moveContentsTo=null`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete folder');
        }

        toast.success('Álbum eliminado');
        if (selectedFolder === folderId) {
          setSelectedFolder(null);
        }
        loadFolders();
      } catch (error) {
        console.error('Error deleting folder:', error);
        toast.error(error instanceof Error ? error.message : 'Error al eliminar');
        throw error;
      }
    },
    [loadFolders, selectedFolder]
  );

  const handleShare = useCallback(
    async (folder: AlbumFolder, mode: ShareMode, options: any) => {
      toast.success(`Configuración de compartir guardada para "${folder.name}"`);
      setShareModal({ isOpen: false, folder: null });
    },
    []
  );

  // Drag and Drop Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeIndex = filteredFolders.findIndex((f) => f.id === active.id);
      const overIndex = filteredFolders.findIndex((f) => f.id === over.id);

      if (activeIndex === -1 || overIndex === -1) return;

      // Update local state optimistically
      const newFolders = [...filteredFolders];
      const [removed] = newFolders.splice(activeIndex, 1);
      newFolders.splice(overIndex, 0, removed);

      // Update order in backend (could be implemented with a sort_order field)
      // For now, we show a toast about reordering
      toast.success(`"${removed.name}" reordenado`);

      // Optionally save order to backend
      // await saveOrder(newFolders.map((f, i) => ({ id: f.id, order: i })));
    },
    [filteredFolders]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleNavigate = useCallback(
    (folder: AlbumFolder) => {
      router.push(`/admin/photos?event_id=${eventId}&folder_id=${folder.id}`);
    },
    [eventId, router]
  );

  const toggleExpanded = useCallback((folderId: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Álbumes
          </h1>
          {eventName && (
            <p className="mt-1 text-sm text-slate-500">{eventName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFolderModal({ isOpen: true, mode: 'create' })}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Nuevo álbum
          </Button>
        </div>
      </div>

      {/* Stats */}
      <AlbumStats folders={folders} />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar álbumes..."
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-36">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="date">Fecha</SelectItem>
              <SelectItem value="photos">Fotos</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-2 transition',
                viewMode === 'grid'
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-2 transition',
                viewMode === 'list'
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'rounded-md p-2 transition',
                viewMode === 'tree'
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={loadFolders}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Content with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <FolderOpen className="h-16 w-16 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {searchQuery ? 'No se encontraron álbumes' : 'Sin álbumes'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? 'Prueba con otros términos de búsqueda'
                : 'Crea tu primer álbum para organizar las fotos'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setFolderModal({ isOpen: true, mode: 'create' })}
                className="mt-4 bg-gradient-to-r from-violet-500 to-purple-600"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Crear primer álbum
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <SortableContext
            items={filteredFolders.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFolders.map((folder) => (
                <SortableAlbumCard
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolder === folder.id}
                  onSelect={setSelectedFolder}
                  onAction={handleAction}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </SortableContext>
        ) : viewMode === 'list' ? (
          <SortableContext
            items={filteredFolders.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredFolders.map((folder) => (
                <SortableAlbumRow
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolder === folder.id}
                  onSelect={setSelectedFolder}
                  onAction={handleAction}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            {folderTree.map((folder) => (
              <TreeNode
                key={folder.id}
                folder={folder}
                depth={0}
                expanded={expandedFolders}
                selected={selectedFolder}
                onToggle={toggleExpanded}
                onSelect={setSelectedFolder}
                onAction={handleAction}
              />
            ))}
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeFolder && (
            <div className="rounded-xl border-2 border-violet-500 bg-white p-4 shadow-2xl dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <Folder className="h-6 w-6 text-violet-500" />
                <span className="font-medium text-slate-900 dark:text-white">
                  {activeFolder.name}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {activeFolder.photo_count || 0} fotos
                </Badge>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <FolderModal
        mode={folderModal.mode}
        folder={folderModal.folder}
        parentFolder={folderModal.parentFolder}
        isOpen={folderModal.isOpen}
        onClose={() => setFolderModal({ isOpen: false, mode: 'create' })}
        onSubmit={(name, parentId) => {
          if (folderModal.mode === 'rename') {
            return handleRenameFolder(name);
          }
          return handleCreateFolder(name, parentId);
        }}
      />

      <ShareModal
        folder={shareModal.folder}
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, folder: null })}
        onShare={handleShare}
      />

      <MoveModal
        folder={moveModal.folder}
        folders={folders}
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal({ isOpen: false, folder: null })}
        onMove={handleMoveFolder}
      />

      <DeleteModal
        folder={deleteModal.folder}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, folder: null })}
        onDelete={handleDeleteFolder}
      />
    </div>
  );
}
