'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Copy,
  Trash2,
  Edit3,
  Move,
  ClipboardPaste,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Users,
  FileUser,
  RefreshCw,
  Star,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import type { OptimizedFolder } from '../services/photo-admin-api.service';

interface FolderTreePanelProps {
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
}

const FolderTreePanel: React.FC<FolderTreePanelProps> = ({
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

  // Estado para carpetas favoritas
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
              <span className="text-lg">✕</span>
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
              onFolderAction={onFolderAction}
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

export default FolderTreePanel;

