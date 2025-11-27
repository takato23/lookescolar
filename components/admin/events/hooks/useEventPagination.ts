'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminEvent } from '../types';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface UseEventPaginationOptions {
  /** Initial events from server-side rendering */
  initialEvents?: AdminEvent[];
  /** Initial pagination state */
  initialPagination?: Pagination | null;
  /** Page size */
  pageSize?: number;
  /** Fetch timeout in milliseconds */
  fetchTimeout?: number;
  /** IntersectionObserver root margin */
  observerRootMargin?: string;
}

export interface FetchEventsParams {
  page: number;
  limit: number;
  status?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
}

export interface UseEventPaginationReturn {
  // Data
  events: AdminEvent[];
  pagination: Pagination | null;

  // Loading states
  loadingFirstPage: boolean;
  loadingMore: boolean;

  // Error state
  error: string | null;

  // Actions
  loadFirstPage: () => Promise<void>;
  loadMore: () => Promise<void>;
  setEvents: React.Dispatch<React.SetStateAction<AdminEvent[]>>;
  setPagination: React.Dispatch<React.SetStateAction<Pagination | null>>;

  // Sentinel ref for infinite scroll
  sentinelRef: React.RefObject<HTMLDivElement>;

  // Computed
  hasMore: boolean;
  isInitialLoad: boolean;
}

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_FETCH_TIMEOUT = 10000;
const DEFAULT_OBSERVER_MARGIN = '240px';

export function useEventPagination(
  fetchFn: (params: FetchEventsParams) => Promise<{
    events: AdminEvent[];
    pagination: Pagination | null;
  }>,
  options: UseEventPaginationOptions = {}
): UseEventPaginationReturn {
  const {
    initialEvents = [],
    initialPagination = null,
    pageSize = DEFAULT_PAGE_SIZE,
    observerRootMargin = DEFAULT_OBSERVER_MARGIN,
  } = options;

  const [events, setEvents] = useState<AdminEvent[]>(initialEvents);
  const [pagination, setPagination] = useState<Pagination | null>(() => {
    if (initialPagination) return initialPagination;
    if (initialEvents.length === 0) return null;
    return {
      page: 1,
      limit: pageSize,
      total: initialEvents.length,
      total_pages: 1,
      has_more: false,
    };
  });

  const [loadingFirstPage, setLoadingFirstPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialLoadRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync initial events when they change
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (initialPagination) {
      setPagination(initialPagination);
    } else if (initialEvents.length > 0 && !pagination) {
      setPagination({
        page: 1,
        limit: pageSize,
        total: initialEvents.length,
        total_pages: 1,
        has_more: false,
      });
    }
  }, [initialPagination, initialEvents.length, pageSize]);

  // Load first page
  const loadFirstPage = useCallback(async () => {
    setLoadingFirstPage(true);
    setError(null);

    try {
      const result = await fetchFn({
        page: 1,
        limit: pagination?.limit ?? pageSize,
      });

      if (!result) return;

      setEvents(result.events);
      setPagination((prev) => {
        if (result.pagination) return result.pagination;
        if (result.events.length === 0) return null;
        const fallbackLimit = prev?.limit ?? pageSize;
        return {
          page: 1,
          limit: fallbackLimit,
          total: result.events.length,
          total_pages: 1,
          has_more: result.events.length >= fallbackLimit,
        };
      });
    } catch (err) {
      console.error('Failed to refresh events', err);
      setError('No pudimos actualizar la lista de eventos. Intenta nuevamente.');
    } finally {
      setLoadingFirstPage(false);
    }
  }, [fetchFn, pagination?.limit, pageSize]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.has_more) return;
    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = (pagination?.page ?? 1) + 1;
      const result = await fetchFn({
        page: nextPage,
        limit: pagination?.limit ?? pageSize,
      });

      if (!result) return;

      let appended = 0;
      setEvents((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const unique = result.events.filter(
          (item) => item && item.id && !existingIds.has(item.id)
        );
        appended = unique.length;
        if (unique.length === 0) return prev;
        return [...prev, ...unique];
      });

      setPagination((prev) => {
        if (result.pagination) return result.pagination;
        if (!prev) {
          return {
            page: nextPage,
            limit: pageSize,
            total: appended,
            total_pages: nextPage,
            has_more: appended >= pageSize,
          };
        }
        return {
          ...prev,
          page: nextPage,
          total: prev.total + appended,
          has_more: appended > 0 && appended >= (prev.limit ?? pageSize),
        };
      });
    } catch (err) {
      console.error('Failed to load more events', err);
      setError('No pudimos cargar mas eventos.');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFn, loadingMore, pagination, pageSize]);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!pagination?.has_more) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: observerRootMargin }
    );

    const current = sentinelRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
      observer.disconnect();
    };
  }, [loadMore, pagination?.has_more, observerRootMargin]);

  // Initial load
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      if (initialEvents.length === 0) {
        void loadFirstPage();
      }
      return;
    }
    void loadFirstPage();
  }, []);

  return {
    events,
    pagination,
    loadingFirstPage,
    loadingMore,
    error,
    loadFirstPage,
    loadMore,
    setEvents,
    setPagination,
    sentinelRef: sentinelRef as React.RefObject<HTMLDivElement>,
    hasMore: pagination?.has_more ?? false,
    isInitialLoad: initialLoadRef.current,
  };
}
