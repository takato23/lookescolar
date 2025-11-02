/**
 * UNIFIED SHARE PAGE - /s/[token]
 *
 * Redirección simple a la tienda unificada para cualquier token.
 * Los controles de acceso se aplican dentro de la tienda/galería.
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  redirect(`/store-unified/${token}`);
}
