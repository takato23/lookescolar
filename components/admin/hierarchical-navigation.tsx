'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VirtualizedStudentGrid from './virtualized-student-grid';
import {
  ChevronRight,
  Search,
  Filter,
  Users,
  GraduationCap,
  Camera,
  BookOpen,
  MoreHorizontal,
  Grid3X3,
  List,
  Plus,
  Download,
  Upload,
  Settings,
  Archive,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface EventLevel {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  course_count?: number;
  student_count?: number;
}

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  level_id?: string;
  description?: string;
  sort_order: number;
  active: boolean;
  student_count?: number;
  photo_count?: number;
  group_photo_count?: number;
  created_at: string;
  updated_at: string;
}

interface Student {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  course_id?: string;
  qr_code?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  photo_count?: number;
  last_photo_tagged?: string;
  active: boolean;
  created_at: string;
}

interface HierarchicalNavigationProps {
  eventId: string;
  eventName: string;
  initialView?: 'overview' | 'levels' | 'courses' | 'students';
}

export default function HierarchicalNavigation({
  eventId,
  eventName,
  initialView = 'overview'
}: HierarchicalNavigationProps) {
  // State
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState(initialView);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [levels, setLevels] = useState<EventLevel[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    total_levels: 0,
    total_courses: 0,
    total_students: 0,
    total_photos: 0,
    untagged_photos: 0,
  });

  // Initialize from URL params
  useEffect(() => {
    const level = searchParams?.get('level');
    const course = searchParams?.get('course');
    const view = searchParams?.get('view') as typeof activeView;
    
    if (level) setSelectedLevel(level);
    if (course) setSelectedCourse(course);
    if (view) setActiveView(view);
  }, [searchParams]);

  // Load initial data
  useEffect(() => {
    loadHierarchyData();
  }, [eventId]);

  // Load data based on current selection
  useEffect(() => {
    if (activeView === 'courses' || selectedLevel) {
      loadCourses();
    }
    if (activeView === 'students' || selectedCourse) {
      loadStudents();
    }
  }, [activeView, selectedLevel, selectedCourse]);

  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      const [levelsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/levels`),
        fetch(`/api/admin/events/${eventId}/stats`),
      ]);

      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        setLevels(levelsData.levels || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || {});
      }
    } catch (err) {
      console.error('Error loading hierarchy data:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const url = new URL(`/api/admin/events/${eventId}/courses`, window.location.origin);
      if (selectedLevel) url.searchParams.set('level_id', selectedLevel);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const loadStudents = async (page = 0, append = false) => {
    try {
      const url = new URL(`/api/admin/events/${eventId}/students`, window.location.origin);
      if (selectedCourse) url.searchParams.set('course_id', selectedCourse);
      if (searchTerm) url.searchParams.set('search', searchTerm);
      
      // Add pagination for large datasets
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', '100'); // Reasonable chunk size
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const newStudents = data.students || [];
        setStudents(prevStudents => append ? [...prevStudents, ...newStudents] : newStudents);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  // Update URL when navigation changes
  const updateURL = (updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, '', url.toString());
  };

  const handleViewChange = (view: typeof activeView) => {
    setActiveView(view);
    updateURL({ view });
  };

  const handleLevelSelect = (levelId: string | null) => {
    setSelectedLevel(levelId);
    setSelectedCourse(null);
    updateURL({ level: levelId, course: null });
  };

  const handleCourseSelect = (courseId: string | null) => {
    setSelectedCourse(courseId);
    updateURL({ course: courseId });
  };

  // Filtered data
  const filteredCourses = useMemo(() => {
    let filtered = courses;
    
    if (selectedLevel) {
      filtered = filtered.filter(c => c.level_id === selectedLevel);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        (c.grade && c.grade.toLowerCase().includes(term)) ||
        (c.section && c.section.toLowerCase().includes(term))
      );
    }
    
    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }, [courses, selectedLevel, searchTerm]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (selectedCourse) {
      filtered = filtered.filter(s => s.course_id === selectedCourse);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(term) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(term))
      );
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedCourse, searchTerm]);

  // Breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: eventName, onClick: () => handleViewChange('overview') }];
    
    if (selectedLevel) {
      const level = levels.find(l => l.id === selectedLevel);
      if (level) {
        crumbs.push({ 
          label: level.name, 
          onClick: () => {
            handleLevelSelect(selectedLevel);
            handleViewChange('courses');
          }
        });
      }
    }
    
    if (selectedCourse) {
      const course = courses.find(c => c.id === selectedCourse);
      if (course) {
        crumbs.push({ 
          label: course.name, 
          onClick: () => {
            handleCourseSelect(selectedCourse);
            handleViewChange('students');
          }
        });
      }
    }
    
    return crumbs;
  }, [eventName, selectedLevel, selectedCourse, levels, courses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
            <button
              onClick={crumb.onClick}
              className="hover:text-primary transition-colors font-medium"
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </nav>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Niveles</p>
                <p className="text-2xl font-bold">{stats.total_levels}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos</p>
                <p className="text-2xl font-bold">{stats.total_courses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estudiantes</p>
                <p className="text-2xl font-bold">{stats.total_students}</p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fotos</p>
                <p className="text-2xl font-bold">{stats.total_photos}</p>
                {stats.untagged_photos > 0 && (
                  <p className="text-xs text-amber-600">
                    {stats.untagged_photos} sin etiquetar
                  </p>
                )}
              </div>
              <Camera className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center h-full">
              <Button
                onClick={() => router.push(`/admin/events/${eventId}/manage`)}
                className="w-full"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Gestionar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeView} onValueChange={handleViewChange}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="levels">
              Niveles
              {levels.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {levels.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses">
              Cursos
              {filteredCourses.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredCourses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="students">
              Estudiantes
              {filteredStudents.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredStudents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            {(activeView === 'courses' || activeView === 'students') && (
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        <TabsContent value="overview">
          <OverviewContent 
            eventId={eventId}
            levels={levels}
            onLevelClick={handleLevelSelect}
          />
        </TabsContent>

        <TabsContent value="levels">
          <LevelsContent 
            levels={levels}
            onLevelClick={handleLevelSelect}
            onRefresh={loadHierarchyData}
          />
        </TabsContent>

        <TabsContent value="courses">
          <CoursesContent 
            courses={filteredCourses}
            viewMode={viewMode}
            selectedLevel={selectedLevel}
            onCourseClick={handleCourseSelect}
            onRefresh={loadCourses}
          />
        </TabsContent>

        <TabsContent value="students">
          <StudentsContent 
            eventId={eventId}
            students={filteredStudents}
            viewMode={viewMode}
            selectedCourse={selectedCourse}
            searchTerm={searchTerm}
            onRefresh={loadStudents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Overview Content Component
function OverviewContent({ 
  eventId, 
  levels, 
  onLevelClick 
}: {
  eventId: string;
  levels: EventLevel[];
  onLevelClick: (levelId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col py-4">
              <Plus className="h-5 w-5 mb-2" />
              Nuevo Curso
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Users className="h-5 w-5 mb-2" />
              Agregar Estudiantes
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Upload className="h-5 w-5 mb-2" />
              Importar CSV
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Download className="h-5 w-5 mb-2" />
              Exportar Datos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Levels Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Niveles Educativos</CardTitle>
        </CardHeader>
        <CardContent>
          {levels.length > 0 ? (
            <div className="space-y-3">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onLevelClick(level.id)}
                >
                  <div>
                    <p className="font-medium">{level.name}</p>
                    {level.description && (
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{level.course_count || 0} cursos</p>
                    <p className="text-xs text-muted-foreground">{level.student_count || 0} estudiantes</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay niveles configurados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Levels Content Component
function LevelsContent({ 
  levels, 
  onLevelClick,
  onRefresh 
}: {
  levels: EventLevel[];
  onLevelClick: (levelId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Niveles Educativos</h3>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Nivel
          </Button>
        </div>
      </div>

      {levels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((level) => (
            <Card 
              key={level.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onLevelClick(level.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{level.name}</span>
                  <Badge variant={level.active ? 'default' : 'secondary'}>
                    {level.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cursos:</span>
                    <span className="font-medium">{level.course_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Estudiantes:</span>
                    <span className="font-medium">{level.student_count || 0}</span>
                  </div>
                  {level.description && (
                    <p className="text-sm text-muted-foreground mt-2">{level.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No hay niveles configurados</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Nivel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Courses Content Component
function CoursesContent({ 
  courses, 
  viewMode, 
  selectedLevel,
  onCourseClick,
  onRefresh 
}: {
  courses: Course[];
  viewMode: 'grid' | 'list';
  selectedLevel: string | null;
  onCourseClick: (courseId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Cursos {selectedLevel && '(Filtrado por nivel)'}
        </h3>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Button>
        </div>
      </div>

      {courses.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map((course) => (
              <Card 
                key={course.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onCourseClick(course.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{course.name}</span>
                    <Badge variant={course.active ? 'default' : 'secondary'}>
                      {course.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </CardTitle>
                  {course.grade && (
                    <p className="text-sm text-muted-foreground">
                      {course.grade} {course.section && `- ${course.section}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Estudiantes:</span>
                      <span className="font-medium">{course.student_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fotos:</span>
                      <span className="font-medium">{course.photo_count || 0}</span>
                    </div>
                    {course.group_photo_count && course.group_photo_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Grupales:</span>
                        <span className="font-medium">{course.group_photo_count}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {courses.map((course) => (
                  <div 
                    key={course.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onCourseClick(course.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{course.name}</h4>
                          <Badge variant={course.active ? 'default' : 'secondary'} size="sm">
                            {course.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {course.grade && (
                            <span className="text-sm text-muted-foreground">
                              {course.grade} {course.section && `- ${course.section}`}
                            </span>
                          )}
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{course.student_count || 0}</p>
                          <p className="text-muted-foreground">Estudiantes</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{course.photo_count || 0}</p>
                          <p className="text-muted-foreground">Fotos</p>
                        </div>
                        {course.group_photo_count && course.group_photo_count > 0 && (
                          <div className="text-center">
                            <p className="font-medium">{course.group_photo_count}</p>
                            <p className="text-muted-foreground">Grupales</p>
                          </div>
                        )}
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No hay cursos disponibles</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Curso
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Students Content Component  
function StudentsContent({ 
  eventId,
  students, 
  viewMode, 
  selectedCourse,
  searchTerm,
  onRefresh 
}: {
  eventId: string;
  students: Student[];
  viewMode: 'grid' | 'list';
  selectedCourse: string | null;
  searchTerm?: string;
  onRefresh: () => void;
}) {
  // For large student volumes (>50 students), use VirtualizedStudentGrid for optimal performance
  const useVirtualizedGrid = students.length > 50;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Estudiantes {selectedCourse && '(Filtrado por curso)'}
        </h3>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Estudiante
          </Button>
        </div>
      </div>

      {useVirtualizedGrid ? (
        // Use virtualized grid for large datasets
        <VirtualizedStudentGrid
          eventId={eventId}
          courseId={selectedCourse}
          searchTerm={searchTerm}
          initialPageSize={100}
          enableSelection={true}
          enableBulkActions={true}
          onBulkAction={(action, studentIds) => {
            console.log(`Bulk action ${action} on students:`, studentIds);
            // Handle bulk actions here
          }}
        />
      ) : (
        // Use traditional rendering for smaller datasets
        <>
          {students.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {students.map((student) => (
                  <Card 
                    key={student.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{student.name}</span>
                        <Badge variant={student.active ? 'default' : 'secondary'}>
                          {student.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </CardTitle>
                      {(student.grade || student.section) && (
                        <p className="text-sm text-muted-foreground">
                          {student.grade} {student.section && `- ${student.section}`}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Fotos:</span>
                          <span className="font-medium">{student.photo_count || 0}</span>
                        </div>
                        {student.parent_name && (
                          <div>
                            <p className="text-xs text-muted-foreground">Padre/Madre:</p>
                            <p className="text-sm truncate">{student.parent_name}</p>
                          </div>
                        )}
                        {student.qr_code && (
                          <div>
                            <p className="text-xs text-muted-foreground">Código QR:</p>
                            <p className="text-sm font-mono">{student.qr_code}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-3">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {students.map((student) => (
                      <div 
                        key={student.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{student.name}</h4>
                              <Badge variant={student.active ? 'default' : 'secondary'} size="sm">
                                {student.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              {(student.grade || student.section) && (
                                <span className="text-sm text-muted-foreground">
                                  {student.grade} {student.section && `- ${student.section}`}
                                </span>
                              )}
                            </div>
                            {student.parent_name && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Padre/Madre: {student.parent_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-medium">{student.photo_count || 0}</p>
                              <p className="text-muted-foreground">Fotos</p>
                            </div>
                            {student.qr_code && (
                              <div className="text-center">
                                <p className="font-mono text-xs">{student.qr_code}</p>
                                <p className="text-muted-foreground">QR</p>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No hay estudiantes disponibles</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Estudiantes
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}