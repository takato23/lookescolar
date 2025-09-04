'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Users,
  Plus,
  Download,
  FileText,
  Wand2,
  User,
  School,
  BookOpen,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  grade?: string;
  section?: string;
  level?: string;
  course?: string;
  token?: string;
}

interface StudentManagerProps {
  eventId: string;
  eventName: string;
  onStudentsAdded?: (students: Student[]) => void;
}

export default function StudentManager({ eventId, eventName, onStudentsAdded }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'format'>('upload');
  const [rawText, setRawText] = useState('');
  const [formattedData, setFormattedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Ejemplo de datos CSV esperados
  const exampleCSV = `Nombre,Email,Telefono,Nivel,Curso
Juan Pérez,juan@email.com,1234567890,Secundario,6to A
María González,maria@email.com,0987654321,Secundario,6to A
Carlos López,carlos@email.com,1122334455,Primario,4to B`;

  const formatWithChatGPT = async () => {
    setIsProcessing(true);
    
    // Simulación de formateo con ChatGPT
    // En la implementación real, aquí harías una llamada a la API de OpenAI
    setTimeout(() => {
      const lines = rawText.split('\n').filter(line => line.trim());
      const formatted = lines.map((line, index) => {
        // Formato básico para demostrar
        const parts = line.split(/[,;\t]/).map(p => p.trim());
        if (parts.length >= 1) {
          return {
            name: parts[0] || `Estudiante ${index + 1}`,
            email: parts[1] || '',
            phone: parts[2] || '',
            level: parts[3] || 'Secundario',
            course: parts[4] || '6to A',
          };
        }
        return null;
      }).filter(Boolean);

      setFormattedData(JSON.stringify(formatted, null, 2));
      setIsProcessing(false);
    }, 2000);
  };

  const processFormattedData = () => {
    try {
      const parsed = JSON.parse(formattedData);
      const newStudents = parsed.map((student: any, index: number) => ({
        id: `student-${Date.now()}-${index}`,
        ...student,
        token: generateToken(),
      }));
      
      setStudents(prev => [...prev, ...newStudents]);
      onStudentsAdded?.(newStudents);
      setIsOpen(false);
      setRawText('');
      setFormattedData('');
    } catch (error) {
      alert('Error procesando los datos. Verifica el formato JSON.');
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const exportStudents = () => {
    const csv = [
      ['Nombre', 'Email', 'Teléfono', 'Nivel', 'Curso', 'Token'],
      ...students.map(s => [s.name, s.email || '', s.phone || '', s.level || '', s.course || '', s.token || ''])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudiantes-${eventName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Gestión de Estudiantes</h3>
            <p className="text-sm text-gray-500">{students.length} estudiantes registrados</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {students.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportStudents}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Estudiantes
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Cargar Lista de Estudiantes
                </DialogTitle>
                <DialogDescription>
                  Importa estudiantes usando diferentes métodos. Puedes formatear tus datos usando ChatGPT para mayor precisión.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                      activeTab === 'upload' 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Pegar Lista
                  </button>
                  <button
                    onClick={() => setActiveTab('format')}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                      activeTab === 'format' 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Wand2 className="h-4 w-4 inline mr-2" />
                    Formatear con IA
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                      activeTab === 'manual' 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Manual
                  </button>
                </div>

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="raw-text">Lista de Estudiantes (cualquier formato)</Label>
                      <Textarea
                        id="raw-text"
                        placeholder="Pega aquí tu lista de estudiantes en cualquier formato..."
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="mt-2 min-h-[200px]"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Acepta CSV, texto separado por comas, tabs, o incluso texto libre.
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Formato CSV Recomendado:</h4>
                      <pre className="text-sm text-blue-800 bg-white border border-blue-200 rounded p-2 overflow-x-auto">
                        {exampleCSV}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={formatWithChatGPT}
                        disabled={!rawText.trim() || isProcessing}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white" />
                            Formateando...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Formatear con IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Format Tab */}
                {activeTab === 'format' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="formatted-data">Datos Formateados (JSON)</Label>
                      <Textarea
                        id="formatted-data"
                        placeholder="Los datos formateados aparecerán aquí..."
                        value={formattedData}
                        onChange={(e) => setFormattedData(e.target.value)}
                        className="mt-2 min-h-[300px] font-mono text-sm"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Revisa y edita los datos antes de importar.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={processFormattedData}
                        disabled={!formattedData.trim()}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Importar Estudiantes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setFormattedData('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Manual Tab */}
                {activeTab === 'manual' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Agregar estudiantes uno por uno manualmente.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" placeholder="Juan Pérez" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="juan@email.com" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" placeholder="1234567890" />
                      </div>
                      <div>
                        <Label htmlFor="level">Nivel</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar nivel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jardin">Jardín</SelectItem>
                            <SelectItem value="primario">Primario</SelectItem>
                            <SelectItem value="secundario">Secundario</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="course">Curso</Label>
                        <Input id="course" placeholder="6to A" />
                      </div>
                    </div>

                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Estudiante
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Students List */}
      {students.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-full">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{student.name}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(student.token || '');
                      }}
                      className="p-1 h-auto"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    {student.email && (
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-gray-500">Email:</span>
                        <span>{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-gray-500">Tel:</span>
                        <span>{student.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-gray-500">Curso:</span>
                      <span>{student.level} - {student.course}</span>
                    </div>
                    {student.token && (
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-gray-500">Token:</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {student.token.substring(0, 8)}...
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay estudiantes registrados
              </h3>
              <p className="text-gray-500 mb-6">
                Comienza agregando estudiantes al evento para generar tokens de acceso y organizar las fotografías.
              </p>
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primeros Estudiantes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



