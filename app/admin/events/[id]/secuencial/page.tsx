'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Minus,
  Users,
  Camera,
  AlertCircle,
  CheckCircle,
  Home,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  parent_name?: string;
  parent_email?: string;
}

interface EventInfo {
  id: string;
  name: string;
  school_name?: string;
}

interface PhotoStats {
  total: number;
  unassigned: number;
  approved: number;
}

export default function SecuencialPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.['id'] as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [photoStats, setPhotoStats] = useState<PhotoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sequence state: map of subject_id -> count
  const [sequence, setSequence] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'exif' | 'filename' | 'created_at'>(
    'exif'
  );
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load event info
      const eventResponse = await fetch(`/api/admin/events/${id}`);
      if (!eventResponse.ok) throw new Error('Failed to fetch event');
      const eventData = await eventResponse.json();
      setEvent(eventData.event);

      // Load subjects
      const subjectsResponse = await fetch(`/api/admin/subjects?eventId=${id}`);
      if (!subjectsResponse.ok) throw new Error('Failed to fetch subjects');
      const subjectsData = await subjectsResponse.json();
      setSubjects(subjectsData.subjects || []);

      // Load photo stats
      const photosResponse = await fetch(
        `/api/admin/photos?eventId=${id}&stats=true`
      );
      if (!photosResponse.ok) throw new Error('Failed to fetch photo stats');
      const photosData = await photosResponse.json();
      setPhotoStats({
        total: photosData.total || 0,
        unassigned: photosData.unassigned || 0,
        approved: photosData.approved || 0,
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const updateCount = (subjectId: string, delta: number) => {
    setSequence((prev) => {
      const current = prev[subjectId] || 0;
      const newCount = Math.max(0, current + delta);
      if (newCount === 0) {
        const { [subjectId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [subjectId]: newCount };
    });
  };

  const setCount = (subjectId: string, count: string) => {
    const numCount = parseInt(count) || 0;
    if (numCount === 0) {
      setSequence((prev) => {
        const { [subjectId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setSequence((prev) => ({ ...prev, [subjectId]: numCount }));
    }
  };

  const getTotalAssigned = () => {
    return Object.values(sequence).reduce((sum, count) => sum + count, 0);
  };

  const applySequence = async () => {
    if (!event || Object.keys(sequence).length === 0) {
      toast.error('Debe asignar al menos una foto');
      return;
    }

    try {
      setApplying(true);

      const response = await fetch('/api/admin/tagging/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          sortBy,
          onlyUnassigned,
          sequence: Object.entries(sequence).map(([subjectId, count]) => ({
            subjectId,
            count,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply sequence');
      }

      const result = await response.json();

      toast.success(
        `Asignación completada: ${result.assignedCount} fotos asignadas`
      );

      // Reset sequence and reload stats
      setSequence({});
      await loadData();
    } catch (err) {
      console.error('Error applying sequence:', err);
      toast.error(
        err instanceof Error ? err.message : 'Error aplicando secuencia'
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
            <span className="ml-2 text-lg">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <Card variant="glass" className="mx-auto max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <h3 className="mb-2 text-lg font-semibold">Error</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {error || 'Evento no encontrado'}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/admin/events')}
                >
                  Volver a Eventos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <Link
                href="/admin/events"
                className="transition-colors hover:text-primary-600"
              >
                Eventos
              </Link>
              <span>/</span>
              <Link
                href={`/admin/events/${id}`}
                className="transition-colors hover:text-primary-600"
              >
                {event.school_name || event.name}
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">
                Asignación Secuencial
              </span>
            </nav>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${id}`)}
                  className="rounded-full p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                    Asignación Secuencial
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Asigna fotos por alumno en orden cronológico sin QR
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Total Fotos
                  </p>
                  <p className="text-2xl font-bold">{photoStats?.total || 0}</p>
                </div>
                <Camera className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Sin Asignar
                  </p>
                  <p className="text-2xl font-bold">
                    {photoStats?.unassigned || 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    A Asignar
                  </p>
                  <p className="text-2xl font-bold text-primary-600">
                    {getTotalAssigned()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="sort-by">Ordenar por</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exif">Fecha EXIF</SelectItem>
                    <SelectItem value="filename">Nombre archivo</SelectItem>
                    <SelectItem value="created_at">Fecha subida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="only-unassigned"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="only-unassigned">Solo fotos sin asignar</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Assignment */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Alumnos ({subjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="border-border/50 bg-background/50 flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{subject.name}</p>
                    {subject.parent_name && (
                      <p className="text-gray-500 dark:text-gray-400 truncate text-sm">
                        {subject.parent_name}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateCount(subject.id, -1)}
                      disabled={!sequence[subject.id]}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={sequence[subject.id] || ''}
                      onChange={(e) => setCount(subject.id, e.target.value)}
                      className="w-16 text-center"
                      placeholder="0"
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateCount(subject.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              Total a asignar: {getTotalAssigned()} fotos
            </Badge>
            {getTotalAssigned() > (photoStats?.unassigned || 0) && (
              <Badge variant="destructive" className="text-sm">
                ⚠️ Excede fotos disponibles
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSequence({})}
              disabled={Object.keys(sequence).length === 0}
            >
              Limpiar
            </Button>

            <Button
              onClick={applySequence}
              disabled={
                applying ||
                Object.keys(sequence).length === 0 ||
                getTotalAssigned() === 0
              }
              className="min-w-32"
            >
              {applying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aplicar Secuencia
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
