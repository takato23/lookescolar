'use client';

/**
 * Accessibility utilities for LookEscolar
 * Implements WCAG 2.1 AA compliance features
 */

/**
 * Keyboard navigation handler for interactive elements
 */
export function handleKeyboardNavigation(
  event: React.KeyboardEvent,
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void
) {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      onEnter?.();
      break;
    case ' ':
    case 'Space':
      event.preventDefault();
      onSpace?.();
      break;
    case 'Escape':
      event.preventDefault();
      onEscape?.();
      break;
  }
}

/**
 * Focus trap for modals and dialogs
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  // Focus first element initially
  firstElement?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announces messages to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * Generates unique IDs for form elements
 */
let idCounter = 0;
export function generateId(prefix = 'id') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Color contrast utilities
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want a more robust color parsing
  const getLuminance = (color: string) => {
    // This is a simplified version - you'd want proper color parsing
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map((x) => {
      const val = parseInt(x) / 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsContrastStandards(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }

  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Reduced motion utilities
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Focus management for SPAs
 */
export function manageFocus() {
  let lastFocusedElement: HTMLElement | null = null;

  return {
    save() {
      lastFocusedElement = document.activeElement as HTMLElement;
    },

    restore() {
      if (lastFocusedElement && lastFocusedElement.focus) {
        lastFocusedElement.focus();
      }
    },

    set(element: HTMLElement | null) {
      if (element && element.focus) {
        element.focus();
      }
    },
  };
}

/**
 * ARIA label generators
 */
export function generatePhotoAltText(photo: {
  filename: string;
  created_at?: string;
}): string {
  const date = photo.created_at
    ? new Date(photo.created_at).toLocaleDateString('es-AR')
    : '';
  return `Foto ${photo.filename}${date ? ` tomada el ${date}` : ''}`;
}

export function generateLoadingLabel(context: string): string {
  return `Cargando ${context}...`;
}

export function generateProgressLabel(
  current: number,
  total: number,
  context: string
): string {
  return `${context}: ${current} de ${total} completado`;
}

/**
 * Screen reader utilities
 */
export function hideFromScreenReader(element: HTMLElement) {
  element.setAttribute('aria-hidden', 'true');
}

export function showToScreenReader(element: HTMLElement) {
  element.removeAttribute('aria-hidden');
}

/**
 * Touch target size validation
 */
export function validateTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // WCAG AA minimum touch target size in pixels

  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Language and locale utilities
 */
export function getPageLanguage(): string {
  return document.documentElement.lang || 'es';
}

export function formatForScreenReader(text: string): string {
  // Format text for better screen reader pronunciation
  return text
    .replace(/\$/g, 'pesos ')
    .replace(/\#/g, 'número ')
    .replace(/\@/g, 'arroba ')
    .replace(/\%/g, ' por ciento');
}
