'use client';

import * as React from 'react';
import { Moon, Sun, Monitor, Star } from 'lucide-react';
import { useTheme, type Theme } from '@/components/providers/theme-provider';

// Dropdown de opciones de tema
interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Claro',
    icon: Sun,
    description: 'Tema claro para mejor visibilidad durante el día',
  },
  {
    value: 'dark',
    label: 'Oscuro',
    icon: Moon,
    description: 'Tema oscuro para reducir fatiga visual',
  },
  {
    value: 'night',
    label: 'Noche',
    icon: Star,
    description: 'Oscuro de alto contraste con acentos cálidos',
  },
  {
    value: 'system',
    label: 'Sistema',
    icon: Monitor,
    description: 'Usar preferencia del sistema operativo',
  },
];

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  variant = 'icon',
  size = 'md',
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 p-1.5',
    md: 'h-10 w-10 p-2',
    lg: 'h-12 w-12 p-2.5',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Toggle simple entre light/dark
  if (variant === 'icon') {
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    const label =
      resolvedTheme === 'dark'
        ? 'Cambiar a modo claro'
        : 'Cambiar a modo oscuro';

    return (
      <button
        onClick={toggleTheme}
        className={` ${sizeClasses[size]} bg-background/50 hover:bg-background/80 border-border hover:border-border-strong focus-visible:ring-primary touch-target group inline-flex items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className} `}
        title={label}
        aria-label={label}
        type="button"
      >
        <Icon
          className={`${iconSizeClasses[size]} text-foreground transition-transform duration-200 group-hover:scale-110`}
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </button>
    );
  }

  // Button con texto
  if (variant === 'button') {
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    const label = resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro';

    return (
      <button
        onClick={toggleTheme}
        className={`bg-background/50 hover:bg-background/80 border-border hover:border-border-strong focus-visible:ring-primary text-foreground touch-target inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className} `}
        type="button"
        aria-label={`Cambiar a ${resolvedTheme === 'dark' ? 'modo claro' : 'modo oscuro'}`}
      >
        <Icon
          className={`${iconSizeClasses[size]} transition-transform duration-200`}
          aria-hidden="true"
        />
        {showLabel && <span>{label}</span>}
      </button>
    );
  }

  // Dropdown completo con todas las opciones
  if (variant === 'dropdown') {
    const currentOption =
      themeOptions.find((opt) => opt.value === theme) || themeOptions[0];
    const CurrentIcon = currentOption.icon;

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-background/50 hover:bg-background/80 border-border hover:border-border-strong focus-visible:ring-primary text-foreground touch-target inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className} `}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Seleccionar tema"
        >
          <CurrentIcon
            className={`${iconSizeClasses[size]} transition-transform duration-200`}
            aria-hidden="true"
          />
          {showLabel && <span>{currentOption.label}</span>}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Overlay para cerrar */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Dropdown menu */}
            <div
              className="bg-background/95 border-border absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border p-1 shadow-xl backdrop-blur-xl"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="theme-menu"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTheme(option.value);
                      setIsOpen(false);
                    }}
                    className={`focus-visible:ring-primary/50 flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${isSelected ? 'text-primary bg-surface' : 'text-foreground'} `}
                    role="menuitem"
                    type="button"
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-foreground/70'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <svg
                            className="text-primary h-4 w-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-foreground/60 mt-0.5 text-xs">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// Componente específico para headers/navbar
export function HeaderThemeToggle() {
  return (
    <ThemeToggle
      variant="icon"
      size="md"
      className="transition-transform hover:scale-105"
    />
  );
}

// Componente para settings/configuración
export function SettingsThemeToggle() {
  return (
    <ThemeToggle
      variant="dropdown"
      size="md"
      showLabel={true}
      className="w-full justify-start"
    />
  );
}
