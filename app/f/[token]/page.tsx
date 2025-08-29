/**
 * Redirección automática de /f/[token] a /store-unified/[token]
 * Para mantener consistencia y unificar todas las tiendas
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LegacyFamilyPage({ params }: PageProps) {
  const { token } = await params;
  
  // Redirigir automáticamente a la nueva ruta unificada
  redirect(`/store-unified/${token}`);
}
