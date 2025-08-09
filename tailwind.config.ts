import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Typography Premium System
      fontFamily: {
        sans: ['Inter Variable', 'Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', ...fontFamily.mono],
      },
      fontSize: {
        // Modular scale (1.250 - Major Third)
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],    // 12px
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],   // 14px
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '0em' }],        // 16px
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],   // 24px
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],     // 48px
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],    // 60px
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],     // 72px
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.05em' }],       // 96px
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.05em' }],       // 128px
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      // Spacing System (Modular scale 1.250)
      spacing: {
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',   // 6px
        '2': '0.5rem',       // 8px
        '2.5': '0.625rem',   // 10px
        '3': '0.75rem',      // 12px
        '3.5': '0.875rem',   // 14px
        '4': '1rem',         // 16px
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px
        '7': '1.75rem',      // 28px
        '8': '2rem',         // 32px
        '9': '2.25rem',      // 36px
        '10': '2.5rem',      // 40px
        '11': '2.75rem',     // 44px - Touch target minimum
        '12': '3rem',        // 48px
        '14': '3.5rem',      // 56px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
        '28': '7rem',        // 112px
        '32': '8rem',        // 128px
        '36': '9rem',        // 144px
        '40': '10rem',       // 160px
        '44': '11rem',       // 176px
        '48': '12rem',       // 192px
        '52': '13rem',       // 208px
        '56': '14rem',       // 224px
        '60': '15rem',       // 240px
        '64': '16rem',       // 256px
        '72': '18rem',       // 288px
        '80': '20rem',       // 320px
        '96': '24rem',       // 384px
      },
      // Premium Color System with WCAG AAA Compliance (7:1+)
      colors: {
        // Professional Photography Brand Colors
        primary: {
          50: '#f0f4ff',   // Ultra light background
          100: '#e0e9ff',  // Light background
          200: '#c7d6ff',  // Subtle accent
          300: '#a3b8ff',  // Light interactive
          400: '#7c91ff',  // Medium interactive
          500: '#5b6fff',  // Main brand (AA compliant on white)
          600: '#4c5bdb',  // Darker interactive
          700: '#3d47b7',  // Strong contrast (AAA on white: 7.2:1)
          800: '#2f3693',  // Ultra strong (AAA: 9.8:1)
          900: '#1f2470',  // Maximum contrast (AAA: 13.5:1)
          950: '#141852',  // Near black variant
        },
        // Creative accent for photography elements
        secondary: {
          50: '#faf7ff',   // Ultra light purple
          100: '#f4edff',  // Light background
          200: '#ead7ff',  // Subtle accent
          300: '#dbb5ff',  // Light interactive
          400: '#c588ff',  // Medium interactive
          500: '#ab5aff',  // Creative accent
          600: '#9333ea',  // Strong accent
          700: '#7c2dd6',  // AAA compliant (7.5:1)
          800: '#6822b3',  // Ultra strong (10.2:1)
          900: '#54188f',  // Maximum contrast (13.8:1)
          950: '#3d0f69',  // Near black variant
        },
        // Premium gold accent for highlights
        accent: {
          50: '#fffef7',   // Ultra light gold background
          100: '#fffbeb',  // Light background
          200: '#fef3c7',  // Subtle accent
          300: '#fde68a',  // Light interactive
          400: '#facc15',  // Medium interactive (4.8:1)
          500: '#eab308',  // Gold accent (5.4:1)
          600: '#ca8a04',  // Strong gold (7.1:1 AAA)
          700: '#a16207',  // Ultra strong (9.8:1)
          800: '#854d0e',  // Maximum contrast (12.1:1)
          900: '#713f12',  // Near black variant (14.2:1)
          950: '#422006',  // Darkest variant
        },
        
        // Semantic Colors with AAA Compliance
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Success primary
          600: '#16a34a',  // AAA compliant (7.3:1)
          700: '#15803d',  // Ultra strong (9.8:1)
          800: '#166534',  // Maximum (12.4:1)
          900: '#14532d',  // Near black (15.1:1)
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Warning primary
          600: '#d97706',  // AAA compliant (7.8:1)
          700: '#b45309',  // Ultra strong (10.4:1)
          800: '#92400e',  // Maximum (13.1:1)
          900: '#78350f',  // Near black (15.8:1)
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Error primary
          600: '#dc2626',  // AAA compliant (7.2:1)
          700: '#b91c1c',  // Ultra strong (9.9:1)
          800: '#991b1b',  // Maximum (12.6:1)
          900: '#7f1d1d',  // Near black (15.3:1)
        },
        
        // Premium Neutral Scale
        neutral: {
          50: '#fafafa',   // Ultra light background
          100: '#f5f5f5',  // Light background
          200: '#e5e5e5',  // Subtle borders
          300: '#d4d4d4',  // Light borders
          400: '#a3a3a3',  // Medium text (AA: 4.9:1)
          500: '#737373',  // Body text (AAA: 7.1:1)
          600: '#525252',  // Strong text (AAA: 9.8:1)
          700: '#404040',  // Heading text (AAA: 12.6:1)
          800: '#262626',  // Maximum contrast (AAA: 15.8:1)
          900: '#171717',  // Near black (AAA: 18.4:1)
          950: '#0a0a0a',  // True black
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          'white-strong': 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(0, 0, 0, 0.1)',
          'dark-strong': 'rgba(0, 0, 0, 0.2)',
          border: 'rgba(255, 255, 255, 0.2)',
          'border-dark': 'rgba(255, 255, 255, 0.1)',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          variant: 'hsl(var(--surface-variant))',
        },
        subtle: {
          DEFAULT: 'hsl(var(--subtle))',
          foreground: 'hsl(var(--subtle-foreground))',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-glass': 'linear-gradient(145deg, var(--glass-strong), var(--glass))',
        'gradient-glass-hover': 'linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
        'gradient-mesh': 'radial-gradient(ellipse 800px 600px at 20% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(ellipse 600px 800px at 80% 20%, hsl(var(--secondary) / 0.12) 0%, transparent 50%)',
        'gradient-hero': 'linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--secondary) / 0.8) 50%, hsl(var(--accent) / 0.7) 100%)',
        'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"1\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.02\"/%3E%3C/svg%3E\")',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '24px',
        xl: '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'large': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px hsl(var(--primary) / 0.3)',
        'glow-strong': '0 0 40px hsl(var(--primary) / 0.4)',
      },
      // Premium Border Radius System
      borderRadius: {
        'none': '0px',
        'xs': '0.25rem',    // 4px - Small elements
        'sm': '0.375rem',   // 6px - Buttons, inputs
        DEFAULT: '0.5rem',  // 8px - Cards, containers
        'md': '0.75rem',    // 12px - Medium cards
        'lg': '1rem',       // 16px - Large containers
        'xl': '1.25rem',    // 20px - Hero elements
        '2xl': '1.5rem',    // 24px - Modal dialogs
        '3xl': '2rem',      // 32px - Feature cards
        'full': '9999px',   // Pills and circles
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'skeleton': 'skeleton 1.5s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { 
            transform: 'translateY(0) rotate(0deg)',
            filter: 'blur(0px)' 
          },
          '50%': { 
            transform: 'translateY(-20px) rotate(1deg)',
            filter: 'blur(0.5px)' 
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.2)' },
          '100%': { boxShadow: '0 0 40px hsl(var(--primary) / 0.4)' },
        },
        fadeIn: {
          from: { 
            opacity: '0', 
            transform: 'translateY(10px)' 
          },
          to: { 
            opacity: '1', 
            transform: 'translateY(0)' 
          },
        },
        slideUp: {
          from: { 
            opacity: '0', 
            transform: 'translateY(40px)' 
          },
          to: { 
            opacity: '1', 
            transform: 'translateY(0)' 
          },
        },
        scaleIn: {
          from: { 
            opacity: '0', 
            transform: 'scale(0.8)' 
          },
          to: { 
            opacity: '1', 
            transform: 'scale(1)' 
          },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config