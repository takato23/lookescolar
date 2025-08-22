'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
    items.forEach(item => {
      itemMap.set(item.id, item);
      if (!childrenMap.has(item.parent_id || 'root')) {
        childrenMap.set(item.parent_id || 'root', []);
      }
      childrenMap.get(item.parent_id || 'root')?.push(item);
    });

    // Sort children by name
    childrenMap.forEach(children => {
      children.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { itemMap, childrenMap };
  }, [items]);

  // Get current level items
  const currentLevelItems = useMemo(() => {
    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'root';
    const children = hierarchy.childrenMap.get(parentId) || [];
    
    // Apply filters
    let filtered = children;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = children.filter(item =>
        item.name.toLowerCase().includes(term)
      );
    }
    
    if (filterType) {
      filtered = filtered.filter(item => item.type === filterType);
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
  const handleNavigate = useCallback((itemId: string) => {
    const item = hierarchy.itemMap.get(itemId);
    if (!item) return;

    if (item.type === 'student') {
      // Navigate to student detail
      onItemAction?.('view', item);
    } else {
      // Navigate deeper into hierarchy
      onNavigate([...currentPath, itemId]);
    }
  }, [currentPath, onNavigate, onItemAction, hierarchy]);

  const handleGoBack = useCallback(() => {
    if (currentPath.length > 0) {
      onNavigate(currentPath.slice(0, -1));
    }
  }, [currentPath, onNavigate]);

  // Quick stats for current level
  const levelStats = useMemo(() => {
    const totalItems = currentLevelItems.length;
    const totalStudents = currentLevelItems.reduce((sum, item) => 
      sum + (item.student_count || (item.type === 'student' ? 1 : 0)), 0
    );
    const totalPhotos = currentLevelItems.reduce((sum, item) => 
      sum + (item.photo_count || 0), 0
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
        className={`
          ${isInteractive ? 'cursor-pointer hover:shadow-md' : ''}
          transition-all duration-200 relative
        `}
        onClick={() => isInteractive && handleNavigate(item.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon based on type */}
              <div className="shrink-0">
                {item.type === 'level' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                {item.type === 'course' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                {item.type === 'student' && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="min-w-0 flex-1">
                <h4 className="font-medium truncate">{item.name}</h4>
                
                {/* Stats */}
                <div className="flex items-center gap-3 mt-1">
                  {item.student_count !== undefined && item.student_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{item.student_count}</span>
                    </div>
                  )}
                  {item.photo_count !== undefined && item.photo_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
            <div className="flex items-center gap-2 shrink-0">
              {isInteractive && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              {enableActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onItemAction?.('view', item)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onItemAction?.('edit', item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {item.type === 'course' && (
                      <DropdownMenuItem onClick={() => onItemAction?.('manage-students', item)}>
                        <Users className="h-4 w-4 mr-2" />
                        Gestionar Estudiantes
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onItemAction?.('export', item)}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onItemAction?.('delete', item)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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
        className={`
          p-3 border-b last:border-b-0 flex items-center justify-between
          ${isInteractive ? 'cursor-pointer hover:bg-muted/50' : ''}
          transition-colors
        `}
        onClick={() => isInteractive && handleNavigate(item.id)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="shrink-0">
            {item.type === 'level' && <GraduationCap className="h-4 w-4 text-blue-600" />}
            {item.type === 'course' && <BookOpen className="h-4 w-4 text-purple-600" />}
            {item.type === 'student' && <Users className="h-4 w-4 text-green-600" />}
          </div>
          
          {/* Content */}
          <div className="min-w-0 flex-1">
            <span className="font-medium truncate block">{item.name}</span>
            {(item.student_count || item.photo_count) && (
              <div className="flex items-center gap-2 mt-1">
                {item.student_count !== undefined && item.student_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {item.student_count} estudiantes
                  </span>
                )}
                {item.photo_count !== undefined && item.photo_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {item.photo_count} fotos
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!item.active && (
            <Badge variant="secondary" className="text-xs">
              Inactivo
            </Badge>
          )}
          {isInteractive && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
            <h2 className="text-lg font-semibold truncate">
              {breadcrumbs[breadcrumbs.length - 1]?.name}
            </h2>
            {breadcrumbs.length > 1 && (
              <p className="text-sm text-muted-foreground truncate">
                {breadcrumbs.slice(0, -1).map(b => b.name).join(' / ')}
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
            <div className="space-y-4 mt-6">
              <Button className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Nuevo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Importar Datos
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
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
            <div className="text-xs text-muted-foreground">
              {currentPath.length === 0 ? 'Niveles' : 
               currentPath.length === 1 ? 'Cursos' : 'Estudiantes'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{levelStats.totalStudents}</div>
            <div className="text-xs text-muted-foreground">Estudiantes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-orange-600">{levelStats.totalPhotos}</div>
            <div className="text-xs text-muted-foreground">Fotos</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters (Mobile Optimized) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Filter className="h-4 w-4 mr-2" />
                {filterType ? (
                  filterType === 'level' ? 'Niveles' :
                  filterType === 'course' ? 'Cursos' : 'Estudiantes'
                ) : 'Todos'}
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
          
          <div className="flex border rounded-md">
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
              {currentLevelItems.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {currentLevelItems.map(item => (
                  <ListItem key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron resultados' : 'No hay elementos disponibles'}
              </div>
              {!searchTerm && enableActions && (
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Nuevo
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More (for large datasets) */}
      {currentLevelItems.length >= 50 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Cargar Más
          </Button>
        </div>
      )}

      {/* Quick Action FAB (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button size="lg" className="rounded-full w-14 h-14 shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}