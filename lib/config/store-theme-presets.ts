import { StoreSettings } from '@/lib/hooks/useStoreSettings';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

export interface StoreThemePresetMeta {
  id: string;
  name: string;
  description: string;
  audience: 'default' | 'kids' | 'teens' | 'family' | 'premium';
  tone: 'neutral' | 'playful' | 'elegant' | 'minimal';
  highlights: string[];
  previewGradient: string;
}

export interface StoreThemePreset {
  meta: StoreThemePresetMeta;
  overrides: DeepPartial<StoreSettings>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source === undefined ? target : (source as T);
  }

  const output: Record<string, unknown> = { ...(target as Record<string, unknown>) };

  Object.entries(source as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const currentValue = output[key];

    if (isPlainObject(currentValue) && isPlainObject(value)) {
      output[key] = deepMerge(currentValue, value as DeepPartial<typeof currentValue>);
    } else {
      output[key] = value;
    }
  });

  return output as T;
}

export function applyThemePreset(settings: StoreSettings, preset: StoreThemePreset): StoreSettings {
  if (!preset?.overrides) {
    return settings;
  }

  const cloned = deepMerge({} as StoreSettings, settings as unknown as DeepPartial<StoreSettings>);
  return deepMerge(cloned, preset.overrides);
}

export const STORE_THEME_PRESETS: Record<string, StoreThemePreset> = {
  default: {
    meta: {
      id: 'default',
      name: 'Estilo Predeterminado',
      description: 'La configuración global de la tienda sin ajustes adicionales.',
      audience: 'default',
      tone: 'neutral',
      highlights: ['Respeta los colores configurados', 'Ideal para un estilo consistente'],
      previewGradient: 'from-gray-100 via-white to-gray-200',
    },
    overrides: {},
  },
  kids: {
    meta: {
      id: 'kids',
      name: 'Infantil & Divertido',
      description: 'Paleta vibrante y mensajes cercanos pensados para familias con niños pequeños.',
      audience: 'kids',
      tone: 'playful',
      highlights: ['Colores brillantes', 'Tipografía amigable', 'Mensajes cercanos'],
      previewGradient: 'from-pink-400 via-orange-300 to-yellow-300',
    },
    overrides: {
      template: 'bold-vibrant',
      colors: {
        primary: '#f97316',
        secondary: '#fb7185',
        accent: '#facc15',
        background: '#fff7ed',
        surface: '#ffffff',
        text: '#1f2937',
        text_secondary: '#4b5563',
      },
      texts: {
        hero_title: '¡Bienvenidos a la Aventura Escolar!',
        hero_subtitle: 'Descubrí las fotos más tiernas y divertidas del jardín',
        footer_text: 'Con amor desde LookEscolar · Recuerdos que contagian sonrisas',
      },
      custom_branding: {
        brand_tagline: 'Momentos que abrazan',
        accent_color: '#f97316',
        secondary_color: '#fb7185',
        font_family: '"Comic Sans MS", "Comic Neue", cursive',
      },
      welcome_message: '¡Hola familia! Elegimos un estilo súper alegre para que disfruten estas fotos llenas de sonrisas.',
      theme_customization: {
        header_style: 'bold',
        gallery_layout: 'grid',
        show_photo_numbers: false,
        mobile_columns: 2,
        desktop_columns: 3,
      },
    },
  },
  teen: {
    meta: {
      id: 'teen',
      name: 'Joven & Creativo',
      description: 'Combinación moderna con contraste sutil, ideal para adolescentes y eventos artísticos.',
      audience: 'teens',
      tone: 'minimal',
      highlights: ['Aires modernos', 'Tipografía equilibrada', 'Contraste alto'],
      previewGradient: 'from-slate-800 via-slate-700 to-blue-500',
    },
    overrides: {
      template: 'modern-minimal',
      colors: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#38bdf8',
        background: '#0f172a',
        surface: '#111827',
        text: '#f8fafc',
        text_secondary: '#cbd5f5',
      },
      texts: {
        hero_title: 'Tu historia, tu estilo',
        hero_subtitle: 'Explorá una galería curada con lo mejor del evento',
        footer_text: 'LookEscolar · Experiencias que inspiran',
      },
      custom_branding: {
        brand_tagline: 'Fotografía con actitud',
        accent_color: '#38bdf8',
        primary_color: '#0f172a',
        secondary_color: '#1e293b',
        font_family: '"Inter", sans-serif',
      },
      theme_customization: {
        header_style: 'minimal',
        gallery_layout: 'masonry',
        show_photo_numbers: false,
        enable_fullscreen: true,
        enable_zoom: true,
      },
    },
  },
  elegant: {
    meta: {
      id: 'elegant',
      name: 'Elegante & Premium',
      description: 'Un look sofisticado y sobrio ideal para reuniones, eventos formales o fotografías de adultos.',
      audience: 'premium',
      tone: 'elegant',
      highlights: ['Modo oscuro', 'Tipografía serif', 'Experiencia boutique'],
      previewGradient: 'from-zinc-900 via-zinc-800 to-amber-600/40',
    },
    overrides: {
      template: 'premium-photography',
      colors: {
        primary: '#f4f1ea',
        secondary: '#d4af37',
        accent: '#f97316',
        background: '#0b0b0f',
        surface: '#101014',
        text: '#f4f1ea',
        text_secondary: '#c5c6c7',
      },
      texts: {
        hero_title: 'Colección Exclusiva',
        hero_subtitle: 'Una experiencia premium para revivir momentos inolvidables',
        footer_text: 'LookEscolar · Edición Premium',
      },
      custom_branding: {
        brand_tagline: 'Elegancia en cada detalle',
        primary_color: '#f4f1ea',
        secondary_color: '#d4af37',
        accent_color: '#f97316',
        font_family: '"Georgia", serif',
      },
      welcome_message: 'Gracias por acompañarnos. Esta galería exclusiva está diseñada para ofrecerte una experiencia distinguida.',
      theme_customization: {
        header_style: 'default',
        gallery_layout: 'grid',
        mobile_columns: 2,
        desktop_columns: 4,
        show_photo_numbers: true,
      },
    },
  },
};

export const STORE_THEME_PRESET_LIST = Object.values(STORE_THEME_PRESETS).map((preset) => preset.meta);
