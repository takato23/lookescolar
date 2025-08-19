'use client';

import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '../../_mockups/ThemeContext';
import { MobileNav } from '../../_mockups/MobileNav';
import { PhotosFilters } from '../../_mockups/PhotosFilters';
import { PhotoCard, Photo, PhotoStatus } from '../../_mockups/PhotoCard';
import { PhotoModal } from '../../_mockups/PhotoModal';
import { Fab } from '../../_mockups/Fab';
import { SearchIcon, GridIcon, CheckIcon, SunIcon, MoonIcon } from '../../_mockups/icons';
import { useTheme } from '../../_mockups/ThemeContext';

// Filter options
const filterOptions = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'approved' as const, label: 'Aprobadas' },
  { value: 'pending' as const, label: 'Pendientes' },
  { value: 'tagged' as const, label: 'Etiquetadas' },
];

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

function PhotosMobileMockupContent() {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PhotoStatus | 'all'>('all');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  // Photo modal handlers
  const openPhotoModal = (photo: Photo) => {
    const photoIndex = filteredPhotos.findIndex(p => p.id === photo.id);
    setCurrentPhotoIndex(photoIndex);
    setModalOpen(true);
  };

  const closePhotoModal = () => {
    setModalOpen(false);
  };

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
    <>
      {/* iOS-Style Container */}
      <div className="min-h-screen dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 transition-colors duration-500 overflow-hidden">
        
        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto min-h-screen">
            {/* Navigation */}
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

            {/* Desktop Photos Grid */}
            <div className="px-6 pb-24 pt-6">
              {filteredPhotos.length > 0 ? (
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
                    : 'grid-cols-1 max-w-4xl mx-auto'
                }`}>
                  {filteredPhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      selected={selectedPhotos.has(photo.id)}
                      onToggleSelection={togglePhotoSelection}
                      onPhotoClick={openPhotoModal}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState searchQuery={searchQuery} />
              )}
            </div>
          </div>
        </div>

        {/* iOS-Style Mobile Layout */}
        <div className="lg:hidden min-h-screen">
          <div className="p-6 space-y-6">
            
            {/* Carpetas y Eventos Header */}
            <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl p-4 border border-white/30 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/40 dark:bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                    </svg>
                  </div>
                  <h1 className="text-white text-lg font-semibold">Carpetas y Eventos</h1>
                </div>
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {theme === 'dark' ? (
                    <SunIcon size={18} className="text-yellow-300" />
                  ) : (
                    <MoonIcon size={18} className="text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <SearchIcon size={20} className="text-white/70" />
              </div>
              <input
                type="text"
                placeholder="Buscar fotos por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 backdrop-blur-xl bg-white/20 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-full text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/25 transition-all"
              />
            </div>

            {/* Filter Chips and Toggle */}
            <div className="space-y-4">
              {/* Filter Pills Container */}
              <div className="flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-full p-2 border border-white/30 dark:border-white/10 inline-flex">
                  <div className="flex items-center space-x-1">
                    {filterOptions.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setActiveFilter(filter.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          activeFilter === filter.value
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'text-white/90 hover:bg-white/20'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <GridIcon size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Select All Toggle */}
              <div className="flex items-center justify-center">
                <button
                  onClick={toggleSelectAll}
                  className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl p-3 border border-white/30 dark:border-white/10 flex items-center space-x-3"
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    allVisibleSelected
                      ? 'bg-white border-white'
                      : 'border-white/50 bg-transparent'
                  }`}>
                    {allVisibleSelected && <CheckIcon size={14} className="text-purple-600" />}
                  </div>
                  <span className="text-white font-medium">Seleccionar todas</span>
                </button>
              </div>
            </div>

            {/* Photos Grid with iOS Glass Effect */}
            <div className="pb-24">
              {filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl border border-white/30 dark:border-white/10 overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-checkbox]')) {
                          togglePhotoSelection(photo.id);
                        } else {
                          openPhotoModal(photo);
                        }
                      }}
                    >
                      <div className="relative aspect-square">
                        {/* Checkbox */}
                        <button
                          data-checkbox
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo.id);
                          }}
                          className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedPhotos.has(photo.id)
                              ? 'bg-white border-white'
                              : 'border-white/70 bg-white/20 backdrop-blur-sm'
                          }`}
                        >
                          {selectedPhotos.has(photo.id) && (
                            <CheckIcon size={14} className="text-purple-600" />
                          )}
                        </button>

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                          Aprobada
                        </div>

                        {/* Photo Content */}
                        <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/30 rounded-xl backdrop-blur-sm flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Photo Info */}
                      <div className="p-4 bg-white/10 backdrop-blur-sm">
                        <div className="text-white font-medium text-sm mb-1">{photo.name}</div>
                        <div className="flex justify-between text-white/70 text-xs">
                          <span>{photo.sizeKB} KB</span>
                          <span>{photo.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 rounded-2xl p-8 border border-white/30 dark:border-white/10 text-center">
                  <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium mb-2">No se encontraron fotos</h3>
                  <p className="text-white/70 text-sm">
                    {searchQuery ? 
                      `No hay fotos que coincidan con "${searchQuery}".` :
                      'No hay fotos disponibles con los filtros seleccionados.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* iOS-Style FAB */}
        <button
          onClick={handleFabAction}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full backdrop-blur-xl border transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center ${
            hasSelection 
              ? 'bg-emerald-500/90 border-emerald-400/50 shadow-lg shadow-emerald-500/30' 
              : 'bg-blue-500/90 border-blue-400/50 shadow-lg shadow-blue-500/30'
          }`}
          aria-label={hasSelection ? `Procesar ${selectedCount} foto${selectedCount === 1 ? '' : 's'} seleccionada${selectedCount === 1 ? '' : 's'}` : "Agregar nueva foto"}
        >
          <div className="text-white">
            {hasSelection ? (
              <div className="flex flex-col items-center justify-center">
                <CheckIcon size={16} className="drop-shadow-sm" />
                {selectedCount > 0 && (
                  <span className="text-xs font-bold leading-none mt-0.5">
                    {selectedCount > 9 ? '9+' : selectedCount}
                  </span>
                )}
              </div>
            ) : (
              <svg className="w-6 h-6 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </div>
        </button>

        {/* Photo Modal */}
        <PhotoModal
          isOpen={modalOpen}
          onClose={closePhotoModal}
          photos={filteredPhotos}
          initialPhotoIndex={currentPhotoIndex}
          selectedPhotos={selectedPhotos}
          onToggleSelection={togglePhotoSelection}
        />

        {/* Debug Info (only visible in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs backdrop-blur-sm">
            <div>Filtered: {filteredPhotos.length}</div>
            <div>Selected: {selectedCount}</div>
            <div>Query: "{searchQuery}"</div>
            <div>Filter: {activeFilter}</div>
            <div>View: {viewMode}</div>
            <div>Modal: {modalOpen ? 'open' : 'closed'}</div>
          </div>
        )}
      </div>
    </>
  );
}

// Empty state component
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 dark:bg-gray-800 bg-gray-100 rounded-full flex items-center justify-center mb-4 transition-colors">
        <svg className="w-8 h-8 dark:text-gray-500 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium dark:text-white text-gray-900 mb-2 transition-colors">
        No se encontraron fotos
      </h3>
      <p className="text-sm dark:text-gray-400 text-gray-500 max-w-sm transition-colors">
        {searchQuery ? 
          `No hay fotos que coincidan con "${searchQuery}".` :
          'No hay fotos disponibles con los filtros seleccionados.'
        }
      </p>
    </div>
  );
}

// Main export component with ThemeProvider
export default function PhotosMobileMockup() {
  return (
    <ThemeProvider>
      <PhotosMobileMockupContent />
    </ThemeProvider>
  );
}