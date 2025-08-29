'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Image,
  Upload,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Camera,
  Calendar,
  Tag,
  Download,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  event_id: string;
  student_count?: number;
}

interface GroupPhoto {
  id: string;
  filename: string;
  storage_path: string;
  preview_url: string;
  photo_type: 'group' | 'activity' | 'event';
  course_id: string;
  event_id: string;
  approved: boolean;
  file_size_bytes: number;
  created_at: string;
  tagged_at: string;
  association_id: string;
}

interface AvailablePhoto {
  id: string;
  filename: string;
  storage_path: string;
  preview_url?: string;
  approved: boolean;
  created_at: string;
  photo_type: string;
}

interface GroupPhotoManagerProps {
  eventId: string;
  courses: Course[];
}

export default function GroupPhotoManager({
  eventId,
  courses,
}: GroupPhotoManagerProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [groupPhotos, setGroupPhotos] = useState<GroupPhoto[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<AvailablePhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [selectedPhotoType, setSelectedPhotoType] = useState<
    'group' | 'activity' | 'event'
  >('group');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'group' | 'activity' | 'event'
  >('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Load group photos for selected course
  const loadGroupPhotos = async (courseId: string) => {
    if (!courseId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${courseId}/photos`
      );
      if (!response.ok) throw new Error('Failed to load group photos');

      const data = await response.json();
      setGroupPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading group photos:', error);
      toast.error('Failed to load group photos');
    } finally {
      setLoading(false);
    }
  };

  // Load available photos that can be assigned to courses
  const loadAvailablePhotos = async () => {
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/photos/group?approved=true&limit=100`
      );
      if (!response.ok) throw new Error('Failed to load available photos');

      const data = await response.json();
      setAvailablePhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading available photos:', error);
      toast.error('Failed to load available photos');
    }
  };

  // Assign selected photos to course
  const assignPhotosToourse = async () => {
    if (!selectedCourse || selectedPhotoIds.length === 0) {
      toast.error('Please select a course and at least one photo');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${selectedCourse.id}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo_ids: selectedPhotoIds,
            photo_type: selectedPhotoType,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign photos');
      }

      const result = await response.json();
      toast.success(result.message);

      // Refresh data
      await loadGroupPhotos(selectedCourse.id);
      setSelectedPhotoIds([]);
      setIsAssignDialogOpen(false);
    } catch (error) {
      console.error('Error assigning photos:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign photos'
      );
    } finally {
      setUploading(false);
    }
  };

  // Remove photo from course
  const removePhotoFromCourse = async (photoId: string) => {
    if (!selectedCourse) return;

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${selectedCourse.id}/photos?photo_ids=${photoId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove photo');
      }

      const result = await response.json();
      toast.success(result.message);

      // Refresh data
      await loadGroupPhotos(selectedCourse.id);
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove photo'
      );
    }
  };

  // Bulk actions for group photos
  const handleBulkAction = async (action: string, photoIds: string[]) => {
    if (photoIds.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/photos/group/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            photo_ids: photoIds,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Bulk action failed');
      }

      const result = await response.json();
      toast.success(result.message);

      // Refresh data
      if (selectedCourse) {
        await loadGroupPhotos(selectedCourse.id);
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error(
        error instanceof Error ? error.message : 'Bulk action failed'
      );
    }
  };

  useEffect(() => {
    loadAvailablePhotos();
  }, [eventId]);

  useEffect(() => {
    if (selectedCourse) {
      loadGroupPhotos(selectedCourse.id);
    }
  }, [selectedCourse]);

  const filteredGroupPhotos = groupPhotos.filter((photo) => {
    const matchesSearch = photo.filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || photo.photo_type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredAvailablePhotos = availablePhotos.filter(
    (photo) =>
      !selectedPhotoIds.includes(photo.id) &&
      photo.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Group Photo Management
          </h3>
          <p className="text-muted-foreground">
            Manage group photos for courses in this event
          </p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course.id}
                className={`cursor-pointer transition-colors ${
                  selectedCourse?.id === course.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedCourse(course)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{course.name}</h4>
                      <p className="text-muted-foreground text-sm">
                        {course.grade} - {course.section}
                      </p>
                    </div>
                    {course.student_count && (
                      <Badge variant="secondary">
                        {course.student_count} students
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCourse && (
        <div className="space-y-6">
          {/* Course Info Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Group Photos for {selectedCourse.name}
              </CardTitle>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {selectedCourse.grade} - {selectedCourse.section}
                </p>
                <div className="flex gap-2">
                  <Dialog
                    open={isAssignDialogOpen}
                    onOpenChange={setIsAssignDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={loadAvailablePhotos}>
                        <Upload className="mr-2 h-4 w-4" />
                        Assign Photos
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Assign Photos to Course</DialogTitle>
                        <DialogDescription>
                          Select photos to assign to {selectedCourse.name} as
                          group photos
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {/* Photo Type Selection */}
                        <div className="flex items-center gap-4">
                          <Label>Photo Type:</Label>
                          <Select
                            value={selectedPhotoType}
                            onValueChange={(value: any) =>
                              setSelectedPhotoType(value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="group">Group</SelectItem>
                              <SelectItem value="activity">Activity</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Search */}
                        <Input
                          placeholder="Search photos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {/* Available Photos Grid */}
                        <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
                          {filteredAvailablePhotos.map((photo) => (
                            <div
                              key={photo.id}
                              className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                                selectedPhotoIds.includes(photo.id)
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => {
                                setSelectedPhotoIds((prev) =>
                                  prev.includes(photo.id)
                                    ? prev.filter((id) => id !== photo.id)
                                    : [...prev, photo.id]
                                );
                              }}
                            >
                              <div className="bg-muted flex aspect-square items-center justify-center">
                                {photo.preview_url ? (
                                  <img
                                    src={photo.preview_url}
                                    alt={photo.filename}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Image className="text-muted-foreground h-8 w-8" />
                                )}
                              </div>
                              <div className="absolute left-2 top-2">
                                <Checkbox
                                  checked={selectedPhotoIds.includes(photo.id)}
                                  onChange={() => {}}
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-white">
                                <p className="truncate text-xs">
                                  {photo.filename}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {filteredAvailablePhotos.length === 0 && (
                          <div className="text-muted-foreground py-8 text-center">
                            No available photos found
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAssignDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={assignPhotosToourse}
                          disabled={uploading || selectedPhotoIds.length === 0}
                        >
                          {uploading
                            ? 'Assigning...'
                            : `Assign ${selectedPhotoIds.length} Photo(s)`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search group photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  value={filterType}
                  onValueChange={(value: any) => setFilterType(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary">
                  {filteredGroupPhotos.length} photo(s)
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Group Photos Grid */}
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">Loading group photos...</div>
              </CardContent>
            </Card>
          ) : filteredGroupPhotos.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-muted-foreground text-center">
                  No group photos found for this course
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {filteredGroupPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="bg-muted relative aspect-square">
                    <img
                      src={photo.preview_url}
                      alt={photo.filename}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-2 top-2">
                      <Badge
                        variant={photo.approved ? 'default' : 'destructive'}
                      >
                        {photo.approved ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                      </Badge>
                    </div>
                    <div className="absolute right-2 top-2">
                      <Badge variant="secondary">{photo.photo_type}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate text-xs font-medium">
                      {photo.filename}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(photo.preview_url, '_blank')}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removePhotoFromCourse(photo.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
