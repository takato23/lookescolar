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
  getTotalStats: () => {\n    totalEvents: number;\n    totalPhotos: number;\n    totalRevenue: number;\n    totalSubjects: number;\n    avgCompletionRate: number;\n  };\n}\n\nexport const useNeuralEventsStore = create<NeuralEventsState>()(devtools(\n  (set, get) => ({\n    // Initial state\n    events: [],\n    isLoading: false,\n    error: null,\n    \n    viewMode: 'grid',\n    sortBy: 'date_desc',\n    filterBy: 'all',\n    searchQuery: '',\n    \n    selectedEvents: [],\n    \n    showStatsPanel: true,\n    compactMode: false,\n    \n    // Basic setters\n    setEvents: (events) => set({ events }),\n    setLoading: (isLoading) => set({ isLoading }),\n    setError: (error) => set({ error }),\n    \n    // View actions\n    setViewMode: (viewMode) => {\n      set({ viewMode });\n      // Auto-enable compact mode for grid on large screens\n      if (viewMode === 'grid' && window.innerWidth >= 1920) {\n        set({ compactMode: true });\n      }\n    },\n    \n    setSortBy: (sortBy) => set({ sortBy }),\n    setFilterBy: (filterBy) => set({ filterBy }),\n    setSearchQuery: (searchQuery) => set({ searchQuery }),\n    \n    // Selection actions\n    toggleEventSelection: (eventId) => {\n      const { selectedEvents } = get();\n      const isSelected = selectedEvents.includes(eventId);\n      \n      set({\n        selectedEvents: isSelected\n          ? selectedEvents.filter(id => id !== eventId)\n          : [...selectedEvents, eventId],\n      });\n    },\n    \n    selectAllEvents: () => {\n      const { events } = get();\n      set({ selectedEvents: events.map(e => e.id) });\n    },\n    \n    clearSelection: () => set({ selectedEvents: [] }),\n    \n    // UI actions\n    toggleStatsPanel: () => set((state) => ({ showStatsPanel: !state.showStatsPanel })),\n    toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),\n    \n    // Data actions\n    refreshEvents: async () => {\n      set({ isLoading: true, error: null });\n      \n      try {\n        const response = await fetch('/api/admin/events?include_stats=true');\n        \n        if (!response.ok) {\n          throw new Error('Failed to fetch events');\n        }\n        \n        const data = await response.json();\n        const events = Array.isArray(data) ? data : (data.events || []);\n        \n        set({ events, isLoading: false });\n      } catch (error) {\n        console.error('Error fetching events:', error);\n        set({ \n          error: error instanceof Error ? error.message : 'Unknown error',\n          isLoading: false \n        });\n      }\n    },\n    \n    updateEvent: (eventId, updates) => {\n      set((state) => ({\n        events: state.events.map(event =>\n          event.id === eventId ? { ...event, ...updates } : event\n        ),\n      }));\n    },\n    \n    removeEvent: (eventId) => {\n      set((state) => ({\n        events: state.events.filter(event => event.id !== eventId),\n        selectedEvents: state.selectedEvents.filter(id => id !== eventId),\n      }));\n    },\n    \n    // Computed functions\n    getFilteredEvents: () => {\n      const { events, filterBy, searchQuery } = get();\n      \n      let filtered = events;\n      \n      // Apply filter\n      if (filterBy !== 'all') {\n        filtered = filtered.filter(event => {\n          switch (filterBy) {\n            case 'active':\n              return event.active === true;\n            case 'draft':\n              return event.active === false || event.active === null;\n            case 'completed':\n              return event.stats && event.stats.completionRate === 100;\n            default:\n              return true;\n          }\n        });\n      }\n      \n      // Apply search\n      if (searchQuery.trim()) {\n        const query = searchQuery.toLowerCase();\n        filtered = filtered.filter(event =>\n          event.school.toLowerCase().includes(query) ||\n          new Date(event.date).toLocaleDateString().includes(query)\n        );\n      }\n      \n      return filtered;\n    },\n    \n    getSortedEvents: (events) => {\n      const { sortBy } = get();\n      \n      return [...events].sort((a, b) => {\n        switch (sortBy) {\n          case 'date_desc':\n            return new Date(b.date).getTime() - new Date(a.date).getTime();\n          case 'date_asc':\n            return new Date(a.date).getTime() - new Date(b.date).getTime();\n          case 'name_asc':\n            return a.school.localeCompare(b.school);\n          case 'name_desc':\n            return b.school.localeCompare(a.school);\n          case 'revenue_desc':\n            return (b.stats?.revenue || 0) - (a.stats?.revenue || 0);\n          case 'photos_desc':\n            return (b.stats?.totalPhotos || 0) - (a.stats?.totalPhotos || 0);\n          default:\n            return 0;\n        }\n      });\n    },\n    \n    getTotalStats: () => {\n      const { events } = get();\n      \n      return events.reduce(\n        (totals, event) => ({\n          totalEvents: totals.totalEvents + 1,\n          totalPhotos: totals.totalPhotos + (event.stats?.totalPhotos || 0),\n          totalRevenue: totals.totalRevenue + (event.stats?.revenue || 0),\n          totalSubjects: totals.totalSubjects + (event.stats?.totalSubjects || 0),\n          avgCompletionRate: totals.avgCompletionRate + (event.stats?.completionRate || 0),\n        }),\n        {\n          totalEvents: 0,\n          totalPhotos: 0,\n          totalRevenue: 0,\n          totalSubjects: 0,\n          avgCompletionRate: 0,\n        }\n      );\n    },\n  }),\n  {\n    name: 'neural-events-store',\n  }\n));