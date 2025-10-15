import { headers } from 'next/headers';
import { FamilyAccessCard } from '@/components/ui/family-access-card';
import { EnhancedTokenValidationResponse } from '@/lib/types/family-access';

interface PageProps {
  params: { token: string };
}

interface ValidationErrorPayload {
  error?: string;
  error_code?: string;
}

function resolveBaseUrl(): string {
  const host = headers().get('host');
  const protocol =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ||
    host?.includes('localhost') === false
      ? 'https'
      : 'http';
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return `${protocol}://${host}`;
}

function getErrorMessage(payload?: ValidationErrorPayload): string {
  if (!payload) {
    return 'No pudimos validar este enlace. El código puede haber expirado.';
  }
  switch (payload.error_code) {
    case 'EXPIRED_TOKEN':
      return 'Este enlace ya expiró. Pedí un alias o código nuevo a la fotógrafa.';
    case 'INACTIVE_TOKEN':
      return 'El acceso está deshabilitado. Contactá a la fotógrafa para restaurarlo.';
    case 'EVENT_INACTIVE':
      return 'El evento todavía no está publicado para familias.';
    default:
      return (
        payload.error ||
        'No encontramos un acceso válido asociado a este enlace.'
      );
  }
}

export default async function LegacyFamilyPage({ params }: PageProps) {
  const { token } = params;
  const baseUrl = resolveBaseUrl();

  let prefetchedResult:
    | {
        token: string;
        validation: EnhancedTokenValidationResponse;
        source: 'token';
      }
    | null = null;
  let errorPayload: ValidationErrorPayload | undefined;

  try {
    const response = await fetch(
      `${baseUrl}/api/family/validate-token/enhanced/${encodeURIComponent(
        token
      )}`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const data =
        (await response.json()) as EnhancedTokenValidationResponse;
      prefetchedResult = {
        token,
        source: 'token',
        validation: data,
      };
    } else {
      errorPayload = (await response.json()) as ValidationErrorPayload;
    }
  } catch (error) {
    console.error('[LegacyFamilyPage] Failed to pre-validate token', error);
  }

  if (prefetchedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-100 px-6 py-16 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Confirmá tu acceso familiar
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Verificamos el enlace y ya podés ingresar a la tienda unificada.
            </p>
          </div>

          <FamilyAccessCard
            initialCode={token}
            prefetchedResult={prefetchedResult}
          />
        </div>
      </div>
    );
  }

  const errorMessage = getErrorMessage(errorPayload);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-100 px-6 py-16 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-4xl space-y-8 text-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 shadow-lg dark:border-red-900/40 dark:bg-gray-950">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-300">
            No pudimos abrir tu galería
          </h1>
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            {errorMessage}
          </p>
          <div className="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Podés intentar:</p>
            <ul className="list-inside list-disc space-y-1 text-left">
              <li>Volver a escanear el código QR desde tu flyer.</li>
              <li>
                Escribir el alias corto en el formulario de abajo para generar
                un acceso nuevo.
              </li>
              <li>
                Contactar a la fotógrafa para recibir otro código válido.
              </li>
            </ul>
          </div>
        </div>

        <FamilyAccessCard initialCode={token} />
      </div>
    </div>
  );
}
