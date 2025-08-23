'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Download, QrCode, Users, Eye, BarChart3, RefreshCw, Plus, FileImage, Printer } from 'lucide-react';

interface QRCodeData {
  id: string;
  eventId: string;
  courseId?: string;
  studentId: string;
  codeValue: string;
  token: string;
  type: 'student_identification';
  metadata?: {
    title?: string;
    studentName?: string;
    createdAt?: string;
  };
}

interface QRStats {
  totalStudentCodes: number;
  activeStudentCodes: number;
  detectedStudentCodes: number;
  studentsWithCodes: number;
  studentsWithoutCodes: number;
}

interface Student {
  id: string;
  name: string;
  courseId?: string;
  qrCode?: string;
}

interface QRManagementProps {
  eventId: string;
  eventName: string;
}

export default function QRManagement({ eventId, eventName }: QRManagementProps) {
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [stats, setStats] = useState<QRStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-qr' | 'without-qr'>('all');

  useEffect(() => {
    loadQRData();
    loadStudents();
  }, [eventId]);

  const loadQRData = async () => {
    try {
      const response = await fetch(`/api/admin/qr/${eventId}`);
      if (!response.ok) throw new Error('Failed to load QR data');
      
      const data = await response.json();
      setQRCodes(data.data.qrCodes);
      setStats(data.data.stats);
    } catch (error) {
      toast.error('Failed to load QR codes');
      console.error('QR load error:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/students`);
      if (!response.ok) throw new Error('Failed to load students');
      
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      toast.error('Failed to load students');
      console.error('Students load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSingleQR = async (studentId: string, studentName: string) => {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          studentId,
          studentName,
          options: {
            size: 200,
            errorCorrectionLevel: 'M',
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to generate QR code');

      const data = await response.json();
      toast.success(`QR code generated for ${studentName}`);
      
      // Refresh data
      await loadQRData();
      await loadStudents();
      
      return data.data;
    } catch (error) {
      toast.error(`Failed to generate QR code for ${studentName}`);
      console.error('QR generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateBatchQRs = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students first');
      return;
    }

    try {
      setGenerating(true);
      setBatchProgress(0);

      const selectedStudentData = students.filter(s => selectedStudents.includes(s.id));
      
      const response = await fetch('/api/admin/qr/generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          students: selectedStudentData.map(s => ({
            id: s.id,
            name: s.name,
            courseId: s.courseId,
          })),
          options: {
            size: 200,
            errorCorrectionLevel: 'M',
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to generate batch QR codes');

      const data = await response.json();
      const summary = data.data.summary;
      
      toast.success(
        `Batch complete: ${summary.successful} generated, ${summary.failed} failed`
      );
      
      // Refresh data
      await loadQRData();
      await loadStudents();
      setSelectedStudents([]);
      
    } catch (error) {
      toast.error('Failed to generate batch QR codes');
      console.error('Batch QR generation error:', error);
    } finally {
      setGenerating(false);
      setBatchProgress(0);
    }
  };

  const exportQRCodes = async (format: 'pdf' | 'png' = 'png') => {
    try {
      toast.info('QR export feature coming soon');
      // TODO: Implement QR export functionality
    } catch (error) {
      toast.error('Failed to export QR codes');
      console.error('QR export error:', error);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filterStatus) {
      case 'with-qr':
        return matchesSearch && student.qrCode;
      case 'without-qr':
        return matchesSearch && !student.qrCode;
      default:
        return matchesSearch;
    }
  });

  const studentsWithoutQR = students.filter(s => !s.qrCode);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QR Code Management</h2>
          <p className="text-muted-foreground">
            Manage student QR codes for {eventName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadQRData()}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => exportQRCodes('pdf')}
            disabled={qrCodes.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print QRs
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total QR Codes</p>
                  <p className="text-2xl font-bold">{stats.totalStudentCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Students with QR</p>
                  <p className="text-2xl font-bold">{stats.studentsWithCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Students without QR</p>
                  <p className="text-2xl font-bold">{stats.studentsWithoutCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Detected in Photos</p>
                  <p className="text-2xl font-bold">{stats.detectedStudentCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium">Detection Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.totalStudentCodes > 0 
                      ? Math.round((stats.detectedStudentCodes / stats.totalStudentCodes) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate QR Codes</TabsTrigger>
          <TabsTrigger value="existing">Existing QR Codes</TabsTrigger>
          <TabsTrigger value="testing">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Generate QR Codes for Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentsWithoutQR.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-700">
                    {studentsWithoutQR.length} students don't have QR codes yet.
                  </p>
                  <Button
                    className="mt-2"
                    onClick={generateBatchQRs}
                    disabled={generating}
                  >
                    Generate QR Codes for All Students
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search Students</Label>
                  <Input
                    id="search"
                    placeholder="Search by student name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="filter">Filter</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="with-qr">With QR Codes</SelectItem>
                      <SelectItem value="without-qr">Without QR Codes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    {selectedStudents.length} students selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudents([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      onClick={generateBatchQRs}
                      disabled={generating}
                    >
                      Generate QR Codes
                    </Button>
                  </div>
                </div>
              )}

              {generating && batchProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating QR codes...</span>
                    <span>{Math.round(batchProgress)}%</span>
                  </div>
                  <Progress value={batchProgress} />
                </div>
              )}

              <ScrollArea className="h-96 border rounded-lg">
                <div className="p-4 space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div>
                          <p className="font-medium">{student.name}</p>
                          {student.courseId && (
                            <p className="text-sm text-muted-foreground">
                              Course: {student.courseId}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {student.qrCode ? (
                          <Badge variant="secondary">Has QR</Badge>
                        ) : (
                          <Badge variant="outline">No QR</Badge>
                        )}
                        {!student.qrCode && (
                          <Button
                            size="sm"
                            onClick={() => generateSingleQR(student.id, student.name)}
                            disabled={generating}
                          >
                            Generate QR
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Existing QR Codes ({qrCodes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {qrCodes.map((qr) => (
                    <div
                      key={qr.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{qr.metadata?.studentName}</p>
                        <p className="text-sm text-muted-foreground">
                          Token: {qr.token.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {qr.metadata?.createdAt ? new Date(qr.metadata.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{qr.type}</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>QR Code - {qr.metadata?.studentName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="text-center">
                                <div className="inline-block p-4 bg-white border rounded-lg">
                                  {/* QR Code would be displayed here */}
                                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                                    <QrCode className="w-16 h-16 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <p><strong>Student:</strong> {qr.metadata?.studentName}</p>
                                <p><strong>Token:</strong> {qr.token}</p>
                                <p><strong>QR Value:</strong> {qr.codeValue}</p>
                                <p><strong>Type:</strong> {qr.type}</p>
                                <p><strong>Created:</strong> {qr.metadata?.createdAt ? new Date(qr.metadata.createdAt).toLocaleDateString() : 'Unknown'}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                A/B Testing: QR vs Traditional Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900">Testing Setup</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Compare QR code classification vs traditional photo-name method for secondary school students.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-green-700">QR Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Students with QR:</span>
                          <span className="font-semibold">{stats?.studentsWithCodes || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Auto-classified:</span>
                          <span className="font-semibold">{stats?.detectedStudentCodes || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Success Rate:</span>
                          <span className="font-semibold">
                            {stats?.studentsWithCodes && stats?.studentsWithCodes > 0
                              ? Math.round((stats.detectedStudentCodes / stats.studentsWithCodes) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-orange-700">Traditional Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Manual Tagging:</span>
                          <span className="font-semibold">Coming soon</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Time per Photo:</span>
                          <span className="font-semibold">~30-60s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Error Rate:</span>
                          <span className="font-semibold">~5-10%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900">Implementation Notes</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• QR codes reduce bullying by eliminating name-based identification</li>
                    <li>• Parallel testing allows gradual transition for secondary schools</li>
                    <li>• QR method shows {stats?.detectedStudentCodes && stats?.studentsWithCodes 
                        ? Math.round(((stats.detectedStudentCodes / stats.studentsWithCodes) * 100) || 0)
                        : 0}% automatic classification success</li>
                    <li>• Traditional method remains available as fallback</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}