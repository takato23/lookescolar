/**
 * Redirección automática del wizard de /f/[token]/wizard a /store/[token]
 * El wizard ahora está integrado en UnifiedStore
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: { token: string };
}

export default async function LegacyWizardPage({ params }: PageProps) {
  const { token } = params;

  // Redirigir automáticamente a la nueva ruta unificada
  // El wizard está integrado en UnifiedStore
  redirect(`/store/${token}`);
}
