/**
 * Gallery Theme System
 *
 * Provides different visual themes and motifs for different school levels:
 * - Kindergarten: Playful, colorful, animal motifs
 * - Primary: Bright colors, simple icons, friendly design
 * - Secondary: Modern, sophisticated, clean design
 */

export type EventTheme = 'default' | 'jardin' | 'secundaria' | 'bautismo' | 'lumina';

export interface GalleryTheme {
  id: EventTheme;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    cardBackground: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  icons: {
    favorite: string;
    selected: string;
    gallery: string;
    package: string;
  };
  patterns: {
    headerPattern: string;
    cardPattern: string;
  };
  animations: {
    cardHover: string;
    buttonHover: string;
  };
  spacing: {
    cardGap: string;
    containerPadding: string;
  };
}

export const GALLERY_THEMES: Record<EventTheme, GalleryTheme> = {
  lumina: {
    id: 'lumina',
    name: 'Lumina Premium',
    colors: {
      primary: '#2d2a26',
      secondary: '#6b5b73',
      accent: '#d4af37',
      background: 'linear-gradient(180deg, #fdfcfb 0%, #fff 100%)',
      cardBackground: '#ffffff',
      textPrimary: '#2d2a26',
      textSecondary: '#6b5b73',
      border: '#e8e6e3',
    },
    fonts: {
      heading: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      body: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    },
    icons: {
      favorite: '♥',
      selected: '✓',
      gallery: '◌',
      package: '◆',
    },
    patterns: {
      headerPattern:
        'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(107,91,115,0.04) 50%, transparent 100%)',
      cardPattern:
        'linear-gradient(135deg, transparent 40%, rgba(212,175,55,0.04) 50%, transparent 60%)',
    },
    animations: {
      cardHover:
        'transform: translateY(-2px); box-shadow: 0 10px 32px rgba(45,42,38,0.08), 0 4px 12px rgba(212,175,55,0.10);',
      buttonHover:
        'transform: translateY(-1px); background: #1f1d1a;',
    },
    spacing: {
      cardGap: '1.25rem',
      containerPadding: '1.25rem',
    },
  },
  default: {
    id: 'default',
    name: 'Tema Predeterminado',
    colors: {
      primary: '#7C3AED', // Violet - similar a landing page
      secondary: '#EC4899', // Pink - acento vibrante
      accent: '#F59E0B', // Amber - detalles cálidos
      background: 'linear-gradient(135deg, #FAFAFA 0%, #F8FAFC 100%)',
      cardBackground: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
    },
    fonts: {
      heading: "'Inter', 'system-ui', sans-serif",
      body: "'Inter', 'system-ui', sans-serif",
    },
    icons: {
      favorite: '♡',
      selected: '✓',
      gallery: '✦',
      package: '◇',
    },
    patterns: {
      headerPattern:
        'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%237C3AED" fill-opacity="0.05"%3E%3Ccircle cx="20" cy="20" r="3"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern:
        'linear-gradient(135deg, transparent 40%, rgba(124,58,237,0.03) 50%, transparent 60%)',
    },
    animations: {
      cardHover:
        'transform: translateY(-2px); box-shadow: 0 8px 16px rgba(124,58,237,0.1);',
      buttonHover:
        'transform: translateY(-1px); background: linear-gradient(135deg, #7C3AED, #EC4899);',
    },
    spacing: {
      cardGap: '1.25rem',
      containerPadding: '1.5rem',
    },
  },

  jardin: {
    id: 'jardin',
    name: 'Jardín de Infantes',
    colors: {
      primary: '#FF6B9D', // Pink
      secondary: '#4ECDC4', // Turquoise
      accent: '#FFE66D', // Yellow
      background: 'linear-gradient(135deg, #FFF8E7 0%, #FFE8F0 100%)',
      cardBackground: '#FFFFFF',
      textPrimary: '#2D3748',
      textSecondary: '#718096',
      border: '#E2E8F0',
    },
    fonts: {
      heading: "'Comic Neue', 'Nunito', sans-serif",
      body: "'Nunito', sans-serif",
    },
    icons: {
      favorite: '🌟',
      selected: '✨',
      gallery: '🎨',
      package: '🎁',
    },
    patterns: {
      headerPattern:
        'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFE66D" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern:
        'linear-gradient(45deg, transparent 30%, rgba(255,230,109,0.1) 50%, transparent 70%)',
    },
    animations: {
      cardHover:
        'transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(255,107,157,0.2);',
      buttonHover:
        'transform: scale(1.05); background: linear-gradient(135deg, #FF6B9D, #4ECDC4);',
    },
    spacing: {
      cardGap: '1.5rem',
      containerPadding: '1.5rem',
    },
  },

  secundaria: {
    id: 'secundaria',
    name: 'Escuela Secundaria',
    colors: {
      primary: '#6366F1', // Indigo
      secondary: '#8B5CF6', // Purple
      accent: '#06B6D4', // Cyan
      background: 'linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)',
      cardBackground: '#FFFFFF',
      textPrimary: '#09090B',
      textSecondary: '#52525B',
      border: '#E4E4E7',
    },
    fonts: {
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
    },
    icons: {
      favorite: '♥',
      selected: '✓',
      gallery: '◉',
      package: '□',
    },
    patterns: {
      headerPattern:
        'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%236366F1" fill-opacity="0.08"%3E%3Cpath d="M30 30h30v30H30z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern:
        'linear-gradient(135deg, transparent 40%, rgba(99,102,241,0.03) 50%, transparent 60%)',
    },
    animations: {
      cardHover:
        'transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.12);',
      buttonHover:
        'transform: scale(1.02); background: linear-gradient(135deg, #6366F1, #8B5CF6);',
    },
    spacing: {
      cardGap: '1rem',
      containerPadding: '1rem',
    },
  },

  bautismo: {
    id: 'bautismo',
    name: 'Bautismo',
    colors: {
      primary: '#0EA5E9', // Sky blue
      secondary: '#F8FAFC', // Light gray
      accent: '#FBBF24', // Amber
      background: 'linear-gradient(135deg, #F0F9FF 0%, #EFF6FF 100%)',
      cardBackground: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      border: '#CBD5E1',
    },
    fonts: {
      heading: "'Playfair Display', serif",
      body: "'Inter', sans-serif",
    },
    icons: {
      favorite: '♡',
      selected: '✓',
      gallery: '✦',
      package: '◇',
    },
    patterns: {
      headerPattern:
        'url("data:image/svg+xml,%3Csvg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%230EA5E9" fill-opacity="0.06"%3E%3Ccircle cx="25" cy="25" r="5"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern:
        'linear-gradient(135deg, transparent 35%, rgba(14,165,233,0.04) 50%, transparent 65%)',
    },
    animations: {
      cardHover:
        'transform: translateY(-3px); box-shadow: 0 10px 20px rgba(14,165,233,0.15);',
      buttonHover:
        'transform: translateY(-1px); background: linear-gradient(135deg, #0EA5E9, #FBBF24);',
    },
    spacing: {
      cardGap: '1.25rem',
      containerPadding: '1.5rem',
    },
  },
};

export class GalleryThemeService {
  /**
   * Get theme by event theme
   */
  static getTheme(theme: EventTheme): GalleryTheme {
    return GALLERY_THEMES[theme];
  }

  /**
   * Get all available themes for selection
   */
  static getAllThemes(): GalleryTheme[] {
    return Object.values(GALLERY_THEMES);
  }

  /**
   * Get theme options for admin selection
   */
  static getThemeOptions() {
    return [
      { value: 'default', label: 'Predeterminado' },
      { value: 'jardin', label: 'Jardín de Infantes' },
      { value: 'secundaria', label: 'Escuela Secundaria' },
      { value: 'bautismo', label: 'Bautismo' },
      { value: 'lumina', label: 'Lumina Premium' },
    ];
  }

  /**
   * Generate CSS custom properties for a theme
   */
  static generateCSSVars(theme: GalleryTheme): Record<string, string> {
    return {
      '--theme-primary': theme.colors.primary,
      '--theme-secondary': theme.colors.secondary,
      '--theme-accent': theme.colors.accent,
      '--theme-background': theme.colors.background,
      '--theme-card-bg': theme.colors.cardBackground,
      '--theme-text-primary': theme.colors.textPrimary,
      '--theme-text-secondary': theme.colors.textSecondary,
      '--theme-border': theme.colors.border,
      '--theme-font-heading': theme.fonts.heading,
      '--theme-font-body': theme.fonts.body,
      '--theme-card-gap': theme.spacing.cardGap,
      '--theme-container-padding': theme.spacing.containerPadding,
      '--theme-header-pattern': theme.patterns.headerPattern,
      '--theme-card-pattern': theme.patterns.cardPattern,
    };
  }

  /**
   * Create themed component styles
   */
  static getThemedStyles(theme: GalleryTheme) {
    return {
      container: {
        background: theme.colors.background,
        fontFamily: theme.fonts.body,
        color: theme.colors.textPrimary,
        padding: theme.spacing.containerPadding,
      },
      header: {
        background: theme.patterns.headerPattern,
        color: theme.colors.textPrimary,
        fontFamily: theme.fonts.heading,
      },
      card: {
        backgroundColor: theme.colors.cardBackground,
        border: `1px solid ${theme.colors.border}`,
        background: theme.patterns.cardPattern,
        transition: 'all 0.3s ease',
      },
      cardHover: theme.animations.cardHover,
      button: {
        backgroundColor: theme.colors.primary,
        color: '#ffffff',
        transition: 'all 0.2s ease',
      },
      buttonHover: theme.animations.buttonHover,
    };
  }
}

export default GalleryThemeService;
