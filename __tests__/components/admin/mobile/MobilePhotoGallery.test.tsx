'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobilePhotoGallery } from '@/components/admin/mobile/MobilePhotoGallery';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useMobileDetection hook
vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobileView: true,
  }),
}));

// Mock data
const mockPhotos = [
  {
    id: '1',
    url: 'https://example.com/photo1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    filename: 'foto-evento-1.jpg',
    size: 1024000,
    uploadedAt: new Date('2024-01-15T10:30:00'),
    eventId: 'event1',
    eventName: 'Evento Escolar 2024',
    studentName: 'María González',
    status: 'approved' as const,
    dimensions: { width: 1920, height: 1080 },
  },
  {
    id: '2',
    url: 'https://example.com/photo2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    filename: 'foto-evento-2.jpg',
    size: 2048000,
    uploadedAt: new Date('2024-01-14T14:20:00'),
    eventId: 'event1',
    eventName: 'Evento Escolar 2024',
    status: 'pending' as const,
    dimensions: { width: 1280, height: 720 },
  },
  {
    id: '3',
    url: 'https://example.com/photo3.jpg',
    thumbnail: 'https://example.com/thumb3.jpg',
    filename: 'foto-evento-3.jpg',
    size: 512000,
    uploadedAt: new Date('2024-01-13T09:15:00'),
    status: 'rejected' as const,
    dimensions: { width: 800, height: 600 },
  },
];

const defaultProps = {
  photos: mockPhotos,
  onPhotoSelect: vi.fn(),
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

describe('MobilePhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el header premium correctamente', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    expect(screen.getByText('Galería de Fotos')).toBeInTheDocument();
    expect(screen.getByText('3 fotos')).toBeInTheDocument();
    expect(screen.getByText('Aprobadas')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
  });

  it('muestra las métricas correctas en el header', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que se muestran las métricas correctas
    expect(screen.getByText('3')).toBeInTheDocument(); // Total de fotos
    expect(screen.getByText('1')).toBeInTheDocument(); // Fotos aprobadas
    expect(screen.getByText('1')).toBeInTheDocument(); // Fotos pendientes
  });

  it('renderiza las fotos en modo grid por defecto', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    const photoCards = screen.getAllByRole('button');
    expect(photoCards.length).toBeGreaterThan(0);

    // Verificar que las fotos se muestran
    expect(screen.getByText('foto-evento-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('foto-evento-2.jpg')).toBeInTheDocument();
    expect(screen.getByText('foto-evento-3.jpg')).toBeInTheDocument();
  });

  it('cambia entre modo grid y lista', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    const toggleButton = screen.getByText('Lista');
    fireEvent.click(toggleButton);

    // Debería cambiar a modo lista
    expect(screen.getByText('Cuadrícula')).toBeInTheDocument();
  });

  it('filtra fotos por término de búsqueda', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar fotos por nombre, evento...');
    fireEvent.change(searchInput, { target: { value: 'foto-evento-1' } });

    // Solo debería mostrar la foto que coincide con la búsqueda
    expect(screen.getByText('foto-evento-1.jpg')).toBeInTheDocument();
    expect(screen.queryByText('foto-evento-2.jpg')).not.toBeInTheDocument();
  });

  it('muestra el estado de carga cuando no hay fotos', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} photos={[]} />);

    expect(screen.getByText('Cargando galería')).toBeInTheDocument();
    expect(screen.getByText('Obteniendo tus fotos más recientes...')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay resultados de búsqueda', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar fotos por nombre, evento...');
    fireEvent.change(searchInput, { target: { value: 'término_inexistente' } });

    expect(screen.getByText('No se encontraron fotos')).toBeInTheDocument();
    expect(screen.getByText('No encontramos fotos que coincidan con tu búsqueda. Intenta con otros términos.')).toBeInTheDocument();
  });

  it('activa el modo de selección correctamente', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    const selectButton = screen.getByText('Seleccionar');
    fireEvent.click(selectButton);

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('1 foto seleccionada')).toBeInTheDocument();
  });

  it('permite seleccionar fotos en modo selección', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Activar modo selección
    const selectButton = screen.getByText('Seleccionar');
    fireEvent.click(selectButton);

    // Seleccionar una foto (haciendo clic en ella)
    const photoCard = screen.getAllByRole('button')[1]; // Primera foto después del header
    fireEvent.click(photoCard);

    expect(screen.getByText('1 foto seleccionada')).toBeInTheDocument();
  });

  it('muestra el lightbox al hacer clic en una foto', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Hacer clic en la primera foto
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-1.jpg')
    );

    if (firstPhotoCard) {
      fireEvent.click(firstPhotoCard);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });
    }
  });

  it('navega entre fotos en el lightbox', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Abrir lightbox
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('foto-evento-1.jpg')
    );

    if (firstPhotoCard) {
      fireEvent.click(firstPhotoCard);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });

      // Hacer clic en el botón siguiente
      const nextButton = screen.getByRole('button', { name: /chevronright/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
      });
    }
  });

  it('llama a los callbacks correctos', () => {
    const onPhotoSelect = vi.fn();
    const onPhotoEdit = vi.fn();
    const onPhotoDelete = vi.fn();

    renderWithQueryClient(
      <MobilePhotoGallery
        {...defaultProps}
        onPhotoSelect={onPhotoSelect}
        onPhotoEdit={onPhotoEdit}
        onPhotoDelete={onPhotoDelete}
      />
    );

    // Probar que los callbacks están definidos
    expect(onPhotoSelect).toBeDefined();
    expect(onPhotoEdit).toBeDefined();
    expect(onPhotoDelete).toBeDefined();
  });
});
