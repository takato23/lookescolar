'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system' | 'night';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
  const debugLog = () => {};

  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Resolver tema actual basado en preferencias
  const resolveTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return 'light';
    }
    // "night" es una variante de "dark" a nivel de resolución
    return currentTheme === 'night' ? 'dark' : currentTheme;
  };

  // Aplicar tema al DOM
  const applyTheme = (resolvedTheme: 'light' | 'dark') => {
    const html = document.documentElement;

    // Remover clases anteriores
    html.classList.remove('light', 'dark', 'night');

    // Aplicar nueva clase con transición suave
    html.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    html.classList.add(resolvedTheme);

    // Sincronizar atributo data-theme para estilos que lo consultan (admin)
    html.setAttribute('data-theme', resolvedTheme);

    // Si el tema seleccionado es "night", agregar clase adicional
    if (theme === 'night') {
      html.classList.add('night');
    }

    // Actualizar meta theme-color para mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = resolvedTheme === 'dark' ? '#0a0a0a' : '#fafaff';
      metaThemeColor.setAttribute('content', color);
    }

  };

  // Setear tema con persistencia
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newTheme);
    }

    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  // Toggle entre light y dark (omite system)
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Inicialización en mount
  useEffect(() => {
    let initialTheme = defaultTheme;

    // Recuperar tema guardado
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        initialTheme = storedTheme;
      }
    }

    const resolved = resolveTheme(initialTheme);
    setThemeState(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [defaultTheme, storageKey]);

  // Escuchar cambios en prefers-color-scheme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook para obtener solo el tema resuelto (optimizado para performance)
export function useResolvedTheme() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

// Hook para detectar si está en modo oscuro
export function useIsDarkMode() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}
