'use client';

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

// Enhanced utility function to convert preview path to proxy URL (admin-only access)
const getPreviewUrl = (previewPath: string | null, originalPath?: string | null): string | null => {
  // Try preview path first
  if (previewPath) {
    if (previewPath.startsWith('http')) return previewPath;

    // Normalize to path relative to the previews/ folder
    let relative = previewPath;
    const idx = previewPath.indexOf('/previews/');
    if (idx >= 0) {
      relative = previewPath.slice(idx + '/previews/'.length);
    } else if (previewPath.startsWith('previews/')) {
      relative = previewPath.slice('previews/'.length);
    }

    // Basic guard: must look like an image path
    if (/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(relative)) {
      // Use admin proxy URL which handles multiple storage paths internally
      return `/admin/previews/${relative}`;
    }
  }

  // Fallback to original path if preview not available
  if (originalPath) {
    if (originalPath.startsWith('http')) return originalPath;
    
    // Extract filename from original path for preview lookup
    const filename = originalPath.split('/').pop();
    if (filename && /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(filename)) {
      return `/admin/previews/${filename}`;
    }
  }

  return null;
};

// Component to handle image loading with proper error handling to prevent loops
const SafeImage: React.FC<{
  src: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}> = ({ src, alt, className, loading = "lazy" }) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset error state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setHasError(false);
      setCurrentSrc(src);
    }
  }, [src, currentSrc]);

  if (!src || hasError) {
    return <ImageIcon className="h-8 w-8 text-gray-400" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={(e) => {
        console.warn(`Preview failed to load: ${src}`);
        setHasError(true);
        // Prevent browser from retrying the same URL
        (e.target as HTMLImageElement).src = '';
      }}
    />
  );
};

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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

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
  
} from 'lucide-react';
import { PhotoUploadButton } from './PhotoUploadButton';
import EventSelector from './EventSelector';

// 🚀 FASE 2: Importar componentes de contexto de evento
import { EventContextBanner } from '@/components/admin/shared/EventContextBanner';
import { StudentManagement } from '@/components/admin/shared/StudentManagement';

// Types (optimized for minimal egress)
interface OptimizedFolder {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  // New optional fields sent by API; safe non-breaking additions
  event_id?: string | null;
  child_folder_count?: number;
  scope?: 'event' | 'global' | 'legacy' | 'template';
}

interface OptimizedAsset {
  id: string;
  filename: string;
  preview_path: string | null;
  // May be provided by server for convenience; optional in payloads
  preview_url?: string | null;
  // Some payloads won’t include original_path; keep optional for fallbacks only
  original_path?: string | null;
  // Optional watermark path from some payloads
  watermark_path?: string | null;
  file_size: number;
  created_at: string;
  status?: 'pending' | 'processing' | 'ready' | 'error';
}

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

// Helper to translate status labels
const statusLabel = (s?: string) => {
  switch (s) {
    case 'ready':
      return 'lista';
    case 'processing':
      return 'procesando';
    case 'pending':
      return 'pendiente';
    case 'error':
      return 'error';
    default:
      return s || '';
  }
};

// Ultra-optimized API functions with egress monitoring
class EgressMonitor {
  private static instance: EgressMonitor;
  private metrics: EgressMetrics = {
    totalRequests: 0,
    totalBytes: 0,
    currentSession: 0,
    warningThreshold: 50 * 1024 * 1024, // 50MB warning
    criticalThreshold: 100 * 1024 * 1024, // 100MB critical
  };

  static getInstance(): EgressMonitor {
    if (!EgressMonitor.instance) {
      EgressMonitor.instance = new EgressMonitor();
    }
    return EgressMonitor.instance;
  }

  track(bytes: number) {
    this.metrics.totalRequests++;
    this.metrics.totalBytes += bytes;
    this.metrics.currentSession += bytes;

    if (this.metrics.currentSession > this.metrics.warningThreshold) {
      console.warn(
        '⚠️ High egress usage detected:',
        this.metrics.currentSession / 1024 / 1024,
        'MB'
      );
    }

    if (this.metrics.currentSession > this.metrics.criticalThreshold) {
      toast.error('Critical egress usage! Consider optimizing queries.');
    }
  }

  getMetrics(): EgressMetrics {
    return { ...this.metrics };
  }

  resetSession() {
    this.metrics.currentSession = 0;
  }
}

const egressMonitor = EgressMonitor.getInstance();

// Optimized API functions
const api = {
  folders: {
    list: async (options?: {
      limit?: number;
      offset?: number;
      event_id?: string | null;
      include_global?: boolean;
      scopes?: string[];
    }): Promise<OptimizedFolder[]> => {
      const params = new URLSearchParams();
      if (options?.limit)
        params.set('limit', String(Math.min(options.limit, 50))); // Hard limit
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.include_global) params.set('include_global', 'true');
      if (options?.scopes && options.scopes.length > 0)
        params.set('scopes', options.scopes.join(','));
      if (options?.event_id) params.set('event_id', String(options.event_id));

      // Use unified folders endpoint with event filter when provided
      const ep = '/api/admin/folders';
      const qs = params.toString();
      const url = createApiUrl(qs ? `${ep}?${qs}` : ep);

      const response = await fetch(url);
      const data = await response.json();

      // Track egress
      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch folders');
      }

      return data.folders || [];
    },
    create: async (folder: {
      name: string;
      parent_id?: string | null;
      event_id?: string | null;
    }) => {
      const response = await fetch(createApiUrl('/api/admin/folders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create folder');
      }

      return data.folder;
    },
    update: async (
      folderId: string,
      payload: { name?: string; parent_id?: string | null }
    ) => {
      const response = await fetch(
        createApiUrl(`/api/admin/folders/${folderId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || 'Failed to update folder');
      return data.folder;
    },
    delete: async (
      folderId: string,
      options?: { moveContentsTo?: string | null; force?: boolean }
    ) => {
      const params = new URLSearchParams();
      if (options?.moveContentsTo !== undefined)
        params.set('moveContentsTo', String(options.moveContentsTo));
      if (options?.force !== undefined)
        params.set('force', String(options.force));
      const response = await fetch(
        createApiUrl(`/api/admin/folders/${folderId}?${params}`),
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || 'Failed to delete folder');
      return true;
    },
  },
  events: {
    listSimple: async (
      limit = 100
    ): Promise<Array<{ id: string; name: string }>> => {
      const res = await fetch(
        createApiUrl(`/api/admin/events-simple?limit=${limit}`)
      );
      const data = await res.json();
      return (data.events || []).map((e: any) => ({ id: e.id, name: e.name }));
    },
  },
  assets: {
    list: async (
      folderId: string,
      options?: {
        offset?: number;
        limit?: number;
        q?: string;
        include_children?: boolean;
        status?: 'pending' | 'processing' | 'ready' | 'error';
        min_size?: number;
        max_size?: number;
        start_date?: string;
        end_date?: string;
        file_type?: string;
      }
    ): Promise<{
      assets: OptimizedAsset[];
      count: number;
      hasMore: boolean;
    }> => {
      const params = new URLSearchParams({
        folder_id: folderId,
        limit: String(Math.min(options?.limit || 50, 100)), // Allow up to 100
        offset: String(options?.offset || 0),
      });
      if (options?.q) {
        params.set('q', options.q);
      }
      if (options?.include_children) params.set('include_children', 'true');
      if (options?.status) params.set('status', options.status);
      if (options?.min_size !== undefined)
        params.set('min_size', String(options.min_size));
      if (options?.max_size !== undefined)
        params.set('max_size', String(options.max_size));
      if (options?.start_date) params.set('start_date', options.start_date);
      if (options?.end_date) params.set('end_date', options.end_date);
      if (options?.file_type) params.set('file_type', options.file_type);

      const response = await fetch(createApiUrl(`/api/admin/assets?${params}`));
      const data = await response.json();

      // Track egress
      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch assets');
      }

      return {
        assets: data.assets || [],
        count: data.count || 0,
        hasMore: data.hasMore || false,
      };
    },
    listByEvent: async (
      eventId: string,
      options?: {
        offset?: number;
        limit?: number;
        folderId?: string | null;
        includeSignedUrls?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      }
    ): Promise<{
      photos: OptimizedAsset[];
      count: number;
      hasMore: boolean;
    }> => {
      const params = new URLSearchParams({
        page: String(
          Math.floor((options?.offset || 0) / (options?.limit || 50)) + 1
        ),
        limit: String(Math.min(options?.limit || 50, 100)),
      });
      if (options?.folderId) params.set('folderId', options.folderId);
      if (options?.includeSignedUrls) params.set('includeSignedUrls', 'true');
      if (options?.sortBy) params.set('sortBy', options.sortBy);
      if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

      const response = await fetch(
        createApiUrl(`/api/admin/events/${eventId}/photos?${params}`)
      );
      const data = await response.json();

      // Track egress
      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch event photos');
      }

      return {
        photos: data.photos || [],
        count: data.pagination?.total || 0,
        hasMore: data.pagination?.hasMore || false,
      };
    },
    move: async (assetIds: string[], targetFolderId: string) => {
      const response = await fetch(createApiUrl('/api/admin/assets/bulk'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: assetIds.slice(0, 100), // Limit for safety
          target_folder_id: targetFolderId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Bulk move HTTP error', {
          status: response.status,
          url: response.url,
          body: errorText?.slice(0, 1000),
        });
        throw new Error('Failed to move assets');
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Bulk move API error', { data });
        throw new Error(data.error || 'Failed to move assets');
      }
      return data;
    },
    delete: async (assetIds: string[]) => {
      const response = await fetch(createApiUrl('/api/admin/assets/bulk'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: assetIds.slice(0, 50) }), // Limit for safety
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Bulk delete HTTP error', {
          status: response.status,
          url: response.url,
          body: errorText?.slice(0, 1000),
        });
        throw new Error('Failed to delete assets');
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Bulk delete API error', { data });
        throw new Error(data.error || 'Failed to delete assets');
      }
      return data;
    },
  },
};

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
}> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  className,
  isLoading,
  eventId,
  onOpenStudentManagement,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterText, setFilterText] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

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
  }) => {
    // If filtering and this node isn't in the matched path, don't render this node
    if (filterActive && !matchedIds.has(folder.id)) return null;

    const hasChildren = !!(folder.children && folder.children.length > 0);
    const isExpanded =
      expandedFolders.has(folder.id) ||
      (filterActive && expandIds.has(folder.id));
    const isSelected = selectedFolderId === folder.id;

    const { isOver, setNodeRef } = useDroppable({
      id: folder.id,
      data: { type: 'folder' },
    });

    return (
      <div>
        <div
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100',
            isSelected && 'bg-blue-100 text-blue-700',
            isOver &&
              'scale-105 transform bg-blue-50 shadow-sm ring-2 ring-inset ring-blue-400',
            'transition-all duration-200 ease-in-out'
          )}
          ref={setNodeRef}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelect(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="rounded p-0.5 hover:bg-gray-200"
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

          {isOver ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-gray-500" />
          )}

          <span className="flex-1 truncate" title={folder.name}>
            {folder.name}
          </span>

          {folder.scope && (
            <Badge
              variant="outline"
              className={cn(
                'mr-1 px-1 text-[10px]',
                folder.scope === 'event' && 'border-blue-200 text-blue-700',
                folder.scope === 'global' && 'border-gray-300 text-gray-700',
                folder.scope === 'legacy' && 'border-amber-200 text-amber-700',
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
              setIsCreating(folder.id);
            }}
            className="rounded p-0.5 opacity-0 hover:bg-gray-200 group-hover:opacity-100"
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

  const expandAll = () => {
    setExpandedFolders(new Set(flattenIds(folderTree)));
  };
  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

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
  }, [folders, eventId, onSelectFolder]);

  return (
    <div className={cn('flex h-full flex-col border-r bg-white', className)}>
      <div className="border-b p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Folders</h3>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={expandAll}
              className="h-8 shrink-0 px-2"
              title="Expandir todo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={collapseAll}
              className="h-8 shrink-0 px-2"
              title="Colapsar todo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCreating(selectedFolderId || 'root')}
              className="h-8 shrink-0 px-2"
              title="Nueva carpeta"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {/* 🚀 FASE 2: Botón de gestión de estudiantes cuando hay contexto de evento */}
            {eventId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenStudentManagement?.()}
                className="h-8 shrink-0 px-2 text-green-600 hover:text-green-800"
                title="Gestión de estudiantes"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Folder Search */}
        <div className="mb-2 flex items-center gap-2">
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar carpeta…"
            className="h-8 bg-white/90 text-sm backdrop-blur"
            ref={searchRef}
          />
          {filterText && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFilterText('')}
              className="h-8 px-2"
              title="Limpiar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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

      <div className="flex-1 overflow-y-auto p-2">
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
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(assets.length / 6) + (hasMore ? 1 : 0), // 6 items per row + loader
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 200, // Estimated row height
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
              <div className="grid h-full grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
  }> = ({ asset, isSelected, onClick, onTouchStart, onTouchEnd }) => {
    const draggable = useDraggable({ id: asset.id, data: { type: 'asset' } });
    const style = {
      transform: draggable.transform
        ? CSS.Translate.toString(draggable.transform)
        : undefined,
    } as React.CSSProperties;

    const previewUrl = asset.preview_url ?? getPreviewUrl(asset.preview_path, asset.original_path);

    return (
      <div
        className={cn(
          'group relative cursor-pointer touch-manipulation overflow-hidden rounded-lg border-2 transition-all',
          'min-h-[120px] sm:min-h-[140px]',
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-transparent bg-white hover:border-gray-300 hover:shadow-sm'
        )}
        ref={draggable.setNodeRef}
        style={style}
        {...draggable.listeners}
        {...draggable.attributes}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Selection checkbox */}
        <div
          className={cn(
            'absolute left-2 top-2 z-10 flex h-7 w-7 touch-manipulation items-center justify-center rounded border-2 shadow-sm transition-all sm:h-6 sm:w-6',
            isSelected
              ? 'scale-105 transform border-blue-500 bg-blue-500 text-white'
              : 'border-gray-400 bg-white group-hover:border-gray-600 group-hover:bg-gray-50'
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          )}
        </div>

        {/* Image preview */}
        <div className="relative flex aspect-square items-center justify-center bg-gray-100">
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
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
        </div>

        {/* Filename */}
        <div className="p-2">
          <p className="truncate text-xs text-gray-600" title={asset.filename}>
            {asset.filename}
          </p>
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
                'flex cursor-pointer touch-manipulation items-center gap-3 p-3 hover:bg-gray-50',
                'min-h-[56px]', // Better mobile touch target
                isSelected && 'bg-blue-50'
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
                    : 'border-gray-400 bg-white hover:border-gray-600 hover:bg-gray-50'
                )}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
                <SafeImage
                  src={asset.preview_url ?? getPreviewUrl(asset.preview_path, asset.original_path)}
                  alt={asset.filename}
                  className="h-full w-full rounded object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {asset.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {asset.file_size &&
                    `${(asset.file_size / 1024).toFixed(1)} KB`}
                  {asset.created_at &&
                    ` • ${new Date(asset.created_at).toLocaleDateString('es-AR')}`}
                </p>
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
            {/* Selection tip for new users */}
            {selectedAssetIds.size === 0 && assets.length > 0 && (
              <div className="rounded bg-gray-50/90 px-2 py-1 text-xs text-gray-600 backdrop-blur">
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
                <div className="aspect-square animate-pulse bg-gray-100" />
                <div className="p-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
          <ImageIcon className="mb-4 h-12 w-12" />
          <h4 className="mb-2 text-lg font-medium">
            No hay fotos en esta carpeta
          </h4>
          <p className="text-center text-sm">
            Sube fotos o selecciona otra carpeta para ver contenido.
          </p>
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

  return (
    <div className={cn('flex h-full flex-col border-l bg-white', className)}>
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Inspector</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {selectedAssets.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <Eye className="mb-2 h-8 w-8" />
            <p className="text-sm">Select photos to inspect</p>
          </div>
        ) : (
          <>
            {/* Selection Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="text-sm font-medium">
                      {selectedAssets.length} files
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tamaño total:</span>
                    <span className="text-sm font-medium">
                      {formatFileSize(totalSize)}
                    </span>
                  </div>
                  {selectedAssets.some(
                    (a) => a.status && a.status !== 'ready'
                  ) && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <div className="flex gap-1">
                        {(
                          ['ready', 'processing', 'error', 'pending'] as const
                        ).map((status) => {
                          const count = selectedAssets.filter(
                            (a) => a.status === status
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
                </div>
              </CardContent>
            </Card>

            {/* Egress Monitoring */}
            {egressMetrics && (
              <Card
                className={cn(
                  egressMetrics.currentSession >
                    egressMetrics.warningThreshold && 'border-yellow-300',
                  egressMetrics.currentSession >
                    egressMetrics.criticalThreshold && 'border-red-300'
                )}
              >
                <CardContent className="p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-medium">
                    <Activity className="h-4 w-4" />
                    Uso de datos
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sesión:</span>
                      <span
                        className={cn(
                          'font-medium',
                          egressMetrics.currentSession >
                            egressMetrics.warningThreshold && 'text-yellow-600',
                          egressMetrics.currentSession >
                            egressMetrics.criticalThreshold && 'text-red-600'
                        )}
                      >
                        {formatFileSize(egressMetrics.currentSession)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Solicitudes:</span>
                      <span className="font-medium">
                        {egressMetrics.totalRequests}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
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
                          width: `${Math.min((egressMetrics.currentSession / egressMetrics.criticalThreshold) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Single Asset Details (only show essential info) */}
            {selectedAssets.length === 1 && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <h4 className="font-medium">Detalles</h4>

                  {(selectedAssets[0].preview_url ?? getPreviewUrl(selectedAssets[0].preview_path, selectedAssets[0].original_path)) && (
                    <div className="aspect-square overflow-hidden rounded bg-gray-100">
                      <SafeImage
                        src={selectedAssets[0].preview_url ?? getPreviewUrl(selectedAssets[0].preview_path, selectedAssets[0].original_path)}
                        alt={selectedAssets[0].filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre de archivo:</span>
                      <span
                        className="max-w-24 truncate font-medium"
                        title={selectedAssets[0].filename}
                      >
                        {selectedAssets[0].filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño:</span>
                      <span className="font-medium">
                        {formatFileSize(selectedAssets[0].file_size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creado:</span>
                      <span className="font-medium">
                        {new Date(
                          selectedAssets[0].created_at
                        ).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Operations */}
            <Card>
              <CardContent className="space-y-3 p-4">
                <h4 className="font-medium">Acciones</h4>

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
                  {albumTargetInfo && (
                    <div className="ml-1 text-[11px] leading-snug text-gray-500">
                      {albumTargetInfo}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => onBulkMove(v)}>
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Mover a carpeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders
                          .filter((f) => f.id !== currentFolderId)
                          .map((f) => (
                            <SelectItem
                              key={f.id}
                              value={f.id}
                            >{`${' '.repeat((f.depth || 0) * 2)}${f.name}`}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

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
          </>
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

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
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
  const [showEscaparateManager, setShowEscaparateManager] = useState(false);
  // 🚀 FASE 2: Estado para gestión de estudiantes
  const [showStudentManagement, setShowStudentManagement] = useState(false);
  // Share creation modal state
  const [showCreateShareModal, setShowCreateShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareAllowDownload, setShareAllowDownload] = useState(false);
  const [shareAllowComments, setShareAllowComments] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  // Share manager state
  const [shares, setShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

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
    // fileTypeFilter removed
  }, []);

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
  }, []);

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
    console.debug('Initial selectedEventId:', {
      fromLocalStorage,
      fromParams,
      result,
    });
    return result;
  });
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
    if (student && !searchTerm) setSearchTerm(student);
    else if (course && !searchTerm) setSearchTerm(course);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimized queries with smart caching and debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Prevent excessive queries
  const [egressMetrics, setEgressMetrics] = useState<EgressMetrics>(
    egressMonitor.getMetrics()
  );

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
  } = useQuery({
    queryKey: ['optimized-folders', selectedEventId],
    queryFn: () =>
      api.folders.list({
        limit: 50,
        event_id: selectedEventId,
        include_global: false,
      }),
    staleTime: 15 * 60 * 1000, // 15 minutes - folders change rarely
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    onError: (error) => {
      console.error('Failed to load folders:', error);
      toast.error('Failed to load folders. Please try again.');
    },
    enabled: !!selectedEventId,
    suspense: true,
  });

  // Auto-select first folder when list loads
  useEffect(() => {
    console.debug('Folder auto-selection:', {
      selectedFolderId,
      foldersCount: folders?.length,
      firstFolderId: folders?.[0]?.id,
      firstFolderName: folders?.[0]?.name,
    });
    if (!selectedFolderId && folders && folders.length > 0) {
      console.log(
        'Auto-selecting first folder:',
        folders[0].name,
        folders[0].id
      );
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  // Load events for selector, memoize last event
  useEffect(() => {
    (async () => {
      try {
        const list = await api.events.listSimple(100);
        setEventsList(list);

        // Validate selectedEventId after events are loaded
        if (
          selectedEventId &&
          !list.some((event) => event.id === selectedEventId)
        ) {
          console.warn(
            'Selected event ID is invalid, clearing localStorage and selecting first event',
            {
              invalidId: selectedEventId,
              availableEvents: list.map((e) => e.id),
            }
          );

          // Force clear all related localStorage items
          localStorage.removeItem('le:lastEventId');
          localStorage.removeItem('photoAdminSettings');

          // Clear React Query cache for invalid queries
          if (typeof window !== 'undefined' && (window as any).queryClient) {
            (window as any).queryClient.clear();
          }

          // Select the first event if available
          if (list.length > 0) {
            setSelectedEventId(list[0].id);
            localStorage.setItem('le:lastEventId', list[0].id);
          } else {
            setSelectedEventId(null);
          }
        } else if (!selectedEventId && list.length > 0) {
          // Auto-select first event if none is selected
          setSelectedEventId(list[0].id);
          localStorage.setItem('le:lastEventId', list[0].id);
        }
      } catch (e) {
        console.warn('Failed to load events list');
      }
    })();
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId) {
      try {
        localStorage.setItem('le:lastEventId', selectedEventId);
      } catch {}
      const url = new URL(window.location.href);
      if (url.searchParams.get('event_id') !== selectedEventId) {
        url.searchParams.set('event_id', selectedEventId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [selectedEventId]);

  // Infinite assets query with proper pagination
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    isError: assetsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: assetsQueryError,
  } = useInfiniteQuery({
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
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    onError: (error) => {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load photos. Please try again.');
    },
    suspense: true,
  });

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
        queryKey: ['optimized-folders'],
        refetchType: 'active',
      });
      toast.success('Carpeta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear carpeta: ${error.message}`);
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

  // Handlers
  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedAssetIds(new Set());
  }, []);

  const handleCreateFolder = useCallback(
    (name: string, parentId?: string) => {
      const eventId = (searchParams.get('event_id') ||
        searchParams.get('eventId')) as string | null;
      createFolderMutation.mutate({
        name,
        parent_id: parentId || null,
        event_id: eventId || null,
      });
    },
    [createFolderMutation, searchParams]
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
    [selectedFolderId, queryClient]
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

      const eventId = selectedEventId ||
        searchParams.get('event_id') ||
        searchParams.get('eventId') ||
        // Derivar desde carpeta seleccionada si existe
        (selectedFolderId && folders.find(f => f.id === selectedFolderId)?.event_id) ||
        // Derivar desde assets seleccionados
        (selectedAssetIds.size > 0 && assets.find(a => selectedAssetIds.has(a.id))?.event_id) ||
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

      const payload: any = {
        eventId, // el backend puede derivarlo de carpeta/fotos si es necesario
        shareType: isFolder ? 'folder' : 'photos',
        allowDownload: shareAllowDownload,
        allowComments: shareAllowComments,
        expiresAt: shareExpiresAt ? new Date(shareExpiresAt).toISOString() : null,
        title: `Escaparate - ${titleBase}`,
      };

      if (isFolder) payload.folderId = selectedFolderId;
      else payload.photoIds = Array.from(selectedAssetIds);

      setIsCreatingShare(true);
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, password: sharePassword || undefined }),
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
        description: '✅ Enlace listo (copiado) — abre el gestor para ver todos',
        action: {
          label: 'Ver Gestor',
          onClick: () => setShowEscaparateManager(true),
        },
      });
      setShowCreateShareModal(false);
      setSharePassword('');
      setShareExpiresAt('');
      setShareAllowDownload(false);
      setShareAllowComments(false);
      // Refresh manager list if open
      if (showEscaparateManager) {
        try { await loadShares(); } catch {}
      }
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
    shareAllowDownload,
    shareAllowComments,
    shareExpiresAt,
    sharePassword,
    showEscaparateManager,
  ]);

  const loadShares = useCallback(async () => {
    try {
      if (!selectedEventId) {
        setShares([]);
        return;
      }
      setLoadingShares(true);
      const res = await fetch(`/api/share?eventId=${encodeURIComponent(selectedEventId)}`);
      if (!res.ok) {
        setShares([]);
        return;
      }
      const data = await res.json();
      setShares(Array.isArray(data?.shares) ? data.shares : []);
    } catch {
      setShares([]);
    } finally {
      setLoadingShares(false);
    }
  }, [selectedEventId]);

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
        const previewUrl = draggedAsset.preview_url ?? getPreviewUrl(
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
      <div className={cn('flex h-screen flex-col bg-gray-50', className)}>
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                title="Volver atrás"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Event selector */}
              <div className="flex items-center gap-2">
                <EventSelector
                  value={selectedEventId}
                  onChange={(id) => setSelectedEventId(id)}
                  className="h-9"
                />
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-6 md:block"
              />

              {/* Filters group */}
              <div className="flex items-center gap-3">
                {/* Status filter for desktop */}
                <div className="hidden items-center gap-2 md:flex">
                  <Label
                    htmlFor="desktop-status-filter"
                    className="whitespace-nowrap text-sm text-gray-700"
                  >
                    Estado
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as any)}
                  >
                    <SelectTrigger
                      id="desktop-status-filter"
                      className="h-9 w-[120px]"
                    >
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

                {/* Date range filter */}
                <div className="hidden items-center gap-2 lg:flex">
                  <Label className="whitespace-nowrap text-sm text-gray-700">
                    Fecha
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 w-[140px]"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 w-[140px]"
                  />
                </div>
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-6 md:block"
              />

              {/* Pagination group */}
              <div className="flex items-center gap-3">
                {/* Page size selector */}
                <div className="hidden items-center gap-2 md:flex">
                  <Label className="whitespace-nowrap text-sm text-gray-700">
                    Página
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) =>
                      setPageSize(Number(v) as 25 | 50 | 100)
                    }
                  >
                    <SelectTrigger id="page-size" className="h-9 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="whitespace-nowrap text-xs text-gray-600">
                    Total: {totalAssetsCount}
                  </span>
                </div>
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-6 md:block"
              />

              {/* Actions group */}
              <div className="flex items-center gap-2">
                {/* Reset filters */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-9 md:inline-flex"
                  onClick={handleResetFilters}
                  title="Reset filters"
                >
                  <X className="mr-1 h-4 w-4" /> Reset
                </Button>

                {/* Mobile filters toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 md:hidden"
                  onClick={() => setShowMobileFilters((v) => !v)}
                  aria-expanded={showMobileFilters}
                  aria-controls="mobile-filters"
                >
                  <Filter className="mr-1 h-4 w-4" /> Filtros
                </Button>
              </div>

              {/* Upload and tools group */}
              <div className="flex items-center gap-2">
                <Separator
                  orientation="vertical"
                  className="hidden h-6 sm:block"
                />

                {enableUpload && (
                  <PhotoUploadButton
                    onUpload={handleUpload}
                    disabled={!selectedFolderId || isLoadingFolders}
                    showIcon={true}
                  >
                    Subir
                  </PhotoUploadButton>
                )}

                {/* Upload progress (compact with ETA) */}
                {uploadState && (
                  <div className="flex min-w-[210px] items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded bg-gray-200">
                      <div
                        className="h-2 animate-pulse bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{
                          width: `${Math.min(100, Math.round(((uploadState.uploaded + uploadState.failed) / Math.max(1, uploadState.total)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="whitespace-nowrap text-[11px] text-gray-600">
                      {uploadState.uploaded}/{uploadState.total}
                      {(() => {
                        const elapsed =
                          (Date.now() - uploadState.startedAt) / 1000;
                        const done = uploadState.uploaded + uploadState.failed;
                        const rate = elapsed > 0 ? done / elapsed : 0;
                        const remaining = Math.max(0, uploadState.total - done);
                        const etaSec =
                          rate > 0 ? Math.ceil(remaining / rate) : 0;
                        const mm = Math.floor(etaSec / 60).toString();
                        const ss = Math.floor(etaSec % 60)
                          .toString()
                          .padStart(2, '0');
                        const speed = rate > 0 ? `${rate.toFixed(1)}/s` : '';
                        return ` • ${mm}:${ss} ${speed}`;
                      })()}
                      {uploadState.failed > 0 && (
                        <span className="text-red-500">
                          {' '}
                          • {uploadState.failed} err
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Clear Cache - available in all environments */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    queryClient.invalidateQueries();
                    egressMonitor.resetSession();
                    toast.info('Cache cleared and data refreshed');
                  }}
                  title="Clear cache and refresh data"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                {/* Gestor de Escaparates */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={async () => { setShowEscaparateManager(true); await loadShares(); }}
                  title="Gestor de enlaces de escaparates"
                >
                  <Package className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Enlaces</span>
                </Button>

                {/* Settings - photo grid preferences */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setShowSettingsModal(true)}
                  title="Photo grid settings and preferences"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile filters panel */}
        {showMobileFilters && (
          <div
            id="mobile-filters"
            className="border-t bg-white px-4 py-3 md:hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-gray-700">Estado</Label>
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
                <Label className="text-sm text-gray-700">Start</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700">End</Label>
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
          <div className="px-6 py-3">
            <EventContextBanner
              eventId={selectedEventId}
              onRemoveContext={handleRemoveEventContext}
              compact={true}
            />
          </div>
        )}

        {/* Main Content - 3 Panel Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel: Folder Tree */}
          {/* Left: 25% default */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <FolderTreePanel
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onCreateFolder={handleCreateFolder}
              isLoading={isLoadingFolders}
              eventId={selectedEventId}
              className="h-full"
              onOpenStudentManagement={() => setShowStudentManagement(true)}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Center Panel: Photo Grid (50% default) */}
          <ResizablePanel defaultSize={50} minSize={30}>
            {hasError ? (
              <div className="flex flex-1 flex-col items-center justify-center bg-red-50 text-red-600">
                <AlertCircle className="mb-4 h-12 w-12" />
                <h4 className="mb-2 text-lg font-medium">Error Loading Data</h4>
                <p className="mb-4 max-w-md text-center text-sm">
                  {errorMessage}
                </p>
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
                  Retry
                </Button>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* Context bar: current event and folder */}
                <div className="relative sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2 text-[12px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="mr-1">Evento:</span>
                    <span className="mr-3 font-medium">
                      {eventsList.find((e) => e.id === selectedEventId)?.name ||
                        '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pr-6">
                    <span className="mr-1">Jerarquía:</span>
                    {breadcrumbItems.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {breadcrumbItems.map((item, idx) => (
                          <span
                            key={item.id}
                            className="flex items-center gap-1"
                          >
                            <button
                              onClick={() => handleSelectFolder(item.id)}
                              className="text-blue-600 hover:underline"
                              title={item.name}
                            >
                              {item.name}
                            </button>
                            {idx < breadcrumbItems.length - 1 && (
                              <span className="text-gray-400">/</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                  </div>
                  {/* Mobile fade on overflow */}
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent md:hidden" />
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(breadcrumbPath || '');
                          toast.success('Ruta copiada');
                        } catch {}
                      }}
                      title="Copiar ruta"
                      className="h-7 px-2"
                    >
                      Copiar ruta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={goUp}
                      title="Subir un nivel"
                      className="h-7 px-2"
                    >
                      Subir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={goToRoot}
                      title="Ir a la raíz del evento"
                      className="h-7 px-2"
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
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel: Inspector (25% default) */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <InspectorPanel
              selectedAssets={selectedAssets}
              folders={folders}
              currentFolderId={selectedFolderId}
              onBulkMove={handleBulkMove}
              onBulkDelete={handleBulkDelete}
              onCreateAlbum={handleCreateAlbum}
              egressMetrics={egressMetrics}
              albumTargetInfo={albumTargetInfo}
              className="h-full"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Enhanced Drag Overlay */}
      <DragOverlay>
        {activeDragId && draggedAssetData && (
          <div className="relative">
            {/* Main drag preview */}
            <div className="h-24 w-24 overflow-hidden rounded-lg border-2 border-blue-500 bg-white shadow-xl">
              <SafeImage
                src={draggedAssetData.preview_url ?? getPreviewUrl(
                  draggedAssetData.preview_path || draggedAssetData.watermark_path,
                  draggedAssetData.original_path
                )}
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
          <Card className="border-blue-200 shadow-lg">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Subiendo fotos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Parallelism selector */}
                  <div className="hidden items-center gap-1 text-[11px] text-gray-600 sm:flex">
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
                  <div className="hidden items-center gap-1 text-[11px] text-gray-600 sm:flex">
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
                    className="text-gray-400 hover:text-gray-600"
                    title="Ocultar panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                  <div
                    className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{
                      width: `${Math.min(100, Math.round(((uploadState.uploaded + uploadState.failed) / Math.max(1, uploadState.total)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
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
                  <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded border bg-gray-50 p-2">
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
                            <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
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
                          <div className="text-gray-600">
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
                <h2 className="text-lg font-semibold">Crear enlace de galería</h2>
                <Button size="sm" variant="ghost" onClick={() => setShowCreateShareModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="text-sm text-gray-600">
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
                    <p className="text-xs text-gray-500">Por defecto desactivado</p>
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
                  <Button variant="outline" onClick={() => setShowCreateShareModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAlbum} disabled={isCreatingShare}>
                    {isCreatingShare ? 'Creando…' : 'Crear enlace'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Manager Modal */}
      {showEscaparateManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Gestor de enlaces</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={loadShares} disabled={loadingShares}>
                    <RefreshCw className="mr-1 h-4 w-4" /> Actualizar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowEscaparateManager(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {loadingShares ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Cargando enlaces…
                  </div>
                ) : shares.length === 0 ? (
                  <div className="text-sm text-gray-600">No hay enlaces aún</div>
                ) : (
                  shares.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900">{s.title || 'Enlace'}</div>
                        <div className="text-xs text-gray-600">
                          {s.share_type} • {new Date(s.created_at).toLocaleString('es-AR')}
                          {s.password_hash ? ' • 🔒 con contraseña' : ''}
                          {s.expires_at ? ` • expira ${new Date(s.expires_at).toLocaleString('es-AR')}` : ''}
                        </div>
                        <div className="mt-1 truncate text-xs text-gray-500">{s.links?.store || s.links?.gallery}</div>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(s.links?.store || s.links?.gallery || '');
                              toast.success('Enlace copiado');
                            } catch {}
                          }}
                        >
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm('¿Desactivar este enlace?')) return;
                              const r = await fetch(`/api/share/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
                            if (r.ok) {
                              toast.success('Enlace desactivado');
                              await loadShares();
                            } else {
                              toast.error('No se pudo desactivar');
                            }
                          }}
                        >
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 FASE 2: Modal de gestión de estudiantes */}
      {showStudentManagement && selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Gestión de Estudiantes</h2>
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
