/**
 * UNIFIED SHARE PAGE - /s/[token]
 *
 * Redirección simple a la tienda unificada para cualquier token.
 * Los controles de acceso se aplican dentro de la tienda/galería.
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: { token: string };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = params;
  redirect(`/store-unified/${token}`);
}
