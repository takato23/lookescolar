'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// Icons
import {
  Check,
  X,
  Tag,
  Move,
  Download,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  Users,
  FolderOpen,
  FileDown,
  Archive,
} from 'lucide-react';

// Types
interface HierarchyContext {
  path: {
    event?: { id: string; name: string };
    level?: { id: string; name: string };
    course?: { id: string; name: string; isFolder: boolean };
    student?: { id: string; name: string };
  };
  photoCount: number;
  canUpload: boolean;
  canBulkEdit: boolean;
}

interface BulkAction {
  type:
    | 'approve'
    | 'reject'
    | 'tag_students'
    | 'move_to_course'
    | 'delete'
    | 'export';
  photoIds: string[];
  metadata?: {
    studentIds?: string[];
    targetCourseId?: string;
    approvalReason?: string;
    exportFormat?: 'zip' | 'folder';
    exportQuality?: 'original' | 'compressed';
  };
}

interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
  downloadUrl?: string;
}

interface BulkProgress {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface Student {
  id: string;
  name: string;
  course_id: string;
  grade?: string;
  section?: string;
}

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  level_id?: string;
  is_folder: boolean;
}

interface BulkActionsToolbarProps {
  selectedPhotos: Set<string>;
  hierarchyContext: HierarchyContext;
  onActionComplete: () => void;
  onSelectionClear: () => void;
  className?: string;
}

export default function BulkActionsToolbar({
  selectedPhotos,
  hierarchyContext,
  onActionComplete,
  onSelectionClear,
  className,
}: BulkActionsToolbarProps) {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>({
    current: 0,
    total: 0,
    status: 'idle',
  });
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Data
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'zip' | 'folder'>('zip');
  const [exportQuality, setExportQuality] = useState<'original' | 'compressed'>(
    'compressed'
  );
  const [approvalReason, setApprovalReason] = useState('');

  const selectedCount = selectedPhotos.size;

  // Load students for tagging
  const loadStudents = useCallback(async () => {
    if (!hierarchyContext.path.event?.id) return;

    try {
      const params = new URLSearchParams();
      if (hierarchyContext.path.course?.id) {
        params.set('course_id', hierarchyContext.path.course.id);
      } else if (hierarchyContext.path.level?.id) {
        params.set('level_id', hierarchyContext.path.level.id);
      }

      const response = await fetch(
        `/api/admin/events/${hierarchyContext.path.event.id}/students?${params}`
      );
      const data = await response.json();
      setAvailableStudents(data.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  }, [hierarchyContext]);

  // Load courses for moving
  const loadCourses = useCallback(async () => {
    if (!hierarchyContext.path.event?.id) return;

    try {
      const response = await fetch(
        `/api/admin/events/${hierarchyContext.path.event.id}/courses`
      );
      const data = await response.json();
      setAvailableCourses(data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  }, [hierarchyContext]);

  // Execute bulk action
  const executeBulkAction = useCallback(
    async (action: BulkAction) => {
      setIsProcessing(true);
      setProgress({ current: 0, total: selectedCount, status: 'processing' });

      try {
        const response = await fetch('/api/admin/gallery/bulk-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...action,
            context: hierarchyContext,
          }),
        });

        if (!response.ok) {
          throw new Error('Bulk action failed');
        }

        const result: BulkActionResult = await response.json();

        if (result.success) {
          setProgress({
            current: result.processed,
            total: selectedCount,
            status: 'completed',
            message: `Processed ${result.processed} photos successfully`,
          });

          toast.success(
            `${action.type} completed for ${result.processed} photos`
          );

          if (result.downloadUrl) {
            // Handle download
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `photos_export_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          onActionComplete();
        } else {
          throw new Error(`${result.failed} photos failed to process`);
        }
      } catch (error) {
        console.error('Bulk action error:', error);
        setProgress({
          current: 0,
          total: selectedCount,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        toast.error(`Failed to ${action.type} photos`);
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          setProgress({ current: 0, total: 0, status: 'idle' });
        }, 3000);
      }
    },
    [selectedCount, hierarchyContext, onActionComplete]
  );

  // Action handlers
  const handleApprove = useCallback(() => {
    executeBulkAction({
      type: 'approve',
      photoIds: Array.from(selectedPhotos),
      metadata: { approvalReason },
    });
  }, [selectedPhotos, approvalReason, executeBulkAction]);

  const handleReject = useCallback(() => {
    executeBulkAction({
      type: 'reject',
      photoIds: Array.from(selectedPhotos),
      metadata: { approvalReason },
    });
  }, [selectedPhotos, approvalReason, executeBulkAction]);

  const handleTagStudents = useCallback(() => {
    if (selectedStudents.length === 0) {
      toast.warning('Please select at least one student');
      return;
    }

    executeBulkAction({
      type: 'tag_students',
      photoIds: Array.from(selectedPhotos),
      metadata: { studentIds: selectedStudents },
    });

    setShowTagDialog(false);
    setSelectedStudents([]);
  }, [selectedPhotos, selectedStudents, executeBulkAction]);

  const handleMoveToCourse = useCallback(() => {
    if (!targetCourseId) {
      toast.warning('Please select a target course');
      return;
    }

    executeBulkAction({
      type: 'move_to_course',
      photoIds: Array.from(selectedPhotos),
      metadata: { targetCourseId },
    });

    setShowMoveDialog(false);
    setTargetCourseId('');
  }, [selectedPhotos, targetCourseId, executeBulkAction]);

  const handleExport = useCallback(() => {
    executeBulkAction({
      type: 'export',
      photoIds: Array.from(selectedPhotos),
      metadata: { exportFormat, exportQuality },
    });

    setShowExportDialog(false);
  }, [selectedPhotos, exportFormat, exportQuality, executeBulkAction]);

  const handleDelete = useCallback(() => {
    executeBulkAction({
      type: 'delete',
      photoIds: Array.from(selectedPhotos),
    });

    setShowDeleteDialog(false);
  }, [selectedPhotos, executeBulkAction]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'bulk-actions-toolbar rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
          'flex items-center justify-between gap-4',
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectionClear}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </Button>
        </div>

        {/* Progress */}
        {progress.status === 'processing' && (
          <div className="flex max-w-xs flex-1 items-center gap-2">
            <Progress
              value={(progress.current / progress.total) * 100}
              className="flex-1"
            />
            <span className="text-muted-foreground text-sm">
              {progress.current}/{progress.total}
            </span>
          </div>
        )}

        {progress.status === 'completed' && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm">{progress.message}</span>
          </div>
        )}

        {progress.status === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{progress.message}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  loadStudents();
                  setShowTagDialog(true);
                }}
              >
                <Tag className="mr-2 h-4 w-4" />
                Tag Students
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  loadCourses();
                  setShowMoveDialog(true);
                }}
              >
                <Move className="mr-2 h-4 w-4" />
                Move to Course
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tag Students Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag Students</DialogTitle>
            <DialogDescription>
              Select students to tag in the selected {selectedCount} photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Students</Label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                {availableStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents((prev) => [...prev, student.id]);
                        } else {
                          setSelectedStudents((prev) =>
                            prev.filter((id) => id !== student.id)
                          );
                        }
                      }}
                    />
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{student.name}</span>
                    {student.grade && student.section && (
                      <Badge variant="outline" className="ml-auto">
                        {student.grade} {student.section}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTagStudents}
              disabled={selectedStudents.length === 0}
            >
              Tag {selectedStudents.length} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Course Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Course</DialogTitle>
            <DialogDescription>
              Select the target course for the selected {selectedCount} photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Target Course</Label>
              <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        {course.is_folder ? (
                          <FolderOpen className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        <span>{course.name}</span>
                        {course.grade && course.section && (
                          <Badge variant="outline" className="ml-2">
                            {course.grade} {course.section}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveToCourse} disabled={!targetCourseId}>
              Move Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Photos</DialogTitle>
            <DialogDescription>
              Configure export settings for the selected {selectedCount} photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={(value: any) => setExportFormat(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      ZIP Archive
                    </div>
                  </SelectItem>
                  <SelectItem value="folder">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Folder Structure
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quality</Label>
              <Select
                value={exportQuality}
                onValueChange={(value: any) => setExportQuality(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Quality</SelectItem>
                  <SelectItem value="compressed">
                    Compressed (Web-friendly)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Photos
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected {selectedCount}{' '}
              photos? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              ⚠️ This will permanently delete {selectedCount} photos from
              storage. All associated data will be lost.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedCount} Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
