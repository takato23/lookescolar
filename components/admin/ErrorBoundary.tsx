'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, ChevronLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class AdminErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Send error to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }

    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => prevProps.resetKeys![idx] !== key
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }, 100);
  };

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with logging service (Sentry, LogRocket, etc.)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Example: send to logging endpoint
    fetch('/api/admin/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(console.error);
  };

  private reloadPage = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.href = '/admin';
  };

  private goBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { error, errorInfo, errorId } = this.state;
      const showDetails =
        this.props.showErrorDetails ?? process.env.NODE_ENV === 'development';

      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                Something went wrong
              </CardTitle>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                We encountered an unexpected error in the application. This has
                been reported to our team.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID for support */}
              <div className="rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium text-foreground">
                  Error Reference
                </h4>
                <p className="rounded border bg-white px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
                  {errorId}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Please include this reference when contacting support.
                </p>
              </div>

              {/* Error details (development only) */}
              {showDetails && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="mb-2 font-medium text-red-900">
                    Error Details
                  </h4>
                  <div className="space-y-2 text-sm text-red-800">
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded border bg-white p-2 text-xs">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">
                          Component Stack
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded border bg-white p-2 text-xs">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Recovery actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={this.resetErrorBoundary}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={this.reloadPage}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.goBack}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Go Back
                </Button>

                <Button
                  onClick={this.goHome}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </div>

              {/* Tips for users */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
                <h4 className="mb-2 font-medium text-blue-900">
                  What you can try:
                </h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Refresh the page to reload the component</li>
                  <li>• Clear your browser cache and try again</li>
                  <li>• Contact support if the problem persists</li>
                  <li>• Check if all required data is properly loaded</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('useErrorHandler caught error:', error, errorInfo);

    // In a real app, you'd send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  };
}

// Wrapper component for easier usage
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  level?: 'page' | 'component' | 'critical';
  name?: string;
  // Optional custom fallback component to render on error
  fallback?: ReactNode;
}

export function ErrorBoundaryWrapper({
  children,
  level = 'component',
  name,
  fallback,
}: ErrorBoundaryWrapperProps) {
  const showDetails =
    level === 'page' || process.env.NODE_ENV === 'development';

  return (
    <AdminErrorBoundary
      fallbackComponent={fallback}
      showErrorDetails={showDetails}
      onError={(error, errorInfo) => {
        // Log with context
        console.error(
          `Error in ${name || 'component'} (${level}):`,
          error,
          errorInfo
        );
      }}
      resetOnPropsChange={level === 'component'}
    >
      {children}
    </AdminErrorBoundary>
  );
}

export default AdminErrorBoundary;
