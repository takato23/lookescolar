'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'Navigation' | 'Actions' | 'System';
}

interface UseKeyboardShortcutsProps {
  onOpenCommandPalette?: () => void;
}

export function useKeyboardShortcuts({
  onOpenCommandPalette,
}: UseKeyboardShortcutsProps = {}) {
  const [isEnabled, setIsEnabled] = useState(true);
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    // System shortcuts
    {
      key: 'k',
      metaKey: true,
      action: () => onOpenCommandPalette?.(),
      description: 'Abrir Command Palette',
      category: 'System',
    },
    {
      key: '/',
      action: () => onOpenCommandPalette?.(),
      description: 'Buscar (alternativo)',
      category: 'System',
    },

    // Navigation shortcuts
    {
      key: 'd',
      metaKey: true,
      action: () => router.push('/admin'),
      description: 'Ir a Dashboard',
      category: 'Navigation',
    },
    {
      key: 'e',
      metaKey: true,
      action: () => router.push('/admin/events'),
      description: 'Ir a Eventos',
      category: 'Navigation',
    },
    {
      key: 'p',
      metaKey: true,
      action: () => router.push('/admin/photos'),
      description: 'Ir a Fotos',
      category: 'Navigation',
    },
    {
      key: 'o',
      metaKey: true,
      action: () => router.push('/admin/orders'),
      description: 'Ir a Pedidos',
      category: 'Navigation',
    },
    {
      key: 'p',
      metaKey: true,
      shiftKey: true,
      action: () => router.push('/admin/publish'),
      description: 'Ir a Publicar',
      category: 'Navigation',
    },
    {
      key: ',',
      metaKey: true,
      action: () => router.push('/admin/settings'),
      description: 'Ir a Configuración',
      category: 'Navigation',
    },

    // Action shortcuts
    {
      key: 'n',
      metaKey: true,
      action: () => router.push('/admin/events/new'),
      description: 'Crear nuevo evento',
      category: 'Actions',
    },
    {
      key: 'u',
      metaKey: true,
      action: () => router.push('/admin/photos?action=upload'),
      description: 'Subir fotos',
      category: 'Actions',
    },
  ];

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Only allow command palette shortcut when typing
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          onOpenCommandPalette?.();
        }
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const metaMatch = !!s.metaKey === (event.metaKey || event.ctrlKey);
        const shiftMatch = !!s.shiftKey === event.shiftKey;
        const altMatch = !!s.altKey === event.altKey;

        return keyMatch && metaMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, shortcuts, router, onOpenCommandPalette]);

  const getShortcutsByCategory = () => {
    return shortcuts.reduce(
      (acc, shortcut) => {
        if (!acc[shortcut.category]) {
          acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
      },
      {} as Record<string, KeyboardShortcut[]>
    );
  };

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];

    if (shortcut.metaKey) parts.push('⌘');
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('⇧');
    if (shortcut.altKey) parts.push('⌥');

    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  };

  return {
    shortcuts,
    isEnabled,
    setIsEnabled,
    getShortcutsByCategory,
    formatShortcut,
  };
}
