'use client';

// @ts-nocheck
import React from 'react';
import { logger } from './logger';
import { toast } from 'sonner';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  RATE_LIMIT = 'RATE_LIMIT',
  UPLOAD = 'UPLOAD',
  PAYMENT = 'PAYMENT',
  DATABASE = 'DATABASE',
  STORAGE = 'STORAGE',
}

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  recoverable?: boolean;
  userMessage?: string;
  stack?: string;
  timestamp?: Date;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export interface ErrorHandlerConfig {
  showToast?: boolean;
  logError?: boolean;
  throwError?: boolean;
  recoveryActions?: ErrorRecoveryAction[];
  customMessage?: string;
}

/**
 * Enhanced error handling system with categorization, logging, and recovery
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount = new Map<string, number>();
  private lastErrors = new Map<string, Date>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a structured error with context
   */
  createError(
    message: string,
    type: ErrorType,
    options: Partial<AppError> = {}
  ): AppError {
    const error = new Error(message) as AppError;
    error.type = type;
    error.code = options.code;
    error.statusCode = options.statusCode;
    error.context = options.context;
    error.recoverable = options.recoverable ?? true;
    error.userMessage = options.userMessage || this.getDefaultUserMessage(type);
    error.timestamp = new Date();

    return error;
  }

  /**
   * Handle errors with automatic categorization and recovery
   */
  async handleError(
    error: Error | AppError,
    config: ErrorHandlerConfig = {}
  ): Promise<void> {
    const {
      showToast = true,
      logError = true,
      throwError = false,
      recoveryActions = [],
      customMessage,
    } = config;

    // Enhance error if needed
    let appError: AppError;
    if (this.isAppError(error)) {
      appError = error;
    } else {
      appError = this.categorizeError(error);
    }

    // Track error frequency
    this.trackError(appError);

    // Log error
    if (logError) {
      this.logError(appError);
    }

    // Show user notification
    if (showToast) {
      this.showErrorToast(appError, customMessage, recoveryActions);
    }

    // Attempt recovery for recoverable errors
    if (appError.recoverable && this.shouldAttemptRecovery(appError)) {
      await this.attemptRecovery(appError);
    }

    // Re-throw if requested
    if (throwError) {
      throw appError;
    }
  }

  /**
   * Categorize generic errors into AppError types
   */
  categorizeError(error: Error): AppError {
    const message = error.message.toLowerCase();
    let type: ErrorType = ErrorType.CLIENT;
    let statusCode: number | undefined;
    let recoverable = true;

    // Network errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection')
    ) {
      type = ErrorType.NETWORK;
      statusCode = 0;
    }
    // Authentication errors
    else if (message.includes('unauthorized') || message.includes('auth')) {
      type = ErrorType.AUTHENTICATION;
      statusCode = 401;
      recoverable = false;
    }
    // Authorization errors
    else if (message.includes('forbidden') || message.includes('permission')) {
      type = ErrorType.AUTHORIZATION;
      statusCode = 403;
      recoverable = false;
    }
    // Not found errors
    else if (message.includes('not found') || message.includes('404')) {
      type = ErrorType.NOT_FOUND;
      statusCode = 404;
    }
    // Rate limiting
    else if (message.includes('rate limit') || message.includes('too many')) {
      type = ErrorType.RATE_LIMIT;
      statusCode = 429;
    }
    // Server errors
    else if (message.includes('server') || message.includes('500')) {
      type = ErrorType.SERVER;
      statusCode = 500;
    }
    // Upload errors
    else if (message.includes('upload') || message.includes('file')) {
      type = ErrorType.UPLOAD;
    }
    // Payment errors
    else if (message.includes('payment') || message.includes('mercadopago')) {
      type = ErrorType.PAYMENT;
    }
    // Database errors
    else if (message.includes('database') || message.includes('sql')) {
      type = ErrorType.DATABASE;
    }
    // Storage errors
    else if (message.includes('storage') || message.includes('bucket')) {
      type = ErrorType.STORAGE;
    }

    return this.createError(error.message, type, {
      statusCode,
      recoverable,
      stack: error.stack,
    });
  }

  /**
   * Get user-friendly message for error type
   */
  private getDefaultUserMessage(type: ErrorType): string {
    const messages = {
      [ErrorType.NETWORK]:
        'Problema de conexión. Verifica tu internet e intenta nuevamente.',
      [ErrorType.VALIDATION]:
        'Los datos ingresados no son válidos. Revisa e intenta nuevamente.',
      [ErrorType.AUTHENTICATION]:
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      [ErrorType.AUTHORIZATION]:
        'No tienes permisos para realizar esta acción.',
      [ErrorType.NOT_FOUND]: 'El recurso solicitado no se encontró.',
      [ErrorType.SERVER]:
        'Error del servidor. Intenta nuevamente en unos momentos.',
      [ErrorType.CLIENT]: 'Ocurrió un error inesperado. Intenta nuevamente.',
      [ErrorType.RATE_LIMIT]:
        'Demasiadas solicitudes. Espera un momento e intenta nuevamente.',
      [ErrorType.UPLOAD]:
        'Error al subir el archivo. Verifica el formato e intenta nuevamente.',
      [ErrorType.PAYMENT]:
        'Error en el procesamiento del pago. Intenta nuevamente.',
      [ErrorType.DATABASE]:
        'Error de base de datos. Intenta nuevamente en unos momentos.',
      [ErrorType.STORAGE]: 'Error de almacenamiento. Intenta nuevamente.',
    };

    return messages[type] || messages[ErrorType.CLIENT];
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(error: AppError): void {
    const key = `${error.type}:${error.code || 'general'}`;
    const count = this.errorCount.get(key) || 0;
    this.errorCount.set(key, count + 1);
    this.lastErrors.set(key, new Date());

    // Log pattern if too many errors
    if (count > 5) {
      logger.warn('High error frequency detected', {
        errorType: error.type,
        errorCode: error.code,
        count: count + 1,
        message: error.message,
      });
    }
  }

  /**
   * Log error with structured data
   */
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      recoverable: error.recoverable,
      timestamp: error.timestamp,
      stack: error.stack,
    };

    if (error.statusCode && error.statusCode >= 500) {
      logger.error('Server error occurred', logData);
    } else if (error.statusCode && error.statusCode >= 400) {
      logger.warn('Client error occurred', logData);
    } else {
      logger.info('Error handled', logData);
    }
  }

  /**
   * Show error toast with recovery actions
   */
  private showErrorToast(
    error: AppError,
    customMessage?: string,
    recoveryActions: ErrorRecoveryAction[] = []
  ): void {
    const message = customMessage || error.userMessage || error.message;

    if (recoveryActions.length > 0) {
      // Show toast with action buttons
      toast.error(message, {
        action: recoveryActions.map((action) => ({
          label: action.label,
          onClick: action.action,
        }))[0], // Sonner supports one action
        duration: 5000,
      });
    } else {
      // Simple error toast
      const duration = error.type === ErrorType.NETWORK ? 3000 : 4000;
      toast.error(message, { duration });
    }
  }

  /**
   * Determine if recovery should be attempted
   */
  private shouldAttemptRecovery(error: AppError): boolean {
    if (!error.recoverable) return false;

    const key = `${error.type}:${error.code || 'general'}`;
    const count = this.errorCount.get(key) || 0;

    return count <= this.maxRetries;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(error: AppError): Promise<void> {
    try {
      switch (error.type) {
        case ErrorType.NETWORK:
          // Wait and retry for network errors
          await this.delay(this.retryDelay);
          logger.info('Attempting network recovery', { errorType: error.type });
          break;

        case ErrorType.RATE_LIMIT: {
          // Exponential backoff for rate limiting
          const backoffTime =
            this.retryDelay *
            Math.pow(
              2,
              this.errorCount.get(`${error.type}:${error.code}`) || 1
            );
          await this.delay(Math.min(backoffTime, 30000)); // Max 30 seconds
          logger.info('Attempting rate limit recovery', { backoffTime });
          break;
        }

        case ErrorType.STORAGE:
          // Invalidate cache for storage errors
          if (typeof window !== 'undefined' && 'caches' in window) {
            await caches.delete('storage-cache');
          }
          logger.info('Cleared storage cache for recovery');
          break;

        default:
          logger.info('No automatic recovery available', {
            errorType: error.type,
          });
          break;
      }
    } catch (recoveryError) {
      logger.warn('Error recovery failed', {
        originalError: error.type,
        recoveryError:
          recoveryError instanceof Error ? recoveryError.message : 'Unknown',
      });
    }
  }

  /**
   * Utility: Check if error is AppError
   */
  private isAppError(error: any): error is AppError {
    return (
      error &&
      typeof error.type === 'string' &&
      Object.values(ErrorType).includes(error.type)
    );
  }

  /**
   * Utility: Delay for retry mechanisms
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): { type: string; count: number; lastOccurrence: Date }[] {
    const stats: { type: string; count: number; lastOccurrence: Date }[] = [];

    for (const [key, count] of this.errorCount.entries()) {
      const lastOccurrence = this.lastErrors.get(key);
      if (lastOccurrence) {
        stats.push({
          type: key,
          count,
          lastOccurrence,
        });
      }
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Clear error tracking (useful for testing)
   */
  clearErrorTracking(): void {
    this.errorCount.clear();
    this.lastErrors.clear();
  }
}

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility function for quick error handling
 */
export function handleError(
  error: Error | AppError,
  config?: ErrorHandlerConfig
): Promise<void> {
  return errorHandler.handleError(error, config);
}

/**
 * Create typed errors quickly
 */
export function createError(
  message: string,
  type: ErrorType,
  options?: Partial<AppError>
): AppError {
  return errorHandler.createError(message, type, options);
}

/**
 * Async wrapper with automatic error handling
 */
export function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  config?: ErrorHandlerConfig
): Promise<T | null> {
  return asyncFn().catch(async (error) => {
    await handleError(error, config);
    return null;
  });
}

/**
 * HOC for React components with error boundary behavior
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: AppError; retry: () => void }>
) {
  return function ErrorBoundaryWrapper(props: P) {
    const [error, setError] = React.useState<AppError | null>(null);

    const retry = React.useCallback(() => {
      setError(null);
    }, []);

    React.useEffect(() => {
      const handleUnhandledError = (event: ErrorEvent) => {
        const appError = errorHandler.categorizeError(event.error);
        setError(appError);
        errorHandler.handleError(appError, { showToast: false });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const appError = errorHandler.categorizeError(new Error(event.reason));
        setError(appError);
        errorHandler.handleError(appError, { showToast: false });
      };

      window.addEventListener('error', handleUnhandledError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleUnhandledError);
        window.removeEventListener(
          'unhandledrejection',
          handleUnhandledRejection
        );
      };
    }, []);

    if (error) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent error={error} retry={retry} />;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-4 text-center">
          <h3 className="mb-2 text-lg font-semibold">Algo salió mal</h3>
          <p className="text-muted-foreground mb-4">{error.userMessage}</p>
          <button
            onClick={retry}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
          >
            Intentar nuevamente
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
