import UnifiedPhotoManagement from '@/components/admin/UnifiedPhotoManagement';
import '@/styles/event-themes.css';

interface UnifiedPhotosPageProps {
  searchParams: {
    eventId?: string;
    eventType?: string;
    theme?: string;
  };
}

export default function UnifiedPhotosPage({ 
  searchParams 
}: UnifiedPhotosPageProps) {
  const { eventId, eventType = 'secundaria', theme } = searchParams;

  return (
    <>
      <UnifiedPhotoManagement 
        eventId={eventId}
        initialEventType={eventType}
        className="min-h-screen"
      />
    </>
  );
}

export const metadata = {
  title: 'Gestor Unificado de Fotos - LookEscolar',
  description: 'Sistema unificado de gestión fotográfica con interfaces adaptadas por tipo de evento',
};



