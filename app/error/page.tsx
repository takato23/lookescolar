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
  Clock 
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
          description: 'El enlace que intentaste usar no es válido o ha expirado.',
          details: [
            'El token de acceso no existe o ha sido revocado',
            'El enlace puede haber expirado por tiempo',
            'El enlace puede haber sido usado el máximo de veces permitido'
          ],
          actions: [
            { label: 'Contactar a la Escuela', action: 'contact' },
            { label: 'Verificar el Enlace', action: 'verify' }
          ]
        };

      case 'validation-failed':
        return {
          icon: AlertCircle,
          title: 'Error de Validación',
          description: 'No se pudo validar tu acceso en este momento.',
          details: [
            'Error temporal del sistema',
            'Problema de conexión con la base de datos',
            'Servicio no disponible temporalmente'
          ],
          actions: [
            { label: 'Intentar de Nuevo', action: 'retry' },
            { label: 'Contactar Soporte', action: 'support' }
          ]
        };

      case 'expired-token':
        return {
          icon: Clock,
          title: 'Enlace Expirado',
          description: 'Este enlace ha expirado y ya no es válido.',
          details: [
            'Los enlaces tienen un tiempo de vida limitado',
            'Por seguridad, los tokens expiran automáticamente',
            'Contacta a la escuela para obtener un nuevo enlace'
          ],
          actions: [
            { label: 'Solicitar Nuevo Enlace', action: 'new-link' },
            { label: 'Contactar Escuela', action: 'contact' }
          ]
        };

      default:
        return {
          icon: AlertCircle,
          title: 'Error del Sistema',
          description: 'Ha ocurrido un error inesperado.',
          details: [
            'Error interno del sistema',
            'Problema temporal de servicio',
            'Intenta nuevamente en unos minutos'
          ],
          actions: [
            { label: 'Intentar de Nuevo', action: 'retry' },
            { label: 'Ir al Inicio', action: 'home' }
          ]
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
        window.open('https://wa.me/5491112345678?text=Hola,%20necesito%20ayuda%20con%20mi%20enlace%20de%20fotos', '_blank');
        break;
      case 'support':
        window.open('mailto:soporte@lookescolar.com?subject=Error%20de%20Acceso', '_blank');
        break;
      case 'verify':
        router.back();
        break;
      case 'new-link':
        window.open('https://wa.me/5491112345678?text=Hola,%20necesito%20un%20nuevo%20enlace%20para%20mis%20fotos', '_blank');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <IconComponent className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorContent.title}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {errorContent.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalles del error */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Posibles causas:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {errorContent.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            {errorContent.actions.map((action, index) => (
              <Button
                key={index}
                onClick={() => handleAction(action.action)}
                variant={index === 0 ? "default" : "outline"}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Acciones secundarias */}
          <div className="flex justify-center gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Home className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

