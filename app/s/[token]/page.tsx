/**
 * UNIFIED SHARE PAGE - /s/[token]
 *
 * REDIRECCIÓN A TIENDA UNIFICADA
 *
 * Esta ruta ahora redirige automáticamente a la tienda unificada
 * para mantener consistencia en la experiencia del usuario
 */

import { redirect } from 'next/navigation';
import { hierarchicalGalleryService } from '../../../lib/services/hierarchical-gallery.service';

interface PageProps {
  params: {
    token: string;
  };
  searchParams: {
    folder?: string;
    page?: string;
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = params;

  try {
    // Validar token rápidamente
    const validation = await hierarchicalGalleryService.validateAccess(token);

    if (!validation.isValid) {
      // Si el token no es válido, redirigir a página de error
      redirect('/error?reason=invalid-token');
    }

    // Token válido - redirigir a tienda unificada
    redirect(`/store-unified/${token}`);
  } catch (error) {
    console.error('Share page error:', error);
    redirect('/error?reason=validation-failed');
  }
}
