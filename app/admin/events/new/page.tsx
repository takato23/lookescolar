'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GalleryThemeService } from '@/lib/services/gallery-theme.service';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Home,
  Users,
  User,
  Share,
  Palette,
} from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    theme: 'default', // Tema default por defecto
    photo_price: 0,
    active: true,
    sharing_mode: 'public', // 'public' o 'private'
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
          sharing_mode: formData.sharing_mode,
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
                  <Label htmlFor="name">Nombre del Evento *</Label>
                  <div className="relative">
                    <Calendar className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                  <Label htmlFor="location">Ubicación</Label>
                  <div className="relative">
                    <MapPin className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                  <Label htmlFor="date">Fecha del Evento *</Label>
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
                  <Label htmlFor="theme">Tema Visual</Label>
                  <div className="relative">
                    <Palette className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Select 
                      value={formData.theme} 
                      onValueChange={(value) => setFormData({ ...formData, theme: value })}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Selecciona un tema" />
                      </SelectTrigger>
                      <SelectContent>
                        {GalleryThemeService.getThemeOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Define el estilo visual de la galería y tienda para este evento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo_price">Precio por Foto</Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="photo_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.photo_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          photo_price: parseFloat(e.target.value) || 0,
                        })
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

              {/* Modo de Compartir */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  <Share className="mr-2 inline h-4 w-4" />
                  Modo de Compartir Fotos
                </Label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      formData.sharing_mode === 'public'
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, sharing_mode: 'public' })
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`rounded-full p-2 ${
                          formData.sharing_mode === 'public'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Público</h3>
                        <p className="text-sm text-gray-600">
                          Todas las familias ven las mismas fotos
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      formData.sharing_mode === 'private'
                        ? 'border-orange-500 bg-orange-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, sharing_mode: 'private' })
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`rounded-full p-2 ${
                          formData.sharing_mode === 'private'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Personalizado
                        </h3>
                        <p className="text-sm text-gray-600">
                          Cada familia ve solo sus fotos específicas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  💡 Puedes cambiar esto después desde la configuración del
                  evento
                </p>
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
