'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import PhotoManagement from '@/components/admin/PhotoManagement';

interface Photo {
  id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  preview_path: string;
  preview_url?: string;
  approved: boolean;
  tagged: boolean;
  created_at: string;
  width?: number;
  height?: number;
  file_size?: number;
  event_id?: string;
  subject?: {
    id: string;
    name: string;
  };
  event?: {
    id: string;
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
  event_date?: string;
  school_name?: string;
  created_at: string;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'tagged' | 'untagged'>('all');

  // Load photos with filters
  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedEvent !== 'all') {
        params.append('event_id', selectedEvent);
      }
      
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/admin/photos?${params}`);
      const data = await response.json();

      if (data.success && data.photos) {
        setPhotos(data.photos);
        
        // Fetch signed URLs if needed
        if (data.photos.length > 0) {
          await fetchSignedUrls(data.photos);
        }
      } else {
        throw new Error(data.error || 'Error loading photos');
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Error al cargar las fotos');
    } finally {
      setLoading(false);
    }
  };

  // Fetch signed URLs for previews
  const fetchSignedUrls = async (photoList: Photo[]) => {
    try {
      const photoIds = photoList.map(p => p.id);
      
      const response = await fetch('/api/admin/storage/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });

      const data = await response.json();

      if (data.signedUrls) {
        setPhotos(prev => prev.map(p => ({
          ...p,
          preview_url: data.signedUrls[p.id] || p.preview_url
        })));
      }
    } catch (error) {
      console.error('Error fetching signed URLs:', error);
    }
  };

  // Load events for filtering
  const loadEvents = async () => {
    try {
      const response = await fetch('/api/admin/events-simple');
      const data = await response.json();
      
      if (data.success && data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar los eventos');
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Reload photos when filters change
  useEffect(() => {
    loadPhotos();
  }, [selectedEvent, filter]);

  // Transform data for PhotoManagement component
  const mappedFolders = useMemo(() => 
    events.map(event => ({
      id: event.id,
      name: event.name,
      parentId: undefined,
      children: photos.filter(p => p.event_id === event.id).map(p => p.id),
      itemCount: photos.filter(p => p.event_id === event.id).length,
      dateCreated: new Date(event.created_at)
    }))
  , [events, photos]);

  const mappedPhotos = useMemo(() => 
    photos.map(photo => ({
      id: photo.id,
      name: photo.original_filename,
      type: 'photo' as const,
      src: photo.preview_url || '',
      size: photo.file_size || 0,
      dateAdded: new Date(photo.created_at),
      tags: photo.tagged ? ['tagged'] : [],
      favorite: photo.approved,
      folderId: photo.event_id
    }))
  , [photos]);

  // Handle photo selection from PhotoManagement
  const handlePhotoSelect = (selectedPhotos: any[]) => {
    // Handle selected photos if needed
    console.log('Selected photos:', selectedPhotos);
  };

  // Handle folder selection from PhotoManagement
  const handleFolderSelect = (folder: any) => {
    // Update the selected event filter
    setSelectedEvent(folder?.id || 'all');
  };

  if (loading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando fotos...</p>
        </div>
      </div>
    );
  }

  return (
    <PhotoManagement 
      initialPhotos={mappedPhotos} 
      initialFolders={mappedFolders}
      onPhotoSelect={handlePhotoSelect}
      onFolderSelect={handleFolderSelect}
    />
  );
}