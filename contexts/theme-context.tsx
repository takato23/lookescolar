'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  setHighContrast: (highContrast: boolean) => void;
  reducedMotion: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'lookescolar-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Initialize theme from storage and system preferences
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setTheme(stored);
    }

    // Check for high contrast preference
    const highContrastStored = localStorage.getItem(`${storageKey}-high-contrast`);
    setHighContrast(highContrastStored === 'true');

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, [storageKey]);

  // Resolve theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const resolveTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme as ResolvedTheme);
      }
    };

    resolveTheme();
    
    const handleChange = () => {
      if (theme === 'system') {
        resolveTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Add current theme classes
    root.classList.add(resolvedTheme);
    if (highContrast) {
      root.classList.add('high-contrast');
    }
    
    // Set CSS custom properties for smooth transitions
    root.style.setProperty('--theme-transition', reducedMotion ? 'none' : '0.3s ease');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        resolvedTheme === 'dark' ? '#0f0f23' : '#ffffff'
      );
    }
  }, [resolvedTheme, highContrast, reducedMotion]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  const updateHighContrast = (newHighContrast: boolean) => {
    setHighContrast(newHighContrast);
    localStorage.setItem(`${storageKey}-high-contrast`, newHighContrast.toString());
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
  };

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme: updateTheme,
    highContrast,
    setHighContrast: updateHighContrast,
    reducedMotion,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}