'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  User,
  Users,
  Tag,
  Check,
  X,
  Eye,
  QrCode,
  Wand2,
  AlertCircle,
  Camera,
  FileImage,
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
  detected_qr_codes: string[];
  width?: number;
  height?: number;
  created_at: string;
  approved: boolean;
  face_detections?: FaceDetection[];
  name_card_detections?: NameCardDetection[];
}

interface FaceDetection {
  id: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  suggested_students?: string[];
}

interface NameCardDetection {
  id: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  confidence: number;
  suggested_students?: string[];
}

interface Student {
  id: string;
  name: string;
  course_id?: string;
  course_name?: string;
  grade?: string;
  section?: string;
  qr_code?: string;
  photo_count: number;
}

interface PhotoPreviewWithNameDetectionProps {
  photo: Photo;
  students: Student[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassifyStudent: (photoId: string, studentId: string) => void;
  onUpdatePhotoType: (photoId: string, type: Photo['photo_type']) => void;
}

export default function PhotoPreviewWithNameDetection({
  photo,
  students,
  open,
  onOpenChange,
  onClassifyStudent,
  onUpdatePhotoType,
}: PhotoPreviewWithNameDetectionProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [selectedNameCard, setSelectedNameCard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedStudents, setSuggestedStudents] = useState<Student[]>([]);
  const [detectionMode, setDetectionMode] = useState<
    'faces' | 'name_cards' | 'manual'
  >('manual');
  const [loading, setLoading] = useState(false);

  // Filter students based on search
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.course_name &&
        student.course_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset state when photo changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setSelectedFace(null);
    setSelectedNameCard(null);
    setSearchTerm('');
    setSuggestedStudents([]);
    setDetectionMode('manual');
  }, [photo.id]);

  // Simulate AI-powered name detection
  const detectNamesInPhoto = async () => {
    setLoading(true);
    try {
      // This would call an AI service to detect name cards or faces
      // For now, we'll simulate some detection results

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing time

      // Mock detection results
      const mockNameCards: NameCardDetection[] = [
        {
          id: '1',
          bbox: { x: 0.2, y: 0.1, width: 0.3, height: 0.1 },
          text: 'JUAN PEREZ',
          confidence: 0.85,
          suggested_students: students
            .filter((s) => s.name.toLowerCase().includes('juan'))
            .map((s) => s.id)
            .slice(0, 3),
        },
        {
          id: '2',
          bbox: { x: 0.6, y: 0.3, width: 0.25, height: 0.08 },
          text: 'MARIA GARCIA',
          confidence: 0.92,
          suggested_students: students
            .filter((s) => s.name.toLowerCase().includes('maria'))
            .map((s) => s.id)
            .slice(0, 3),
        },
      ];

      const mockFaces: FaceDetection[] = [
        {
          id: '1',
          bbox: { x: 0.1, y: 0.2, width: 0.2, height: 0.3 },
          confidence: 0.78,
          suggested_students: students.slice(0, 3).map((s) => s.id),
        },
        {
          id: '2',
          bbox: { x: 0.7, y: 0.25, width: 0.18, height: 0.28 },
          confidence: 0.82,
          suggested_students: students.slice(3, 6).map((s) => s.id),
        },
      ];

      // Update photo with detection results (in real app, this would update the database)
      photo.face_detections = mockFaces;
      photo.name_card_detections = mockNameCards;

      toast.success(
        `Detected ${mockFaces.length} faces and ${mockNameCards.length} name cards`
      );

      if (mockNameCards.length > 0) {
        setDetectionMode('name_cards');
      } else if (mockFaces.length > 0) {
        setDetectionMode('faces');
      }
    } catch (error) {
      console.error('Name detection error:', error);
      toast.error('Failed to detect names in photo');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = async (studentId: string) => {
    try {
      await onClassifyStudent(photo.id, studentId);
      toast.success('Student classified successfully');

      // Clear selections
      setSelectedFace(null);
      setSelectedNameCard(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Classification error:', error);
      toast.error('Failed to classify student');
    }
  };

  const handlePhotoTypeChange = async (type: Photo['photo_type']) => {
    try {
      await onUpdatePhotoType(photo.id, type);
      toast.success('Photo type updated');
    } catch (error) {
      console.error('Photo type update error:', error);
      toast.error('Failed to update photo type');
    }
  };

  const renderDetectionOverlay = () => {
    if (!photo.preview_path) return null;

    return (
      <div className="pointer-events-none absolute inset-0">
        {/* Name card detections */}
        {detectionMode === 'name_cards' &&
          photo.name_card_detections?.map((detection) => (
            <div
              key={detection.id}
              className={`pointer-events-auto absolute cursor-pointer border-2 ${
                selectedNameCard === detection.id
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-blue-500 bg-blue-500/10'
              }`}
              style={{
                left: `${detection.bbox.x * 100}%`,
                top: `${detection.bbox.y * 100}%`,
                width: `${detection.bbox.width * 100}%`,
                height: `${detection.bbox.height * 100}%`,
              }}
              onClick={() => {
                setSelectedNameCard(detection.id);
                if (detection.suggested_students) {
                  setSuggestedStudents(
                    students.filter((s) =>
                      detection.suggested_students!.includes(s.id)
                    )
                  );
                }
              }}
            >
              <div className="absolute -top-6 left-0 rounded bg-blue-500 px-2 py-1 text-xs text-white">
                {detection.text} ({Math.round(detection.confidence * 100)}%)
              </div>
            </div>
          ))}

        {/* Face detections */}
        {detectionMode === 'faces' &&
          photo.face_detections?.map((detection) => (
            <div
              key={detection.id}
              className={`pointer-events-auto absolute cursor-pointer rounded-full border-2 ${
                selectedFace === detection.id
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-yellow-500 bg-yellow-500/10'
              }`}
              style={{
                left: `${detection.bbox.x * 100}%`,
                top: `${detection.bbox.y * 100}%`,
                width: `${detection.bbox.width * 100}%`,
                height: `${detection.bbox.height * 100}%`,
              }}
              onClick={() => {
                setSelectedFace(detection.id);
                if (detection.suggested_students) {
                  setSuggestedStudents(
                    students.filter((s) =>
                      detection.suggested_students!.includes(s.id)
                    )
                  );
                }
              }}
            >
              <div className="absolute -top-6 left-0 rounded bg-yellow-500 px-2 py-1 text-xs text-white">
                Face ({Math.round(detection.confidence * 100)}%)
              </div>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            {photo.original_filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-4">
          {/* Photo Preview */}
          <div className="flex flex-1 flex-col">
            {/* Photo Controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRotation((rotation + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={detectionMode}
                  onValueChange={(value: any) => setDetectionMode(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="name_cards">Name Cards</SelectItem>
                    <SelectItem value="faces">Faces</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={detectNamesInPhoto}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Detect Names
                </Button>
              </div>
            </div>

            {/* Photo Display */}
            <div className="relative flex-1 overflow-hidden rounded-lg bg-muted">
              {photo.preview_path ? (
                <div className="relative flex h-full w-full items-center justify-center">
                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <Image
                      src={photo.preview_path}
                      alt={photo.filename}
                      width={800}
                      height={600}
                      className="max-h-full max-w-full object-contain"
                    />

                    {renderDetectionOverlay()}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Camera className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                    <p className="text-gray-500">No preview available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Info */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <Label>Type</Label>
                <Select
                  value={photo.photo_type}
                  onValueChange={(value: Photo['photo_type']) =>
                    handlePhotoTypeChange(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>QR Codes</Label>
                <div className="mt-1 flex items-center gap-1">
                  <QrCode className="h-4 w-4" />
                  <span>{photo.detected_qr_codes.length}</span>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Badge
                  variant={photo.approved ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {photo.approved ? 'Approved' : 'Pending'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Student Selection Panel */}
          <div className="flex w-80 flex-col">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Classify Student
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div>
                  <Label htmlFor="student-search">Search Students</Label>
                  <div className="relative">
                    <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-3 h-4 w-4" />
                    <Input
                      id="student-search"
                      placeholder="Search by name or course..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* AI Suggestions */}
                {suggestedStudents.length > 0 && (
                  <div>
                    <Label>AI Suggestions</Label>
                    <div className="mt-2 space-y-2">
                      {suggestedStudents.map((student) => (
                        <Button
                          key={student.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleStudentSelection(student.id)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{student.name}</div>
                            {student.course_name && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs">
                                {student.course_name}
                              </div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                    <Separator className="my-4" />
                  </div>
                )}

                {/* All Students */}
                <div>
                  <Label>All Students ({filteredStudents.length})</Label>
                  <ScrollArea className="mt-2 h-64">
                    <div className="space-y-2">
                      {filteredStudents.map((student) => (
                        <Button
                          key={student.id}
                          variant="ghost"
                          size="sm"
                          className="h-auto w-full justify-start p-3"
                          onClick={() => handleStudentSelection(student.id)}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {student.course_name
                                ? `${student.course_name} • ${student.photo_count} photos`
                                : `No course • ${student.photo_count} photos`}
                            </div>
                            {student.qr_code && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                <QrCode className="mr-1 h-3 w-3" />
                                QR
                              </Badge>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {filteredStudents.length === 0 && searchTerm && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No students found matching "{searchTerm}"
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
