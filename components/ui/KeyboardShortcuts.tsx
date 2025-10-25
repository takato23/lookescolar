'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Command,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Archive,
  RefreshCw,
  Download,
  Upload,
  Settings,
  HelpCircle,
  X,
  Keyboard,
  MousePointer,
  Navigation,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'editing' | 'selection' | 'global';
  context?: string;
  preventDefault?: boolean;
}

interface AccessibilityFeatures {
  highContrast: boolean;
  reducedMotion: boolean;
  focusVisible: boolean;
  screenReaderMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface KeyboardContextValue {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  showHelp: boolean;
  toggleHelp: () => void;
  accessibility: AccessibilityFeatures;
  updateAccessibility: (features: Partial<AccessibilityFeatures>) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error(
      'useKeyboardShortcuts must be used within a KeyboardProvider'
    );
  }
  return context;
}

// Provider component
interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilityFeatures>({
    highContrast: false,
    reducedMotion: false,
    focusVisible: true,
    screenReaderMode: false,
    fontSize: 'medium',
  });

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      const existing = prev.find((s) => s.key === shortcut.key);
      if (existing) {
        return prev.map((s) => (s.key === shortcut.key ? shortcut : s));
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  const updateAccessibility = useCallback(
    (features: Partial<AccessibilityFeatures>) => {
      setAccessibility((prev) => ({ ...prev, ...features }));

      // Apply accessibility features to document
      if (features.highContrast !== undefined) {
        document.documentElement.classList.toggle(
          'high-contrast',
          features.highContrast
        );
      }
      if (features.reducedMotion !== undefined) {
        document.documentElement.classList.toggle(
          'reduced-motion',
          features.reducedMotion
        );
      }
      if (features.focusVisible !== undefined) {
        document.documentElement.classList.toggle(
          'focus-visible',
          features.focusVisible
        );
      }
      if (features.fontSize) {
        document.documentElement.setAttribute(
          'data-font-size',
          features.fontSize
        );
      }
    },
    []
  );

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception for global shortcuts like Help (?)
        if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          setShowHelp((prev) => !prev);
          return;
        }
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        const modifiersMatch =
          shortcut.modifiers?.every((modifier) => {
            switch (modifier) {
              case 'ctrl':
                return event.ctrlKey;
              case 'meta':
                return event.metaKey;
              case 'shift':
                return event.shiftKey;
              case 'alt':
                return event.altKey;
              default:
                return false;
            }
          }) ?? true;

        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          modifiersMatch
        );
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  // Load accessibility preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-preferences');
    if (saved) {
      try {
        const savedFeatures = JSON.parse(saved);
        updateAccessibility(savedFeatures);
      } catch (error) {
        console.error('Error loading accessibility preferences:', error);
      }
    }
  }, [updateAccessibility]);

  // Save accessibility preferences to localStorage
  useEffect(() => {
    localStorage.setItem(
      'accessibility-preferences',
      JSON.stringify(accessibility)
    );
  }, [accessibility]);

  const value: KeyboardContextValue = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    showHelp,
    toggleHelp,
    accessibility,
    updateAccessibility,
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <KeyboardHelpModal />
      <AccessibilityPanel />
    </KeyboardContext.Provider>
  );
}

// Keyboard help modal
function KeyboardHelpModal() {
  const { showHelp, toggleHelp, shortcuts } = useKeyboardShortcuts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !showHelp) return null;

  const groupedShortcuts = shortcuts.reduce(
    (groups, shortcut) => {
      const category = shortcut.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
      return groups;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts = [];
    if (shortcut.modifiers?.includes('ctrl')) parts.push('Ctrl');
    if (shortcut.modifiers?.includes('meta')) parts.push('⌘');
    if (shortcut.modifiers?.includes('shift')) parts.push('Shift');
    if (shortcut.modifiers?.includes('alt')) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  const categoryIcons = {
    navigation: Navigation,
    actions: Zap,
    editing: Edit3,
    selection: MousePointer,
    global: Settings,
  };

  const categoryNames = {
    navigation: 'Navegación',
    actions: 'Acciones',
    editing: 'Edición',
    selection: 'Selección',
    global: 'Global',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="neural-glass-card max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-6">
          <div className="flex items-center gap-3">
            <Keyboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-foreground">
              Atajos de Teclado
            </h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleHelp}
            className="neural-glass-card hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid gap-6">
            {Object.entries(groupedShortcuts).map(
              ([category, categoryShortcuts]) => {
                const Icon =
                  categoryIcons[category as keyof typeof categoryIcons] ||
                  Settings;
                const categoryName =
                  categoryNames[category as keyof typeof categoryNames] ||
                  category;

                return (
                  <div key={category} className="space-y-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      {categoryName}
                    </h3>
                    <div className="grid gap-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="neural-glass-card flex items-center justify-between rounded-lg p-3"
                        >
                          <div>
                            <div className="font-medium text-foreground">
                              {shortcut.description}
                            </div>
                            {shortcut.context && (
                              <div className="text-sm text-gray-500">
                                {shortcut.context}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {formatShortcut(shortcut)
                              .split(' + ')
                              .map((key, keyIndex) => (
                                <React.Fragment key={keyIndex}>
                                  {keyIndex > 0 && (
                                    <span className="text-gray-400">+</span>
                                  )}
                                  <kbd className="rounded bg-muted/70 px-2 py-1 font-mono text-xs">
                                    {key}
                                  </kbd>
                                </React.Fragment>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {shortcuts.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              <Keyboard className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No hay atajos de teclado registrados</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 bg-muted/50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div>
              Presiona <kbd className="rounded bg-muted px-2 py-1">?</kbd>{' '}
              para mostrar/ocultar esta ayuda
            </div>
            <div>{shortcuts.length} atajos disponibles</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Accessibility panel
function AccessibilityPanel() {
  const { accessibility, updateAccessibility } = useKeyboardShortcuts();
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      {/* Accessibility toggle button */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          onClick={() => setShowPanel(!showPanel)}
          className="neural-fab h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 p-0 shadow-lg transition-all duration-300 hover:scale-110 hover:from-purple-600 hover:to-indigo-700 hover:shadow-xl"
          title="Opciones de accesibilidad"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Accessibility panel */}
      {showPanel && (
        <div className="neural-glass-card fixed bottom-20 left-6 z-50 w-80 rounded-xl border border-white/20 bg-white/95 shadow-lg backdrop-blur-md">
          <div className="border-b border-border/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Accesibilidad</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPanel(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Alto contraste
              </label>
              <input
                type="checkbox"
                checked={accessibility.highContrast}
                onChange={(e) =>
                  updateAccessibility({ highContrast: e.target.checked })
                }
                className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
              />
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Reducir animaciones
              </label>
              <input
                type="checkbox"
                checked={accessibility.reducedMotion}
                onChange={(e) =>
                  updateAccessibility({ reducedMotion: e.target.checked })
                }
                className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
              />
            </div>

            {/* Focus Visible */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Resaltar foco
              </label>
              <input
                type="checkbox"
                checked={accessibility.focusVisible}
                onChange={(e) =>
                  updateAccessibility({ focusVisible: e.target.checked })
                }
                className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
              />
            </div>

            {/* Font Size */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Tamaño de fuente
              </label>
              <select
                value={accessibility.fontSize}
                onChange={(e) =>
                  updateAccessibility({ fontSize: e.target.value as any })
                }
                className="w-full rounded-lg border border-border p-2 text-sm"
              >
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for registering shortcuts in components
export function useShortcuts(
  shortcuts: Omit<KeyboardShortcut, 'action'>[],
  actions: (() => void)[]
) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const shortcutWithActions = shortcuts.map((shortcut, index) => ({
      ...shortcut,
      modifiers: shortcut.modifiers ? [...shortcut.modifiers] : undefined,
      action: actions[index],
    }));

    shortcutWithActions.forEach((shortcut) => {
      if (shortcut.action) {
        registerShortcut(shortcut as KeyboardShortcut);
      }
    });

    return () => {
      shortcuts.forEach((shortcut) => unregisterShortcut(shortcut.key));
    };
  }, [shortcuts, actions, registerShortcut, unregisterShortcut]);
}

// Common shortcut definitions
export const commonShortcuts = {
  search: {
    key: 'k',
    modifiers: ['ctrl'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Buscar eventos',
    category: 'navigation' as const,
  },
  newEvent: {
    key: 'n',
    modifiers: ['ctrl'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Crear nuevo evento',
    category: 'actions' as const,
  },
  selectAll: {
    key: 'a',
    modifiers: ['ctrl'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Seleccionar todos',
    category: 'selection' as const,
  },
  refresh: {
    key: 'r',
    modifiers: ['ctrl'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Actualizar página',
    category: 'navigation' as const,
  },
  help: {
    key: '?',
    modifiers: [] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Mostrar ayuda',
    category: 'global' as const,
  },
  toggleDragMode: {
    key: 'd',
    modifiers: ['ctrl'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Activar/desactivar modo arrastrar',
    category: 'actions' as const,
  },
  export: {
    key: 'e',
    modifiers: ['ctrl', 'shift'] as ('ctrl' | 'meta' | 'shift' | 'alt')[],
    description: 'Exportar datos',
    category: 'actions' as const,
  },
};

// ARIA live region for screen readers
export function AriaLiveRegion({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}

// Skip to content link
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="neural-glass-card sr-only z-50 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
    >
      Saltar al contenido principal
    </a>
  );
}
