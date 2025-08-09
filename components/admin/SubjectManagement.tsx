'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Download,
  QrCode,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  RotateCw,
  Copy,
  CheckCircle,
  Calendar,
  Search,
  Filter,
  Plus,
  FileText,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/feedback';
import {
  AccessibleButton,
  AccessibleField,
  AccessibleModal,
} from '@/components/ui/accessible';
import { cn } from '@/lib/utils/cn';

interface Subject {
  id: string;
  name: string;
  type: 'student' | 'couple' | 'family';
  token: string;
  event_id: string;
  created_at: string;
  expires_at?: string;
  photo_count: number;
  order_count: number;
  last_access?: string;
  status: 'active' | 'expired' | 'used';
}

interface SubjectManagementProps {
  eventId: string;
  className?: string;
}

type SubjectType = 'student' | 'couple' | 'family';
type FilterStatus = 'all' | 'active' | 'expired' | 'used';

const SUBJECT_TYPE_LABELS = {
  student: 'Estudiante',
  couple: 'Pareja',
  family: 'Familia',
};

export function SubjectManagement({
  eventId,
  className,
}: SubjectManagementProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<SubjectType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);

  const { addToast } = useToast();

  // Load subjects
  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/subjects?event_id=${eventId}&include_stats=true`
      );

      if (!response.ok) {
        throw new Error('Error cargando sujetos');
      }

      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      addToast({
        type: 'error',
        title: 'Error cargando sujetos',
        description: 'No se pudieron cargar los sujetos del evento',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, addToast]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Filter subjects
  useEffect(() => {
    let filtered = subjects;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((subject) => subject.status === filterStatus);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((subject) => subject.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (subject) =>
          subject.name.toLowerCase().includes(query) ||
          subject.token.toLowerCase().includes(query)
      );
    }

    setFilteredSubjects(filtered);
  }, [subjects, filterStatus, filterType, searchQuery]);

  // Create subject
  const handleCreateSubject = useCallback(
    async (subjectData: {
      name: string;
      type: SubjectType;
      expires_at?: string;
    }) => {
      try {
        const response = await fetch('/api/admin/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...subjectData,
            event_id: eventId,
          }),
        });

        if (!response.ok) {
          throw new Error('Error creando sujeto');
        }

        const newSubject = await response.json();
        setSubjects((prev) => [...prev, newSubject]);
        setShowCreateModal(false);

        addToast({
          type: 'success',
          title: 'Sujeto creado',
          description: `${subjectData.name} creado exitosamente`,
        });
      } catch (error) {
        console.error('Error creating subject:', error);
        addToast({
          type: 'error',
          title: 'Error creando sujeto',
          description: 'No se pudo crear el sujeto',
        });
      }
    },
    [eventId, addToast]
  );

  // Update subject
  const handleUpdateSubject = useCallback(
    async (subjectId: string, updates: Partial<Subject>) => {
      try {
        const response = await fetch(`/api/admin/subjects/${subjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Error actualizando sujeto');
        }

        const updatedSubject = await response.json();
        setSubjects((prev) =>
          prev.map((s) => (s.id === subjectId ? updatedSubject : s))
        );
        setShowEditModal(false);
        setSelectedSubject(null);

        addToast({
          type: 'success',
          title: 'Sujeto actualizado',
          description: 'Los cambios se guardaron correctamente',
        });
      } catch (error) {
        console.error('Error updating subject:', error);
        addToast({
          type: 'error',
          title: 'Error actualizando sujeto',
          description: 'No se pudieron guardar los cambios',
        });
      }
    },
    [addToast]
  );

  // Delete subject
  const handleDeleteSubject = useCallback(
    async (subjectId: string) => {
      if (!confirm('¿Estás seguro de que deseas eliminar este sujeto?')) return;

      try {
        const response = await fetch(`/api/admin/subjects/${subjectId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Error eliminando sujeto');
        }

        setSubjects((prev) => prev.filter((s) => s.id !== subjectId));

        addToast({
          type: 'success',
          title: 'Sujeto eliminado',
          description: 'El sujeto se eliminó correctamente',
        });
      } catch (error) {
        console.error('Error deleting subject:', error);
        addToast({
          type: 'error',
          title: 'Error eliminando sujeto',
          description: 'No se pudo eliminar el sujeto',
        });
      }
    },
    [addToast]
  );

  // Rotate token
  const handleRotateToken = useCallback(
    async (subjectId: string) => {
      if (
        !confirm(
          '¿Generar un nuevo token? El token actual dejará de funcionar.'
        )
      )
        return;

      try {
        const response = await fetch(
          `/api/admin/subjects/${subjectId}/rotate-token`,
          {
            method: 'POST',
          }
        );

        if (!response.ok) {
          throw new Error('Error rotando token');
        }

        const updatedSubject = await response.json();
        setSubjects((prev) =>
          prev.map((s) => (s.id === subjectId ? updatedSubject : s))
        );

        addToast({
          type: 'success',
          title: 'Token rotado',
          description: 'Se generó un nuevo token para el sujeto',
        });
      } catch (error) {
        console.error('Error rotating token:', error);
        addToast({
          type: 'error',
          title: 'Error rotando token',
          description: 'No se pudo generar un nuevo token',
        });
      }
    },
    [addToast]
  );

  // Copy token
  const handleCopyToken = useCallback(
    async (token: string) => {
      try {
        await navigator.clipboard.writeText(token);
        addToast({
          type: 'success',
          title: 'Token copiado',
          description: 'El token se copió al portapapeles',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error copiando token',
          description: 'No se pudo copiar el token',
        });
      }
    },
    [addToast]
  );

  // Download QR codes PDF
  const handleDownloadQRPDF = useCallback(
    async (subjectIds?: string[]) => {
      try {
        setDownloadingQR(true);

        const params = new URLSearchParams({
          event_id: eventId,
          ...(subjectIds && { subject_ids: subjectIds.join(',') }),
        });

        const response = await fetch(`/api/admin/subjects/qr-pdf?${params}`);

        if (!response.ok) {
          throw new Error('Error generando PDF QR');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `qr-codes-${eventId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        addToast({
          type: 'success',
          title: 'PDF descargado',
          description: 'El archivo PDF con códigos QR se descargó exitosamente',
        });
      } catch (error) {
        console.error('Error downloading QR PDF:', error);
        addToast({
          type: 'error',
          title: 'Error descargando PDF',
          description: 'No se pudo generar el PDF con códigos QR',
        });
      } finally {
        setDownloadingQR(false);
      }
    },
    [eventId, addToast]
  );

  // Bulk create subjects
  const handleBulkCreate = useCallback(
    async (subjectsData: Array<{ name: string; type: SubjectType }>) => {
      try {
        setBulkCreating(true);

        const response = await fetch('/api/admin/subjects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            subjects: subjectsData,
          }),
        });

        if (!response.ok) {
          throw new Error('Error creando sujetos masivamente');
        }

        const { subjects: newSubjects } = await response.json();
        setSubjects((prev) => [...prev, ...newSubjects]);

        addToast({
          type: 'success',
          title: 'Sujetos creados',
          description: `Se crearon ${newSubjects.length} sujetos exitosamente`,
        });
      } catch (error) {
        console.error('Error bulk creating subjects:', error);
        addToast({
          type: 'error',
          title: 'Error creación masiva',
          description: 'No se pudieron crear los sujetos',
        });
      } finally {
        setBulkCreating(false);
      }
    },
    [eventId, addToast]
  );

  // Stats
  const stats = {
    total: subjects.length,
    active: subjects.filter((s) => s.status === 'active').length,
    expired: subjects.filter((s) => s.status === 'expired').length,
    used: subjects.filter((s) => s.status === 'used').length,
    withPhotos: subjects.filter((s) => s.photo_count > 0).length,
    withOrders: subjects.filter((s) => s.order_count > 0).length,
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p>Cargando sujetos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Gestión de Sujetos
            </div>
            <div className="flex items-center gap-2">
              <AccessibleButton
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="sm"
                ariaLabel="Crear nuevo sujeto"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Sujeto
              </AccessibleButton>
              <AccessibleButton
                onClick={() => handleDownloadQRPDF()}
                disabled={subjects.length === 0 || downloadingQR}
                variant="outline"
                size="sm"
                ariaLabel="Descargar PDF con todos los códigos QR"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingQR ? 'Generando...' : 'QR PDF'}
              </AccessibleButton>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
              <div className="text-sm text-gray-600">Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.expired}
              </div>
              <div className="text-sm text-gray-600">Expirados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.used}
              </div>
              <div className="text-sm text-gray-600">Usados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.withPhotos}
              </div>
              <div className="text-sm text-gray-600">Con Fotos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {stats.withOrders}
              </div>
              <div className="text-sm text-gray-600">Con Pedidos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Search */}
          <AccessibleField label="Buscar sujetos" id="subject-search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="subject-search"
                type="text"
                placeholder="Buscar por nombre o token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </AccessibleField>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex gap-2">
              <span className="py-2 text-sm font-medium text-gray-700">
                Estado:
              </span>
              {(['all', 'active', 'expired', 'used'] as FilterStatus[]).map(
                (status) => (
                  <AccessibleButton
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    variant={filterStatus === status ? 'primary' : 'ghost'}
                    size="sm"
                    className="text-xs"
                  >
                    {status === 'all' && 'Todos'}
                    {status === 'active' && 'Activos'}
                    {status === 'expired' && 'Expirados'}
                    {status === 'used' && 'Usados'}
                  </AccessibleButton>
                )
              )}
            </div>

            <div className="flex gap-2">
              <span className="py-2 text-sm font-medium text-gray-700">
                Tipo:
              </span>
              {(
                ['all', 'student', 'couple', 'family'] as (
                  | SubjectType
                  | 'all'
                )[]
              ).map((type) => (
                <AccessibleButton
                  key={type}
                  onClick={() => setFilterType(type)}
                  variant={filterType === type ? 'primary' : 'ghost'}
                  size="sm"
                  className="text-xs"
                >
                  {type === 'all'
                    ? 'Todos'
                    : SUBJECT_TYPE_LABELS[type as SubjectType]}
                </AccessibleButton>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-600">
                No hay sujetos
              </h3>
              <p className="text-gray-500">
                {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                  ? 'No se encontraron sujetos con los filtros actuales'
                  : 'Crea tu primer sujeto para comenzar'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={() => {
                setSelectedSubject(subject);
                setShowEditModal(true);
              }}
              onDelete={() => handleDeleteSubject(subject.id)}
              onRotateToken={() => handleRotateToken(subject.id)}
              onCopyToken={() => handleCopyToken(subject.token)}
              onDownloadQR={() => handleDownloadQRPDF([subject.id])}
            />
          ))
        )}
      </div>

      {/* Create Subject Modal */}
      {showCreateModal && (
        <CreateSubjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubject}
        />
      )}

      {/* Edit Subject Modal */}
      {showEditModal && selectedSubject && (
        <EditSubjectModal
          isOpen={showEditModal}
          subject={selectedSubject}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubject(null);
          }}
          onSubmit={(updates) =>
            handleUpdateSubject(selectedSubject.id, updates)
          }
        />
      )}
    </div>
  );
}

// Subject Card Component
interface SubjectCardProps {
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
  onRotateToken: () => void;
  onCopyToken: () => void;
  onDownloadQR: () => void;
}

function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onRotateToken,
  onCopyToken,
  onDownloadQR,
}: SubjectCardProps) {
  const [showToken, setShowToken] = useState(false);

  const getStatusColor = (status: Subject['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'used':
        return 'info';
      default:
        return 'pending';
    }
  };

  const getStatusLabel = (status: Subject['status']) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'expired':
        return 'Expirado';
      case 'used':
        return 'Usado';
      default:
        return 'Desconocido';
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center gap-4">
            {/* Subject info */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <h3 className="truncate font-semibold text-gray-900">
                  {subject.name}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {SUBJECT_TYPE_LABELS[subject.type]}
                </Badge>
                <Badge
                  status={getStatusColor(subject.status)}
                  className="text-xs"
                >
                  {getStatusLabel(subject.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 lg:grid-cols-4">
                <div>
                  <span className="font-medium">Fotos:</span>{' '}
                  {subject.photo_count}
                </div>
                <div>
                  <span className="font-medium">Pedidos:</span>{' '}
                  {subject.order_count}
                </div>
                <div>
                  <span className="font-medium">Creado:</span>{' '}
                  {new Date(subject.created_at).toLocaleDateString('es-AR')}
                </div>
                {subject.last_access && (
                  <div>
                    <span className="font-medium">Último acceso:</span>{' '}
                    {new Date(subject.last_access).toLocaleDateString('es-AR')}
                  </div>
                )}
              </div>

              {/* Token */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Token:
                </span>
                <div className="flex flex-1 items-center gap-2">
                  <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                    {showToken
                      ? subject.token
                      : `${subject.token.slice(0, 8)}...${subject.token.slice(-8)}`}
                  </code>
                  <AccessibleButton
                    onClick={() => setShowToken(!showToken)}
                    variant="ghost"
                    size="sm"
                    ariaLabel={
                      showToken ? 'Ocultar token' : 'Mostrar token completo'
                    }
                  >
                    {showToken ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </AccessibleButton>
                  <AccessibleButton
                    onClick={onCopyToken}
                    variant="ghost"
                    size="sm"
                    ariaLabel="Copiar token al portapapeles"
                  >
                    <Copy className="h-3 w-3" />
                  </AccessibleButton>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <AccessibleButton
                onClick={onDownloadQR}
                variant="outline"
                size="sm"
                ariaLabel={`Descargar código QR para ${subject.name}`}
              >
                <QrCode className="mr-2 h-4 w-4" />
                QR
              </AccessibleButton>
              <AccessibleButton
                onClick={onEdit}
                variant="ghost"
                size="sm"
                ariaLabel={`Editar sujeto ${subject.name}`}
              >
                <Edit className="h-4 w-4" />
              </AccessibleButton>
              <AccessibleButton
                onClick={onRotateToken}
                variant="ghost"
                size="sm"
                ariaLabel={`Generar nuevo token para ${subject.name}`}
              >
                <RotateCw className="h-4 w-4" />
              </AccessibleButton>
              <AccessibleButton
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                ariaLabel={`Eliminar sujeto ${subject.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </AccessibleButton>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Subject Modal
interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: SubjectType;
    expires_at?: string;
  }) => void;
}

function CreateSubjectModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'student' as SubjectType,
    expires_at: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      type: formData.type,
      expires_at: formData.expires_at || undefined,
    });

    setFormData({ name: '', type: 'student', expires_at: '' });
    setErrors({});
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Sujeto"
      description="Complete los datos del nuevo sujeto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AccessibleField label="Nombre" required error={errors.name}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Nombre del sujeto"
          />
        </AccessibleField>

        <AccessibleField label="Tipo">
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as SubjectType,
              }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.entries(SUBJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </AccessibleField>

        <AccessibleField
          label="Fecha de expiración"
          hint="Opcional - Si no se especifica, el token no expirará"
        >
          <input
            type="date"
            value={formData.expires_at}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, expires_at: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </AccessibleField>

        <div className="flex justify-end gap-2 pt-4">
          <AccessibleButton type="button" onClick={onClose} variant="ghost">
            Cancelar
          </AccessibleButton>
          <AccessibleButton type="submit" variant="primary">
            Crear Sujeto
          </AccessibleButton>
        </div>
      </form>
    </AccessibleModal>
  );
}

// Edit Subject Modal
interface EditSubjectModalProps {
  isOpen: boolean;
  subject: Subject;
  onClose: () => void;
  onSubmit: (updates: Partial<Subject>) => void;
}

function EditSubjectModal({
  isOpen,
  subject,
  onClose,
  onSubmit,
}: EditSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: subject.name,
    type: subject.type,
    expires_at: subject.expires_at ? subject.expires_at.split('T')[0] : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      type: formData.type,
      expires_at: formData.expires_at || undefined,
    });

    setErrors({});
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Sujeto"
      description="Modifica los datos del sujeto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AccessibleField label="Nombre" required error={errors.name}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Nombre del sujeto"
          />
        </AccessibleField>

        <AccessibleField label="Tipo">
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as SubjectType,
              }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.entries(SUBJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </AccessibleField>

        <AccessibleField
          label="Fecha de expiración"
          hint="Opcional - Si no se especifica, el token no expirará"
        >
          <input
            type="date"
            value={formData.expires_at}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, expires_at: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </AccessibleField>

        <div className="flex justify-end gap-2 pt-4">
          <AccessibleButton type="button" onClick={onClose} variant="ghost">
            Cancelar
          </AccessibleButton>
          <AccessibleButton type="submit" variant="primary">
            Guardar Cambios
          </AccessibleButton>
        </div>
      </form>
    </AccessibleModal>
  );
}
