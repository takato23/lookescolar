'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Image as ImageIcon,
  Users,
  FolderOpen,
  GraduationCap,
  QrCode,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  X,
  RefreshCw,
  Download,
  ZoomIn,
  Tag,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

// Types
interface Photo {
  id: string;
  filename: string;
  original_filename: string;
  preview_path?: string;
  photo_type: 'individual' | 'group' | 'activity' | 'event';
  processing_status: string;
  detected_qr_codes: string[];
  created_at: string;
  approved: boolean;
}

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  student_count: number;
  photo_count: number;
}

interface Student {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  qr_code?: string;
  course_id?: string;
  photo_count: number;
  has_token: boolean;
}

interface ClassificationStats {
  total: number;
  unclassified: number;
  in_courses: number;
  by_type: {
    individual: number;
    group: number;
    activity: number;
    event: number;
  };
}

interface PhotoClassificationWorkflowProps {
  eventId: string;
  eventName: string;
}

export default function PhotoClassificationWorkflow({
  eventId,
  eventName,
}: PhotoClassificationWorkflowProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('photos');
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [bulkMode, setBulkMode] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPhotos(),
        loadCourses(),
        loadStudents(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load classification data');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch(
        `/api/admin/photos/classify?eventId=${eventId}&level=event&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setPhotos(data.photos || []);
        setStats(data.classification_stats);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/courses`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await fetch(
        `/api/admin/students?eventId=${eventId}&includeStats=true`
      );
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(
        `/api/admin/photos/classify?eventId=${eventId}`
      );
      const data = await response.json();

      if (data.success) {
        setStats(data.classification_stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Drag and drop handlers
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    const sourceList = source.droppableId;
    const destList = destination.droppableId;

    if (sourceList === destList && source.index === destination.index) return;

    // Handle classification
    if (destList.startsWith('course-')) {
      const courseId = destList.replace('course-', '');
      await classifyPhotos([draggableId], 'course', courseId);
    } else if (destList.startsWith('student-')) {
      const studentId = destList.replace('student-', '');
      await classifyPhotos([draggableId], 'student', studentId);
    }
  }, []);

  const classifyPhotos = async (
    photoIds: string[],
    type: 'course' | 'student',
    targetId: string
  ) => {
    try {
      const action = type === 'course' ? 'to-course' : 'to-student';
      const payload =
        type === 'course'
          ? { photoIds, courseId: targetId, photoType: 'group' }
          : { photoIds, studentId: targetId, confidenceScore: 1.0 };

      const response = await fetch(
        `/api/admin/photos/classify?action=${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Successfully classified ${photoIds.length} photo(s) to ${type}`
        );
        await loadData(); // Reload data to reflect changes
      } else {
        throw new Error(data.error || 'Classification failed');
      }
    } catch (error) {
      console.error('Classification error:', error);
      toast.error(
        `Failed to classify photos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleBulkClassify = async (
    type: 'course' | 'student',
    targetId: string
  ) => {
    if (selectedPhotos.size === 0) {
      toast.error('Please select photos to classify');
      return;
    }

    await classifyPhotos(Array.from(selectedPhotos), type, targetId);
    setSelectedPhotos(new Set());
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const detectQrCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/photos/qr-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          autoMatch: true,
          updateExisting: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `QR detection completed: ${data.summary.qr_codes_detected} codes detected, ${data.summary.students_matched} students matched`
        );
        await loadData();
      } else {
        throw new Error(data.error || 'QR detection failed');
      }
    } catch (error) {
      console.error('QR detection error:', error);
      toast.error(
        `QR detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter photos based on search and filter criteria
  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      photo.original_filename
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      photo.filename.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'unclassified' && photo.photo_type === 'individual') ||
      (filterType === 'qr' && photo.detected_qr_codes.length > 0) ||
      (filterType === 'approved' && photo.approved) ||
      (filterType === 'pending' && !photo.approved);

    return matchesSearch && matchesFilter;
  });

  const PhotoCard = ({ photo, index }: { photo: Photo; index: number }) => (
    <Draggable draggableId={photo.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-move transition-all ${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          } ${selectedPhotos.has(photo.id) ? 'ring-2 ring-blue-500' : ''}`}
        >
          <CardContent className="p-2">
            <div className="relative">
              <div className="mb-2 flex aspect-square items-center justify-center rounded bg-muted">
                {photo.preview_path ? (
                  <Image
                    src={photo.preview_path}
                    alt={photo.filename}
                    width={150}
                    height={150}
                    className="rounded object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>

              <div className="absolute right-1 top-1 flex gap-1">
                {photo.detected_qr_codes.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <QrCode className="mr-1 h-3 w-3" />
                    {photo.detected_qr_codes.length}
                  </Badge>
                )}

                {photo.approved && (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </div>

              <div className="absolute left-1 top-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhotoSelection(photo.id);
                  }}
                >
                  {selectedPhotos.has(photo.id) ? (
                    <Check className="h-3 w-3 text-blue-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-sm border border-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="truncate text-xs font-medium">
                {photo.original_filename}
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {photo.photo_type}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Photo Classification</h2>
          <p className="text-gray-500 dark:text-gray-400">Event: {eventName}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={detectQrCodes} disabled={loading}>
            <QrCode className="mr-2 h-4 w-4" />
            Detect QR Codes
          </Button>

          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Photos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {stats.unclassified}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unclassified</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.in_courses}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">In Courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.by_type.individual}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Individual</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Search className="text-gray-500 dark:text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-gray-500 dark:text-gray-400 h-4 w-4" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unclassified">Unclassified</SelectItem>
              <SelectItem value="qr">With QR</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            onClick={() => setBulkMode(!bulkMode)}
          >
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
          </Button>

          {selectedPhotos.size > 0 && (
            <Badge variant="secondary">{selectedPhotos.size} selected</Badge>
          )}
        </div>
      </div>

      {/* Main Classification Interface */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Photos Column */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Unclassified Photos ({filteredPhotos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="photos" direction="vertical">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-32 space-y-2"
                    >
                      {filteredPhotos.map((photo, index) => (
                        <PhotoCard key={photo.id} photo={photo} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Classification Targets */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="courses">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Courses ({courses.length})
                </TabsTrigger>
                <TabsTrigger value="students">
                  <Users className="mr-2 h-4 w-4" />
                  Students ({students.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {courses.map((course) => (
                      <Droppable
                        key={course.id}
                        droppableId={`course-${course.id}`}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`transition-colors ${
                              snapshot.isDraggingOver
                                ? 'border-blue-300 bg-blue-50'
                                : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {course.name}
                                  </h4>
                                  {course.grade && course.section && (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                      {course.grade} - {course.section}
                                    </p>
                                  )}
                                </div>
                                {bulkMode && selectedPhotos.size > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleBulkClassify('course', course.id)
                                    }
                                  >
                                    Add {selectedPhotos.size}
                                  </Button>
                                )}
                              </div>

                              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {course.student_count} students
                                </span>
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {course.photo_count} photos
                                </span>
                              </div>

                              {provided.placeholder}
                            </CardContent>
                          </Card>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {students.map((student) => (
                      <Droppable
                        key={student.id}
                        droppableId={`student-${student.id}`}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`transition-colors ${
                              snapshot.isDraggingOver
                                ? 'border-green-300 bg-green-50'
                                : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {student.name}
                                  </h4>
                                  {student.grade && student.section && (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                      {student.grade} - {student.section}
                                    </p>
                                  )}
                                </div>
                                {bulkMode && selectedPhotos.size > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleBulkClassify('student', student.id)
                                    }
                                  >
                                    Add {selectedPhotos.size}
                                  </Button>
                                )}
                              </div>

                              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-4 text-xs">
                                {student.qr_code && (
                                  <span className="flex items-center gap-1">
                                    <QrCode className="h-3 w-3" />
                                    QR
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {student.photo_count} photos
                                </span>
                                {student.has_token && (
                                  <Badge variant="outline" className="text-xs">
                                    Token
                                  </Badge>
                                )}
                              </div>

                              {provided.placeholder}
                            </CardContent>
                          </Card>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DragDropContext>

      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewPhoto?.original_filename}</DialogTitle>
          </DialogHeader>

          {previewPhoto && (
            <div className="space-y-4">
              <div className="flex aspect-video items-center justify-center rounded bg-muted">
                {previewPhoto.preview_path ? (
                  <Image
                    src={previewPhoto.preview_path}
                    alt={previewPhoto.filename}
                    width={800}
                    height={600}
                    className="rounded object-contain"
                  />
                ) : (
                  <ImageIcon className="h-16 w-16 text-gray-400" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Type</Label>
                  <p>{previewPhoto.photo_type}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p>{previewPhoto.processing_status}</p>
                </div>
                <div>
                  <Label>QR Codes</Label>
                  <p>{previewPhoto.detected_qr_codes.length || 'None'}</p>
                </div>
                <div>
                  <Label>Approved</Label>
                  <p>{previewPhoto.approved ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {previewPhoto.detected_qr_codes.length > 0 && (
                <div>
                  <Label>Detected QR Codes</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {previewPhoto.detected_qr_codes.map((code, index) => (
                      <Badge key={index} variant="secondary">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
