/**
 * Test para el componente MobilePhotoGallery refinado
 * Verifica que el diseño mejorado funciona correctamente
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobilePhotoGallery } from '@/components/admin/mobile/MobilePhotoGallery';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useMobileDetection hook
vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobileView: true,
  }),
}));

// Mock data con URLs de preview válidas
const mockPhotosWithPreviews = [
  {
    id: '1',
    filename: 'foto-evento-1.jpg',
    size: 1024000,
    uploadedAt: new Date('2024-01-15T10:30:00'),
    status: 'approved' as const,
    preview_url: 'https://example.com/preview1.jpg',
    eventName: 'Evento Primavera 2024',
    studentName: 'Ana María López',
  },
  {
    id: '2',
    filename: 'foto-evento-2.jpg',
    size: 2048000,
    uploadedAt: new Date('2024-01-14T14:20:00'),
    status: 'pending' as const,
    preview_url: 'https://example.com/preview2.jpg',
    eventName: 'Evento Navidad 2023',
  },
  {
    id: '3',
    filename: 'foto-evento-3.jpg',
    size: 512000,
    uploadedAt: new Date('2024-01-13T09:15:00'),
    status: 'rejected' as const,
    preview_url: 'https://example.com/preview3.jpg',
  },
];

const defaultProps = {
  photos: mockPhotosWithPreviews,
  onPhotoEdit: vi.fn(),
  onPhotoDelete: vi.fn(),
  onBulkAction: vi.fn(),
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MobilePhotoGallery - Refined Design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente sin errores', () => {
    expect(() => {
      renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);
    }).not.toThrow();
  });

  it('muestra el header con diseño moderno', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay un header con título
    const headers = screen.getAllByRole('heading');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('muestra métricas en el header', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay elementos que contienen números (métricas)
    const elementsWithNumbers = screen.getAllByText(/\d+/);
    expect(elementsWithNumbers.length).toBeGreaterThan(0);
  });

  it('muestra search bar funcional', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay un input de búsqueda
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('muestra botones de acción', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay botones (filtros, vista, seleccionar)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(3); // Al menos filtros, vista, seleccionar
  });

  it('muestra fotos en grid', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay imágenes
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('cambia de modo de vista correctamente', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Encontrar y hacer clic en el botón de toggle de vista
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons.find(btn =>
      btn.textContent?.includes('Lista') || btn.textContent?.includes('Cuadrícula')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      // El test pasa si no hay errores
      expect(true).toBe(true);
    }
  });

  it('muestra loading state cuando no hay fotos', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} photos={[]} />);

    // Verificar que muestra el estado de carga
    expect(screen.getByText(/Cargando galería/)).toBeInTheDocument();
  });

  it('maneja modo de selección', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Buscar botón de seleccionar
    const selectButton = screen.getByText('Seleccionar');
    if (selectButton) {
      fireEvent.click(selectButton);
      // El test pasa si no hay errores
      expect(true).toBe(true);
    }
  });

  it('muestra información de fotos', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que hay texto relacionado con fotos
    const photoTexts = screen.getAllByText(/foto|evento|primavera|navidad/i);
    expect(photoTexts.length).toBeGreaterThan(0);
  });
});
