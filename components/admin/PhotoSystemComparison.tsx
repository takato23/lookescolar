'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckIcon,
  InfoIcon,
  ArrowRightIcon,
  ImageIcon,
  FolderIcon,
  StarIcon,
  ClockIcon,
} from 'lucide-react';
import {
  systemComparison,
  PhotoManagementPreferences,
} from '@/lib/photo-management-config';
import { useRouter } from 'next/navigation';

interface PhotoSystemComparisonProps {
  currentSystem: 'legacy' | 'advanced';
  eventId?: string;
  onSystemChange?: (system: 'legacy' | 'advanced') => void;
  compact?: boolean;
}

export function PhotoSystemComparison({
  currentSystem,
  eventId,
  onSystemChange,
  compact = false,
}: PhotoSystemComparisonProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSystemSwitch = (targetSystem: 'legacy' | 'advanced') => {
    // Save user preference
    PhotoManagementPreferences.setPreferredSystem(targetSystem);

    // Navigate to the appropriate system
    if (targetSystem === 'advanced' && eventId) {
      router.push(`/admin/events/${eventId}/library`);
    } else if (targetSystem === 'legacy') {
      const url = eventId
        ? `/admin/photos?eventId=${eventId}`
        : '/admin/photos';
      router.push(url);
    }

    if (onSystemChange) {
      onSystemChange(targetSystem);
    }

    setIsDialogOpen(false);
  };

  const ComparisonContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Comparación de Sistemas de Gestión de Fotos
        </h3>
        <p className="text-sm text-gray-600">
          Elige el sistema que mejor se adapte a tus necesidades
        </p>
      </div>

      {/* System Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Legacy System */}
        <Card
          className={`transition-all ${currentSystem === 'legacy' ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">Sistema Tradicional</CardTitle>
              </div>
              {currentSystem === 'legacy' && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  Actual
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              Gestión clásica con filtros avanzados y búsqueda completa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Filtros detallados y búsqueda avanzada
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Todas las funciones existentes
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Vista de lista y grid tradicional
              </div>
            </div>
            {currentSystem !== 'legacy' && (
              <Button
                onClick={() => handleSystemSwitch('legacy')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ArrowRightIcon className="mr-1 h-4 w-4" />
                Cambiar a Tradicional
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Advanced System */}
        <Card
          className={`transition-all ${currentSystem === 'advanced' ? 'bg-emerald-50 ring-2 ring-emerald-500' : ''}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Biblioteca Avanzada</CardTitle>
              </div>
              <div className="flex gap-1">
                {currentSystem === 'advanced' && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800"
                  >
                    Actual
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800"
                >
                  <StarIcon className="mr-1 h-3 w-3" />
                  Nuevo
                </Badge>
              </div>
            </div>
            <CardDescription className="text-sm">
              Interfaz moderna con carpetas jerárquicas y mejor UX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Carpetas jerárquicas personalizables
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Arrastrar y soltar fotos
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckIcon className="h-4 w-4" />
                Rendimiento optimizado
              </div>
            </div>
            {currentSystem !== 'advanced' && eventId && (
              <Button
                onClick={() => handleSystemSwitch('advanced')}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <ArrowRightIcon className="mr-1 h-4 w-4" />
                Probar Biblioteca Avanzada
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison Table */}
      {!compact && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Comparación Detallada
          </h4>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">
                    Característica
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">
                    Tradicional
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">
                    Avanzada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {systemComparison.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {item.feature}
                    </td>
                    <td
                      className={`px-3 py-2 ${item.advantage === 'legacy' ? 'font-medium text-green-700' : 'text-gray-600'}`}
                    >
                      {item.legacy}
                    </td>
                    <td
                      className={`px-3 py-2 ${item.advantage === 'advanced' ? 'font-medium text-green-700' : 'text-gray-600'}`}
                    >
                      {item.advanced}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Migration Status */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <ClockIcon className="mt-0.5 h-4 w-4 text-amber-600" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-amber-900">
              Estado de Migración
            </p>
            <p className="text-amber-700">
              Estamos en fase de lanzamiento gradual. Ambos sistemas están
              disponibles mientras recopilamos feedback y completamos las
              funciones faltantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs">
            <InfoIcon className="mr-1 h-3 w-3" />
            Comparar sistemas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sistemas de Gestión de Fotos</DialogTitle>
            <DialogDescription>
              Compara las características de ambos sistemas para elegir el que
              mejor se adapte a tus necesidades.
            </DialogDescription>
          </DialogHeader>
          <ComparisonContent />
        </DialogContent>
      </Dialog>
    );
  }

  return <ComparisonContent />;
}

export default PhotoSystemComparison;
