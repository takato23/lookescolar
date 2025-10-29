/**
 * Custom hook for managing photo filter state
 * Extracted from PhotoAdmin.tsx for better organization and reusability
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface UsePhotoFiltersParams {
  initialSearchTerm?: string;
  initialStudentFilter?: string | null;
  initialIncludeSubfolders?: boolean;
  onFiltersChange?: (filters: {
    searchTerm: string;
    studentFilter: string | null;
    includeSubfolders: boolean;
    statusFilter: 'all' | 'ready' | 'processing' | 'pending' | 'error';
    pageSize: 25 | 50 | 100;
    minSizeMB: string;
    maxSizeMB: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export function usePhotoFilters(params?: UsePhotoFiltersParams) {
  const {
    initialSearchTerm = '',
    initialStudentFilter = null,
    initialIncludeSubfolders,
    onFiltersChange,
  } = params || {};

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [studentFilter, setStudentFilter] = useState<string | null>(
    initialStudentFilter
  );
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(() => {
    if (initialIncludeSubfolders !== undefined) return initialIncludeSubfolders;
    
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem('le:includeSubfolders')
          : null;
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {}
    return true; // default ON as requested
  });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'ready' | 'processing' | 'pending' | 'error'
  >('all');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);
  const [minSizeMB, setMinSizeMB] = useState<string>('');
  const [maxSizeMB, setMaxSizeMB] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Debounced search term to prevent excessive queries
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Clear student filter when search term changes
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (studentFilter && (!trimmed || trimmed !== studentFilter)) {
      setStudentFilter(null);
    }
  }, [searchTerm, studentFilter]);

  // Persist includeSubfolders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'le:includeSubfolders',
        includeSubfolders ? 'true' : 'false'
      );
    } catch {}
  }, [includeSubfolders]);

  // Call onFiltersChange when any filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm,
        studentFilter,
        includeSubfolders,
        statusFilter,
        pageSize,
        minSizeMB,
        maxSizeMB,
        startDate,
        endDate,
      });
    }
  }, [
    searchTerm,
    studentFilter,
    includeSubfolders,
    statusFilter,
    pageSize,
    minSizeMB,
    maxSizeMB,
    startDate,
    endDate,
    onFiltersChange,
  ]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStudentFilter(null);
    setIncludeSubfolders(true);
    setStatusFilter('all');
    setMinSizeMB('');
    setMaxSizeMB('');
    setStartDate('');
    setEndDate('');
    setPageSize(50);
  }, []);

  return {
    // Filter state
    searchTerm,
    debouncedSearchTerm,
    studentFilter,
    includeSubfolders,
    statusFilter,
    pageSize,
    minSizeMB,
    maxSizeMB,
    startDate,
    endDate,
    // Setters
    setSearchTerm,
    setStudentFilter,
    setIncludeSubfolders,
    setStatusFilter,
    setPageSize,
    setMinSizeMB,
    setMaxSizeMB,
    setStartDate,
    setEndDate,
    // Utilities
    resetFilters,
  };
}

