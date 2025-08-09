import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardErrorProps {
  error?: unknown;
  onRetry?: () => void;
}

export function DashboardError({ error, onRetry }: DashboardErrorProps) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Error al cargar los datos del dashboard';

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-destructive/10 mb-4 rounded-full p-3">
            <AlertTriangle className="text-destructive h-8 w-8" />
          </div>

          <h3 className="text-destructive mb-2 text-lg font-semibold">
            Error al cargar el dashboard
          </h3>

          <p className="text-muted-foreground mb-6 max-w-md">
            {errorMessage}. Por favor, intenta recargar los datos.
          </p>

          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Show minimal fallback stats */}
      <div className="grid grid-cols-1 gap-4 opacity-50 md:grid-cols-2 lg:grid-cols-4">
        {['Pedidos hoy', 'Pagos confirmados', 'Pendientes', 'Fotos hoy'].map(
          (title) => (
            <Card key={title}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    {title}
                  </h3>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-muted-foreground text-xs">Sin datos</p>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
