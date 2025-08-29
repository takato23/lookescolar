/**
 * Tests para el componente AdvancedTaggingSystem
 * Testing crítico para sistema de etiquetado de fotos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoTaggerEnhanced as AdvancedTaggingSystem } from '@/components/admin/PhotoTaggerEnhanced';

// Mock QR Scanner
vi.mock('react-qr-scanner', () => ({
  default: ({ onScan, onError }: any) => (
    <div data-testid="qr-scanner">
      <button
        onClick={() => onScan('test-token-123')}
        data-testid="mock-scan-success"
      >
        Simulate Scan Success
      </button>
      <button
        onClick={() => onError('Camera not available')}
        data-testid="mock-scan-error"
      >
        Simulate Scan Error
      </button>
    </div>
  ),
}));

const mockPhotos = [
  {
    id: 'photo-1',
    event_id: 'event-123',
    storage_path: 'eventos/event-123/photo1.webp',
    original_name: 'photo1.jpg',
    size_bytes: 1024000,
    width: 800,
    height: 600,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'photo-2',
    event_id: 'event-123',
    storage_path: 'eventos/event-123/photo2.webp',
    original_name: 'photo2.jpg',
    size_bytes: 2048000,
    width: 1200,
    height: 800,
    created_at: '2024-01-01T10:30:00Z',
    tagged_subjects: [
      {
        id: 'subject-1',
        name: 'Juan Pérez',
        grade: '5A',
      },
    ],
  },
];

const mockSubjects = [
  {
    id: 'subject-1',
    name: 'Juan Pérez',
    grade_section: '5A',
    token: 'token-juan-123',
    event_id: 'event-123',
    created_at: '2024-01-01T09:00:00Z',
    photo_count: 5,
  },
  {
    id: 'subject-2',
    name: 'María García',
    grade_section: '5B',
    token: 'token-maria-456',
    event_id: 'event-123',
    created_at: '2024-01-01T09:00:00Z',
    photo_count: 0,
  },
];

// Mock fetch
global.fetch = vi.fn();

describe('AdvancedTaggingSystem', () => {
  const defaultProps = {
    eventId: 'event-123',
    photos: mockPhotos,
    subjects: mockSubjects,
    selectedPhotos: new Set(['photo-1']),
    onPhotoUpdate: vi.fn(),
    onSubjectUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: 'Fotos etiquetadas exitosamente',
        }),
    } as Response);
  });

  describe('Rendering', () => {
    it('debe renderizar correctamente', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      expect(screen.getByText('Sistema de Etiquetado')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('QR Scanner')).toBeInTheDocument();
      expect(screen.getByText('Masivo')).toBeInTheDocument();
    });

    it('debe mostrar estadísticas correctas', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      expect(screen.getByText('2')).toBeInTheDocument(); // Total photos
      expect(screen.getByText('1')).toBeInTheDocument(); // Tagged photos
      expect(screen.getByText('1')).toBeInTheDocument(); // Selected photos
      expect(screen.getByText('2')).toBeInTheDocument(); // Total subjects
    });

    it('debe mostrar lista de sujetos', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('5A')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.getByText('5B')).toBeInTheDocument();
    });
  });

  describe('Modo Manual', () => {
    it('debe permitir seleccionar sujeto y asignar fotos', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Seleccionar sujeto
      const subjectCard = screen
        .getByText('María García')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      expect(screen.getByText('María García')).toBeInTheDocument();

      // Asignar fotos
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/tagging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoIds: ['photo-1'],
            subjectId: 'subject-2',
            eventId: 'event-123',
          }),
        });
      });

      expect(defaultProps.onPhotoUpdate).toHaveBeenCalled();
      expect(defaultProps.onSubjectUpdate).toHaveBeenCalled();
    });

    it('debe mostrar error si no hay sujeto seleccionado', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Intentar asignar sin seleccionar sujeto
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(
          screen.getByText('Selecciona un alumno primero')
        ).toBeInTheDocument();
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('debe mostrar error si no hay fotos seleccionadas', async () => {
      const propsWithoutSelection = {
        ...defaultProps,
        selectedPhotos: new Set<string>(),
      };

      render(<AdvancedTaggingSystem {...propsWithoutSelection} />);

      // Seleccionar sujeto
      const subjectCard = screen
        .getByText('Juan Pérez')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      // Intentar asignar sin fotos seleccionadas
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(
          screen.getByText('Selecciona al menos una foto')
        ).toBeInTheDocument();
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('debe permitir desasignar fotos', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const unassignButton = screen.getByText('Desasignar Seleccionadas');
      fireEvent.click(unassignButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/tagging', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoIds: ['photo-1'],
          }),
        });
      });

      expect(defaultProps.onPhotoUpdate).toHaveBeenCalled();
      expect(defaultProps.onSubjectUpdate).toHaveBeenCalled();
    });
  });

  describe('Modo QR Scanner', () => {
    it('debe cambiar a modo QR scanner', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const qrTab = screen.getByText('QR Scanner');
      fireEvent.click(qrTab);

      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    });

    it('debe manejar scan exitoso', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const qrTab = screen.getByText('QR Scanner');
      fireEvent.click(qrTab);

      const scanButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/token detectado/i)).toBeInTheDocument();
      });
    });

    it('debe manejar errores de scan', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const qrTab = screen.getByText('QR Scanner');
      fireEvent.click(qrTab);

      const errorButton = screen.getByTestId('mock-scan-error');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText(/error.*cámara/i)).toBeInTheDocument();
      });
    });

    it('debe asignar fotos automáticamente después de scan exitoso', async () => {
      // Mock fetch para encontrar sujeto por token
      vi.mocked(fetch).mockImplementation(async (url, _options) => {
        if (url === '/api/admin/subjects') {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                subjects: mockSubjects.filter(
                  (s) => s.token === 'test-token-123'
                ),
              }),
          } as Response;
        }
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'Fotos asignadas',
            }),
        } as Response;
      });

      render(<AdvancedTaggingSystem {...defaultProps} />);

      const qrTab = screen.getByText('QR Scanner');
      fireEvent.click(qrTab);

      const scanButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/subjects'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Modo Masivo', () => {
    it('debe cambiar a modo masivo', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const massiveTab = screen.getByText('Masivo');
      fireEvent.click(massiveTab);

      expect(screen.getByText('Operaciones Masivas')).toBeInTheDocument();
    });

    it('debe mostrar opciones de filtrado', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const massiveTab = screen.getByText('Masivo');
      fireEvent.click(massiveTab);

      expect(screen.getByText('Sin etiquetar')).toBeInTheDocument();
      expect(screen.getByText('Etiquetadas')).toBeInTheDocument();
      expect(screen.getByText('Todas')).toBeInTheDocument();
    });

    it('debe permitir seleccionar todas las fotos sin etiquetar', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const massiveTab = screen.getByText('Masivo');
      fireEvent.click(massiveTab);

      const untaggedButton = screen.getByText('Sin etiquetar');
      fireEvent.click(untaggedButton);

      // Verificar que se muestran solo fotos sin etiquetar
      expect(screen.getByText('1 foto')).toBeInTheDocument(); // Solo photo-1 no está etiquetada
    });

    it('debe permitir operaciones masivas por grado', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const massiveTab = screen.getByText('Masivo');
      fireEvent.click(massiveTab);

      // Debería mostrar opciones de grado
      expect(screen.getByText('5A')).toBeInTheDocument();
      expect(screen.getByText('5B')).toBeInTheDocument();
    });
  });

  describe('Búsqueda y Filtros', () => {
    it('debe filtrar sujetos por búsqueda', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/buscar alumno/i);
      fireEvent.change(searchInput, { target: { value: 'Juan' } });

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.queryByText('María García')).not.toBeInTheDocument();
      });
    });

    it('debe filtrar por grado', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const gradeFilter = screen.getByDisplayValue('Todos los grados');
      fireEvent.change(gradeFilter, { target: { value: '5A' } });

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.queryByText('María García')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar mensaje cuando no hay resultados', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/buscar alumno/i);
      fireEvent.change(searchInput, { target: { value: 'NoExiste' } });

      await waitFor(() => {
        expect(
          screen.getByText(/no se encontraron alumnos/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('debe manejar errores de API al asignar', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Error del servidor' }),
      } as Response);

      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Seleccionar sujeto
      const subjectCard = screen
        .getByText('Juan Pérez')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      // Asignar fotos
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText(/error al asignar/i)).toBeInTheDocument();
      });
    });

    it('debe manejar errores de red', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Seleccionar sujeto y asignar
      const subjectCard = screen
        .getByText('María García')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('debe mostrar loading durante asignación', async () => {
      // Mock fetch con delay
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true }),
                } as Response),
              100
            )
          )
      );

      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Seleccionar sujeto
      const subjectCard = screen
        .getByText('Juan Pérez')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      // Asignar fotos
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      expect(screen.getByText(/asignando/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/asignando/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('debe tener labels apropiados', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      expect(screen.getByLabelText(/buscar alumno/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filtrar por grado/i)).toBeInTheDocument();
    });

    it('debe manejar navegación por teclado', () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const tabs = screen.getAllByRole('button');
      tabs.forEach((tab) => {
        expect(tab).not.toHaveAttribute('disabled');
      });
    });

    it('debe anunciar cambios de estado', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      // Seleccionar sujeto
      const subjectCard = screen
        .getByText('Juan Pérez')
        .closest('.cursor-pointer')!;
      fireEvent.click(subjectCard);

      // Asignar fotos
      const assignButton = screen.getByText('Asignar Fotos Seleccionadas');
      fireEvent.click(assignButton);

      await waitFor(() => {
        const successMessage = screen.getByText(/fotos asignadas/i);
        expect(successMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance', () => {
    it('debe manejar grandes cantidades de sujetos eficientemente', () => {
      const manySubjects = Array.from({ length: 100 }, (_, i) => ({
        id: `subject-${i}`,
        name: `Estudiante ${i}`,
        grade_section: `${Math.floor(i / 20) + 1}A`,
        token: `token-${i}`,
        event_id: 'event-123',
        created_at: '2024-01-01T09:00:00Z',
        photo_count: Math.floor(Math.random() * 10),
      }));

      const propsWithManySubjects = {
        ...defaultProps,
        subjects: manySubjects,
      };

      render(<AdvancedTaggingSystem {...propsWithManySubjects} />);

      // Verificar que se renderizan eficientemente
      expect(screen.getByText('Estudiante 0')).toBeInTheDocument();
      expect(screen.getByText(/100 alumnos/)).toBeInTheDocument();
    });

    it('debe filtrar resultados sin lag', async () => {
      render(<AdvancedTaggingSystem {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/buscar alumno/i);

      // Escribir rápidamente
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Ju' } });
      fireEvent.change(searchInput, { target: { value: 'Jua' } });

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      });
    });
  });
});
