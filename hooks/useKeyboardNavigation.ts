import { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  onSelectCurrent?: () => void;
  onCloseModal?: () => void;
  onCheckout?: () => void;
  enabled?: boolean;
}

/**
 * Hook para navegación por teclado en la tienda
 * @param options - Opciones de navegación
 * @returns Funciones de navegación
 */
export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    onNavigateNext,
    onNavigatePrevious,
    onSelectCurrent,
    onCloseModal,
    onCheckout,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // En galería: flechas para navegar, Enter para seleccionar
    if (e.target === document.body || e.target?.tagName === 'DIV') {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onNavigateNext?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigatePrevious?.();
          break;
        case 'Escape':
          e.preventDefault();
          onCloseModal?.();
          break;
        case 'Enter':
          e.preventDefault();
          onSelectCurrent?.();
          break;
      }
    }

    // En carrito: shortcuts para acciones comunes
    if ((e.ctrlKey || e.metaKey) && e.target?.tagName !== 'INPUT' && e.target?.tagName !== 'TEXTAREA') {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          onCheckout?.();
          break;
      }
    }

    // Atajos globales
    switch (e.key) {
      case 'Escape':
        // Cerrar modales o diálogos
        if (e.target?.tagName !== 'INPUT' && e.target?.tagName !== 'TEXTAREA') {
          onCloseModal?.();
        }
        break;
    }
  }, [enabled, onNavigateNext, onNavigatePrevious, onSelectCurrent, onCloseModal, onCheckout]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    handleKeyDown
  };
};

/**
 * Hook para navegación por teclado en galerías de fotos
 * @param photos - Array de fotos
 * @param currentIndex - Índice actual
 * @param onPhotoSelect - Callback para seleccionar foto
 * @param onNavigate - Callback para navegación
 * @returns Funciones de navegación
 */
export const usePhotoGalleryNavigation = (
  photos: any[],
  currentIndex: number,
  onPhotoSelect: (photo: any) => void,
  onNavigate: (direction: 'next' | 'prev') => void
) => {
  const handleNavigateNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onNavigate('next');
    }
  }, [currentIndex, photos.length, onNavigate]);

  const handleNavigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate('prev');
    }
  }, [currentIndex, onNavigate]);

  const handleSelectCurrent = useCallback(() => {
    if (photos[currentIndex]) {
      onPhotoSelect(photos[currentIndex]);
    }
  }, [photos, currentIndex, onPhotoSelect]);

  useKeyboardNavigation({
    onNavigateNext: handleNavigateNext,
    onNavigatePrevious: handleNavigatePrevious,
    onSelectCurrent: handleSelectCurrent,
    enabled: true
  });

  return {
    navigateNext: handleNavigateNext,
    navigatePrevious: handleNavigatePrevious,
    selectCurrent: handleSelectCurrent
  };
};
