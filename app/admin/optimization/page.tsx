import { Metadata } from 'next';
import StorageOptimizationDashboard from '@/components/admin/StorageOptimizationDashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Zap, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Optimización Free Tier - LookEscolar Admin',
  description:
    'Monitoreo y configuración de la optimización para el plan gratuito de Supabase',
};

export default function OptimizationPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Explanation Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Free Tier Optimization
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Sistema de optimización para el plan gratuito de Supabase (1GB de
              almacenamiento)
            </p>
          </div>
        </div>
      </div>

      {/* What is Free Tier Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            ¿Qué es la Free Tier Optimization?
          </CardTitle>
          <CardDescription>
            Sistema diseñado específicamente para fotografías escolares dentro
            del plan gratuito de Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Cómo Funciona:</h3>
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span>
                    Solo almacena previews de baja calidad (50KB cada una)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span>
                    Aplica watermark automáticamente para proteger las fotos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span>
                    No almacena fotos originales (se procesan y descartan)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span>
                    Compresión progresiva hasta lograr el tamaño objetivo
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Capacidad Estimada:</h3>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    1000 estudiantes
                  </span>
                  <Badge variant="outline">×</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    20 fotos cada uno
                  </span>
                  <Badge variant="outline">=</Badge>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">20,000 fotos totales</span>
                  <Badge className="border-green-200 bg-green-100 text-green-800">
                    ✓ Cabe en 1GB
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Perfecto para tienda física:</strong> Los clientes ven
                  previews con watermark y compran copias físicas que entregas
                  sin marca de agua.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            Detalles Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Compresión
              </h4>
              <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>• Formato WebP optimizado</li>
                <li>• Calidad progresiva (40% a 20%)</li>
                <li>• Redimensionado inteligente</li>
                <li>• Objetivo: 50KB por imagen</li>
              </ul>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Watermark
              </h4>
              <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>• Patrón diagonal repetitivo</li>
                <li>• Texto personalizable</li>
                <li>• 60% de opacidad</li>
                <li>• Protección contra robo</li>
              </ul>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Almacenamiento
              </h4>
              <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>• Solo bucket de previews</li>
                <li>• Sin archivos originales</li>
                <li>• Limpieza automática</li>
                <li>• Monitoreo en tiempo real</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Dashboard */}
      <StorageOptimizationDashboard />

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Pasos</CardTitle>
          <CardDescription>
            Recomendaciones para completar la configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  Configurar Precios
                </p>
                <p className="text-sm text-yellow-700">
                  Ve a <strong>Admin → Gestión de Precios</strong> para
                  establecer los precios de los paquetes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Galerías Temáticas</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Las galerías automáticamente detectan el nivel escolar y
                  aplican temas visuales apropiados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  Optimización Activa
                </p>
                <p className="text-sm text-green-700">
                  Todas las fotos nuevas se procesan automáticamente con la
                  optimización free tier
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
