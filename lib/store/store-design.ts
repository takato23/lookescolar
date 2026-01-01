export type StoreCoverStyle =
  | 'center'
  | 'joy'
  | 'left'
  | 'novel'
  | 'vintage'
  | 'frame'
  | 'stripe'
  | 'divider'
  | 'none';

export type StoreCoverVariant =
  | 'journal'
  | 'stamp'
  | 'outline'
  | 'classic'
  | 'split'
  | 'label'
  | 'border'
  | 'album'
  | 'cliff'
  | 'none';

export type StoreTypographyPreset =
  | 'sans'
  | 'serif'
  | 'modern'
  | 'timeless'
  | 'bold'
  | 'subtle';

export type StoreColorPalette =
  | 'light'
  | 'gold'
  | 'rose'
  | 'terracotta'
  | 'sand'
  | 'olive'
  | 'agave'
  | 'sea'
  | 'dark';

export type StoreGridStyle = 'vertical' | 'horizontal';
export type StoreGridThumb = 'regular' | 'large';
export type StoreGridSpacing = 'regular' | 'large';
export type StoreGridNav = 'icons' | 'icons_text';

export type StoreDensity = 'compact' | 'balanced' | 'airy';
export type StoreHeaderStyle = 'classic' | 'minimal';

export interface StoreDesignSettings {
  cover: {
    style: StoreCoverStyle;
    variant: StoreCoverVariant;
  };
  typography: {
    preset: StoreTypographyPreset;
  };
  color: {
    palette: StoreColorPalette;
  };
  grid: {
    style: StoreGridStyle;
    thumb: StoreGridThumb;
    spacing: StoreGridSpacing;
    nav: StoreGridNav;
  };
  app: {
    density: StoreDensity;
    header: StoreHeaderStyle;
  };
}

export const DEFAULT_STORE_DESIGN: StoreDesignSettings = {
  cover: { style: 'center', variant: 'classic' },
  typography: { preset: 'sans' },
  color: { palette: 'light' },
  grid: { style: 'vertical', thumb: 'regular', spacing: 'regular', nav: 'icons_text' },
  app: { density: 'balanced', header: 'classic' },
};

export const COVER_STYLE_OPTIONS = [
  { id: 'center', label: 'Centro', description: 'Hero centrado con foco en el título.' },
  { id: 'joy', label: 'Alegría', description: 'Tono cálido con fondo suave y CTA destacado.' },
  { id: 'left', label: 'Izquierda', description: 'Título alineado a la izquierda con imagen amplia.' },
  { id: 'novel', label: 'Novela', description: 'Tipografía protagónica y layout editorial.' },
  { id: 'vintage', label: 'Vintage', description: 'Aire clásico con textura ligera.' },
  { id: 'frame', label: 'Marco', description: 'Imagen enmarcada y elegante.' },
  { id: 'stripe', label: 'Franja', description: 'Banda de color que enmarca la portada.' },
  { id: 'divider', label: 'Divisor', description: 'Separador visual entre texto e imagen.' },
  { id: 'none', label: 'Sin portada', description: 'Solo texto y navegación.' },
];

export const COVER_VARIANT_OPTIONS = [
  { id: 'journal', label: 'Diario', description: 'Textura suave y bordes sutiles.' },
  { id: 'stamp', label: 'Sello', description: 'Remate con borde discontinuo.' },
  { id: 'outline', label: 'Contorno', description: 'Marco fino y limpio.' },
  { id: 'classic', label: 'Clásico', description: 'Presentación equilibrada.' },
  { id: 'split', label: 'Dividido', description: 'Mitades contrastadas.' },
  { id: 'label', label: 'Etiqueta', description: 'Etiqueta destacada sobre la imagen.' },
  { id: 'border', label: 'Borde', description: 'Marco ancho para la portada.' },
  { id: 'album', label: 'Álbum', description: 'Sombra y profundidad.' },
  { id: 'cliff', label: 'Acantilado', description: 'Corte superior pronunciado.' },
  { id: 'none', label: 'Sin variante', description: 'Sin efecto adicional.' },
];

export const TYPOGRAPHY_PRESETS = [
  {
    id: 'sans',
    label: 'Sans',
    description: 'Neutral y legible.',
    baseClass: 'font-sans',
    headingClass: 'tracking-tight',
  },
  {
    id: 'serif',
    label: 'Serif',
    description: 'Clásica y editorial.',
    baseClass: 'font-serif',
    headingClass: 'tracking-normal',
  },
  {
    id: 'modern',
    label: 'Moderna',
    description: 'Geométrica y prolija.',
    baseClass: 'font-sans',
    headingClass: 'uppercase tracking-[0.18em]',
  },
  {
    id: 'timeless',
    label: 'Eterna',
    description: 'Ligera y elegante.',
    baseClass: 'font-serif',
    headingClass: 'tracking-wide',
  },
  {
    id: 'bold',
    label: 'Impacto',
    description: 'Pesada y contundente.',
    baseClass: 'font-sans',
    headingClass: 'uppercase tracking-[0.2em]',
  },
  {
    id: 'subtle',
    label: 'Sutil',
    description: 'Minimalista y suave.',
    baseClass: 'font-sans',
    headingClass: 'tracking-wide',
  },
];

export const COLOR_PALETTES = [
  {
    id: 'light',
    label: 'Luz',
    swatches: ['#f7f6f2', '#e9e5dd', '#2f3b44'],
    tokens: {
      background: '#f7f6f2',
      surface: '#ffffff',
      accent: '#2f6f6d',
      accentSoft: '#d6e5e2',
      text: '#1f2937',
      muted: '#6b7280',
      border: '#e5e7eb',
    },
  },
  {
    id: 'gold',
    label: 'Oro',
    swatches: ['#f8f3e6', '#e9dcc5', '#8a6d3b'],
    tokens: {
      background: '#f8f3e6',
      surface: '#fffaf2',
      accent: '#b7791f',
      accentSoft: '#f1e3c6',
      text: '#3a2c1a',
      muted: '#7a6a55',
      border: '#eadcc7',
    },
  },
  {
    id: 'rose',
    label: 'Rosa',
    swatches: ['#f9f1f4', '#ead6db', '#9b5f6a'],
    tokens: {
      background: '#f9f1f4',
      surface: '#fff8fa',
      accent: '#c56a7d',
      accentSoft: '#f1d7dd',
      text: '#3d2a2f',
      muted: '#81656c',
      border: '#ead6db',
    },
  },
  {
    id: 'terracotta',
    label: 'Terracota',
    swatches: ['#f6efe8', '#e4d3c5', '#a2674f'],
    tokens: {
      background: '#f6efe8',
      surface: '#fff7f1',
      accent: '#c07b5d',
      accentSoft: '#f1ded0',
      text: '#3b2a22',
      muted: '#7c6a5f',
      border: '#e4d3c5',
    },
  },
  {
    id: 'sand',
    label: 'Arena',
    swatches: ['#f4f2ec', '#e3ddd3', '#9a8c7d'],
    tokens: {
      background: '#f4f2ec',
      surface: '#fbf9f4',
      accent: '#9c8b6d',
      accentSoft: '#e6dfd4',
      text: '#2f2a26',
      muted: '#7d7368',
      border: '#e3ddd3',
    },
  },
  {
    id: 'olive',
    label: 'Oliva',
    swatches: ['#f2f3ee', '#dfe1d2', '#6d7252'],
    tokens: {
      background: '#f2f3ee',
      surface: '#fbfbf6',
      accent: '#6d7b55',
      accentSoft: '#e2e6d6',
      text: '#2a2f24',
      muted: '#6b6f5c',
      border: '#dfe1d2',
    },
  },
  {
    id: 'agave',
    label: 'Agave',
    swatches: ['#eff3f1', '#dbe5e1', '#6b897b'],
    tokens: {
      background: '#eff3f1',
      surface: '#f7fbf9',
      accent: '#6b897b',
      accentSoft: '#dbe5e1',
      text: '#24302b',
      muted: '#6b7c74',
      border: '#dbe5e1',
    },
  },
  {
    id: 'sea',
    label: 'Mar',
    swatches: ['#f0f3f8', '#d9e1ee', '#5f6f89'],
    tokens: {
      background: '#f0f3f8',
      surface: '#f8faff',
      accent: '#5f6f89',
      accentSoft: '#d9e1ee',
      text: '#1f2a3a',
      muted: '#6b7280',
      border: '#d9e1ee',
    },
  },
  {
    id: 'dark',
    label: 'Noche',
    swatches: ['#111827', '#1f2937', '#f9fafb'],
    tokens: {
      background: '#0f172a',
      surface: '#111827',
      accent: '#38bdf8',
      accentSoft: '#1e293b',
      text: '#f9fafb',
      muted: '#94a3b8',
      border: '#1f2937',
    },
  },
];

export const GRID_STYLE_OPTIONS = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
];

export const GRID_THUMB_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'large', label: 'Grande' },
];

export const GRID_SPACING_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'large', label: 'Amplio' },
];

export const GRID_NAV_OPTIONS = [
  { id: 'icons', label: 'Solo íconos' },
  { id: 'icons_text', label: 'Íconos y texto' },
];

export const APP_DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compacta' },
  { id: 'balanced', label: 'Equilibrada' },
  { id: 'airy', label: 'Aireada' },
];

export const APP_HEADER_OPTIONS = [
  { id: 'classic', label: 'Clásica' },
  { id: 'minimal', label: 'Minimal' },
];

export function resolveStoreDesign(
  design?: Partial<StoreDesignSettings> | null
): StoreDesignSettings {
  return {
    ...DEFAULT_STORE_DESIGN,
    ...(design ?? {}),
    cover: {
      ...DEFAULT_STORE_DESIGN.cover,
      ...(design?.cover ?? {}),
    },
    typography: {
      ...DEFAULT_STORE_DESIGN.typography,
      ...(design?.typography ?? {}),
    },
    color: {
      ...DEFAULT_STORE_DESIGN.color,
      ...(design?.color ?? {}),
    },
    grid: {
      ...DEFAULT_STORE_DESIGN.grid,
      ...(design?.grid ?? {}),
    },
    app: {
      ...DEFAULT_STORE_DESIGN.app,
      ...(design?.app ?? {}),
    },
  };
}

export function getPaletteTokens(paletteId: StoreColorPalette) {
  return (
    COLOR_PALETTES.find((palette) => palette.id === paletteId)?.tokens ??
    COLOR_PALETTES[0].tokens
  );
}

export function getTypographyPreset(preset: StoreTypographyPreset) {
  return (
    TYPOGRAPHY_PRESETS.find((item) => item.id === preset) ??
    TYPOGRAPHY_PRESETS[0]
  );
}

export function getGridClasses(grid: StoreDesignSettings['grid']) {
  const gapClass = grid.spacing === 'large' ? 'gap-6' : 'gap-3';
  const aspectClass = grid.style === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]';

  let colsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';
  if (grid.thumb === 'large') {
    colsClass = grid.style === 'horizontal'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  } else if (grid.style === 'horizontal') {
    colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  }

  return { gapClass, colsClass, aspectClass };
}

// ============================================
// EVENT CATEGORIES & TEMPLATE PRESETS
// ============================================

export type EventCategory =
  | 'graduation'
  | 'sports'
  | 'preschool'
  | 'corporate'
  | 'artistic'
  | 'casual';

export interface EventCategoryConfig {
  id: EventCategory;
  label: string;
  emoji: string;
  description: string;
  suggestedDesign: StoreDesignSettings;
  tags: string[];
}

export const EVENT_CATEGORIES: EventCategoryConfig[] = [
  {
    id: 'graduation',
    label: 'Graduación',
    emoji: '🎓',
    description: 'Ceremonias de egreso, actos de colación',
    tags: ['formal', 'elegante', 'tradicional'],
    suggestedDesign: {
      cover: { style: 'center', variant: 'classic' },
      typography: { preset: 'serif' },
      color: { palette: 'gold' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'sports',
    label: 'Deportes',
    emoji: '⚽',
    description: 'Torneos, competencias, eventos deportivos',
    tags: ['dinámico', 'energético', 'acción'],
    suggestedDesign: {
      cover: { style: 'stripe', variant: 'none' },
      typography: { preset: 'bold' },
      color: { palette: 'sea' },
      grid: { style: 'horizontal', thumb: 'regular', spacing: 'regular', nav: 'icons' },
      app: { density: 'compact', header: 'minimal' },
    },
  },
  {
    id: 'preschool',
    label: 'Preescolar',
    emoji: '🧒',
    description: 'Jardín de infantes, eventos infantiles',
    tags: ['alegre', 'colorido', 'divertido'],
    suggestedDesign: {
      cover: { style: 'joy', variant: 'album' },
      typography: { preset: 'sans' },
      color: { palette: 'rose' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'corporate',
    label: 'Corporativo',
    emoji: '🏢',
    description: 'Eventos empresariales, conferencias',
    tags: ['profesional', 'minimalista', 'serio'],
    suggestedDesign: {
      cover: { style: 'left', variant: 'outline' },
      typography: { preset: 'modern' },
      color: { palette: 'light' },
      grid: { style: 'horizontal', thumb: 'regular', spacing: 'regular', nav: 'icons' },
      app: { density: 'balanced', header: 'minimal' },
    },
  },
  {
    id: 'artistic',
    label: 'Artístico',
    emoji: '🎨',
    description: 'Muestras de arte, teatro, música',
    tags: ['creativo', 'editorial', 'expresivo'],
    suggestedDesign: {
      cover: { style: 'novel', variant: 'journal' },
      typography: { preset: 'timeless' },
      color: { palette: 'sand' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'casual',
    label: 'Casual',
    emoji: '📸',
    description: 'Eventos generales, día a día escolar',
    tags: ['versátil', 'simple', 'neutro'],
    suggestedDesign: {
      cover: { style: 'center', variant: 'none' },
      typography: { preset: 'sans' },
      color: { palette: 'agave' },
      grid: { style: 'vertical', thumb: 'regular', spacing: 'regular', nav: 'icons_text' },
      app: { density: 'balanced', header: 'classic' },
    },
  },
];

// Template presets combining all design elements
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  design: StoreDesignSettings;
  tags: string[];
  isPopular?: boolean;
  isNew?: boolean;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'elegant-graduation',
    name: 'Elegante Graduación',
    description: 'Diseño formal con tipografía serif y tonos dorados',
    category: 'graduation',
    tags: ['formal', 'clásico', 'premium'],
    isPopular: true,
    design: {
      cover: { style: 'center', variant: 'classic' },
      typography: { preset: 'serif' },
      color: { palette: 'gold' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'modern-minimal',
    name: 'Moderno Minimal',
    description: 'Limpio y contemporáneo con mucho espacio',
    category: 'corporate',
    tags: ['minimalista', 'profesional', 'limpio'],
    isPopular: true,
    design: {
      cover: { style: 'left', variant: 'outline' },
      typography: { preset: 'modern' },
      color: { palette: 'light' },
      grid: { style: 'horizontal', thumb: 'regular', spacing: 'large', nav: 'icons' },
      app: { density: 'airy', header: 'minimal' },
    },
  },
  {
    id: 'playful-kids',
    name: 'Alegre Infantil',
    description: 'Colorido y divertido para los más pequeños',
    category: 'preschool',
    tags: ['colorido', 'alegre', 'infantil'],
    isNew: true,
    design: {
      cover: { style: 'joy', variant: 'album' },
      typography: { preset: 'sans' },
      color: { palette: 'rose' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'sports-energy',
    name: 'Energía Deportiva',
    description: 'Dinámico con contraste fuerte para acción',
    category: 'sports',
    tags: ['dinámico', 'bold', 'acción'],
    design: {
      cover: { style: 'stripe', variant: 'none' },
      typography: { preset: 'bold' },
      color: { palette: 'sea' },
      grid: { style: 'horizontal', thumb: 'regular', spacing: 'regular', nav: 'icons' },
      app: { density: 'compact', header: 'minimal' },
    },
  },
  {
    id: 'editorial-art',
    name: 'Editorial Artístico',
    description: 'Estilo revista con tipografía elegante',
    category: 'artistic',
    tags: ['editorial', 'artístico', 'sofisticado'],
    design: {
      cover: { style: 'novel', variant: 'journal' },
      typography: { preset: 'timeless' },
      color: { palette: 'sand' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'dark-premium',
    name: 'Noche Premium',
    description: 'Elegante modo oscuro para destacar fotos',
    category: 'graduation',
    tags: ['oscuro', 'premium', 'elegante'],
    isNew: true,
    design: {
      cover: { style: 'frame', variant: 'border' },
      typography: { preset: 'serif' },
      color: { palette: 'dark' },
      grid: { style: 'vertical', thumb: 'large', spacing: 'regular', nav: 'icons_text' },
      app: { density: 'balanced', header: 'classic' },
    },
  },
  {
    id: 'vintage-classic',
    name: 'Vintage Clásico',
    description: 'Estilo retro con bordes suaves',
    category: 'artistic',
    tags: ['vintage', 'retro', 'nostálgico'],
    design: {
      cover: { style: 'vintage', variant: 'stamp' },
      typography: { preset: 'serif' },
      color: { palette: 'terracotta' },
      grid: { style: 'vertical', thumb: 'regular', spacing: 'large', nav: 'icons_text' },
      app: { density: 'airy', header: 'classic' },
    },
  },
  {
    id: 'fresh-nature',
    name: 'Naturaleza Fresca',
    description: 'Tonos verdes y sensación orgánica',
    category: 'casual',
    tags: ['natural', 'fresco', 'orgánico'],
    design: {
      cover: { style: 'divider', variant: 'none' },
      typography: { preset: 'subtle' },
      color: { palette: 'olive' },
      grid: { style: 'vertical', thumb: 'regular', spacing: 'regular', nav: 'icons_text' },
      app: { density: 'balanced', header: 'classic' },
    },
  },
];

export function getTemplatesByCategory(category: EventCategory): TemplatePreset[] {
  return TEMPLATE_PRESETS.filter((t) => t.category === category);
}

export function getPopularTemplates(): TemplatePreset[] {
  return TEMPLATE_PRESETS.filter((t) => t.isPopular);
}

export function getNewTemplates(): TemplatePreset[] {
  return TEMPLATE_PRESETS.filter((t) => t.isNew);
}

export function getSuggestedDesign(category: EventCategory): StoreDesignSettings {
  const config = EVENT_CATEGORIES.find((c) => c.id === category);
  return config?.suggestedDesign ?? DEFAULT_STORE_DESIGN;
}
