/**
 * Tests para componente PhotoUploader mejorado
 * Valida drag & drop, progress, manejo de errores y duplicados
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoUploader from '@/components/admin/PhotoUploader';

// Mock fetch para simular API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock XMLHttpRequest para progress
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn()
  },
  status: 200,
  responseText: ''
};

Object.defineProperty(global, 'XMLHttpRequest', {
  value: vi.fn(() => mockXHR)
});

// Helper para crear archivos de prueba
const createTestFile = (
  name: string, 
  type: string = 'image/jpeg',
  size: number = 1024 * 1024 // 1MB
): File => {
  const buffer = new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });
  const file = new File([blob], name, { type });
  
  // Mock del FileReader
  Object.defineProperty(file, 'size', { value: size });
  
  return file;
};

describe('PhotoUploader Enhanced', () => {
  const defaultProps = {
    eventId: 'test-event-id',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock FileReader para previews
    Object.defineProperty(global, 'FileReader', {
      value: vi.fn().mockImplementation(() => ({
        readAsDataURL: vi.fn(function() {
          this.onload({ target: { result: 'data:image/jpeg;base64,mock' } });
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });
  });

  describe('Interfaz y interacciones básicas', () => {
    it('debe renderizar la zona de drop correctamente', () => {
      render(<PhotoUploader {...defaultProps} />);
      
      expect(screen.getByText(/Arrastra las fotos aquí/)).toBeInTheDocument();
      expect(screen.getByText(/selecciona archivos/)).toBeInTheDocument();
      expect(screen.getByText(/Máximo 20 archivos/)).toBeInTheDocument();
    });

    it('debe permitir seleccionar archivos con input', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /selecciona archivos/ });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const testFiles = [
        createTestFile('test1.jpg'),
        createTestFile('test2.jpg')
      ];

      // Simular selección de archivos
      Object.defineProperty(fileInput, 'files', {
        value: testFiles,
        configurable: true
      });

      await user.click(input);
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Archivos seleccionados (2)')).toBeInTheDocument();
        expect(screen.getByText('test1.jpg')).toBeInTheDocument();
        expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      });
    });

    it('debe manejar drag and drop', async () => {
      render(<PhotoUploader {...defaultProps} />);
      
      const dropZone = screen.getByText(/Arrastra las fotos aquí/).closest('.border-dashed');
      const testFiles = [createTestFile('dropped.jpg')];

      // Simular drag over
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          files: testFiles
        }
      });

      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');

      // Simular drop
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: testFiles
        }
      });

      await waitFor(() => {
        expect(screen.getByText('dropped.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Validaciones de archivos', () => {
    it('debe rechazar archivos muy grandes', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} maxSizeBytes={5 * 1024 * 1024} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = createTestFile('large.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile]
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/Archivo muy grande/)).toBeInTheDocument();
      });
    });

    it('debe rechazar tipos de archivo no válidos', async () => {
      render(<PhotoUploader {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const textFile = createTestFile('document.txt', 'text/plain');
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile]
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/Tipo de archivo no válido/)).toBeInTheDocument();
      });
    });

    it('debe limitar el número máximo de archivos', async () => {
      render(<PhotoUploader {...defaultProps} maxFiles={3} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = Array.from({ length: 5 }, (_, i) => createTestFile(`test${i}.jpg`));
      
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      Object.defineProperty(fileInput, 'files', {
        value: files
      });

      fireEvent.change(fileInput);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('No se pueden agregar más de 3 archivos')
      );
    });
  });

  describe('Proceso de upload', () => {
    it('debe mostrar progress bar durante el upload', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Mock respuesta exitosa
      const mockResponse = {
        success: true,
        uploaded: [{
          id: 'test-id',
          filename: 'test.jpg',
          size: 1024,
          width: 800,
          height: 600,
          path: 'photos/test.webp'
        }],
        stats: {
          processed: 1,
          errors: 0,
          duplicates: 0,
          total: 1
        }
      };

      mockXHR.responseText = JSON.stringify(mockResponse);

      // Simular click en upload
      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      // Verificar que muestra estado de carga
      expect(screen.getByText(/Subiendo.../)).toBeInTheDocument();

      // Simular progreso
      const progressHandler = mockXHR.upload.addEventListener.mock.calls
        .find(call => call[0] === 'progress')?.[1];
      
      if (progressHandler) {
        progressHandler({
          lengthComputable: true,
          loaded: 50,
          total: 100
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Progreso global: 50%/)).toBeInTheDocument();
      });

      // Simular finalización
      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }
    });

    it('debe manejar respuesta con duplicados', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivos
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createTestFile('original.jpg'),
        createTestFile('duplicate.jpg')
      ];
      
      Object.defineProperty(fileInput, 'files', {
        value: files
      });

      fireEvent.change(fileInput);

      // Mock respuesta con duplicados
      const mockResponse = {
        success: true,
        uploaded: [{
          id: 'test-id',
          filename: 'original.jpg',
          size: 1024,
          width: 800,
          height: 600,
          path: 'photos/original.webp'
        }],
        duplicates: [{
          originalName: 'duplicate.jpg',
          duplicateOf: 'original.jpg',
          hash: 'abcd1234567890ef'
        }],
        stats: {
          processed: 1,
          errors: 0,
          duplicates: 1,
          total: 2
        }
      };

      mockXHR.responseText = JSON.stringify(mockResponse);

      const uploadButton = screen.getByText(/Subir 2 archivos/);
      await user.click(uploadButton);

      // Simular finalización
      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      await waitFor(() => {
        expect(screen.getByText('1 exitosos')).toBeInTheDocument();
        expect(screen.getByText('1 duplicados')).toBeInTheDocument();
        expect(screen.getByText(/Duplicado de original.jpg/)).toBeInTheDocument();
        expect(screen.getByText(/hash: abcd1234/)).toBeInTheDocument();
      });
    });

    it('debe manejar errores de upload', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      // Mock respuesta con error
      const mockResponse = {
        success: false,
        uploaded: [],
        errors: [{
          filename: 'test.jpg',
          error: 'Upload server error'
        }],
        stats: {
          processed: 0,
          errors: 1,
          duplicates: 0,
          total: 1
        }
      };

      mockXHR.responseText = JSON.stringify(mockResponse);

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      // Simular finalización con error
      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      await waitFor(() => {
        expect(screen.getByText('1 con errores')).toBeInTheDocument();
        expect(screen.getByText('Upload server error')).toBeInTheDocument();
      });
    });

    it('debe manejar errores de red', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      // Simular error de red
      const errorHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1];
      
      if (errorHandler) {
        errorHandler();
      }

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error al subir archivos');
      });
    });
  });

  describe('Gestión de archivos', () => {
    it('debe permitir eliminar archivos individuales', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivos
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createTestFile('file1.jpg'),
        createTestFile('file2.jpg')
      ];
      
      Object.defineProperty(fileInput, 'files', {
        value: files
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Archivos seleccionados (2)')).toBeInTheDocument();
      });

      // Eliminar primer archivo
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const firstDeleteButton = deleteButtons.find(btn => 
        btn.querySelector('svg') && btn.closest('.p-1')
      );
      
      if (firstDeleteButton) {
        await user.click(firstDeleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Archivos seleccionados (1)')).toBeInTheDocument();
      });
    });

    it('debe permitir limpiar todos los archivos', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivos
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createTestFile('file1.jpg'),
        createTestFile('file2.jpg')
      ];
      
      Object.defineProperty(fileInput, 'files', {
        value: files
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Archivos seleccionados (2)')).toBeInTheDocument();
      });

      // Click en limpiar todo
      const clearButton = screen.getByText('Limpiar todo');
      await user.click(clearButton);

      expect(screen.queryByText('Archivos seleccionados')).not.toBeInTheDocument();
    });
  });

  describe('Estados y feedback visual', () => {
    it('debe mostrar preview de imágenes', async () => {
      render(<PhotoUploader {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('image.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        const preview = screen.getByAltText('image.jpg');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,mock');
      });
    });

    it('debe mostrar iconos de estado correctos', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      // Estado pending - círculo vacío
      await waitFor(() => {
        expect(document.querySelector('.border-gray-300')).toBeInTheDocument();
      });

      // Mock respuesta exitosa
      mockXHR.responseText = JSON.stringify({
        success: true,
        uploaded: [{ id: 'test', filename: 'test.jpg', size: 1024, width: 800, height: 600 }],
        stats: { processed: 1, errors: 0, duplicates: 0, total: 1 }
      });

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      // Estado uploading - spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Simular finalización exitosa
      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      // Estado success - check circle
      await waitFor(() => {
        expect(document.querySelector('.text-green-600')).toBeInTheDocument();
      });
    });

    it('debe mostrar estadísticas detalladas post-upload', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...defaultProps} />);
      
      // Agregar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      // Mock respuesta con estadísticas
      const mockResponse = {
        success: true,
        uploaded: [{
          id: 'test-id',
          filename: 'test.jpg',
          size: 1024,
          width: 800,
          height: 600
        }],
        stats: {
          processed: 3,
          errors: 1,
          duplicates: 1,
          total: 5
        }
      };

      mockXHR.responseText = JSON.stringify(mockResponse);

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      // Simular finalización
      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      await waitFor(() => {
        expect(screen.getByText('Estadísticas del upload:')).toBeInTheDocument();
        expect(screen.getByText('Procesados: 3')).toBeInTheDocument();
        expect(screen.getByText('Errores: 1')).toBeInTheDocument();
        expect(screen.getByText('Duplicados: 1')).toBeInTheDocument();
        expect(screen.getByText('Total: 5')).toBeInTheDocument();
      });
    });
  });

  describe('Callbacks y props', () => {
    it('debe llamar onUploadComplete con resultados', async () => {
      const user = userEvent.setup();
      const onUploadComplete = vi.fn();
      
      render(<PhotoUploader {...defaultProps} onUploadComplete={onUploadComplete} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      const mockUploaded = [{
        id: 'test-id',
        filename: 'test.jpg',
        size: 1024,
        width: 800,
        height: 600
      }];

      mockXHR.responseText = JSON.stringify({
        success: true,
        uploaded: mockUploaded,
        stats: { processed: 1, errors: 0, duplicates: 0, total: 1 }
      });

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledWith(mockUploaded);
      });
    });

    it('debe llamar onUploadError con errores', async () => {
      const user = userEvent.setup();
      const onUploadError = vi.fn();
      
      render(<PhotoUploader {...defaultProps} onUploadError={onUploadError} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = createTestFile('test.jpg');
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile]
      });

      fireEvent.change(fileInput);

      const mockErrors = [{
        filename: 'test.jpg',
        error: 'Upload failed'
      }];

      mockXHR.responseText = JSON.stringify({
        success: false,
        uploaded: [],
        errors: mockErrors,
        stats: { processed: 0, errors: 1, duplicates: 0, total: 1 }
      });

      const uploadButton = screen.getByText(/Subir 1 archivos/);
      await user.click(uploadButton);

      const loadHandler = mockXHR.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1];
      
      if (loadHandler) {
        loadHandler();
      }

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalledWith(mockErrors);
      });
    });
  });
});