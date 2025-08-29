import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import 'server-only';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface EventFolder {
  id: string;
  event_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  depth: number;
  sort_order: number;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FolderWithStats extends EventFolder {
  child_folder_count: number;
  photo_count: number;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string;
  description?: string;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_id?: string;
  description?: string;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface FolderOperationResult {
  success: boolean;
  folder?: EventFolder;
  error?: string;
}

export interface FoldersListResult {
  success: boolean;
  folders?: FolderWithStats[];
  error?: string;
}

export interface MoveOperation {
  folder_id: string;
  new_parent_id: string | null;
}

class FolderService {
  /**
   * Get folders for an event, optionally filtered by parent
   */
  async getFolders(
    eventId: string,
    parentId?: string | null
  ): Promise<FoldersListResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Fetching folders', {
        requestId,
        eventId,
        parentId: parentId || 'root',
      });

      // Base query for folders - using folders table directly with cached photo_count
      let query = supabase
        .from('folders')
        .select(`
          id,
          name,
          parent_id,
          event_id,
          depth,
          sort_order,
          photo_count,
          created_at
        `)
        .eq('event_id', eventId);

      // Filter by parent_id (null for root folders)
      if (parentId === null || parentId === undefined) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      // Order by sort_order, then by name
      query = query
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch folders', {
          requestId,
          eventId,
          parentId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      logger.info('Successfully fetched folders', {
        requestId,
        eventId,
        parentId: parentId || 'root',
        count: data?.length || 0,
      });

      return {
        success: true,
        folders: (data as FolderWithStats[]) || [],
      };
    } catch (error) {
      logger.error('Unexpected error fetching folders', {
        requestId,
        eventId,
        parentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch folders',
      };
    }
  }

  /**
   * Get folder by ID with stats
   */
  async getFolderById(folderId: string): Promise<FolderOperationResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Fetching folder by ID', {
        requestId,
        folderId,
      });

      const { data, error } = await supabase
        .from('folders')
        .select(`
          id,
          name,
          parent_id,
          event_id,
          depth,
          sort_order,
          photo_count,
          created_at
        `)
        .eq('id', folderId)
        .single();

      if (error) {
        logger.error('Failed to fetch folder by ID', {
          requestId,
          folderId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Folder not found' };
      }

      return {
        success: true,
        folder: data as FolderWithStats,
      };
    } catch (error) {
      logger.error('Unexpected error fetching folder by ID', {
        requestId,
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch folder',
      };
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(
    eventId: string,
    folderData: CreateFolderRequest
  ): Promise<FolderOperationResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Creating folder', {
        requestId,
        eventId,
        name: folderData.name,
        parentId: folderData.parent_id || 'root',
      });

      // Validate folder name
      if (!folderData.name || folderData.name.trim().length === 0) {
        return { success: false, error: 'Folder name is required' };
      }

      if (folderData.name.length > 255) {
        return {
          success: false,
          error: 'Folder name is too long (max 255 characters)',
        };
      }

      // Sanitize folder name (remove dangerous characters)
      const sanitizedName = this.sanitizeFolderName(folderData.name);

      // Check if folder with same name exists in the same parent
      const { data: existingFolder } = await supabase
        .from('folders')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', sanitizedName)
        .eq('parent_id', folderData.parent_id || null)
        .single();

      if (existingFolder) {
        return {
          success: false,
          error: 'A folder with this name already exists in this location',
        };
      }

      // If parent_id is provided, verify it exists and belongs to the same event
      if (folderData.parent_id) {
        const { data: parentFolder } = await supabase
          .from('folders')
          .select('id, event_id, depth')
          .eq('id', folderData.parent_id)
          .single();

        if (!parentFolder) {
          return { success: false, error: 'Parent folder not found' };
        }

        if (parentFolder.event_id !== eventId) {
          return {
            success: false,
            error: 'Parent folder belongs to a different event',
          };
        }

        if (parentFolder.depth >= 10) {
          return { success: false, error: 'Maximum folder depth reached' };
        }
      }

      // Create the folder
      const { data, error } = await supabase
        .from('folders')
        .insert({
          event_id: eventId,
          parent_id: folderData.parent_id || null,
          name: sanitizedName,
          sort_order: folderData.sort_order || 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create folder', {
          requestId,
          eventId,
          folderData,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      logger.info('Successfully created folder', {
        requestId,
        eventId,
        folderId: data.id,
        name: sanitizedName,
        parentId: folderData.parent_id || 'root',
      });

      return {
        success: true,
        folder: data as EventFolder,
      };
    } catch (error) {
      logger.error('Unexpected error creating folder', {
        requestId,
        eventId,
        folderData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create folder',
      };
    }
  }

  /**
   * Update folder (rename, move, update metadata)
   */
  async updateFolder(
    folderId: string,
    updateData: UpdateFolderRequest
  ): Promise<FolderOperationResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Updating folder', {
        requestId,
        folderId,
        updateData,
      });

      // First, get the current folder to validate the operation
      const { data: currentFolder, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (fetchError || !currentFolder) {
        return { success: false, error: 'Folder not found' };
      }

      // Validate the update data
      const updateFields: Partial<EventFolder> = {};

      // Handle name update
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          return { success: false, error: 'Folder name cannot be empty' };
        }

        if (updateData.name.length > 255) {
          return {
            success: false,
            error: 'Folder name is too long (max 255 characters)',
          };
        }

        const sanitizedName = this.sanitizeFolderName(updateData.name);

        // Check for name conflicts (except with itself)
        const { data: existingFolder } = await supabase
          .from('folders')
          .select('id')
          .eq('event_id', currentFolder.event_id)
          .eq('name', sanitizedName)
          .eq(
            'parent_id',
            updateData.parent_id !== undefined
              ? updateData.parent_id
              : currentFolder.parent_id
          )
          .neq('id', folderId)
          .single();

        if (existingFolder) {
          return {
            success: false,
            error: 'A folder with this name already exists in this location',
          };
        }

        updateFields.name = sanitizedName;
      }

      // Handle parent move
      if (updateData.parent_id !== undefined) {
        // Prevent moving folder to itself or its descendants
        if (updateData.parent_id === folderId) {
          return { success: false, error: 'Cannot move folder to itself' };
        }

        if (updateData.parent_id) {
          // Check if target parent exists and belongs to same event
          const { data: targetParent } = await supabase
            .from('folders')
            .select('id, event_id, depth')
            .eq('id', updateData.parent_id)
            .single();

          if (!targetParent) {
            return { success: false, error: 'Target parent folder not found' };
          }

          if (targetParent.event_id !== currentFolder.event_id) {
            return {
              success: false,
              error: 'Cannot move folder to a different event',
            };
          }

          if (targetParent.depth >= 9) {
            return {
              success: false,
              error: 'Maximum folder depth would be exceeded',
            };
          }

          // Check for circular reference (target parent should not be a descendant)
          const isDescendant = await this.isFolderDescendant(
            folderId,
            updateData.parent_id
          );
          if (isDescendant) {
            return {
              success: false,
              error: 'Cannot move folder to its own descendant',
            };
          }
        }

        updateFields.parent_id = updateData.parent_id;
      }

      // Handle other fields
      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }

      if (updateData.sort_order !== undefined) {
        updateFields.sort_order = updateData.sort_order;
      }

      if (updateData.metadata !== undefined) {
        updateFields.metadata = updateData.metadata;
      }

      // Perform the update
      const { data, error } = await supabase
        .from('folders')
        .update(updateFields)
        .eq('id', folderId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update folder', {
          requestId,
          folderId,
          updateData,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      logger.info('Successfully updated folder', {
        requestId,
        folderId,
        updateData,
      });

      return {
        success: true,
        folder: data as EventFolder,
      };
    } catch (error) {
      logger.error('Unexpected error updating folder', {
        requestId,
        folderId,
        updateData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update folder',
      };
    }
  }

  /**
   * Delete folder and optionally move its contents
   */
  async deleteFolder(
    folderId: string,
    moveContentsTo?: string | null
  ): Promise<FolderOperationResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Deleting folder', {
        requestId,
        folderId,
        moveContentsTo: moveContentsTo || 'delete',
      });

      // Get the folder to validate it exists
      const { data: folder, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (fetchError || !folder) {
        return { success: false, error: 'Folder not found' };
      }

      // Check if folder has contents
      const [{ data: childFolders }, { data: childPhotos }] = await Promise.all(
        [
          supabase.from('folders').select('id').eq('parent_id', folderId),
          supabase.from('photos').select('id').eq('folder_id', folderId),
        ]
      );

      const hasContents =
        (childFolders && childFolders.length > 0) ||
        (childPhotos && childPhotos.length > 0);

      if (hasContents && moveContentsTo === undefined) {
        return {
          success: false,
          error:
            'Folder contains items. Specify where to move contents or use force delete.',
        };
      }

      // If moveContentsTo is specified, validate the target
      if (moveContentsTo && moveContentsTo !== null) {
        const { data: targetFolder } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('id', moveContentsTo)
          .single();

        if (!targetFolder) {
          return {
            success: false,
            error: 'Target folder for contents not found',
          };
        }

        if (targetFolder.event_id !== folder.event_id) {
          return {
            success: false,
            error: 'Cannot move contents to a folder in a different event',
          };
        }
      }

      // Start transaction-like operation
      const operations: Promise<any>[] = [];

      // Move child folders if needed
      if (
        childFolders &&
        childFolders.length > 0 &&
        moveContentsTo !== undefined
      ) {
        operations.push(
          supabase
            .from('folders')
            .update({ parent_id: moveContentsTo })
            .eq('parent_id', folderId)
        );
      }

      // Move child photos if needed
      if (
        childPhotos &&
        childPhotos.length > 0 &&
        moveContentsTo !== undefined
      ) {
        operations.push(
          supabase
            .from('photos')
            .update({ folder_id: moveContentsTo })
            .eq('folder_id', folderId)
        );
      }

      // Execute all move operations
      if (operations.length > 0) {
        const results = await Promise.all(operations);
        const failed = results.find((result) => result.error);
        if (failed) {
          logger.error('Failed to move folder contents', {
            requestId,
            folderId,
            error: failed.error.message,
          });
          return { success: false, error: 'Failed to move folder contents' };
        }
      }

      // Delete the folder
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (deleteError) {
        logger.error('Failed to delete folder', {
          requestId,
          folderId,
          error: deleteError.message,
        });
        return { success: false, error: deleteError.message };
      }

      logger.info('Successfully deleted folder', {
        requestId,
        folderId,
        movedContents: hasContents && moveContentsTo !== undefined,
        moveContentsTo: moveContentsTo || 'none',
      });

      return { success: true };
    } catch (error) {
      logger.error('Unexpected error deleting folder', {
        requestId,
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete folder',
      };
    }
  }

  /**
   * Get folder tree for an event
   */
  async getFolderTree(eventId: string): Promise<FoldersListResult> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Fetching folder tree', {
        requestId,
        eventId,
      });

      const { data, error } = await supabase
        .from('folders')
        .select(`
          id,
          name,
          parent_id,
          event_id,
          depth,
          sort_order,
          photo_count,
          created_at
        `)
        .eq('event_id', eventId)
        .order('depth', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch folder tree', {
          requestId,
          eventId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      logger.info('Successfully fetched folder tree', {
        requestId,
        eventId,
        count: data?.length || 0,
      });

      return {
        success: true,
        folders: (data as FolderWithStats[]) || [],
      };
    } catch (error) {
      logger.error('Unexpected error fetching folder tree', {
        requestId,
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch folder tree',
      };
    }
  }

  /**
   * Get breadcrumb path for a folder
   */
  async getBreadcrumb(
    folderId: string
  ): Promise<{ success: boolean; breadcrumb?: EventFolder[]; error?: string }> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Fetching breadcrumb', {
        requestId,
        folderId,
      });

      // Get the folder first
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError || !folder) {
        return { success: false, error: 'Folder not found' };
      }

      // Build breadcrumb by walking up the tree
      const breadcrumb: EventFolder[] = [folder];
      let currentParentId = folder.parent_id;

      while (currentParentId) {
        const { data: parentFolder, error: parentError } = await supabase
          .from('folders')
          .select('*')
          .eq('id', currentParentId)
          .single();

        if (parentError || !parentFolder) {
          break;
        }

        breadcrumb.unshift(parentFolder);
        currentParentId = parentFolder.parent_id;
      }

      logger.info('Successfully fetched breadcrumb', {
        requestId,
        folderId,
        breadcrumbLength: breadcrumb.length,
      });

      return {
        success: true,
        breadcrumb,
      };
    } catch (error) {
      logger.error('Unexpected error fetching breadcrumb', {
        requestId,
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch breadcrumb',
      };
    }
  }

  /**
   * Check if a folder is a descendant of another folder
   */
  private async isFolderDescendant(
    ancestorId: string,
    descendantId: string
  ): Promise<boolean> {
    try {
      let currentId = descendantId;
      let depth = 0;

      while (currentId && depth < 20) {
        // Prevent infinite loops
        const { data: folder } = await supabase
          .from('folders')
          .select('parent_id')
          .eq('id', currentId)
          .single();

        if (!folder || !folder.parent_id) {
          break;
        }

        if (folder.parent_id === ancestorId) {
          return true;
        }

        currentId = folder.parent_id;
        depth++;
      }

      return false;
    } catch (error) {
      logger.error('Error checking folder descendant relationship', {
        ancestorId,
        descendantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Sanitize folder name to prevent issues
   */
  private sanitizeFolderName(name: string): string {
    return name
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 255); // Enforce length limit
  }
}

export const folderService = new FolderService();
