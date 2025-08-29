'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Download,
  Users,
  GraduationCap,
  Plus,
  FileText,
  QrCode,
  Key,
  Trash2,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface Course {
  id?: string;
  name: string;
  grade?: string;
  section?: string;
  levelId?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

interface Student {
  id?: string;
  name: string;
  grade?: string;
  section?: string;
  studentNumber?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  courseId?: string;
  generateQrCode?: boolean;
  generateToken?: boolean;
  active?: boolean;
}

interface BatchOperation {
  id: string;
  type: 'courses' | 'students';
  operation:
    | 'create'
    | 'update'
    | 'delete'
    | 'import'
    | 'assign_course'
    | 'generate_tokens';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  result?: any;
  error?: string;
}

interface BatchStudentManagementProps {
  eventId: string;
  eventName: string;
  courses: Course[];
  onDataChange?: () => void;
}

export default function BatchStudentManagement({
  eventId,
  eventName,
  courses,
  onDataChange,
}: BatchStudentManagementProps) {
  const [activeTab, setActiveTab] = useState('courses');
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [newStudents, setNewStudents] = useState<Student[]>([]);
  const [csvData, setCsvData] = useState('');
  const [importOptions, setImportOptions] = useState({
    hasHeader: true,
    delimiter: ',',
    skipEmptyRows: true,
    generateTokens: true,
    generateQrCodes: true,
  });
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add new course row
  const addCourseRow = () => {
    setNewCourses((prev) => [
      ...prev,
      {
        name: '',
        grade: '',
        section: '',
        description: '',
        sortOrder: prev.length,
        active: true,
      },
    ]);
  };

  // Add new student row
  const addStudentRow = () => {
    setNewStudents((prev) => [
      ...prev,
      {
        name: '',
        grade: '',
        section: '',
        generateQrCode: true,
        generateToken: true,
        active: true,
      },
    ]);
  };

  // Update course
  const updateCourse = (index: number, field: keyof Course, value: any) => {
    setNewCourses((prev) =>
      prev.map((course, i) =>
        i === index ? { ...course, [field]: value } : course
      )
    );
  };

  // Update student
  const updateStudent = (index: number, field: keyof Student, value: any) => {
    setNewStudents((prev) =>
      prev.map((student, i) =>
        i === index ? { ...student, [field]: value } : student
      )
    );
  };

  // Remove course
  const removeCourse = (index: number) => {
    setNewCourses((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove student
  const removeStudent = (index: number) => {
    setNewStudents((prev) => prev.filter((_, i) => i !== index));
  };

  // Execute batch operation
  const executeBatchOperation = async (
    operation: 'create' | 'update' | 'delete' | 'import',
    type: 'courses' | 'students',
    data?: any
  ) => {
    const operationId = Date.now().toString();

    const newOperation: BatchOperation = {
      id: operationId,
      type,
      operation,
      status: 'pending',
      progress: 0,
    };

    setOperations((prev) => [...prev, newOperation]);
    setProcessing(true);

    try {
      // Update status to processing
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? { ...op, status: 'processing', progress: 10 }
            : op
        )
      );

      let endpoint = '/api/admin/courses/batch';
      let payload: any = {
        eventId,
        operation,
        [type]: data || (type === 'courses' ? newCourses : newStudents),
      };

      if (operation === 'import') {
        endpoint = '/api/admin/courses/batch?operation=import-csv';
        payload = {
          eventId,
          type,
          csvData,
          options: importOptions,
        };
      }

      // Update progress
      setOperations((prev) =>
        prev.map((op) => (op.id === operationId ? { ...op, progress: 50 } : op))
      );

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Operation failed');
      }

      // Update to completed
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: 'completed',
                progress: 100,
                result,
              }
            : op
        )
      );

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} ${operation} completed successfully`
      );

      // Clear form data on success
      if (operation === 'create' || operation === 'import') {
        if (type === 'courses') {
          setNewCourses([]);
        } else {
          setNewStudents([]);
        }
        setCsvData('');
      }

      // Trigger data refresh
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error(`${type} ${operation} error:`, error);

      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : op
        )
      );

      toast.error(
        `${type.charAt(0).toUpperCase() + type.slice(1)} ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  // Download CSV template
  const downloadTemplate = async (type: 'courses' | 'students') => {
    try {
      const response = await fetch(
        `/api/admin/courses/batch?action=csv-template&type=${type}`
      );
      const data = await response.json();

      if (data.success) {
        const csvContent = [
          data.template.headers.join(','),
          data.template.example,
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${type}_template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const generateTokensForStudents = async () => {
    await executeBatchOperation('generate_tokens', 'students');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">
          Batch Student & Course Management
        </h3>
        <p className="text-muted-foreground text-sm">
          Manage courses and students for {eventName}
        </p>
      </div>

      {/* Operations Status */}
      {operations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Recent Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {operations.slice(-5).map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex-shrink-0">
                      {operation.status === 'processing' && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      )}
                      {operation.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {operation.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {operation.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <span className="capitalize">
                        {operation.operation} {operation.type}
                      </span>
                      {operation.result && (
                        <span className="text-muted-foreground ml-2">
                          ({operation.result.summary?.successful || 0}{' '}
                          successful, {operation.result.summary?.failed || 0}{' '}
                          failed)
                        </span>
                      )}
                      {operation.error && (
                        <span className="ml-2 text-red-600">
                          - {operation.error}
                        </span>
                      )}
                    </div>

                    {operation.progress !== undefined &&
                      operation.status === 'processing' && (
                        <div className="w-16">
                          <Progress
                            value={operation.progress}
                            className="h-2"
                          />
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courses">
            <GraduationCap className="mr-2 h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="mr-2 h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="import">CSV Import</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Add Courses</CardTitle>
                    <Button onClick={addCourseRow} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Course
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {newCourses.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center">
                      <GraduationCap className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>No courses added yet. Click "Add Course" to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newCourses.map((course, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <Label htmlFor={`course-name-${index}`}>
                                Course Name *
                              </Label>
                              <Input
                                id={`course-name-${index}`}
                                value={course.name}
                                onChange={(e) =>
                                  updateCourse(index, 'name', e.target.value)
                                }
                                placeholder="e.g., Primer Grado A"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`course-grade-${index}`}>
                                Grade
                              </Label>
                              <Input
                                id={`course-grade-${index}`}
                                value={course.grade || ''}
                                onChange={(e) =>
                                  updateCourse(index, 'grade', e.target.value)
                                }
                                placeholder="e.g., 1º"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`course-section-${index}`}>
                                Section
                              </Label>
                              <Input
                                id={`course-section-${index}`}
                                value={course.section || ''}
                                onChange={(e) =>
                                  updateCourse(index, 'section', e.target.value)
                                }
                                placeholder="e.g., A"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeCourse(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Label htmlFor={`course-description-${index}`}>
                              Description
                            </Label>
                            <Textarea
                              id={`course-description-${index}`}
                              value={course.description || ''}
                              onChange={(e) =>
                                updateCourse(
                                  index,
                                  'description',
                                  e.target.value
                                )
                              }
                              placeholder="Optional description"
                              rows={2}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {newCourses.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() =>
                          executeBatchOperation('create', 'courses')
                        }
                        disabled={processing || newCourses.some((c) => !c.name)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Create {newCourses.length} Course
                        {newCourses.length !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Import Courses from CSV
                    </CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('courses')}
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleCsvUpload}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="csv-data">CSV Data</Label>
                    <Textarea
                      id="csv-data"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste CSV data here or upload a file..."
                      rows={8}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-header"
                        checked={importOptions.hasHeader}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            hasHeader: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="has-header">
                        First row contains headers
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skip-empty"
                        checked={importOptions.skipEmptyRows}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            skipEmptyRows: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="skip-empty">Skip empty rows</Label>
                    </div>
                  </div>

                  {csvData && (
                    <Button
                      onClick={() => executeBatchOperation('import', 'courses')}
                      disabled={processing}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import Courses
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="import">CSV Import</TabsTrigger>
              <TabsTrigger value="actions">Bulk Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Add Students</CardTitle>
                    <Button onClick={addStudentRow} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Student
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {newStudents.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>
                        No students added yet. Click "Add Student" to start.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newStudents.map((student, index) => (
                        <Card key={index} className="p-4">
                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <Label htmlFor={`student-name-${index}`}>
                                Student Name *
                              </Label>
                              <Input
                                id={`student-name-${index}`}
                                value={student.name}
                                onChange={(e) =>
                                  updateStudent(index, 'name', e.target.value)
                                }
                                placeholder="e.g., Juan Pérez"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`student-grade-${index}`}>
                                Grade
                              </Label>
                              <Input
                                id={`student-grade-${index}`}
                                value={student.grade || ''}
                                onChange={(e) =>
                                  updateStudent(index, 'grade', e.target.value)
                                }
                                placeholder="e.g., 1º"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`student-section-${index}`}>
                                Section
                              </Label>
                              <Input
                                id={`student-section-${index}`}
                                value={student.section || ''}
                                onChange={(e) =>
                                  updateStudent(
                                    index,
                                    'section',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., A"
                              />
                            </div>
                          </div>

                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor={`student-course-${index}`}>
                                Course
                              </Label>
                              <Select
                                value={student.courseId || ''}
                                onValueChange={(value) =>
                                  updateStudent(index, 'courseId', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select course (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No course</SelectItem>
                                  {courses.map((course) => (
                                    <SelectItem
                                      key={course.id}
                                      value={course.id!}
                                    >
                                      {course.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor={`student-number-${index}`}>
                                Student Number
                              </Label>
                              <Input
                                id={`student-number-${index}`}
                                value={student.studentNumber || ''}
                                onChange={(e) =>
                                  updateStudent(
                                    index,
                                    'studentNumber',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., 12345"
                              />
                            </div>
                          </div>

                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor={`parent-name-${index}`}>
                                Parent Name
                              </Label>
                              <Input
                                id={`parent-name-${index}`}
                                value={student.parentName || ''}
                                onChange={(e) =>
                                  updateStudent(
                                    index,
                                    'parentName',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., María Pérez"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`parent-email-${index}`}>
                                Parent Email
                              </Label>
                              <Input
                                id={`parent-email-${index}`}
                                type="email"
                                value={student.parentEmail || ''}
                                onChange={(e) =>
                                  updateStudent(
                                    index,
                                    'parentEmail',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., maria@example.com"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`generate-qr-${index}`}
                                  checked={student.generateQrCode}
                                  onCheckedChange={(checked) =>
                                    updateStudent(
                                      index,
                                      'generateQrCode',
                                      !!checked
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`generate-qr-${index}`}
                                  className="text-sm"
                                >
                                  <QrCode className="mr-1 inline h-4 w-4" />
                                  Generate QR Code
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`generate-token-${index}`}
                                  checked={student.generateToken}
                                  onCheckedChange={(checked) =>
                                    updateStudent(
                                      index,
                                      'generateToken',
                                      !!checked
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`generate-token-${index}`}
                                  className="text-sm"
                                >
                                  <Key className="mr-1 inline h-4 w-4" />
                                  Generate Access Token
                                </Label>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeStudent(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {newStudents.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() =>
                          executeBatchOperation('create', 'students')
                        }
                        disabled={
                          processing || newStudents.some((s) => !s.name)
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Create {newStudents.length} Student
                        {newStudents.length !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Import Students from CSV
                    </CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('students')}
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="student-csv-upload">Upload CSV File</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id="student-csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="student-csv-data">CSV Data</Label>
                    <Textarea
                      id="student-csv-data"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste CSV data here or upload a file..."
                      rows={8}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="student-has-header"
                        checked={importOptions.hasHeader}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            hasHeader: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="student-has-header">
                        First row contains headers
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="student-generate-tokens"
                        checked={importOptions.generateTokens}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            generateTokens: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="student-generate-tokens">
                        Generate access tokens
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="student-skip-empty"
                        checked={importOptions.skipEmptyRows}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            skipEmptyRows: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="student-skip-empty">
                        Skip empty rows
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="student-generate-qr"
                        checked={importOptions.generateQrCodes}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            generateQrCodes: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="student-generate-qr">
                        Generate QR codes
                      </Label>
                    </div>
                  </div>

                  {csvData && (
                    <Button
                      onClick={() =>
                        executeBatchOperation('import', 'students')
                      }
                      disabled={processing}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import Students
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bulk Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      These actions will affect all students in the event. Use
                      with caution.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Button
                      onClick={generateTokensForStudents}
                      disabled={processing}
                      className="w-full justify-start"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Generate Access Tokens for All Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
