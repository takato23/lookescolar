'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list' | 'timeline';
export type SortBy = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'revenue_desc' | 'photos_desc';
export type FilterBy = 'all' | 'active' | 'draft' | 'completed';

export interface EventData {
  id: string;
  school: string;
  date: string;
  active: boolean | null;
  photo_price?: number;
  created_at: string | null;
  updated_at: string | null;
  stats?: {
    totalPhotos: number;
    totalSubjects: number;
    totalOrders: number;
    revenue: number;
    untaggedPhotos: number;
    pendingOrders: number;
    completionRate: number;
    engagement: number;
  };
  metadata?: {
    colorScheme: string;
    priority: 'high' | 'medium' | 'low';
  };
}

export interface NeuralEventsState {
  // Data
  events: EventData[];
  isLoading: boolean;
  error: string | null;
  
  // View state
  viewMode: ViewMode;
  sortBy: SortBy;
  filterBy: FilterBy;
  searchQuery: string;
  
  // Selection
  selectedEvents: string[];
  
  // UI state
  showStatsPanel: boolean;
  compactMode: boolean;
  
  // Actions
  setEvents: (events: EventData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // View actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setFilterBy: (filter: FilterBy) => void;
  setSearchQuery: (query: string) => void;
  
  // Selection actions
  toggleEventSelection: (eventId: string) => void;
  selectAllEvents: () => void;
  clearSelection: () => void;
  
  // UI actions
  toggleStatsPanel: () => void;
  toggleCompactMode: () => void;
  
  // Data actions
  refreshEvents: () => Promise<void>;
  updateEvent: (eventId: string, updates: Partial<EventData>) => void;
  removeEvent: (eventId: string) => void;
  
  // Computed
  getFilteredEvents: () => EventData[];
  getSortedEvents: (events: EventData[]) => EventData[];
  getTotalStats: () => {
    totalEvents: number;
    totalPhotos: number;
    totalRevenue: number;
    totalSubjects: number;
    avgCompletionRate: number;
  };
}

export const useNeuralEventsStore = create<NeuralEventsState>()(devtools(
  (set, get) => ({
    // Initial state
    events: [],
    isLoading: false,
    error: null,
    
    viewMode: 'grid',
    sortBy: 'date_desc',
    filterBy: 'all',
    searchQuery: '',
    
    selectedEvents: [],
    
    showStatsPanel: true,
    compactMode: false,
    
    // Basic setters
    setEvents: (events) => set({ events }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    // View actions
    setViewMode: (viewMode) => {
      set({ viewMode });
      // Auto-enable compact mode for grid on large screens
      if (viewMode === 'grid' && window.innerWidth >= 1920) {
        set({ compactMode: true });
      }
    },
    
    setSortBy: (sortBy) => set({ sortBy }),
    setFilterBy: (filterBy) => set({ filterBy }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    
    // Selection actions
    toggleEventSelection: (eventId) => {
      const { selectedEvents } = get();
      const isSelected = selectedEvents.includes(eventId);
      
      set({
        selectedEvents: isSelected
          ? selectedEvents.filter(id => id !== eventId)
          : [...selectedEvents, eventId],
      });
    },
    
    selectAllEvents: () => {
      const { events } = get();
      set({ selectedEvents: events.map(e => e.id) });
    },
    
    clearSelection: () => set({ selectedEvents: [] }),
    
    // UI actions
    toggleStatsPanel: () => set((state) => ({ showStatsPanel: !state.showStatsPanel })),
    toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
    
    // Data actions
    refreshEvents: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await fetch('/api/admin/events?include_stats=true');
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        const events = Array.isArray(data) ? data : (data.events || []);
        
        set({ events, isLoading: false });
      } catch (error) {
        console.error('Error fetching events:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false 
        });
      }
    },
    
    updateEvent: (eventId, updates) => {
      set((state) => ({
        events: state.events.map(event =>
          event.id === eventId ? { ...event, ...updates } : event
        ),
      }));
    },
    
    removeEvent: (eventId) => {
      set((state) => ({
        events: state.events.filter(event => event.id !== eventId),
        selectedEvents: state.selectedEvents.filter(id => id !== eventId),
      }));
    },
    
    // Computed functions
    getFilteredEvents: () => {
      const { events, filterBy, searchQuery } = get();
      
      let filtered = events;
      
      // Apply filter
      if (filterBy !== 'all') {
        filtered = filtered.filter(event => {
          switch (filterBy) {
            case 'active':
              return event.active === true;
            case 'draft':
              return event.active === false || event.active === null;
            case 'completed':
              return event.stats && event.stats.completionRate === 100;
            default:
              return true;
          }
        });
      }
      
      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.school.toLowerCase().includes(query) ||
          new Date(event.date).toLocaleDateString().includes(query)
        );
      }
      
      return filtered;
    },
    
    getSortedEvents: (events) => {
      const { sortBy } = get();
      
      return [...events].sort((a, b) => {
        switch (sortBy) {
          case 'date_desc':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'date_asc':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'name_asc':
            return a.school.localeCompare(b.school);
          case 'name_desc':
            return b.school.localeCompare(a.school);
          case 'revenue_desc':
            return (b.stats?.revenue || 0) - (a.stats?.revenue || 0);
          case 'photos_desc':
            return (b.stats?.totalPhotos || 0) - (a.stats?.totalPhotos || 0);
          default:
            return 0;
        }
      });
    },
    
    getTotalStats: () => {
      const { events } = get();
      
      return events.reduce(
        (totals, event) => ({
          totalEvents: totals.totalEvents + 1,
          totalPhotos: totals.totalPhotos + (event.stats?.totalPhotos || 0),
          totalRevenue: totals.totalRevenue + (event.stats?.revenue || 0),
          totalSubjects: totals.totalSubjects + (event.stats?.totalSubjects || 0),
          avgCompletionRate: totals.avgCompletionRate + (event.stats?.completionRate || 0),
        }),
        {
          totalEvents: 0,
          totalPhotos: 0,
          totalRevenue: 0,
          totalSubjects: 0,
          avgCompletionRate: 0,
        }
      );
    },
  }),
  {
    name: 'neural-events-store',
  }
));