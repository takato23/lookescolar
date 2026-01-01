import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint legado: /api/public/gallery/[token]
 *
 * El esquema actual usa `share_tokens` + `/api/public/share/[token]/gallery`
 * y `/api/store/[token]` para la tienda unificada.
 *
 * Mantenemos este endpoint para compatibilidad, pero redirigimos al flujo canónico.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ token: string }>
) {
  const { token } = await context.params;

  const redirectUrl = new URL(`/api/store/${token}`, request.url);
  const existingParams = new URL(request.url).searchParams;
  redirectUrl.search = existingParams.toString();
  if (!redirectUrl.searchParams.has('include_assets')) {
    redirectUrl.searchParams.set('include_assets', 'true');
  }

  return NextResponse.redirect(redirectUrl, 307);
}
