'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  QrCode,
  Mail,
  Phone,
  User,
  Camera,
  CheckCircle,
  Circle,
  RefreshCw,
} from 'lucide-react';

interface VirtualizedStudent {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  course_id?: string;
  course_name?: string;
  qr_code?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  photo_count?: number;
  last_photo_tagged?: string;
  active: boolean;
  created_at: string;
}

interface VirtualizedStudentGridProps {
  eventId: string;
  courseId?: string;
  searchTerm?: string;
  onStudentSelect?: (student: VirtualizedStudent) => void;
  onBulkAction?: (action: string, studentIds: string[]) => void;
  initialPageSize?: number;
  enableSelection?: boolean;
  enableBulkActions?: boolean;
}

export default function VirtualizedStudentGrid({
  eventId,
  courseId,
  searchTerm = '',
  onStudentSelect,
  onBulkAction,
  initialPageSize = 100,
  enableSelection = false,
  enableBulkActions = false,
}: VirtualizedStudentGridProps) {
  // State
  const [students, setStudents] = useState<VirtualizedStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<
    VirtualizedStudent[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [sortBy, setSortBy] = useState<'name' | 'photos' | 'created_at'>(
    'name'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Grid configuration
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 180;
  const GRID_PADDING = 16;
  const MIN_COLUMNS = 1;
  const MAX_COLUMNS = 6;

  // Calculate grid dimensions based on container size
  const [containerSize, setContainerSize] = useState({
    width: 1200,
    height: 600,
  });
  const [gridRef, setGridRef] = useState<Grid | null>(null);

  const columnsPerRow = useMemo(() => {
    const availableWidth = containerSize.width - GRID_PADDING * 2;
    const columns = Math.floor(availableWidth / (CARD_WIDTH + GRID_PADDING));
    return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, columns));
  }, [containerSize.width]);

  const rowCount = useMemo(() => {
    return Math.ceil(filteredStudents.length / columnsPerRow);
  }, [filteredStudents.length, columnsPerRow]);

  // Load students data
  const loadStudents = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      if (loading && !append) return;

      setLoading(true);
      setError(null);

      try {
        const url = new URL(
          `/api/admin/events/${eventId}/students`,
          window.location.origin
        );
        url.searchParams.set('page', pageNum.toString());
        url.searchParams.set('limit', initialPageSize.toString());

        if (courseId) url.searchParams.set('course_id', courseId);
        if (localSearchTerm) url.searchParams.set('search', localSearchTerm);
        if (sortBy) url.searchParams.set('sort_by', sortBy);
        if (sortOrder) url.searchParams.set('sort_order', sortOrder);
        if (filterActive !== null)
          url.searchParams.set('active', filterActive.toString());

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Failed to load students');
        }

        const data = await response.json();
        const newStudents = data.students || [];

        setStudents((prevStudents) =>
          append ? [...prevStudents, ...newStudents] : newStudents
        );
        setTotalCount(data.total || 0);
        setHasMore(data.has_more || false);
      } catch (err) {
        console.error('Error loading students:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load students'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      eventId,
      courseId,
      localSearchTerm,
      sortBy,
      sortOrder,
      filterActive,
      initialPageSize,
    ]
  );

  // Apply client-side filtering
  useEffect(() => {
    let filtered = [...students];

    // Apply search filter
    if (localSearchTerm) {
      const term = localSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(term) ||
          (student.parent_name &&
            student.parent_name.toLowerCase().includes(term)) ||
          (student.qr_code && student.qr_code.toLowerCase().includes(term)) ||
          (student.course_name &&
            student.course_name.toLowerCase().includes(term))
      );
    }

    // Apply active filter
    if (filterActive !== null) {
      filtered = filtered.filter((student) => student.active === filterActive);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'photos':
          aValue = a.photo_count || 0;
          bValue = b.photo_count || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredStudents(filtered);
  }, [students, localSearchTerm, sortBy, sortOrder, filterActive]);

  // Initial load
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Handle selection
  const handleStudentToggle = useCallback(
    (studentId: string, selected: boolean) => {
      setSelectedStudents((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(studentId);
        } else {
          newSet.delete(studentId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
      } else {
        setSelectedStudents(new Set());
      }
    },
    [filteredStudents]
  );

  // Handle bulk actions
  const handleBulkAction = useCallback(
    (action: string) => {
      if (onBulkAction && selectedStudents.size > 0) {
        onBulkAction(action, Array.from(selectedStudents));
      }
    },
    [onBulkAction, selectedStudents]
  );

  // Load more students when scrolling
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadStudents(page + 1, true);
      setPage((prev) => prev + 1);
    }
  }, [hasMore, loading, page, loadStudents]);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      const container = document.querySelector('[data-student-grid-container]');
      if (container) {
        const rect = container.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: Math.max(600, rect.height),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Student Card Component
  const StudentCard = useCallback(
    ({
      student,
      selected,
      onToggle,
    }: {
      student: VirtualizedStudent;
      selected: boolean;
      onToggle: (selected: boolean) => void;
    }) => (
      <Card className="border-l-primary/20 h-full border-l-4 transition-all duration-200 hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-4">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {enableSelection && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggle}
                  aria-label={`Select ${student.name}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-medium">{student.name}</h4>
                {(student.grade || student.section) && (
                  <p className="text-muted-foreground text-xs">
                    {student.grade} {student.section && `- ${student.section}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant={student.active ? 'default' : 'secondary'}
                size="sm"
              >
                {student.active ? 'Activo' : 'Inactivo'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => onStudentSelect?.(student)}>
                    <Eye className="mr-2 h-3 w-3" />
                    Ver
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-3 w-3" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <QrCode className="mr-2 h-3 w-3" />
                    QR
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-3 w-3" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Course info */}
            {student.course_name && (
              <div className="flex items-center gap-2 text-xs">
                <User className="text-muted-foreground h-3 w-3 shrink-0" />
                <span className="truncate">{student.course_name}</span>
              </div>
            )}

            {/* Photo count */}
            <div className="flex items-center gap-2 text-xs">
              <Camera className="text-muted-foreground h-3 w-3 shrink-0" />
              <span>{student.photo_count || 0} fotos</span>
              {student.last_photo_tagged && (
                <span className="text-muted-foreground">
                  (última:{' '}
                  {new Date(student.last_photo_tagged).toLocaleDateString(
                    'es-AR'
                  )}
                  )
                </span>
              )}
            </div>

            {/* Parent info */}
            {student.parent_name && (
              <div className="flex items-center gap-2 text-xs">
                <User className="text-muted-foreground h-3 w-3 shrink-0" />
                <span className="truncate">{student.parent_name}</span>
              </div>
            )}

            {/* Contact info */}
            {(student.parent_email || student.parent_phone) && (
              <div className="flex items-center gap-3 text-xs">
                {student.parent_email && (
                  <div className="flex items-center gap-1">
                    <Mail className="text-muted-foreground h-3 w-3" />
                    <span className="truncate">{student.parent_email}</span>
                  </div>
                )}
                {student.parent_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="text-muted-foreground h-3 w-3" />
                    <span>{student.parent_phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* QR Code */}
            {student.qr_code && (
              <div className="flex items-center gap-2 text-xs">
                <QrCode className="text-muted-foreground h-3 w-3 shrink-0" />
                <code className="bg-muted truncate rounded px-1 py-0.5 font-mono text-xs">
                  {student.qr_code}
                </code>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t pt-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                Creado:{' '}
                {new Date(student.created_at).toLocaleDateString('es-AR')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => onStudentSelect?.(student)}
              >
                <Eye className="mr-1 h-3 w-3" />
                Ver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [enableSelection, onStudentSelect]
  );

  // Grid Cell Component
  const Cell = useCallback(
    ({
      columnIndex,
      rowIndex,
      style,
    }: {
      columnIndex: number;
      rowIndex: number;
      style: React.CSSProperties;
    }) => {
      const studentIndex = rowIndex * columnsPerRow + columnIndex;
      const student = filteredStudents[studentIndex];

      if (!student) {
        return <div style={style} />;
      }

      const selected = selectedStudents.has(student.id);

      return (
        <div
          style={{
            ...style,
            padding: GRID_PADDING / 2,
          }}
        >
          <StudentCard
            student={student}
            selected={selected}
            onToggle={(checked) => handleStudentToggle(student.id, checked)}
          />
        </div>
      );
    },
    [
      filteredStudents,
      columnsPerRow,
      selectedStudents,
      StudentCard,
      handleStudentToggle,
    ]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => loadStudents()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {/* Search and Filters */}
        <div className="flex flex-1 items-center gap-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Buscar estudiantes..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="w-64 pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterActive(null)}>
                Todos los estudiantes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterActive(true)}>
                Solo activos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterActive(false)}>
                Solo inactivos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selection and Bulk Actions */}
        {enableSelection && (
          <div className="flex items-center gap-3">
            {selectedStudents.size > 0 && (
              <>
                <span className="text-muted-foreground text-sm">
                  {selectedStudents.size} seleccionados
                </span>
                {enableBulkActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        Acciones ({selectedStudents.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('export')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('generate-qr')}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Generar QR
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('send-tokens')}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar Tokens
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('archive')}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(false)}
                >
                  Deseleccionar
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(true)}
            >
              Seleccionar Todo
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span>
          Mostrando {filteredStudents.length} de {totalCount} estudiantes
        </span>
        {loading && (
          <div className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando...</span>
          </div>
        )}
      </div>

      {/* Virtualized Grid */}
      <div
        data-student-grid-container
        className="bg-background rounded-lg border"
      >
        {filteredStudents.length > 0 ? (
          <Grid
            ref={setGridRef}
            columnCount={columnsPerRow}
            columnWidth={CARD_WIDTH + GRID_PADDING}
            height={containerSize.height}
            rowCount={rowCount}
            rowHeight={CARD_HEIGHT + GRID_PADDING}
            width={containerSize.width}
            onScroll={({ scrollTop, scrollHeight, clientHeight }) => {
              // Load more when near bottom
              if (scrollHeight - scrollTop - clientHeight < 200) {
                handleLoadMore();
              }
            }}
          >
            {Cell}
          </Grid>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <User className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-4">
                {localSearchTerm
                  ? 'No se encontraron estudiantes'
                  : 'No hay estudiantes'}
              </p>
              {!localSearchTerm && (
                <Button
                  onClick={() =>
                    window.open(
                      `/admin/events/${eventId}?tab=students`,
                      '_blank'
                    )
                  }
                >
                  Agregar Estudiantes
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Load More Button (fallback) */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button onClick={handleLoadMore} variant="outline">
            Cargar Más Estudiantes
          </Button>
        </div>
      )}
    </div>
  );
}
