import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 🔄 RESTAURADO - Interfaz Unificada del Evento
 *
 * Redirige a la gestión específica del evento (/library)
 * que proporciona el contexto completo y gestión integrada.
 */
export default async function UnifiedEventRedirect({ params }: PageProps) {
  const { id: eventId } = await params;
  
  // Redirigir al gestor específico del evento 
  redirect(`/admin/events/${eventId}/library`);
}

export const metadata = {
  title: 'Gestión Unificada del Evento',
  description: 'Gestión completa del evento con contexto'
};
