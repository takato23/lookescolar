'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

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
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { uploadFiles, createApiUrl } from '@/lib/utils/api-client';
import { statusLabel } from '@/lib/utils/photo-helpers';

// Import refactored modules
import { SafeImage } from './photo-admin';
import { getPreviewUrl } from './photo-admin';
import { photoAdminApi, egressMonitor, FolderTreePanel as ExtractedFolderTreePanel } from './photo-admin';
import type { OptimizedFolder, OptimizedAsset } from './photo-admin';

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
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Icons
import {
  Search,
  Grid3X3,
  List,
  Filter,
  Upload,
  Download,
  Trash2,
  Star,
  Eye,
  EyeOff,
  FolderOpen,
  Folder,
  Package,
  Image as ImageIcon,
  CheckSquare,
  Square,
  MoreVertical,
  RefreshCw,
  Settings,
  Plus,
  Copy,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  School,
  Users,
  Calendar,
  Hash,
  Activity,
  Zap,
  AlertCircle,
  ArrowLeft,
  Edit3,
  Move,
  ClipboardPaste,
  FileUser,
  Sparkles,
  Link2,
} from 'lucide-react';
import { PhotoUploadButton } from './PhotoUploadButton';
import EventSelector from './EventSelector';

// 🚀 FASE 2: Importar componentes de contexto de evento
import { EventContextBanner } from '@/components/admin/shared/EventContextBanner';
import { StudentManagement } from '@/components/admin/shared/StudentManagement';
import { ShareManager } from '@/components/admin/share/ShareManager';
import { AssignFolderPhotos } from '@/app/admin/events/[id]/library/components/AssignFolderPhotos';
import BatchStudentManagement from '@/components/admin/BatchStudentManagement';

// Enhanced interfaces for complete data when needed
interface UnifiedFolder extends OptimizedFolder {
  event_id: string | null;
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

// Egress monitoring interface
interface EgressMetrics {
  totalRequests: number;
  totalBytes: number;
  currentSession: number;
  warningThreshold: number;
  criticalThreshold: number;
}

interface PhotoAdminProps {
  className?: string;
  enableUpload?: boolean;
  enableBulkOperations?: boolean;
}

// Use imported API service instead of inline definition
const api = photoAdminApi;

// Optimized Folder Tree Panel Component
const FolderTreePanel: React.FC<{
  folders: OptimizedFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  className?: string;
  isLoading?: boolean;
  eventId?: string | null;
  onOpenStudentManagement?: () => void;
  onFolderAction?: (
    action: 'rename' | 'move' | 'delete' | 'copy' | 'paste',
    folder: OptimizedFolder
  ) => void;
  clipboard?: {
    hasData: boolean;
    sourceFolderId?: string;
    sourceName?: string;
  };
  onPasteToRoot?: () => void;
  onOpenBatchStudentManagement?: () => void;
  selectedEventName?: string | null;
}> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  className,
  isLoading,
  eventId,
  onOpenStudentManagement,
  onFolderAction,
  clipboard,
  onPasteToRoot,
  onOpenBatchStudentManagement,
  selectedEventName,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterText, setFilterText] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Estado para carpetas favoritas - debe estar antes de los efectos que lo usan
  const [favoriteFolderIds, setFavoriteFolderIds] = useState<Set<string>>(
    () => {
      if (typeof window === 'undefined') return new Set();
      try {
        const saved = localStorage.getItem('le:favFolders');
        if (!saved) return new Set();
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((id) => typeof id === 'string'));
        }
      } catch (error) {
        console.warn('No se pudieron leer las carpetas favoritas', error);
      }
      return new Set();
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        'le:favFolders',
        JSON.stringify(Array.from(favoriteFolderIds))
      );
    } catch (error) {
      console.warn('No se pudieron guardar las carpetas favoritas', error);
    }
  }, [favoriteFolderIds]);

  useEffect(() => {
    setFavoriteFolderIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        const exists = folders.some((folder) => folder.id === id);
        if (exists) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [folders]);

  // Funciones para manejar carpetas favoritas
  const toggleFavorite = useCallback((folderId: string) => {
    setFavoriteFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteFolderIds(new Set());
  }, []);

  const buildFolderTree = (
    folders: OptimizedFolder[]
  ): (OptimizedFolder & { children?: OptimizedFolder[] })[] => {
    const folderMap = new Map<
      string,
      OptimizedFolder & { children: OptimizedFolder[] }
    >();
    const rootFolders: (OptimizedFolder & { children: OptimizedFolder[] })[] =
      [];

    // First pass: create map with children array
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build tree
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
  };

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  // Compute aggregated photo counts (self + all descendants)
  const aggregatedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    const compute = (
      node: OptimizedFolder & { children?: OptimizedFolder[] }
    ): number => {
      const base = Number(node.photo_count || 0);
      const children = node.children || [];
      let total = base;
      for (const child of children) {
        total += compute(child as any);
      }
      map.set(node.id, total);
      return total;
    };
    folderTree.forEach((n) => compute(n));
    return map;
  }, [folderTree]);

  // Persist expanded state per event
  useEffect(() => {
    try {
      const key = `le:expandedFolders:${eventId || 'global'}`;
      const saved =
        typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        setExpandedFolders(new Set(ids));
      } else {
        // Default: expand ALL nodes for first-time clarity
        const allIds: string[] = [];
        const walk = (n: any) => {
          allIds.push(n.id);
          if (n.children && n.children.length)
            n.children.forEach((c: any) => walk(c));
        };
        folderTree.forEach((n) => walk(n));
        if (allIds.length > 0) setExpandedFolders(new Set(allIds));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, folderTree.length]);

  useEffect(() => {
    try {
      const key = `le:expandedFolders:${eventId || 'global'}`;
      const ids = Array.from(expandedFolders);
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  }, [expandedFolders, eventId]);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const parentId =
        isCreating && isCreating !== 'root' ? isCreating : undefined;
      onCreateFolder(newFolderName.trim(), parentId);
      setNewFolderName('');
      setIsCreating(null);
    }
  };

  // Compute search matches and auto-expansion sets
  const lcQuery = filterText.trim().toLowerCase();
  const filterActive = lcQuery.length >= 1;
  const { matchedIds, expandIds } = useMemo(() => {
    const matched = new Set<string>();
    const expand = new Set<string>();
    if (!filterActive) return { matchedIds: matched, expandIds: expand };
    const walk = (node: any): boolean => {
      const selfMatch = String(node.name || '')
        .toLowerCase()
        .includes(lcQuery);
      const children = node.children || [];
      let childMatch = false;
      for (const c of children) childMatch = walk(c) || childMatch;
      if (selfMatch || childMatch) matched.add(node.id);
      if (childMatch) expand.add(node.id);
      return selfMatch || childMatch;
    };
    folderTree.forEach((n) => walk(n));
    return { matchedIds: matched, expandIds: expand };
  }, [filterActive, lcQuery, folderTree]);

  // Dedicated row component to respect Hooks rules
  type TreeNode = OptimizedFolder & { children?: OptimizedFolder[] };
  const folderMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (nodes: TreeNode[] = []) => {
      nodes.forEach((node) => {
        map.set(node.id, node);
        if (node.children && node.children.length > 0) {
          walk(node.children as TreeNode[]);
        }
      });
    };
    walk(folderTree as TreeNode[]);
    return map;
  }, [folderTree]);

  const quickAccessNodes = useMemo(() => {
    const seen = new Set<string>();
    const nodes: TreeNode[] = [];

    favoriteFolderIds.forEach((id) => {
      const node = folderMap.get(id);
      if (node && !seen.has(node.id)) {
        nodes.push(node);
        seen.add(node.id);
      }
    });

    folderTree.forEach((node) => {
      if (!seen.has(node.id)) {
        nodes.push(node as TreeNode);
        seen.add(node.id);
      }
    });

    return nodes.slice(0, 8);
  }, [favoriteFolderIds, folderMap, folderTree]);
  const FolderNode: React.FC<{
    folder: TreeNode;
    depth?: number;
    selectedFolderId: string | null;
    expandedFolders: Set<string>;
    filterActive: boolean;
    matchedIds: Set<string>;
    expandIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
    isCreatingId: string | null;
    setIsCreating: (id: string | null) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    onCreateFolder: () => void;
    onFolderAction?: (
      action: 'rename' | 'move' | 'delete' | 'copy' | 'paste',
      folder: OptimizedFolder
    ) => void;
    clipboard?: {
      hasData: boolean;
      sourceFolderId?: string;
    };
  }> = ({
    folder,
    depth = 0,
    selectedFolderId,
    expandedFolders,
    filterActive,
    matchedIds,
    expandIds,
    onToggleExpand,
    onSelect,
    isCreatingId,
    setIsCreating,
    newFolderName,
    setNewFolderName,
    onCreateFolder,
    onFolderAction,
    clipboard,
  }) => {
    const hasChildren = !!(folder.children && folder.children.length > 0);
    const isExpanded =
      expandedFolders.has(folder.id) ||
      (filterActive && expandIds.has(folder.id));
    const isSelected = selectedFolderId === folder.id;
    const isFavorite = favoriteFolderIds.has(folder.id);
    const highlightQuery = lcQuery;

    const renderHighlightedName = () => {
      if (!filterActive || !highlightQuery) return folder.name;
      const label = folder.name || '';
      const lower = label.toLowerCase();
      const index = lower.indexOf(highlightQuery);
      if (index === -1) return label;
      const before = label.slice(0, index);
      const match = label.slice(index, index + highlightQuery.length);
      const after = label.slice(index + highlightQuery.length);
      return (
        <>
          {before}
          <span className="rounded bg-blue-100 px-1 text-blue-700">
            {match}
          </span>
          {after}
        </>
      );
    };

    const { isOver, setNodeRef } = useDroppable({
      id: folder.id,
      data: { type: 'folder' },
    });

    // If filtering and this node isn't in the matched path, don't render this node
    if (filterActive && !matchedIds.has(folder.id)) return null;

    return (
      <div>
        <div
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
            isSelected
              ? 'bg-[#e6f7f0] text-[#0f172a] shadow-sm ring-1 ring-[#62e2a2]/60'
              : 'text-[#475467] hover:bg-[#ecf2fa]',
            isOver &&
              'scale-[1.01] transform bg-[#e6f7f0] shadow-sm ring-1 ring-[#62e2a2]/60'
          )}
          ref={setNodeRef}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => onSelect(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="rounded p-0.5 hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-medium',
              isOver || isSelected
                ? 'border-[#1f2a44]/20 bg-[#1f2a44]/10 text-[#1f2a44]'
                : 'border-slate-200 bg-white text-[#475467]'
            )}
          >
            {isOver || isSelected ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
          </span>

          <span className="flex-1 truncate" title={folder.name}>
            {renderHighlightedName()}
          </span>

          {folder.scope && (
            <Badge
              variant="outline"
              className={cn(
                'mr-1 px-1 text-[10px]',
                folder.scope === 'event' && 'border-blue-200 text-blue-700',
                folder.scope === 'global' && 'border-border text-foreground',
                folder.scope === 'legacy' &&
                  'border-primary-200 text-primary-700',
                folder.scope === 'template' &&
                  'border-purple-200 text-purple-700'
              )}
            >
              {folder.scope}
            </Badge>
          )}

          {folder.photo_count !== undefined && (
            <Badge
              variant="secondary"
              className="text-xs"
              title={`Total incluyendo subcarpetas`}
            >
              {aggregatedCountMap.get(folder.id) ?? folder.photo_count}
            </Badge>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(folder.id);
            }}
            className={cn(
              'rounded p-0.5 transition-all hover:bg-muted',
              isFavorite
                ? 'text-amber-500 opacity-100'
                : 'text-gray-400 opacity-0 group-hover:opacity-100'
            )}
            aria-label={
              isFavorite ? 'Quitar de carpetas destacadas' : 'Destacar carpeta'
            }
          >
            <Star
              className={cn('h-3.5 w-3.5', isFavorite && 'fill-amber-400')}
            />
          </button>

          {onFolderAction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
                  aria-label="Acciones de carpeta"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onFolderAction?.('copy', folder);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    !clipboard?.hasData ||
                    clipboard?.sourceFolderId === folder.id
                  }
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!clipboard?.hasData) return;
                    onFolderAction?.('paste', folder);
                  }}
                >
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Pegar aquí
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onFolderAction('rename', folder);
                  }}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Renombrar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onFolderAction('move', folder);
                  }}
                >
                  <Move className="mr-2 h-4 w-4" />
                  Mover
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!folder.parent_id}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!folder.parent_id) return;
                    onFolderAction('delete', folder);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCreating(folder.id);
            }}
            className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {isCreatingId === folder.id && (
          <div
            className="mt-1 flex items-center gap-2 px-2 py-1.5"
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreateFolder();
                if (e.key === 'Escape') setIsCreating(null);
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={onCreateFolder}
              className="h-7 px-2"
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCreating(null)}
              className="h-7 px-2"
            >
              ✕
            </Button>
          </div>
        )}

        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                filterActive={filterActive}
                matchedIds={matchedIds}
                expandIds={expandIds}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                isCreatingId={isCreatingId}
                setIsCreating={setIsCreating}
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                onCreateFolder={onCreateFolder}
                onFolderAction={onFolderAction}
                clipboard={clipboard}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const flattenIds = (
    nodes: (OptimizedFolder & { children?: OptimizedFolder[] })[]
  ): string[] => {
    const out: string[] = [];
    const walk = (n: any) => {
      out.push(n.id);
      if (n.children && n.children.length)
        n.children.forEach((c: any) => walk(c));
    };
    nodes.forEach((n) => walk(n));
    return out;
  };

  const expandAll = useCallback(() => {
    setExpandedFolders(new Set(flattenIds(folderTree)));
  }, [folderTree]);
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  // Keyboard shortcuts: E (expand), C (collapse), R (root), / (focus search)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e as any).isComposing;
      if (isTyping) return;
      if (e.key === 'e' || e.key === 'E') expandAll();
      if (e.key === 'c' || e.key === 'C') collapseAll();
      if (e.key === 'r' || e.key === 'R') {
        const root =
          (folders || []).find(
            (f) => !f.parent_id && (!eventId || f.event_id === eventId)
          ) || folders[0];
        if (root) onSelectFolder(root.id);
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [folders, eventId, onSelectFolder, expandAll, collapseAll]);

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-slate-200/80 bg-[#f7f9fc]',
        className
      )}
    >
      <div className="border-b border-white/60 bg-white/90 px-4 py-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f2a44] to-[#334772] text-base font-semibold text-white shadow-md">
            {(selectedEventName?.slice(0, 2) || 'LE').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#4b5563]">
              Colecciones
            </p>
            <h2 className="truncate text-lg font-semibold text-[#0b1120]">
              {selectedEventName ?? 'Selecciona un evento'}
            </h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="rounded-full bg-[#62e2a2] px-4 text-[#0f172a] shadow-sm hover:bg-[#4fd0a0]"
            onClick={() => setIsCreating(selectedFolderId || 'root')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo set
          </Button>
          {clipboard?.hasData && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onPasteToRoot?.();
              }}
              className="rounded-full px-4 text-[#0f172a]/70 hover:bg-[#e2e8f0]"
              title={
                clipboard?.sourceName
                  ? `Pegar "${clipboard.sourceName}" en la raíz`
                  : 'Pegar en la raíz'
              }
              disabled={!onPasteToRoot}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Pegar
            </Button>
          )}
          {eventId && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenStudentManagement?.()}
                className="rounded-full px-4 text-[#0f172a]/80 transition-colors hover:bg-[#e2e8f0]"
                title="Gestión de estudiantes"
              >
                <Users className="mr-2 h-4 w-4" />
                Estudiantes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenBatchStudentManagement?.()}
                className="rounded-full px-4 text-[#0f172a]/80 transition-colors hover:bg-[#e2e8f0]"
                title="Importar estudiantes / autogenerar carpetas"
              >
                <FileUser className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={expandAll}
            className="rounded-full px-4 text-[#0f172a]/70 hover:bg-[#e2e8f0]"
            title="Expandir todo"
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Expandir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={collapseAll}
            className="rounded-full px-4 text-[#0f172a]/70 hover:bg-[#e2e8f0]"
            title="Colapsar todo"
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            Colapsar
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar set o carpeta"
            className="h-9 rounded-full border-none bg-white/90 pl-10 text-sm text-[#1f2937] shadow-sm ring-1 ring-slate-200/70 focus-visible:ring-2 focus-visible:ring-[#62e2a2]"
            ref={searchRef}
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 hover:bg-slate-300"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-[#475467]">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Destacados
            </span>
            {favoriteFolderIds.size > 0 && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  clearFavorites();
                }}
                className="text-[11px] font-medium text-[#1f8255] hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="space-y-2">
            {quickAccessNodes.length === 0 ? (
              <span className="block rounded-lg bg-slate-100/70 px-3 py-2 text-xs text-[#475467]">
                Destaca carpetas con la estrella para tenerlas a un toque.
              </span>
            ) : (
              quickAccessNodes.map((node) => {
                const total =
                  aggregatedCountMap.get(node.id) ?? node.photo_count ?? 0;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectFolder(node.id)}
                    className={cn(
                      'group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all',
                      selectedFolderId === node.id
                        ? 'bg-[#e6f7f0] text-[#0f172a] shadow-sm ring-1 ring-[#62e2a2]/60'
                        : 'bg-white/90 text-[#475467] hover:bg-[#ecf2fa]'
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder className="h-4 w-4 text-[#1f2a44]" />
                      <span className="truncate font-medium">{node.name}</span>
                      {favoriteFolderIds.has(node.id) && (
                        <Star className="h-3 w-3 text-amber-500" />
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      {node.scope && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5',
                            node.scope === 'event' &&
                              'bg-blue-100 text-blue-700',
                            node.scope === 'global' &&
                              'bg-slate-100 text-slate-700',
                            node.scope === 'template' &&
                              'bg-purple-100 text-purple-700',
                            node.scope === 'legacy' &&
                              'bg-amber-100 text-amber-700'
                          )}
                        >
                          {node.scope}
                        </span>
                      )}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-[#475467]">
                        {total}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Create root folder */}
        {isCreating === 'root' && (
          <div className="flex items-center gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsCreating(null);
              }}
            />
            <Button size="sm" variant="ghost" onClick={handleCreateFolder}>
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCreating(null)}
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {folderTree
          .filter((folder) => !filterActive || matchedIds.has(folder.id))
          .map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              filterActive={filterActive}
              matchedIds={matchedIds}
              expandIds={expandIds}
              onToggleExpand={handleToggleExpand}
              onSelect={onSelectFolder}
              isCreatingId={isCreating}
              setIsCreating={setIsCreating}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              onCreateFolder={handleCreateFolder}
              clipboard={clipboard}
            />
          ))}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
            Loading folders...
          </div>
        ) : folders.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <Folder className="mb-2 h-8 w-8" />
            <p className="text-sm">No folders yet</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCreating('root')}
              className="mt-2"
            >
              Create First Folder
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Optimized Photo Grid Panel with Virtual Scrolling
const PhotoGridPanel: React.FC<{
  assets: OptimizedAsset[];
  selectedAssetIds: Set<string>;
  onSelectionChange: (
    assetId: string,
    isSelected: boolean,
    isRange?: boolean
  ) => void;
  onSelectAll: () => void | Promise<void>;
  onClearSelection: () => void;
  onCreateAlbum: () => void;
  onBulkDelete: () => void;
  onBulkMove: (targetFolderId: string) => void;
  folders: OptimizedFolder[];
  currentFolderId: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  albumTargetInfo?: string;
  totalCount?: number;
  isLoadingAllPages?: boolean;
}> = ({
  assets,
  selectedAssetIds,
  onSelectionChange,
  onSelectAll,
  onClearSelection,
  onCreateAlbum,
  onBulkDelete,
  onBulkMove,
  folders,
  currentFolderId,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
  className,
  albumTargetInfo,
  totalCount,
  isLoadingAllPages,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const saved = localStorage.getItem('le:photoDensity');
    return saved === 'compact' ? 'compact' : 'comfortable';
  });
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('le:photoDensity', density);
    } catch (error) {
      console.warn('No se pudo persistir la densidad seleccionada', error);
    }
  }, [density]);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(assets.length / 6) + (hasMore ? 1 : 0), // 6 items per row + loader
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => (density === 'compact' ? 160 : 220),
    overscan: 2,
  });

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) return;

    const rootEl = scrollElementRef.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { threshold: 0.1, root: rootEl || undefined }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore, assets.length]);

  // Fallback: trigger load more when user scrolls near bottom
  useEffect(() => {
    const el = scrollElementRef.current;
    if (!el || !onLoadMore) return;
    const onScroll = () => {
      if (!hasMore || isLoadingMore) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom) onLoadMore();
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAssetClick = (
    asset: OptimizedAsset,
    index: number,
    event: React.MouseEvent
  ) => {
    const isSelected = selectedAssetIds.has(asset.id);

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + Click: Toggle individual selection (for power users)
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + Click: Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);

      for (let i = start; i <= end; i++) {
        if (assets[i]) {
          onSelectionChange(assets[i].id, true);
        }
      }
    } else {
      // Regular click: Toggle individual selection (checkbox-like behavior)
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    }
  };

  const handleTouchStart = () => {
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (
    asset: OptimizedAsset,
    index: number,
    event: React.TouchEvent
  ) => {
    const touchDuration = Date.now() - touchStartTime;

    // Long press on mobile (500ms+) for selection
    if (touchDuration >= 500) {
      event.preventDefault();
      const isSelected = selectedAssetIds.has(asset.id);
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    } else {
      // Regular tap: Toggle selection (same as click)
      const isSelected = selectedAssetIds.has(asset.id);
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    }
  };

  const renderVirtualizedGrid = () => (
    <div ref={scrollElementRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 6;
          const endIndex = Math.min(startIndex + 6, assets.length);
          const rowAssets = assets.slice(startIndex, endIndex);

          // If this is the last row and we have more to load, show loader
          if (startIndex >= assets.length && hasMore) {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center justify-center"
              >
                <div ref={loadMoreRef}>
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading more...
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading more photos...</div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={cn(
                  'grid h-full',
                  density === 'compact'
                    ? 'grid-cols-3 gap-2 p-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                    : 'grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                )}
              >
                {rowAssets.map((asset, rowIndex) => {
                  const globalIndex = startIndex + rowIndex;
                  const isSelected = selectedAssetIds.has(asset.id);
                  return (
                    <DraggableAssetCard
                      key={asset.id}
                      asset={asset}
                      isSelected={isSelected}
                      onClick={(e) => handleAssetClick(asset, globalIndex, e)}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(asset, globalIndex, e)}
                      density={density}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Child component that uses hooks correctly at top-level
  const DraggableAssetCard: React.FC<{
    asset: OptimizedAsset;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    onTouchStart: () => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    density: 'comfortable' | 'compact';
  }> = ({ asset, isSelected, onClick, onTouchStart, onTouchEnd, density }) => {
    const draggable = useDraggable({ id: asset.id, data: { type: 'asset' } });
    const style = {
      transform: draggable.transform
        ? CSS.Translate.toString(draggable.transform)
        : undefined,
    } as React.CSSProperties;

    const previewUrl =
      asset.preview_url ??
      getPreviewUrl(asset.preview_path, asset.original_path);
    const sizeLabel = asset.file_size
      ? asset.file_size > 1024 * 1024
        ? `${(asset.file_size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(asset.file_size / 1024))} KB`
      : null;
    const dateLabel = asset.created_at
      ? new Date(asset.created_at).toLocaleDateString('es-AR')
      : null;
    const statusText =
      asset.status && asset.status !== 'ready'
        ? statusLabel(asset.status)
        : null;

    return (
      <div
        className={cn(
          'group relative cursor-pointer touch-manipulation overflow-hidden rounded-xl border transition-all',
          density === 'compact'
            ? 'min-h-[100px] sm:min-h-[120px]'
            : 'min-h-[120px] sm:min-h-[150px]',
          isSelected
            ? 'border-blue-500/80 bg-blue-50 shadow-lg ring-2 ring-blue-500/40'
            : 'border-transparent bg-white hover:border-border hover:shadow-sm'
        )}
        ref={draggable.setNodeRef}
        style={style}
        {...draggable.listeners}
        {...draggable.attributes}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={cn(
            'absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border text-xs transition sm:h-8 sm:w-8',
            isSelected
              ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
              : 'border-white/70 bg-black/30 text-white backdrop-blur-sm group-hover:border-white group-hover:bg-black/40'
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="relative aspect-square overflow-hidden bg-muted">
          {previewUrl ? (
            <SafeImage
              src={previewUrl}
              alt={asset.filename}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-400" />
          )}
          {!previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              {asset.status === 'processing' && (
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              )}
              {asset.status === 'error' && (
                <AlertCircle className="h-6 w-6 text-red-400" />
              )}
              {asset.status === 'pending' && (
                <Activity className="h-6 w-6 text-yellow-400" />
              )}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 rounded-xl border border-transparent transition group-hover:border-white/30" />
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition group-hover:opacity-100">
            <div className="flex items-center justify-between p-2 text-[11px] text-white">
              {statusText ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {statusText}
                </span>
              ) : (
                <span />
              )}
              <div className="pointer-events-auto flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.info(
                      'Marca esta foto desde el inspector para destacarla.'
                    );
                  }}
                  aria-label="Destacar foto"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.info(
                      'Comparte fotos desde el inspector o el gestor de enlaces.'
                    );
                  }}
                  aria-label="Compartir foto"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="pointer-events-none space-y-1 px-2 pb-2">
              <p className="truncate text-sm font-medium text-white">
                {asset.filename}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/80">
                {sizeLabel && <span>{sizeLabel}</span>}
                {sizeLabel && dateLabel && <span>•</span>}
                {dateLabel && <span>{dateLabel}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          <span className="truncate" title={asset.filename}>
            {asset.filename}
          </span>
          <div className="flex items-center gap-1">
            {statusText && (
              <span
                className="inline-flex h-2 w-2 rounded-full bg-blue-400"
                aria-hidden
              />
            )}
            {sizeLabel && <span>{sizeLabel}</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div ref={scrollElementRef} className="flex-1 overflow-auto">
      <div className="divide-y">
        {assets.map((asset, index) => {
          const isSelected = selectedAssetIds.has(asset.id);
          return (
            <div
              key={asset.id}
              className={cn(
                'flex cursor-pointer touch-manipulation items-center gap-3 p-3 hover:bg-muted',
                'min-h-[56px]', // Better mobile touch target
                isSelected && 'bg-blue-50',
                density === 'compact' && 'gap-2 py-2'
              )}
              onClick={(e) => handleAssetClick(asset, index, e)}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(asset, index, e)}
            >
              <div
                className={cn(
                  'flex h-7 w-7 touch-manipulation items-center justify-center rounded border-2 shadow-sm transition-all sm:h-6 sm:w-6',
                  isSelected
                    ? 'scale-105 transform border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-400 bg-white hover:border-gray-600 hover:bg-muted'
                )}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <SafeImage
                  src={
                    asset.preview_url ??
                    getPreviewUrl(asset.preview_path, asset.original_path)
                  }
                  alt={asset.filename}
                  className="h-full w-full rounded object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {asset.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {asset.file_size &&
                    `${(asset.file_size / 1024).toFixed(1)} KB`}
                  {asset.created_at &&
                    ` • ${new Date(asset.created_at).toLocaleDateString('es-AR')}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.info(
                      'Destaca esta foto desde el inspector para agregar notas.'
                    );
                  }}
                  aria-label="Destacar foto"
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.info(
                      'Comparte fotos seleccionadas desde el gestor de enlaces.'
                    );
                  }}
                  aria-label="Compartir foto"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>

              {asset.status && asset.status !== 'ready' && (
                <Badge
                  variant={
                    asset.status === 'processing'
                      ? 'secondary'
                      : asset.status === 'error'
                        ? 'destructive'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {statusLabel(asset.status)}
                </Badge>
              )}
            </div>
          );
        })}

        {/* Load more trigger for list view */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center p-4"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando más...
              </div>
            ) : (
              <div className="text-gray-500">Cargando más fotos...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">Fotos</h3>
            {assets.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAll}
                className="text-sm"
              >
                <CheckSquare className="mr-1 h-4 w-4" />
                Seleccionar
              </Button>
            )}
            {selectedAssetIds.size > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onClearSelection}
                className="shrink-0 text-sm"
              >
                <X className="mr-1 h-4 w-4" />
                Limpiar ({selectedAssetIds.size})
              </Button>
            )}
            {typeof totalCount === 'number' && totalCount > 0 ? (
              <Badge variant="secondary">
                {assets.length} / {totalCount}
              </Badge>
            ) : assets.length > 0 ? (
              <Badge variant="secondary">{assets.length}</Badge>
            ) : null}
            {isLoadingAllPages && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Cargando...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full shrink-0 grid-cols-2">
                <TabsTrigger value="grid">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1 rounded-full border bg-muted/60 p-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 rounded-full px-3 text-xs',
                  density === 'comfortable'
                    ? 'bg-white text-foreground shadow'
                    : 'text-muted-foreground'
                )}
                onClick={() => setDensity('comfortable')}
              >
                Cómodo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 rounded-full px-3 text-xs',
                  density === 'compact'
                    ? 'bg-white text-foreground shadow'
                    : 'text-muted-foreground'
                )}
                onClick={() => setDensity('compact')}
              >
                Compacto
              </Button>
            </div>
            {/* Selection tip for new users */}
            {selectedAssetIds.size === 0 && assets.length > 0 && (
              <div className="rounded bg-muted/90 px-2 py-1 text-xs text-gray-500 backdrop-blur dark:text-gray-400">
                <span className="hidden sm:inline">
                  💡 Clic • ESC limpiar • Shift rango
                </span>
                <span className="sm:hidden">💡 Toca • Mantén alternar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content with optimized rendering */}
      {isLoading ? (
        <div ref={scrollElementRef} className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="p-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-foreground">
              No encontramos fotos aquí
            </h4>
            <p>
              Revisa los filtros activos, incluye subcarpetas o utiliza la
              búsqueda global (<span className="font-mono">Cmd/Ctrl + K</span>)
              para saltar a otra ubicación.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Badge variant="outline">Carpeta vacía</Badge>
            <Badge variant="secondary">Filtros aplicados</Badge>
            <Badge variant="outline">Mantén el flujo de explorador</Badge>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        renderVirtualizedGrid()
      ) : (
        renderListView()
      )}
    </div>
  );
};

// Enhanced Inspector Panel with Egress Monitoring
const InspectorPanel: React.FC<{
  selectedAssets: OptimizedAsset[];
  folders?: OptimizedFolder[];
  currentFolderId?: string | null;
  onBulkMove: (targetFolderId: string) => void;
  onBulkDelete: () => void;
  onCreateAlbum: () => void;
  egressMetrics?: EgressMetrics;
  className?: string;
  albumTargetInfo?: string;
}> = ({
  selectedAssets,
  folders = [],
  currentFolderId,
  onBulkMove,
  onBulkDelete,
  onCreateAlbum,
  egressMetrics,
  className,
  albumTargetInfo,
}) => {
  const totalSize = selectedAssets.reduce(
    (sum, asset) => sum + asset.file_size,
    0
  );
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const primaryAsset = selectedAssets[0] ?? null;
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    setDraftName(primaryAsset?.filename ?? '');
  }, [primaryAsset?.id, primaryAsset?.filename]);

  const handleNameBlur = () => {
    if (!primaryAsset) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(primaryAsset.filename ?? '');
      return;
    }
    if (trimmed !== primaryAsset.filename) {
      toast.info('Renombrado rápido llegará en la próxima iteración.');
    }
  };

  const copyToClipboard = (value: string) => {
    if (!value) return;
    try {
      navigator.clipboard.writeText(value);
      toast.success('Copiado al portapapeles');
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      toast.error('No se pudo copiar');
    }
  };

  const primarySize = primaryAsset
    ? formatFileSize(primaryAsset.file_size)
    : null;
  const primaryDate = primaryAsset?.created_at
    ? new Date(primaryAsset.created_at).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const primaryStatus = primaryAsset?.status
    ? statusLabel(primaryAsset.status)
    : null;

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      <div className="border-b px-4 py-3">
        <h3 className="text-lg font-semibold">Inspector</h3>
        <p className="text-xs text-muted-foreground">
          Mantén el flujo de navegador mientras editas y automatizas.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedAssets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/50 bg-muted/30 text-center text-sm text-muted-foreground">
            <Eye className="h-8 w-8 text-muted-foreground" />
            <p>Selecciona fotos o carpetas para ver su resumen aquí.</p>
            <span className="text-xs">
              Sugerencia: usa Shift + clic para rangos rápidos.
            </span>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="flex h-full flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="metadata">Metadatos</TabsTrigger>
              <TabsTrigger value="automation">Automatizaciones</TabsTrigger>
            </TabsList>

            <TabsContent
              value="summary"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seleccionadas</span>
                    <span className="font-medium text-foreground">
                      {selectedAssets.length}{' '}
                      {selectedAssets.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tamaño total</span>
                    <span className="font-medium text-foreground">
                      {formatFileSize(totalSize)}
                    </span>
                  </div>
                  {selectedAssets.some(
                    (asset) => asset.status && asset.status !== 'ready'
                  ) && (
                    <div className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Estados</span>
                      <div className="flex flex-wrap gap-1">
                        {(
                          ['ready', 'processing', 'error', 'pending'] as const
                        ).map((status) => {
                          const count = selectedAssets.filter(
                            (asset) => asset.status === status
                          ).length;
                          return count > 0 ? (
                            <Badge
                              key={status}
                              variant="secondary"
                              className="text-xs"
                            >
                              {count} {statusLabel(status)}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {egressMetrics && (
                <Card
                  className={cn(
                    egressMetrics.currentSession >
                      egressMetrics.warningThreshold && 'border-yellow-300',
                    egressMetrics.currentSession >
                      egressMetrics.criticalThreshold && 'border-red-300'
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Uso de datos</h4>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between font-medium text-foreground">
                        <span>Sesión</span>
                        <span>
                          {formatFileSize(egressMetrics.currentSession)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Solicitudes</span>
                        <span>{egressMetrics.totalRequests}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            egressMetrics.currentSession >
                              egressMetrics.criticalThreshold
                              ? 'bg-red-500'
                              : egressMetrics.currentSession >
                                  egressMetrics.warningThreshold
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          )}
                          style={{
                            width: `${Math.min(
                              (egressMetrics.currentSession /
                                egressMetrics.criticalThreshold) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="space-y-2 p-4">
                  <h4 className="font-medium">Atajos rápidos</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">
                        Shift + clic
                      </span>{' '}
                      selecciona rangos contiguos.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Ctrl/Cmd + A
                      </span>{' '}
                      carga y selecciona todas las fotos visibles.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Delete
                      </span>{' '}
                      abre la confirmación de eliminación.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="metadata"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Ficha de la selección</h4>
                    {primaryAsset?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(primaryAsset.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar ID
                      </Button>
                    )}
                  </div>
                  {primaryAsset ? (
                    <div className="space-y-4">
                      {(primaryAsset.preview_url ??
                        getPreviewUrl(
                          primaryAsset.preview_path,
                          primaryAsset.original_path
                        )) && (
                        <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                          <SafeImage
                            src={
                              primaryAsset.preview_url ??
                              getPreviewUrl(
                                primaryAsset.preview_path,
                                primaryAsset.original_path
                              )
                            }
                            alt={primaryAsset.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">
                          Nombre de archivo
                        </Label>
                        <Input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          onBlur={handleNameBlur}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{primarySize}</span>
                          {primaryStatus && (
                            <Badge variant="outline" className="text-xs">
                              {primaryStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                        {primaryDate && (
                          <div className="flex justify-between">
                            <span>Creada</span>
                            <span className="font-medium text-foreground">
                              {primaryDate}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Carpeta actual</span>
                          <span className="font-medium text-foreground">
                            {currentFolderId
                              ? folders.find(
                                  (folder) => folder.id === currentFolderId
                                )?.name || 'Sin nombre'
                              : 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Selecciona una única foto para editar sus metadatos
                      rápidos.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="automation"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Acciones masivas</h4>
                    {albumTargetInfo && (
                      <span className="text-[11px] text-muted-foreground">
                        {albumTargetInfo}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={onCreateAlbum}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Crear enlace
                    </Button>
                    <Select onValueChange={(value) => onBulkMove(value)}>
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Mover a carpeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders
                          .filter((folder) => folder.id !== currentFolderId)
                          .map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {`${' '.repeat((folder.depth || 0) * 2)}${folder.name}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar ({selectedAssets.length})
                    </Button>
                    <Separator />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start"
                      onClick={onBulkDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ({selectedAssets.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-4">
                  <h4 className="font-medium">Consejos de automatización</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      Combina carpetas destacadas con el árbol para mover fotos
                      más rápido.
                    </li>
                    <li>
                      Las descargas masivas se muestran en el panel de estado
                      del sistema.
                    </li>
                    <li>
                      Comparte enlaces sin salir de esta vista usando el botón
                      “Crear enlace”.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

// Main PhotoAdmin Component
export default function PhotoAdmin({
  className,
  enableUpload = true,
  enableBulkOperations = true,
}: PhotoAdminProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialFolderParam = (searchParams.get('folder_id') ||
    searchParams.get('folderId')) as string | null;
  const initialFolderParamRef = useRef<string | null>(
    initialFolderParam || null
  );

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    () => initialFolderParamRef.current
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [folderClipboard, setFolderClipboard] = useState<{
    folderId: string;
    eventId: string | null;
    folderName: string;
  } | null>(null);
  const initialStudentParam = (searchParams.get('student_id') ||
    searchParams.get('studentId')) as string | null;
  const [studentFilter, setStudentFilter] = useState<string | null>(
    initialStudentParam || null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggedAssetData, setDraggedAssetData] = useState<any>(null);
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem('le:includeSubfolders')
          : null;
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {}
    return true; // default ON as solicitado
  });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'ready' | 'processing' | 'pending' | 'error'
  >('all');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);
  const [isLoadingAllPages, setIsLoadingAllPages] = useState(false);
  const [minSizeMB, setMinSizeMB] = useState<string>('');
  const [maxSizeMB, setMaxSizeMB] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  // Removed file type filter per product requirements (simplify UI)
  const [
    /* fileTypeFilter */
  ] = useState<'all'>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isShareManagerOpen, setShareManagerOpen] = useState(false);
  const [shareRefreshKey, setShareRefreshKey] = useState(0);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Event selection state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    const fromLocalStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('le:lastEventId')
        : null;
    const fromParams = (searchParams.get('event_id') ||
      searchParams.get('eventId')) as string | null;

    // Quick validation: check if it's the known invalid ID and clear immediately
    if (fromLocalStorage === '83070ba2-738e-4038-ab5e-0c42fe4a2880') {
      console.warn(
        'Detected invalid event ID in localStorage, clearing immediately'
      );
      if (typeof window !== 'undefined')
        localStorage.removeItem('le:lastEventId');
      return fromParams || null;
    }

    const result = fromLocalStorage || fromParams || null;
    return result;
  });

  // 🚀 FASE 2: Estado para gestión de estudiantes
  const [showStudentManagement, setShowStudentManagement] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBatchStudentModal, setShowBatchStudentModal] = useState(false);
  const [batchCourses, setBatchCourses] = useState<any[]>([]);
  const [isLoadingBatchCourses, setIsLoadingBatchCourses] = useState(false);
  // Share creation modal state
  const [showCreateShareModal, setShowCreateShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareAllowDownload, setShareAllowDownload] = useState(false);
  const [shareAllowComments, setShareAllowComments] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [renameState, setRenameState] = useState<{ folder: any } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [moveState, setMoveState] = useState<{
    folder: any;
    targetParentId: string | null;
  } | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>('__root__');
  const [deleteState, setDeleteState] = useState<{ folder: any } | null>(null);

  const syncQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const before = url.search;
      updater(url.searchParams);
      if (url.search !== before) {
        window.history.replaceState({}, '', url.toString());
      }
    },
    []
  );

  // Settings state - persisted in localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('photoAdminSettings');
      return saved
        ? JSON.parse(saved)
        : {
            defaultPageSize: 50,
            enableAutoUpload: false,
            showPreviewThumbnails: true,
            defaultViewMode: 'grid', // 'grid' or 'list'
            enableDragAndDrop: true,
            showUploadProgress: true,
            autoSelectUploaded: false,
          };
    } catch {
      return {
        defaultPageSize: 50,
        enableAutoUpload: false,
        showPreviewThumbnails: true,
        defaultViewMode: 'grid',
        enableDragAndDrop: true,
        showUploadProgress: true,
        autoSelectUploaded: false,
      };
    }
  });
  const [uploadState, setUploadState] = useState<{
    total: number;
    uploaded: number;
    failed: number;
    inProgress: boolean;
    startedAt: number;
    batches: Array<{
      index: number;
      files: number;
      uploaded: number;
      failed: number;
      status: 'pending' | 'uploading' | 'done' | 'error';
    }>;
  } | null>(null);
  const [uploadTick, setUploadTick] = useState(0);
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [showUploadDetails, setShowUploadDetails] = useState(false);
  const uploadControllersRef = useRef<AbortController[]>([]);
  const uploadCancelledRef = useRef(false);
  const uploadBatchesRef = useRef<File[][]>([]);
  const [uploadParallelism, setUploadParallelism] = useState<1 | 2 | 3>(2);
  const [autoRetryCount, setAutoRetryCount] = useState<1 | 2 | 3>(2);

  const recalcTotals = useCallback(
    (batches: Array<{ uploaded: number; failed: number }>) => {
      const uploaded = batches.reduce((sum, b) => sum + (b.uploaded || 0), 0);
      const failed = batches.reduce((sum, b) => sum + (b.failed || 0), 0);
      return { uploaded, failed };
    },
    []
  );

  const abortBatch = useCallback((bi: number) => {
    const c = uploadControllersRef.current[bi];
    if (c) c.abort();
  }, []);

  const retryBatch = useCallback(
    async (bi: number) => {
      const files = uploadBatchesRef.current?.[bi];
      if (!files || !selectedFolderId) return;

      setUploadState((prev) =>
        prev
          ? {
              ...prev,
              inProgress: true,
              batches: prev.batches.map((x, idx) =>
                idx === bi
                  ? { ...x, uploaded: 0, failed: 0, status: 'uploading' }
                  : x
              ),
            }
          : prev
      );

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('folder_id', selectedFolderId);

      const controller = new AbortController();
      uploadControllersRef.current[bi] = controller;

      try {
        const response = await uploadFiles(
          '/api/admin/assets/upload',
          formData,
          { signal: controller.signal }
        );
        const result = await response.json();
        setUploadState((prev) => {
          if (!prev) return prev;
          const batches = prev.batches.map((x, idx) => {
            if (idx !== bi) return x;
            if (result?.success) {
              const uploadedNow = result?.uploaded ?? files.length;
              return {
                ...x,
                uploaded: uploadedNow,
                failed: 0,
                status: 'done' as const,
              };
            } else {
              return {
                ...x,
                uploaded: 0,
                failed: files.length,
                status: 'error' as const,
              };
            }
          });
          const totals = recalcTotals(batches);
          const anyUploading = batches.some((b) => b.status === 'uploading');
          return {
            ...prev,
            uploaded: totals.uploaded,
            failed: totals.failed,
            inProgress: anyUploading,
            batches,
          };
        });
      } catch (err: any) {
        setUploadState((prev) => {
          if (!prev) return prev;
          const batches = prev.batches.map((x, idx) =>
            idx === bi
              ? {
                  ...x,
                  uploaded: 0,
                  failed: files.length,
                  status: 'error' as const,
                }
              : x
          );
          const totals = recalcTotals(batches);
          const anyUploading = batches.some((b) => b.status === 'uploading');
          return {
            ...prev,
            uploaded: totals.uploaded,
            failed: totals.failed,
            inProgress: anyUploading,
            batches,
          };
        });
      }
    },
    [recalcTotals, selectedFolderId]
  );

  useEffect(() => {
    if (!uploadState?.inProgress) return;
    const t = setInterval(() => setUploadTick((v) => v + 1), 500);
    return () => clearInterval(t);
  }, [uploadState?.inProgress]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setMinSizeMB('');
    setMaxSizeMB('');
    setStartDate('');
    setEndDate('');
    setStudentFilter(null);
    // fileTypeFilter removed
  }, [setStudentFilter]);

  // Settings handlers
  const updateSettings = useCallback(
    (newSettings: Partial<typeof settings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      localStorage.setItem('photoAdminSettings', JSON.stringify(updated));
      toast.success('Configuración guardada');
    },
    [settings]
  );

  const resetSettings = useCallback(() => {
    const defaultSettings = {
      defaultPageSize: 50,
      enableAutoUpload: false,
      showPreviewThumbnails: true,
      defaultViewMode: 'grid',
      enableDragAndDrop: true,
      showUploadProgress: true,
      autoSelectUploaded: false,
    };
    setSettings(defaultSettings);
    localStorage.setItem('photoAdminSettings', JSON.stringify(defaultSettings));
    toast.success('Configuración restablecida');
  }, []);

  // 🚀 FASE 2: Función para limpiar contexto de evento
  const handleRemoveEventContext = useCallback(() => {
    setSelectedEventId(null);
    try {
      localStorage.removeItem('le:lastEventId');
      // Limpiar URL params también
      const url = new URL(window.location.href);
      url.searchParams.delete('event_id');
      url.searchParams.delete('eventId');
      window.history.replaceState({}, '', url.toString());
      toast.success('Contexto de evento removido');
    } catch (e) {
      console.warn('Error clearing event context:', e);
    }
    setSelectedFolderId(null);
    setSelectedAssetIds(new Set());
    setRenameState(null);
    setMoveState(null);
    setDeleteState(null);
    initialFolderParamRef.current = null;
  }, [
    setSelectedEventId,
    setSelectedFolderId,
    setSelectedAssetIds,
    setRenameState,
    setMoveState,
    setDeleteState,
  ]);

  const [eventsList, setEventsList] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Initialize filters from URL (studentId/courseId) for convenience
  useEffect(() => {
    const student = (searchParams.get('student_id') ||
      searchParams.get('studentId') ||
      searchParams.get('codeId')) as string | null;
    const course = (searchParams.get('course_id') ||
      searchParams.get('courseId')) as string | null;
    if (student && !searchTerm) {
      setSearchTerm(student);
      setStudentFilter(student);
    } else if (course && !searchTerm) {
      setSearchTerm(course);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimized queries with smart caching and debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Prevent excessive queries
  const [egressMetrics, setEgressMetrics] = useState<EgressMetrics>(
    egressMonitor.getMetrics()
  );

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (studentFilter && (!trimmed || trimmed !== studentFilter)) {
      setStudentFilter(null);
    }
  }, [searchTerm, studentFilter]);

  // Update egress metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setEgressMetrics(egressMonitor.getMetrics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Persist includeSubfolders
  useEffect(() => {
    try {
      localStorage.setItem(
        'le:includeSubfolders',
        includeSubfolders ? 'true' : 'false'
      );
    } catch {}
  }, [includeSubfolders]);

  // Folders query with longer stale time (they don't change often)
  const {
    data: folders = [],
    isLoading: isLoadingFolders,
    error: foldersError,
  } = useQuery<OptimizedFolder[]>({
    queryKey: ['optimized-folders', selectedEventId],
    queryFn: () =>
      api.folders.list({
        limit: 50,
        event_id: selectedEventId,
        include_global: false,
      }),
    staleTime: 15 * 60 * 1000, // 15 minutes - folders change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes cache (gcTime replaces cacheTime in React Query v5)
    retry: 2,
    enabled: !!selectedEventId,
  });

  // Error handling for folders query
  useEffect(() => {
    if (foldersError) {
      console.error('Failed to load folders:', foldersError);
      toast.error('Failed to load folders. Please try again.');
    }
  }, [foldersError]);

  // Load events for selector, memoize last event
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const list = await api.events.listSimple(100);
        if (!mounted) return;

        let finalList = [...list];

        // If we have a selectedEventId that's not in the list, try to fetch it
        if (
          selectedEventId &&
          !list.some((event) => event.id === selectedEventId)
        ) {
          console.log(
            'Selected event not in initial list, attempting to fetch event details',
            selectedEventId
          );

          // Try to fetch the specific event details
          try {
            const response = await fetch(
              createApiUrl(`/api/admin/events/${selectedEventId}`)
            );
            if (response.ok) {
              const eventData = await response.json();
              if (eventData.event) {
                // Add the missing event to the list
                const missingEvent = {
                  id: eventData.event.id,
                  name: eventData.event.name || 'Sin nombre',
                };
                finalList = [missingEvent, ...list];
                console.log(
                  'Successfully added missing event to list',
                  missingEvent
                );
              }
            }
          } catch (fetchError) {
            console.warn('Could not fetch specific event details:', fetchError);
            // If we can't fetch the event, don't clear the selection
            // The user explicitly passed this event ID
          }
        }

        if (!mounted) return;
        setEventsList(finalList);

        if (finalList.length === 0) {
          toast.warning('No encontramos eventos disponibles para tu cuenta.');
        }

        // Only auto-select first event if no event is selected at all
        if (!selectedEventId && finalList.length > 0) {
          setSelectedEventId(finalList[0].id);
          setSelectedFolderId(null);
          setSelectedAssetIds(new Set());
          setRenameState(null);
          setMoveState(null);
          setDeleteState(null);
          initialFolderParamRef.current = null;
        }
      } catch (e) {
        console.warn('Failed to load events list:', e);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentional empty deps to avoid refetch loops

  // Handle when selectedEventId changes - check if we need to fetch it
  useEffect(() => {
    if (
      selectedEventId &&
      eventsList.length > 0 &&
      !eventsList.some((e) => e.id === selectedEventId)
    ) {
      // Event not in list, try to fetch it
      (async () => {
        try {
          const response = await fetch(
            createApiUrl(`/api/admin/events/${selectedEventId}`)
          );
          if (response.ok) {
            const eventData = await response.json();
            if (eventData.event) {
              // Add the missing event to the list
              const missingEvent = {
                id: eventData.event.id,
                name: eventData.event.name || 'Sin nombre',
              };
              setEventsList((prev) => [
                missingEvent,
                ...prev.filter((e) => e.id !== missingEvent.id),
              ]);
              console.log(
                'Added missing event to list after selection change',
                missingEvent
              );
            }
          }
        } catch (error) {
          console.warn(
            'Could not fetch event details after selection change:',
            error
          );
        }
      })();
    }
  }, [selectedEventId, eventsList]);

  useEffect(() => {
    if (selectedEventId) {
      try {
        localStorage.setItem('le:lastEventId', selectedEventId);
      } catch {}
    } else {
      try {
        localStorage.removeItem('le:lastEventId');
      } catch {}
    }

    syncQueryParams((params) => {
      if (selectedEventId) {
        params.set('eventId', selectedEventId);
        params.set('event_id', selectedEventId);
      } else {
        params.delete('eventId');
        params.delete('event_id');
      }
    });
  }, [selectedEventId, syncQueryParams]);

  useEffect(() => {
    if (!showBatchStudentModal || !selectedEventId) return;
    let isActive = true;
    setIsLoadingBatchCourses(true);

    (async () => {
      try {
        const response = await fetch(
          createApiUrl(`/api/admin/events/${selectedEventId}/courses?limit=500`)
        );
        const data = await response.json().catch(() => ({}));
        if (!isActive) return;

        if (!response.ok) {
          throw new Error(data?.error || 'No se pudieron cargar los cursos');
        }

        setBatchCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching courses for batch management:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al cargar los cursos del evento'
        );
      } finally {
        if (isActive) setIsLoadingBatchCourses(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [showBatchStudentModal, selectedEventId]);

  // Infinite assets query with proper pagination
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    isError: assetsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: assetsQueryError,
  } = useInfiniteQuery<{ assets: OptimizedAsset[]; count: number; hasMore: boolean }>({
    queryKey: [
      'optimized-assets',
      selectedEventId,
      selectedFolderId,
      debouncedSearchTerm,
      includeSubfolders,
      statusFilter,
      minSizeMB,
      maxSizeMB,
      startDate,
      endDate,
      /* fileTypeFilter removed */ 'all',
      pageSize,
    ],
    queryFn: ({ pageParam = 0 }) => {
      // Use event endpoint when eventId is present (for dashboard consistency)
      if (selectedEventId && !selectedFolderId) {
        return api.assets
          .listByEvent(selectedEventId, {
            offset: pageParam,
            limit: pageSize,
            includeSignedUrls: true,
          })
          .then((result) => ({
            assets: result.photos.map((photo) => ({
              id: photo.id,
              filename: photo.filename,
              preview_path: photo.preview_path,
              file_size: photo.file_size,
              created_at: photo.created_at,
              status: photo.status,
            })),
            count: result.count,
            hasMore: result.hasMore,
          }));
      }

      if (!selectedFolderId) {
        return Promise.resolve({ assets: [], count: 0, hasMore: false });
      }
      const q = debouncedSearchTerm?.trim();
      const minBytes = (() => {
        const n = parseFloat(minSizeMB);
        return Number.isFinite(n) && n > 0
          ? Math.floor(n * 1024 * 1024)
          : undefined;
      })();
      const maxBytes = (() => {
        const n = parseFloat(maxSizeMB);
        return Number.isFinite(n) && n > 0
          ? Math.floor(n * 1024 * 1024)
          : undefined;
      })();
      const startIso = startDate
        ? new Date(`${startDate}T00:00:00.000Z`).toISOString()
        : undefined;
      const endIso = endDate
        ? new Date(`${endDate}T23:59:59.999Z`).toISOString()
        : undefined;
      return api.assets.list(selectedFolderId, {
        offset: pageParam,
        limit: pageSize,
        q: q && q.length >= 2 ? q : undefined,
        include_children: includeSubfolders,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        min_size: minBytes,
        max_size: maxBytes,
        start_date: startIso,
        end_date: endIso,
        // File type filter removed
      });
    },
    getNextPageParam: (lastPage, pages) => {
      const currentTotal = pages.reduce(
        (sum, page) => sum + page.assets.length,
        0
      );
      if (process.env.NEXT_PUBLIC_PAGINATION_DEBUG === '1') {
        console.debug('Pagination debug:', {
          hasMore: lastPage.hasMore,
          lastPageAssets: lastPage.assets.length,
          currentTotal,
          totalCount: lastPage.count,
          nextOffset: lastPage.hasMore ? currentTotal : undefined,
        });
      }
      if (!lastPage.hasMore) return undefined;
      return currentTotal;
    },
    enabled: !!selectedFolderId,
    staleTime: 2 * 60 * 1000, // 2 minutes - assets change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache (gcTime replaces cacheTime in React Query v5)
    retry: 1,
  });

  // Error handling for assets query
  useEffect(() => {
    if (assetsQueryError) {
      console.error('Failed to load assets:', assetsQueryError);
      toast.error('Failed to load photos. Please try again.');
    }
  }, [assetsQueryError]);

  // Flatten assets from infinite query
  const assets = useMemo(
    () => assetsData?.pages.flatMap((page) => page.assets) || [],
    [assetsData]
  );

  const totalAssetsCount = assetsData?.pages[0]?.count || 0;

  // Build breadcrumb for current folder to clarify hierarchy
  const folderById = useMemo(() => {
    const map = new Map<string, OptimizedFolder>();
    (folders || []).forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  useEffect(() => {
    if (!folders || folders.length === 0) return;

    if (selectedFolderId && folderById.has(selectedFolderId)) {
      return;
    }

    const pending = initialFolderParamRef.current;
    if (pending && folderById.has(pending)) {
      setSelectedFolderId(pending);
      initialFolderParamRef.current = null;
      return;
    }

    if (!selectedFolderId) {
      const fallback = folders.find((f) => !f.parent_id) || folders[0];
      if (fallback) {
        setSelectedFolderId(fallback.id);
      }
    }
  }, [folders, folderById, selectedFolderId]);

  useEffect(() => {
    syncQueryParams((params) => {
      if (selectedFolderId) {
        params.set('folderId', selectedFolderId);
        params.set('folder_id', selectedFolderId);
      } else {
        params.delete('folderId');
        params.delete('folder_id');
      }
    });
  }, [selectedFolderId, syncQueryParams]);

  useEffect(() => {
    syncQueryParams((params) => {
      if (studentFilter) {
        params.set('studentId', studentFilter);
        params.set('student_id', studentFilter);
      } else {
        params.delete('studentId');
        params.delete('student_id');
      }
    });
  }, [studentFilter, syncQueryParams]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    syncQueryParams((params) => {
      if (trimmed && trimmed !== studentFilter) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }
    });
  }, [searchTerm, studentFilter, syncQueryParams]);

  // Refresh function to invalidate queries
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['optimized-assets'] });
    await queryClient.invalidateQueries({ queryKey: ['optimized-folders'] });
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success('Caché actualizada');
  }, [queryClient]);

  const moveOptions = useMemo(() => {
    if (!moveState) return [] as OptimizedFolder[];
    const disallowed = new Set<string>();
    const collectDescendants = (id: string) => {
      folders
        .filter((f) => f.parent_id === id)
        .forEach((child) => {
          if (disallowed.has(child.id)) return;
          disallowed.add(child.id);
          collectDescendants(child.id);
        });
    };
    disallowed.add(moveState.folder.id);
    collectDescendants(moveState.folder.id);
    return folders.filter((f) => !disallowed.has(f.id));
  }, [moveState, folders]);

  useEffect(() => {
    if (renameState) {
      setRenameName(renameState.folder.name);
    }
  }, [renameState]);

  useEffect(() => {
    if (moveState) {
      setMoveTargetId(moveState.targetParentId ?? '__root__');
    }
  }, [moveState]);

  const breadcrumbItems = useMemo(() => {
    if (!selectedFolderId) return [] as Array<{ id: string; name: string }>;
    const items: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();
    let cur: string | null = selectedFolderId;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const f = folderById.get(cur);
      if (!f) break;
      items.push({ id: f.id, name: f.name });
      cur = f.parent_id;
    }
    return items.reverse();
  }, [selectedFolderId, folderById]);

  const breadcrumbPath = useMemo(
    () => breadcrumbItems.map((i) => i.name).join(' / '),
    [breadcrumbItems]
  );

  const goToRoot = useCallback(() => {
    const root =
      (folders || []).find(
        (f) =>
          !f.parent_id && (!selectedEventId || f.event_id === selectedEventId)
      ) || folders[0];
    if (root) {
      setSelectedFolderId(root.id);
      setSelectedAssetIds(new Set());
    }
  }, [folders, selectedEventId]);

  const goUp = useCallback(() => {
    if (!selectedFolderId) return;
    const parent = folderById.get(selectedFolderId)?.parent_id;
    if (parent) {
      setSelectedFolderId(parent);
      setSelectedAssetIds(new Set());
    }
  }, [selectedFolderId, folderById]);

  // Album target info (for user clarity)
  const albumTargetInfo = useMemo(() => {
    const selectionPart =
      selectedAssetIds.size > 0
        ? `${selectedAssetIds.size} ${selectedAssetIds.size === 1 ? 'foto' : 'fotos'}`
        : selectedFolderId
          ? `carpeta "${folders.find((f) => f.id === selectedFolderId)?.name || ''}"`
          : '';
    const eventName = eventsList.find((e) => e.id === selectedEventId)?.name;
    const eventPart = eventName
      ? `Evento: ${eventName}`
      : 'Evento: derivado automáticamente';
    if (!selectionPart) return eventPart;
    return `${selectionPart} • ${eventPart}`;
  }, [
    selectedAssetIds,
    selectedFolderId,
    folders,
    eventsList,
    selectedEventId,
  ]);

  // Optimized mutations with better error handling
  const createFolderMutation = useMutation({
    mutationFn: api.folders.create,
    onSuccess: (newFolder) => {
      // Invalidar folders para asegurar datos consistentes después de crear carpeta
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      toast.success('Carpeta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear carpeta: ${error.message}`);
    },
  });

  const renameFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; name: string }
  >({
    mutationFn: ({ folderId, name }) => api.folders.update(folderId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta renombrada');
      setRenameState(null);
      setRenameName('');
    },
    onError: (error) => {
      toast.error(`Error al renombrar carpeta: ${error.message}`);
    },
  });

  const moveFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; targetParentId: string | null }
  >({
    mutationFn: ({ folderId, targetParentId }) =>
      api.folders.update(folderId, { parent_id: targetParentId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta movida');
      setMoveState(null);
      setMoveTargetId('__root__');
      if (selectedFolderId === variables.folderId) {
        setSelectedFolderId(variables.folderId);
      }
    },
    onError: (error) => {
      toast.error(`Error al mover carpeta: ${error.message}`);
    },
  });

  const deleteFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; parentId: string | null }
  >({
    mutationFn: ({ folderId }) => api.folders.delete(folderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta eliminada');
      if (selectedFolderId === variables.folderId) {
        setSelectedAssetIds(new Set());
        setSelectedFolderId(variables.parentId);
      }
      setDeleteState(null);
    },
    onError: (error) => {
      toast.error(`Error al eliminar carpeta: ${error.message}`);
    },
  });

  const copyFolderMutation = useMutation<
    any,
    Error,
    { sourceFolderId: string; targetParentId: string | null; newName?: string }
  >({
    mutationFn: ({ sourceFolderId, targetParentId, newName }) =>
      api.folders.copy(sourceFolderId, {
        target_parent_id: targetParentId,
        new_name: newName,
        include_subfolders: true,
        duplicate_assets: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
    },
    onError: (error) => {
      toast.error(`Error al copiar carpeta: ${error.message}`);
    },
  });

  const moveAssetsMutation = useMutation({
    mutationFn: ({
      assetIds,
      targetFolderId,
    }: {
      assetIds: string[];
      targetFolderId: string;
    }) => api.assets.move(assetIds, targetFolderId),
    onSuccess: (result, variables) => {
      // Invalidar todas las queries relevantes después de mover fotos
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['optimized-folders'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['optimized-assets', selectedFolderId],
          refetchType: 'active',
        }),
        variables.targetFolderId !== selectedFolderId
          ? queryClient.invalidateQueries({
              queryKey: ['optimized-assets', variables.targetFolderId],
              refetchType: 'active',
            })
          : Promise.resolve(),
      ]);

      setSelectedAssetIds(new Set());
      toast.success(
        `${result.moved_count || variables.assetIds.length} fotos movidas exitosamente`
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets', selectedFolderId],
      });
      toast.error(`Error al mover fotos: ${error.message}`);
    },
  });

  const deleteAssetsMutation = useMutation({
    mutationFn: api.assets.delete,
    onSuccess: (result) => {
      // Invalidar todas las queries relevantes después de eliminar fotos
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['optimized-folders'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['optimized-assets', selectedFolderId],
          refetchType: 'active',
        }),
      ]);

      setSelectedAssetIds(new Set());
      toast.success(
        `${result.deleted_count || 0} fotos eliminadas exitosamente`
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets', selectedFolderId],
      });
      toast.error(`Error al eliminar fotos: ${error.message}`);
    },
  });

  // Derived data with memoization
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.has(asset.id)),
    [assets, selectedAssetIds]
  );

  useEffect(() => {
    if (selectedAssets.length > 0) {
      setIsInspectorCollapsed(false);
    }
  }, [selectedAssets.length]);

  // Error state handling
  const hasError = foldersError || assetsError;
  const errorMessage =
    foldersError?.message ||
    assetsQueryError?.message ||
    'An unexpected error occurred';

  // DND Kit sensors
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

  const inspectorAvailable = selectedAssets.length > 0;
  const inspectorOpen = inspectorAvailable && !isInspectorCollapsed;
  const sessionEgressMB = useMemo(() => {
    return Math.round((egressMetrics.currentSession / (1024 * 1024)) * 10) / 10;
  }, [egressMetrics.currentSession]);
  const uploadProgressPercent = useMemo(() => {
    if (!uploadState || uploadState.total === 0) return 0;
    return Math.min(
      100,
      Math.round(
        ((uploadState.uploaded + uploadState.failed) /
          Math.max(1, uploadState.total)) *
          100
      )
    );
  }, [uploadState]);
  const uploadStatusLabel = useMemo(() => {
    if (!uploadState) return '';
    const elapsed = (Date.now() - uploadState.startedAt) / 1000;
    const done = uploadState.uploaded + uploadState.failed;
    const rate = elapsed > 0 ? done / elapsed : 0;
    const remaining = Math.max(0, uploadState.total - done);
    const etaSec = rate > 0 ? Math.ceil(remaining / rate) : 0;
    const mm = Math.floor(etaSec / 60).toString();
    const ss = Math.floor(etaSec % 60)
      .toString()
      .padStart(2, '0');
    const speed = rate > 0 ? `${rate.toFixed(1)}/s` : '';
    const errorSuffix = uploadState.failed > 0 ? ` • ${uploadState.failed} err` : '';
    return `${uploadState.uploaded}/${uploadState.total} • ${mm}:${ss} ${speed}${errorSuffix}`.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  // Handlers
  const handleEventChange = useCallback(
    (id: string | null) => {
      const nextId = id && id.length > 0 ? id : null;
      setSelectedEventId(nextId);
      setSelectedFolderId(null);
      setSelectedAssetIds(new Set());
      setSearchTerm('');
      setStudentFilter(null);
      setRenameState(null);
      setMoveState(null);
      setDeleteState(null);
      initialFolderParamRef.current = null;
    },
    [
      setSelectedAssetIds,
      setSelectedFolderId,
      setSelectedEventId,
      setSearchTerm,
      setStudentFilter,
      setRenameState,
      setMoveState,
      setDeleteState,
    ]
  );

  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedAssetIds(new Set());
  }, []);

  const handlePasteFolder = useCallback(
    (targetParentId: string | null) => {
      if (!folderClipboard) {
        toast.error('No hay ninguna carpeta copiada');
        return;
      }

      if (
        folderClipboard.eventId &&
        selectedEventId &&
        folderClipboard.eventId !== selectedEventId
      ) {
        toast.error('Solo se puede pegar dentro del mismo evento');
        return;
      }

      const clipboardSnapshot = { ...folderClipboard };

      copyFolderMutation.mutate(
        {
          sourceFolderId: clipboardSnapshot.folderId,
          targetParentId,
        },
        {
          onSuccess: (result) => {
            const foldersList = Array.isArray(result?.folders)
              ? result.folders
              : [];
            const rootEntry =
              foldersList.find?.(
                (entry: any) => entry.oldId === clipboardSnapshot.folderId
              ) ?? foldersList[0];
            const label = rootEntry?.name || clipboardSnapshot.folderName;
            toast.success(`Carpeta copiada como "${label}"`);
            if (rootEntry?.newId) {
              setSelectedFolderId((prev) => prev ?? rootEntry.newId);
            }
          },
        }
      );
    },
    [folderClipboard, selectedEventId, copyFolderMutation, setSelectedFolderId]
  );

  const handleFolderAction = useCallback(
    (
      action: 'rename' | 'move' | 'delete' | 'copy' | 'paste',
      folder: OptimizedFolder
    ) => {
      switch (action) {
        case 'rename':
          setRenameState({ folder });
          setRenameName(folder.name);
          break;
        case 'move':
          setMoveState({ folder, targetParentId: folder.parent_id ?? null });
          setMoveTargetId(folder.parent_id ?? '__root__');
          break;
        case 'delete':
          setDeleteState({ folder });
          break;
        case 'copy':
          setFolderClipboard({
            folderId: folder.id,
            eventId: folder.event_id ?? selectedEventId ?? null,
            folderName: folder.name,
          });
          toast.success(`Carpeta "${folder.name}" copiada`);
          break;
        case 'paste':
          handlePasteFolder(folder.id);
          break;
        default:
          break;
      }
    },
    [
      setDeleteState,
      setMoveState,
      setMoveTargetId,
      setRenameName,
      setRenameState,
      setFolderClipboard,
      selectedEventId,
      handlePasteFolder,
    ]
  );

  const handleCreateFolder = useCallback(
    (name: string, parentId?: string) => {
      createFolderMutation.mutate({
        name,
        parent_id: parentId || null,
        event_id: selectedEventId || null,
      });
    },
    [createFolderMutation, selectedEventId]
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!selectedFolderId) {
        toast.error('Selecciona una carpeta antes de subir');
        return;
      }

      // Subir en lotes pequeños para evitar saturar la red
      const maxConcurrent = 5;
      const batches: File[][] = [];
      for (let i = 0; i < files.length; i += maxConcurrent) {
        batches.push(files.slice(i, i + maxConcurrent));
      }

      let successCount = 0;
      let errorCount = 0;
      uploadControllersRef.current = [];
      uploadCancelledRef.current = false;
      uploadBatchesRef.current = batches;
      const batchInfos = batches.map((b, i) => ({
        index: i + 1,
        files: b.length,
        uploaded: 0,
        failed: 0,
        status: 'pending' as const,
      }));
      setUploadState({
        total: files.length,
        uploaded: 0,
        failed: 0,
        inProgress: true,
        startedAt: Date.now(),
        batches: batchInfos,
      });
      setShowUploadPanel(true);

      try {
        // Limited parallelism configurable (1x/2x/3x)
        const maxParallel = uploadParallelism;
        let nextIndex = 0;
        let inFlight = 0;
        let completed = 0;

        const processBatch = async (bi: number) => {
          if (uploadCancelledRef.current) return;
          const batch = batches[bi];
          setUploadState((prev) =>
            prev
              ? {
                  ...prev,
                  batches: prev.batches.map((x, idx) =>
                    idx === bi ? { ...x, status: 'uploading' } : x
                  ),
                }
              : prev
          );

          const formData = new FormData();
          batch.forEach((file) => formData.append('files', file));
          formData.append('folder_id', selectedFolderId);

          const controller = new AbortController();
          uploadControllersRef.current[bi] = controller;

          try {
            const response = await uploadFiles(
              '/api/admin/assets/upload',
              formData,
              { signal: controller.signal }
            );
            const result = await response.json();
            if (result?.success) {
              const uploadedNow = result?.uploaded ?? batch.length;
              successCount += uploadedNow;
              setUploadState((prev) =>
                prev
                  ? {
                      ...prev,
                      uploaded: successCount,
                      batches: prev.batches.map((x, idx) =>
                        idx === bi
                          ? {
                              ...x,
                              uploaded: uploadedNow,
                              failed: 0,
                              status: 'done',
                            }
                          : x
                      ),
                    }
                  : prev
              );
            } else {
              errorCount += batch.length;
              console.error(
                'Batch upload error:',
                result?.error || result?.message
              );
              if (Array.isArray(result?.errors)) {
                result.errors.forEach((err: any) => {
                  console.error(`Upload error for ${err.filename}:`, err.error);
                });
              }
              setUploadState((prev) =>
                prev
                  ? {
                      ...prev,
                      failed: errorCount,
                      batches: prev.batches.map((x, idx) =>
                        idx === bi
                          ? {
                              ...x,
                              uploaded: 0,
                              failed: batch.length,
                              status: 'error',
                            }
                          : x
                      ),
                    }
                  : prev
              );
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') {
              errorCount += batch.length;
              setUploadState((prev) =>
                prev
                  ? {
                      ...prev,
                      failed: errorCount,
                      batches: prev.batches.map((x, idx) =>
                        idx === bi
                          ? {
                              ...x,
                              uploaded: 0,
                              failed: batch.length,
                              status: 'error',
                            }
                          : x
                      ),
                    }
                  : prev
              );
              console.warn('Upload aborted for batch', bi + 1);
            } else {
              errorCount += batch.length;
              console.error('Upload error:', err);
              setUploadState((prev) =>
                prev
                  ? {
                      ...prev,
                      failed: errorCount,
                      batches: prev.batches.map((x, idx) =>
                        idx === bi
                          ? {
                              ...x,
                              uploaded: 0,
                              failed: batch.length,
                              status: 'error',
                            }
                          : x
                      ),
                    }
                  : prev
              );
            }
          }
        };

        await new Promise<void>((resolve) => {
          const runNext = () => {
            if (uploadCancelledRef.current) {
              if (inFlight === 0) resolve();
              return;
            }
            while (
              inFlight < maxParallel &&
              nextIndex < batches.length &&
              !uploadCancelledRef.current
            ) {
              const bi = nextIndex++;
              inFlight++;
              processBatch(bi).finally(() => {
                completed++;
                inFlight--;
                if (
                  completed === batches.length ||
                  (uploadCancelledRef.current && inFlight === 0)
                ) {
                  resolve();
                } else {
                  // small pacing
                  setTimeout(runNext, 50);
                }
              });
            }
          };
          runNext();
        });

        // CRÍTICO: Invalidar TODAS las queries relevantes después de cualquier upload
        // Esto soluciona el problema principal de cache
        await Promise.all([
          // Invalidar assets de la carpeta actual
          queryClient.invalidateQueries({
            queryKey: ['optimized-assets', selectedFolderId],
            refetchType: 'active',
          }),
          // Invalidar folders para actualizar conteos de fotos
          queryClient.invalidateQueries({
            queryKey: ['optimized-folders'],
            refetchType: 'active',
          }),
          // Si hay subfolders, invalidar assets de todas las carpetas relacionadas
          includeSubfolders
            ? queryClient.invalidateQueries({
                queryKey: ['optimized-assets'],
                refetchType: 'active',
              })
            : Promise.resolve(),
        ]);

        if (successCount > 0) {
          toast.success(`${successCount} fotos subidas`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} archivos fallaron`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(
          `Error al subir: ${error instanceof Error ? error.message : 'Desconocido'}`
        );
      } finally {
        setUploadState((prev) =>
          prev ? { ...prev, inProgress: false } : prev
        );
        // Auto-hide after short delay
        setTimeout(() => setUploadState(null), 1500);
      }
    },
    [selectedFolderId, queryClient, includeSubfolders, uploadParallelism]
  );

  const handleAssetSelection = useCallback(
    (assetId: string, isSelected: boolean) => {
      setSelectedAssetIds((prev) => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.add(assetId);
        } else {
          newSet.delete(assetId);
        }
        return newSet;
      });
    },
    []
  );

  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const handleSelectAll = useCallback(async () => {
    // Ensure all pages are loaded before selecting
    let guard = 0;
    try {
      setIsLoadingAllPages(true);
      while (hasNextPage && guard < 50) {
        await fetchNextPage();
        guard++;
      }
    } catch (e) {
      console.warn('Select all: failed to fetch all pages', e);
    } finally {
      setIsLoadingAllPages(false);
    }
    // Next tick to allow state to settle
    await new Promise((r) => setTimeout(r, 0));
    const allAssets = assetsRef.current;
    setSelectedAssetIds(new Set(allAssets.map((asset) => asset.id)));
  }, [fetchNextPage, hasNextPage]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssetIds(new Set());
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBulkMove = useCallback(
    (targetFolderId: string) => {
      if (selectedAssetIds.size > 0) {
        // Optimistic update
        const assetIds = Array.from(selectedAssetIds);

        // Update UI immediately
        queryClient.setQueryData(
          ['optimized-assets', selectedFolderId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                assets: page.assets.filter(
                  (asset: OptimizedAsset) => !assetIds.includes(asset.id)
                ),
              })),
            };
          }
        );

        moveAssetsMutation.mutate({
          assetIds,
          targetFolderId,
        });
      }
    },
    [selectedAssetIds, selectedFolderId, queryClient, moveAssetsMutation]
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedAssetIds.size === 0) return;

    const count = selectedAssetIds.size;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} photo${count > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (confirmed) {
      const assetIds = Array.from(selectedAssetIds);

      // Optimistic update
      queryClient.setQueryData(
        ['optimized-assets', selectedFolderId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              assets: page.assets.filter(
                (asset: OptimizedAsset) => !assetIds.includes(asset.id)
              ),
            })),
          };
        }
      );

      deleteAssetsMutation.mutate(assetIds);
    }
  }, [selectedAssetIds, selectedFolderId, queryClient, deleteAssetsMutation]);

  const handleCreateAlbum = useCallback(async () => {
    try {
      if (selectedAssetIds.size === 0 && !selectedFolderId) {
        toast.error('Selecciona fotos o una carpeta para publicar');
        return;
      }

      const eventId =
        selectedEventId ||
        searchParams.get('event_id') ||
        searchParams.get('eventId') ||
        // Derivar desde carpeta seleccionada si existe
        (selectedFolderId &&
          folders.find((f) => f.id === selectedFolderId)?.event_id) ||
        // Derivar desde assets seleccionados
        (selectedAssetIds.size > 0 &&
          assets.find((a) => selectedAssetIds.has(a.id))?.event_id) ||
        undefined;

      // Validar que tenemos eventId o que el API puede derivarlo
      if (!eventId && !selectedFolderId && selectedAssetIds.size === 0) {
        toast.error('No se puede crear enlace: falta contexto de evento');
        return;
      }

      // Build payload for admin share creation
      const isFolder = !!selectedFolderId;
      const titleBase = isFolder
        ? folders.find((f) => f.id === selectedFolderId)?.name || 'Carpeta'
        : `${selectedAssetIds.size} foto${selectedAssetIds.size !== 1 ? 's' : ''}`;

      const payload: Record<string, any> = {
        eventId, // el backend puede derivarlo de carpeta/fotos si es necesario
        shareType: isFolder ? 'folder' : 'photos',
        allowDownload: shareAllowDownload,
        allowComments: shareAllowComments,
        title: `Escaparate - ${titleBase}`,
      };

      if (shareExpiresAt) {
        payload.expiresAt = new Date(shareExpiresAt).toISOString();
      }

      if (isFolder) payload.folderId = selectedFolderId;
      else payload.photoIds = Array.from(selectedAssetIds);

      setIsCreatingShare(true);
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          password: sharePassword || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo crear el enlace');
      }

      const data = await res.json();
      const shareToken = data?.shareToken;
      const links = data?.links || {};
      const shareUrl: string = links.store || links.gallery || '';

      if (!shareToken || !shareUrl) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Persist lightweight record for quick access in UI manager
      const shareData = {
        id: shareToken.id as string,
        token: shareToken.token as string,
        url: shareUrl,
        title: shareToken.title || payload.title,
        type: payload.shareType,
        items: isFolder ? [selectedFolderId] : Array.from(selectedAssetIds),
        eventId,
        createdAt: shareToken.created_at || new Date().toISOString(),
        status: 'active' as const,
      };

      const existingShares = JSON.parse(
        localStorage.getItem('photoEscaparates') || '[]'
      );
      existingShares.unshift(shareData);
      localStorage.setItem(
        'photoEscaparates',
        JSON.stringify(existingShares.slice(0, 100))
      );

      // Copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {}

      toast.success(`🏪 Escaparate "${shareData.title}" creado!`, {
        description:
          '✅ Enlace listo (copiado) — abre el gestor para ver todos',
        action: {
          label: 'Ver gestor',
          onClick: () => setShareManagerOpen(true),
        },
      });
      setShareRefreshKey(Date.now());
      setShowCreateShareModal(false);
      setSharePassword('');
      setShareExpiresAt('');
      setShareAllowDownload(false);
      setShareAllowComments(false);
    } catch (err) {
      console.error('Create share error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Error creando escaparate'
      );
    } finally {
      setIsCreatingShare(false);
    }
  }, [
    selectedAssetIds,
    selectedFolderId,
    selectedEventId,
    searchParams,
    folders,
    assets,
    shareAllowDownload,
    shareAllowComments,
    shareExpiresAt,
    sharePassword,
  ]);

  const handleDragStart = (event: DragStartEvent) => {
    const assetId = event.active.id as string;
    setActiveDragId(assetId);

    // Find the asset data for the dragged item
    const draggedAsset = assets.find((asset) => asset.id === assetId);
    setDraggedAssetData(draggedAsset);

    // Create custom drag image
    if (draggedAsset && typeof window !== 'undefined') {
      const createCustomDragImage = () => {
        // Create a drag preview container
        const dragPreview = document.createElement('div');
        dragPreview.style.cssText = `
          position: absolute;
          top: -1000px;
          left: -1000px;
          width: 120px;
          height: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border: 2px solid #3b82f6;
          padding: 8px;
          font-family: system-ui, -apple-system, sans-serif;
          z-index: 9999;
          pointer-events: none;
        `;

        // Get the count of selected items
        const dragCount = selectedAssetIds.has(assetId)
          ? selectedAssetIds.size
          : 1;

        // Create image element
        const img = document.createElement('img');
        const previewUrl =
          draggedAsset.preview_url ??
          getPreviewUrl(
            draggedAsset.preview_path || draggedAsset.watermark_path,
            draggedAsset.original_path
          );
        if (previewUrl) {
          img.src = previewUrl;
          img.style.cssText = `
            width: 100%;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
            background: #f3f4f6;
          `;
        }

        // Create text element
        const text = document.createElement('div');
        text.style.cssText = `
          margin-top: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
          text-align: center;
          line-height: 1.2;
        `;
        text.textContent = dragCount > 1 ? `${dragCount} fotos` : '1 foto';

        // Assemble
        dragPreview.appendChild(img);
        dragPreview.appendChild(text);
        document.body.appendChild(dragPreview);

        // Set as drag image
        if (event.active.rect && event.active.rect.current) {
          const rect = event.active.rect.current.translated;
          if (rect) {
            // Use setDragImage with offset to center under cursor
            const dragImageEvent = event as any;
            if (
              dragImageEvent.nativeEvent &&
              dragImageEvent.nativeEvent.dataTransfer
            ) {
              dragImageEvent.nativeEvent.dataTransfer.setDragImage(
                dragPreview,
                60,
                60
              );
            }
          }
        }

        // Clean up after a short delay
        setTimeout(() => {
          if (document.body.contains(dragPreview)) {
            document.body.removeChild(dragPreview);
          }
        }, 100);
      };

      // Create custom drag image on next tick to ensure DOM is ready
      setTimeout(createCustomDragImage, 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setDraggedAssetData(null);

    if (over && over.data.current?.type === 'folder') {
      const targetFolderId = over.id as string;
      const assetIdsToMove = selectedAssetIds.has(active.id as string)
        ? Array.from(selectedAssetIds)
        : [active.id as string];

      if (assetIdsToMove.length > 0 && targetFolderId !== selectedFolderId) {
        // Find target folder name for better feedback
        const targetFolder = folders?.find((f) => f.id === targetFolderId);
        const targetFolderName = targetFolder?.name || 'carpeta seleccionada';

        // Provide immediate visual feedback
        const count = assetIdsToMove.length;
        const draggedFileName = draggedAssetData?.original_filename || 'imagen';

        toast.info(
          count > 1
            ? `Moviendo ${count} fotos a "${targetFolderName}"...`
            : `Moviendo "${draggedFileName}" a "${targetFolderName}"...`
        );

        moveAssetsMutation.mutate({
          assetIds: assetIdsToMove,
          targetFolderId,
        });
      }
    }
  };

  // Effects
  useEffect(() => {
    // Sync pageSize with settings
    setPageSize(settings.defaultPageSize as 25 | 50 | 100);
  }, [settings.defaultPageSize]);

  useEffect(() => {
    // Select first folder by default
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        handleSelectAll();
      }
      if (e.key === 'Escape') {
        handleClearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAssetIds.size > 0) {
          e.preventDefault();
          handleBulkDelete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSelectAll,
    handleClearSelection,
    handleBulkDelete,
    selectedAssetIds,
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('relative flex min-h-full flex-1 flex-col', className)}>
        <div className="flex flex-1 flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-10 xl:px-16">
          <section className="rounded-[32px] border border-white/25 bg-white/85 px-6 py-6 shadow-[0_32px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-950/70">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 rounded-full bg-white/70 px-3 text-slate-600 shadow-sm transition hover:bg-white hover:text-foreground dark:bg-slate-900/60 dark:text-slate-200"
                    title="Volver atrás"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Volver</span>
                  </Button>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    Photos
                  </h1>
                  <span className="hidden h-6 w-px rounded bg-slate-200/70 sm:block dark:bg-slate-700/70" />
                  <EventSelector
                    value={selectedEventId}
                    onChange={(id) => handleEventChange(id || null)}
                    className="h-10 min-w-[220px] rounded-full border-none bg-white/70 px-4 text-sm shadow-inner shadow-white/30 backdrop-blur dark:bg-slate-900/60"
                    events={eventsList}
                  />
                  <Badge className="rounded-full border border-white/50 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200">
                    Total: {totalAssetsCount}
                  </Badge>
                  {selectedAssetIds.size > 0 && (
                    <Badge className="rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-100">
                      Seleccionadas: {selectedAssetIds.size}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {enableUpload && (
                    <PhotoUploadButton
                      onUpload={handleUpload}
                      disabled={!selectedFolderId || isLoadingFolders}
                      showIcon={true}
                      variant="modern"
                      modernTone="primary"
                      size="sm"
                      className="h-9 rounded-full px-4 text-sm font-medium shadow-[0_18px_36px_-24px_rgba(37,99,235,0.55)]"
                    >
                      Subir fotos
                    </PhotoUploadButton>
                  )}

                  {uploadState && (
                    <div className="flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-100">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all dark:from-blue-400 dark:to-indigo-400"
                          style={{ width: `${uploadProgressPercent}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap">{uploadStatusLabel}</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full border-white/60 px-3 text-xs font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900 dark:border-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-900"
                    onClick={handleRefresh}
                    title="Actualizar caché"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Refrescar</span>
                  </Button>

                  <div className="hidden items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300 sm:flex">
                    <Activity className="h-3 w-3" />
                    <span>{egressMetrics.totalRequests} req</span>
                    <span className="text-slate-300">•</span>
                    <span>{sessionEgressMB.toFixed(1)} MB</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-slate-500 transition hover:text-foreground"
                      onClick={() => setShowAssignModal(true)}
                      disabled={!selectedEventId}
                      title={
                        selectedEventId
                          ? 'Asignar fotos a estudiantes'
                          : 'Elegí un evento para asignar fotos'
                      }
                      aria-label="Abrir asignaciones"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-slate-500 transition hover:text-foreground"
                      onClick={() => setShowBatchStudentModal(true)}
                      disabled={!selectedEventId}
                      title={
                        selectedEventId
                          ? 'Importar estudiantes y generar carpetas'
                          : 'Elegí un evento para importar estudiantes'
                      }
                      aria-label="Importar estudiantes"
                    >
                      <FileUser className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-slate-500 transition hover:text-foreground"
                      onClick={() => setShareManagerOpen(true)}
                      disabled={!selectedEventId}
                      title={
                        selectedEventId
                          ? 'Gestor de enlaces del evento'
                          : 'Elegí un evento para gestionar enlaces'
                      }
                      aria-label="Gestor de enlaces"
                    >
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-slate-500 transition hover:text-foreground"
                      onClick={() => setShowSettingsModal(true)}
                      title="Preferencias de la vista"
                      aria-label="Preferencias"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div
                id="photo-filters"
                className="flex flex-wrap items-center gap-3 rounded-3xl text-xs sm:text-sm transition-shadow"
              >
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as any)}
                  className="rounded-full bg-white/60 p-0.5 shadow-inner shadow-white/40 dark:bg-slate-900/60"
                >
                  <TabsList className="grid h-9 grid-cols-2 rounded-full bg-transparent p-0">
                    <TabsTrigger value="grid" className="rounded-full text-xs sm:text-sm">
                      <Grid3X3 className="mr-1 h-4 w-4" /> Grid
                    </TabsTrigger>
                    <TabsTrigger value="list" className="rounded-full text-xs sm:text-sm">
                      <List className="mr-1 h-4 w-4" /> Lista
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="hidden h-6 w-px rounded bg-white/50 sm:block dark:bg-slate-700" />

                <div className="hidden items-center gap-2 md:flex">
                  <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Estado
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as any)}
                  >
                    <SelectTrigger className="h-8 w-[120px] rounded-full border-none bg-white/70 px-3 text-xs shadow-inner shadow-white/40 dark:bg-slate-900/60">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ready">Lista</SelectItem>
                      <SelectItem value="processing">Procesando</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Fecha
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 w-[136px] rounded-full border-none bg-white/70 text-xs shadow-inner shadow-white/40 dark:bg-slate-900/60"
                  />
                  <span className="text-slate-300">-</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 w-[136px] rounded-full border-none bg-white/70 text-xs shadow-inner shadow-white/40 dark:bg-slate-900/60"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="hidden text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300 md:inline">
                    Página
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v) as 25 | 50 | 100)}
                  >
                    <SelectTrigger className="h-8 w-[92px] rounded-full border-none bg-white/70 px-3 text-xs shadow-inner shadow-white/40 dark:bg-slate-900/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="ml-auto hidden items-center gap-2 md:flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="rounded-full bg-white/60 px-4 text-xs font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    <X className="mr-1 h-4 w-4" /> Reset
                  </Button>
                </div>
              </div>
            </div>
          </section>
        {/* Mobile filters panel */}
        {showMobileFilters && (
          <div
            id="mobile-filters"
            className="rounded-3xl border border-white/25 bg-white/85 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/70 md:hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-foreground">Estado</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ready">Lista</SelectItem>
                    <SelectItem value="processing">Procesando</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File type filter removed per request */}

              {/* Min/Max MB removed by request */}

              <div>
                <Label className="text-sm text-foreground">Start</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-sm text-foreground">End</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-between">
              <Button variant="ghost" onClick={handleResetFilters}>
                <X className="mr-1 h-4 w-4" /> Reset
              </Button>
              <Button
                variant="default"
                onClick={() => setShowMobileFilters(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* 🚀 FASE 2: Banner de contexto de evento */}
        {selectedEventId && (
          <div className="rounded-3xl border border-white/20 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/70">
            <EventContextBanner
              eventId={selectedEventId}
              onRemoveContext={handleRemoveEventContext}
              compact={true}
            />
          </div>
        )}
        {!selectedEventId && (
          <div className="rounded-3xl border border-dashed border-white/30 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/60 dark:text-slate-300">
            Elegí un evento para gestionar enlaces y sincronizar las carpetas.
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex flex-1 flex-col gap-6 pb-6 pt-4 xl:flex-row xl:items-start xl:gap-10">
          <aside className="xl:w-[260px] xl:min-w-[250px] 2xl:w-[340px] 2xl:min-w-[320px] xl:shrink-0">
            <div className="rounded-3xl border border-white/25 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/60 xl:p-4">
              <FolderTreePanel
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                onCreateFolder={handleCreateFolder}
                isLoading={isLoadingFolders}
                eventId={selectedEventId}
                className="max-h-[calc(100vh-360px)] overflow-hidden xl:pr-1.5"
                onOpenStudentManagement={() => setShowStudentManagement(true)}
                onFolderAction={handleFolderAction}
                clipboard={{
                  hasData: Boolean(folderClipboard),
                  sourceFolderId: folderClipboard?.folderId,
                  sourceName: folderClipboard?.folderName,
                }}
                onPasteToRoot={() => handlePasteFolder(null)}
                onOpenBatchStudentManagement={() =>
                  setShowBatchStudentModal(true)
                }
                selectedEventName={
                  eventsList.find((ev) => ev.id === selectedEventId)?.name ??
                  null
                }
              />
            </div>
          </aside>

          <div className="relative flex-1">
            <div
              className={cn(
                'flex h-full min-h-[540px] flex-col rounded-3xl border border-white/25 bg-white/90 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.55)] dark:border-slate-800/60 dark:bg-slate-950/70',
                inspectorOpen ? 'xl:pr-[320px]' : ''
              )}
            >
              {hasError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-red-50 px-6 text-red-600 dark:bg-red-500/10">
                  <AlertCircle className="h-12 w-12" />
                  <div className="text-center">
                    <h4 className="mb-1 text-lg font-medium">
                      Error al cargar datos
                    </h4>
                    <p className="max-w-md text-sm text-red-700/90 dark:text-red-200">
                      {errorMessage}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries({
                        queryKey: ['optimized-folders'],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ['optimized-assets'],
                      });
                      egressMonitor.resetSession();
                    }}
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="relative flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-100">
                        {eventsList.find((e) => e.id === selectedEventId)?.name ||
                          'Sin evento'}
                      </span>
                      <span className="hidden text-slate-400 xl:inline">•</span>
                      <span className="text-slate-500 dark:text-slate-300">
                        {totalAssetsCount} fotos en vista
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 overflow-x-auto pr-8">
                      <span className="text-slate-400">Jerarquía:</span>
                      {breadcrumbItems.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {breadcrumbItems.map((item, idx) => (
                            <span
                              key={item.id}
                              className="flex items-center gap-1 text-slate-600 dark:text-slate-200"
                            >
                              <button
                                onClick={() => handleSelectFolder(item.id)}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                                title={item.name}
                              >
                                {item.name}
                              </button>
                              {idx < breadcrumbItems.length - 1 && (
                                <span className="text-slate-400">/</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-medium text-slate-500">—</span>
                      )}
                    </div>
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-950 md:hidden" />
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(
                              breadcrumbPath || ''
                            );
                            toast.success('Ruta copiada');
                          } catch {}
                        }}
                        title="Copiar ruta"
                        className="h-7 px-2 text-xs"
                      >
                        Copiar ruta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goUp}
                        title="Subir un nivel"
                        className="h-7 px-2 text-xs"
                      >
                        Subir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goToRoot}
                        title="Ir a la raíz del evento"
                        className="h-7 px-2 text-xs"
                      >
                        Ir a raíz
                      </Button>
                    </div>
                  </div>

                  <PhotoGridPanel
                    assets={assets}
                    selectedAssetIds={selectedAssetIds}
                    onSelectionChange={handleAssetSelection}
                    onSelectAll={handleSelectAll}
                    onClearSelection={handleClearSelection}
                    onCreateAlbum={() => setShowCreateShareModal(true)}
                    onBulkDelete={handleBulkDelete}
                    onBulkMove={handleBulkMove}
                    folders={folders}
                    currentFolderId={selectedFolderId}
                    onLoadMore={handleLoadMore}
                    hasMore={hasNextPage}
                    isLoading={isLoadingAssets}
                    isLoadingMore={isFetchingNextPage}
                    albumTargetInfo={albumTargetInfo}
                    totalCount={totalAssetsCount}
                    isLoadingAllPages={isLoadingAllPages}
                    className="h-full"
                  />
                </div>
              )}
            </div>

            <div
              className={cn(
                'pointer-events-none absolute inset-y-4 right-0 z-30 hidden w-[300px] transition-all duration-200 xl:block',
                inspectorOpen
                  ? 'pointer-events-auto translate-x-0 opacity-100'
                  : 'translate-x-6 opacity-0'
              )}
            >
              <div className="flex h-full flex-col gap-3">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsInspectorCollapsed(true)}
                    aria-label="Ocultar inspector"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <InspectorPanel
                  selectedAssets={selectedAssets}
                  folders={folders}
                  currentFolderId={selectedFolderId}
                  onBulkMove={handleBulkMove}
                  onBulkDelete={handleBulkDelete}
                  onCreateAlbum={handleCreateAlbum}
                  egressMetrics={egressMetrics}
                  albumTargetInfo={albumTargetInfo}
                  className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            {inspectorAvailable && (
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  'absolute bottom-6 right-6 hidden items-center gap-2 rounded-full px-4 shadow-sm transition-all duration-200 xl:flex',
                  inspectorOpen
                    ? 'pointer-events-none translate-y-6 opacity-0'
                    : 'translate-y-0 opacity-100'
                )}
                onClick={() => setIsInspectorCollapsed(false)}
              >
                <Eye className="h-4 w-4" /> Inspector
              </Button>
            )}

            {inspectorAvailable && (
              <div className="mt-4 xl:hidden">
                <InspectorPanel
                  selectedAssets={selectedAssets}
                  folders={folders}
                  currentFolderId={selectedFolderId}
                  onBulkMove={handleBulkMove}
                  onBulkDelete={handleBulkDelete}
                  onCreateAlbum={handleCreateAlbum}
                  egressMetrics={egressMetrics}
                  albumTargetInfo={albumTargetInfo}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Enhanced Drag Overlay */}
      <DragOverlay>
        {activeDragId && draggedAssetData && (
          <div className="relative">
            {/* Main drag preview */}
            <div className="h-24 w-24 overflow-hidden rounded-lg border-2 border-blue-500 bg-white shadow-xl">
              <SafeImage
                src={
                  draggedAssetData.preview_url ??
                  getPreviewUrl(
                    draggedAssetData.preview_path ||
                      draggedAssetData.watermark_path,
                    draggedAssetData.original_path
                  )
                }
                alt="Dragging"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Count badge for multiple selections */}
            {selectedAssetIds.has(activeDragId) &&
              selectedAssetIds.size > 1 && (
                <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md">
                  {selectedAssetIds.size}
                </div>
              )}

            {/* File name/info */}
            <div className="absolute left-1/2 top-full mt-1 max-w-32 -translate-x-1/2 transform truncate whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white">
              {draggedAssetData.original_filename || 'Imagen'}
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Floating Upload Panel */}
      {uploadState && showUploadPanel && (
        <div className="fixed bottom-4 right-4 z-50 w-[320px]">
          <Card className="border-blue-200 shadow-lg dark:border-blue-800">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-foreground">
                    Subiendo fotos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Parallelism selector */}
                  <div className="hidden items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 sm:flex">
                    <span>Paralelismo</span>
                    <Select
                      value={String(uploadParallelism)}
                      onValueChange={(v) =>
                        setUploadParallelism(Number(v) as 1 | 2 | 3)
                      }
                    >
                      <SelectTrigger className="h-7 w-[64px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1×</SelectItem>
                        <SelectItem value="2">2×</SelectItem>
                        <SelectItem value="3">3×</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Auto-retry count selector */}
                  <div className="hidden items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 sm:flex">
                    <span>Reintentos</span>
                    <Select
                      value={String(autoRetryCount)}
                      onValueChange={(v) =>
                        setAutoRetryCount(Number(v) as 1 | 2 | 3)
                      }
                    >
                      <SelectTrigger className="h-7 w-[64px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {uploadState?.batches?.some((b) => b.status === 'error') && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          // Retry all failed with limited parallelism
                          const indices = uploadState.batches
                            .map((b, i) => ({ b, i }))
                            .filter(({ b }) => b.status === 'error')
                            .map(({ i }) => i);
                          const maxP = uploadParallelism;
                          let ptr = 0;
                          const run = async () => {
                            if (ptr >= indices.length) return;
                            const idx = indices[ptr++];
                            await retryBatch(idx);
                            await run();
                          };
                          await Promise.all(
                            Array.from(
                              { length: Math.min(maxP, indices.length) },
                              run
                            )
                          );
                        }}
                      >
                        Reintentar fallidos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          // Auto retry failed up to autoRetryCount attempts
                          let remaining =
                            uploadState?.batches
                              ?.map((b, i) => ({ b, i }))
                              .filter(({ b }) => b.status === 'error')
                              .map(({ i }) => i) || [];
                          for (
                            let attempt = 0;
                            attempt < autoRetryCount && remaining.length > 0;
                            attempt++
                          ) {
                            let ptr = 0;
                            const maxP = uploadParallelism;
                            const run = async () => {
                              if (ptr >= remaining.length) return;
                              const idx = remaining[ptr++];
                              await retryBatch(idx);
                              await run();
                            };
                            await Promise.all(
                              Array.from(
                                { length: Math.min(maxP, remaining.length) },
                                run
                              )
                            );
                            // recompute remaining based on latest state
                            remaining = (uploadState?.batches || [])
                              .map((b, i) => ({ b, i }))
                              .filter(({ b }) => b.status === 'error')
                              .map(({ i }) => i);
                          }
                        }}
                      >
                        Auto x{autoRetryCount}
                      </Button>
                    </>
                  )}
                  {/* Retry all (pending + error) */}
                  {uploadState?.batches?.some((b) => b.status !== 'done') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        const indices = uploadState.batches
                          .map((b, i) => ({ b, i }))
                          .filter(
                            ({ b }) =>
                              b.status === 'pending' || b.status === 'error'
                          )
                          .map(({ i }) => i);
                        const maxP = uploadParallelism;
                        let ptr = 0;
                        const run = async () => {
                          if (ptr >= indices.length) return;
                          const idx = indices[ptr++];
                          await retryBatch(idx);
                          await run();
                        };
                        await Promise.all(
                          Array.from(
                            { length: Math.min(maxP, indices.length) },
                            run
                          )
                        );
                      }}
                    >
                      Reintentar todos
                    </Button>
                  )}
                  <button
                    onClick={() => setShowUploadPanel(false)}
                    className="text-gray-400 hover:text-muted-foreground"
                    title="Ocultar panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{
                      width: `${Math.min(100, Math.round(((uploadState.uploaded + uploadState.failed) / Math.max(1, uploadState.total)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {uploadState.uploaded}/{uploadState.total}
                    {uploadState.failed > 0 && (
                      <span className="text-red-500">
                        {' '}
                        • {uploadState.failed} err
                      </span>
                    )}
                  </span>
                  <span>
                    {(() => {
                      const elapsed =
                        (Date.now() - uploadState.startedAt) / 1000;
                      const done = uploadState.uploaded + uploadState.failed;
                      const rate = elapsed > 0 ? done / elapsed : 0;
                      const remaining = Math.max(0, uploadState.total - done);
                      const etaSec = rate > 0 ? Math.ceil(remaining / rate) : 0;
                      const mm = Math.floor(etaSec / 60);
                      const ss = Math.floor(etaSec % 60)
                        .toString()
                        .padStart(2, '0');
                      const speed = rate > 0 ? `${rate.toFixed(1)}/s` : '';
                      return `${mm}:${ss} ${speed}`;
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setShowUploadDetails((v) => !v)}
                  >
                    {showUploadDetails ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowUploadPanel(false)}
                    >
                      Minimizar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!uploadState.inProgress}
                      onClick={() => {
                        uploadCancelledRef.current = true;
                        uploadControllersRef.current.forEach((c) => c.abort());
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>

                {showUploadDetails && uploadState && (
                  <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded border bg-muted p-2">
                    {uploadState.batches.map((b, idx) => (
                      <div
                        key={b.index}
                        className="flex items-center justify-between py-0.5 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          {b.status === 'done' && (
                            <CheckSquare className="h-3 w-3 text-green-600" />
                          )}
                          {b.status === 'uploading' && (
                            <RefreshCw className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                          )}
                          {b.status === 'pending' && (
                            <Square className="h-3 w-3 text-gray-400" />
                          )}
                          {b.status === 'error' && (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span>
                            Lote {b.index} • {b.files} arch
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-gray-500 dark:text-gray-400">
                            {b.uploaded > 0 && (
                              <span className="mr-1 text-green-600">
                                +{b.uploaded}
                              </span>
                            )}
                            {b.failed > 0 && (
                              <span className="text-red-600">-{b.failed}</span>
                            )}
                          </div>
                          {b.status === 'uploading' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2"
                              onClick={() => abortBatch(idx)}
                            >
                              Abortar
                            </Button>
                          )}
                          {b.status === 'error' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-6 px-2"
                              onClick={() => retryBatch(idx)}
                            >
                              Reintentar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Configuración de Galería
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettingsModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Page Size Setting */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Fotos por página
                  </Label>
                  <Select
                    value={String(settings.defaultPageSize)}
                    onValueChange={(value) =>
                      updateSettings({ defaultPageSize: Number(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 fotos</SelectItem>
                      <SelectItem value="50">50 fotos</SelectItem>
                      <SelectItem value="100">100 fotos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Setting */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Modo de vista predeterminado
                  </Label>
                  <Select
                    value={settings.defaultViewMode}
                    onValueChange={(value) =>
                      updateSettings({ defaultViewMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Cuadrícula</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Boolean Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Mostrar miniaturas de vista previa
                      </Label>
                      <p className="text-xs text-gray-500">
                        Mostrar thumbnails en lugar de iconos
                      </p>
                    </div>
                    <Switch
                      checked={settings.showPreviewThumbnails}
                      onCheckedChange={(checked) =>
                        updateSettings({ showPreviewThumbnails: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Habilitar arrastrar y soltar
                      </Label>
                      <p className="text-xs text-gray-500">
                        Mover fotos entre carpetas arrastrando
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableDragAndDrop}
                      onCheckedChange={(checked) =>
                        updateSettings({ enableDragAndDrop: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Mostrar progreso de subida
                      </Label>
                      <p className="text-xs text-gray-500">
                        Panel de progreso durante la subida
                      </p>
                    </div>
                    <Switch
                      checked={settings.showUploadProgress}
                      onCheckedChange={(checked) =>
                        updateSettings({ showUploadProgress: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Seleccionar fotos subidas automáticamente
                      </Label>
                      <p className="text-xs text-gray-500">
                        Auto-seleccionar después de subir
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoSelectUploaded}
                      onCheckedChange={(checked) =>
                        updateSettings({ autoSelectUploaded: checked })
                      }
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between border-t pt-4">
                  <Button variant="outline" onClick={resetSettings}>
                    Restablecer
                  </Button>
                  <Button onClick={() => setShowSettingsModal(false)}>
                    Guardar y Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Share Modal */}
      {showCreateShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Crear enlace de galería
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateShareModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedFolderId
                    ? 'Se compartirá la carpeta seleccionada'
                    : `${selectedAssetIds.size} foto${selectedAssetIds.size !== 1 ? 's' : ''} seleccionada(s)`}
                </div>

                <div className="space-y-2">
                  <Label>Contraseña (opcional)</Label>
                  <Input
                    placeholder="Dejar vacío para sin contraseña"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiración (opcional)</Label>
                  <Input
                    type="datetime-local"
                    value={shareExpiresAt}
                    onChange={(e) => setShareExpiresAt(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir descargas</Label>
                    <p className="text-xs text-gray-500">
                      Por defecto desactivado
                    </p>
                  </div>
                  <Switch
                    checked={shareAllowDownload}
                    onCheckedChange={setShareAllowDownload}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir comentarios</Label>
                  </div>
                  <Switch
                    checked={shareAllowComments}
                    onCheckedChange={setShareAllowComments}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateShareModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateAlbum}
                    disabled={isCreatingShare}
                  >
                    {isCreatingShare ? 'Creando…' : 'Crear enlace'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareManager
        eventId={selectedEventId}
        open={isShareManagerOpen}
        onOpenChange={setShareManagerOpen}
        onRequestCreateShare={() => {
          setShareManagerOpen(false);
          setShowCreateShareModal(true);
        }}
        createButtonLabel="Nuevo enlace"
        createButtonDisabled={
          !selectedEventId || (!selectedFolderId && selectedAssetIds.size === 0)
        }
        emptyStateMessage="Todavía no creaste enlaces para este evento."
        contextDescription="Gestioná los enlaces del evento; elegí una carpeta o fotos para crear nuevos enlaces."
        refreshKey={shareRefreshKey}
      />

      {showAssignModal && selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Asignar fotos a estudiantes
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAssignModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5">
              <AssignFolderPhotos
                eventId={selectedEventId}
                currentFolderId={selectedFolderId}
                currentFolderName={
                  selectedFolderId
                    ? folderById.get(selectedFolderId)?.name || ''
                    : ''
                }
                onAssignmentComplete={() => {
                  if (selectedFolderId) {
                    queryClient.invalidateQueries({
                      queryKey: ['optimized-assets', selectedFolderId],
                      refetchType: 'active',
                    });
                  }
                  queryClient.invalidateQueries({
                    queryKey: ['optimized-folders', selectedEventId],
                    refetchType: 'active',
                  });
                  setShowAssignModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showBatchStudentModal && selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Importación masiva de estudiantes
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBatchStudentModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5">
              {isLoadingBatchCourses ? (
                <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Cargando cursos...
                </div>
              ) : (
                <BatchStudentManagement
                  eventId={selectedEventId}
                  eventName={
                    eventsList.find((ev) => ev.id === selectedEventId)?.name ||
                    'Evento'
                  }
                  courses={batchCourses}
                  onDataChange={() => {
                    queryClient.invalidateQueries({
                      queryKey: ['optimized-folders', selectedEventId],
                      refetchType: 'active',
                    });
                    if (selectedFolderId) {
                      queryClient.invalidateQueries({
                        queryKey: ['optimized-assets', selectedFolderId],
                        refetchType: 'active',
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(renameState)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameState(null);
            setRenameName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar carpeta</DialogTitle>
            <DialogDescription>
              Ingresá el nuevo nombre para la carpeta
              {renameState ? ` "${renameState.folder.name}"` : ''}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Nombre de la carpeta"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameState(null);
                setRenameName('');
              }}
              disabled={renameFolderMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!renameState) return;
                const trimmed = renameName.trim();
                if (!trimmed) {
                  toast.error('El nombre no puede estar vacío');
                  return;
                }
                renameFolderMutation.mutate({
                  folderId: renameState.folder.id,
                  name: trimmed,
                });
              }}
              disabled={
                !renameState ||
                renameFolderMutation.isPending ||
                renameName.trim().length === 0 ||
                renameName.trim() === renameState.folder.name
              }
            >
              {renameFolderMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(moveState)}
        onOpenChange={(open) => {
          if (!open) {
            setMoveState(null);
            setMoveTargetId('__root__');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover carpeta</DialogTitle>
            <DialogDescription>
              Elegí el destino para mover la carpeta
              {moveState ? ` "${moveState.folder.name}"` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Destino</Label>
            <Select value={moveTargetId} onValueChange={setMoveTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar carpeta" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__root__">Mover a raíz</SelectItem>
                {moveOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {`${'• '.repeat(folder.depth || 0)}${folder.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveState(null);
                setMoveTargetId('__root__');
              }}
              disabled={moveFolderMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!moveState) return;
                const target =
                  moveTargetId === '__root__' ? null : moveTargetId;
                moveFolderMutation.mutate({
                  folderId: moveState.folder.id,
                  targetParentId: target,
                });
              }}
              disabled={
                !moveState ||
                moveFolderMutation.isPending ||
                (moveTargetId === '__root__' && !moveState.folder.parent_id) ||
                (moveTargetId !== '__root__' &&
                  moveState.folder.parent_id === moveTargetId)
              }
            >
              {moveFolderMutation.isPending ? 'Moviendo…' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteState)}
        onOpenChange={(open) => {
          if (!open) setDeleteState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar carpeta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la carpeta
              {deleteState ? ` "${deleteState.folder.name}"` : ''} y sus
              referencias. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFolderMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteFolderMutation.isPending}
              onClick={() => {
                if (!deleteState) return;
                deleteFolderMutation.mutate({
                  folderId: deleteState.folder.id,
                  parentId: deleteState.folder.parent_id,
                });
              }}
            >
              {deleteFolderMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🚀 FASE 2: Modal de gestión de estudiantes */}
      {showStudentManagement && selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Gestión de Estudiantes
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowStudentManagement(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <StudentManagement
                eventId={selectedEventId}
                selectedFolderId={selectedFolderId}
              />
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
