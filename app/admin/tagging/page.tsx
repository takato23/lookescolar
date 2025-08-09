'use client';

import React, { useState, useEffect } from 'react';
import { PhotoTagger } from '@/components/admin/PhotoTagger';

export default function TaggingPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Cargar eventos disponibles
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/admin/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data.data || []);

          // Seleccionar el primer evento activo por defecto
          const activeEvent = data.data?.find((event: any) => event.active);
          if (activeEvent) {
            setSelectedEventId(activeEvent.id);
          } else if (data.data?.length > 0) {
            setSelectedEventId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error cargando eventos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
        <span className="ml-3 text-white">Cargando eventos...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Tagging</h1>
          <p className="text-white/70">
            Asignar fotos a alumnos de manera intuitiva
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
              <span className="text-2xl text-orange-400">📅</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">
              No hay eventos disponibles
            </h2>
            <p className="mb-6 text-white/70">
              Crea un evento primero para comenzar el tagging
            </p>
            <a
              href="/admin/events/new"
              className="inline-block rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600"
            >
              Crear Evento
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Tagging</h1>
        <p className="text-white/70">
          Asignar fotos a alumnos de manera intuitiva y eficiente
        </p>
      </div>

      {/* Selector de evento */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-white/70">
          Seleccionar Evento
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="" disabled className="bg-gray-800">
            Selecciona un evento...
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id} className="bg-gray-800">
              {event.name} - {event.school} (
              {new Date(event.date).toLocaleDateString()})
              {event.active && ' ✅'}
            </option>
          ))}
        </select>
      </div>

      {/* Componente principal de tagging */}
      {selectedEventId ? (
        <PhotoTagger eventId={selectedEventId} />
      ) : (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <span className="text-2xl text-white">🏷️</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Selecciona un Evento
            </h2>
            <p className="text-white/70">
              Elige un evento del selector de arriba para comenzar el tagging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
