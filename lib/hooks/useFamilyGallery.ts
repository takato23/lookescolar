'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FolderNavigationState, FolderHierarchyProps } from '@/lib/types/folder-hierarchy-types';

export interface FamilyPhoto {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  assignment_id?: string;
  photo_type?: string;
  is_group_photo?: boolean;
  course_id?: string;
  tagged_at?: string;
}

export interface FamilySubject {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  parent_name?: string;
  parent_email?: string;
  event?: {
    id: string;
    name: string;
    date?: string;
    school_name?: string;
  };
  course?: {
    id: string;
    name: string;
    grade: string;
    section: string;
  };
}

export interface FamilyOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

export interface FolderHierarchy {
  id: string;
  name: string;
  depth: number;
  sort_order?: number;
  photo_count?: number;
  has_children?: boolean;
}

export interface FamilyGalleryData {
  subject?: FamilySubject;
  photos: FamilyPhoto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
  active_order?: FamilyOrder;
  tokenType?: 'family' | 'folder' | 'store';
  eventName?: string;
  isPreselected?: boolean;
  selectedCount?: number;
  folderPath?: string;
  parentId?: string;
  parentName?: string;
  depth?: number;
  childFolders?: FolderHierarchy[];
  shareType?: string;
}

export interface UseFamilyGalleryOptions {
  password?: string;
}

export function useFamilyGallery(token: string, options?: UseFamilyGalleryOptions) {
  const [data, setData] = useState<FamilyGalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Folder navigation state
  const [navigationState, setNavigationState] = useState<FolderNavigationState>({
    currentFolderId: null,
    currentFolderName: null,
    navigationHistory: [],
    isNavigating: false,
  });

  const loadGallery = useCallback(async (page = 1, limit = 50, folderId?: string | null) => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      setNavigationState(prev => ({ ...prev, isNavigating: true }));

      // 0) Intentar API de tienda unificada primero para garantizar la misma preview
      try {
        const params = new URLSearchParams({
          include_assets: 'true',
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString()
        });
        if (folderId !== undefined) {
          params.append('folder_id', folderId || '');
        } else if (navigationState.currentFolderId) {
          params.append('folder_id', navigationState.currentFolderId);
        }

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (options?.password) {
          headers['X-Store-Password'] = options.password;
        }
        const storeResp = await apiFetch(`/api/store/${token}?${params}`, {
          method: 'GET',
          headers,
        });
        if (storeResp.ok) {
          const storeJson = await storeResp.json();
          console.log('Store API Response:', {
            assets: storeJson.assets?.length || 0,
            firstAsset: storeJson.assets?.[0],
            store: storeJson.store,
          });
          const items = (storeJson.assets || []).map((it: any) => {
            const url = it.watermark_url || it.preview_url || it.storage_path;
            console.log('Processing asset:', { 
              id: it.id, 
              watermark_url: it.watermark_url,
              preview_url: it.preview_url,
              storage_path: it.storage_path,
              final_url: url
            });
            return {
              id: it.id,
              filename: it.filename,
              storage_path: url,
              created_at: it.created_at,
              signed_url: url,
              assignment_id: it.id,
              photo_type: 'store_asset',
              is_group_photo: false,
            };
          });
          const galleryData = {
            tokenType: 'store' as const,
            eventName: storeJson.event?.name || undefined,
            photos: items,
            isPreselected: storeJson.store?.is_preselected || false,
            selectedCount: storeJson.store?.selected_count || 0,
            folderPath: storeJson.store?.folder_path || undefined,
            parentId: storeJson.store?.parent_id || undefined,
            parentName: storeJson.store?.parent_name || undefined,
            depth: storeJson.store?.depth || 0,
            childFolders: storeJson.store?.child_folders || [],
            shareType: storeJson.store?.share_type || 'folder',
            pagination: {
              page,
              limit,
              total: storeJson.pagination?.total || items.length,
              hasMore: storeJson.pagination?.hasMore || false,
              totalPages: storeJson.pagination?.total ? Math.max(1, Math.ceil((storeJson.pagination.total as number) / limit)) : 1,
            },
          };
          setData(galleryData as any);
          setLoading(false);
          setNavigationState(prev => ({ ...prev, isNavigating: false }));
          return;
        }
      } catch {}

      // Try family/subject token API first
      let response = await apiFetch(`/api/family/gallery/${token}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let galleryData;

      if (response.ok) {
        // Family token worked, use family data format
        galleryData = await response.json();
        galleryData.tokenType = 'family';
      } else {
        // Try folder token API
        response = await apiFetch(`/api/public/folder-share/${token}/gallery?page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Token inválido o expirado');
          }
          if (response.status === 404) {
            throw new Error('No se encontraron fotos para este token');
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const folderData = await response.json();
        
        // Transform folder data to match family data structure
        galleryData = {
          tokenType: 'folder',
          eventName: folderData.gallery?.eventName,
          photos: (folderData.gallery?.items || []).map((item: any) => ({
            id: item.id,
            filename: item.filename,
            storage_path: item.preview_url, // Use preview URL directly
            created_at: item.created_at,
            signed_url: item.preview_url,
            assignment_id: item.folder_id,
            photo_type: 'folder',
            is_group_photo: false,
          })),
          pagination: {
            page: folderData.gallery?.pagination?.page || page,
            limit: folderData.gallery?.pagination?.limit || limit,
            total: folderData.gallery?.pagination?.total || 0,
            hasMore: folderData.gallery?.pagination?.has_more || false,
            totalPages: folderData.gallery?.pagination?.total_pages || 1,
          },
          subject: folderData.gallery?.eventName ? {
            id: folderData.gallery?.eventId || 'folder',
            name: folderData.gallery?.eventName || 'Galería',
            grade: '',
            section: '',
          } : undefined,
        };
      }

      setData(galleryData);
    } catch (err) {
      console.error('Error loading gallery:', err);
      setError(err instanceof Error ? err.message : 'Error loading gallery');
    } finally {
      setLoading(false);
      setNavigationState(prev => ({ ...prev, isNavigating: false }));
    }
  }, [token, navigationState.currentFolderId, options?.password]);

  const loadMorePhotos = useCallback(async () => {
    if (!data || loading || !data.pagination.hasMore) return;

    const nextPage = data.pagination.page + 1;
    
    try {
      let response: Response;
      
      if (data.tokenType === 'store') {
        // Paginación por offset en la API de la tienda
        const nextOffset = (nextPage - 1) * data.pagination.limit;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (options?.password) {
          headers['X-Store-Password'] = options.password;
        }
        response = await apiFetch(`/api/store/${token}?include_assets=true&limit=${data.pagination.limit}&offset=${nextOffset}`, {
          method: 'GET',
          headers,
        });
      } else if (data.tokenType === 'folder') {
        response = await apiFetch(`/api/public/folder-share/${token}/gallery?page=${nextPage}&limit=${data.pagination.limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        response = await apiFetch(`/api/family/gallery/${token}?page=${nextPage}&limit=${data.pagination.limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) throw new Error('Error loading more photos');

      const responseData = await response.json();
      let newData;

      if (data.tokenType === 'store') {
        const storeJson = responseData;
        newData = {
          ...data,
          photos: (storeJson.assets || []).map((it: any) => {
            const url = it.watermark_url || it.preview_url || it.storage_path;
            return {
              id: it.id,
              filename: it.filename,
              storage_path: url,
              created_at: it.created_at,
              signed_url: url,
              assignment_id: it.id,
              photo_type: 'store_asset',
              is_group_photo: false,
            };
          }),
          pagination: {
            page: nextPage,
            limit: data.pagination.limit,
            total: storeJson.pagination?.total || data.pagination.total,
            hasMore: storeJson.pagination?.hasMore || false,
            totalPages: storeJson.pagination?.total ? Math.max(1, Math.ceil((storeJson.pagination.total as number) / data.pagination.limit)) : data.pagination.totalPages,
          },
        } as any;
      } else if (data.tokenType === 'folder') {
        // Transform folder response
        const folderData = responseData;
        newData = {
          ...data,
          photos: (folderData.gallery?.items || []).map((item: any) => ({
            id: item.id,
            filename: item.filename,
            storage_path: item.preview_url,
            created_at: item.created_at,
            signed_url: item.preview_url,
            assignment_id: item.folder_id,
            photo_type: 'folder',
            is_group_photo: false,
          })),
          pagination: {
            page: folderData.gallery?.pagination?.page || nextPage,
            limit: folderData.gallery?.pagination?.limit || data.pagination.limit,
            total: folderData.gallery?.pagination?.total || 0,
            hasMore: folderData.gallery?.pagination?.has_more || false,
            totalPages: folderData.gallery?.pagination?.total_pages || 1,
          },
        };
      } else {
        // Family token response
        newData = responseData;
      }
      
      // Combinar fotos existentes con las nuevas
      setData(prev => prev ? {
        ...newData,
        photos: [...prev.photos, ...newData.photos]
      } : newData);
    } catch (err) {
      console.error('Error loading more photos:', err);
      setError(err instanceof Error ? err.message : 'Error loading more photos');
    }
  }, [data, loading, token, options?.password]);

  const refreshGallery = useCallback(() => {
    loadGallery(1, data?.pagination?.limit || 50);
  }, [loadGallery, data?.pagination?.limit]);

  // Navigate to a specific folder
  const navigateToFolder = useCallback((folderId: string | null, folderName: string | null) => {
    setNavigationState(prev => {
      // Add current location to history before navigating
      const newHistory = [
        ...prev.navigationHistory,
        {
          folderId: prev.currentFolderId,
          folderName: prev.currentFolderName,
          timestamp: Date.now(),
        },
      ].slice(-20); // Keep history size limited

      return {
        ...prev,
        currentFolderId: folderId,
        currentFolderName: folderName,
        navigationHistory: newHistory,
        isNavigating: true,
      };
    });

    // Trigger data reload with new folder
    loadGallery(1, data?.pagination?.limit || 50, folderId);
  }, [loadGallery, data?.pagination?.limit]);

  // Navigate back to parent folder
  const navigateToParent = useCallback(() => {
    if (data?.parentId !== undefined) {
      navigateToFolder(data.parentId || null, data.parentName || null);
    }
  }, [data?.parentId, data?.parentName, navigateToFolder]);

  // Navigate using breadcrumb
  const navigateToBreadcrumb = useCallback((index: number) => {
    // If clicking the root (index 0), go to root
    if (index === 0) {
      navigateToFolder(null, null);
      return;
    }

    // Navigate back through history if available
    const currentDepth = data?.depth || 0;
    const stepsBack = currentDepth - index;

    if (stepsBack > 0 && navigationState.navigationHistory.length >= stepsBack) {
      const targetEntry = navigationState.navigationHistory[navigationState.navigationHistory.length - stepsBack];
      navigateToFolder(targetEntry.folderId, targetEntry.folderName);
    }
  }, [data?.depth, navigationState.navigationHistory, navigateToFolder]);

  // Navigate back through history
  const navigateBack = useCallback(() => {
    if (navigationState.navigationHistory.length > 0) {
      const previousEntry = navigationState.navigationHistory[navigationState.navigationHistory.length - 1];

      // Remove the last entry from history and navigate
      setNavigationState(prev => ({
        ...prev,
        currentFolderId: previousEntry.folderId,
        currentFolderName: previousEntry.folderName,
        navigationHistory: prev.navigationHistory.slice(0, -1),
        isNavigating: true,
      }));

      loadGallery(1, data?.pagination?.limit || 50, previousEntry.folderId);
    }
  }, [navigationState.navigationHistory, loadGallery, data?.pagination?.limit]);

  // Refresh current folder data
  const refreshCurrentFolder = useCallback(() => {
    loadGallery(1, data?.pagination?.limit || 50, navigationState.currentFolderId);
  }, [loadGallery, data?.pagination?.limit, navigationState.currentFolderId]);

  // Enhanced folder hierarchy with navigation metadata
  const folderHierarchy: FolderHierarchyProps = useMemo(() => ({
    path: data?.folderPath?.split(' > ') || [],
    parentId: data?.parentId || null,
    parentName: data?.parentName || null,
    depth: data?.depth || 0,
    childFolders: (data?.childFolders || []).map(folder => ({
      id: folder.id,
      name: folder.name,
      photoCount: folder.photo_count || 0,
      hasChildren: folder.has_children || false,
    })),
    shareType: (data?.shareType || 'selective') as 'selective' | 'all',
    currentFolder: {
      id: navigationState.currentFolderId || 'root',
      name: navigationState.currentFolderName || 'Root',
      path: data?.folderPath?.split(' > ') || [],
      photoCount: data?.photos?.length || 0,
      hasChildren: (data?.childFolders?.length || 0) > 0,
      depth: data?.depth || 0,
    },
    isNavigating: navigationState.isNavigating,
  }), [data, navigationState]);

  // Cargar galería al montar el componente
  useEffect(() => {
    if (token) {
      loadGallery();
    }
  }, [loadGallery, token]);

  // Transform photos to format expected by templates
  const getPhotosForTemplate = useCallback(() => {
    if (!data?.photos) return [];

    // For preselected photos (including store type), show ALL of them
    if (data.isPreselected || data.tokenType === 'store') {
      return data.photos.map((photo) => ({
        id: photo.id,
        url: photo.signed_url,
        alt: data.eventName ? `Foto de ${data.eventName}` : 'Foto seleccionada',
        isGroupPhoto: photo.is_group_photo || false,
        filename: photo.filename,
        created_at: photo.created_at,
      }));
    }

    // For folder shares (not store), only show one preview
    if (data.tokenType === 'folder') {
      const first = data.photos[0];
      if (!first) return [];
      return [
        {
          id: first.id,
          url: first.signed_url,
          alt: data.eventName ? `Foto de ${data.eventName}` : 'Foto del evento',
          // Avoid student/subject labels to prevent placeholder texts
          isGroupPhoto: first.is_group_photo || false,
          filename: first.filename,
          created_at: first.created_at,
        } as any,
      ];
    }

    const subjectName = data.subject?.name || data.eventName || '';
    const subjectInfo = data.subject
      ? data.subject.course?.name || `${data.subject.grade || ''}${data.subject.section || ''}`
      : '';

    return data.photos.map((photo) => ({
      id: photo.id,
      url: photo.signed_url,
      alt: subjectName ? `Foto de ${subjectName}` : 'Foto',
      student: subjectName || undefined,
      subject: subjectInfo || undefined,
      isGroupPhoto: photo.is_group_photo || false,
      filename: photo.filename,
      created_at: photo.created_at,
    }));
  }, [data]);

  return {
    // Data
    data,
    photos: getPhotosForTemplate(),
    subject: data?.subject,
    activeOrder: data?.active_order,
    folderHierarchy,

    // Stats
    totalPhotos: data?.pagination?.total || 0,
    currentPhotosCount: data?.photos?.length || 0,
    hasMorePhotos: data?.pagination?.hasMore || false,
    isPreselected: data?.isPreselected || false,
    selectedCount: data?.selectedCount || 0,

    // States
    loading,
    error,

    // Actions
    loadMorePhotos,
    refreshGallery,
    retry: refreshGallery,

    // Navigation functions
    navigateToFolder,
    navigateToParent,
    navigateToBreadcrumb,
    navigateBack,
    refreshCurrentFolder,

    // Navigation state
    currentFolderId: navigationState.currentFolderId,
    currentFolderName: navigationState.currentFolderName,
    navigationHistory: navigationState.navigationHistory,
    isNavigatingFolder: navigationState.isNavigating,
  };
}
import { apiFetch } from '@/lib/utils/api-client';
