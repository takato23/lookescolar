'use client';

import React, { useState, useMemo } from 'react';
import { MobileNav } from '../../_mockups/MobileNav';
import { PhotosFilters } from '../../_mockups/PhotosFilters';
import { PhotoCard, Photo, PhotoStatus } from '../../_mockups/PhotoCard';
import { Fab } from '../../_mockups/Fab';

// Mock data
const photosMock: Photo[] = [
  {
    id: '1',
    name: 'IMG_1095-2.jpg',
    src: '/mockups/photos/photo1.jpg',
    sizeKB: 575.82,
    date: '18/08/2025',
    status: 'approved'
  },
  {
    id: '2',
    name: 'IMG_1008-1.jpg', 
    src: '/mockups/photos/photo2.jpg',
    sizeKB: 575.82,
    date: '18/08/2025',
    status: 'approved'
  },
  {
    id: '3',
    name: 'IMG_1090-3.jpg',
    src: '/mockups/photos/photo3.jpg',
    sizeKB: 575.82,
    date: '18/08/2025',
    status: 'approved'
  },
  {
    id: '4',
    name: 'IMG_1008-3.jpg',
    src: '/mockups/photos/photo4.jpg',
    sizeKB: 575.82,
    date: '18/08/2025',
    status: 'approved'
  },
  {
    id: '5',
    name: 'IMG_2045-1.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 482.15,
    date: '17/08/2025',
    status: 'pending'
  },
  {
    id: '6',
    name: 'IMG_2038-4.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 623.91,
    date: '17/08/2025',
    status: 'pending'
  },
  {
    id: '7',
    name: 'IMG_3021-2.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 754.33,
    date: '16/08/2025',
    status: 'tagged'
  },
  {
    id: '8',
    name: 'IMG_3015-1.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 689.72,
    date: '16/08/2025',
    status: 'tagged'
  },
  {
    id: '9',
    name: 'IMG_4012-3.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 521.44,
    date: '15/08/2025',
    status: 'approved'
  },
  {
    id: '10',
    name: 'IMG_4001-1.jpg',
    src: '/mockups/photos/placeholder.jpg',
    sizeKB: 598.67,
    date: '15/08/2025',
    status: 'pending'
  }
];

export default function PhotosMobileMockup() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PhotoStatus | 'all'>('all');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and search photos
  const filteredPhotos = useMemo(() => {
    let filtered = photosMock;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(photo => photo.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(photo => 
        photo.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, activeFilter]);

  // Selection handlers
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const visiblePhotoIds = filteredPhotos.map(photo => photo.id);
    const allVisible = visiblePhotoIds.every(id => selectedPhotos.has(id));
    
    if (allVisible) {
      // Deselect all visible photos
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        visiblePhotoIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all visible photos
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        visiblePhotoIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // Check if all visible photos are selected
  const allVisibleSelected = filteredPhotos.length > 0 && 
    filteredPhotos.every(photo => selectedPhotos.has(photo.id));
  
  const hasSelection = selectedPhotos.size > 0;
  const selectedCount = selectedPhotos.size;

  // FAB action handler
  const handleFabAction = () => {
    if (hasSelection) {
      const selectedIds = Array.from(selectedPhotos);
      console.log('Processing selected photos:', selectedIds);
      console.log('Selected photos count:', selectedCount);
      
      // Here you would typically handle the batch action
      // For now, just show the selection in console
      const selectedPhotoNames = photosMock
        .filter(photo => selectedPhotos.has(photo.id))
        .map(photo => photo.name);
      
      console.log('Selected photo names:', selectedPhotoNames);
    } else {
      console.log('Add new photo action');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 flex items-start justify-center">
      {/* Mobile Phone Frame */}
      <div className="w-[430px] max-w-full mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Mobile Navigation */}
        <MobileNav />
        
        {/* Filters Section */}
        <PhotosFilters
          onSearch={setSearchQuery}
          onFilterChange={setActiveFilter}
          onSelectAllToggle={toggleSelectAll}
          onViewModeChange={setViewMode}
          allSelected={allVisibleSelected}
          hasSelection={hasSelection}
          activeFilter={activeFilter}
          viewMode={viewMode}
          totalCount={filteredPhotos.length}
        />

        {/* Photos Grid */}
        <div className="p-3 pb-24 min-h-[400px]">
          {filteredPhotos.length > 0 ? (
            <div className={`grid gap-3 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 sm:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  selected={selectedPhotos.has(photo.id)}
                  onToggleSelection={togglePhotoSelection}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron fotos
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {searchQuery ? 
                  `No hay fotos que coincidan con "${searchQuery}".` :
                  'No hay fotos disponibles con los filtros seleccionados.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <Fab
          onClick={handleFabAction}
          selectedCount={selectedCount}
        />
      </div>

      {/* Debug Info (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
          <div>Filtered: {filteredPhotos.length}</div>
          <div>Selected: {selectedCount}</div>
          <div>Query: "{searchQuery}"</div>
          <div>Filter: {activeFilter}</div>
          <div>View: {viewMode}</div>
        </div>
      )}
    </div>
  );
}