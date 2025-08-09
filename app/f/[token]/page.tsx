// Por ahora usar el componente simple mientras se arreglan los otros componentes
import SimpleGalleryPage from './simple-page';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export default async function FamilyPortal() {
  // Placeholder: resolver real se integrará cuando movamos este archivo a RSC con params
  // Mantiene compatibilidad y no rompe la UI actual
  try {
    await createServerSupabaseServiceClient();
  } catch {}
  return <SimpleGalleryPage />;
}
 
