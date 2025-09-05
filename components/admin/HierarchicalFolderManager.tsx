'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropFolderManager } from './DragDropFolderManager';
import {
  FolderOpen,
  Folder,
  Image,
  Eye,
  EyeOff,
  Share2,
  QrCode,
  MoreHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  Users,
  Clock,
  ExternalLink,
  Copy,
  RotateCcw,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  photo_count: number;
  is_published: boolean;
  share_token: string | null;
  unified_share_token?: string | null;
  store_url?: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  event_id: string | null;
  event_name: string | null;
  parent_id: string | null;
  depth: number;
}

interface HierarchicalFolderManagerProps {
  folders: FolderItem[];
  selectedFolders: string[];
  onSelectionChange: (selected: string[]) => void;
  onPublish: (folderId: string) => void;
  onUnpublish: (folderId: string) => void;
  onRotateToken: (folderId: string) => void;
  onBulkPublish: (folderIds: string[]) => Promise<any>;
  onBulkUnpublish: (folderIds: string[]) => Promise<any>;
  onMoveFolder?: (
    folderId: string,
    targetParentId: string | null
  ) => Promise<any>;
  loading?: boolean;
}

type SortOption = 'name' | 'photos' | 'status' | 'date';
type ViewMode = 'tree' | 'list' | 'grid';

export function HierarchicalFolderManager({
  folders,
  selectedFolders,
  onSelectionChange,
  onPublish,
  onUnpublish,
  onRotateToken,
  onBulkPublish,
  onBulkUnpublish,
  onMoveFolder,
  loading = false,
}: HierarchicalFolderManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'published' | 'unpublished'
  >('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Actions panel for a single selected folder (explicit options)
  function SelectedFolderActions() {
    if (selectedFolders.length !== 1) return null;
    const folder = folders.find((f) => f.id === selectedFolders[0]);
    if (!folder) return null;

    const shareUrl =
      folder.family_url ||
      (folder.share_token ? `${window.location.origin}/s/${folder.share_token}` : '');
    const qrUrl =
      folder.qr_url || (folder.share_token ? `/api/qr?token=${folder.share_token}` : '');

    const handleShare = async () => {
      if (!shareUrl) return;
      try {
        if (navigator.share) {
          await navigator.share({
            title: folder.name,
            text: 'Mirá mi galería',
            url: shareUrl,
          });
        } else {
          await copyToClipboard(shareUrl);
        }
      } catch {}
    };

    return (
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Publicar / Despublicar */}
          {/* Reducir duplicación: ocultamos publicar/despublicar aquí y dejamos acciones de enlace */}

          {/* Ver fecha de publicación */}
          {folder.published_at && (
            <Badge variant="outline" className="ml-1">
              <Clock className="mr-1 h-3 w-3" />
              {new Date(folder.published_at).toLocaleDateString()}
            </Badge>
          )}

          {/* Copiar enlace */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => shareUrl && copyToClipboard(shareUrl)}
            disabled={!shareUrl}
            title={shareUrl ? 'Copiar enlace' : 'Publicá para generar enlace'}
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar
          </Button>

          {/* Compartir nativo */}
          <Button size="sm" variant="ghost" onClick={handleShare} disabled={!shareUrl}>
            <Share2 className="mr-2 h-4 w-4" /> Compartir
          </Button>

          {/* QR */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (qrUrl ? window.open(qrUrl, '_blank') : undefined)}
            disabled={!qrUrl}
            title={qrUrl ? 'Ver QR' : 'Publicá para generar QR'}
          >
            <QrCode className="mr-2 h-4 w-4" /> QR
          </Button>

          {/* Tienda (Store Unified) */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              (folder.store_url || folder.unified_share_token || folder.share_token) &&
              window.open(
                folder.store_url ||
                  (folder.unified_share_token
                    ? `/store-unified/${folder.unified_share_token}`
                    : `/store-unified/${folder.share_token}`),
                '_blank'
              )
            }
            disabled={!(folder.store_url || folder.unified_share_token || folder.share_token)}
            title={
              folder.store_url || folder.unified_share_token || folder.share_token
                ? 'Abrir tienda'
                : 'Publicá para habilitar tienda'
            }
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Tienda
          </Button>

          {/* Abrir galería */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => shareUrl && window.open(shareUrl, '_blank')}
            disabled={!shareUrl}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Abrir
          </Button>
        </div>
      </Card>
    );
  }

  // Build hierarchical structure
  const hierarchicalFolders = useMemo(() => {
    // First, create a map of all folders by their ID
    const folderMap = new Map(
      folders.map((folder) => [
        folder.id,
        { ...folder, children: [] as FolderItem[] },
      ])
    );

    // Then build the hierarchy
    const rootFolders: (FolderItem & { children: FolderItem[] })[] = [];

    folders.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id)!;

      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        // Add to parent's children
        folderMap.get(folder.parent_id)!.children.push(folderWithChildren);
      } else {
        // Root level folder
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  }, [folders]);

  // Filter and sort folders
  const processedFolders = useMemo(() => {
    let result = hierarchicalFolders;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const filterRecursive = (items: any[]): any[] => {
        return items
          .filter((item) => {
            const matchesSearch =
              item.name.toLowerCase().includes(search) ||
              item.event_name?.toLowerCase().includes(search);
            const hasMatchingChildren =
              item.children &&
              item.children.length > 0 &&
              filterRecursive(item.children).length > 0;

            if (matchesSearch || hasMatchingChildren) {
              return {
                ...item,
                children: item.children ? filterRecursive(item.children) : [],
              };
            }
            return false;
          })
          .filter(Boolean);
      };
      result = filterRecursive(result);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const filterByStatus = (items: any[]): any[] => {
        return items
          .map((item) => ({
            ...item,
            children: item.children ? filterByStatus(item.children) : [],
          }))
          .filter((item) => {
            const matchesStatus =
              statusFilter === 'published'
                ? item.is_published
                : !item.is_published;
            const hasMatchingChildren =
              item.children && item.children.length > 0;
            return matchesStatus || hasMatchingChildren;
          });
      };
      result = filterByStatus(result);
    }

    // Apply sorting
    const sortRecursive = (items: any[]): any[] => {
      return items
        .map((item) => ({
          ...item,
          children: item.children ? sortRecursive(item.children) : [],
        }))
        .sort((a, b) => {
          switch (sortBy) {
            case 'photos':
              return b.photo_count - a.photo_count;
            case 'status':
              if (a.is_published !== b.is_published) {
                return a.is_published ? -1 : 1;
              }
              return a.name.localeCompare(b.name);
            case 'date':
              if (!a.published_at && !b.published_at)
                return a.name.localeCompare(b.name);
              if (!a.published_at) return 1;
              if (!b.published_at) return -1;
              return (
                new Date(b.published_at).getTime() -
                new Date(a.published_at).getTime()
              );
            case 'name':
            default:
              return a.name.localeCompare(b.name);
          }
        });
    };

    return sortRecursive(result);
  }, [hierarchicalFolders, searchTerm, statusFilter, sortBy]);

  // Toggle folder expansion
  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Expand all folders
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (items: any[]) => {
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          allIds.add(item.id);
          collectIds(item.children);
        }
      });
    };
    collectIds(hierarchicalFolders);
    setExpandedFolders(allIds);
  }, [hierarchicalFolders]);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  // Select all visible folders
  const selectAll = useCallback(() => {
    const allIds: string[] = [];
    const collectIds = (items: any[]) => {
      items.forEach((item) => {
        allIds.push(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(processedFolders);
    onSelectionChange(allIds);
  }, [processedFolders, onSelectionChange]);

  // Render a single folder item
  const renderFolderItem = useCallback(
    (folder: any, depth: number = 0) => {
      const isSelected = selectedFolders.includes(folder.id);
      const hasChildren = folder.children && folder.children.length > 0;
      const isExpanded = expandedFolders.has(folder.id);

      const handleToggleSelection = () => {
        if (isSelected) {
          onSelectionChange(selectedFolders.filter((id) => id !== folder.id));
        } else {
          onSelectionChange([...selectedFolders, folder.id]);
        }
      };

      return (
        <div key={folder.id} className="relative">
          {/* Main folder row */}
          <div
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              isSelected
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            } `}
            style={{ marginLeft: depth * 20 }}
          >
            {/* Expansion toggle */}
            <div className="flex w-6 items-center">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpanded(folder.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
            </div>

            {/* Selection checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggleSelection}
              className="h-4 w-4"
            />

            {/* Folder icon and info */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex-shrink-0">
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Folder className="h-5 w-5 text-blue-600" />
                  )
                ) : (
                  <Folder className="h-5 w-5 text-gray-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-gray-900">
                    {folder.name}
                  </h3>
                  {folder.photo_count > 0 && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Image className="h-3 w-3" />
                      {folder.photo_count}
                    </Badge>
                  )}
                </div>
                {folder.event_name && (
                  <p className="truncate text-sm text-gray-500">
                    {folder.event_name}
                  </p>
                )}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2">
                {folder.is_published ? (
                  <Badge className="border-green-200 bg-green-100 text-green-800">
                    <Eye className="mr-1 h-3 w-3" />
                    Publicado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600">
                    <EyeOff className="mr-1 h-3 w-3" />
                    Privado
                  </Badge>
                )}

                {folder.published_at && (
                  <Badge variant="outline" className="text-blue-600">
                    <Clock className="mr-1 h-3 w-3" />
                    {new Date(folder.published_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {folder.is_published ? (
                  <>
                    {folder.family_url && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(folder.family_url)}
                          className="h-8 w-8 p-0"
                          title="Copiar enlace familiar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(folder.family_url, '_blank')
                          }
                          className="h-8 w-8 p-0"
                          title="Abrir galería"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(folder.qr_url || '')}
                          className="h-8 w-8 p-0"
                          title="Copiar QR"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>

                        {(folder.store_url || folder.unified_share_token || folder.share_token) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(
                                folder.store_url ||
                                  (folder.unified_share_token
                                    ? `/store-unified/${folder.unified_share_token}`
                                    : `/store-unified/${folder.share_token}`),
                                '_blank'
                              )
                            }
                            className="h-8 w-8 p-0"
                            title="Abrir tienda"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRotateToken(folder.id)}
                      className="h-8 w-8 p-0 text-orange-600"
                      title="Rotar token"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnpublish(folder.id)}
                      className="h-8 w-8 p-0 text-red-600"
                      title="Despublicar"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPublish(folder.id)}
                    className="h-8 w-8 p-0 text-green-600"
                    title={
                      folder.photo_count === 0
                        ? 'No se puede publicar una carpeta vacía'
                        : 'Publicar'
                    }
                    disabled={folder.photo_count === 0}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="mt-2">
              {folder.children.map((child: any) =>
                renderFolderItem(child, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    },
    [
      selectedFolders,
      expandedFolders,
      onSelectionChange,
      onPublish,
      onUnpublish,
      onRotateToken,
      toggleExpanded,
      copyToClipboard,
    ]
  );

  // Statistics
  const stats = useMemo(() => {
    const total = folders.length;
    const published = folders.filter((f) => f.is_published).length;
    const totalPhotos = folders.reduce((sum, f) => sum + f.photo_count, 0);
    const selectedCount = selectedFolders.length;

    return {
      total,
      published,
      unpublished: total - published,
      totalPhotos,
      selectedCount,
    };
  }, [folders, selectedFolders]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Cargando carpetas...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and controls */}
      <div className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">Total carpetas</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.published}
              </div>
              <div className="text-sm text-gray-600">Publicadas</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.unpublished}
              </div>
              <div className="text-sm text-gray-600">Privadas</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalPhotos}
              </div>
              <div className="text-sm text-gray-600">Fotos totales</div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Buscar carpetas o eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Todas</option>
              <option value="published">Publicadas</option>
              <option value="unpublished">Privadas</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="name">Por nombre</option>
              <option value="photos">Por fotos</option>
              <option value="status">Por estado</option>
              <option value="date">Por fecha</option>
            </select>
          </div>
        </div>

        {/* Acciones para carpeta seleccionada */}
        <SelectedFolderActions />

        {/* Tree controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expandir todo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Colapsar todo
            </Button>
            <Button variant="outline" size="sm" onClick={selectAll}>
              Seleccionar visible
            </Button>
          </div>

          {stats.selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600">
                {stats.selectedCount} seleccionadas
              </Badge>
              <Button
                size="sm"
                onClick={() => onBulkPublish(selectedFolders)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Eye className="mr-1 h-4 w-4" />
                Publicar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkUnpublish(selectedFolders)}
              >
                <EyeOff className="mr-1 h-4 w-4" />
                Despublicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectionChange([])}
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Folder tree */}
      <Card className="p-4">
        {processedFolders.length === 0 ? (
          <div className="py-8 text-center">
            <Folder className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron carpetas que coincidan con los filtros'
                : 'No hay carpetas disponibles'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {processedFolders.map((folder) => renderFolderItem(folder, 0))}
          </div>
        )}
      </Card>

      {/* Drag and Drop Operations */}
      {selectedFolders.length > 0 && (
        <DragDropFolderManager
          folders={folders}
          selectedFolders={selectedFolders}
          onSelectionChange={onSelectionChange}
          onBulkPublish={onBulkPublish}
          onBulkUnpublish={onBulkUnpublish}
          onMoveFolder={onMoveFolder}
          className="mt-6"
        />
      )}
    </div>
  );
}
