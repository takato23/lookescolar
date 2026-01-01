'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  usePhotoSelectionStore,
  selectionSelectors,
  selectionShallow,
} from '@/store/usePhotoSelectionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  X,
  Plus,
  Check,
  Users,
  Folder as FolderIcon,
  RefreshCw,
} from 'lucide-react';

interface FolderOption {
  id: string;
  name: string;
}

interface SelectionScopePanelProps {
  eventId: string;
  folders: FolderOption[];
}

interface UnifiedPhoto {
  id: string;
  original_filename: string;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  folder?: {
    id: string | null;
    name: string | null;
  } | null;
  students?: Array<{
    id: string;
    name: string;
  }>;
  file_size?: number | null;
}

interface SearchResultItem {
  id: string;
  filename: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  folderId: string | null;
  folderName: string | null;
  students: Array<{ id: string; name: string }>;
  metadata: Record<string, unknown>;
}

interface StudentOption {
  id: string;
  name: string;
  grade?: string | null;
  section?: string | null;
}

interface SelectionMetadataResponse {
  id: string;
  filename: string;
  folderId: string | null;
  folderName: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  students: Array<{ id: string; name: string }>;
  metadata: Record<string, unknown> | null;
}

const GRID_COLUMNS = {
  sm: 'grid-cols-2',
  md: 'md:grid-cols-3',
  lg: 'xl:grid-cols-4',
};

function mapUnifiedPhoto(data: UnifiedPhoto): SearchResultItem {
  return {
    id: data.id,
    filename: data.original_filename,
    thumbnailUrl: data.thumbnail_url ?? data.preview_url ?? null,
    previewUrl: data.preview_url ?? data.thumbnail_url ?? null,
    folderId: data.folder?.id ?? null,
    folderName: data.folder?.name ?? null,
    students:
      data.students?.map((student) => ({
        id: student.id,
        name: student.name,
      })) ?? [],
    metadata: {
      fileSize: data.file_size ?? null,
    },
  };
}

export function SelectionScopePanel({ eventId, folders }: SelectionScopePanelProps) {
  const selectedItemsSelector = useMemo(() => selectionSelectors.sortedByEvent(eventId), [eventId]);
  const selectedItems = usePhotoSelectionStore(selectedItemsSelector, selectionShallow);
  const { upsertPhotos, removePhotos, clearSelection } = usePhotoSelectionStore(
    (state) => ({
      upsertPhotos: state.upsertPhotos,
      removePhotos: state.removePhotos,
      clearSelection: state.clearSelection,
    }),
    selectionShallow
  );

  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.id)), [selectedItems]);

  const [hydrateLoading, setHydrateLoading] = useState(false);
  const [selectionFilter, setSelectionFilter] = useState('');
  const debouncedSelectionFilter = useDebounce(selectionFilter, 200);

  const filteredSelection = useMemo(() => {
    if (!debouncedSelectionFilter) return selectedItems;
    const query = debouncedSelectionFilter.trim().toLowerCase();
    return selectedItems.filter((item) => {
      if (item.filename?.toLowerCase().includes(query)) return true;
      if (item.folderName?.toLowerCase().includes(query)) return true;
      if (item.students?.some((student) => student.name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [selectedItems, debouncedSelectionFilter]);

  // Attempt to hydrate missing metadata when opening the panel.
  useEffect(() => {
    const missing = selectedItems.filter(
      (item) =>
        !item.thumbnailUrl ||
        item.students === undefined ||
        (item.folderId && !item.folderName)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    setHydrateLoading(true);

    (async () => {
      try {
        const response = await fetch('/api/admin/photos/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            photoIds: missing.map((item) => item.id),
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudieron cargar los metadatos');
        }
        const payload = await response.json();
        if (!cancelled && payload?.photos) {
          upsertPhotos(
            eventId,
            payload.photos.map((photo: SelectionMetadataResponse) => ({
              id: photo.id,
              filename: photo.filename,
              thumbnailUrl: photo.thumbnailUrl,
              previewUrl: photo.previewUrl,
              folderId: photo.folderId,
              folderName: photo.folderName,
              students: photo.students,
              metadata: photo.metadata ?? undefined,
            }))
          );
        }
      } catch (error) {
        console.error('[SelectionScopePanel] Failed to hydrate metadata', error);
      } finally {
        if (!cancelled) {
          setHydrateLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, selectedItems, upsertPhotos]);

  const [searchMode, setSearchMode] = useState<'filename' | 'student' | 'folder'>('filename');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fetch students list for student search mode
  useEffect(() => {
    if (searchMode !== 'student' || students.length > 0 || studentsLoading) return;
    let cancelled = false;
    setStudentsLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams({
          limit: '500',
          sort_by: 'name',
          sort_order: 'asc',
        });
        const response = await fetch(`/api/admin/events/${eventId}/students?${params.toString()}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudieron cargar los invitados');
        }
        const payload = await response.json();
        if (!cancelled) {
          const items: StudentOption[] =
            (payload?.students || []).map((student: any) => ({
              id: student.id,
              name: student.name,
              grade: student.grade,
              section: student.section,
            })) ?? [];
          setStudents(items);
        }
      } catch (error) {
        console.error('[SelectionScopePanel] Failed to load students', error);
        if (!cancelled) {
          toast.error('No pudimos cargar los invitados para la búsqueda');
        }
      } finally {
        if (!cancelled) {
          setStudentsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, searchMode, students.length, studentsLoading]);

  const resetSearch = useCallback(() => {
    setSearchResults([]);
    setSearchPage(0);
    setSearchHasMore(false);
    setSearchError(null);
  }, []);

  // Trigger search when filters change.
  useEffect(() => {
    async function performSearch(reset = false) {
      if (
        (searchMode === 'filename' && debouncedSearchTerm.trim().length < 2) ||
        (searchMode === 'student' && !selectedStudentId) ||
        (searchMode === 'folder' && !selectedFolderId)
      ) {
        if (reset) resetSearch();
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      try {
        const page = reset ? 0 : searchPage;
        const params = new URLSearchParams({
          limit: '24',
          page: String(page),
          event_id: eventId,
        });

        if (searchMode === 'filename') {
          params.set('search', debouncedSearchTerm.trim());
        } else if (searchMode === 'student' && selectedStudentId) {
          params.set('student_id', selectedStudentId);
        } else if (searchMode === 'folder' && selectedFolderId) {
          params.set('folder_id', selectedFolderId);
        }

        const response = await fetch(`/api/admin/photos/unified?${params.toString()}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo buscar en el evento');
        }
        const payload = await response.json();
        const photos: UnifiedPhoto[] = payload?.photos || [];
        const mapped = photos.map(mapUnifiedPhoto);
        setSearchResults((prev) => (reset ? mapped : [...prev, ...mapped]));
        setSearchPage(page + 1);
        setSearchHasMore(Boolean(payload?.pagination?.hasMore));
      } catch (error) {
        console.error('[SelectionScopePanel] Search error', error);
        setSearchError(error instanceof Error ? error.message : 'Error inesperado');
      } finally {
        setSearchLoading(false);
      }
    }

    if (searchMode === 'filename') {
      performSearch(true);
    }
  }, [
    eventId,
    searchMode,
    debouncedSearchTerm,
    selectedStudentId,
    selectedFolderId,
    resetSearch,
  ]);

  // Trigger search for student and folder when selection changes
  useEffect(() => {
    if (searchMode === 'student' && selectedStudentId) {
      resetSearch();
      (async () => {
        setSearchLoading(true);
        try {
          const params = new URLSearchParams({
            limit: '24',
            page: '0',
            event_id: eventId,
            student_id: selectedStudentId,
          });
          const response = await fetch(`/api/admin/photos/unified?${params.toString()}`);
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'No se pudo buscar por invitado');
          }
          const payload = await response.json();
          const mapped = (payload?.photos || []).map(mapUnifiedPhoto);
          setSearchResults(mapped);
          setSearchPage(1);
          setSearchHasMore(Boolean(payload?.pagination?.hasMore));
        } catch (error) {
          console.error('[SelectionScopePanel] Student search error', error);
          setSearchError(error instanceof Error ? error.message : 'Error inesperado');
        } finally {
          setSearchLoading(false);
        }
      })();
    } else if (searchMode === 'folder' && selectedFolderId) {
      resetSearch();
      (async () => {
        setSearchLoading(true);
        try {
          const params = new URLSearchParams({
            limit: '24',
            page: '0',
            event_id: eventId,
            folder_id: selectedFolderId,
          });
          const response = await fetch(`/api/admin/photos/unified?${params.toString()}`);
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'No se pudo buscar por carpeta');
          }
          const payload = await response.json();
          const mapped = (payload?.photos || []).map(mapUnifiedPhoto);
          setSearchResults(mapped);
          setSearchPage(1);
          setSearchHasMore(Boolean(payload?.pagination?.hasMore));
        } catch (error) {
          console.error('[SelectionScopePanel] Folder search error', error);
          setSearchError(error instanceof Error ? error.message : 'Error inesperado');
        } finally {
          setSearchLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode, selectedStudentId, selectedFolderId, eventId]);

  const loadMoreResults = useCallback(async () => {
    if (!searchHasMore || searchLoading) return;

    setSearchLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({
        limit: '24',
        page: String(searchPage),
        event_id: eventId,
      });
      if (searchMode === 'filename' && debouncedSearchTerm.trim().length >= 2) {
        params.set('search', debouncedSearchTerm.trim());
      } else if (searchMode === 'student' && selectedStudentId) {
        params.set('student_id', selectedStudentId);
      } else if (searchMode === 'folder' && selectedFolderId) {
        params.set('folder_id', selectedFolderId);
      }

      const response = await fetch(`/api/admin/photos/unified?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'No se pudo cargar más resultados');
      }
      const payload = await response.json();
      const mapped = (payload?.photos || []).map(mapUnifiedPhoto);
      setSearchResults((prev) => [...prev, ...mapped]);
      setSearchPage((prev) => prev + 1);
      setSearchHasMore(Boolean(payload?.pagination?.hasMore));
    } catch (error) {
      console.error('[SelectionScopePanel] Load more error', error);
      setSearchError(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setSearchLoading(false);
    }
  }, [
    searchHasMore,
    searchLoading,
    searchPage,
    eventId,
    searchMode,
    debouncedSearchTerm,
    selectedStudentId,
    selectedFolderId,
  ]);

  const handleToggleSelection = useCallback(
    (item: SearchResultItem) => {
      if (selectedIds.has(item.id)) {
        removePhotos(eventId, [item.id]);
        return;
      }
      upsertPhotos(eventId, [
        {
          id: item.id,
          filename: item.filename,
          thumbnailUrl: item.thumbnailUrl,
          previewUrl: item.previewUrl,
          folderId: item.folderId,
          folderName: item.folderName,
          students: item.students,
          metadata: item.metadata,
          source: 'wizard',
          addedAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
    },
    [eventId, removePhotos, upsertPhotos, selectedIds]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">
              Selección actual ({selectedItems.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Editá la lista sin volver al manager. Los cambios se guardan al instante.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                value={selectionFilter}
                onChange={(event) => setSelectionFilter(event.target.value)}
                placeholder="Filtrar por nombre, invitado o carpeta"
                className="pl-9 h-8 w-64"
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearSelection(eventId)}
              disabled={selectedItems.length === 0}
            >
              <X className="mr-2 h-4 w-4" />
              Vaciar selección
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          {hydrateLoading && (
            <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Actualizando metadatos…
            </div>
          )}
          {filteredSelection.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <FolderIcon className="h-8 w-8" />
              {selectedItems.length === 0 ? (
                <>
                  <p>No hay fotos seleccionadas todavía.</p>
                  <p className="text-xs">
                    Usa el buscador de abajo para sumar fotos desde el wizard.
                  </p>
                </>
              ) : (
                <p>Tu filtro no encontró coincidencias en la selección actual.</p>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div
                className={cn(
                  'grid gap-3 p-4',
                  GRID_COLUMNS.sm,
                  GRID_COLUMNS.md,
                  GRID_COLUMNS.lg
                )}
              >
                {filteredSelection.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg border bg-background shadow-sm transition hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => removePhotos(eventId, [item.id])}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="aspect-square">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.filename || item.id}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          Sin vista previa
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 border-t bg-card px-3 py-2">
                      <div className="text-xs font-medium truncate" title={item.filename}>
                        {item.filename || item.id}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.folderName && (
                          <Badge variant="outline" className="text-[10px]">
                            <FolderIcon className="mr-1 h-3 w-3" />
                            {item.folderName}
                          </Badge>
                        )}
                        {item.students?.slice(0, 2).map((student) => (
                          <Badge key={student.id} variant="secondary" className="text-[10px]">
                            <Users className="mr-1 h-3 w-3" />
                            {student.name}
                          </Badge>
                        ))}
                        {item.students && item.students.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{item.students.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Agregar fotos desde el wizard</h4>
            <p className="text-xs text-muted-foreground">
              Buscá por nombre de archivo, invitado o carpeta y sumalas sin salir de este flujo.
            </p>
          </div>
        </div>

        <Tabs value={searchMode} onValueChange={(value) => {
          setSearchMode(value as typeof searchMode);
          setSearchTerm('');
          setSelectedStudentId(null);
          setSelectedFolderId(null);
          resetSearch();
        }}>
          <TabsList className="grid h-9 w-full grid-cols-3">
            <TabsTrigger value="filename">Archivo</TabsTrigger>
            <TabsTrigger value="student">Invitado</TabsTrigger>
            <TabsTrigger value="folder">Carpeta</TabsTrigger>
          </TabsList>

          <TabsContent value="filename" className="space-y-3 pt-3">
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre de archivo (mínimo 2 caracteres)"
                className="pl-9"
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Los resultados se actualizan automáticamente al escribir.
            </p>
          </TabsContent>

          <TabsContent value="student" className="space-y-3 pt-3">
            {studentsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando invitados…
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedStudentId ?? ''}
                  onChange={(event) =>
                    setSelectedStudentId(event.target.value || null)
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Elegí un invitado…</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.section ? ` · ${student.section}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Solo se mostrarán las fotos etiquetadas con el invitado seleccionado.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="folder" className="space-y-3 pt-3">
            <div className="space-y-2">
              <select
                value={selectedFolderId ?? ''}
                onChange={(event) => setSelectedFolderId(event.target.value || null)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Seleccionar carpeta…</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Trae las fotos publicadas dentro de la carpeta elegida.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg border">
          {searchError && (
            <div className="flex items-center justify-between border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">
              <span>{searchError}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 text-destructive"
                onClick={() => {
                  resetSearch();
                  setSearchError(null);
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
          <div className="p-4">
            {searchLoading && searchResults.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando fotos…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Search className="h-8 w-8" />
                <p>No encontramos fotos con los filtros actuales.</p>
                {searchMode === 'filename' ? (
                  <p className="text-xs">
                    Probá con un término distinto o verificá el nombre del archivo.
                  </p>
                ) : searchMode === 'student' ? (
                  <p className="text-xs">
                    Asegurate de que el invitado tenga fotos etiquetadas.
                  </p>
                ) : (
                  <p className="text-xs">
                    Verificá que la carpeta tenga fotos publicadas o subcarpetas.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'grid gap-3',
                    GRID_COLUMNS.sm,
                    GRID_COLUMNS.md,
                    GRID_COLUMNS.lg
                  )}
                >
                  {searchResults.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'group relative overflow-hidden rounded-lg border bg-card transition hover:shadow-md',
                          isSelected && 'border-primary shadow-sm'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSelection(item)}
                          className={cn(
                            'absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] font-medium shadow',
                            isSelected
                              ? 'border-primary/50 text-primary'
                              : 'border-muted-foreground/20 text-muted-foreground'
                          )}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3 w-3" />
                              Seleccionada
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Agregar
                            </>
                          )}
                        </button>
                        <div className="aspect-square">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.filename}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                              Sin vista previa
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 border-t bg-card px-3 py-2">
                          <div className="text-xs font-medium truncate" title={item.filename}>
                            {item.filename}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.folderName && (
                              <Badge
                                variant={isSelected ? 'default' : 'outline'}
                                className="text-[10px]"
                              >
                                <FolderIcon className="mr-1 h-3 w-3" />
                                {item.folderName}
                              </Badge>
                            )}
                            {item.students.slice(0, 2).map((student) => (
                              <Badge
                                key={student.id}
                                variant={isSelected ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                <Users className="mr-1 h-3 w-3" />
                                {student.name}
                              </Badge>
                            ))}
                            {item.students.length > 2 && (
                              <Badge
                                variant={isSelected ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                +{item.students.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                })}
                </div>
                {searchHasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreResults}
                      disabled={searchLoading}
                    >
                      {searchLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Cargar más
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
