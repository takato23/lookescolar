/**
 * Tests para el componente DragDropUploader
 * Testing crítico para componente de subida de fotos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DragDropUploader from '@/components/admin/BulkPhotoUpload';

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-preview-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Helper para crear archivos de test
function createMockFile(
  name: string,
  size: number,
  type: string = 'image/jpeg'
) {
  const file = new File(['mock-content'], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
}

describe('DragDropUploader', () => {
  const defaultProps = {
    eventId: 'test-event-123',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          uploaded: [{ id: '1', filename: 'test.jpg' }],
          errors: [],
        }),
    } as Response);
  });

  describe('Rendering', () => {
    it('debe renderizar correctamente', () => {
      render(<DragDropUploader {...defaultProps} />);

      expect(screen.getByText('Arrastra fotos aquí')).toBeInTheDocument();
      expect(
        screen.getByText('o haz clic para seleccionar')
      ).toBeInTheDocument();
      expect(screen.getByText('Subir Fotos')).toBeInTheDocument();
    });

    it('debe mostrar estado deshabilitado', () => {
      render(<DragDropUploader {...defaultProps} disabled />);

      expect(screen.getByText('Subir Fotos')).toBeDisabled();
    });

    it('debe mostrar límites de archivos', () => {
      render(<DragDropUploader {...defaultProps} />);

      expect(screen.getByText(/Máximo 20 fotos/)).toBeInTheDocument();
      expect(screen.getByText(/25 MB por archivo/)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('debe permitir seleccionar archivos válidos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024 * 1024); // 1MB

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('debe rechazar archivos demasiado grandes', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const largeFile = createMockFile('large.jpg', 30 * 1024 * 1024); // 30MB

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/demasiado grande/i)).toBeInTheDocument();
      });
    });

    it('debe rechazar tipos de archivo inválidos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const textFile = createMockFile('document.txt', 1024, 'text/plain');

      fireEvent.change(input, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/tipo de archivo no válido/i)
        ).toBeInTheDocument();
      });
    });

    it('debe limitar a máximo 20 archivos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const files = Array.from({ length: 25 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 1024)
      );

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText(/máximo 20 archivos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drag & Drop', () => {
    it('debe manejar drag over', () => {
      render(<DragDropUploader {...defaultProps} />);

      const dropzone = screen.getByText('Arrastra fotos aquí').parentElement!;

      fireEvent.dragOver(dropzone);

      expect(dropzone).toHaveClass('border-primary-500');
    });

    it('debe manejar drag leave', () => {
      render(<DragDropUploader {...defaultProps} />);

      const dropzone = screen.getByText('Arrastra fotos aquí').parentElement!;

      fireEvent.dragOver(dropzone);
      fireEvent.dragLeave(dropzone);

      expect(dropzone).not.toHaveClass('border-primary-500');
    });

    it('debe manejar drop de archivos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const dropzone = screen.getByText('Arrastra fotos aquí').parentElement!;
      const file = createMockFile('dropped.jpg', 1024);

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('dropped.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('File Management', () => {
    it('debe permitir eliminar archivos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText(/eliminar test\.jpg/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar preview de archivos válidos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const preview = screen.getByAltText('Preview de test.jpg');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'mock-preview-url');
      });
    });

    it('debe mostrar información del archivo', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024 * 1024); // 1MB

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
        expect(screen.getByText('1.00 MB')).toBeInTheDocument();
        expect(screen.getByText('image/jpeg')).toBeInTheDocument();
      });
    });
  });

  describe('Upload Process', () => {
    it('debe subir archivos exitosamente', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Subir Fotos');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/photos/upload',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });

      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith([
        { id: '1', filename: 'test.jpg' },
      ]);
    });

    it('debe mostrar progreso durante subida', async () => {
      // Mock XMLHttpRequest para probar progreso
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        setRequestHeader: vi.fn(),
        addEventListener: vi.fn(),
        upload: {
          addEventListener: vi.fn(),
        },
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Subir Fotos');
      fireEvent.click(uploadButton);

      // Simular progreso
      const progressCallback = mockXHR.upload.addEventListener.mock.calls.find(
        (call) => call[0] === 'progress'
      )?.[1];

      if (progressCallback) {
        progressCallback({ loaded: 512, total: 1024 });

        await waitFor(() => {
          expect(screen.getByText('50%')).toBeInTheDocument();
        });
      }
    });

    it('debe manejar errores de subida', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Error del servidor' }),
      } as Response);

      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Subir Fotos');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(defaultProps.onUploadError).toHaveBeenCalled();
      });
    });

    it('debe permitir pausar y reanudar subida', async () => {
      // Mock XMLHttpRequest
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(),
        setRequestHeader: vi.fn(),
        addEventListener: vi.fn(),
        upload: {
          addEventListener: vi.fn(),
        },
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Subir Fotos');
      fireEvent.click(uploadButton);

      // Verificar que hay botón de pausa
      await waitFor(() => {
        expect(screen.getByLabelText(/pausar/i)).toBeInTheDocument();
      });

      const pauseButton = screen.getByLabelText(/pausar/i);
      fireEvent.click(pauseButton);

      expect(mockXHR.abort).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('debe validar tipos de archivo permitidos', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
      ];
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];

      for (const type of validTypes) {
        const file = createMockFile('test.jpg', 1024, type);
        const input = screen.getByLabelText(/seleccionar archivos/i);

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
          expect(
            screen.queryByText(/tipo de archivo no válido/i)
          ).not.toBeInTheDocument();
        });
      }

      for (const type of invalidTypes) {
        const file = createMockFile('invalid', 1024, type);
        const input = screen.getByLabelText(/seleccionar archivos/i);

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
          expect(
            screen.getByText(/tipo de archivo no válido/i)
          ).toBeInTheDocument();
        });

        // Limpiar para próximo test
        const clearButton = screen.getByLabelText(/limpiar todo/i);
        fireEvent.click(clearButton);
      }
    });

    it('debe validar tamaño máximo de 25MB', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const validFile = createMockFile('valid.jpg', 20 * 1024 * 1024); // 20MB
      const invalidFile = createMockFile('invalid.jpg', 30 * 1024 * 1024); // 30MB

      const input = screen.getByLabelText(/seleccionar archivos/i);

      // Archivo válido
      fireEvent.change(input, { target: { files: [validFile] } });
      await waitFor(() => {
        expect(screen.getByText('valid.jpg')).toBeInTheDocument();
        expect(screen.queryByText(/demasiado grande/i)).not.toBeInTheDocument();
      });

      // Limpiar
      const clearButton = screen.getByLabelText(/limpiar todo/i);
      fireEvent.click(clearButton);

      // Archivo inválido
      fireEvent.change(input, { target: { files: [invalidFile] } });
      await waitFor(() => {
        expect(screen.getByText(/demasiado grande/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('debe generar previews de forma eficiente', async () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const files = Array.from({ length: 5 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 1024)
      );

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalledTimes(5);
      });

      createObjectURLSpy.mockRestore();
    });

    it('debe limpiar object URLs al eliminar archivos', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const file = createMockFile('test.jpg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText(/eliminar test\.jpg/i);
      fireEvent.click(removeButton);

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('mock-preview-url');

      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('debe tener labels apropiados', () => {
      render(<DragDropUploader {...defaultProps} />);

      expect(
        screen.getByLabelText(/seleccionar archivos/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Subir Fotos')).toBeInTheDocument();
    });

    it('debe manejar navegación por teclado', () => {
      render(<DragDropUploader {...defaultProps} />);

      const uploadButton = screen.getByText('Subir Fotos');

      expect(uploadButton).toHaveAttribute('type', 'button');
      expect(uploadButton).not.toHaveAttribute('disabled');
    });

    it('debe mostrar estados de error accesibles', async () => {
      render(<DragDropUploader {...defaultProps} />);

      const input = screen.getByLabelText(/seleccionar archivos/i);
      const invalidFile = createMockFile('invalid.txt', 1024, 'text/plain');

      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        const errorMessage = screen.getByText(/tipo de archivo no válido/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});
