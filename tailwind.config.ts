import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	screens: {
  		xs: '475px',
  		sm: '640px',
  		md: '768px',
  		lg: '1024px',
  		xl: '1280px',
  		'2xl': '1536px',
  		mobile: {
  			max: '767px'
  		},
  		tablet: {
  			min: '768px',
  			max: '1023px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter Variable',
  				'Inter',
                    ...fontFamily.sans
                ],
  			mono: [
  				'JetBrains Mono Variable',
  				'JetBrains Mono',
                    ...fontFamily.mono
                ]
  		},
  		fontSize: {
  			xs: [
  				'0.75rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0.025em'
  				}
  			],
  			sm: [
  				'0.875rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0.01em'
  				}
  			],
  			base: [
  				'1rem',
  				{
  					lineHeight: '1.6',
  					letterSpacing: '0em'
  				}
  			],
  			lg: [
  				'1.125rem',
  				{
  					lineHeight: '1.6',
  					letterSpacing: '-0.01em'
  				}
  			],
  			xl: [
  				'1.25rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '-0.01em'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '1.4',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '1.3',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '1.2',
  					letterSpacing: '-0.03em'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1.1',
  					letterSpacing: '-0.03em'
  				}
  			],
  			'6xl': [
  				'3.75rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.04em'
  				}
  			],
  			'7xl': [
  				'4.5rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.04em'
  				}
  			],
  			'8xl': [
  				'6rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.05em'
  				}
  			],
  			'9xl': [
  				'8rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.05em'
  				}
  			]
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700',
  			extrabold: '800',
  			black: '900'
  		},
  		spacing: {
  			'safe-top': 'env(safe-area-inset-top)',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  			'safe-left': 'env(safe-area-inset-left)',
  			'safe-right': 'env(safe-area-inset-right)'
  		},
  		colors: {
  			primary: {
  				'50': '#f0f4ff',
  				'100': '#e0e9ff',
  				'200': '#c7d6ff',
  				'300': '#a3b8ff',
  				'400': '#7c91ff',
  				'500': '#5b6fff',
  				'600': '#4c5bdb',
  				'700': '#3d47b7',
  				'800': '#2f3693',
  				'900': '#1f2470',
  				'950': '#141852'
  			},
  			secondary: {
  				'50': '#faf7ff',
  				'100': '#f4edff',
  				'200': '#ead7ff',
  				'300': '#dbb5ff',
  				'400': '#c588ff',
  				'500': '#ab5aff',
  				'600': '#9333ea',
  				'700': '#7c2dd6',
  				'800': '#6822b3',
  				'900': '#54188f',
  				'950': '#3d0f69'
  			},
  			accent: {
  				'50': '#fffef7',
  				'100': '#fffbeb',
  				'200': '#fef3c7',
  				'300': '#fde68a',
  				'400': '#facc15',
  				'500': '#eab308',
  				'600': '#ca8a04',
  				'700': '#a16207',
  				'800': '#854d0e',
  				'900': '#713f12',
  				'950': '#422006'
  			},
  			success: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d'
  			},
  			warning: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f'
  			},
  			error: {
  				'50': '#fef2f2',
  				'100': '#fee2e2',
  				'200': '#fecaca',
  				'300': '#fca5a5',
  				'400': '#f87171',
  				'500': '#ef4444',
  				'600': '#dc2626',
  				'700': '#b91c1c',
  				'800': '#991b1b',
  				'900': '#7f1d1d'
  			},
  			neutral: {
  				'50': '#fafafa',
  				'100': '#f5f5f5',
  				'200': '#e5e5e5',
  				'300': '#d4d4d4',
  				'400': '#a3a3a3',
  				'500': '#737373',
  				'600': '#525252',
  				'700': '#404040',
  				'800': '#262626',
  				'900': '#171717',
  				'950': '#0a0a0a'
  			},
  			glass: {
  				white: 'rgba(255, 255, 255, 0.1)',
  				'white-strong': 'rgba(255, 255, 255, 0.15)',
  				dark: 'rgba(0, 0, 0, 0.1)',
  				'dark-strong': 'rgba(0, 0, 0, 0.2)',
  				border: 'rgba(255, 255, 255, 0.2)',
  				'border-dark': 'rgba(255, 255, 255, 0.1)'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				variant: 'hsl(var(--surface-variant))'
  			},
  			subtle: {
  				DEFAULT: 'hsl(var(--subtle))',
  				foreground: 'hsl(var(--subtle-foreground))'
  			}
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'gradient-glass': 'linear-gradient(145deg, var(--glass-strong), var(--glass))',
  			'gradient-glass-hover': 'linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
  			'gradient-mesh': 'radial-gradient(ellipse 800px 600px at 20% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(ellipse 600px 800px at 80% 20%, hsl(var(--secondary) / 0.12) 0%, transparent 50%)',
  			'gradient-hero': 'linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--secondary) / 0.8) 50%, hsl(var(--accent) / 0.7) 100%)',
  			noise: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 256 256\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.9\\" numOctaves=\\"1\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\" opacity=\\"0.02\\"/%3E%3C/svg%3E\\")'
  		},
  		backdropBlur: {
  			xs: '2px',
  			sm: '4px',
  			md: '12px',
  			lg: '24px',
  			xl: '40px'
  		},
  		boxShadow: {
  			glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
  			'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.6)',
  			soft: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  			medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  			large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  			glow: '0 0 20px hsl(var(--primary) / 0.3)',
  			'glow-strong': '0 0 40px hsl(var(--primary) / 0.4)'
  		},
  		borderRadius: {
  			none: '0px',
  			xs: '0.25rem',
  			sm: '0.375rem',
  			DEFAULT: '0.5rem',
  			md: '0.75rem',
  			lg: '1rem',
  			xl: '1.25rem',
  			'2xl': '1.5rem',
  			'3xl': '2rem',
  			full: '9999px'
  		},
  		animation: {
  			float: 'float 6s ease-in-out infinite',
  			'float-delayed': 'float 6s ease-in-out infinite',
  			shimmer: 'shimmer 2s linear infinite',
  			glow: 'glow 3s ease-in-out infinite alternate',
  			'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
  			'slide-up': 'slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
  			'scale-in': 'scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
  			skeleton: 'skeleton 1.5s infinite',
  			'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'spin-slow': 'spin 3s linear infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
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
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			glow: {
  				'0%': {
  					boxShadow: '0 0 20px hsl(var(--primary) / 0.2)'
  				},
  				'100%': {
  					boxShadow: '0 0 40px hsl(var(--primary) / 0.4)'
  				}
  			},
  			fadeIn: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideUp: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(40px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			scaleIn: {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.8)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			skeleton: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		aspectRatio: {
  			square: '1',
  			photo: '4/3',
  			video: '16/9',
  			portrait: '3/4'
  		}
  	}
  },
  plugins: [],
}
export default config