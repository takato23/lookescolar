// FASE 3: Redirección condicional a sistema unificado
import SimpleGalleryPage from './simple-page';
import TokenRedirect from './redirect';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { featureFlags, debugMigration } from '@/lib/feature-flags';

export default async function FamilyPortal() {
  try {
    await createServerSupabaseServiceClient();
  } catch {}

  debugMigration('FamilyPortal page rendered', { 
    familyInGalleryRoute: featureFlags.FAMILY_IN_GALLERY_ROUTE,
    unifiedGalleryEnabled: featureFlags.UNIFIED_GALLERY_ENABLED 
  });

  // Si la redirección a galería unificada está habilitada, usar TokenRedirect
  if (featureFlags.FAMILY_IN_GALLERY_ROUTE && featureFlags.UNIFIED_GALLERY_ENABLED) {
    debugMigration('Using TokenRedirect for family gallery');
    return <TokenRedirect />;
  }

  // Fallback al sistema legacy
  debugMigration('Using legacy SimpleGalleryPage');
  return <SimpleGalleryPage />;
}
 
