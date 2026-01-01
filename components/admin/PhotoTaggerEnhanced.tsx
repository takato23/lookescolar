'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  createContext,
} from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useWindowSize } from '@/hooks/useWindowSize';
import { QRScanner } from './QRScanner';
import { useQrTagging } from '@/lib/hooks/useQrTagging';
import {
  Search,
  Filter,
  Grid as GridIcon,
  List,
  Zap,
  Undo2,
  Redo2,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Settings,
  Download,
  Upload,
  Trash2,
  Users,
  Camera,
  Clock,
  TrendingUp,
  Target,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/ui/accessible';
import { LoadingSpinner, StatusBadge } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

// Enhanced interfaces
export interface Photo {
  id: string;
  storage_path: string;
  filename: string;
  width?: number;
  height?: number;
  created_at: string;
  metadata?: {
    camera?: string;
    location?: string;
    sequence?: number;
  };
  signed_url?: string;
  isSelected?: boolean;
  assignedSubjectId?: string;
  tags?: string[];
}

export interface Subject {
  id: string;
  name: string;
  event_id: string;
  photoCount: number;
  token?: string;
  metadata?: {
    grade?: string;
    section?: string;
    studentId?: string;
  };
}

export interface TaggingStats {
  totalPhotos: number;
  taggedPhotos: number;
  untaggedPhotos: number;
  progressPercentage: number;
  averagePhotosPerSubject: number;
  taggingRate: number; // photos per minute
  sessionStats: {
    photosTagged: number;
    timeSpent: number;
    startTime: Date;
  };
}

export interface TaggingAction {
  id: string;
  type: 'assign' | 'unassign' | 'batch_assign' | 'bulk_assign';
  photoIds: string[];
  subjectId?: string;
  subjectName?: string;
  timestamp: Date;
  undoable: boolean;
}

export interface FilterOptions {
  search: string;
  dateRange?: { start: Date; end: Date };
  assignmentStatus: 'all' | 'assigned' | 'unassigned';
  sortBy: 'date' | 'filename' | 'assignment';
  sortOrder: 'asc' | 'desc';
  subjectFilter?: string;
  showOnlySelected?: boolean;
}

export interface ViewSettings {
  layout: 'grid' | 'list';
  gridSize: 'small' | 'medium' | 'large';
  showMetadata: boolean;
  showPreview: boolean;
  compactMode: boolean;
  autoSave: boolean;
}

interface SmartSuggestion {
  id: string;
  type: 'sequence' | 'pattern' | 'similar' | 'bulk';
  title: string;
  description: string;
  photoIds: string[];
  suggestedSubjectId: string;
  confidence: number;
  reasoning: string;
}

// Context for state management
interface PhotoTaggerContextType {
  photos: Photo[];
  subjects: Subject[];
  selectedPhotos: Set<string>;
  filters: FilterOptions;
  viewSettings: ViewSettings;
  stats: TaggingStats;
  actions: TaggingAction[];
  suggestions: SmartSuggestion[];
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  togglePhotoSelection: (photoId: string, multiSelect?: boolean) => void;
  selectPhotoRange: (startId: string, endId: string) => void;
  clearSelection: () => void;
  assignPhotosToSubject: (
    photoIds: string[],
    subjectId: string
  ) => Promise<void>;
  unassignPhotos: (photoIds: string[]) => Promise<void>;
  undoLastAction: () => void;
  redoLastAction: () => void;
}

const PhotoTaggerContext = createContext<PhotoTaggerContextType | null>(null);

export function usePhotoTagger() {
  const context = useContext(PhotoTaggerContext);
  if (!context) {
    throw new Error('usePhotoTagger must be used within PhotoTaggerProvider');
  }
  return context;
}

interface PhotoTaggerEnhancedProps {
  eventId: string;
  className?: string;
}

export function PhotoTaggerEnhanced({
  eventId,
  className,
}: PhotoTaggerEnhancedProps) {
  // Core state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lastSelectedPhoto, setLastSelectedPhoto] = useState<string | null>(
    null
  );

  // UI state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    assignmentStatus: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    showOnlySelected: false,
  });

  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layout: 'grid',
    gridSize: 'medium',
    showMetadata: true,
    showPreview: false,
    compactMode: false,
    autoSave: true,
  });

  // Tagging state
  const [stats, setStats] = useState<TaggingStats>({
    totalPhotos: 0,
    taggedPhotos: 0,
    untaggedPhotos: 0,
    progressPercentage: 0,
    averagePhotosPerSubject: 0,
    taggingRate: 0,
    sessionStats: {
      photosTagged: 0,
      timeSpent: 0,
      startTime: new Date(),
    },
  });

  const [actions, setActions] = useState<TaggingAction[]>([]);
  const [currentActionIndex, setCurrentActionIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);

  // UI state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [processing, setProcessing] = useState(false);
  const qrTaggingStatus = useQrTagging(eventId);
  const qrTaggingEnabled = qrTaggingStatus.enabled;

  // Refs for performance
  const gridRef = useRef<Grid>(null);
  const { width = 1200 } = useWindowSize();

  // Load initial data
  useEffect(() => {
    loadTaggingData();
  }, [eventId]);

  useEffect(() => {
    if (!qrTaggingEnabled && showQRScanner) {
      setShowQRScanner(false);
    }
  }, [qrTaggingEnabled, showQRScanner]);

  // Generate smart suggestions when photos or assignments change
  useEffect(() => {
    if (photos.length > 0) {
      generateSmartSuggestions();
    }
  }, [photos, subjects]);

  // Auto-save selected state
  useEffect(() => {
    if (viewSettings.autoSave) {
      const selectedArray = Array.from(selectedPhotos);
      sessionStorage.setItem(
        `selected_photos_${eventId}`,
        JSON.stringify(selectedArray)
      );
    }
  }, [selectedPhotos, eventId, viewSettings.autoSave]);

  // Load saved selection on mount
  useEffect(() => {
    if (viewSettings.autoSave) {
      const saved = sessionStorage.getItem(`selected_photos_${eventId}`);
      if (saved) {
        try {
          const selectedArray = JSON.parse(saved);
          setSelectedPhotos(new Set(selectedArray));
        } catch (e) {
          console.warn('Failed to parse saved selection');
        }
      }
    }
  }, [eventId, viewSettings.autoSave]);

  const loadTaggingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [photosResponse, subjectsResponse] = await Promise.all([
        fetch(
          `/api/admin/tagging/photos?eventId=${eventId}&include_metadata=true`
        ),
        fetch(`/api/admin/subjects?eventId=${eventId}`),
      ]);

      if (!photosResponse.ok || !subjectsResponse.ok) {
        throw new Error('Failed to load tagging data');
      }

      const [photosData, subjectsData] = await Promise.all([
        photosResponse.json(),
        subjectsResponse.json(),
      ]);

      // Process photos with signed URLs
      const processedPhotos = photosData.data.photos.map((photo: any) => ({
        ...photo,
        // Las URLs firmadas deben ser generadas server-side en el endpoint que provee las fotos
        // Aquí solo las consumimos si ya vienen incluidas
        signed_url: photo.signed_url,
        isSelected: false,
      }));

      setPhotos(processedPhotos);
      setSubjects(subjectsData.data || []);

      // Update stats
      const totalPhotos = processedPhotos.length;
      const taggedPhotos = processedPhotos.filter(
        (p) => p.assignedSubjectId
      ).length;
      const untaggedPhotos = totalPhotos - taggedPhotos;

      setStats((prev) => ({
        ...prev,
        totalPhotos,
        taggedPhotos,
        untaggedPhotos,
        progressPercentage:
          totalPhotos > 0 ? Math.round((taggedPhotos / totalPhotos) * 100) : 0,
        averagePhotosPerSubject:
          subjectsData.data.length > 0
            ? Math.round(taggedPhotos / subjectsData.data.length)
            : 0,
      }));
    } catch (err) {
      console.error('Error loading tagging data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Smart suggestions generation
  const generateSmartSuggestions = useCallback(() => {
    const newSuggestions: SmartSuggestion[] = [];

    // Sequence-based suggestions
    const unassignedPhotos = photos.filter((p) => !p.assignedSubjectId);
    const sequences = findPhotoSequences(unassignedPhotos);

    sequences.forEach((sequence) => {
      if (sequence.photos.length >= 3) {
        newSuggestions.push({
          id: `seq_${sequence.id}`,
          type: 'sequence',
          title: `Secuencia de ${sequence.photos.length} fotos`,
          description: `Fotos consecutivas que probablemente pertenecen al mismo sujeto`,
          photoIds: sequence.photos.map((p) => p.id),
          suggestedSubjectId: '',
          confidence: 0.8,
          reasoning: 'Fotos tomadas en secuencia temporal cercana',
        });
      }
    });

    // Pattern-based suggestions (similar metadata)
    const patternGroups = findPatternGroups(unassignedPhotos);
    patternGroups.forEach((group) => {
      if (group.photos.length >= 2) {
        newSuggestions.push({
          id: `pattern_${group.id}`,
          type: 'pattern',
          title: `${group.photos.length} fotos con patrón similar`,
          description: group.pattern,
          photoIds: group.photos.map((p) => p.id),
          suggestedSubjectId: '',
          confidence: 0.6,
          reasoning: `Patrón detectado: ${group.pattern}`,
        });
      }
    });

    // Bulk assignment suggestions for remaining unassigned
    if (unassignedPhotos.length >= 10) {
      const availableSubjects = subjects.filter((s) => s.photoCount === 0);
      if (availableSubjects.length > 0) {
        newSuggestions.push({
          id: 'bulk_unassigned',
          type: 'bulk',
          title: `${unassignedPhotos.length} fotos sin asignar`,
          description: 'Considera asignación masiva a sujetos disponibles',
          photoIds: unassignedPhotos.map((p) => p.id),
          suggestedSubjectId: '',
          confidence: 0.4,
          reasoning: 'Muchas fotos pendientes de asignación',
        });
      }
    }

    setSuggestions(newSuggestions.slice(0, 5)); // Show top 5 suggestions
  }, [photos, subjects]);

  // Helper functions for smart suggestions
  const findPhotoSequences = (photosList: Photo[]) => {
    const sequences: { id: string; photos: Photo[] }[] = [];
    const sortedPhotos = [...photosList].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let currentSequence: Photo[] = [];
    let sequenceId = 0;

    for (let i = 0; i < sortedPhotos.length; i++) {
      const photo = sortedPhotos[i];
      const prevPhoto = i > 0 ? sortedPhotos[i - 1] : null;

      if (prevPhoto) {
        const timeDiff =
          new Date(photo.created_at).getTime() -
          new Date(prevPhoto.created_at).getTime();
        const isConsecutive = timeDiff < 30000; // 30 seconds

        if (isConsecutive) {
          if (currentSequence.length === 0) {
            currentSequence.push(prevPhoto);
          }
          currentSequence.push(photo);
        } else {
          if (currentSequence.length >= 3) {
            sequences.push({
              id: `seq_${sequenceId++}`,
              photos: [...currentSequence],
            });
          }
          currentSequence = [];
        }
      }
    }

    // Add final sequence if exists
    if (currentSequence.length >= 3) {
      sequences.push({
        id: `seq_${sequenceId}`,
        photos: currentSequence,
      });
    }

    return sequences;
  };

  const findPatternGroups = (photosList: Photo[]) => {
    const groups: { id: string; photos: Photo[]; pattern: string }[] = [];

    // Group by camera metadata
    const cameraGroups = photosList.reduce(
      (acc, photo) => {
        const camera = photo.metadata?.camera || 'unknown';
        if (!acc[camera]) acc[camera] = [];
        acc[camera].push(photo);
        return acc;
      },
      {} as Record<string, Photo[]>
    );

    Object.entries(cameraGroups).forEach(([camera, photos], index) => {
      if (photos.length >= 2 && camera !== 'unknown') {
        groups.push({
          id: `camera_${index}`,
          photos,
          pattern: `Tomadas con ${camera}`,
        });
      }
    });

    // Group by filename patterns
    const filenamePatterns = photosList.reduce(
      (acc, photo) => {
        const pattern = extractFilenamePattern(photo.filename);
        if (pattern && !acc[pattern]) acc[pattern] = [];
        if (pattern) acc[pattern].push(photo);
        return acc;
      },
      {} as Record<string, Photo[]>
    );

    Object.entries(filenamePatterns).forEach(([pattern, photos], index) => {
      if (photos.length >= 2) {
        groups.push({
          id: `filename_${index}`,
          photos,
          pattern: `Patrón de nombre: ${pattern}`,
        });
      }
    });

    return groups;
  };

  const extractFilenamePattern = (filename: string): string | null => {
    // Extract patterns like IMG_1234.jpg -> IMG_XXXX.jpg
    const patterns = [
      /^IMG_\d+\.(jpg|jpeg|png)$/i,
      /^DSC\d+\.(jpg|jpeg|png)$/i,
      /^\d{8}_\d+\.(jpg|jpeg|png)$/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(filename)) {
        return filename.replace(/\d+/g, 'XXXX');
      }
    }

    return null;
  };

  // Photo selection methods
  const togglePhotoSelection = useCallback(
    (photoId: string, multiSelect = false) => {
      setSelectedPhotos((prev) => {
        const newSelection = new Set(prev);

        if (multiSelect) {
          if (newSelection.has(photoId)) {
            newSelection.delete(photoId);
          } else {
            newSelection.add(photoId);
          }
        } else {
          if (newSelection.has(photoId) && newSelection.size === 1) {
            newSelection.clear();
          } else {
            newSelection.clear();
            newSelection.add(photoId);
          }
        }

        setLastSelectedPhoto(newSelection.size > 0 ? photoId : null);
        return newSelection;
      });
    },
    []
  );

  const selectPhotoRange = useCallback((startId: string, endId: string) => {
    const startIndex = filteredPhotos.findIndex((p) => p.id === startId);
    const endIndex = filteredPhotos.findIndex((p) => p.id === endId);

    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);

      const rangeIds = filteredPhotos.slice(start, end + 1).map((p) => p.id);

      setSelectedPhotos((prev) => {
        const newSelection = new Set(prev);
        rangeIds.forEach((id) => newSelection.add(id));
        return newSelection;
      });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPhotos(new Set());
    setLastSelectedPhoto(null);
  }, []);

  // Filter photos based on current filters
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (photo) =>
          photo.filename.toLowerCase().includes(searchLower) ||
          photo.metadata?.camera?.toLowerCase().includes(searchLower) ||
          subjects
            .find((s) => s.id === photo.assignedSubjectId)
            ?.name.toLowerCase()
            .includes(searchLower)
      );
    }

    // Assignment status filter
    switch (filters.assignmentStatus) {
      case 'assigned':
        result = result.filter((photo) => photo.assignedSubjectId);
        break;
      case 'unassigned':
        result = result.filter((photo) => !photo.assignedSubjectId);
        break;
    }

    // Subject filter
    if (filters.subjectFilter) {
      result = result.filter(
        (photo) => photo.assignedSubjectId === filters.subjectFilter
      );
    }

    // Show only selected filter
    if (filters.showOnlySelected) {
      result = result.filter((photo) => selectedPhotos.has(photo.id));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'date':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'assignment':
          const aSubject =
            subjects.find((s) => s.id === a.assignedSubjectId)?.name || '';
          const bSubject =
            subjects.find((s) => s.id === b.assignedSubjectId)?.name || '';
          comparison = aSubject.localeCompare(bSubject);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [photos, subjects, filters, selectedPhotos]);

  // Assignment operations
  const assignPhotosToSubject = useCallback(
    async (photoIds: string[], subjectId: string) => {
      try {
        setProcessing(true);

        const response = await fetch('/api/admin/tagging/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            assignments: photoIds.map((photoId) => ({ photoId, subjectId })),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to assign photos');
        }

        // Update local state
        setPhotos((prev) =>
          prev.map((photo) => {
            if (photoIds.includes(photo.id)) {
              return { ...photo, assignedSubjectId: subjectId };
            }
            return photo;
          })
        );

        // Add action for undo
        const subject = subjects.find((s) => s.id === subjectId);
        const action: TaggingAction = {
          id: Date.now().toString(),
          type: photoIds.length === 1 ? 'assign' : 'batch_assign',
          photoIds: [...photoIds],
          subjectId,
          subjectName: subject?.name,
          timestamp: new Date(),
          undoable: true,
        };

        setActions((prev) => [...prev.slice(-9), action]); // Keep last 10 actions
        setCurrentActionIndex((prev) => prev + 1);

        // Update stats
        setStats((prev) => ({
          ...prev,
          taggedPhotos: prev.taggedPhotos + photoIds.length,
          untaggedPhotos: prev.untaggedPhotos - photoIds.length,
          progressPercentage: Math.round(
            ((prev.taggedPhotos + photoIds.length) / prev.totalPhotos) * 100
          ),
          sessionStats: {
            ...prev.sessionStats,
            photosTagged: prev.sessionStats.photosTagged + photoIds.length,
          },
        }));

        // Clear selection if all selected photos were assigned
        if (photoIds.every((id) => selectedPhotos.has(id))) {
          clearSelection();
        }
      } catch (error) {
        console.error('Error assigning photos:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to assign photos'
        );
      } finally {
        setProcessing(false);
      }
    },
    [eventId, subjects, selectedPhotos, clearSelection]
  );

  const unassignPhotos = useCallback(
    async (photoIds: string[]) => {
      try {
        setProcessing(true);

        const response = await fetch('/api/admin/tagging/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            photoIds,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to unassign photos');
        }

        // Update local state
        setPhotos((prev) =>
          prev.map((photo) => {
            if (photoIds.includes(photo.id)) {
              return { ...photo, assignedSubjectId: undefined };
            }
            return photo;
          })
        );

        // Add action for undo
        const action: TaggingAction = {
          id: Date.now().toString(),
          type: 'unassign',
          photoIds: [...photoIds],
          timestamp: new Date(),
          undoable: true,
        };

        setActions((prev) => [...prev.slice(-9), action]);
        setCurrentActionIndex((prev) => prev + 1);

        // Update stats
        setStats((prev) => ({
          ...prev,
          taggedPhotos: prev.taggedPhotos - photoIds.length,
          untaggedPhotos: prev.untaggedPhotos + photoIds.length,
          progressPercentage: Math.round(
            ((prev.taggedPhotos - photoIds.length) / prev.totalPhotos) * 100
          ),
        }));
      } catch (error) {
        console.error('Error unassigning photos:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to unassign photos'
        );
      } finally {
        setProcessing(false);
      }
    },
    [eventId]
  );

  // Undo/Redo functionality
  const undoLastAction = useCallback(() => {
    if (currentActionIndex >= 0 && actions[currentActionIndex]) {
      const action = actions[currentActionIndex];

      if (action.type === 'assign' || action.type === 'batch_assign') {
        unassignPhotos(action.photoIds);
      } else if (action.type === 'unassign') {
        // For undo of unassign, we need to restore the original assignments
        // This would require storing the original assignments in the action
      }

      setCurrentActionIndex((prev) => prev - 1);
    }
  }, [currentActionIndex, actions, unassignPhotos]);

  const redoLastAction = useCallback(() => {
    if (currentActionIndex < actions.length - 1) {
      const action = actions[currentActionIndex + 1];

      if (action.type === 'assign' || action.type === 'batch_assign') {
        if (action.subjectId) {
          assignPhotosToSubject(action.photoIds, action.subjectId);
        }
      } else if (action.type === 'unassign') {
        unassignPhotos(action.photoIds);
      }

      setCurrentActionIndex((prev) => prev + 1);
    }
  }, [currentActionIndex, actions, assignPhotosToSubject, unassignPhotos]);

  // QR Scanner integration
  const handleQRScan = useCallback((token: string) => {
    // Find subject by token and select their photos
    console.log('QR scanned:', token);
    // Implementation would lookup the subject and potentially auto-assign selected photos
  }, []);

  const handleSubjectFound = useCallback(
    (subjectInfo: { id: string; name: string }) => {
      if (selectedPhotos.size > 0) {
        assignPhotosToSubject(Array.from(selectedPhotos), subjectInfo.id);
      }
    },
    [selectedPhotos, assignPhotosToSubject]
  );

  // Context provider value
  const contextValue: PhotoTaggerContextType = {
    photos: filteredPhotos,
    subjects,
    selectedPhotos,
    filters,
    viewSettings,
    stats,
    actions,
    suggestions,
    updatePhoto: (photoId: string, updates: Partial<Photo>) => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, ...updates } : p))
      );
    },
    togglePhotoSelection,
    selectPhotoRange,
    clearSelection,
    assignPhotosToSubject,
    unassignPhotos,
    undoLastAction,
    redoLastAction,
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <LoadingSpinner label="Cargando sistema de tagging avanzado..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-red-700">
            Error de Carga
          </h3>
          <p className="mb-4 text-red-600">{error}</p>
          <AccessibleButton
            onClick={loadTaggingData}
            variant="primary"
            ariaLabel="Reintentar carga de datos"
          >
            Reintentar
          </AccessibleButton>
        </div>
      </Card>
    );
  }

  return (
    <PhotoTaggerContext.Provider value={contextValue}>
      <div className={cn('space-y-6', className)}>
        {/* Enhanced Header with Stats and Controls */}
        <PhotoTaggerHeader
          onToggleQRScanner={() => setShowQRScanner(!showQRScanner)}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
          showQRScanner={showQRScanner}
          showFilters={showFilters}
          showSuggestions={showSuggestions}
          qrTaggingEnabled={qrTaggingEnabled}
        />

        {/* QR Scanner Section */}
        {showQRScanner && qrTaggingEnabled && (
          <QRScanner
            onScan={handleQRScan}
            onSubjectFound={handleSubjectFound}
            autoConfirm={selectedPhotos.size > 0}
            scanMode="continuous"
            className="mb-6"
            eventId={eventId}
          />
        )}

        {/* Filters Section */}
        {showFilters && (
          <PhotoTaggerFilters
            filters={filters}
            onFiltersChange={setFilters}
            viewSettings={viewSettings}
            onViewSettingsChange={setViewSettings}
            subjects={subjects}
          />
        )}

        {/* Smart Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <SmartSuggestionsPanel
            suggestions={suggestions}
            onApplySuggestion={(suggestionId) => {
              const suggestion = suggestions.find((s) => s.id === suggestionId);
              if (suggestion) {
                setSelectedPhotos(new Set(suggestion.photoIds));
              }
            }}
            onDismissSuggestion={(suggestionId) => {
              setSuggestions((prev) =>
                prev.filter((s) => s.id !== suggestionId)
              );
            }}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Photo Grid - Takes 3 columns on large screens */}
          <div className="lg:col-span-3">
            <PhotoGridVirtualized />
          </div>

          {/* Subject List - Takes 1 column */}
          <div className="lg:col-span-1">
            <SubjectListEnhanced />
          </div>
        </div>
      </div>
    </PhotoTaggerContext.Provider>
  );
}

// Sub-components will be implemented in separate functions...
function PhotoTaggerHeader({
  onToggleQRScanner,
  onToggleFilters,
  onToggleSuggestions,
  showQRScanner,
  showFilters,
  showSuggestions,
  qrTaggingEnabled,
}: {
  onToggleQRScanner: () => void;
  onToggleFilters: () => void;
  onToggleSuggestions: () => void;
  showQRScanner: boolean;
  showFilters: boolean;
  showSuggestions: boolean;
  qrTaggingEnabled: boolean;
}) {
  const { stats, selectedPhotos, suggestions } = usePhotoTagger();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-purple-600" />
            <div>
              <span className="text-xl">Sistema de Tagging Avanzado</span>
              <div className="text-sm font-normal text-gray-500">
                {stats.totalPhotos} fotos • {stats.progressPercentage}%
                completado
              </div>
            </div>
          </CardTitle>

          <div className="flex items-center gap-2">
            {qrTaggingEnabled && (
              <AccessibleButton
                onClick={onToggleQRScanner}
                variant={showQRScanner ? 'primary' : 'outline'}
                size="sm"
                ariaLabel="Toggle QR Scanner"
                className="relative"
              >
                <Camera className="mr-1 h-4 w-4" />
                QR Scanner
              </AccessibleButton>
            )}

            <AccessibleButton
              onClick={onToggleFilters}
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              ariaLabel="Toggle Filters"
            >
              <Filter className="mr-1 h-4 w-4" />
              Filtros
            </AccessibleButton>

            <AccessibleButton
              onClick={onToggleSuggestions}
              variant={showSuggestions ? 'primary' : 'outline'}
              size="sm"
              ariaLabel="Toggle Smart Suggestions"
              className="relative"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              Sugerencias
              {suggestions.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {suggestions.length}
                </span>
              )}
            </AccessibleButton>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalPhotos}
            </div>
            <div className="text-xs text-blue-500">Total Fotos</div>
          </div>

          <div className="rounded-lg bg-green-50 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.taggedPhotos}
            </div>
            <div className="text-xs text-green-500">Asignadas</div>
          </div>

          <div className="rounded-lg bg-primary-50 p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.untaggedPhotos}
            </div>
            <div className="text-xs text-primary-600">Pendientes</div>
          </div>

          <div className="rounded-lg bg-purple-50 p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {selectedPhotos.size}
            </div>
            <div className="text-xs text-purple-500">Seleccionadas</div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
              {stats.averagePhotosPerSubject}
            </div>
            <div className="text-xs text-gray-500">Promedio/Sujeto</div>
          </div>

          <div className="rounded-lg bg-indigo-50 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {stats.sessionStats.photosTagged}
            </div>
            <div className="text-xs text-indigo-500">Esta Sesión</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Progreso de Asignación</span>
            <span>{stats.progressPercentage}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Placeholder implementations for other sub-components
function PhotoTaggerFilters({
  filters,
  onFiltersChange,
  viewSettings,
  onViewSettingsChange,
  subjects,
}: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-gray-500">
          Filtros avanzados - Implementación pendiente
        </div>
      </CardContent>
    </Card>
  );
}

function SmartSuggestionsPanel({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
}: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-gray-500">
          Panel de sugerencias inteligentes - Implementación pendiente
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoGridVirtualized() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-gray-500">
          Grid virtualizado de fotos - Implementación pendiente
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectListEnhanced() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-gray-500">
          Lista mejorada de sujetos - Implementación pendiente
        </div>
      </CardContent>
    </Card>
  );
}
