export type ThemeMode = 'light' | 'dark';

export interface TypographyTokens {
  primaryClass: string;
  mutedClass: string;
  mutedSoftClass: string;
  mutedUpperClass: string;
  accentClass: string;
  badgeBgClass: string;
  badgeBorderClass: string;
  chipActiveBgClass: string;
  chipActiveTextClass: string;
  chipActiveBorderClass: string;
  chipInactiveBgClass: string;
  chipInactiveTextClass: string;
  chipInactiveBorderClass: string;
}

export interface ThemeTokens {
  background: string;
  glassBorder: string;
  glassHighlight: string;
  glassBackground: string;
  glassShadow: string;
  glassTint: string;
  glassHalo: string;
  typography: TypographyTokens;
}

export type GlassAccent = 'warm' | 'neutral' | 'cool';

export interface GlassSurfaceTokens {
  border: string;
  highlight: string;
  background: string;
  shadow: string;
  tint: string;
  halo: string;
}

type SecondaryGlassAccent = Exclude<GlassAccent, 'warm'>;

const SECONDARY_GLASS_TOKENS: Record<SecondaryGlassAccent, Record<ThemeMode, GlassSurfaceTokens>> = {
  neutral: {
    light: {
      border: 'rgba(255,255,255,0.55)',
      highlight:
        'linear-gradient(120deg, rgba(255,255,255,0.9) 0%, rgba(235,239,245,0.42) 55%, rgba(208,214,226,0.25) 100%)',
      background:
        'linear-gradient(160deg, rgba(247,249,252,0.7) 0%, rgba(234,238,245,0.36) 55%, rgba(219,227,242,0.28) 100%)',
      shadow: '0 48px 120px -46px rgba(41, 52, 68, 0.5)',
      tint: 'rgba(248, 250, 254, 0.6)',
      halo: 'rgba(25, 39, 53, 0.18)',
    },
    dark: {
      border: 'rgba(214,224,240,0.28)',
      highlight:
        'linear-gradient(120deg, rgba(214,224,240,0.32) 0%, rgba(158,178,210,0.28) 48%, rgba(116,132,162,0.18) 100%)',
      background:
        'linear-gradient(160deg, rgba(47,57,74,0.58) 0%, rgba(39,48,63,0.45) 55%, rgba(26,33,45,0.38) 100%)',
      shadow: '0 52px 130px -54px rgba(0, 0, 0, 0.68)',
      tint: 'rgba(204,214,232,0.12)',
      halo: 'rgba(6, 12, 24, 0.48)',
    },
  },
  cool: {
    light: {
      border: 'rgba(194,220,255,0.65)',
      highlight:
        'linear-gradient(120deg, rgba(244,251,255,0.9) 0%, rgba(202,223,255,0.48) 50%, rgba(158,196,255,0.3) 100%)',
      background:
        'linear-gradient(160deg, rgba(237,245,255,0.7) 0%, rgba(210,228,255,0.38) 55%, rgba(178,208,255,0.28) 100%)',
      shadow: '0 52px 130px -48px rgba(21, 46, 88, 0.55)',
      tint: 'rgba(233, 241, 255, 0.58)',
      halo: 'rgba(10, 32, 70, 0.22)',
    },
    dark: {
      border: 'rgba(172,198,235,0.32)',
      highlight:
        'linear-gradient(120deg, rgba(198,214,241,0.35) 0%, rgba(142,170,217,0.28) 52%, rgba(98,130,191,0.18) 100%)',
      background:
        'linear-gradient(160deg, rgba(36,52,82,0.6) 0%, rgba(26,41,70,0.45) 55%, rgba(18,32,58,0.38) 100%)',
      shadow: '0 52px 130px -54px rgba(0, 0, 0, 0.7)',
      tint: 'rgba(164,188,225,0.12)',
      halo: 'rgba(8, 20, 46, 0.52)',
    },
  },
};

export interface ButtonTokens {
  textColor: string;
  background: string;
  borderColor: string;
  shadow: string;
  hoverShadow?: string;
  halo: string;
  highlight: string;
  hoverBackground?: string;
  hoverTextColor?: string;
}

export type ButtonVariant = 'primary' | 'ghost';

const BUTTON_TOKENS: Record<ButtonVariant, Record<ThemeMode, ButtonTokens>> = {
  primary: {
    light: {
      textColor: 'rgba(255,255,255,0.98)',
      background: 'linear-gradient(140deg, rgba(246,141,91,0.85), rgba(190,103,60,0.82))',
      hoverBackground: 'linear-gradient(140deg, rgba(246,141,91,0.92), rgba(190,103,60,0.88))',
      borderColor: 'rgba(255,255,255,0.45)',
      shadow: '0 18px 35px -22px rgba(52, 27, 9, 0.65)',
      hoverShadow: '0 24px 45px -24px rgba(52, 27, 9, 0.75)',
      halo: 'rgba(97, 44, 18, 0.35)',
      highlight:
        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0) 80%)',
    },
    dark: {
      textColor: 'rgba(255,220,199,0.96)',
      background: 'linear-gradient(140deg, rgba(181,78,43,0.82), rgba(132,62,33,0.78))',
      hoverBackground: 'linear-gradient(140deg, rgba(181,78,43,0.9), rgba(132,62,33,0.84))',
      borderColor: 'rgba(255,255,255,0.24)',
      shadow: '0 18px 35px -22px rgba(0, 0, 0, 0.7)',
      hoverShadow: '0 24px 45px -26px rgba(0, 0, 0, 0.75)',
      halo: 'rgba(75, 32, 14, 0.48)',
      highlight:
        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 80%)',
    },
  },
  ghost: {
    light: {
      textColor: 'rgba(47,33,22,0.7)',
      hoverTextColor: 'rgba(47,33,22,0.85)',
      background: 'rgba(255,255,255,0.3)',
      hoverBackground: 'rgba(255,255,255,0.45)',
      borderColor: 'rgba(255,255,255,0.35)',
      shadow: '0 12px 30px -26px rgba(49, 23, 5, 0.55)',
      hoverShadow: '0 16px 36px -26px rgba(67, 34, 15, 0.45)',
      halo: 'rgba(70, 38, 19, 0.18)',
      highlight:
        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 80%)',
    },
    dark: {
      textColor: 'rgba(244,228,214,0.78)',
      hoverTextColor: 'rgba(254,244,233,0.92)',
      background: 'rgba(255,255,255,0.12)',
      hoverBackground: 'rgba(255,255,255,0.18)',
      borderColor: 'rgba(255,255,255,0.24)',
      shadow: '0 12px 30px -24px rgba(0, 0, 0, 0.6)',
      hoverShadow: '0 16px 36px -24px rgba(0, 0, 0, 0.64)',
      halo: 'rgba(0, 0, 0, 0.45)',
      highlight:
        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0) 80%)',
    },
  },
};

export const LOOK_ESCOLAR_THEME_TOKENS: Record<ThemeMode, ThemeTokens> = {
  light: {
    background: 'linear-gradient(180deg, #F8E7D0 0%, #E9C6A2 45%, #C4926A 100%)',
    glassBorder: 'rgba(255, 238, 225, 0.65)',
    glassHighlight:
      'linear-gradient(120deg, rgba(255,255,255,0.85) 0%, rgba(255,219,188,0.42) 45%, rgba(231,173,137,0.3) 100%)',
    glassBackground:
      'linear-gradient(155deg, rgba(255,248,240,0.72) 0%, rgba(255,245,233,0.38) 55%, rgba(245,223,195,0.32) 100%)',
    glassShadow: '0 52px 130px -48px rgba(80, 38, 15, 0.55)',
    glassTint: 'rgba(255, 246, 235, 0.58)',
    glassHalo: 'rgba(72, 32, 12, 0.22)',
    typography: {
      primaryClass: 'text-[#2F2116]',
      mutedClass: 'text-[rgba(47,33,22,0.7)]',
      mutedSoftClass: 'text-[rgba(47,33,22,0.6)]',
      mutedUpperClass: 'text-[rgba(47,33,22,0.62)]',
      accentClass: 'text-[rgba(242,143,93,0.9)]',
      badgeBgClass: 'bg-[rgba(242,143,93,0.12)]',
      badgeBorderClass: 'border-[rgba(242,143,93,0.4)]',
      chipActiveBgClass: 'bg-[rgba(242,143,93,0.2)]',
      chipActiveTextClass: 'text-[rgba(42,30,20,0.95)]',
      chipActiveBorderClass: 'border-[rgba(242,143,93,0.45)]',
      chipInactiveBgClass: 'bg-[rgba(255,255,255,0.3)]',
      chipInactiveTextClass: 'text-[rgba(47,33,22,0.7)]',
      chipInactiveBorderClass: 'border-white/45',
    },
  },
  dark: {
    background: 'radial-gradient(135% 140% at 10% 5%, #1A1411 0%, #1F1714 35%, #14131B 70%, #0B0C13 100%)',
    glassBorder: 'rgba(255,255,255,0.2)',
    glassHighlight:
      'linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(188,138,110,0.18) 45%, rgba(134,98,74,0.12) 100%)',
    glassBackground:
      'linear-gradient(155deg, rgba(61,48,41,0.58) 0%, rgba(49,37,32,0.38) 55%, rgba(34,27,24,0.32) 100%)',
    glassShadow: '0 52px 130px -48px rgba(0, 0, 0, 0.55)',
    glassTint: 'rgba(255, 240, 228, 0.08)',
    glassHalo: 'rgba(0, 0, 0, 0.45)',
    typography: {
      primaryClass: 'text-[rgba(245,237,226,0.98)]',
      mutedClass: 'text-[rgba(244,228,214,0.78)]',
      mutedSoftClass: 'text-[rgba(239,222,207,0.72)]',
      mutedUpperClass: 'text-[rgba(242,225,208,0.72)]',
      accentClass: 'text-[rgba(255,210,185,0.92)]',
      badgeBgClass: 'bg-[rgba(181,78,43,0.32)]',
      badgeBorderClass: 'border-[rgba(217,126,80,0.55)]',
      chipActiveBgClass: 'bg-[rgba(181,78,43,0.42)]',
      chipActiveTextClass: 'text-[rgba(255,220,199,0.95)]',
      chipActiveBorderClass: 'border-[rgba(217,126,80,0.6)]',
      chipInactiveBgClass: 'bg-[rgba(255,255,255,0.12)]',
      chipInactiveTextClass: 'text-[rgba(244,228,214,0.78)]',
      chipInactiveBorderClass: 'border-[rgba(255,255,255,0.18)]',
    },
  },
};

export function getGlassTokens(accent: GlassAccent, mode: ThemeMode): GlassSurfaceTokens {
  if (accent === 'warm') {
    const theme = LOOK_ESCOLAR_THEME_TOKENS[mode];
    const { glassBorder, glassHighlight, glassBackground, glassShadow, glassTint, glassHalo } = theme;
    return {
      border: glassBorder,
      highlight: glassHighlight,
      background: glassBackground,
      shadow: glassShadow,
      tint: glassTint,
      halo: glassHalo,
    };
  }

  return SECONDARY_GLASS_TOKENS[accent][mode];
}

export function getButtonTokens(variant: ButtonVariant, mode: ThemeMode): ButtonTokens {
  return BUTTON_TOKENS[variant][mode];
}

export function getSwatchTextClasses(value: string, mode: ThemeMode) {
  const hex = value.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  const defaults = {
    titleClass: mode === 'dark' ? 'text-[rgba(254,244,233,0.9)]' : 'text-[rgba(47,33,22,0.85)]',
    tokenClass: mode === 'dark' ? 'text-[rgba(244,228,214,0.78)]' : 'text-[rgba(47,33,22,0.62)]',
    ringClass: mode === 'dark' ? 'border-white/25' : 'border-white/60',
  };

  if (!match) {
    return defaults;
  }

  const hexValue = match[1];
  const r = parseInt(hexValue.slice(0, 2), 16) / 255;
  const g = parseInt(hexValue.slice(2, 4), 16) / 255;
  const b = parseInt(hexValue.slice(4, 6), 16) / 255;
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

  if (brightness >= 0.75) {
    return {
      titleClass: 'text-[rgba(47,33,22,0.9)]',
      tokenClass: 'text-[rgba(47,33,22,0.62)]',
      ringClass: mode === 'dark' ? 'border-[rgba(255,255,255,0.3)]' : 'border-[rgba(47,33,22,0.18)]',
    };
  }

  if (brightness <= 0.35) {
    return {
      titleClass: 'text-white',
      tokenClass: 'text-white/80',
      ringClass: mode === 'dark' ? 'border-white/35' : 'border-white/55',
    };
  }

  return defaults;
}

export const THEME_TOKENS = LOOK_ESCOLAR_THEME_TOKENS;
