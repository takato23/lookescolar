/**
 * CATCH-ALL ROUTE para /f/[token]/[...slug]
 *
 * Esta ruta captura todas las subrutas como:
 * - /f/[token]/enhanced-page
 * - /f/[token]/store
 * - /f/[token]/gallery
 * - /f/[token]/cualquier-otra-ruta
 *
 * Y las redirige todas a la tienda unificada
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string; slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatchAllFamilyPage({
  params,
  searchParams,
}: PageProps) {
  const { token, slug } = await params;
  const searchParamsObj = await searchParams;

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
    `🔄 [CATCH-ALL] Redirigiendo /f/${token}/${slug.join('/')} → ${redirectUrl}`
  );

  // Redirigir a la tienda unificada
  redirect(redirectUrl);
}
