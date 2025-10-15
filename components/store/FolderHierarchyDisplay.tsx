'use client';

import React from 'react';
import { FolderTreeView, FolderBreadcrumb, FolderList } from './FolderTreeView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Folder, Grid3x3, List } from 'lucide-react';

interface FolderHierarchyDisplayProps {
  folderHierarchy?: {
    path?: string;
    parentId?: string;
    parentName?: string;
    depth?: number;
    childFolders?: Array<{
      id: string;
      name: string;
      depth: number;
      sort_order?: number;
      photo_count?: number;
      has_children?: boolean;
    }>;
    shareType?: string;
  };
  currentFolderId?: string;
  onFolderSelect?: (folderId: string, folderName: string) => void;
  viewMode?: 'tree' | 'list' | 'breadcrumb';
  className?: string;
}

export function FolderHierarchyDisplay({
  folderHierarchy,
  currentFolderId,
  onFolderSelect,
  viewMode = 'tree',
  className
}: FolderHierarchyDisplayProps) {
  // Si no hay información de jerarquía, no mostrar nada
  if (!folderHierarchy || (!folderHierarchy.childFolders?.length && !folderHierarchy.path)) {
    return null;
  }

  const hasSubfolders = folderHierarchy.childFolders && folderHierarchy.childFolders.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Folder className="h-5 w-5 text-blue-500" />
          Organización de Fotos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mostrar breadcrumb si hay path */}
        {folderHierarchy.path && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Ubicación actual:</p>
            <FolderBreadcrumb
              path={folderHierarchy.path}
              onSegmentClick={(segment, index) => {
                console.log(`Clicked on segment: ${segment} at index ${index}`);
              }}
            />
          </div>
        )}

        {/* Mostrar subcarpetas si existen */}
        {hasSubfolders && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Carpetas disponibles ({folderHierarchy.childFolders!.length})
            </p>

            {viewMode === 'tree' && (
              <FolderTreeView
                folders={folderHierarchy.childFolders}
                currentFolderId={currentFolderId}
                onFolderSelect={onFolderSelect}
                showPhotoCount={true}
              />
            )}

            {viewMode === 'list' && (
              <FolderList
                folders={folderHierarchy.childFolders}
                currentFolderId={currentFolderId}
                onFolderSelect={onFolderSelect}
                showPhotoCount={true}
              />
            )}
          </div>
        )}

        {/* Información adicional */}
        {folderHierarchy.parentName && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Carpeta padre: <span className="font-medium text-gray-700">{folderHierarchy.parentName}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente compacto para mostrar en el header
export function FolderHierarchyCompact({
  folderHierarchy,
  className
}: {
  folderHierarchy?: FolderHierarchyDisplayProps['folderHierarchy'];
  className?: string;
}) {
  if (!folderHierarchy?.path) {
    return null;
  }

  return (
    <div className={className}>
      <FolderBreadcrumb
        path={folderHierarchy.path}
        className="text-sm"
      />
    </div>
  );
}

// Componente con tabs para diferentes vistas
export function FolderHierarchyTabs({
  folderHierarchy,
  currentFolderId,
  onFolderSelect,
  className
}: FolderHierarchyDisplayProps) {
  if (!folderHierarchy || !folderHierarchy.childFolders?.length) {
    return null;
  }

  return (
    <div className={className}>
      <Tabs defaultValue="tree" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tree" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Vista de Árbol
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Vista de Cuadrícula
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="mt-4">
          <FolderTreeView
            folders={folderHierarchy.childFolders}
            currentFolderId={currentFolderId}
            onFolderSelect={onFolderSelect}
            showPhotoCount={true}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <FolderList
            folders={folderHierarchy.childFolders}
            currentFolderId={currentFolderId}
            onFolderSelect={onFolderSelect}
            showPhotoCount={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}