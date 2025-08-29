'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  QrCode, 
  RefreshCw, 
  Clock,
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
  GraduationCap
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  email?: string;
  phone?: string;
  qr_code?: string;
  has_active_token: boolean;
  token_expires_at?: string;
  photo_count: number;
  last_photo_tagged?: string;
  created_at: string;
}

interface StudentsViewProps {
  eventId: string;
  eventName?: string;
  onBack: () => void;
}

export default function StudentsView({ eventId, eventName, onBack }: StudentsViewProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [regeneratingTokens, setRegeneratingTokens] = useState<Set<string>>(new Set());

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/events/${eventId}/students`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load students');
        }

        setStudents(data.students || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load students';
        setError(message);
        console.error('Error loading students:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [eventId]);

  // Filter students based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.grade?.toLowerCase().includes(query) ||
      student.section?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.qr_code?.toLowerCase().includes(query)
    );
    
    setFilteredStudents(filtered);
  }, [students, searchQuery]);

  // Generate/regenerate token for a student
  const handleRegenerateToken = async (studentId: string) => {
    try {
      setRegeneratingTokens(prev => new Set([...prev, studentId]));

      const response = await fetch(`/api/admin/events/${eventId}/generate-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_ids: [studentId] }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate token');
      }

      // Reload students to get updated token
      const studentsResponse = await fetch(`/api/admin/events/${eventId}/students`);
      const studentsData = await studentsResponse.json();
      
      if (studentsResponse.ok) {
        setStudents(studentsData.students || []);
      }
    } catch (err) {
      console.error('Error regenerating token:', err);
      // You might want to show a toast notification here
    } finally {
      setRegeneratingTokens(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Check if token is expiring soon (within 7 days)
  const isTokenExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg font-medium text-gray-900">Cargando estudiantes...</p>
          <p className="text-sm text-gray-600 mt-2">Obteniendo lista de estudiantes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-lg font-medium text-red-700">Error al cargar estudiantes</p>
          <p className="text-sm text-red-600 mt-2">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Estudiantes del Evento
            </h1>
            {eventName && (
              <p className="text-gray-600">{eventName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {filteredStudents.length} estudiantes
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar estudiantes por nombre, grado, sección, email o código QR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <Card key={student.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    {student.name}
                  </CardTitle>
                  {(student.grade || student.section) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {[student.grade, student.section].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
                {student.has_active_token ? (
                  <Badge 
                    variant={isTokenExpiringSoon(student.token_expires_at) ? "outline" : "default"}
                    className={isTokenExpiringSoon(student.token_expires_at) ? "border-amber-500 text-amber-700" : "bg-green-100 text-green-800"}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {isTokenExpiringSoon(student.token_expires_at) ? 'Expira pronto' : 'Token activo'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Sin token
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Contact Info */}
              {(student.email || student.phone) && (
                <div className="space-y-2">
                  {student.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}
                  {student.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code */}
              {student.qr_code && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <QrCode className="h-4 w-4" />
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                    {student.qr_code}
                  </code>
                </div>
              )}

              {/* Token Info */}
              {student.token_expires_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Token expira: {formatDate(student.token_expires_at)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateToken(student.id)}
                  disabled={regeneratingTokens.has(student.id)}
                  className="flex-1"
                >
                  {regeneratingTokens.has(student.id) ? (
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3 w-3" />
                  )}
                  {student.has_active_token ? 'Renovar' : 'Generar'} Token
                </Button>
                
                {student.has_active_token && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/f/${student.qr_code}`)}
                  >
                    Ver Galería
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Intenta con otros términos de búsqueda.'
                : 'Agrega estudiantes a este evento para comenzar.'
              }
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Limpiar búsqueda
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}