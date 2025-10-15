/**
 * 🌳 Folder Tree Jerárquico MEJORADO
 * 
 * Componente que replica la funcionalidad completa del folder tree de EventPhotoManager
 * pero adaptado para PhotoAdmin con capacidades cross-eventos.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, FolderOpen, Folder, 
  School, Users, Hash, MoreVertical, Plus, Edit3,
  Trash2, Move, Share2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedFolder {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  event_id?: string;
  level_type?: 'event' | 'nivel' | 'salon' | 'familia';
  has_children: boolean;
  event_name?: string; // Para mostrar contexto cross-eventos
}

interface FolderTreeNode extends EnhancedFolder {
  children: FolderTreeNode[];
  isExpanded: boolean;
}

interface HierarchicalFolderTreeEnhancedProps {
  folders: EnhancedFolder[];
  selectedFolderId: string | null;
  expandedFolders: string[];
  showEventContext?: boolean; // Para mostrar eventos cuando es cross-eventos
  onFolderSelect: (folderId: string | null) => void;
  onFolderToggle: (folderId: string) => void;
  onFolderAction: (action: 'delete' | 'rename' | 'move' | 'share' | 'create_child', folder: EnhancedFolder) => void;
  onDropPhotos?: (folderId: string, assetIds: string[]) => void;
}

export function HierarchicalFolderTreeEnhanced({
  folders,
  selectedFolderId,
  expandedFolders,
  showEventContext = false,
  onFolderSelect,
  onFolderToggle,
  onFolderAction
}: HierarchicalFolderTreeEnhancedProps) {

  // Construir árbol jerárquico
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Crear nodos
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        isExpanded: expandedFolders.includes(folder.id)
      });
    });

    // Construir jerarquía
    folders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id)!.children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    // Ordenar por depth y nombre
    const sortNodes = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };
    
    sortNodes(rootFolders);
    return rootFolders;
  }, [folders, expandedFolders]);

  // Iconos por tipo de carpeta
  const getFolderIcon = (folder: FolderTreeNode, isSelected: boolean) => {
    switch (folder.level_type) {
      case 'event':
        return (
          <School
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'
            )}
          />
        );
      case 'nivel':
        return (
          <FolderOpen
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-purple-600'
            )}
          />
        );
      case 'salon':
        return (
          <Users
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-green-600'
            )}
          />
        );
      case 'familia':
        return (
          <Hash
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-primary-600'
            )}
          />
        );
      default:
        return folder.isExpanded ? (
          <FolderOpen
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            )}
          />
        ) : (
          <Folder
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            )}
          />
        );
    }
  };

  // Componente de nodo individual
  const FolderNode = ({ 
    folder, 
    level = 0 
  }: { 
    folder: FolderTreeNode; 
    level?: number; 
  }) => {
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0 || folder.has_children;
    const [isDragOver, setIsDragOver] = useState(false);
    
    return (
      <div className="select-none">
        {/* Nodo principal */}
        <div
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-all',
            isSelected
              ? 'border border-blue-600 bg-blue-600 text-white shadow-sm dark:bg-blue-500'
              : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/80',
            isDragOver &&
              'border-2 border-dashed border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onDragOver={(e) => {
            // Permitir soltar cuando hay datos de fotos
            if (Array.from(e.dataTransfer.types).includes('application/x-asset-ids')) {
              e.preventDefault();
              setIsDragOver(true);
            }
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            const types = Array.from(e.dataTransfer.types);
            if (!types.includes('application/x-asset-ids')) return;
            e.preventDefault();
            e.stopPropagation();
            try {
              const raw = e.dataTransfer.getData('application/x-asset-ids');
              const ids: string[] = JSON.parse(raw);
              if (Array.isArray(ids) && ids.length > 0) {
                onDropPhotos?.(folder.id, ids);
              }
            } catch {}
            setIsDragOver(false);
          }}
        >
          {/* Botón de expansión */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 w-6 min-h-0 p-0 transition-colors',
                isSelected ? 'text-white hover:bg-blue-500/60' : 'text-gray-500 hover:bg-muted'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onFolderToggle(folder.id);
              }}
            >
              {folder.isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </Button>
          ) : (
            <div className="w-5" />
          )}

          {/* Contenido del nodo */}
          <div 
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => onFolderSelect(folder.id)}
          >
            {getFolderIcon(folder, isSelected)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'truncate text-sm font-semibold transition-colors',
                isSelected
                      ? 'text-white'
                      : 'text-slate-800 dark:text-slate-100'
                  )}
                >
                  {folder.name}
                </span>
                
                {/* Badge de cantidad de fotos */}
                {folder.photo_count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-semibold border border-transparent',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'
                    )}
                  >
                    {folder.photo_count}
                  </Badge>
                )}
              </div>
              
              {/* Contexto del evento si es cross-eventos */}
              {showEventContext && folder.event_name && (
                <p
                  className={cn(
                    'truncate text-xs',
                    isSelected ? 'text-white/90' : 'text-gray-500'
                  )}
                >
                  {folder.event_name}
                </p>
              )}
            </div>
          </div>

          {/* Menú de acciones (visible en hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <FolderActionsMenu 
              folder={folder} 
              onAction={onFolderAction}
              isActive={isSelected}
            />
          </div>
        </div>

        {/* Nodos hijos */}
        {folder.isExpanded && folder.children.length > 0 && (
          <div>
            {folder.children.map(child => (
              <FolderNode 
                key={child.id} 
                folder={child} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Menú de acciones para cada carpeta
  const FolderActionsMenu = ({
    folder,
    onAction,
    isActive = false,
  }: {
    folder: FolderTreeNode;
    onAction: (action: string, folder: EnhancedFolder) => void;
    isActive?: boolean;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 min-h-0 p-0 transition-colors rounded-md',
            isActive ? 'text-white hover:bg-white/20 hover:text-white' : 'text-gray-500 hover:bg-muted hover:text-foreground'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            onFolderSelect(folder.id);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver carpeta
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction('share', folder)}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Compartir
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction('create_child', folder)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear subcarpeta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAction('rename', folder)}
          className="text-blue-600 dark:text-blue-400"
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Renombrar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction('move', folder)}
          className="text-purple-600"
        >
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
  );

  // Botón para crear carpeta raíz
  const CreateRootFolderButton = () => (
    <div className="p-2 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:border-blue-300"
        onClick={() => onFolderAction('create_child', { 
          id: 'root', 
          name: 'Raíz',
          parent_id: null,
          depth: 0,
          photo_count: 0,
          has_children: false
        } as EnhancedFolder)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Crear Carpeta
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Estructura de Carpetas
        </h3>
        {showEventContext && (
          <p className="text-xs text-gray-500 mt-1">
            Mostrando todos los eventos
          </p>
        )}
      </div>

      {/* Árbol de carpetas */}
      <div className="flex-1 overflow-y-auto p-2">
        {folderTree.length > 0 ? (
          <div className="space-y-1">
            {folderTree.map(folder => (
              <FolderNode key={folder.id} folder={folder} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Folder className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay carpetas</p>
          </div>
        )}
      </div>

      {/* Botón crear carpeta */}
      <CreateRootFolderButton />
    </div>
  );
}

// Componente simplificado para casos básicos
export function BasicFolderTree({
  folders,
  selectedFolderId,
  onFolderSelect
}: {
  folders: EnhancedFolder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}) {
  return (
    <HierarchicalFolderTreeEnhanced
      folders={folders}
      selectedFolderId={selectedFolderId}
      expandedFolders={[]}
      onFolderSelect={onFolderSelect}
      onFolderToggle={() => {}}
      onFolderAction={() => {}}
    />
  );
}
