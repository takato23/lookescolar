'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, Calendar, MapPin, Building, User } from 'lucide-react';

interface EventData {
  id: string;
  name: string;
  date: string;
  location?: string;
  school_name?: string;
  photographer_name?: string;
  photographer_email?: string;
  photographer_phone?: string;
  description?: string;
  active: boolean;
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [formData, setFormData] = useState<EventData>({
    id: '',
    name: '',
    date: '',
    location: '',
    school_name: '',
    photographer_name: '',
    photographer_email: '',
    photographer_phone: '',
    description: '',
    active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      let response = await fetch(`/api/admin/events/${id}`);
      if (!response.ok) {
        response = await fetch(`/api/admin/events?id=${id}`);
      }
      if (!response.ok) throw new Error('Failed to fetch event');
      
      const data = await response.json();
      const event = data.event || data;
      
      setFormData({
        id: event.id,
        name: event.name || '',
        date: event.date ? event.date.split('T')[0] : '', // Format for date input
        location: event.location || '',
        school_name: event.school_name || '',
        photographer_name: event.photographer_name || '',
        photographer_email: event.photographer_email || '',
        photographer_phone: event.photographer_phone || '',
        description: event.description || '',
        active: event.active ?? true,
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Error cargando información del evento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      try {
        const response = await fetch(`/api/admin/events/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to update event');
        }

        toast.success('Evento actualizado correctamente');
        router.push(`/admin/events/${id}`);
      } catch (error) {
        console.error('Error updating event:', error);
        toast.error('Error actualizando el evento');
      }
    });
  };

  const updateFormData = (field: keyof EventData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Cargando información del evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/events/${id}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Editar Evento</h1>
            <p className="text-gray-500 dark:text-gray-400">Modifica la información del evento</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Evento *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Ej: Colegio San Martín - Acto de Fin de Año"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha del Evento *</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => updateFormData('date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_name">Nombre de la Escuela</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="school_name"
                      value={formData.school_name}
                      onChange={(e) => updateFormData('school_name', e.target.value)}
                      className="pl-10"
                      placeholder="Ej: Colegio San Martín"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateFormData('location', e.target.value)}
                      className="pl-10"
                      placeholder="Ej: Av. Libertador 1234, CABA"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe el evento (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="active">Evento Activo</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Los eventos inactivos no aparecen en la galería pública
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => updateFormData('active', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Photographer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Información del Fotógrafo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="photographer_name">Nombre</Label>
                  <Input
                    id="photographer_name"
                    value={formData.photographer_name}
                    onChange={(e) => updateFormData('photographer_name', e.target.value)}
                    placeholder="Nombre del fotógrafo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photographer_email">Email</Label>
                  <Input
                    id="photographer_email"
                    type="email"
                    value={formData.photographer_email}
                    onChange={(e) => updateFormData('photographer_email', e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photographer_phone">Teléfono</Label>
                  <Input
                    id="photographer_phone"
                    value={formData.photographer_phone}
                    onChange={(e) => updateFormData('photographer_phone', e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/events/${id}`)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
