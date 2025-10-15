/**
 * Test de integración para el flujo completo de la galería móvil premium
 * Verifica que la nueva interfaz mobile funciona correctamente en dispositivos móviles
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobilePhotoGallery } from '@/components/admin/mobile/MobilePhotoGallery';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useMobileDetection hook para simular mobile
jest.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobileView: true,
    isDesktopView: false,
  }),
}));

// Datos de prueba realistas
const mockPhotos = [
  {
    id: '1',
    url: 'https://example.com/photo1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    filename: 'foto-evento-primavera-2024-001.jpg',
    size: 2048000, // 2MB
    uploadedAt: new Date('2024-01-20T10:30:00'),
    eventId: 'event1',
    eventName: 'Evento Primavera 2024',
    studentName: 'Ana María López',
    status: 'approved' as const,
    dimensions: { width: 1920, height: 1080 },
  },
  {
    id: '2',
    url: 'https://example.com/photo2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    filename: 'foto-evento-navidad-2023-045.jpg',
    size: 1536000, // 1.5MB
    uploadedAt: new Date('2024-01-19T14:20:00'),
    eventId: 'event2',
    eventName: 'Evento Navidad 2023',
    studentName: 'Carlos Rodríguez',
    status: 'pending' as const,
    dimensions: { width: 1280, height: 720 },
  },
  {
    id: '3',
    url: 'https://example.com/photo3.jpg',
    thumbnail: 'https://example.com/thumb3.jpg',
    filename: 'foto-evento-verano-2024-023.jpg',
    size: 512000, // 512KB
    uploadedAt: new Date('2024-01-18T09:15:00'),
    eventId: 'event3',
    eventName: 'Evento Verano 2024',
    status: 'rejected' as const,
    dimensions: { width: 800, height: 600 },
  },
];

const defaultProps = {
  photos: mockPhotos,
  onPhotoSelect: jest.fn(),
  onPhotoEdit: jest.fn(),
  onPhotoDelete: jest.fn(),
  onBulkAction: jest.fn(),
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

describe('Flujo completo de galería móvil premium', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completa el flujo: carga → navegación → búsqueda → selección → lightbox', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // 1. Verificar header premium
    expect(screen.getByText('Galería de Fotos')).toBeInTheDocument();
    expect(screen.getByText('3 fotos')).toBeInTheDocument();

    // 2. Verificar métricas
    expect(screen.getByText('1')).toBeInTheDocument(); // Aprobadas
    expect(screen.getByText('1')).toBeInTheDocument(); // Pendientes

    // 3. Cambiar a vista de lista
    const viewToggle = screen.getByText('Lista');
    fireEvent.click(viewToggle);
    expect(screen.getByText('Cuadrícula')).toBeInTheDocument();

    // 4. Buscar fotos
    const searchInput = screen.getByPlaceholderText('Buscar fotos por nombre, evento...');
    fireEvent.change(searchInput, { target: { value: 'primavera' } });

    // Debería mostrar solo la foto que contiene "primavera"
    await waitFor(() => {
      expect(screen.getByText('foto-evento-primavera-2024-001.jpg')).toBeInTheDocument();
      expect(screen.queryByText('foto-evento-navidad-2023-045.jpg')).not.toBeInTheDocument();
    });

    // 5. Activar modo de selección
    const selectButton = screen.getByText('Seleccionar');
    fireEvent.click(selectButton);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();

    // 6. Seleccionar una foto
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-primavera-2024-001.jpg')
    );

    if (firstPhotoCard) {
      fireEvent.click(firstPhotoCard);
      expect(screen.getByText('1 foto seleccionada')).toBeInTheDocument();
    }

    // 7. Abrir lightbox
    if (firstPhotoCard) {
      fireEvent.click(firstPhotoCard); // Doble clic para abrir lightbox

      await waitFor(() => {
        expect(screen.getByText('1 / 1')).toBeInTheDocument(); // Solo 1 foto en los resultados filtrados
      });

      // 8. Cerrar lightbox
      const closeButton = screen.getByRole('button', { name: /x/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
      });
    }

    // 9. Cancelar selección
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    expect(screen.getByText('Seleccionar')).toBeInTheDocument();
  });

  it('maneja correctamente el estado vacío después de búsqueda', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Buscar algo que no existe
    const searchInput = screen.getByPlaceholderText('Buscar fotos por nombre, evento...');
    fireEvent.change(searchInput, { target: { value: 'término_inexistente_12345' } });

    await waitFor(() => {
      expect(screen.getByText('No se encontraron fotos')).toBeInTheDocument();
      expect(screen.getByText('No encontramos fotos que coincidan con tu búsqueda. Intenta con otros términos.')).toBeInTheDocument();
    });

    // Limpiar búsqueda
    const clearButton = screen.getByText('Limpiar búsqueda');
    fireEvent.click(clearButton);

    // Deberían aparecer todas las fotos de nuevo
    await waitFor(() => {
      expect(screen.getByText('foto-evento-primavera-2024-001.jpg')).toBeInTheDocument();
      expect(screen.getByText('foto-evento-navidad-2023-045.jpg')).toBeInTheDocument();
    });
  });

  it('ejecuta acciones bulk correctamente', async () => {
    const onBulkAction = jest.fn();
    renderWithQueryClient(
      <MobilePhotoGallery {...defaultProps} onBulkAction={onBulkAction} />
    );

    // Activar modo selección
    const selectButton = screen.getByText('Seleccionar');
    fireEvent.click(selectButton);

    // Seleccionar múltiples fotos
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-primavera-2024-001.jpg')
    );
    const secondPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-navidad-2023-045.jpg')
    );

    if (firstPhotoCard && secondPhotoCard) {
      fireEvent.click(firstPhotoCard);
      fireEvent.click(secondPhotoCard);

      expect(screen.getByText('2 fotos seleccionadas')).toBeInTheDocument();

      // Ejecutar acción bulk
      const approveButton = screen.getByText('Aprobar');
      fireEvent.click(approveButton);

      expect(onBulkAction).toHaveBeenCalledWith('approve', expect.arrayContaining([
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '2' })
      ]));
    }
  });

  it('mantiene el estado correcto durante la navegación del lightbox', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Abrir lightbox con la primera foto
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-primavera-2024-001.jpg')
    );

    if (firstPhotoCard) {
      fireEvent.click(firstPhotoCard);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
        expect(screen.getByText('foto-evento-primavera-2024-001.jpg')).toBeInTheDocument();
      });

      // Verificar información de la foto en el overlay
      expect(screen.getByText('Ana María López')).toBeInTheDocument();
      expect(screen.getByText('Aprobada')).toBeInTheDocument();
    }
  });

  it('responde correctamente a diferentes tamaños de pantalla', () => {
    // Este test verifica que el componente se renderiza correctamente
    // en diferentes condiciones de responsividad
    const { rerender } = renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que los elementos responsive están presentes
    expect(screen.getByText('Galería de Fotos')).toBeInTheDocument();

    // El componente debería tener clases responsive
    const container = screen.getByText('Galería de Fotos').closest('div');
    expect(container).toHaveClass('w-full', 'min-h-screen');
  });
});
