'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VirtualizedStudentGrid from './virtualized-student-grid';
import { useMediaQuery } from '@/hooks/use-media-query';
import MobileOptimizedNavigation from '@/components/admin/mobile-optimized-navigation';
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
  ImageIcon,
  Home,
  ArrowLeft,
  Layers,
  School,
  UserCircle,
  Folder,
  Navigation,
  Menu,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

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
  is_folder?: boolean;
  parent_course_id?: string;
  parent_course_name?: string;
  student_count?: number;
  photo_count?: number;
  group_photo_count?: number;
  created_at: string;
  updated_at: string;
  // Add progress indicators
  tagging_progress?: number;
  approval_progress?: number;
  completion_rate?: number;
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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeView, setActiveView] = useState(initialView);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMobilePath, setCurrentMobilePath] = useState<string[]>([]);

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

  // Mobile navigation items
  const mobileNavItems = useMemo(() => {
    const items: any[] = [];
    
    // Add levels
    levels.forEach(level => {
      items.push({
        id: level.id,
        name: level.name,
        type: 'level' as const,
        student_count: level.student_count,
        active: level.active,
      });
    });
    
    // Add courses
    courses.forEach(course => {
      items.push({
        id: course.id,
        name: course.name,
        type: 'course' as const,
        parent_id: course.level_id || course.parent_course_id,
        student_count: course.student_count,
        photo_count: course.photo_count,
        active: course.active,
        metadata: {
          grade: course.grade,
          section: course.section,
          is_folder: course.is_folder,
        }
      });
    });
    
    // Add students
    students.forEach(student => {
      items.push({
        id: student.id,
        name: student.name,
        type: 'student' as const,
        parent_id: student.course_id,
        photo_count: student.photo_count,
        active: student.active,
        metadata: {
          grade: student.grade,
          section: student.section,
          parent_name: student.parent_name,
        }
      });
    });
    
    return items;
  }, [levels, courses, students]);

  // Handle mobile item actions
  const handleMobileItemAction = (action: string, item: any) => {
    switch (action) {
      case 'view':
        if (item.type === 'level') {
          handleLevelSelect(item.id);
        } else if (item.type === 'course') {
          if (item.metadata?.is_folder) {
            handleFolderSelect(item.id);
          } else {
            handleCourseSelect(item.id);
          }
        } else if (item.type === 'student') {
          // Navigate to student gallery
          router.push(`/admin/events/${eventId}/students/${item.id}/gallery`);
        }
        break;
      case 'edit':
        // Handle edit action
        console.log('Edit item:', item);
        break;
      default:
        console.log('Unhandled action:', action, item);
    }
  };

  // Initialize from URL params
  useEffect(() => {
    const level = searchParams?.get('level');
    const course = searchParams?.get('course');
    const folder = searchParams?.get('folder');
    const view = searchParams?.get('view') as typeof activeView;
    
    if (level) setSelectedLevel(level);
    if (course) setSelectedCourse(course);
    if (folder) setSelectedFolder(folder);
    if (view) setActiveView(view);
  }, [searchParams]);

  // Load initial data
  useEffect(() => {
    loadHierarchyData();
  }, [eventId]);

  // Load data based on current selection
  useEffect(() => {
    if (activeView === 'courses' || selectedLevel || selectedFolder) {
      loadCourses();
    }
    if (activeView === 'students' || selectedCourse) {
      loadStudents();
    }
  }, [activeView, selectedLevel, selectedFolder, selectedCourse]);

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
      if (selectedFolder) url.searchParams.set('parent_course_id', selectedFolder);
      
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
    
    // Switch to courses view when a level is selected
    if (levelId) {
      setActiveView('courses');
      updateURL({ view: 'courses' });
    }
  };

  const handleCourseClick = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    
    if (course?.is_folder) {
      // Handle folder click - navigate into the folder
      setSelectedFolder(courseId);
      updateURL({ folder: courseId });
      handleViewChange('courses');
    } else {
      // Handle regular course click - navigate to students
      setSelectedCourse(courseId);
      updateURL({ course: courseId });
      handleViewChange('students');
    }
  };

  // Add the missing handleCourseSelect function
  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    
    if (course?.is_folder) {
      // Handle folder selection - navigate into the folder
      setSelectedFolder(courseId);
      updateURL({ folder: courseId });
      handleViewChange('courses');
    } else {
      // Handle regular course selection - navigate to students
      setSelectedCourse(courseId);
      updateURL({ course: courseId });
      handleViewChange('students');
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
    updateURL({ folder: folderId });
    
    // Switch to courses view when a folder is selected
    if (folderId) {
      setActiveView('courses');
      updateURL({ view: 'courses' });
    }
  };

  // Filtered data
  const filteredCourses = useMemo(() => {
    let filtered = courses;
    
    if (selectedLevel) {
      filtered = filtered.filter(c => c.level_id === selectedLevel);
    }
    
    if (selectedFolder) {
      filtered = filtered.filter(c => c.parent_course_id === selectedFolder);
    } else if (!selectedFolder) {
      // Only show root courses/folders (no parent)
      filtered = filtered.filter(c => !c.parent_course_id);
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
  }, [courses, selectedLevel, selectedFolder, searchTerm]);

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
    const crumbs = [
      { 
        label: 'Eventos', 
        onClick: () => router.push('/admin/events'),
        icon: Home
      },
      { 
        label: eventName, 
        onClick: () => {
          handleViewChange('overview');
          setSelectedLevel(null);
          setSelectedCourse(null);
          setSelectedFolder(null);
          updateURL({ level: null, course: null, folder: null });
        },
        icon: School
      }
    ];
    
    if (selectedLevel) {
      const level = levels.find(l => l.id === selectedLevel);
      if (level) {
        crumbs.push({ 
          label: level.name, 
          onClick: () => {
            handleLevelSelect(selectedLevel);
            handleViewChange('courses');
          },
          icon: Layers
        });
      }
    }
    
    if (selectedFolder) {
      const folder = courses.find(c => c.id === selectedFolder && c.is_folder);
      if (folder) {
        crumbs.push({ 
          label: folder.name, 
          onClick: () => {
            handleFolderSelect(selectedFolder);
            handleViewChange('courses');
          },
          icon: Folder
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
          },
          icon: BookOpen
        });
      }
    }
    
    return crumbs;
  }, [eventName, selectedLevel, selectedFolder, selectedCourse, levels, courses, router]);

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
      {/* Mobile Optimized Navigation */}
      {isMobile ? (
        <MobileOptimizedNavigation
          eventId={eventId}
          eventName={eventName}
          items={mobileNavItems}
          currentPath={currentMobilePath}
          onNavigate={setCurrentMobilePath}
          onItemAction={handleMobileItemAction}
          loading={loading}
        />
      ) : (
        <>
          {/* Enhanced Breadcrumb Navigation - Mobile Optimized */}
          <nav className="flex items-center text-sm text-muted-foreground p-3 rounded-lg bg-white/5 border border-white/10 overflow-x-auto touch-pan-x">
            {breadcrumbs.map((crumb, index) => {
              const Icon = crumb.icon;
              return (
                <div key={index} className="flex items-center flex-shrink-0">
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50 flex-shrink-0" />}
                  <button
                    onClick={crumb.onClick}
                    className="flex items-center gap-1 hover:text-primary transition-colors font-medium flex-shrink-0 touch-pan-y"
                    style={{ minHeight: '44px', minWidth: '44px' }} // Minimum touch target size
                  >
                    {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                    <span className={`${index === breadcrumbs.length - 1 ? "text-foreground" : ""} truncate max-w-[120px] sm:max-w-[200px]`}>
                      {crumb.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Stats Overview - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="glass-card border border-white/20">
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

            <Card className="glass-card border border-white/20">
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

            <Card className="glass-card border border-white/20">
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

            <Card className="glass-card border border-white/20">
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

            <Card className="glass-card border border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-center h-full">
                  <Button
                    onClick={() => router.push(`/admin/events/${eventId}/manage`)}
                    className="w-full glass-button"
                    variant="outline"
                    style={{ minHeight: '44px' }} // Minimum touch target size
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Gestionar</span>
                    <span className="sm:hidden">Gestión</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Navigation Tabs - Mobile Optimized */}
          <Tabs value={activeView} onValueChange={handleViewChange}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto glass-card border border-white/20">
                <TabsTrigger value="overview" style={{ minHeight: '44px' }}>
                  <span className="hidden sm:inline">Resumen</span>
                  <span className="sm:hidden">Res</span>
                </TabsTrigger>
                <TabsTrigger value="levels" style={{ minHeight: '44px' }}>
                  <span className="hidden sm:inline">Niveles</span>
                  <span className="sm:hidden">Niv</span>
                  {levels.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline">
                      {levels.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="courses" style={{ minHeight: '44px' }}>
                  <span className="hidden sm:inline">Cursos</span>
                  <span className="sm:hidden">Cur</span>
                  {filteredCourses.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline">
                      {filteredCourses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="students" style={{ minHeight: '44px' }}>
                  <span className="hidden sm:inline">Estudiantes</span>
                  <span className="sm:hidden">Est</span>
                  {filteredStudents.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline">
                      {filteredStudents.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters - Mobile Optimized */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64 glass-input"
                    style={{ minHeight: '44px' }} // Minimum touch target size
                  />
                </div>
                
                {(activeView === 'courses' || activeView === 'students') && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="glass-button p-2 sm:p-3"
                      style={{ minHeight: '44px', minWidth: '44px' }} // Minimum touch target size
                    >
                      <Grid3X3 className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Grid</span>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="glass-button p-2 sm:p-3"
                      style={{ minHeight: '44px', minWidth: '44px' }} // Minimum touch target size
                    >
                      <List className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Lista</span>
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
                onQuickJumpToCourse={handleCourseSelect}
                onQuickJumpToStudent={quickJumpToStudent}
                onQuickJumpToPhoto={quickJumpToPhoto}
              />
            </TabsContent>

            <TabsContent value="levels">
              <LevelsContent 
                eventId={eventId}
                levels={levels}
                onLevelClick={handleLevelSelect}
                onRefresh={loadHierarchyData}
              />
            </TabsContent>

            <TabsContent value="courses">
              <CoursesContent 
                eventId={eventId}
                courses={filteredCourses}
                viewMode={viewMode}
                selectedLevel={selectedLevel}
                selectedFolder={selectedFolder}
                onCourseClick={handleCourseClick}
                onRefresh={loadCourses}
                onBack={() => {
                  if (selectedFolder) {
                    setSelectedFolder(null);
                    updateURL({ folder: null });
                  } else {
                    setSelectedLevel(null);
                    handleViewChange('overview');
                    updateURL({ level: null });
                  }
                }}
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
                onBack={() => {
                  setSelectedCourse(null);
                  handleViewChange('courses');
                  updateURL({ course: null });
                }}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Overview Content Component
function OverviewContent({ 
  eventId, 
  levels, 
  onLevelClick,
  onQuickJumpToCourse,
  onQuickJumpToStudent,
  onQuickJumpToPhoto
}: {
  eventId: string;
  levels: EventLevel[];
  onLevelClick: (levelId: string) => void;
  onQuickJumpToCourse: (courseId: string) => void;
  onQuickJumpToStudent: (studentId: string) => void;
  onQuickJumpToPhoto: (photoId: string) => void;
}) {
  // State for quick jump functionality
  const [quickJumpValue, setQuickJumpValue] = useState('');
  const [quickJumpResults, setQuickJumpResults] = useState<Array<{id: string, name: string, type: 'course' | 'student' | 'photo'}>>([]);
  const [showQuickJump, setShowQuickJump] = useState(false);

  // Function to search for courses, students, or photos by name
  const searchEntities = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setQuickJumpResults([]);
      return;
    }

    try {
      const results = [];
      
      // Search courses
      const coursesResponse = await fetch(`/api/admin/events/${eventId}/courses?search=${encodeURIComponent(searchTerm)}&limit=5`);
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        coursesData.courses.forEach((course: any) => {
          results.push({
            id: course.id,
            name: course.name,
            type: 'course'
          });
        });
      }

      // Search students
      const studentsResponse = await fetch(`/api/admin/events/${eventId}/students?search=${encodeURIComponent(searchTerm)}&limit=5`);
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        studentsData.students.forEach((student: any) => {
          results.push({
            id: student.id,
            name: student.name,
            type: 'student'
          });
        });
      }

      setQuickJumpResults(results);
    } catch (error) {
      console.error('Error searching entities for quick jump:', error);
    }
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (quickJumpValue) {
        searchEntities(quickJumpValue);
      } else {
        setQuickJumpResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [quickJumpValue, eventId]);

  // Handle quick jump selection
  const handleQuickJumpSelect = (id: string, type: 'course' | 'student' | 'photo') => {
    switch (type) {
      case 'course':
        onQuickJumpToCourse(id);
        break;
      case 'student':
        onQuickJumpToStudent(id);
        break;
      case 'photo':
        onQuickJumpToPhoto(id);
        break;
    }
    setQuickJumpValue('');
    setQuickJumpResults([]);
    setShowQuickJump(false);
  };

  // Prepare data for charts
  const levelChartData = useMemo(() => {
    return levels.map(level => ({
      name: level.name,
      courses: level.course_count || 0,
      students: level.student_count || 0,
    }));
  }, [levels]);

  const courseDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    levels.forEach(level => {
      const key = level.name || 'Sin nivel';
      distribution[key] = (distribution[key] || 0) + (level.course_count || 0);
    });
    
    return Object.entries(distribution).map(([name, count]) => ({
      name,
      value: count,
    }));
  }, [levels]);

  const studentDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    levels.forEach(level => {
      const key = level.name || 'Sin nivel';
      distribution[key] = (distribution[key] || 0) + (level.student_count || 0);
    });
    
    return Object.entries(distribution).map(([name, count]) => ({
      name,
      value: count,
    }));
  }, [levels]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Calculate progress percentages for visual indicators
  const maxCourses = Math.max(...levels.map(l => l.course_count || 0), 1);
  const maxStudents = Math.max(...levels.map(l => l.student_count || 0), 1);
  
  // Calculate additional metrics
  const totalCourses = levels.reduce((sum, level) => sum + (level.course_count || 0), 0);
  const totalStudents = levels.reduce((sum, level) => sum + (level.student_count || 0), 0);
  const activeLevels = levels.filter(level => level.active).length;
  const levelCompletionRate = levels.length > 0 ? Math.round((activeLevels / levels.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Niveles Activos</p>
                <p className="text-2xl font-bold">{activeLevels}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{levelCompletionRate}% completado</span>
                <span className="text-muted-foreground">{levels.length} total</span>
              </div>
              <Progress value={levelCompletionRate} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cursos</p>
                <p className="text-2xl font-bold">{totalCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Distribución por nivel</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Estudiantes</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Promedio por curso</span>
                <span className="text-muted-foreground">{totalCourses > 0 ? Math.round(totalStudents / totalCourses) : 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eficiencia</p>
                <p className="text-2xl font-bold">92%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tasa de crecimiento</span>
                <span className="text-green-500">+5.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Quick Jump */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto flex-col py-4 glass-button">
                <Plus className="h-5 w-5 mb-2" />
                Nuevo Curso
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4 glass-button">
                <Users className="h-5 w-5 mb-2" />
                Agregar Estudiantes
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4 glass-button">
                <Upload className="h-5 w-5 mb-2" />
                Importar CSV
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4 glass-button">
                <Download className="h-5 w-5 mb-2" />
                Exportar Datos
              </Button>
            </div>
            
            {/* Quick Jump Navigation */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Navegación Rápida</h4>
              <div className="relative">
                <Input
                  placeholder="Buscar curso, estudiante o foto..."
                  value={quickJumpValue}
                  onChange={(e) => setQuickJumpValue(e.target.value)}
                  onFocus={() => setShowQuickJump(true)}
                  onBlur={() => setTimeout(() => setShowQuickJump(false), 200)}
                  className="glass-input"
                />
                {showQuickJump && quickJumpResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 mt-1 z-50 glass-card border border-white/20 shadow-lg">
                    <CardContent className="p-2">
                      {quickJumpResults.map((result) => (
                        <div
                          key={`${result.type}-${result.id}`}
                          className="px-3 py-2 hover:bg-white/10 cursor-pointer rounded-md text-sm"
                          onClick={() => handleQuickJumpSelect(result.id, result.type)}
                        >
                          <div className="flex items-center">
                            {result.type === 'course' && <BookOpen className="h-4 w-4 mr-2 text-blue-500" />}
                            {result.type === 'student' && <UserCircle className="h-4 w-4 mr-2 text-green-500" />}
                            {result.type === 'photo' && <ImageIcon className="h-4 w-4 mr-2 text-purple-500" />}
                            <span>{result.name}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Levels Overview with Progress Indicators */}
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Niveles Educativos</CardTitle>
          </CardHeader>
          <CardContent>
            {levels.length > 0 ? (
              <div className="space-y-4">
                {levels.map((level) => {
                  const courseProgress = ((level.course_count || 0) / maxCourses) * 100;
                  const studentProgress = ((level.student_count || 0) / maxStudents) * 100;
                  
                  return (
                    <div
                      key={level.id}
                      className="p-4 border rounded-lg hover:bg-white/10 cursor-pointer transition-colors glass-card border-white/20"
                      onClick={() => onLevelClick(level.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{level.name}</h3>
                        <Badge variant={level.active ? 'default' : 'secondary'}>
                          {level.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      
                      {level.description && (
                        <p className="text-sm text-muted-foreground mb-3">{level.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Cursos</span>
                            <span className="font-medium">{level.course_count || 0}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${courseProgress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Estudiantes</span>
                            <span className="font-medium">{level.student_count || 0}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${studentProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay niveles configurados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Courses by Level */}
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Distribución de Cursos por Nivel</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={levelChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="courses" name="Cursos" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Students by Level */}
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Distribución de Estudiantes por Nivel</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={levelChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="students" name="Estudiantes" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Course Distribution Pie Chart */}
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Distribución de Cursos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {courseDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Student Distribution Pie Chart */}
        <Card className="glass-card border border-white/20">
          <CardHeader>
            <CardTitle>Distribución de Estudiantes</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={studentDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {studentDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Levels Content Component
function LevelsContent({ 
  eventId,
  levels, 
  onLevelClick,
  onRefresh 
}: {
  eventId: string;
  levels: EventLevel[];
  onLevelClick: (levelId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Niveles Educativos</h3>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" className="glass-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button size="sm" className="glass-button">
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
              className="glass-card hover:shadow-md transition-shadow border border-white/20"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => onLevelClick(level.id)}
                  >
                    {level.name}
                  </span>
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
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 glass-button"
                    onClick={() => router.push(`/admin/events/${eventId}/levels/${level.id}/gallery`)}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Galería
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="glass-button"
                    onClick={() => onLevelClick(level.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card border border-white/20">
          <CardContent className="text-center py-8">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No hay niveles configurados</p>
            <Button className="glass-button">
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
  eventId,
  courses, 
  viewMode, 
  selectedLevel,
  selectedFolder,
  onCourseClick,
  onRefresh,
  onBack
}: {
  eventId: string;
  courses: Course[];
  viewMode: 'grid' | 'list';
  selectedLevel: string | null;
  selectedFolder: string | null;
  onCourseClick: (courseId: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    level_id: selectedLevel || '',
  });
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) return;
    
    setCreatingFolder(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderForm.name,
          description: folderForm.description,
          level_id: folderForm.level_id || undefined,
          parent_course_id: selectedFolder || undefined,
          is_folder: true,
          active: true,
        }),
      });

      if (response.ok) {
        setShowCreateFolderDialog(false);
        setFolderForm({ name: '', description: '', level_id: selectedLevel || '' });
        onRefresh();
      } else {
        const error = await response.json();
        console.error('Error creating folder:', error);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} className="glass-button flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <h3 className="text-lg font-medium">
            {selectedFolder ? 'Contenido de la Carpeta' : 'Cursos'} {selectedLevel && '(Filtrado por nivel)'}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" className="glass-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button 
            size="sm" 
            className="glass-button"
            onClick={() => setShowCreateFolderDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Carpeta
          </Button>
          <Button size="sm" className="glass-button">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Button>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent className="glass-card border border-white/20">
          <DialogHeader>
            <DialogTitle>Crear Nueva Carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre de la Carpeta</label>
              <Input
                value={folderForm.name}
                onChange={(e) => setFolderForm({...folderForm, name: e.target.value})}
                placeholder="Nombre de la carpeta"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descripción (Opcional)</label>
              <Input
                value={folderForm.description}
                onChange={(e) => setFolderForm({...folderForm, description: e.target.value})}
                placeholder="Descripción de la carpeta"
                className="glass-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateFolderDialog(false)}
                className="glass-button"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={creatingFolder || !folderForm.name.trim()}
                className="glass-button"
              >
                {creatingFolder ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Carpeta'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {courses.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map((course) => (
              <Card 
                key={course.id}
                className={`glass-card hover:shadow-md transition-shadow cursor-pointer border border-white/20 ${
                  course.is_folder ? 'border-yellow-500/50' : ''
                }`}
                onClick={() => onCourseClick(course.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span 
                      className="truncate cursor-pointer hover:underline"
                      onClick={() => onCourseClick(course.id)}
                    >
                      {course.name}
                    </span>
                    <Badge variant={course.active ? 'default' : 'secondary'}>
                      {course.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </CardTitle>
                  {course.is_folder && (
                    <p className="text-sm text-yellow-500 flex items-center">
                      <Folder className="h-4 w-4 mr-1" />
                      Carpeta
                    </p>
                  )}
                  {course.grade && (
                    <p className="text-sm text-muted-foreground">
                      {course.grade} {course.section && `- ${course.section}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {course.is_folder ? 'Subcarpetas/Cursos:' : 'Estudiantes:'}
                      </span>
                      <span className="font-medium">
                        {course.is_folder ? course.student_count || 0 : course.student_count || 0}
                      </span>
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
                    
                    {/* Completion Progress Bar */}
                    {course.completion_rate !== undefined && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-medium">{course.completion_rate}%</span>
                        </div>
                        <Progress value={course.completion_rate} className="h-2" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 glass-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/events/${eventId}/courses/${course.id}/gallery`);
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      <span className="hidden xs:inline">Galería</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="glass-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCourseClick(course.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Ver</span>
                    </Button>
                    {/* Quick Navigation Button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="glass-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Quick navigation to related entities
                        console.log(`Quick nav from course ${course.id}`);
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Nav</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card border border-white/20">
            <CardContent className="p-0">
              <div className="divide-y divide-white/20">
                {courses.map((course) => (
                  <div 
                    key={course.id}
                    className={`p-4 hover:bg-white/10 cursor-pointer transition-colors ${
                      course.is_folder ? 'border-l-4 border-yellow-500/50' : ''
                    }`}
                    onClick={() => onCourseClick(course.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => onCourseClick(course.id)}
                          >
                            {course.name}
                          </h4>
                          {course.is_folder && (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                              Carpeta
                            </Badge>
                          )}
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
                          <p className="text-muted-foreground">
                            {course.is_folder ? 'Elementos' : 'Estudiantes'}
                          </p>
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
                        <Button variant="ghost" size="sm" className="glass-button">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {/* Quick Navigation Button */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="glass-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Quick navigation to related entities
                            console.log(`Quick nav from course ${course.id}`);
                          }}
                        >
                          <Navigation className="h-4 w-4" />
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
        <Card className="glass-card border border-white/20">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {selectedFolder ? 'Esta carpeta está vacía' : 'No hay cursos disponibles'}
            </p>
            <div className="flex justify-center gap-2">
              <Button 
                className="glass-button"
                onClick={() => setShowCreateFolderDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Carpeta
              </Button>
              <Button className="glass-button">
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Curso
              </Button>
            </div>
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
  onRefresh,
  onBack
}: {
  eventId: string;
  students: Student[];
  viewMode: 'grid' | 'list';
  selectedCourse: string | null;
  searchTerm?: string;
  onRefresh: () => void;
  onBack: () => void;
}) {
  // For large student volumes (>50 students), use VirtualizedStudentGrid for optimal performance
  const useVirtualizedGrid = students.length > 50;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} className="glass-button flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <h3 className="text-lg font-medium">
            Estudiantes {selectedCourse && '(Filtrado por curso)'}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" className="glass-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" className="glass-button">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button size="sm" className="glass-button">
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
                    className="glass-card hover:shadow-md transition-shadow border border-white/20"
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
                          <p className="text-sm text-muted-foreground">
                            {student.parent_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 glass-button"
                          onClick={() => router.push(`/admin/events/${eventId}/students/${student.id}/gallery`)}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          <span className="hidden xs:inline">Galería</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="glass-button"
                          onClick={() => router.push(`/admin/events/${eventId}/students/${student.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Editar</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="glass-button"
                          onClick={() => router.push(`/admin/events/${eventId}/students/${student.id}/delete`)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Eliminar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card border border-white/20">
                <CardContent className="p-0">
                  <div className="divide-y divide-white/20">
                    {students.map((student) => (
                      <div 
                        key={student.id}
                        className="p-4 hover:bg-white/10 cursor-pointer transition-colors"
                        onClick={() => router.push(`/admin/events/${eventId}/students/${student.id}/gallery`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => router.push(`/admin/events/${eventId}/students/${student.id}/gallery`)}
                              >
                                {student.name}
                              </h4>
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
                              <p className="text-sm text-muted-foreground">
                                {student.parent_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-medium">{student.photo_count || 0}</p>
                              <p className="text-muted-foreground">Fotos</p>
                            </div>
                            <Button variant="ghost" size="sm" className="glass-button">
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
            <Card className="glass-card border border-white/20">
              <CardContent className="text-center py-8">
                <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No hay estudiantes disponibles</p>
                <Button className="glass-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Estudiante
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

  // Quick jump navigation functions
  const quickJumpToCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      if (course.is_folder) {
        handleFolderSelect(courseId);
      } else {
        handleCourseSelect(courseId);
      }
      // Show a toast notification for quick navigation
      // toast.info(`Navegando a ${course.name}`);
    }
  };

  const quickJumpToStudent = (studentId: string) => {
    // Find which course the student belongs to
    const student = students.find(s => s.id === studentId);
    if (student?.course_id) {
      handleCourseSelect(student.course_id);
      // Show a toast notification for quick navigation
      // toast.info(`Navegando a estudiante ${student.name}`);
    }
  };

  const quickJumpToPhoto = async (photoId: string) => {
    try {
      // Fetch photo details to determine which course/student it belongs to
      const response = await fetch(`/api/admin/photos/${photoId}`);
      if (response.ok) {
        const photo = await response.json();
        // If photo has a course, navigate to that course
        if (photo.course_id) {
          handleCourseSelect(photo.course_id);
        }
        // If photo has students, navigate to the first student's course
        else if (photo.students && photo.students.length > 0 && photo.students[0].course_id) {
          handleCourseSelect(photo.students[0].course_id);
        }
        // Show a toast notification for quick navigation
        // toast.info('Navegando a la foto');
      }
    } catch (error) {
      console.error('Error fetching photo details for quick jump:', error);
    }
  };

export default HierarchicalNavigation;

