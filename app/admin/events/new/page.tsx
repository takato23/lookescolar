'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    school: '',
    date: '',
    active: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // En desarrollo, no verificar autenticación
      if (process.env.NODE_ENV === 'production') {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError('No estás autenticado');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.school.trim(),
          location: formData.school.trim(),
          date: formData.date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating event:', data);
        setError(data.error || 'Error creando evento');
        setLoading(false);
        return;
      }

      // Verificar que se recibió un evento válido
      if (data.success && data.event) {
        console.log('Evento creado exitosamente:', data.event);
        // Redirigir a la página de eventos
        router.push('/admin/events');
        router.refresh();
      } else {
        setError('Respuesta inesperada del servidor');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError('Error al crear el evento');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-white">Nuevo Evento</h1>
        <p className="text-white/70">Crea una nueva sesión fotográfica</p>
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="school"
                className="mb-2 block text-sm font-medium text-white/90"
              >
                Escuela / Institución *
              </label>
              <input
                id="school"
                type="text"
                required
                value={formData.school}
                onChange={(e) =>
                  setFormData({ ...formData, school: e.target.value })
                }
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: Colegio San Martín"
              />
            </div>

            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-sm font-medium text-white/90"
              >
                Fecha del Evento *
              </label>
              <input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <label htmlFor="active" className="text-sm text-white/90">
                Evento activo
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/events"
              className="px-6 py-3 text-white/70 transition-colors hover:text-white"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
