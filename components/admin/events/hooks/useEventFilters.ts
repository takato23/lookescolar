'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import type { AdminEvent, EventViewMode } from '../types';

export interface EventFiltersState {
  searchTerm: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  viewMode: EventViewMode;
}

export interface UseEventFiltersOptions {
  /** Debounce delay for search in milliseconds */
  debounceMs?: number;
  /** Sync filters to URL */
  syncToUrl?: boolean;
}

export interface UseEventFiltersReturn {
  // Filter state (grouped)
  filters: EventFiltersState;

  // Filter state (individual) - for convenience
  searchTerm: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  viewMode: EventViewMode;
  debouncedQuery: string;

  // Setters
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setViewMode: (value: EventViewMode) => void;

  // Utilities
  resetFilters: () => void;
  hasFilters: boolean;
  activeFiltersCount: number;

  // Computed date values
  startDateValue: Date | null;
  endDateValue: Date | null;

  // Filter function
  filterEvents: (events: AdminEvent[]) => AdminEvent[];
}

const DEFAULT_DEBOUNCE_MS = 300;

export const STATUS_LABELS: Record<string, string> = {
  all: 'todos',
  active: 'activos',
  completed: 'completados',
  draft: 'en borrador',
  archived: 'archivados',
  inactive: 'inactivos',
  paused: 'pausados',
  error: 'con errores',
};

export function useEventFilters(
  options: UseEventFiltersOptions = {}
): UseEventFiltersReturn {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, syncToUrl = true } = options;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get('q') ?? ''
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') ?? 'all'
  );
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('from') ?? ''
  );
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('to') ?? ''
  );
  const [viewMode, setViewMode] = useState<EventViewMode>(
    searchParams.get('view') === 'list' ? 'list' : 'grid'
  );

  const debouncedQuery = useDebounce(searchTerm, debounceMs);

  // Sync to URL when filters change
  const syncFiltersToUrl = useCallback(() => {
    if (!syncToUrl || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    if (debouncedQuery) params.set('q', debouncedQuery);
    else params.delete('q');

    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    else params.delete('status');

    if (startDate) params.set('from', startDate);
    else params.delete('from');

    if (endDate) params.set('to', endDate);
    else params.delete('to');

    params.delete('page');
    params.delete('offset');
    params.set('view', viewMode);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, endDate, router, startDate, statusFilter, viewMode, syncToUrl]);

  // Computed values
  const startDateValue = useMemo(
    () => (startDate ? new Date(`${startDate}T00:00:00`) : null),
    [startDate]
  );

  const endDateValue = useMemo(
    () => (endDate ? new Date(`${endDate}T23:59:59.999`) : null),
    [endDate]
  );

  const hasFilters = useMemo(
    () =>
      statusFilter !== 'all' ||
      Boolean(debouncedQuery) ||
      Boolean(startDate) ||
      Boolean(endDate),
    [statusFilter, debouncedQuery, startDate, endDate]
  );

  const activeFiltersCount = useMemo(() => {
    const hasSearch = debouncedQuery.trim().length > 0;
    const hasDateFilters = Boolean(startDate || endDate);
    const hasStatusFilters = statusFilter !== 'all';
    return [hasSearch, hasStatusFilters, hasDateFilters].filter(Boolean).length;
  }, [debouncedQuery, startDate, endDate, statusFilter]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  }, []);

  // Filter events
  const filterEvents = useCallback(
    (events: AdminEvent[]): AdminEvent[] => {
      const query = debouncedQuery.trim().toLowerCase();
      const desiredStatus = statusFilter.toLowerCase();

      return events.filter((event) => {
        const statusNormalized = event.status?.toString().toLowerCase();
        const matchesStatus =
          desiredStatus === 'all' || statusNormalized === desiredStatus;

        const matchesQuery =
          !query ||
          [event.name, event.school, event.location]
            .filter(
              (field): field is string =>
                typeof field === 'string' && field.trim().length > 0
            )
            .some((field) => field.toLowerCase().includes(query));

        if (!matchesStatus || !matchesQuery) return false;

        if (!startDateValue && !endDateValue) return true;

        if (!event.date) return false;
        const currentDate = new Date(event.date);
        if (Number.isNaN(currentDate.getTime())) return false;

        if (startDateValue && currentDate < startDateValue) return false;
        if (endDateValue && currentDate > endDateValue) return false;

        return true;
      });
    },
    [debouncedQuery, statusFilter, startDateValue, endDateValue]
  );

  return {
    // Grouped state
    filters: {
      searchTerm,
      statusFilter,
      startDate,
      endDate,
      viewMode,
    },
    // Individual state
    searchTerm,
    statusFilter,
    startDate,
    endDate,
    viewMode,
    debouncedQuery,
    // Setters
    setSearchTerm,
    setStatusFilter,
    setStartDate,
    setEndDate,
    setViewMode,
    // Utilities
    resetFilters,
    hasFilters,
    activeFiltersCount,
    startDateValue,
    endDateValue,
    filterEvents,
  };
}
