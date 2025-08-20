'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, RotateCcw, Calendar, Users, Camera, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  school: string;
  name?: string;
  date: string;
  active: boolean | null;
  stats?: {
    totalPhotos?: number;
    totalSubjects?: number;
    totalOrders?: number;
    revenue?: number;
    untaggedPhotos?: number;
  };
}

interface EventFiltersProps {
  events: Event[];
  onFilteredEventsChange: (filteredEvents: Event[]) => void;
  className?: string;
}

type SortOption = 'recent' | 'oldest' | 'alphabetical' | 'photos' | 'revenue';
type StatusFilter = 'all' | 'active' | 'inactive';

export function EventFilters({ events, onFilteredEventsChange, className }: EventFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events;

    // Apply search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(event => 
        (event.school?.toLowerCase() || '').includes(query) ||
        (event.name?.toLowerCase() || '').includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => {
        if (statusFilter === 'active') return event.active;
        if (statusFilter === 'inactive') return !event.active;
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'alphabetical':
          return (a.school || a.name || '').localeCompare(b.school || b.name || '');
        case 'photos':
          return (b.stats?.totalPhotos || 0) - (a.stats?.totalPhotos || 0);
        case 'revenue':
          return (b.stats?.revenue || 0) - (a.stats?.revenue || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [events, debouncedSearch, statusFilter, sortBy]);

  // Update parent when filtered events change
  useEffect(() => {
    onFilteredEventsChange(filteredAndSortedEvents);
  }, [filteredAndSortedEvents, onFilteredEventsChange]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('recent');
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sortBy !== 'recent';
  const resultsCount = filteredAndSortedEvents.length;
  const totalCount = events.length;

  const sortOptions = [
    { value: 'recent', label: 'Más recientes', icon: Calendar },
    { value: 'oldest', label: 'Más antiguos', icon: Calendar },
    { value: 'alphabetical', label: 'Alfabético A-Z', icon: Users },
    { value: 'photos', label: 'Más fotos', icon: Camera },
    { value: 'revenue', label: 'Mayor recaudación', icon: ShoppingCart },
  ] as const;

  const statusOptions = [
    { value: 'all', label: 'Todos los estados', count: events.length },
    { value: 'active', label: 'Activos', count: events.filter(e => e.active).length },
    { value: 'inactive', label: 'Inactivos', count: events.filter(e => !e.active).length },
  ] as const;

  return (
    <div className={cn('liquid-card space-y-4', className)}>
      {/* Main search and quick controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de escuela..."
            className="liquid-input w-full pl-10 pr-10"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="relative">
            <details className="group">
              <summary className="liquid-button liquid-button-secondary flex items-center gap-2 cursor-pointer list-none">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Estado</span>
                {statusFilter !== 'all' && (
                  <Badge variant="outline" className="liquid-label bg-blue-50 text-blue-700 text-xs">
                    {statusOptions.find(opt => opt.value === statusFilter)?.label}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              </summary>
              
              <div className="absolute right-0 top-full mt-2 w-48 liquid-card bg-white dark:bg-gray-900 border shadow-lg z-50 p-2">
                <div className="space-y-1">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between',
                        statusFilter === option.value
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <span>{option.label}</span>
                      <Badge variant="outline" className="liquid-label text-xs">
                        {option.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* Sort Options */}
          <div className="relative">
            <details className="group">
              <summary className="liquid-button liquid-button-secondary flex items-center gap-2 cursor-pointer list-none">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Ordenar</span>
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              </summary>
              
              <div className="absolute right-0 top-full mt-2 w-52 liquid-card bg-white dark:bg-gray-900 border shadow-lg z-50 p-2">
                <div className="space-y-1">
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
                          sortBy === option.value
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="liquid-button text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Limpiar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="liquid-description">
            Mostrando <span className="liquid-number font-semibold">{resultsCount}</span>
            {resultsCount !== totalCount && (
              <span> de <span className="liquid-number font-semibold">{totalCount}</span></span>
            )} evento{resultsCount !== 1 ? 's' : ''}
          </span>
          
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="liquid-description text-xs">Filtros activos:</span>
              <div className="flex gap-1">
                {searchQuery && (
                  <Badge variant="outline" className="liquid-label bg-blue-50 text-blue-700 text-xs">
                    "{searchQuery}"
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="outline" className="liquid-label bg-green-50 text-green-700 text-xs">
                    {statusOptions.find(opt => opt.value === statusFilter)?.label}
                  </Badge>
                )}
                {sortBy !== 'recent' && (
                  <Badge variant="outline" className="liquid-label bg-purple-50 text-purple-700 text-xs">
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-4 text-xs liquid-description">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{events.filter(e => e.active).length} activos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>{events.filter(e => !e.active).length} inactivos</span>
          </div>
        </div>
      </div>

      {/* No results state */}
      {resultsCount === 0 && hasActiveFilters && (
        <div className="text-center py-8">
          <div className="liquid-card bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-xl">
            <Filter className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="liquid-nav-text font-medium mb-2">No se encontraron eventos</h3>
            <p className="liquid-description text-sm mb-4">
              Intenta ajustar los filtros o cambiar el término de búsqueda.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="liquid-button"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}