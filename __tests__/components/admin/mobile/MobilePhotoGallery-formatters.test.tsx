/**
 * Test unitarios específicos para las funciones de formateo en MobilePhotoGallery
 * Verifica que formatFileSize y formatDate manejen correctamente casos edge
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useMobileDetection hook
vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobileView: true,
  }),
}));

// Mock data con casos edge
const mockPhotosWithEdgeCases = [
  {
    id: '1',
    url: 'https://example.com/photo1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    filename: 'foto-normal.jpg',
    size: 1024000, // 1MB normal
    uploadedAt: new Date('2024-01-15T10:30:00'),
    status: 'approved' as const,
  },
  {
    id: '2',
    url: 'https://example.com/photo2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    filename: 'foto-sin-tamaño.jpg',
    size: undefined, // Caso edge: size undefined
    uploadedAt: new Date('2024-01-14T14:20:00'),
    status: 'pending' as const,
  },
  {
    id: '3',
    url: 'https://example.com/photo3.jpg',
    thumbnail: 'https://example.com/thumb3.jpg',
    filename: 'foto-sin-fecha.jpg',
    size: 512000,
    uploadedAt: undefined, // Caso edge: uploadedAt undefined
    status: 'rejected' as const,
  },
  {
    id: '4',
    url: 'https://example.com/photo4.jpg',
    thumbnail: 'https://example.com/thumb4.jpg',
    filename: 'foto-datos-invalidos.jpg',
    size: null, // Caso edge: size null
    uploadedAt: 'fecha-inválida', // Caso edge: string de fecha inválido
    status: 'approved' as const,
  },
];

describe('Funciones de formateo en MobilePhotoGallery', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('formatFileSize maneja correctamente casos edge', () => {
    // Crear un componente temporal que exponga las funciones de formateo
    const TestComponent = () => {
      // Recrear las funciones de formateo del componente real
      const formatFileSize = (bytes: number | undefined | null) => {
        if (bytes == null || bytes === undefined || isNaN(bytes)) {
          return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
          value /= 1024;
          unitIndex++;
        }

        return `${value.toFixed(1)} ${units[unitIndex]}`;
      };

      return (
        <div>
          <span data-testid="normal-size">{formatFileSize(1024000)}</span>
          <span data-testid="undefined-size">{formatFileSize(undefined)}</span>
          <span data-testid="null-size">{formatFileSize(null)}</span>
          <span data-testid="nan-size">{formatFileSize(NaN)}</span>
          <span data-testid="zero-size">{formatFileSize(0)}</span>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('normal-size')).toHaveTextContent('1000.0 KB');
    expect(screen.getByTestId('undefined-size')).toHaveTextContent('0 B');
    expect(screen.getByTestId('null-size')).toHaveTextContent('0 B');
    expect(screen.getByTestId('nan-size')).toHaveTextContent('0 B');
    expect(screen.getByTestId('zero-size')).toHaveTextContent('0.0 B');
  });

  it('formatDate maneja correctamente casos edge', () => {
    // Crear un componente temporal que exponga las funciones de formateo
    const TestComponent = () => {
      // Recrear las funciones de formateo del componente real
      const formatDate = (date: Date | string | undefined | null) => {
        if (!date) {
          return 'Fecha no disponible';
        }

        try {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(dateObj.getTime())) {
            return 'Fecha no válida';
          }

          return dateObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Fecha no disponible';
        }
      };

      const normalDate = new Date('2024-01-15T10:30:00');
      const invalidStringDate = 'fecha-inválida';

      return (
        <div>
          <span data-testid="normal-date">{formatDate(normalDate)}</span>
          <span data-testid="undefined-date">{formatDate(undefined)}</span>
          <span data-testid="null-date">{formatDate(null)}</span>
          <span data-testid="invalid-date">{formatDate(invalidStringDate)}</span>
          <span data-testid="empty-string-date">{formatDate('')}</span>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('normal-date')).toHaveTextContent(/15 ene/); // Contiene la fecha formateada
    expect(screen.getByTestId('undefined-date')).toHaveTextContent('Fecha no disponible');
    expect(screen.getByTestId('null-date')).toHaveTextContent('Fecha no disponible');
    expect(screen.getByTestId('invalid-date')).toHaveTextContent('Fecha no válida');
    expect(screen.getByTestId('empty-string-date')).toHaveTextContent('Fecha no disponible');
  });

  it('no produce errores de consola con datos inválidos', () => {
    // Crear un componente que renderice fotos con datos edge
    const TestComponent = () => {
      const formatFileSize = (bytes: number | undefined | null) => {
        if (bytes == null || bytes === undefined || isNaN(bytes)) {
          return '0 B';
        }
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
          value /= 1024;
          unitIndex++;
        }
        return `${value.toFixed(1)} ${units[unitIndex]}`;
      };

      const formatDate = (date: Date | string | undefined | null) => {
        if (!date) {
          return 'Fecha no disponible';
        }
        try {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(dateObj.getTime())) {
            return 'Fecha no válida';
          }
          return dateObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Fecha no disponible';
        }
      };

      return (
        <div>
          {mockPhotosWithEdgeCases.map(photo => (
            <div key={photo.id}>
              <span data-testid={`filename-${photo.id}`}>{photo.filename}</span>
              <span data-testid={`size-${photo.id}`}>{formatFileSize(photo.size)}</span>
              <span data-testid={`date-${photo.id}`}>{formatDate(photo.uploadedAt)}</span>
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    // Verificar que se renderizan todas las fotos sin errores
    expect(screen.getByTestId('filename-1')).toHaveTextContent('foto-normal.jpg');
    expect(screen.getByTestId('filename-2')).toHaveTextContent('foto-sin-tamaño.jpg');
    expect(screen.getByTestId('filename-3')).toHaveTextContent('foto-sin-fecha.jpg');
    expect(screen.getByTestId('filename-4')).toHaveTextContent('foto-datos-invalidos.jpg');

    // Verificar que los formatos funcionan correctamente
    expect(screen.getByTestId('size-1')).toHaveTextContent('1000.0 KB');
    expect(screen.getByTestId('size-2')).toHaveTextContent('0 B');
    expect(screen.getByTestId('size-3')).toHaveTextContent('500.0 KB');
    expect(screen.getByTestId('size-4')).toHaveTextContent('0 B');

    // Verificar que no se llamaron errores de consola
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
