'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  Search,
  Filter,
  Menu,
  Users,
  BookOpen,
  Camera,
  GraduationCap,
  MoreVertical,
  ArrowLeft,
  Grid3X3,
  List,
  RefreshCw,
  Plus,
  Upload,
  Download,
  Settings,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

interface MobileNavItem {
  id: string;
  name: string;
  type: 'level' | 'course' | 'student';
  parent_id?: string;
  student_count?: number;
  photo_count?: number;
  active: boolean;
  metadata?: any;
}

interface MobileOptimizedNavigationProps {
  eventId: string;
  eventName: string;
  items: MobileNavItem[];
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  onItemAction?: (action: string, item: MobileNavItem) => void;
  loading?: boolean;
  enableActions?: boolean;
}

export default function MobileOptimizedNavigation({
  eventId,
  eventName,
  items,
  currentPath,
  onNavigate,
  onItemAction,
  loading = false,
  enableActions = true,
}: MobileOptimizedNavigationProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Build hierarchical structure
  const hierarchy = useMemo(() => {
    const itemMap = new Map<string, MobileNavItem>();
    const childrenMap = new Map<string, MobileNavItem[]>();

    // First pass: create maps
    items.forEach((item) => {
      itemMap.set(item.id, item);
      if (!childrenMap.has(item.parent_id || 'root')) {
        childrenMap.set(item.parent_id || 'root', []);
      }
      childrenMap.get(item.parent_id || 'root')?.push(item);
    });

    // Sort children by name
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { itemMap, childrenMap };
  }, [items]);

  // Get current level items
  const currentLevelItems = useMemo(() => {
    const parentId =
      currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'root';
    const children = hierarchy.childrenMap.get(parentId) || [];

    // Apply filters
    let filtered = children;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = children.filter((item) =>
        item.name.toLowerCase().includes(term)
      );
    }

    if (filterType) {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    return filtered;
  }, [hierarchy, currentPath, searchTerm, filterType]);

  // Breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ name: eventName, path: [] }];

    currentPath.forEach((itemId, index) => {
      const item = hierarchy.itemMap.get(itemId);
      if (item) {
        crumbs.push({
          name: item.name,
          path: currentPath.slice(0, index + 1),
        });
      }
    });

    return crumbs;
  }, [eventName, currentPath, hierarchy]);

  // Handle navigation
  const handleNavigate = useCallback(
    (itemId: string) => {
      const item = hierarchy.itemMap.get(itemId);
      if (!item) return;

      if (item.type === 'student') {
        // Navigate to student detail
        onItemAction?.('view', item);
      } else {
        // Navigate deeper into hierarchy
        onNavigate([...currentPath, itemId]);
      }
    },
    [currentPath, onNavigate, onItemAction, hierarchy]
  );

  const handleGoBack = useCallback(() => {
    if (currentPath.length > 0) {
      onNavigate(currentPath.slice(0, -1));
    }
  }, [currentPath, onNavigate]);

  // Quick stats for current level
  const levelStats = useMemo(() => {
    const totalItems = currentLevelItems.length;
    const totalStudents = currentLevelItems.reduce(
      (sum, item) =>
        sum + (item.student_count || (item.type === 'student' ? 1 : 0)),
      0
    );
    const totalPhotos = currentLevelItems.reduce(
      (sum, item) => sum + (item.photo_count || 0),
      0
    );

    return {
      totalItems,
      totalStudents,
      totalPhotos,
    };
  }, [currentLevelItems]);

  // Item Card Component (Mobile Optimized)
  const ItemCard = ({ item }: { item: MobileNavItem }) => {
    const isInteractive = item.type !== 'student';

    return (
      <Card
        className={` ${isInteractive ? 'cursor-pointer hover:shadow-md' : ''} relative transition-all duration-200`}
        onClick={() => isInteractive && handleNavigate(item.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Icon based on type */}
              <div className="shrink-0">
                {item.type === 'level' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/30">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                {item.type === 'course' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                {item.type === 'student' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium">{item.name}</h4>

                {/* Stats */}
                <div className="mt-1 flex items-center gap-3">
                  {item.student_count !== undefined &&
                    item.student_count > 0 && (
                      <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        <span>{item.student_count}</span>
                      </div>
                    )}
                  {item.photo_count !== undefined && item.photo_count > 0 && (
                    <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                      <Camera className="h-3 w-3" />
                      <span>{item.photo_count}</span>
                    </div>
                  )}
                  {!item.active && (
                    <Badge variant="secondary" className="text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isInteractive && (
                <ChevronRight className="text-gray-500 dark:text-gray-400 h-4 w-4" />
              )}

              {enableActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onItemAction?.('view', item)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onItemAction?.('edit', item)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    {item.type === 'course' && (
                      <DropdownMenuItem
                        onClick={() => onItemAction?.('manage-students', item)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Gestionar Estudiantes
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onItemAction?.('export', item)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onItemAction?.('delete', item)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // List Item Component (Compact)
  const ListItem = ({ item }: { item: MobileNavItem }) => {
    const isInteractive = item.type !== 'student';

    return (
      <div
        className={`flex items-center justify-between border-b p-3 last:border-b-0 ${isInteractive ? 'hover:bg-muted/50 cursor-pointer' : ''} transition-colors`}
        onClick={() => isInteractive && handleNavigate(item.id)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Icon */}
          <div className="shrink-0">
            {item.type === 'level' && (
              <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
            {item.type === 'course' && (
              <BookOpen className="h-4 w-4 text-purple-600" />
            )}
            {item.type === 'student' && (
              <Users className="h-4 w-4 text-green-600" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <span className="block truncate font-medium">{item.name}</span>
            {(item.student_count || item.photo_count) && (
              <div className="mt-1 flex items-center gap-2">
                {item.student_count !== undefined && item.student_count > 0 && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    {item.student_count} estudiantes
                  </span>
                )}
                {item.photo_count !== undefined && item.photo_count > 0 && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    {item.photo_count} fotos
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!item.active && (
            <Badge variant="secondary" className="text-xs">
              Inactivo
            </Badge>
          )}
          {isInteractive && (
            <ChevronRight className="text-gray-500 dark:text-gray-400 h-4 w-4" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentPath.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="truncate text-lg font-semibold">
              {breadcrumbs[breadcrumbs.length - 1]?.name}
            </h2>
            {breadcrumbs.length > 1 && (
              <p className="text-gray-500 dark:text-gray-400 truncate text-sm">
                {breadcrumbs
                  .slice(0, -1)
                  .map((b) => b.name)
                  .join(' / ')}
              </p>
            )}
          </div>
        </div>

        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Opciones</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Button className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Nuevo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                Importar Datos
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards (Mobile Optimized) */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{levelStats.totalItems}</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs">
              {currentPath.length === 0
                ? 'Niveles'
                : currentPath.length === 1
                  ? 'Cursos'
                  : 'Estudiantes'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {levelStats.totalStudents}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-xs">Estudiantes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-primary-600">
              {levelStats.totalPhotos}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-xs">Fotos</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters (Mobile Optimized) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                {filterType
                  ? filterType === 'level'
                    ? 'Niveles'
                    : filterType === 'course'
                      ? 'Cursos'
                      : 'Estudiantes'
                  : 'Todos'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuItem onClick={() => setFilterType(null)}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('level')}>
                Niveles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('course')}>
                Cursos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('student')}>
                Estudiantes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
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

          <Button variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {currentLevelItems.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="space-y-3">
              {currentLevelItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {currentLevelItems.map((item) => (
                  <ListItem key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm
                  ? 'No se encontraron resultados'
                  : 'No hay elementos disponibles'}
              </div>
              {!searchTerm && enableActions && (
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Nuevo
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More (for large datasets) */}
      {currentLevelItems.length >= 50 && (
        <div className="pt-4 text-center">
          <Button variant="outline" size="sm">
            Cargar Más
          </Button>
        </div>
      )}

      {/* Quick Action FAB (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
