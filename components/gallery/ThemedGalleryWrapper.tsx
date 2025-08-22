'use client';

import { ReactNode, useEffect, useState } from 'react';
import { GalleryThemeService, SchoolLevel, GalleryTheme } from '@/lib/services/gallery-theme.service';

interface ThemedGalleryWrapperProps {
  children: ReactNode;
  schoolLevel?: SchoolLevel;
  eventName?: string;
  gradeSection?: string;
  className?: string;
}

export function ThemedGalleryWrapper({
  children,
  schoolLevel,
  eventName,
  gradeSection,
  className = '',
}: ThemedGalleryWrapperProps) {
  const [theme, setTheme] = useState<GalleryTheme | null>(null);

  useEffect(() => {
    // Determine school level and load theme
    const level = schoolLevel || GalleryThemeService.detectSchoolLevel(eventName, gradeSection);
    const selectedTheme = GalleryThemeService.getTheme(level);
    setTheme(selectedTheme);

    // Apply CSS custom properties to document root
    const cssVars = GalleryThemeService.generateCSSVars(selectedTheme);
    const root = document.documentElement;
    
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Cleanup function to remove custom properties
    return () => {
      Object.keys(cssVars).forEach(property => {
        root.style.removeProperty(property);
      });
    };
  }, [schoolLevel, eventName, gradeSection]);

  if (!theme) {
    return <div className="animate-pulse bg-gray-100 min-h-screen" />;
  }

  const themedStyles = GalleryThemeService.getThemedStyles(theme);

  return (
    <div 
      className={`themed-gallery-wrapper min-h-screen transition-all duration-500 ${className}`}
      style={themedStyles.container}
    >
      {/* Theme Header */}
      <div 
        className="themed-header p-6 mb-6 rounded-lg"
        style={themedStyles.header}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl" role="img" aria-label="Gallery">
            {theme.icons.gallery}
          </span>
          <h1 className="text-xl font-semibold">
            Galería de Fotos - {theme.name}
          </h1>
        </div>
        <p style={{ color: theme.colors.textSecondary }} className="text-sm">
          Diseño especial para {theme.name.toLowerCase()}
        </p>
      </div>

      {/* Themed Content */}
      <div className="themed-content">
        {children}
      </div>

      {/* Theme-specific CSS styles */}
      <style jsx>{`
        .themed-gallery-wrapper :global(.photo-card) {
          background-color: ${theme.colors.cardBackground};
          border: 1px solid ${theme.colors.border};
          background-image: ${theme.patterns.cardPattern};
          transition: all 0.3s ease;
          border-radius: ${theme.id === 'kindergarten' ? '12px' : theme.id === 'primary' ? '8px' : '6px'};
        }

        .themed-gallery-wrapper :global(.photo-card:hover) {
          ${theme.animations.cardHover}
        }

        .themed-gallery-wrapper :global(.photo-grid) {
          gap: ${theme.spacing.cardGap};
        }

        .themed-gallery-wrapper :global(.theme-button) {
          background-color: ${theme.colors.primary};
          color: white;
          font-family: ${theme.fonts.body};
          transition: all 0.2s ease;
          border-radius: ${theme.id === 'kindergarten' ? '20px' : theme.id === 'primary' ? '8px' : '4px'};
          padding: ${theme.id === 'kindergarten' ? '12px 20px' : '10px 16px'};
          font-size: ${theme.id === 'kindergarten' ? '16px' : '14px'};
          font-weight: ${theme.id === 'kindergarten' ? '600' : '500'};
        }

        .themed-gallery-wrapper :global(.theme-button:hover) {
          ${theme.animations.buttonHover}
        }

        .themed-gallery-wrapper :global(.favorite-icon) {
          font-family: ${theme.fonts.body};
        }

        .themed-gallery-wrapper :global(.favorite-icon::before) {
          content: '${theme.icons.favorite}';
        }

        .themed-gallery-wrapper :global(.selected-icon::before) {
          content: '${theme.icons.selected}';
        }

        .themed-gallery-wrapper :global(.package-icon::before) {
          content: '${theme.icons.package}';
        }

        .themed-gallery-wrapper :global(h1, h2, h3, h4, h5, h6) {
          font-family: ${theme.fonts.heading};
          color: ${theme.colors.textPrimary};
        }

        .themed-gallery-wrapper :global(p, span, div) {
          font-family: ${theme.fonts.body};
        }

        .themed-gallery-wrapper :global(.text-secondary) {
          color: ${theme.colors.textSecondary};
        }

        .themed-gallery-wrapper :global(.theme-accent) {
          color: ${theme.colors.accent};
        }

        .themed-gallery-wrapper :global(.theme-border) {
          border-color: ${theme.colors.border};
        }

        /* Kindergarten specific styles */
        ${theme.id === 'kindergarten' ? `
          .themed-gallery-wrapper :global(.photo-card) {
            box-shadow: 0 2px 8px rgba(255,107,157,0.1);
          }
          .themed-gallery-wrapper :global(.photo-card:hover) {
            box-shadow: 0 8px 20px rgba(255,107,157,0.2);
          }
        ` : ''}

        /* Primary specific styles */
        ${theme.id === 'primary' ? `
          .themed-gallery-wrapper :global(.photo-card) {
            box-shadow: 0 1px 6px rgba(59,130,246,0.1);
          }
          .themed-gallery-wrapper :global(.photo-card:hover) {
            box-shadow: 0 4px 16px rgba(59,130,246,0.15);
          }
        ` : ''}

        /* Secondary specific styles */
        ${theme.id === 'secondary' ? `
          .themed-gallery-wrapper :global(.photo-card) {
            box-shadow: 0 1px 3px rgba(99,102,241,0.1);
          }
          .themed-gallery-wrapper :global(.photo-card:hover) {
            box-shadow: 0 2px 12px rgba(99,102,241,0.12);
          }
        ` : ''}
      `}</style>
    </div>
  );
}

export default ThemedGalleryWrapper;