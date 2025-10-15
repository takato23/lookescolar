import {
  AliasLookupErrorCode,
  AliasLookupResponse,
  EnhancedTokenErrorCode,
  EnhancedTokenValidationResponse,
} from '@/lib/types/family-access';
import { normalizeAliasInput } from '@/lib/utils/token-alias';

type ResolverErrorCode =
  | AliasLookupErrorCode
  | EnhancedTokenErrorCode
  | 'EMPTY_CODE'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED_RESPONSE';

export class FamilyTokenResolutionError extends Error {
  status: number;
  code: ResolverErrorCode;
  details?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code: ResolverErrorCode;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = 'FamilyTokenResolutionError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export interface ResolveFamilyTokenResult {
  token: string;
  source: 'alias' | 'token';
  alias?: AliasLookupResponse;
  validation: EnhancedTokenValidationResponse;
}

async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ status: number; ok: boolean; data: T | null; raw: Response }> {
  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    let data: T | null = null;
    if (response.headers.get('content-type')?.includes('application/json')) {
      data = (await response.json()) as T;
    }

    return { status: response.status, ok: response.ok, data, raw: response };
  } catch (error) {
    throw new FamilyTokenResolutionError(
      'No se pudo conectar con el servicio de validación',
      {
        status: 0,
        code: 'NETWORK_ERROR',
        details: error,
      }
    );
  }
}

function shouldTreatAsAlias(rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (!trimmed) return false;

  const normalized = normalizeAliasInput(trimmed);
  if (normalized.length > 0 && normalized.length <= 16) {
    return true;
  }

  // Allow short code format (e.g., ABC123)
  if (/^[A-Z0-9]{4,12}$/i.test(trimmed.replace(/[\s-]+/g, ''))) {
    return true;
  }

  return false;
}

function normalizeTokenInput(rawToken: string): string {
  return rawToken.trim().replace(/\s+/g, '');
}

export async function resolveFamilyToken(
  rawInput: string
): Promise<ResolveFamilyTokenResult> {
  if (!rawInput || rawInput.trim().length === 0) {
    throw new FamilyTokenResolutionError(
      'Ingresa un código o alias para continuar',
      {
        status: 400,
        code: 'EMPTY_CODE',
      }
    );
  }

  const treatAsAlias = shouldTreatAsAlias(rawInput);
  const normalizedAlias = treatAsAlias
    ? normalizeAliasInput(rawInput)
    : undefined;

  let aliasResponse: AliasLookupResponse | undefined;
  let tokenToValidate: string;

  if (treatAsAlias && normalizedAlias) {
    const aliasResult = await fetchJson<
      AliasLookupResponse | { error: string; error_code: AliasLookupErrorCode }
    >(`/api/family/alias/${encodeURIComponent(rawInput.trim())}`, {
      cache: 'no-store',
    });

    if (!aliasResult.ok || !aliasResult.data) {
      const errorPayload = aliasResult.data as {
        error?: string;
        error_code?: AliasLookupErrorCode;
      };

      throw new FamilyTokenResolutionError(
        errorPayload?.error || 'No encontramos ese alias',
        {
          status: aliasResult.status,
          code: (errorPayload?.error_code ??
            'ALIAS_NOT_FOUND') as ResolverErrorCode,
          details: errorPayload,
        }
      );
    }

    aliasResponse = aliasResult.data as AliasLookupResponse;
    tokenToValidate = aliasResponse.token;
  } else {
    tokenToValidate = normalizeTokenInput(rawInput);
  }

  const validationResult = await fetchJson<
    EnhancedTokenValidationResponse & {
      error?: string;
      error_code?: EnhancedTokenErrorCode;
    }
  >(
    `/api/family/validate-token/enhanced/${encodeURIComponent(
      tokenToValidate
    )}`,
    {
      cache: 'no-store',
    }
  );

  if (!validationResult.data) {
    throw new FamilyTokenResolutionError(
      'Respuesta inesperada del servicio de validación',
      {
        status: validationResult.status,
        code: 'UNEXPECTED_RESPONSE',
      }
    );
  }

  if (!validationResult.ok || !validationResult.data.valid) {
    const errorPayload = validationResult.data as {
      error?: string;
      error_code?: EnhancedTokenErrorCode;
    };

    throw new FamilyTokenResolutionError(
      errorPayload?.error ||
        'No pudimos validar el código. Verifica que esté completo.',
      {
        status: validationResult.status,
        code: (errorPayload?.error_code ??
          'INVALID_TOKEN') as ResolverErrorCode,
        details: errorPayload,
      }
    );
  }

  return {
    token: tokenToValidate,
    source: aliasResponse ? 'alias' : 'token',
    alias: aliasResponse,
    validation: validationResult.data,
  };
}
