'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { maskToken } from '@/lib/utils/tokens';

interface Subject {
  id: string;
  event_id: string;
  name: string;
  grade?: string | null;
  token?: string;
  token_expires_at?: string;
  created_at: string | null;
}

export default function SubjectsSection({ eventId }: { eventId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    bulkText: '',
  });

  useEffect(() => {
    loadSubjects();
  }, [eventId]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/subjects?event_id=${eventId}`);
      if (!resp.ok) throw new Error('Error al cargar alumnos');
      const j = await resp.json();
      setSubjects(j.subjects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const resp = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim(), event_id: eventId }),
      });
      if (!resp.ok) throw new Error('Error creando alumno');

      setFormData({ name: '', grade: '', bulkText: '' });
      setShowAddForm(false);
      await loadSubjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Parse bulk text (format: "Name, Grade" per line)
      const lines = formData.bulkText.split('\n').filter((line) => line.trim());
      const subjectsToAdd = lines.map((line) => {
        const [name, grade] = line.split(',').map((s) => s.trim());
        return {
          event_id: eventId,
          name: name || 'Sin nombre',
          grade: grade || null,
        };
      });

      if (subjectsToAdd.length === 0) {
        setError('No se encontraron alumnos para agregar');
        return;
      }

      for (const s of subjectsToAdd) {
        const resp = await fetch('/api/admin/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: s.name, event_id: s.event_id }),
        });
        if (!resp.ok) throw new Error('Error creando alumnos');
      }

      setFormData({ name: '', grade: '', bulkText: '' });
      setShowAddForm(false);
      setBulkMode(false);
      await loadSubjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRotateToken = async (_subjectId: string) => {
    if (
      !confirm(
        '¿Estás seguro de rotar este token? El token anterior dejará de funcionar.'
      )
    ) {
      return;
    }

    try {
      // Usa API para compatibilidad
      const resp = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '__rotate__', event_id: eventId }),
      });
      if (!resp.ok) throw new Error('Error rotando token');
      await loadSubjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('¿Estás seguro de eliminar este alumno?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;
      await loadSubjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    // Podrías agregar un toast notification aquí
  };

  const getFamilyUrl = (token: string) => {
    return `${window.location.origin}/f/${token}`;
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Alumnos y Familias</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
        >
          ➕ Agregar Alumnos
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Agregar Alumnos
            </h3>

            <div className="mb-4 flex space-x-2">
              <button
                onClick={() => setBulkMode(false)}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  !bulkMode
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  bulkMode
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                Múltiples
              </button>
            </div>

            {!bulkMode ? (
              <form onSubmit={handleAddSingle} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">
                    Nombre del Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">
                    Grado/Curso
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="5to A"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ name: '', grade: '', bulkText: '' });
                    }}
                    className="px-6 py-2 text-white/70 transition-colors hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddBulk} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">
                    Lista de Alumnos (uno por línea)
                  </label>
                  <p className="mb-2 text-sm text-white/50">
                    Formato: Nombre, Grado
                  </p>
                  <textarea
                    required
                    rows={10}
                    value={formData.bulkText}
                    onChange={(e) =>
                      setFormData({ ...formData, bulkText: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Juan Pérez, 5to A
María García, 5to B
Carlos López, 6to A"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setBulkMode(false);
                      setFormData({ name: '', grade: '', bulkText: '' });
                    }}
                    className="px-6 py-2 text-white/70 transition-colors hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                  >
                    Agregar Todos
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subjects List */}
      {loading ? (
        <div className="py-8 text-center text-white/50">Cargando...</div>
      ) : subjects.length === 0 ? (
        <div className="py-8 text-center text-white/50">
          No hay alumnos registrados. Agrega el primero para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-medium text-white/70">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/70">
                  Grado
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/70">
                  Token
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/70">
                  Expira
                </th>
                <th className="px-4 py-3 text-right font-medium text-white/70">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">{subject.name}</td>
                  <td className="px-4 py-3 text-white/70">
                    {subject.grade || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <code className="rounded bg-purple-900/30 px-2 py-1 text-xs text-purple-300">
                        {subject.token ? maskToken(subject.token) : '—'}
                      </code>
                      <button
                        onClick={() =>
                          subject.token && copyToken(subject.token)
                        }
                        className="text-xs text-white/50 hover:text-white"
                        title="Copiar token"
                      >
                        📋
                      </button>
                      <button
                        onClick={() =>
                          subject.token &&
                          copyToken(getFamilyUrl(subject.token))
                        }
                        className="text-xs text-white/50 hover:text-white"
                        title="Copiar URL"
                      >
                        🔗
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70">
                    {subject.token_expires_at
                      ? new Date(subject.token_expires_at).toLocaleDateString(
                          'es-AR'
                        )
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleRotateToken(subject.id)}
                        className="text-sm text-white/50 hover:text-yellow-400"
                        title="Rotar token"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="text-sm text-white/50 hover:text-red-400"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
