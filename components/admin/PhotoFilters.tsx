'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  SearchIcon, 
  FilterIcon, 
  XIcon, 
  CalendarIcon,
  FolderIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TagIcon,
  ChevronDownIcon,
  RotateCcwIcon,
  GridIcon,
  ListIcon,
  ColumnsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Filter types
export interface PhotoFilters {
  search: string;
  eventId?: string;
  subjectId?: string;
  approved?: boolean;
  tagged?: boolean;
  withFolder?: boolean;
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  customDateStart?: string;
  customDateEnd?: string;
}

export interface Event {
  id: string;
  name: string;
  event_date?: string;
  school_name?: string;
}

export interface Subject {
  id: string;
  name: string;
  event_id: string;
  event_name?: string;
}

export interface ViewSettings {
  mode: 'grid' | 'list';
  density: 'compact' | 'normal' | 'comfortable';
}

interface PhotoFiltersProps {
  events: Event[];
  subjects: Subject[];
  filters: PhotoFilters;
  onFiltersChange: (filters: PhotoFilters) => void;
  viewSettings: ViewSettings;
  onViewSettingsChange: (settings: ViewSettings) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
  isLoading?: boolean;
}

// Hook for localStorage persistence
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue] as const;
}

// Date range helpers
const getDateRangeLabel = (range: string) => {
  switch (range) {
    case 'today': return 'Hoy';
    case 'week': return 'Esta semana';
    case 'month': return 'Este mes';
    case 'custom': return 'Personalizado';
    default: return 'Todas';
  }
};

export default function PhotoFilters({
  events,
  subjects,
  filters,
  onFiltersChange,
  viewSettings,
  onViewSettingsChange,
  resultCount,
  totalCount,
  className,
  isLoading = false
}: PhotoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for UI
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  
  // Persist view settings
  const [persistedViewSettings, setPersistedViewSettings] = useLocalStorage<ViewSettings>(
    'admin-photos-view-settings', 
    { mode: 'grid', density: 'normal' }
  );

  // Sync persisted settings with props
  useEffect(() => {
    if (viewSettings.mode !== persistedViewSettings.mode || 
        viewSettings.density !== persistedViewSettings.density) {
      onViewSettingsChange(persistedViewSettings);
    }
  }, [persistedViewSettings, viewSettings, onViewSettingsChange]);

  // Handle view settings change with persistence
  const handleViewSettingsChange = useCallback((newSettings: Partial<ViewSettings>) => {
    const updated = { ...viewSettings, ...newSettings };
    setPersistedViewSettings(updated);
    onViewSettingsChange(updated);
  }, [viewSettings, setPersistedViewSettings, onViewSettingsChange]);

  // Update URL params when filters change
  const updateUrlParams = useCallback((newFilters: PhotoFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update search params
    if (newFilters.search) {
      params.set('search', newFilters.search);
    } else {
      params.delete('search');
    }
    
    if (newFilters.eventId) {
      params.set('eventId', newFilters.eventId);
    } else {
      params.delete('eventId');
    }
    
    if (newFilters.subjectId) {
      params.set('subjectId', newFilters.subjectId);
    } else {
      params.delete('subjectId');
    }
    
    if (newFilters.approved !== undefined) {
      params.set('approved', String(newFilters.approved));
    } else {
      params.delete('approved');
    }
    
    if (newFilters.tagged !== undefined) {
      params.set('tagged', String(newFilters.tagged));
    } else {
      params.delete('tagged');
    }
    
    if (newFilters.withFolder !== undefined) {
      params.set('withFolder', String(newFilters.withFolder));
    } else {
      params.delete('withFolder');
    }
    
    if (newFilters.dateRange && newFilters.dateRange !== 'all') {
      params.set('dateRange', newFilters.dateRange);
    } else {
      params.delete('dateRange');
    }
    
    // Replace URL without causing navigation
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Debounced search handler
  const debouncedSearch = useMemo(() => {
    const timeoutRef = { current: null as NodeJS.Timeout | null };
    
    return (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        const newFilters = { ...filters, search: value };
        onFiltersChange(newFilters);
        updateUrlParams(newFilters);
      }, 300);
    };
  }, [filters, onFiltersChange, updateUrlParams]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle filter toggle
  const handleFilterToggle = useCallback((key: keyof PhotoFilters, value?: any) => {
    const newFilters = {
      ...filters,
      [key]: filters[key] === value ? undefined : value
    };
    onFiltersChange(newFilters);
    updateUrlParams(newFilters);
  }, [filters, onFiltersChange, updateUrlParams]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const clearedFilters: PhotoFilters = { search: '' };
    setSearchInput('');
    onFiltersChange(clearedFilters);
    updateUrlParams(clearedFilters);
  }, [onFiltersChange, updateUrlParams]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.eventId) count++;
    if (filters.subjectId) count++;
    if (filters.approved !== undefined) count++;
    if (filters.tagged !== undefined) count++;
    if (filters.withFolder !== undefined) count++;
    if (filters.dateRange && filters.dateRange !== 'all') count++;
    return count;
  }, [filters]);

  // Get selected event and subject names
  const selectedEvent = events.find(e => e.id === filters.eventId);
  const selectedSubject = subjects.find(s => s.id === filters.subjectId);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main search and controls bar */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg backdrop-blur-sm">
        {/* Search input with highlighting */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, evento o carpeta..."
            className={cn(
              "w-full pl-10 pr-10 py-2.5 text-sm",
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
              "border border-slate-300 dark:border-slate-600 rounded-lg",
              "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "transition-colors duration-200",
              filters.search && "ring-2 ring-blue-200 dark:ring-blue-800"
            )}
            disabled={isLoading}
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-white/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg p-1 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewSettingsChange({ mode: 'grid' })}
            className={cn(
              "h-8 px-3 rounded-md transition-all duration-200",
              viewSettings.mode === 'grid' 
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <GridIcon className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Grid</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewSettingsChange({ mode: 'list' })}
            className={cn(
              "h-8 px-3 rounded-md transition-all duration-200",
              viewSettings.mode === 'list' 
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <ListIcon className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Lista</span>
          </Button>
        </div>

        {/* Density control */}
        <div className="hidden md:flex items-center bg-white/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg p-1 backdrop-blur-sm">
          {(['compact', 'normal', 'comfortable'] as const).map((density) => (
            <Button
              key={density}
              variant="ghost"
              size="sm"
              onClick={() => handleViewSettingsChange({ density })}
              className={cn(
                "h-8 px-3 rounded-md transition-all duration-200 text-xs",
                viewSettings.density === density 
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {density === 'compact' ? 'Compacta' : density === 'normal' ? 'Normal' : 'Cómoda'}
            </Button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm transition-all duration-200",
            showAdvancedFilters && "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
          )}
        >
          <FilterIcon className="h-4 w-4 mr-2" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDownIcon className={cn(
            "h-4 w-4 ml-2 transition-transform duration-200",
            showAdvancedFilters && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-medium">
            {isLoading ? 'Cargando...' : (
              <>
                <span className="text-slate-900 dark:text-slate-100 font-semibold">{resultCount}</span>
                {resultCount !== totalCount && (
                  <span className="text-slate-500"> de {totalCount}</span>
                )} foto{resultCount !== 1 ? 's' : ''}
              </>
            )}
          </span>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <RotateCcwIcon className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Advanced filters panel */}
      {showAdvancedFilters && (
        <div className="space-y-4 p-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Event filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Evento</label>
              <select
                value={filters.eventId || ''}
                onChange={(e) => handleFilterToggle('eventId', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                disabled={isLoading}
              >
                <option value="">Todos los eventos</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject/Folder filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Carpeta</label>
              <select
                value={filters.subjectId || ''}
                onChange={(e) => handleFilterToggle('subjectId', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                disabled={isLoading}
              >
                <option value="">Todas las carpetas</option>
                <option value="null">Sin carpeta</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.event_name && `(${subject.event_name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
              <select
                value={filters.dateRange || 'all'}
                onChange={(e) => handleFilterToggle('dateRange', e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                disabled={isLoading}
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          {/* Status filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterToggle('approved', true)}
                className={cn(
                  "transition-all duration-200",
                  filters.approved === true
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                    : "bg-white/60 dark:bg-slate-800/60 hover:bg-green-50 dark:hover:bg-green-900/20"
                )}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Aprobadas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterToggle('approved', false)}
                className={cn(
                  "transition-all duration-200",
                  filters.approved === false
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                    : "bg-white/60 dark:bg-slate-800/60 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                )}
              >
                <AlertCircleIcon className="h-4 w-4 mr-2" />
                Pendientes
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterToggle('tagged', true)}
                className={cn(
                  "transition-all duration-200",
                  filters.tagged === true
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                    : "bg-white/60 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                )}
              >
                <TagIcon className="h-4 w-4 mr-2" />
                Con etiquetas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterToggle('tagged', false)}
                className={cn(
                  "transition-all duration-200",
                  filters.tagged === false
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                    : "bg-white/60 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                )}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Sin etiquetas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterToggle('withFolder', false)}
                className={cn(
                  "transition-all duration-200",
                  filters.withFolder === false
                    ? "bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-800"
                    : "bg-white/60 dark:bg-slate-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/20"
                )}
              >
                <FolderIcon className="h-4 w-4 mr-2" />
                Sin carpeta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Filtros activos:</span>
          <div className="flex flex-wrap gap-1">
            {filters.search && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <SearchIcon className="h-3 w-3 mr-1" />
                "{filters.search}"
              </Badge>
            )}
            {selectedEvent && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                📸 {selectedEvent.name}
              </Badge>
            )}
            {selectedSubject && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <FolderIcon className="h-3 w-3 mr-1" />
                {selectedSubject.name}
              </Badge>
            )}
            {filters.approved === true && (
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Aprobadas
              </Badge>
            )}
            {filters.approved === false && (
              <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                <AlertCircleIcon className="h-3 w-3 mr-1" />
                Pendientes
              </Badge>
            )}
            {filters.tagged === true && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <TagIcon className="h-3 w-3 mr-1" />
                Con etiquetas
              </Badge>
            )}
            {filters.tagged === false && (
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                <XIcon className="h-3 w-3 mr-1" />
                Sin etiquetas
              </Badge>
            )}
            {filters.withFolder === false && (
              <Badge variant="outline" className="bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-800">
                <FolderIcon className="h-3 w-3 mr-1" />
                Sin carpeta
              </Badge>
            )}
            {filters.dateRange && filters.dateRange !== 'all' && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {getDateRangeLabel(filters.dateRange)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
