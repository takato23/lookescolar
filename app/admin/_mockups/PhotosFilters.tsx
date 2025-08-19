'use client';

import React, { useState, useEffect } from 'react';
import LiquidGlass from 'liquid-glass-react';
import { SearchIcon, GridIcon, ListIcon, CheckIcon } from './icons';
import { PhotoStatus } from './PhotoCard';

interface PhotosFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (status: PhotoStatus | 'all') => void;
  onSelectAllToggle: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  allSelected: boolean;
  hasSelection: boolean;
  activeFilter: PhotoStatus | 'all';
  viewMode: 'grid' | 'list';
  totalCount: number;
}

const filterOptions = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'approved' as const, label: 'Aprobadas' },
  { value: 'pending' as const, label: 'Pendientes' },
  { value: 'tagged' as const, label: 'Etiquetadas' },
];

export const PhotosFilters: React.FC<PhotosFiltersProps> = ({
  onSearch,
  onFilterChange,
  onSelectAllToggle,
  onViewModeChange,
  allSelected,
  hasSelection,
  activeFilter,
  viewMode,
  totalCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchQuery);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <LiquidGlass
      displacementScale={35}
      blurAmount={0.1}
      elasticity={0.25}
      cornerRadius={0}
      overLight={true}
      saturation={130}
      aberrationIntensity={1.5}
      className="sticky top-0 z-40 border-b border-gray-200/50"
    >
      <div className="space-y-4 p-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Fotos ({totalCount})
        </h2>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-pressed={viewMode === 'grid'}
              aria-label="Vista de cuadrícula"
            >
              <GridIcon size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-pressed={viewMode === 'list'}
              aria-label="Vista de lista"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Buscar fotos por nombre..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Buscar fotos"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeFilter === filter.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={activeFilter === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Select All Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSelectAllToggle}
          className="flex items-center space-x-2 p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-pressed={allSelected}
        >
          <div className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
            allSelected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 bg-white'
          }`}>
            {allSelected && <CheckIcon size={12} />}
          </div>
          <span className="text-sm font-medium text-gray-700">
            Seleccionar todas
          </span>
        </button>

        {hasSelection && (
          <div className="text-xs text-blue-600 font-medium">
            Fotos seleccionadas
          </div>
        )}
      </div>
    </div>
    </LiquidGlass>
  );
};