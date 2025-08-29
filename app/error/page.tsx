/**
 * Página de Error Unificada
 * Maneja diferentes tipos de errores del sistema
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowLeft,
  Home,
  RefreshCw,
  Shield,
  Link,
  Clock,
} from 'lucide-react';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get('reason');

  const getErrorContent = () => {
    switch (reason) {
      case 'invalid-token':
        return {
          icon: Shield,
          title: 'Enlace Inválido o Expirado',
          description:
            'El enlace que intentaste usar no es válido o ha expirado.',
          details: [
            'El token de acceso no existe o ha sido revocado',
            'El enlace puede haber expirado por tiempo',
            'El enlace puede haber sido usado el máximo de veces permitido',
          ],
          actions: [
            { label: 'Contactar a la Escuela', action: 'contact' },
            { label: 'Verificar el Enlace', action: 'verify' },
          ],
        };

      case 'validation-failed':
        return {
          icon: AlertCircle,
          title: 'Error de Validación',
          description: 'No se pudo validar tu acceso en este momento.',
          details: [
            'Error temporal del sistema',
            'Problema de conexión con la base de datos',
            'Servicio no disponible temporalmente',
          ],
          actions: [
            { label: 'Intentar de Nuevo', action: 'retry' },
            { label: 'Contactar Soporte', action: 'support' },
          ],
        };

      case 'expired-token':
        return {
          icon: Clock,
          title: 'Enlace Expirado',
          description: 'Este enlace ha expirado y ya no es válido.',
          details: [
            'Los enlaces tienen un tiempo de vida limitado',
            'Por seguridad, los tokens expiran automáticamente',
            'Contacta a la escuela para obtener un nuevo enlace',
          ],
          actions: [
            { label: 'Solicitar Nuevo Enlace', action: 'new-link' },
            { label: 'Contactar Escuela', action: 'contact' },
          ],
        };

      default:
        return {
          icon: AlertCircle,
          title: 'Error del Sistema',
          description: 'Ha ocurrido un error inesperado.',
          details: [
            'Error interno del sistema',
            'Problema temporal de servicio',
            'Intenta nuevamente en unos minutos',
          ],
          actions: [
            { label: 'Intentar de Nuevo', action: 'retry' },
            { label: 'Ir al Inicio', action: 'home' },
          ],
        };
    }
  };

  const errorContent = getErrorContent();
  const IconComponent = errorContent.icon;

  const handleAction = (action: string) => {
    switch (action) {
      case 'retry':
        router.refresh();
        break;
      case 'home':
        router.push('/');
        break;
      case 'contact':
        // Abrir WhatsApp o email
        window.open(
          'https://wa.me/5491112345678?text=Hola,%20necesito%20ayuda%20con%20mi%20enlace%20de%20fotos',
          '_blank'
        );
        break;
      case 'support':
        window.open(
          'mailto:soporte@lookescolar.com?subject=Error%20de%20Acceso',
          '_blank'
        );
        break;
      case 'verify':
        router.back();
        break;
      case 'new-link':
        window.open(
          'https://wa.me/5491112345678?text=Hola,%20necesito%20un%20nuevo%20enlace%20para%20mis%20fotos',
          '_blank'
        );
        break;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-2xl border-0 shadow-2xl">
        <CardHeader className="pb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <IconComponent className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorContent.title}
          </CardTitle>
          <p className="mt-2 text-gray-600">{errorContent.description}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalles del error */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-medium text-gray-900">Posibles causas:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {errorContent.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400"></span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {errorContent.actions.map((action, index) => (
              <Button
                key={index}
                onClick={() => handleAction(action.action)}
                variant={index === 0 ? 'default' : 'outline'}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Acciones secundarias */}
          <div className="flex justify-center gap-4 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
