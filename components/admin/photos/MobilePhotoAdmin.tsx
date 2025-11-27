'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { createApiUrl } from '@/lib/utils/api-client';
import { SafeImage, getPreviewUrl, photoAdminApi } from '../photo-admin';
import type { OptimizedFolder } from '../photo-admin';
import type { OptimizedAsset } from '../photo-admin';

// Icons
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Folder,
  Image as ImageIcon,
  Move,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

// Types
interface UnifiedFolder extends OptimizedFolder {
  path: string;
  children?: UnifiedFolder[];
  metadata?: any;
  updated_at?: string;
}

interface MobilePhotoAdminProps {
  className?: string;
  enableUpload?: boolean;
}

// Gradients to give each folder a distinct visual identity
const gradients = [
  'from-sky-500/80 via-indigo-500/70 to-purple-600/70',
  'from-emerald-500/80 via-teal-500/70 to-cyan-500/70',
  'from-orange-500/80 via-amber-500/70 to-rose-500/70',
  'from-indigo-500/80 via-blue-500/70 to-sky-500/70',
  'from-fuchsia-500/80 via-pink-500/70 to-rose-500/70',
];

const hashString = (str: string) =>
  str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const getGradient = (id: string) => gradients[Math.abs(hashString(id)) % gradients.length];
const assetPreviewUrl = (asset: OptimizedAsset | undefined | null) =>
  asset
    ? asset.preview_url ||
      getPreviewUrl(asset.preview_path, asset.original_path || asset.watermark_path || undefined)
    : null;

// Helper to build folder tree with readable path
function buildFolderTree(flatFolders: OptimizedFolder[]): UnifiedFolder[] {
  const folderMap = new Map<string, UnifiedFolder>();
  const roots: UnifiedFolder[] = [];

  for (const folder of flatFolders) {
    folderMap.set(folder.id, { ...folder, path: folder.name, children: [] });
  }

  for (const folder of flatFolders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      const parent = folderMap.get(folder.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
      node.path = `${parent.path}/${folder.name}`;
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function flattenFolders(tree: UnifiedFolder[]): UnifiedFolder[] {
  const acc: UnifiedFolder[] = [];
  const walk = (nodes: UnifiedFolder[]) => {
    nodes.forEach((node) => {
      acc.push(node);
      if (node.children && node.children.length) walk(node.children);
    });
  };
  walk(tree);
  return acc;
}

export default function MobilePhotoAdmin({ className, enableUpload = true }: MobilePhotoAdminProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // -- State --
  const [view, setView] = useState<'albums' | 'photos'>('albums');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('le:lastEventId');
    return null;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderQuery, setFolderQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>({});
  const [coverLoading, setCoverLoading] = useState<Record<string, boolean>>({});

  const debouncedSearch = useDebounce(searchTerm, 300);

  // -- Queries --
  const { data: eventsList = [] } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: async () => {
      const res = await fetch(createApiUrl('/api/admin/events?limit=100'));
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.events || json.events || json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['optimized-folders', selectedEventId],
    queryFn: () => photoAdminApi.folders.list({ event_id: selectedEventId ?? undefined }),
    staleTime: 30 * 1000,
    enabled: !!selectedEventId,
  });

  const folders = useMemo(() => buildFolderTree(foldersData || []), [foldersData]);
  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);
  const filteredFolders = useMemo(() => {
    if (!folderQuery.trim()) return flatFolders;
    const q = folderQuery.toLowerCase();
    return flatFolders.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [flatFolders, folderQuery]);
  const folderIndex = useMemo(() => {
    const idx = new Map<string, UnifiedFolder>();
    flatFolders.forEach((f) => idx.set(f.id, f));
    return idx;
  }, [flatFolders]);
  const selectedFolder = useMemo(
    () => flatFolders.find((f) => f.id === selectedFolderId),
    [flatFolders, selectedFolderId]
  );
  const breadcrumb = useMemo(() => {
    if (!selectedFolder) return [];
    const trail: UnifiedFolder[] = [];
    let cursor: UnifiedFolder | undefined = selectedFolder;
    while (cursor) {
      trail.push(cursor);
      cursor = cursor.parent_id ? folderIndex.get(cursor.parent_id) : undefined;
    }
    return trail.reverse();
  }, [selectedFolder, folderIndex]);

  const {
    data: assetsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAssets,
  } = useInfiniteQuery({
    queryKey: ['optimized-assets', selectedFolderId, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      if (!selectedFolderId && !debouncedSearch) return { assets: [], count: 0, hasMore: false };
      return photoAdminApi.assets.list(selectedFolderId || 'root', {
        offset: pageParam,
        limit: 50,
        q: debouncedSearch || undefined,
        include_children: true,
      });
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((acc, p) => acc + (p.assets?.length || 0), 0) : undefined,
    enabled: !!selectedFolderId || !!debouncedSearch,
    initialPageParam: 0,
  });

  const assets = useMemo(
    () => assetsData?.pages.flatMap((p) => p.assets || []) || [],
    [assetsData]
  );

  // Fetch lightweight cover preview per folder (best effort)
  useEffect(() => {
    let cancelled = false;
    const fetchCovers = async () => {
      const pool: UnifiedFolder[] = [
        ...filteredFolders,
        ...(selectedFolder?.children || []),
        ...(selectedFolder ? [selectedFolder] : []),
      ];
      const targets = pool.filter((f) => !folderCovers[f.id] && !coverLoading[f.id]).slice(0, 30);
      if (targets.length === 0) return;
      // mark loading to avoid duplicate requests
      setCoverLoading((prev) => {
        const next = { ...prev };
        targets.forEach((t) => (next[t.id] = true));
        return next;
      });
      for (const folder of targets) {
        try {
          const res = await photoAdminApi.assets.list(folder.id, {
            limit: 1,
            offset: 0,
            include_children: true, // fetch first asset even if nested
          });
          const first = res.assets?.[0];
          const url = assetPreviewUrl(first);
          if (!cancelled && url) {
            setFolderCovers((prev) => ({ ...prev, [folder.id]: url }));
          }
        } catch (e) {
          // silent fallback to gradient
        } finally {
          if (!cancelled) {
            setCoverLoading((prev) => {
              const next = { ...prev };
              delete next[folder.id];
              return next;
            });
          }
        }
      }
    };
    fetchCovers();
    return () => {
      cancelled = true;
    };
  }, [filteredFolders, selectedFolder, folderCovers, coverLoading]);

  // -- Handlers --
  const handleEventChange = (eventId: string | null) => {
    if (!eventId) {
      setSelectedEventId(null);
      localStorage.removeItem('le:lastEventId');
      return;
    }
    setSelectedEventId(eventId);
    localStorage.setItem('le:lastEventId', eventId);
    setSelectedFolderId(null);
    setView('albums');
    setShowEventMenu(false);
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setView('photos');
    setIsSelectionMode(false);
    setSelectedAssetIds(new Set());
  };

  const handleAssetSelection = (assetId: string, forceSelect = false) => {
    if (!isSelectionMode && !forceSelect) {
      // Touch -> preview would go here. For now, enable selection only when the user opts in.
      return;
    }

    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedAssetIds(new Set());
    setIsSelectionMode(false);
  };

  const handleRefreshAssets = () => {
    queryClient.invalidateQueries({ queryKey: ['optimized-assets'] });
  };

  const handleUpload = async (files: File[]) => {
    if (!selectedFolderId) return toast.error('Selecciona un álbum primero');
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('folder_id', selectedFolderId);
      if (selectedEventId) formData.append('event_id', selectedEventId);

      await fetch(createApiUrl('/api/admin/photos/bulk-upload'), {
        method: 'POST',
        body: formData,
      });
      toast.success('Fotos subidas correctamente');
      queryClient.invalidateQueries({ queryKey: ['optimized-assets'] });
    } catch (e) {
      toast.error('Error al subir fotos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    if (view === 'photos') {
      setView('albums');
      setSelectedFolderId(null);
      setIsSelectionMode(false);
      return;
    }
    if (selectedEventId) {
      handleEventChange(null);
      return;
    }
    router.back();
  };

  // Render mobile interface
  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-white dark:bg-black text-foreground flex flex-col mobile-photo-admin-fullscreen',
        className
      )}
    >
      {/* Header - compact, app-like */}
      <header className="sticky top-0 z-50 px-4 h-14 flex items-center justify-between bg-white/90 dark:bg-black/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-accent active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-none">
              {view === 'albums' ? 'Álbumes' : selectedFolder?.name || 'Fotos'}
            </h1>
            <span className="text-xs text-muted-foreground">
              {view === 'albums'
                ? eventsList.find((e: any) => e.id === selectedEventId)?.name || 'Seleccionar evento'
                : selectedFolder?.path || `${assets.length} fotos`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {view === 'photos' && (
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                isSelectionMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {isSelectionMode ? 'Listo' : 'Seleccionar'}
            </button>
          )}

          {view === 'albums' && (
            <div className="relative">
              <button
                onClick={() => setShowEventMenu(!showEventMenu)}
                className="p-2 rounded-full hover:bg-accent"
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Custom Dropdown Menu */}
              {showEventMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEventMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cambiar Evento
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {eventsList.map((event: any) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventChange(event.id)}
                          className={cn(
                            'w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center justify-between',
                            selectedEventId === event.id && 'bg-accent/50 text-primary font-medium'
                          )}
                        >
                          <span className="truncate">{event.name}</span>
                          {selectedEventId === event.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[120px]">
        {!selectedEventId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="Buscar evento"
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5" />
              </div>
              <span className="text-xs text-muted-foreground">
                {eventsList.length} eventos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {eventsList
                .filter((e: any) =>
                  eventQuery
                    ? e.name.toLowerCase().includes(eventQuery.toLowerCase())
                    : true
                )
                .map((event: any) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventChange(event.id)}
                    className={cn(
                      'group relative aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all active:scale-95 border border-border/60 shadow-sm',
                      'bg-gradient-to-br',
                      getGradient(event.id)
                    )}
                  >
                    {event.cover_url ? (
                      <div className="absolute inset-0">
                        <SafeImage
                          src={event.cover_url}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/90">
                      <ImageIcon className="w-4 h-4" />
                      Evento
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                      <span className="block text-white font-semibold text-sm line-clamp-2">
                        {event.name}
                      </span>
                      <span className="block text-white/80 text-[11px] line-clamp-1">
                        {event.date || 'Sin fecha'}
                      </span>
                    </div>
                  </button>
                ))}

              {eventsList.length === 0 && (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
                  No hay eventos disponibles.
                </div>
              )}
            </div>
          </div>
        ) : view === 'albums' ? (
          /* Albums Grid - clearer hierarchy */
          <div className="space-y-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 -mx-4 px-4">
              {eventsList.map((event: any) => (
                <button
                  key={event.id}
                  onClick={() => handleEventChange(event.id)}
                  className={cn(
                    'px-3 py-2 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                    selectedEventId === event.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white/80 dark:bg-zinc-900 border-border text-foreground hover:border-primary/50'
                  )}
                >
                  {event.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 relative">
                <input
                  value={folderQuery}
                  onChange={(e) => setFolderQuery(e.target.value)}
                  placeholder="Buscar carpeta o ruta"
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5" />
              </div>
              <span className="text-xs text-muted-foreground">{filteredFolders.length} álbumes</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isLoadingFolders &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[4/5] rounded-2xl border border-border/40 bg-muted animate-pulse"
                  />
                ))}

              {filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={cn(
                    'group relative aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all active:scale-95 border border-border/60 shadow-sm',
                    folderCovers[folder.id] ? 'bg-black' : 'bg-gradient-to-br ' + getGradient(folder.id)
                  )}
                >
                  {folderCovers[folder.id] ? (
                    <>
                      <SafeImage
                        src={folderCovers[folder.id]}
                        alt={folder.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/90">
                    <Folder className="w-4 h-4" />
                    Álbum
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <span className="block text-white font-semibold text-sm line-clamp-2">
                      {folder.name}
                    </span>
                    <span className="block text-white/80 text-[11px] line-clamp-1">{folder.path}</span>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-white/80">
                      <span>{folder.photo_count} fotos</span>
                      {folder.child_folder_count !== undefined && <span>{folder.child_folder_count} sub</span>}
                    </div>
                  </div>
                </button>
              ))}

              {!isLoadingFolders && filteredFolders.length === 0 && (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
                  No encontramos carpetas para ese filtro.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Photos Grid - native inspired */
          <div className="space-y-4">
            {breadcrumb.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <button
                  className="px-2 py-1 rounded-lg border border-transparent hover:border-border transition"
                  onClick={() => {
                    setView('albums');
                    setSelectedFolderId(null);
                  }}
                >
                  Eventos
                </button>
                <span>/</span>
                {breadcrumb.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <button
                      className={cn(
                        'px-2 py-1 rounded-lg border border-transparent hover:border-border transition',
                        idx === breadcrumb.length - 1 && 'font-semibold text-foreground'
                      )}
                      onClick={() => {
                        setSelectedFolderId(node.id);
                      }}
                    >
                      {node.name}
                    </button>
                    {idx < breadcrumb.length - 1 && <span>/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs uppercase text-muted-foreground font-semibold">Álbum</p>
                <p className="text-lg font-semibold leading-tight flex items-center gap-2">
                  {selectedFolder?.name || 'Fotos'}
                  {selectedFolder && folderCovers[selectedFolder.id] && (
                    <span className="inline-block h-6 w-6 rounded-md overflow-hidden border border-border/70">
                      <SafeImage
                        src={folderCovers[selectedFolder.id]}
                        alt={selectedFolder?.name || 'cover'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFolder?.path || 'Sin ruta'} · {assets.length} fotos
                </p>
              </div>
              <button
                onClick={() => setView('albums')}
                className="text-xs font-medium text-primary px-3 py-1 rounded-full border border-primary/30 hover:bg-primary/10"
              >
                Cambiar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar en este álbum"
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5" />
              </div>
              <button
                onClick={handleRefreshAssets}
                className="p-2 rounded-xl border border-border hover:bg-muted"
                title="Actualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {selectedFolder?.children && selectedFolder.children.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground px-1">Subcarpetas</div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedFolder.children.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder.id)}
                      className={cn(
                        'group relative aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all active:scale-95 border border-border/60 shadow-sm',
                        folderCovers[folder.id] ? 'bg-black' : 'bg-gradient-to-br ' + getGradient(folder.id)
                      )}
                    >
                      {folderCovers[folder.id] ? (
                        <>
                          <SafeImage
                            src={folderCovers[folder.id]}
                            alt={folder.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/90">
                        <Folder className="w-4 h-4" />
                        Carpeta
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                        <span className="block text-white font-semibold text-sm line-clamp-2">
                          {folder.name}
                        </span>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-white/80">
                          <span>{folder.photo_count} fotos</span>
                          {folder.child_folder_count !== undefined && <span>{folder.child_folder_count} sub</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1 -mx-4">
              {isLoadingAssets &&
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse" />
                ))}

              {assets.map((asset) => {
                const isSelected = selectedAssetIds.has(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleAssetSelection(asset.id, isSelectionMode)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        handleAssetSelection(asset.id, true);
                      }
                    }}
                    className={cn(
                      'relative aspect-square bg-secondary/30 overflow-hidden',
                      isSelected && 'opacity-80 ring-2 ring-primary'
                    )}
                  >
                    <SafeImage
                      src={assetPreviewUrl(asset)}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                    />

                    {(isSelectionMode || isSelected) && (
                      <div
                        className={cn(
                          'absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          isSelected ? 'bg-primary border-primary' : 'bg-black/20 border-white/50 backdrop-blur-sm'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {assets.length === 0 && !isLoadingAssets && (
              <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
                No hay fotos en este álbum todavía.
              </div>
            )}

            {hasNextPage && (
              <button
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="w-full rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Action Bar - Only visible when items selected */}
      {selectedAssetIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-black/90 backdrop-blur-lg border-t border-border z-50 flex items-center justify-between safe-area-bottom">
          <span className="text-sm font-medium">
            {selectedAssetIds.size} seleccionada{selectedAssetIds.size !== 1 ? 's' : ''}
          </span>

          <div className="flex items-center gap-4">
            <button onClick={() => { }} className="p-2 rounded-full hover:bg-secondary text-foreground">
              <Move className="w-5 h-5" />
            </button>
            <button onClick={() => { }} className="p-2 rounded-full hover:bg-red-50 text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* FAB - Upload (only in folder view, not selection mode) */}
      {view === 'photos' && !isSelectionMode && enableUpload && (
        <label className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-transform z-40">
          <Upload className="w-6 h-6" />
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) handleUpload(files);
              e.target.value = '';
            }}
          />
          {isUploading && (
            <span className="sr-only">Subiendo...</span>
          )}
        </label>
      )}

    </div>
  );
}
