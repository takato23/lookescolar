'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Camera,
  Users,
  Tag,
  Package,
  Upload,
  Settings,
  LayoutDashboard,
  Plus,
  FolderOpen,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: LucideIcon;
  shortcut: string;
  category: 'Navigation' | 'Actions' | 'Quick Actions';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Ver estadísticas generales',
      href: '/admin',
      icon: LayoutDashboard,
      shortcut: '⌘+D',
      category: 'Navigation',
    },
    {
      id: 'nav-events',
      title: 'Eventos',
      subtitle: 'Gestionar sesiones fotográficas',
      href: '/admin/events',
      icon: Calendar,
      shortcut: '⌘+E',
      category: 'Navigation',
    },
    {
      id: 'nav-photos',
      title: 'Fotos',
      subtitle: 'Ver y gestionar fotos',
      href: '/admin/photos',
      icon: Camera,
      shortcut: '⌘+P',
      category: 'Navigation',
    },
    {
      id: 'nav-subjects',
      title: 'Alumnos',
      subtitle: 'Gestionar alumnos y familias',
      href: '/admin/subjects',
      icon: Users,
      shortcut: '⌘+A',
      category: 'Navigation',
    },
    {
      id: 'nav-tagging',
      title: 'Etiquetar',
      subtitle: 'Asignar fotos a alumnos',
      href: '/admin/tagging',
      icon: Tag,
      shortcut: '⌘+T',
      category: 'Navigation',
    },
    {
      id: 'nav-orders',
      title: 'Pedidos',
      subtitle: 'Gestionar órdenes y pagos',
      href: '/admin/orders',
      icon: Package,
      shortcut: '⌘+O',
      category: 'Navigation',
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      subtitle: 'Ver reportes y métricas',
      href: '/admin/analytics',
      icon: BarChart3,
      shortcut: '⌘+R',
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      title: 'Configuración',
      subtitle: 'Ajustes del sistema',
      href: '/admin/settings',
      icon: Settings,
      shortcut: '⌘+,',
      category: 'Navigation',
    },

    // Quick Actions
    {
      id: 'action-new-event',
      title: 'Crear Evento',
      subtitle: 'Nueva sesión fotográfica',
      href: '/admin/events/new',
      icon: Plus,
      shortcut: '⌘+N',
      category: 'Quick Actions',
    },
    {
      id: 'action-upload',
      title: 'Subir Fotos',
      subtitle: 'Upload masivo de imágenes',
      href: '/admin/photos?action=upload',
      icon: Upload,
      shortcut: '⌘+U',
      category: 'Quick Actions',
    },
  ];

  const filteredCommands = commands.filter((command) => {
    const searchTerm = query.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchTerm) ||
      command.subtitle?.toLowerCase().includes(searchTerm) ||
      command.category.toLowerCase().includes(searchTerm)
    );
  });

  const executeCommand = (command: Command) => {
    router.push(command.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const groupedCommands = filteredCommands.reduce(
    (acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <Card className="mx-4 w-full max-w-2xl shadow-2xl" variant="glass">
        {/* Search Input */}
        <div className="border-border flex items-center gap-3 border-b p-4">
          <Search className="text-gray-500 dark:text-gray-400 h-5 w-5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar comandos, páginas, acciones..."
            className="placeholder:text-muted-foreground flex-1 bg-transparent text-lg outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div
            id="command-palette-hint"
            className="text-gray-500 dark:text-gray-400 bg-muted rounded px-2 py-1 text-xs"
          >
            ESC para cerrar
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category} className="p-2">
              <div className="text-gray-500 dark:text-gray-400 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                {category}
              </div>

              {commands.map((command, commandIndex) => {
                const globalIndex = filteredCommands.findIndex(
                  (c) => c.id === command.id
                );
                const isSelected = globalIndex === selectedIndex;
                const Icon = command.icon ?? Search;

                return (
                  <Button
                    key={command.id}
                    variant="ghost"
                    className={cn(
                      'mb-1 h-auto w-full justify-start p-3',
                      isSelected && 'bg-primary-50 text-primary-900'
                    )}
                    aria-label={`Ir a ${command.title}`}
                    onClick={() => executeCommand(command)}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />

                    <div className="flex-1 text-left">
                      <div className="font-medium">{command.title}</div>
                      {command.subtitle && (
                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                          {command.subtitle}
                        </div>
                      )}
                    </div>

                    <div className="text-gray-500 dark:text-gray-400 bg-muted rounded px-2 py-1 font-mono text-xs">
                      {command.shortcut}
                    </div>
                  </Button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="p-8 text-center">
              <Search className="text-gray-500 dark:text-gray-400 mx-auto mb-3 h-8 w-8" />
              <h3 className="text-foreground mb-1 font-medium">
                No se encontraron resultados
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredCommands.length > 0 && (
          <div className="text-gray-500 dark:text-gray-400 border-border bg-muted/30 flex items-center justify-between border-t p-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="bg-background rounded border px-1.5 py-0.5">
                  ↑
                </kbd>
                <kbd className="bg-background rounded border px-1.5 py-0.5">
                  ↓
                </kbd>
                <span>navegar</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-background rounded border px-1.5 py-0.5">
                  Enter
                </kbd>
                <span>seleccionar</span>
              </div>
            </div>
            <div>
              {filteredCommands.length} comando
              {filteredCommands.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
