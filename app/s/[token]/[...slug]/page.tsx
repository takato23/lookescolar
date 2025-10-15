/**
 * CATCH-ALL ROUTE para /s/[token]/[...slug]
 *
 * Esta ruta captura todas las subrutas como:
 * - /s/[token]/gallery
 * - /s/[token]/photos
 * - /s/[token]/download
 * - /s/[token]/cualquier-otra-ruta
 *
 * Y las redirige todas a la tienda unificada
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: { token: string; slug: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CatchAllSharePage({
  params,
  searchParams,
}: PageProps) {
  const { token, slug } = params;
  const searchParamsObj = searchParams;

  // Construir la URL de la tienda unificada preservando los query params
  let redirectUrl = `/store-unified/${token}`;

  // Si hay query params, agregarlos a la redirección
  if (Object.keys(searchParamsObj).length > 0) {
    const queryString = new URLSearchParams();

    Object.entries(searchParamsObj).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => queryString.append(key, v));
        } else {
          queryString.append(key, value);
        }
      }
    });

    if (queryString.toString()) {
      redirectUrl += `?${queryString.toString()}`;
    }
  }

  console.log(
    `🔄 [CATCH-ALL] Redirigiendo /s/${token}/${slug.join('/')} → ${redirectUrl}`
  );

  // Redirigir a la tienda unificada
  redirect(redirectUrl);
}
