/**
 * Store Adapter - Convierte datos de la nueva API de store al formato de UnifiedStore
 */

export interface StoreAsset {
  id: string;
  filename: string;
  preview_url: string | null;
  watermark_url: string | null;
  file_size: number;
  created_at: string;
}

export interface StoreData {
  folder_id: string;
  folder_name: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  store_settings: any;
  view_count: number;
  asset_count: number;
}

export interface UnifiedStoreData {
  token: string;
  photos: UnifiedPhoto[];
  subject: UnifiedSubject;
}

export interface UnifiedPhoto {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

export interface UnifiedSubject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
    theme?: string;
  };
}

/**
 * Convierte los datos de la nueva API de store al formato de UnifiedStore
 */
export function adaptStoreDataToUnified(
  token: string,
  storeData: StoreData,
  assets: StoreAsset[]
): UnifiedStoreData {
  // Convertir assets a fotos
  const photos: UnifiedPhoto[] = assets.map(asset => ({
    id: asset.id,
    filename: asset.filename,
    preview_url: asset.preview_url || `/admin/previews/${asset.filename.replace(/\.[^/.]+$/, '')}_preview.webp`,
    size: asset.file_size,
    width: 800, // Default width para previews
    height: 600, // Default height para previews
  }));

  // Crear subject unificado
  const subject: UnifiedSubject = {
    id: storeData.folder_id,
    name: storeData.folder_name,
    grade_section: 'Evento', // Por defecto
    event: {
      name: storeData.event_name,
      school_name: 'Escuela', // Por defecto, se puede mejorar
      theme: storeData.store_settings?.theme || 'default',
    },
  };

  return {
    token,
    photos,
    subject,
  };
}

/**
 * Obtiene el tema del evento desde la configuración de la tienda
 */
export function getEventTheme(storeSettings: any): string {
  if (storeSettings?.theme) {
    return storeSettings.theme;
  }
  
  // Detectar tema basado en el nombre del evento
  const eventName = storeSettings?.event_name || '';
  if (eventName.toLowerCase().includes('jardín') || eventName.toLowerCase().includes('kinder')) {
    return 'jardin';
  }
  if (eventName.toLowerCase().includes('secundaria') || eventName.toLowerCase().includes('colegio')) {
    return 'secundaria';
  }
  if (eventName.toLowerCase().includes('bautismo') || eventName.toLowerCase().includes('comunión')) {
    return 'bautismo';
  }
  
  return 'default';
}
