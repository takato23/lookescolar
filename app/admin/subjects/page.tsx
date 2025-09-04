'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import SubjectManager from '@/components/admin/SubjectManager';
import { Users, Plus, Filter, Search, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  event_id: string;
  name: string;
  email?: string;
  phone?: string;
  grade_section?: string;
  token?: string;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
}

interface SubjectWithEvent extends Subject {
  event: Event;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithEvent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar eventos
      const eventsResponse = await fetch('/api/admin/events');
      if (!eventsResponse.ok) {
        throw new Error('Error cargando eventos');
      }
      const eventsData = await eventsResponse.json();
      const list = Array.isArray(eventsData)
        ? eventsData
        : eventsData.events || eventsData.data?.events || eventsData.data || [];
      setEvents(list);

      // Cargar sujetos con información del evento
      const subjectsResponse = await fetch('/api/admin/subjects');
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData.subjects || []);
      }
    } catch (error: any) {
      setError(error.message);
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    // Filtro por evento
    if (selectedEventId && subject.event_id !== selectedEventId) {
      return false;
    }

    // Filtro por grado
    if (gradeFilter !== 'all' && subject.grade_section !== gradeFilter) {
      return false;
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = subject.name.toLowerCase();
      const email = subject.email?.toLowerCase() || '';
      const grade = subject.grade_section?.toLowerCase() || '';

      return (
        name.includes(query) ||
        email.includes(query) ||
        grade.includes(query) ||
        subject.event.name.toLowerCase().includes(query) ||
        subject.event.school.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50 p-6">
          <div className="text-red-700">
            <h3 className="mb-2 font-semibold">Error cargando datos</h3>
            <p>{error}</p>
            <Button onClick={loadData} className="mt-4">
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Si hay un evento seleccionado, mostrar el gestor de sujetos
  if (selectedEvent) {
    const eventSubjects = subjects.filter(
      (s) => s.event_id === selectedEvent.id
    );

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setSelectedEventId('')}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a eventos
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Tokens y QRs</h1>
            <p className="text-gray-600">{selectedEvent.name}</p>
          </div>
        </div>

        <SubjectManager
          eventId={selectedEvent.id}
          event={selectedEvent}
          subjects={eventSubjects}
          onSubjectsUpdate={loadData}
        />
      </div>
    );
  }

  // Vista principal con lista de eventos y sujetos
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Sujetos</h1>
          <p className="text-gray-600">
            Administre sujetos, tokens y códigos QR
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar Sujeto
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Evento</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {event.school}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Grado</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="all">Todos los grados</option>
              <option value="1ro">1ro</option>
              <option value="2do">2do</option>
              <option value="3ro">3ro</option>
              <option value="4to">4to</option>
              <option value="5to">5to</option>
              <option value="6to">6to</option>
              <option value="7mo">7mo</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, evento..."
                className="w-full rounded-md border py-2 pl-10 pr-3"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sujetos</p>
              <p className="text-2xl font-bold">{filteredSubjects.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Email</p>
              <p className="text-2xl font-bold">
                {filteredSubjects.filter((s) => s.email).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Grado</p>
              <p className="text-2xl font-bold">
                {filteredSubjects.filter((s) => s.grade_section).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Teléfono</p>
              <p className="text-2xl font-bold">
                {filteredSubjects.filter((s) => s.phone).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Lista de eventos con acciones */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Eventos</h2>
        {events.map((event) => {
          const eventSubjects = subjects.filter((s) => s.event_id === event.id);

          return (
            <Card key={event.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{event.name}</h3>
                    {!event.active && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{event.school}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Fecha: {new Date(event.date).toLocaleDateString('es-AR')}
                    </span>
                    <span>{eventSubjects.length} sujetos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedEventId(event.id)}
                    variant="outline"
                    size="sm"
                    disabled={eventSubjects.length === 0}
                  >
                    Gestionar QRs
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {events.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No hay eventos registrados.</p>
          <p className="mt-1 text-sm">
            Cree un evento para comenzar a gestionar sujetos.
          </p>
        </Card>
      )}
    </div>
  );
}
