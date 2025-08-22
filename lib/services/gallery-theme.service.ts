/**
 * Gallery Theme System
 * 
 * Provides different visual themes and motifs for different school levels:
 * - Kindergarten: Playful, colorful, animal motifs
 * - Primary: Bright colors, simple icons, friendly design
 * - Secondary: Modern, sophisticated, clean design
 */

export type SchoolLevel = 'kindergarten' | 'primary' | 'secondary';

export interface GalleryTheme {
  id: SchoolLevel;
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

export const GALLERY_THEMES: Record<SchoolLevel, GalleryTheme> = {
  kindergarten: {
    id: 'kindergarten',
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
      headerPattern: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFE66D" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern: 'linear-gradient(45deg, transparent 30%, rgba(255,230,109,0.1) 50%, transparent 70%)',
    },
    animations: {
      cardHover: 'transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(255,107,157,0.2);',
      buttonHover: 'transform: scale(1.05); background: linear-gradient(135deg, #FF6B9D, #4ECDC4);',
    },
    spacing: {
      cardGap: '1.5rem',
      containerPadding: '1.5rem',
    },
  },
  
  primary: {
    id: 'primary',
    name: 'Escuela Primaria',
    colors: {
      primary: '#3B82F6', // Blue
      secondary: '#10B981', // Green
      accent: '#F59E0B', // Orange
      background: 'linear-gradient(135deg, #F0F9FF 0%, #F0FDF4 100%)',
      cardBackground: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      border: '#D1D5DB',
    },
    fonts: {
      heading: "'Poppins', sans-serif",
      body: "'Inter', sans-serif",
    },
    icons: {
      favorite: '⭐',
      selected: '✅',
      gallery: '📸',
      package: '📦',
    },
    patterns: {
      headerPattern: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%233B82F6" fill-opacity="0.1"%3E%3Cpath d="M20 20l10-10v20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern: 'linear-gradient(135deg, transparent 30%, rgba(59,130,246,0.05) 50%, transparent 70%)',
    },
    animations: {
      cardHover: 'transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59,130,246,0.15);',
      buttonHover: 'transform: translateY(-1px); background: linear-gradient(135deg, #3B82F6, #10B981);',
    },
    spacing: {
      cardGap: '1.25rem',
      containerPadding: '1.25rem',
    },
  },
  
  secondary: {
    id: 'secondary',
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
      headerPattern: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%236366F1" fill-opacity="0.08"%3E%3Cpath d="M30 30h30v30H30z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      cardPattern: 'linear-gradient(135deg, transparent 40%, rgba(99,102,241,0.03) 50%, transparent 60%)',
    },
    animations: {
      cardHover: 'transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.12);',
      buttonHover: 'transform: scale(1.02); background: linear-gradient(135deg, #6366F1, #8B5CF6);',
    },
    spacing: {
      cardGap: '1rem',
      containerPadding: '1rem',
    },
  },
};

export class GalleryThemeService {
  /**
   * Get theme by school level
   */
  static getTheme(level: SchoolLevel): GalleryTheme {
    return GALLERY_THEMES[level];
  }

  /**
   * Detect school level from event or subject data
   */
  static detectSchoolLevel(eventName?: string, gradeSection?: string): SchoolLevel {
    if (!eventName && !gradeSection) return 'primary'; // Default

    const text = `${eventName || ''} ${gradeSection || ''}`.toLowerCase();
    
    // Kindergarten patterns
    if (text.includes('jardín') || text.includes('jardin') || 
        text.includes('sala') || text.includes('inicial') ||
        text.includes('kindergarten') || text.includes('preescolar')) {
      return 'kindergarten';
    }
    
    // Secondary patterns
    if (text.includes('secundaria') || text.includes('secundario') ||
        text.includes('bachillerato') || text.includes('preparatoria') ||
        text.includes('1°') || text.includes('2°') || text.includes('3°') ||
        text.includes('4°') || text.includes('5°') || text.includes('6°') ||
        text.includes('año') || text.includes('high school')) {
      return 'secondary';
    }
    
    // Primary as default
    return 'primary';
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