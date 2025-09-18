'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Moon, Monitor, Settings, Eye, EyeOff, 
  Contrast, AccessibilityIcon, Volume2, VolumeX,
  Palette, RotateCcw, Check, ChevronDown
} from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { AccessibleLiquidButton } from './accessible-liquid-button';
import { AccessibleGlassCard } from './accessible-glass-card';

interface ThemeControlsProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function ThemeControls({ showLabel = true, compact = false }: ThemeControlsProps) {
  const { 
    theme, 
    setTheme, 
    resolvedTheme, 
    highContrast, 
    setHighContrast, 
    reducedMotion, 
    toggleTheme 
  } = useTheme();
  
  const [showSettings, setShowSettings] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(false);

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Oscuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T for theme toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
      // Ctrl/Cmd + Shift + H for high contrast
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setHighContrast(!highContrast);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleTheme, highContrast, setHighContrast]);

  if (compact) {
    return (
      <div className="relative">
        <AccessibleLiquidButton
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Configuración de accesibilidad"
          aria-expanded={showSettings}
          aria-haspopup="true"
        >
          <Settings className="w-5 h-5" />
          {showLabel && <span className="sr-only">Tema y Accesibilidad</span>}
        </AccessibleLiquidButton>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 z-50"
            >
              <AccessibleGlassCard 
                intensity="strong" 
                className="p-4 min-w-[240px] space-y-3"
                role="menu"
                aria-label="Configuración de accesibilidad"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Tema
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {themeOptions.map(({ value, label, icon: Icon }) => (
                      <AccessibleLiquidButton
                        key={value}
                        variant={theme === value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setTheme(value)}
                        aria-label={`Cambiar a tema ${label.toLowerCase()}`}
                        title={`Tema ${label}`}
                        className="flex-col gap-1 h-12"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{label}</span>
                      </AccessibleLiquidButton>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="high-contrast" className="text-sm font-medium">
                    Alto Contraste
                  </label>
                  <AccessibleLiquidButton
                    variant={highContrast ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setHighContrast(!highContrast)}
                    aria-label={`${highContrast ? 'Desactivar' : 'Activar'} alto contraste`}
                    title="Ctrl+Shift+H"
                  >
                    {highContrast ? <Check className="w-4 h-4" /> : <Contrast className="w-4 h-4" />}
                  </AccessibleLiquidButton>
                </div>

                <div className="pt-2 border-t border-current/10">
                  <p className="text-xs opacity-70">
                    Atajos: Ctrl+Shift+T (tema), Ctrl+Shift+H (contraste)
                  </p>
                </div>
              </AccessibleGlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <AccessibleGlassCard intensity="medium" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6" />
          Tema y Accesibilidad
        </h2>
        <AccessibleLiquidButton
          variant="ghost"
          size="sm"
          onClick={() => {
            setTheme('system');
            setHighContrast(false);
          }}
          aria-label="Restablecer configuración"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          <span>Restablecer</span>
        </AccessibleLiquidButton>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">
          Tema de Color
        </label>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <AccessibleLiquidButton
              key={value}
              variant={theme === value ? 'primary' : 'ghost'}
              size="lg"
              onClick={() => setTheme(value)}
              className="flex-col gap-2 h-20"
              aria-label={`Seleccionar tema ${label.toLowerCase()}`}
              aria-pressed={theme === value}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
              {theme === value && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </AccessibleLiquidButton>
          ))}
        </div>
        <p className="text-sm opacity-70">
          Tema actual: <strong>{resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}</strong>
        </p>
      </div>

      {/* Accessibility Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AccessibilityIcon className="w-5 h-5" />
          Opciones de Accesibilidad
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* High Contrast */}
          <AccessibleGlassCard 
            intensity="light" 
            interactive 
            className="p-4 cursor-pointer"
            onClick={() => setHighContrast(!highContrast)}
            role="button"
            aria-label={`${highContrast ? 'Desactivar' : 'Activar'} alto contraste`}
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${highContrast ? 'bg-current/20' : 'bg-current/10'}`}>
                  <Contrast className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Alto Contraste</p>
                  <p className="text-sm opacity-70">Mejora la legibilidad</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors ${
                highContrast ? 'bg-blue-500' : 'bg-current/20'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform mt-0.5 ${
                  highContrast ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
          </AccessibleGlassCard>

          {/* Reduced Motion Info */}
          <AccessibleGlassCard intensity="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-current/10">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Movimiento Reducido</p>
                <p className="text-sm opacity-70">
                  {reducedMotion ? 'Activado por el sistema' : 'Animaciones habilitadas'}
                </p>
              </div>
            </div>
          </AccessibleGlassCard>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Atajos de Teclado</h3>
        <AccessibleGlassCard intensity="light" className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Alternar tema</span>
              <kbd className="px-2 py-1 bg-current/10 rounded text-xs">Ctrl+Shift+T</kbd>
            </div>
            <div className="flex justify-between">
              <span>Alto contraste</span>
              <kbd className="px-2 py-1 bg-current/10 rounded text-xs">Ctrl+Shift+H</kbd>
            </div>
            <div className="flex justify-between">
              <span>Navegación por teclado</span>
              <kbd className="px-2 py-1 bg-current/10 rounded text-xs">Tab / Shift+Tab</kbd>
            </div>
          </div>
        </AccessibleGlassCard>
      </div>

      {/* Current Status */}
      <AccessibleGlassCard intensity="light" className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium">Estado Actual</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="opacity-70">Tema:</span>
              <span className="ml-2 font-medium capitalize">{theme}</span>
            </div>
            <div>
              <span className="opacity-70">Resolución:</span>
              <span className="ml-2 font-medium capitalize">{resolvedTheme}</span>
            </div>
            <div>
              <span className="opacity-70">Alto Contraste:</span>
              <span className="ml-2 font-medium">{highContrast ? 'Sí' : 'No'}</span>
            </div>
            <div>
              <span className="opacity-70">Movimiento:</span>
              <span className="ml-2 font-medium">{reducedMotion ? 'Reducido' : 'Normal'}</span>
            </div>
          </div>
        </div>
      </AccessibleGlassCard>
    </AccessibleGlassCard>
  );
}