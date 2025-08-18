'use client';
import * as React from 'react';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);

  const openPalette = () => setIsOpen(true);
  const closePalette = () => setIsOpen(false);
  const togglePalette = () => setIsOpen(prev => !prev);

  // Shortcuts globales
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K o Ctrl+K para abrir command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
      }
      
      // ⌘D o Ctrl+D para toggle theme (se maneja en el palette)
      // ⌘E para crear evento (se maneja en el palette)
      // ⌘U para subir fotos (se maneja en el palette)
      // etc.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    openPalette,
    closePalette,
    togglePalette
  };
}
