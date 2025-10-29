/**
 * Helper utilities for photo-related operations
 * Extracted from PhotoAdmin.tsx for reusability
 */

/**
 * Translates photo status from English to Spanish
 */
export const statusLabel = (s?: string): string => {
  switch (s) {
    case 'ready':
      return 'lista';
    case 'processing':
      return 'procesando';
    case 'pending':
      return 'pendiente';
    case 'error':
      return 'error';
    default:
      return s || '';
  }
};

