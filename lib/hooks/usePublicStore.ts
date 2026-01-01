import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface StoreConfig {
  isValid?: boolean;
  passwordRequired?: boolean;
  passwordProtected?: boolean;
  attemptsRemaining?: number;
  lockoutUntil?: string;
  available?: boolean;
  schedule?: {
    withinSchedule: boolean;
    message?: string;
    openDate?: string;
    closedDate?: string;
  };
  store?: Record<string, any>;
  event?: Record<string, any>;
  settings?: any;
  assets?: any[];
  pagination?: any;
  error?: string;
}

interface UsePublicStoreOptions {
  token: string;
  password?: string;
  onPasswordRequired?: () => void;
  onError?: (error: PublicStoreError) => void;
}

export type PublicStoreError = {
  type: 'network' | 'authentication' | 'server' | 'notFound' | 'timeout' | 'unknown';
  message: string;
  retryable: boolean;
  statusCode?: number;
  attemptsRemaining?: number;
  lockoutUntil?: string;
};

type LoadingState = 'initial' | 'verifying' | 'retrying' | 'idle';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 16000;
const REQUEST_TIMEOUT = 30000;

export function usePublicStore(options: UsePublicStoreOptions) {
  const { token, password, onPasswordRequired, onError } = options;
  const searchParams = useSearchParams();
  const folderId = searchParams?.get('folder');

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [error, setError] = useState<PublicStoreError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const previousPasswordRef = useRef<string | undefined>(password);

  // Reset error state when password changes
  useEffect(() => {
    if (password !== previousPasswordRef.current) {
      previousPasswordRef.current = password;
      setError(null);
      setRetryCount(0);
      setNextRetryTime(null);
    }
  }, [password]);

  const classifyError = useCallback((err: any, response?: Response): PublicStoreError => {
    let type: PublicStoreError['type'] = 'unknown';
    let message = 'An unexpected error occurred';
    let retryable = false;
    let statusCode: number | undefined;
    let attemptsRemaining: number | undefined;
    let lockoutUntil: string | undefined;

    if (err.name === 'AbortError') {
      type = 'timeout';
      message = 'Request timed out. Please check your connection and try again.';
      retryable = true;
    } else if (!navigator.onLine) {
      type = 'network';
      message = 'You appear to be offline. Please check your internet connection.';
      retryable = true;
    } else if (response) {
      statusCode = response.status;

      if (statusCode === 401 || statusCode === 403) {
        type = 'authentication';
        message = err.message || 'Authentication failed';
        retryable = false;

        // Parse attempt tracking from error
        if (err.attemptsRemaining !== undefined) {
          attemptsRemaining = err.attemptsRemaining;
        }
        if (err.lockoutUntil) {
          lockoutUntil = err.lockoutUntil;
        }
      } else if (statusCode === 404) {
        type = 'notFound';
        message = 'The requested store or content was not found.';
        retryable = false;
      } else if (statusCode >= 500) {
        type = 'server';
        message = 'Server error. Please try again later.';
        retryable = true;
      } else if (statusCode >= 400) {
        type = 'server';
        message = err.message || 'Request failed';
        retryable = false;
      }
    } else if (err.message?.includes('fetch')) {
      type = 'network';
      message = 'Network error. Please check your connection.';
      retryable = true;
    }

    return {
      type,
      message,
      retryable,
      statusCode,
      attemptsRemaining,
      lockoutUntil
    };
  }, []);

  const calculateRetryDelay = useCallback((attempt: number): number => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
    const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
    return Math.round(baseDelay + jitter);
  }, []);

  const fetchStoreConfig = useCallback(async (isRetry = false) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, REQUEST_TIMEOUT);

    try {
      if (!isMountedRef.current) return;

      setLoading(true);
      setLoadingState(isRetry ? 'retrying' : (password ? 'verifying' : 'initial'));
      setError(null);

      const url = new URL(`/api/store/${token}`, window.location.origin);
      url.searchParams.set('include_assets', 'false');
      if (folderId) {
        url.searchParams.set('folder_id', folderId);
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (password) {
        headers['X-Store-Password'] = password;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: abortControllerRef.current.signal,
        // Add cache control to prevent stale data
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const error = classifyError(data, response);

        // Handle authentication errors specially
        if (error.type === 'authentication' && data.passwordRequired) {
          setConfig({
            isValid: false,
            passwordRequired: true,
            attemptsRemaining: data.attemptsRemaining,
            lockoutUntil: data.lockoutUntil,
            error: data.error || data.message
          });
          onPasswordRequired?.();
          setError(error);
          setLoading(false);
          setLoadingState('idle');
          return;
        }

        throw error;
      }

      setConfig({
        ...(data || {}),
        isValid: true,
        passwordRequired: false,
      });
      setError(null);
      setRetryCount(0);
      setNextRetryTime(null);
      setLoading(false);
      setLoadingState('idle');

      // Call password required callback if needed
      if (data.passwordRequired && !password) {
        onPasswordRequired?.();
      }

    } catch (err: any) {
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      const classifiedError = err.type ? err : classifyError(err);

      // Handle retryable errors
      if (classifiedError.retryable && retryCount < MAX_RETRIES) {
        const delay = calculateRetryDelay(retryCount);
        setNextRetryTime(Date.now() + delay);

        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            fetchStoreConfig(true);
          }
        }, delay);
      } else {
        setError(classifiedError);
        onError?.(classifiedError);
        setLoading(false);
        setLoadingState('idle');
      }
    }
  }, [token, password, folderId, retryCount, classifyError, calculateRetryDelay, onPasswordRequired, onError]);

  // Initial fetch
  useEffect(() => {
    fetchStoreConfig();
  }, [token, password, folderId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Manual retry function
  const retry = useCallback(() => {
    setRetryCount(0);
    setNextRetryTime(null);
    fetchStoreConfig(false);
  }, [fetchStoreConfig]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setNextRetryTime(null);
  }, []);

  // Check online status and auto-retry
  useEffect(() => {
    const handleOnline = () => {
      if (error?.type === 'network' && error.retryable) {
        retry();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [error, retry]);

  return {
    config,
    loading,
    loadingState,
    error,
    retry,
    resetError,
    retryCount,
    nextRetryTime,
    isPasswordRequired: config?.passwordRequired && !password,
    attemptsRemaining: config?.attemptsRemaining || error?.attemptsRemaining,
    lockoutUntil: config?.lockoutUntil || error?.lockoutUntil
  };
}
