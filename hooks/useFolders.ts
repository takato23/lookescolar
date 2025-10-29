/**
 * Custom hook for managing folder queries and mutations
 * Extracted from PhotoAdmin.tsx for better organization and reusability
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OptimizedFolder } from '@/components/admin/photo-admin';
import { photoAdminApi } from '@/components/admin/photo-admin';

interface UseFoldersParams {
  selectedEventId: string | null;
}

export function useFolders({ selectedEventId }: UseFoldersParams) {
  const queryClient = useQueryClient();

  // Folders query with longer stale time (they don't change often)
  const {
    data: folders = [],
    isLoading: isLoadingFolders,
    error: foldersError,
  } = useQuery<OptimizedFolder[]>({
    queryKey: ['optimized-folders', selectedEventId],
    queryFn: () =>
      photoAdminApi.folders.list({
        limit: 50,
        event_id: selectedEventId,
        include_global: false,
      }),
    staleTime: 15 * 60 * 1000, // 15 minutes - folders change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    enabled: !!selectedEventId,
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: photoAdminApi.folders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      toast.success('Carpeta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear carpeta: ${error.message}`);
    },
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; name: string }
  >({
    mutationFn: ({ folderId, name }) =>
      photoAdminApi.folders.update(folderId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta renombrada');
    },
    onError: (error) => {
      toast.error(`Error al renombrar carpeta: ${error.message}`);
    },
  });

  // Move folder mutation
  const moveFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; targetParentId: string | null }
  >({
    mutationFn: ({ folderId, targetParentId }) =>
      photoAdminApi.folders.update(folderId, { parent_id: targetParentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta movida');
    },
    onError: (error) => {
      toast.error(`Error al mover carpeta: ${error.message}`);
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation<
    unknown,
    Error,
    { folderId: string; parentId: string | null }
  >({
    mutationFn: ({ folderId }) => photoAdminApi.folders.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets'],
        exact: false,
      });
      toast.success('Carpeta eliminada');
    },
    onError: (error) => {
      toast.error(`Error al eliminar carpeta: ${error.message}`);
    },
  });

  // Copy folder mutation
  const copyFolderMutation = useMutation<
    any,
    Error,
    { sourceFolderId: string; targetParentId: string | null; newName?: string }
  >({
    mutationFn: ({ sourceFolderId, targetParentId, newName }) =>
      photoAdminApi.folders.copy(sourceFolderId, {
        target_parent_id: targetParentId,
        new_name: newName,
        include_subfolders: true,
        duplicate_assets: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-folders', selectedEventId],
        refetchType: 'active',
      });
    },
    onError: (error) => {
      toast.error(`Error al copiar carpeta: ${error.message}`);
    },
  });

  return {
    // Query state
    folders,
    isLoadingFolders,
    foldersError,
    // Mutations
    createFolderMutation,
    renameFolderMutation,
    moveFolderMutation,
    deleteFolderMutation,
    copyFolderMutation,
  };
}

