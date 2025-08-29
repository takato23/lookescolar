'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Users,
  Download,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  email?: string;
  grade_section?: string;
  token?: string;
}

interface StudentCSVUploaderProps {
  eventId: string;
  eventName?: string;
  onStudentsAdded?: (students: Student[]) => void;
  className?: string;
}

export function StudentCSVUploader({
  eventId,
  eventName,
  onStudentsAdded,
  className = '',
}: StudentCSVUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'text' | 'manual'>(
    'csv'
  );
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualGrade, setManualGrade] = useState('');

  // Parse CSV content
  const parseCSVContent = useCallback(
    (
      content: string
    ): Array<{ name: string; email?: string; grade_section?: string }> => {
      const lines = content.trim().split('\n');
      if (lines.length === 0) return [];

      const firstLine = lines[0];
      const hasHeaders =
        firstLine.toLowerCase().includes('nombre') ||
        firstLine.toLowerCase().includes('name') ||
        firstLine.toLowerCase().includes('email');

      const dataLines = hasHeaders ? lines.slice(1) : lines;

      return dataLines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const columns = line
            .split(',')
            .map((col) => col.trim().replace(/^["']|["']$/g, ''));

          if (hasHeaders) {
            // Try to detect columns by headers
            const headers = firstLine
              .toLowerCase()
              .split(',')
              .map((h) => h.trim());
            const nameIndex = headers.findIndex(
              (h) => h.includes('nombre') || h.includes('name')
            );
            const emailIndex = headers.findIndex(
              (h) => h.includes('email') || h.includes('mail')
            );
            const gradeIndex = headers.findIndex(
              (h) =>
                h.includes('grado') ||
                h.includes('grade') ||
                h.includes('curso')
            );

            return {
              name: columns[nameIndex] || columns[0] || '',
              email: emailIndex >= 0 ? columns[emailIndex] : undefined,
              grade_section: gradeIndex >= 0 ? columns[gradeIndex] : undefined,
            };
          } else {
            // Assume: Name, Email, Grade (flexible)
            return {
              name: columns[0] || '',
              email:
                columns[1] && columns[1].includes('@') ? columns[1] : undefined,
              grade_section:
                columns[2] ||
                (columns[1] && !columns[1].includes('@')
                  ? columns[1]
                  : undefined),
            };
          }
        })
        .filter((item) => item.name.length > 0);
    },
    []
  );

  // Parse text input (existing logic from SessionMode)
  const parseTextInput = useCallback(
    (text: string): Array<{ name: string; grade_section?: string }> => {
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          // Formatos: "Nombre - Grado" o "Nombre, Grado" o solo "Nombre"
          const byDash = line.split(' - ');
          const byComma = line.split(',');
          if (byDash.length >= 2)
            return {
              name: byDash[0].trim(),
              grade_section: byDash.slice(1).join(' - ').trim(),
            };
          if (byComma.length >= 2)
            return {
              name: byComma[0].trim(),
              grade_section: byComma.slice(1).join(',').trim(),
            };
          return { name: line };
        });
    },
    []
  );

  // Handle CSV file selection
  const handleCSVFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === 'text/csv') {
        setCsvFile(file);
      } else {
        toast.error('Por favor selecciona un archivo CSV válido');
      }
    },
    []
  );

  // Submit students to API
  const submitStudents = useCallback(
    async (
      students: Array<{ name: string; email?: string; grade_section?: string }>
    ) => {
      if (students.length === 0) {
        toast.error('No hay estudiantes válidos para agregar');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/subjects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: students.map((s) => ({ ...s, event_id: eventId })),
          }),
        });

        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || 'Error en carga masiva');

        const created = (data.created || []).map((c: any) => ({
          id: c.id as string,
          name: c.name as string,
          email: students.find((s) => s.name === c.name)?.email,
          grade_section: students.find((s) => s.name === c.name)?.grade_section,
          token: c.token as string,
        }));

        toast.success(
          `✅ Se agregaron ${created.length} estudiantes al evento`,
          {
            description: eventName ? `Evento: ${eventName}` : undefined,
          }
        );

        onStudentsAdded?.(created);

        // Reset form
        setCsvFile(null);
        setTextInput('');
        setManualName('');
        setManualEmail('');
        setManualGrade('');
      } catch (e: any) {
        console.error('Error adding students:', e);
        toast.error(e?.message || 'Error al agregar estudiantes');
      } finally {
        setIsLoading(false);
      }
    },
    [eventId, eventName, onStudentsAdded]
  );

  // Handle CSV upload
  const handleCSVUpload = useCallback(async () => {
    if (!csvFile) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    try {
      const content = await csvFile.text();
      const students = parseCSVContent(content);
      await submitStudents(students);
    } catch (error) {
      toast.error('Error al procesar el archivo CSV');
    }
  }, [csvFile, parseCSVContent, submitStudents]);

  // Handle text input
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) {
      toast.error('Por favor ingresa una lista de estudiantes');
      return;
    }

    const students = parseTextInput(textInput);
    await submitStudents(students);
  }, [textInput, parseTextInput, submitStudents]);

  // Handle manual addition
  const handleManualSubmit = useCallback(async () => {
    if (!manualName.trim()) {
      toast.error('Por favor ingresa un nombre');
      return;
    }

    const student = {
      name: manualName.trim(),
      email: manualEmail.trim() || undefined,
      grade_section: manualGrade.trim() || undefined,
    };

    await submitStudents([student]);
  }, [manualName, manualEmail, manualGrade, submitStudents]);

  // Download sample CSV
  const downloadSampleCSV = useCallback(() => {
    const sampleContent = `Nombre,Email,Grado
Ana García López,ana.garcia@email.com,5to A
Carlos Rodríguez,carlos.rodriguez@email.com,5to A
María López,maria.lopez@email.com,5to B
Pedro Martínez,pedro.martinez@email.com,5to B`;

    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejemplo-estudiantes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('📄 Archivo de ejemplo descargado');
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Agregar Estudiantes
          </h3>
          {eventName && (
            <p className="text-muted-foreground text-sm">
              Evento: <Badge variant="outline">{eventName}</Badge>
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleCSV}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar ejemplo CSV
        </Button>
      </div>

      {/* Method Selection */}
      <div className="bg-muted flex gap-2 rounded-lg p-1">
        <Button
          variant={uploadMethod === 'csv' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setUploadMethod('csv')}
          className="flex-1"
        >
          <FileText className="mr-1 h-4 w-4" />
          Archivo CSV
        </Button>
        <Button
          variant={uploadMethod === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setUploadMethod('text')}
          className="flex-1"
        >
          <FileText className="mr-1 h-4 w-4" />
          Lista de texto
        </Button>
        <Button
          variant={uploadMethod === 'manual' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setUploadMethod('manual')}
          className="flex-1"
        >
          <Plus className="mr-1 h-4 w-4" />
          Individual
        </Button>
      </div>

      {/* CSV Upload Method */}
      {uploadMethod === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Subir Archivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-muted-foreground/25 rounded-lg border-2 border-dashed p-6">
              <div className="text-center">
                <Upload className="text-muted-foreground/50 mx-auto h-12 w-12" />
                <div className="mt-4">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80 text-sm font-medium">
                      Seleccionar archivo CSV
                    </span>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVFileChange}
                    />
                  </label>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Formatos: Nombre, Email, Grado (opcional)
                </p>
              </div>
            </div>

            {csvFile && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{csvFile.name}</span>
                </div>
                <Button
                  onClick={handleCSVUpload}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-4 w-4" />
                  )}
                  Importar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Text Input Method */}
      {uploadMethod === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de Texto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`Pega tu lista aquí, un estudiante por línea:

Ana García López - 5to A
Carlos Rodríguez, 5to B
María López
Pedro Martínez - 6to A`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Agregar Estudiantes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Input Method */}
      {uploadMethod === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar Individual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre completo"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Grado/Sección</label>
                <Input
                  placeholder="5to A, 1er B, etc."
                  value={manualGrade}
                  onChange={(e) => setManualGrade(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleManualSubmit}
              disabled={!manualName.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Agregar Estudiante
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
