'use client';
import * as React from 'react';

type CommandAction = {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'settings';
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function CommandPalette({ isOpen, onClose, isDark, onToggleTheme }: CommandPaletteProps) {
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Acciones disponibles en el command palette
  const actions: CommandAction[] = [
    {
      id: 'dashboard',
      label: 'Ir a Dashboard',
      subtitle: 'Ver resumen general',
      icon: '📊',
      action: () => { document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' }); onClose(); },
      category: 'navigation'
    },
    {
      id: 'events',
      label: 'Ir a Eventos',
      subtitle: 'Gestionar sesiones fotográficas',
      icon: '📅',
      action: () => { document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' }); onClose(); },
      category: 'navigation'
    },
    {
      id: 'photos',
      label: 'Ir a Fotos',
      subtitle: 'Gestión de galería',
      icon: '📸',
      action: () => { document.getElementById('fotos')?.scrollIntoView({ behavior: 'smooth' }); onClose(); },
      category: 'navigation'
    },
    {
      id: 'create-event',
      label: 'Crear Evento',
      subtitle: 'Nueva sesión fotográfica',
      icon: '📅',
      shortcut: '⌘ + E',
      action: () => { alert('🎉 Crear Evento - Próximamente en producción!'); onClose(); },
      category: 'actions'
    },
    {
      id: 'upload-photos',
      label: 'Subir Fotos',
      subtitle: 'Agregar nuevas imágenes',
      icon: '📸',
      shortcut: '⌘ + U',
      action: () => { alert('📸 Subir Fotos - Próximamente en producción!'); onClose(); },
      category: 'actions'
    },
    {
      id: 'toggle-theme',
      label: isDark ? 'Modo Claro' : 'Modo Oscuro',
      subtitle: 'Cambiar tema de la interfaz',
      icon: isDark ? '☀️' : '🌙',
      shortcut: '⌘ + D',
      action: () => { onToggleTheme(); onClose(); },
      category: 'settings'
    },
    {
      id: 'view-stats',
      label: 'Ver Estadísticas',
      subtitle: 'Métricas y análisis',
      icon: '📈',
      action: () => { alert('📊 Estadísticas detalladas - Feature en desarrollo!'); onClose(); },
      category: 'actions'
    },
    {
      id: 'help',
      label: 'Ayuda',
      subtitle: 'Documentación y soporte',
      icon: '❓',
      shortcut: '⌘ + ?',
      action: () => { alert('💡 Centro de Ayuda - Próximamente!'); onClose(); },
      category: 'settings'
    }
  ];

  // Filtrar acciones basado en búsqueda
  const filteredActions = React.useMemo(() => {
    if (!search.trim()) return actions;
    
    const searchLower = search.toLowerCase();
    return actions.filter(action => 
      action.label.toLowerCase().includes(searchLower) ||
      action.subtitle?.toLowerCase().includes(searchLower) ||
      action.category.toLowerCase().includes(searchLower)
    );
  }, [search, actions]);

  // Reset selection cuando cambian los resultados
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);

  // Focus en input cuando se abre
  React.useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          filteredActions[selectedIndex]?.action();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md elevated-panel-xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar acciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-lg text-neutral-800 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 outline-none"
          />
          <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md font-mono">
            esc
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
              <span className="text-4xl mb-2">🤷‍♂️</span>
              <p className="text-sm">No se encontraron acciones para "{search}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-xl">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800 dark:text-neutral-100">
                      {action.label}
                    </div>
                    {action.subtitle && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {action.subtitle}
                      </div>
                    )}
                  </div>
                  {action.shortcut && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md font-mono">
                      {action.shortcut}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-mono">↑↓</kbd>
              <span>navegar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-mono">⏎</kbd>
              <span>ejecutar</span>
            </div>
          </div>
          <div className="text-neutral-400 dark:text-neutral-500">
            ⌘K para abrir
          </div>
        </div>
      </div>
    </div>
  );
}
