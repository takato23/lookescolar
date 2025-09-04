/**
 * Fix para ShareService - Mejora derivación de eventId
 * Este parche mejora la lógica para encontrar el eventId cuando no se proporciona
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function deriveEventIdFromContext(options: {
  eventId?: string;
  folderId?: string;
  photoIds?: string[];
  shareType: string;
}): Promise<string | null> {
  const { eventId, folderId, photoIds, shareType } = options;
  
  // Si ya tenemos eventId, usarlo
  if (eventId) return eventId;
  
  const supabase = await createServerSupabaseServiceClient();
  
  try {
    // Derivar desde folder
    if (shareType === 'folder' && folderId) {
      const { data: folder } = await supabase
        .from('folders')
        .select('event_id')
        .eq('id', folderId)
        .maybeSingle();
      
      if (folder?.event_id) return folder.event_id;
    }
    
    // Derivar desde assets/photos 
    if (shareType === 'photos' && photoIds && photoIds.length > 0) {
      // Primero intentar con assets
      const { data: assets } = await supabase
        .from('assets')
        .select('event_id, folder_id')
        .in('id', photoIds);
      
      if (assets && assets.length > 0) {
        // Si assets tiene event_id directo
        const directEventIds = assets
          .map((a: any) => a.event_id)
          .filter(Boolean);
        
        if (directEventIds.length > 0) {
          return directEventIds[0];
        }
        
        // Si no, derivar desde folders
        const folderIds = assets
          .map((a: any) => a.folder_id)
          .filter(Boolean);
        
        if (folderIds.length > 0) {
          const { data: folders } = await supabase
            .from('folders')
            .select('event_id')
            .in('id', folderIds);
          
          if (folders && folders.length > 0) {
            const eventIds = folders
              .map((f: any) => f.event_id)
              .filter(Boolean);
            
            if (eventIds.length > 0) {
              return eventIds[0];
            }
          }
        }
      }
      
      // Como fallback, intentar con la tabla photos si assets no funcionó
      const { data: photos } = await supabase
        .from('photos')
        .select('event_id, folder_id')
        .in('id', photoIds);
      
      if (photos && photos.length > 0) {
        const directEventIds = photos
          .map((p: any) => p.event_id)
          .filter(Boolean);
        
        if (directEventIds.length > 0) {
          return directEventIds[0];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error deriving eventId:', error);
    return null;
  }
}
