import { useCallback, useState } from 'react';
import {
  FamilyTokenResolutionError,
  ResolveFamilyTokenResult,
  resolveFamilyToken,
} from '@/lib/services/family-token-resolver';

type ResolverStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseFamilyTokenResolverReturn {
  status: ResolverStatus;
  data: ResolveFamilyTokenResult | null;
  error: FamilyTokenResolutionError | null;
  resolve: (input: string) => Promise<ResolveFamilyTokenResult | null>;
  reset: () => void;
}

export function useFamilyTokenResolver(): UseFamilyTokenResolverReturn {
  const [status, setStatus] = useState<ResolverStatus>('idle');
  const [data, setData] = useState<ResolveFamilyTokenResult | null>(null);
  const [error, setError] = useState<FamilyTokenResolutionError | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  const resolve = useCallback(
    async (input: string) => {
      setStatus('loading');
      setError(null);

      try {
        const result = await resolveFamilyToken(input);
        setData(result);
        setStatus('success');
        return result;
      } catch (err) {
        const resolutionError =
          err instanceof FamilyTokenResolutionError
            ? err
            : new FamilyTokenResolutionError(
                err instanceof Error ? err.message : 'Error desconocido',
                {
                  status: err instanceof Error ? 500 : 500,
                  code: 'SERVER_ERROR',
                  details: err,
                }
              );

        setError(resolutionError);
        setStatus('error');
        return null;
      }
    },
    []
  );

  return { status, data, error, resolve, reset };
}
