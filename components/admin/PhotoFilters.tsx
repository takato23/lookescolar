'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GridIcon, 
  ListIcon, 
  CalendarIcon, 
  FilterIcon,
  XIcon,
  ChevronDownIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
export type SortBy = 'date_desc' | 'date_asc' | 'name' | 'size';

interface PhotoFiltersProps {
  viewMode: ViewMode;
  dateFilter: DateFilter;
  sortBy: SortBy;
  onViewModeChange: (mode: ViewMode) => void;
  onDateFilterChange: (filter: DateFilter) => void;
  onSortByChange: (sort: SortBy) => void;
  photoCount: number;
  filteredCount?: number;
  className?: string;
}

export function PhotoFilters({
  viewMode,
  dateFilter,
  sortBy,
  onViewModeChange,
  onDateFilterChange,
  onSortByChange,
  photoCount,
  filteredCount,
  className
}: PhotoFiltersProps) {
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  useEffect(() => {
    setHasActiveFilters(dateFilter !== 'all' || sortBy !== 'date_desc');
  }, [dateFilter, sortBy]);

  const clearFilters = () => {
    onDateFilterChange('all');
    onSortByChange('date_desc');
  };

  const getDateFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case 'today': return 'Hoy';
      case 'week': return 'Esta semana';
      case 'month': return 'Este mes';
      case 'custom': return 'Personalizado';
      default: return 'Todas las fechas';
    }
  };

  const getSortByLabel = (sort: SortBy) => {
    switch (sort) {
      case 'date_asc': return 'Más antiguas primero';
      case 'name': return 'Por nombre';
      case 'size': return 'Por tamaño';
      default: return 'Más recientes primero';
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="h-8 px-3"
        >
          <GridIcon className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Grilla</span>
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="h-8 px-3"
        >
          <ListIcon className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Lista</span>
        </Button>
      </div>

      {/* Date Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <CalendarIcon className="w-4 h-4 mr-2" />
            {getDateFilterLabel(dateFilter)}
            <ChevronDownIcon className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filtrar por fecha</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup 
            value={dateFilter} 
            onValueChange={(value) => onDateFilterChange(value as DateFilter)}
          >
            <DropdownMenuRadioItem value="all">
              Todas las fechas
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="today">
              Hoy
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="week">
              Esta semana
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="month">
              Este mes
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <FilterIcon className="w-4 h-4 mr-2" />
            {getSortByLabel(sortBy)}
            <ChevronDownIcon className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup 
            value={sortBy} 
            onValueChange={(value) => onSortByChange(value as SortBy)}
          >
            <DropdownMenuRadioItem value="date_desc">
              Más recientes primero
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="date_asc">
              Más antiguas primero
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">
              Por nombre
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="size">
              Por tamaño
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="w-4 h-4 mr-1" />
          Limpiar filtros
        </Button>
      )}

      {/* Photo Count */}
      <div className="flex items-center gap-2 ml-auto">
        {filteredCount !== undefined && filteredCount !== photoCount && (
          <Badge variant="secondary" className="text-xs">
            {filteredCount} de {photoCount} fotos
          </Badge>
        )}
        {(filteredCount === undefined || filteredCount === photoCount) && (
          <Badge variant="secondary" className="text-xs">
            {photoCount} fotos
          </Badge>
        )}
      </div>
    </div>
  );
}