import { useEffect } from 'react';

interface UseTaggingShortcutsProps {
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
  onCancel: () => void;
  canUndo: boolean;
  hasPendingAssignment: boolean;
  hasSelection: boolean;
}

export function useTaggingShortcuts({
  onSelectAll,
  onClearSelection,
  onUndo,
  onCancel,
  canUndo,
  hasPendingAssignment,
  hasSelection,
}: UseTaggingShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir shortcuts si hay inputs enfocados
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (hasPendingAssignment) {
            onCancel();
          } else if (hasSelection) {
            onClearSelection();
          }
          break;

        case 'a':
          if (isCtrlOrCmd) {
            e.preventDefault();
            onSelectAll();
          }
          break;

        case 'z':
          if (isCtrlOrCmd && canUndo) {
            e.preventDefault();
            onUndo();
          }
          break;

        case 'c':
          if (isCtrlOrCmd && hasSelection) {
            e.preventDefault();
            onClearSelection();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSelectAll,
    onClearSelection,
    onUndo,
    onCancel,
    canUndo,
    hasPendingAssignment,
    hasSelection,
  ]);
}
