'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Folder, 
  FolderPlus, 
  Upload, 
  Share, 
  MoreVertical,
  ChevronRight,
  Home,
  RefreshCw,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  status: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  path: string;
}

interface LibraryHeaderProps {
  event: Event;
  currentFolderId: string | null;
  selectedItemsCount: number;
  onNavigateBack: () => void;
  onFolderNavigate: (folderId: string | null) => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
  onShare?: () => void;
  onRefresh?: () => void;
  onAssignPhotos?: () => void;
}

export function LibraryHeader({
  event,
  currentFolderId,
  selectedItemsCount,
  onNavigateBack,
  onFolderNavigate,
  onCreateFolder,
  onUpload,
  onShare,
  onRefresh,
  onAssignPhotos,
}: LibraryHeaderProps) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load breadcrumb when currentFolderId changes
  useEffect(() => {
    const loadBreadcrumb = async () => {
      if (!currentFolderId) {
        setBreadcrumb([{ id: null, name: 'Fotos', path: 'Fotos' }]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/admin/folders/${currentFolderId}`);
        const data = await response.json();

        if (response.ok && data.success && data.folder) {
          // Parse the path to create breadcrumb items
          const pathParts = data.folder.path.split(' / ');
          const breadcrumbItems: BreadcrumbItem[] = [
            { id: null, name: 'Fotos', path: 'Fotos' }
          ];

          // For now, we'll use a simplified breadcrumb
          // TODO: Implement proper breadcrumb with parent folder IDs
          if (pathParts.length > 1) {
            pathParts.slice(1).forEach((part, index) => {
              breadcrumbItems.push({
                id: index === pathParts.length - 2 ? currentFolderId : null,
                name: part,
                path: pathParts.slice(0, index + 2).join(' / ')
              });
            });
          }

          setBreadcrumb(breadcrumbItems);
        }
      } catch (error) {
        console.error('Error loading breadcrumb:', error);
        setBreadcrumb([
          { id: null, name: 'Fotos', path: 'Fotos' },
          { id: currentFolderId, name: 'Carpeta actual', path: 'Fotos / Carpeta actual' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadBreadcrumb();
  }, [currentFolderId]);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Back button and breadcrumb */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder className="h-5 w-5 text-gray-500 flex-shrink-0" />
            
            <div className="text-lg font-semibold text-gray-900 truncate">
              {event.school} - {event.name}
            </div>
            
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 min-w-0 flex-1">
              {loading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                breadcrumb.map((item, index) => (
                  <div key={item.id || 'root'} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    )}
                    
                    <button
                      onClick={() => onFolderNavigate(item.id)}
                      className={`text-sm hover:text-blue-600 transition-colors truncate ${
                        index === breadcrumb.length - 1
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-600 hover:underline'
                      }`}
                      title={item.path}
                    >
                      {index === 0 ? (
                        <div className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          <span>{item.name}</span>
                        </div>
                      ) : (
                        item.name
                      )}
                    </button>
                  </div>
                ))
              )}
            </nav>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Selection info */}
          {selectedItemsCount > 0 && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedItemsCount} seleccionado{selectedItemsCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Primary actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            className="flex-shrink-0"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nueva carpeta
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            className="flex-shrink-0"
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir fotos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAssignPhotos}
            className="flex-shrink-0 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <Users className="h-4 w-4 mr-2" />
            Asignar a estudiantes
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onShare}>
                <Share className="h-4 w-4 mr-2" />
                Compartir carpeta
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onAssignPhotos}>
                <Users className="h-4 w-4 mr-2" />
                Asignar fotos a estudiantes
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onFolderNavigate(null)}
                className="text-gray-600"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir a carpeta raíz
              </DropdownMenuItem>
              
              {selectedItemsCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="text-red-600">
                    Eliminar seleccionados
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Secondary info bar */}
      <div className="mt-2 text-xs text-gray-500">
        Biblioteca de fotos • {new Date(event.date).toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
  );
}