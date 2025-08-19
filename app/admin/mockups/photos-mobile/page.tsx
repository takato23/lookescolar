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
import LiquidGlass from 'liquid-glass-react';

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
            
            {/* Carpetas y Eventos Header with SIMPLE Liquid Glass */}
            <LiquidGlass 
              displacementScale={20}
              blurAmount={0.05}
              saturation={100}
              aberrationIntensity={0.5}
              elasticity={0.2}
              cornerRadius={16}
              overLight={theme === 'light'}
              className="w-full"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <LiquidGlass 
                    displacementScale={10}
                    blurAmount={0.02}
                    saturation={100}
                    elasticity={0.3}
                    cornerRadius={8}
                    overLight={theme === 'light'}
                  >
                    <div className="w-8 h-8 flex items-center justify-center p-2">
                      <svg className="w-full h-full text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                      </svg>
                    </div>
                  </LiquidGlass>
                  <h1 className="text-white text-lg font-semibold drop-shadow-sm">Carpetas y Eventos</h1>
                </div>
                
                {/* Simple Theme Toggle with Liquid Glass */}
                <LiquidGlass 
                  displacementScale={15}
                  blurAmount={0.03}
                  saturation={110}
                  aberrationIntensity={0.5}
                  elasticity={0.3}
                  cornerRadius={8}
                  overLight={theme === 'light'}
                  onClick={toggleTheme}
                  className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                >
                  <div className="w-10 h-10 flex items-center justify-center p-2">
                    {theme === 'dark' ? (
                      <SunIcon size={20} className="text-yellow-300 drop-shadow-md animate-pulse" />
                    ) : (
                      <MoonIcon size={20} className="text-white drop-shadow-md" />
                    )}
                  </div>
                </LiquidGlass>
              </div>
            </LiquidGlass>

            {/* Search Bar with SIMPLE Liquid Glass */}
            <LiquidGlass 
              displacementScale={15}
              blurAmount={0.05}
              saturation={105}
              aberrationIntensity={0.3}
              elasticity={0.2}
              cornerRadius={999}
              overLight={theme === 'light'}
              className="w-full relative"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
                  <SearchIcon size={20} className="text-white/80 drop-shadow-sm" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar fotos por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-transparent text-white placeholder-white/70 focus:outline-none focus:placeholder-white/50 transition-all"
                  style={{ background: 'transparent' }}
                />
              </div>
            </LiquidGlass>

            {/* Filter Chips and Toggle */}
            <div className="space-y-4">
              {/* Filter Pills Container with SIMPLE Liquid Glass */}
              <div className="flex items-center justify-center">
                <LiquidGlass 
                  displacementScale={18}
                  blurAmount={0.04}
                  saturation={105}
                  aberrationIntensity={0.4}
                  elasticity={0.2}
                  cornerRadius={999}
                  overLight={theme === 'light'}
                  className="inline-flex"
                >
                  <div className="flex items-center space-x-1 p-2">
                    {filterOptions.map((filter) => (
                      <LiquidGlass 
                        key={filter.value}
                        displacementScale={activeFilter === filter.value ? 12 : 8}
                        blurAmount={activeFilter === filter.value ? 0.03 : 0.02}
                        saturation={activeFilter === filter.value ? 110 : 100}
                        aberrationIntensity={activeFilter === filter.value ? 0.5 : 0.2}
                        elasticity={0.3}
                        cornerRadius={999}
                        overLight={theme === 'light'}
                        onClick={() => setActiveFilter(filter.value)}
                        className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                      >
                        <div className={`px-4 py-2 text-sm font-medium transition-all ${
                          activeFilter === filter.value
                            ? 'text-white drop-shadow-md font-semibold'
                            : 'text-white/90 hover:text-white'
                        }`}>
                          {filter.label}
                        </div>
                      </LiquidGlass>
                    ))}
                    <div className="ml-2 flex items-center">
                      <LiquidGlass 
                        displacementScale={35}
                        blurAmount={0.06}
                        saturation={115}
                        elasticity={0.5}
                        cornerRadius={8}
                        overLight={theme === 'light'}
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                      >
                        <div className="p-2 text-white/80 hover:text-white transition-colors">
                          <GridIcon size={18} />
                        </div>
                      </LiquidGlass>
                    </div>
                  </div>
                </LiquidGlass>
              </div>

              {/* Select All Toggle with Liquid Glass */}
              <div className="flex items-center justify-center">
                <LiquidGlass 
                  displacementScale={55}
                  blurAmount={0.12}
                  saturation={135}
                  aberrationIntensity={2}
                  elasticity={0.45}
                  cornerRadius={16}
                  overLight={theme === 'light'}
                  onClick={toggleSelectAll}
                  className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                >
                  <div className="flex items-center space-x-3 p-3">
                    <LiquidGlass 
                      displacementScale={allVisibleSelected ? 40 : 25}
                      blurAmount={allVisibleSelected ? 0.08 : 0.05}
                      saturation={allVisibleSelected ? 160 : 120}
                      aberrationIntensity={allVisibleSelected ? 2.5 : 1.5}
                      elasticity={0.6}
                      cornerRadius={6}
                      overLight={!allVisibleSelected} // Inverted for checkbox effect
                    >
                      <div className={`w-6 h-6 flex items-center justify-center transition-all ${
                        allVisibleSelected
                          ? 'text-purple-600'
                          : 'border-2 border-white/50'
                      }`}>
                        {allVisibleSelected && <CheckIcon size={14} className="drop-shadow-sm" />}
                      </div>
                    </LiquidGlass>
                    <span className="text-white font-medium drop-shadow-sm">Seleccionar todas</span>
                  </div>
                </LiquidGlass>
              </div>
            </div>

            {/* Photos Grid with iOS Glass Effect */}
            <div className="pb-24">
              {filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredPhotos.map((photo) => (
                    <LiquidGlass 
                      key={photo.id}
                      displacementScale={25}
                      blurAmount={0.06}
                      saturation={105}
                      aberrationIntensity={0.8}
                      elasticity={0.2}
                      cornerRadius={16}
                      overLight={theme === 'light'}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-checkbox]')) {
                          togglePhotoSelection(photo.id);
                        } else {
                          openPhotoModal(photo);
                        }
                      }}
                      className="cursor-pointer transform hover:scale-105 active:scale-95 transition-transform duration-300"
                    >
                      <div className="overflow-hidden">
                        <div className="relative aspect-square">
                          {/* Liquid Glass Checkbox */}
                          <div className="absolute top-3 left-3 z-10">
                            <LiquidGlass 
                              displacementScale={selectedPhotos.has(photo.id) ? 12 : 8}
                              blurAmount={selectedPhotos.has(photo.id) ? 0.03 : 0.02}
                              saturation={selectedPhotos.has(photo.id) ? 115 : 105}
                              aberrationIntensity={selectedPhotos.has(photo.id) ? 0.6 : 0.3}
                              elasticity={0.3}
                              cornerRadius={6}
                              overLight={!selectedPhotos.has(photo.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePhotoSelection(photo.id);
                              }}
                              className="cursor-pointer transform hover:scale-110 transition-transform"
                            >
                              <div data-checkbox className="w-6 h-6 flex items-center justify-center p-1">
                                {selectedPhotos.has(photo.id) && (
                                  <CheckIcon size={14} className="text-purple-600 drop-shadow-md animate-pulse" />
                                )}
                              </div>
                            </LiquidGlass>
                          </div>

                          {/* Liquid Glass Status Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <LiquidGlass 
                              displacementScale={40}
                              blurAmount={0.08}
                              saturation={150}
                              aberrationIntensity={2}
                              elasticity={0.4}
                              cornerRadius={999}
                              overLight={false} // Always dark for emerald background
                            >
                              <div className="px-3 py-1 text-white text-xs font-semibold">
                                Aprobada
                              </div>
                            </LiquidGlass>
                          </div>

                          {/* Photo Content with Enhanced Glass */}
                          <div className="w-full h-full flex items-center justify-center relative">
                            <LiquidGlass 
                              displacementScale={60}
                              blurAmount={0.12}
                              saturation={120}
                              aberrationIntensity={1.8}
                              elasticity={0.35}
                              cornerRadius={12}
                              overLight={theme === 'light'}
                              className="transform hover:scale-105 transition-transform duration-300"
                            >
                              <div className="w-16 h-16 flex items-center justify-center p-4">
                                <svg className="w-full h-full text-white/80 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </LiquidGlass>
                          </div>
                        </div>

                        {/* Photo Info with Liquid Glass */}
                        <LiquidGlass 
                          displacementScale={45}
                          blurAmount={0.08}
                          saturation={125}
                          aberrationIntensity={1.5}
                          elasticity={0.3}
                          cornerRadius={0} // Bottom part of card
                          overLight={theme === 'light'}
                        >
                          <div className="p-4">
                            <div className="text-white font-medium text-sm mb-1 drop-shadow-sm">{photo.name}</div>
                            <div className="flex justify-between text-white/80 text-xs">
                              <span className="drop-shadow-sm">{photo.sizeKB} KB</span>
                              <span className="drop-shadow-sm">{photo.date}</span>
                            </div>
                          </div>
                        </LiquidGlass>
                      </div>
                    </LiquidGlass>
                  ))}
                </div>
              ) : (
                <LiquidGlass 
                  displacementScale={60}
                  blurAmount={0.15}
                  saturation={120}
                  aberrationIntensity={2}
                  elasticity={0.3}
                  cornerRadius={16}
                  overLight={theme === 'light'}
                  className="text-center"
                >
                  <div className="p-8">
                    <LiquidGlass 
                      displacementScale={40}
                      blurAmount={0.1}
                      saturation={110}
                      aberrationIntensity={1.5}
                      elasticity={0.4}
                      cornerRadius={999}
                      overLight={theme === 'light'}
                      className="inline-block mb-4"
                    >
                      <div className="w-16 h-16 flex items-center justify-center p-4">
                        <svg className="w-full h-full text-white/80 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </LiquidGlass>
                    <h3 className="text-white font-medium mb-2 drop-shadow-sm">No se encontraron fotos</h3>
                    <p className="text-white/80 text-sm drop-shadow-sm">
                      {searchQuery ? 
                        `No hay fotos que coincidan con "${searchQuery}".` :
                        'No hay fotos disponibles con los filtros seleccionados.'
                      }
                    </p>
                  </div>
                </LiquidGlass>
              )}
            </div>
          </div>
        </div>

        {/* SIMPLE Liquid Glass FAB */}
        <div className="fixed bottom-6 right-6 z-50">
          <LiquidGlass 
            displacementScale={hasSelection ? 25 : 20}
            blurAmount={0.08}
            saturation={hasSelection ? 110 : 105}
            aberrationIntensity={hasSelection ? 0.8 : 0.6}
            elasticity={0.1}
            cornerRadius={999}
            overLight={false}
            onClick={handleFabAction}
            className="cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-300 w-16 h-16 flex items-center justify-center shadow-2xl"
            style={{
              background: hasSelection 
                ? 'linear-gradient(135deg, #10b981, #059669, #047857)' 
                : 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
              boxShadow: hasSelection
                ? `0 20px 40px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                : `0 20px 40px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
            }}
          >
            <div className="text-white relative z-10">
              {hasSelection ? (
                <div className="flex flex-col items-center justify-center animate-pulse">
                  <LiquidGlass 
                    displacementScale={8}
                    blurAmount={0.02}
                    saturation={105}
                    aberrationIntensity={0.3}
                    elasticity={0.3}
                    cornerRadius={4}
                    overLight={true}
                    className="mb-1"
                  >
                    <CheckIcon size={18} className="drop-shadow-lg text-white" />
                  </LiquidGlass>
                  {selectedCount > 0 && (
                    <LiquidGlass 
                      displacementScale={6}
                      blurAmount={0.02}
                      saturation={105}
                      aberrationIntensity={0.2}
                      elasticity={0.3}
                      cornerRadius={999}
                      overLight={false}
                    >
                      <span className="text-xs font-bold px-1.5 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">
                        {selectedCount > 99 ? '99+' : selectedCount}
                      </span>
                    </LiquidGlass>
                  )}
                </div>
              ) : (
                <LiquidGlass 
                  displacementScale={8}
                  blurAmount={0.02}
                  saturation={105}
                  aberrationIntensity={0.3}
                  elasticity={0.3}
                  cornerRadius={6}
                  overLight={true}
                  className="group-hover:rotate-90 transition-transform duration-300"
                >
                  <svg className="w-6 h-6 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </LiquidGlass>
              )}
            </div>
            
            {/* Animated glow effect */}
            <div className={`absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 ${
              hasSelection 
                ? 'bg-gradient-to-br from-emerald-300/30 to-emerald-600/30' 
                : 'bg-gradient-to-br from-blue-300/30 to-blue-600/30'
            } blur-xl scale-150 animate-pulse`} />
          </LiquidGlass>
        </div>

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