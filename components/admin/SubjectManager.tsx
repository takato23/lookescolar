'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Plus,
  Download,
  Edit2,
  Trash2,
  QrCode,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  grade_section?: string;
  token?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

interface SubjectManagerProps {
  eventId: string;
  event: Event;
  subjects: Subject[];
  onSubjectsUpdate: () => void;
}

export default function SubjectManager({
  eventId,
  event,
  subjects,
  onSubjectsUpdate,
}: SubjectManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    grade_section: '',
  });

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          event_id: eventId,
        }),
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({ name: '', email: '', phone: '', grade_section: '' });
        onSubjectsUpdate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Error agregando sujeto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('¿Está seguro de eliminar este sujeto?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSubjectsUpdate();
      } else {
        alert('Error eliminando sujeto');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Error eliminando sujeto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <Card className="p-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Gestión de Sujetos</h2>
            <p className="text-sm text-gray-600">
              Total: {subjects.length} sujetos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              Agregar Sujeto
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading || subjects.length === 0}
            >
              <Download className="h-4 w-4" />
              Descargar QRs
            </Button>
          </div>
        </div>
      </Card>

      {/* Formulario de agregar */}
      {showAddForm && (
        <Card className="p-6">
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Agregar Sujeto</h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Grado/Sección
                </label>
                <input
                  type="text"
                  value={formData.grade_section}
                  onChange={(e) =>
                    setFormData({ ...formData, grade_section: e.target.value })
                  }
                  placeholder="Ej: 5to A"
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de sujetos */}
      <div className="space-y-4">
        {subjects.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p>No hay sujetos en este evento.</p>
            <p className="mt-1 text-sm">
              Agregue sujetos para generar QRs y tokens.
            </p>
          </Card>
        ) : (
          subjects.map((subject) => (
            <Card key={subject.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{subject.name}</h3>
                  {subject.grade_section && (
                    <p className="text-sm text-gray-600">
                      {subject.grade_section}
                    </p>
                  )}
                  {subject.email && (
                    <p className="text-sm text-gray-500">{subject.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <QrCode className="h-4 w-4" />
                    QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Token
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
