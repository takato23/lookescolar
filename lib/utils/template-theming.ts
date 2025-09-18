import { StoreSettings } from '@/lib/hooks/useStoreSettings';

/**
 * Utility functions for template theming and branding
 */

export interface TemplateTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  branding: {
    brandName: string;
    brandTagline: string;
    logoUrl: string;
    fontFamily: string;
  };
  layout: {
    mobileColumns: number;
    desktopColumns: number;
    galleryLayout: 'grid' | 'masonry' | 'list';
    headerStyle: 'default' | 'minimal' | 'bold';
    showPhotoNumbers: boolean;
    enableZoom: boolean;
    enableFullscreen: boolean;
  };
  customization: {
    customCss: string;
    welcomeMessage: string;
  };
}

/**
 * Extracts template theme from comprehensive store settings
 */
export function getTemplateTheme(settings: StoreSettings): TemplateTheme {
  return {
    colors: {
      primary: settings.custom_branding?.primary_color || settings.colors.primary,
      secondary: settings.custom_branding?.secondary_color || settings.colors.secondary,
      accent: settings.custom_branding?.accent_color || settings.colors.accent,
      background: settings.colors.background,
      surface: settings.colors.surface,
      text: settings.colors.text,
      textSecondary: settings.colors.text_secondary,
    },
    branding: {
      brandName: settings.custom_branding?.brand_name || 'LookEscolar',
      brandTagline: settings.custom_branding?.brand_tagline || 'Fotografía Escolar Profesional',
      logoUrl: settings.custom_branding?.logo_url || settings.logo_url || '',
      fontFamily: settings.custom_branding?.font_family || 'Inter, sans-serif',
    },
    layout: {
      mobileColumns: settings.theme_customization?.mobile_columns || 2,
      desktopColumns: settings.theme_customization?.desktop_columns || 4,
      galleryLayout: settings.theme_customization?.gallery_layout || 'grid',
      headerStyle: settings.theme_customization?.header_style || 'default',
      showPhotoNumbers: settings.theme_customization?.show_photo_numbers ?? true,
      enableZoom: settings.theme_customization?.enable_zoom ?? true,
      enableFullscreen: settings.theme_customization?.enable_fullscreen ?? true,
    },
    customization: {
      customCss: settings.custom_branding?.custom_css || settings.theme_customization?.custom_css || '',
      welcomeMessage: settings.welcome_message || '',
    },
  };
}

/**
 * Generates CSS custom properties for template theming
 */
export function getTemplateStyleProps(theme: TemplateTheme): React.CSSProperties {
  return {
    // Use the existing CSS variables for consistency with theme system
    '--template-primary': 'hsl(var(--primary))',
    '--template-secondary': 'hsl(var(--secondary))',
    '--template-accent': 'hsl(var(--accent))',
    '--template-background': 'hsl(var(--background))',
    '--template-surface': 'hsl(var(--card))',
    '--template-text': 'hsl(var(--foreground))',
    '--template-text-secondary': 'hsl(var(--muted-foreground))',
    fontFamily: theme.branding.fontFamily,
  } as React.CSSProperties;
}

/**
 * Gets template-specific class names based on template type and theme
 */
export function getTemplateClasses(
  template: StoreSettings['template'], 
  theme: TemplateTheme
): string {
  const baseClasses = 'min-h-screen transition-all duration-300';
  
  const templateClasses = {
    pixieset: 'bg-background text-foreground',
    editorial: 'bg-background text-foreground',
    minimal: 'bg-background text-foreground',
    'modern-minimal': 'bg-background text-foreground',
    'bold-vibrant': 'bg-background text-foreground',
    'premium-photography': 'bg-background text-foreground',
    'studio-dark': 'bg-background text-foreground',
    'classic-gallery': 'bg-background text-foreground',
    'fashion-editorial': 'bg-background text-foreground',
  };

  const headerClasses = {
    default: '',
    minimal: 'header-minimal',
    bold: 'header-bold',
  };

  return `${baseClasses} ${templateClasses[template] || templateClasses.pixieset} ${headerClasses[theme.layout.headerStyle]}`;
}

/**
 * Generates grid classes based on layout settings
 */
export function getPhotoGridClasses(theme: TemplateTheme): string {
  const { mobileColumns, desktopColumns, galleryLayout } = theme.layout;
  
  const mobileClass = `grid-cols-${mobileColumns}`;
  const desktopClass = `lg:grid-cols-${desktopColumns}`;
  
  const layoutClass = {
    grid: 'grid gap-4',
    masonry: 'masonry gap-4',
    list: 'flex flex-col gap-4',
  };

  return `${layoutClass[galleryLayout]} ${mobileClass} ${desktopClass}`;
}

/**
 * Gets product display configuration based on settings
 */
export function getProductDisplayConfig(settings: StoreSettings) {
  const highlightedProducts = ['carpetaA', 'carpetaB'];
  const activeProducts = Object.entries(settings.products)
    .filter(([_, product]) => product.enabled)
    .map(([id, product]) => ({ id, ...product }));

  const packages = activeProducts.filter(p => p.type === 'package' || highlightedProducts.includes(p.id));
  const extras = activeProducts.filter(p => p.type !== 'package' && !highlightedProducts.includes(p.id));

  return {
    packages,
    extras,
    activeProducts,
    showExtrasOnly: settings.features?.allowExtrasOnly && packages.length === 0,
  };
}

/**
 * Formats price according to currency settings
 */
export function formatPrice(price: number, currency: StoreSettings['currency']): string {
  const symbols = {
    ARS: '$',
    USD: '$',
    EUR: '€',
    BRL: 'R$',
    CLP: '$',
    PEN: 'S/',
    COP: '$',
    MXN: '$'
  };

  const symbol = symbols[currency] || '$';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price).replace(/^/, symbol);
}

/**
 * Gets SEO meta tags based on settings
 */
export function getSEOMetaTags(
  settings: StoreSettings, 
  eventName?: string,
  studentName?: string
): Record<string, string> {
  const seo = settings.seo_settings;
  const branding = settings.custom_branding;
  
  const replacements = {
    '{event_name}': eventName || 'Evento',
    '{student_name}': studentName || '',
    '{brand_name}': branding?.brand_name || 'LookEscolar',
  };

  const replaceTokens = (text: string) => {
    return Object.entries(replacements).reduce((acc, [token, value]) => {
      return acc.replace(new RegExp(token, 'g'), value);
    }, text);
  };

  return {
    title: replaceTokens(seo?.meta_title || 'Galería Fotográfica - {event_name}'),
    description: replaceTokens(seo?.meta_description || 'Encuentra y compra las mejores fotos escolares de {event_name}'),
    keywords: replaceTokens(seo?.meta_keywords || 'fotos escolares, fotografía, {event_name}'),
    'og:image': seo?.og_image || '',
    'og:title': replaceTokens(seo?.meta_title || 'Galería Fotográfica - {event_name}'),
    'og:description': replaceTokens(seo?.meta_description || 'Encuentra y compra las mejores fotos escolares de {event_name}'),
    canonical: seo?.canonical_url || '',
  };
}

/**
 * Checks if sharing is enabled and returns sharing configuration
 */
export function getSharingConfig(settings: StoreSettings) {
  const social = settings.social_settings;
  
  return {
    enabled: social?.enable_sharing ?? false,
    whatsappEnabled: social?.whatsapp_enabled ?? true,
    whatsappMessage: social?.whatsapp_message || '¡Mira estas increíbles fotos escolares!',
    facebookUrl: social?.facebook_url || '',
    instagramUrl: social?.instagram_url || '',
  };
}

/**
 * Gets download limits configuration for display
 */
export function getDownloadLimits(settings: StoreSettings) {
  const limits = settings.download_limits;
  
  if (!limits?.enabled) {
    return { enabled: false };
  }
  
  return {
    enabled: true,
    maxDownloadsPerPhoto: limits.max_downloads_per_photo || 3,
    maxDownloadsPerUser: limits.max_downloads_per_user || 10,
    expiryDays: limits.download_expiry_days || 30,
  };
}

/**
 * Applies watermark settings to photo URLs (for display purposes)
 */
export function applyWatermarkSettings(
  photoUrl: string, 
  settings: StoreSettings
): { url: string; hasWatermark: boolean } {
  const watermark = settings.watermark_settings;
  
  if (!watermark?.enabled) {
    return { url: photoUrl, hasWatermark: false };
  }
  
  // In a real implementation, this would modify the photo URL to include watermark parameters
  // For now, we just return the original URL with watermark info
  return { 
    url: photoUrl, 
    hasWatermark: true 
  };
}