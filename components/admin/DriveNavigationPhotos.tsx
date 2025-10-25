'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  Home,
  Folder,
  FolderPlus,
  Search,
  Grid3X3,
  List,
  MoreHorizontal,
  ArrowLeft,
  Upload,
  Download,
  Settings,
  ImageIcon,
  Users,
  GraduationCap,
  Camera,
  CheckCircle,
  BarChart3,
  TrendingUp,
  ArrowUp,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FixedSizeGrid as Grid } from 'react-window';
import { toast } from 'sonner';

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'photo' | 'student';
  parentId?: string;
  photoCount?: number;
  studentCount?: number;
  isActive?: boolean;
  thumbnailUrl?: string;
  metadata?: {
    level?: string;
    course?: string;
    section?: string;
    grade?: string;
    uploadDate?: string;
    fileSize?: number;
  };
}

interface DriveNavigationPhotosProps {
  eventId: string;
  eventName: string;
  initialPath?: string[];
}

export default function DriveNavigationPhotos({
  eventId,
  eventName,
  initialPath = [],
}: DriveNavigationPhotosProps) {
  // State management
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string[]>(initialPath);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Grid configuration for photos
  const PHOTO_CARD_SIZE = 180;
  const FOLDER_CARD_SIZE = 200;

  // Load items for current path
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const pathParam = currentPath.join('/');
      const url = `/api/admin/events/${eventId}/drive-items?path=${encodeURIComponent(pathParam)}`;
      const response = await fetch(url);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Error al cargar elementos');
    } finally {
      setLoading(false);
    }
  }, [eventId, currentPath]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.metadata?.level?.toLowerCase().includes(term) ||
        item.metadata?.course?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Navigation handlers
  const navigateToPath = useCallback((newPath: string[]) => {
    setCurrentPath(newPath);
    const pathParam = newPath.join('/');
    const url = new URL(window.location.href);
    url.searchParams.set('path', pathParam);
    window.history.pushState({}, '', url.toString());
  }, []);

  const handleItemClick = useCallback(
    (item: DriveItem) => {
      if (item.type === 'folder') {
        navigateToPath([...currentPath, item.id]);
      } else if (item.type === 'photo') {
        // Open photo viewer/editor
        router.push(`/admin/photos/${item.id}?event=${eventId}`);
      } else if (item.type === 'student') {
        // Navigate to student photos
        navigateToPath([...currentPath, item.id]);
      }
    },
    [currentPath, eventId, navigateToPath, router]
  );

  const handleBack = useCallback(() => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      navigateToPath(newPath);
    }
  }, [currentPath, navigateToPath]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(`/api/admin/events/${eventId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentPath: currentPath,
        }),
      });

      if (response.ok) {
        toast.success('Carpeta creada exitosamente');
        setNewFolderName('');
        setShowCreateFolder(false);
        loadItems();
      }
    } catch (error) {
      toast.error('Error al crear carpeta');
    }
  }, [newFolderName, eventId, currentPath, loadItems]);

  // Breadcrumb component
  const Breadcrumbs = useMemo(
    () => (
      <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-white p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToPath([])}
          className="shrink-0"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">{eventName}</span>
        </Button>

        {currentPath.map((pathItem, index) => (
          <React.Fragment key={pathItem}>
            <ChevronRight className="text-gray-500 dark:text-gray-400 h-4 w-4 shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToPath(currentPath.slice(0, index + 1))}
              className="shrink-0"
            >
              {/* Get folder name from items or use ID */}
              {items.find((item) => item.id === pathItem)?.name || pathItem}
            </Button>
          </React.Fragment>
        ))}
      </nav>
    ),
    [eventName, currentPath, navigateToPath, items]
  );

  // Item card component
  const ItemCard = useCallback(
    ({ item, isSelected }: { item: DriveItem; isSelected: boolean }) => (
      <Card
        className={cn(
          'h-full cursor-pointer border-2 transition-all hover:shadow-md',
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent',
          item.type === 'folder' && 'border-l-4 border-l-yellow-400'
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.type === 'folder' && (
                <Folder className="h-5 w-5 text-yellow-600" />
              )}
              {item.type === 'photo' && (
                <ImageIcon className="h-5 w-5 text-green-600" />
              )}
              {item.type === 'student' && (
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="truncate text-sm font-medium">{item.name}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>

          {item.thumbnailUrl && (
            <div className="mb-2 h-24 w-full overflow-hidden rounded bg-muted">
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mt-auto space-y-1">
            {item.photoCount && (
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                <Camera className="h-3 w-3" />
                <span>{item.photoCount} fotos</span>
              </div>
            )}

            {item.studentCount && (
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                <span>{item.studentCount} estudiantes</span>
              </div>
            )}

            {item.metadata?.uploadDate && (
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                {new Date(item.metadata.uploadDate).toLocaleDateString('es-AR')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    ),
    [handleItemClick]
  );

  return (
    <div className="space-y-4">
      {/* Header with breadcrumbs and actions */}
      <div className="space-y-3">
        {Breadcrumbs}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {currentPath.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus className="mr-1 h-4 w-4" />
              Nueva Carpeta
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9"
              />
            </div>

            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>

            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create folder modal */}
      {showCreateFolder && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nombre de la carpeta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="flex-1"
            />
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Crear
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(false)}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Content grid */}
      <div className="min-h-96">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 flex h-48 flex-col items-center justify-center">
            <Folder className="mb-4 h-12 w-12" />
            <p>No hay elementos en esta carpeta</p>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                : 'grid-cols-1'
            )}
          >
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
