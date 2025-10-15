import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void; goHome?: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary para manejar errores de React de manera elegante
 */
export class StoreErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[StoreErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  goHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          retry={this.retry}
          goHome={this.goHome}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Componente de fallback por defecto para errores
 */
const DefaultErrorFallback = ({ error, retry, goHome }: {
  error: Error;
  retry: () => void;
  goHome?: () => void;
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-card p-6 rounded-lg border border-destructive/20 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-foreground">Error en la tienda</h2>
      </div>

      <p className="text-muted-foreground mb-4 leading-relaxed">
        Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
      </p>

      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
          Detalles del error
        </summary>
        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
          {error.message}
        </pre>
      </details>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={retry}
          className="flex-1 flex items-center justify-center gap-2"
          aria-label="Reintentar cargar la página"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>

        {goHome && (
          <Button
            variant="outline"
            onClick={goHome}
            className="flex-1 flex items-center justify-center gap-2"
            aria-label="Ir a la página principal"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir al inicio
          </Button>
        )}
      </div>
    </div>
  </div>
);

/**
 * Hook para usar error boundaries en componentes funcionales
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

/**
 * Componente wrapper para manejar errores en secciones específicas
 */
export const ErrorBoundaryWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error) => void;
}> = ({ children, fallback, onError }) => {
  return (
    <StoreErrorBoundary
      fallback={fallback}
      onError={(error) => {
        console.error('[ErrorBoundaryWrapper]', error);
        onError?.(error);
      }}
    >
      {children}
    </StoreErrorBoundary>
  );
};
