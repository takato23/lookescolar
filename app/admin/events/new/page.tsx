'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Calendar, MapPin, DollarSign, Home } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    photo_price: 0,
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/events-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          date: formData.date,
          photo_price: formData.photo_price || 0,
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
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
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
              <span className="text-foreground font-medium">Nuevo</span>
            </nav>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/events')}
                className="rounded-full p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                  Nuevo Evento
                </h1>
                <p className="text-muted-foreground">
                  Crea una nueva sesión fotográfica
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card variant="glass" className="animate-slide-up">
          <CardHeader>
            <CardTitle>Información del Evento</CardTitle>
            <CardDescription>
              Completa los datos para crear un nuevo evento fotográfico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre del Evento *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="pl-10"
                      placeholder="Ej: Colegio San Martín - Acto de Fin de Año"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">
                    Ubicación
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="pl-10"
                      placeholder="Ej: Av. Libertador 1234, CABA"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">
                    Fecha del Evento *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo_price">
                    Precio por Foto
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="photo_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.photo_price}
                      onChange={(e) =>
                        setFormData({ ...formData, photo_price: parseFloat(e.target.value) || 0 })
                      }
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Evento activo (las familias pueden acceder)
                </Label>
              </div>

              {error && (
                <Card variant="glass" className="border-red-200 bg-red-50/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/events')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !formData.name || !formData.date}
                >
                  {loading ? 'Creando...' : 'Crear Evento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
