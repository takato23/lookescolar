/**
 * Página Pública de Tienda
 * /store/[token] - REDIRECCIÓN A TIENDA UNIFICADA
 *
 * Esta ruta ahora redirige automáticamente a la tienda unificada
 * para mantener consistencia en la experiencia del usuario
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function StorePage({ params }: PageProps) {
  const { token } = await params;

  // Redirigir automáticamente a la tienda unificada
  redirect(`/store-unified/${token}`);
}
