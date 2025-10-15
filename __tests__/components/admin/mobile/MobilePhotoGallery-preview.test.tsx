/**
 * Test específico para verificar que las URLs de preview se carguen correctamente
 * en el componente MobilePhotoGallery
 */

import { render, screen, waitFor } from '@testing-library/react';
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

// Mock data con URLs de preview válidas
const mockPhotosWithPreviews = [
  {
    id: '1',
    filename: 'test-photo-1.jpg',
    size: 1024000,
    uploadedAt: new Date('2024-01-15T10:30:00'),
    status: 'approved' as const,
    preview_url: 'https://example.com/preview1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    eventName: 'Evento Test',
    studentName: 'Estudiante Test',
  },
  {
    id: '2',
    filename: 'test-photo-2.jpg',
    size: 2048000,
    uploadedAt: new Date('2024-01-14T14:20:00'),
    status: 'pending' as const,
    preview_url: 'https://example.com/preview2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    eventName: 'Evento Test 2',
  },
  {
    id: '3',
    filename: 'test-photo-3.jpg',
    size: 512000,
    uploadedAt: new Date('2024-01-13T09:15:00'),
    status: 'rejected' as const,
    preview_url: 'https://example.com/preview3.jpg',
    thumbnail: 'https://example.com/thumb3.jpg',
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

describe('MobilePhotoGallery Preview URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza las fotos con URLs de preview', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que se muestre el header
    expect(screen.getByText('Galería de Fotos')).toBeInTheDocument();
    expect(screen.getByText('3 fotos')).toBeInTheDocument();

    // Verificar que las fotos se estén renderizando
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    // Verificar que las imágenes tengan las URLs correctas
    const images = screen.getAllByRole('img');
    images.forEach((img, index) => {
      if (index < 3) { // Solo las primeras 3 imágenes (las fotos)
        expect(img).toHaveAttribute('src');
        expect(img.getAttribute('src')).toContain('example.com/preview');
      }
    });
  });

  it('muestra placeholder cuando las imágenes fallan en cargar', async () => {
    // Crear fotos con URLs que fallarán
    const photosWithBadUrls = [
      {
        ...mockPhotosWithPreviews[0],
        preview_url: 'https://bad-url-that-will-fail.com/image.jpg',
      },
    ];

    renderWithQueryClient(
      <MobilePhotoGallery
        {...defaultProps}
        photos={photosWithBadUrls}
      />
    );

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    // Simular error de carga
    const images = screen.getAllByRole('img');
    const firstImage = images[0];

    // Trigger error event
    const errorEvent = new Event('error');
    firstImage.dispatchEvent(errorEvent);

    // Verificar que se cambió al placeholder
    await waitFor(() => {
      expect(firstImage).toHaveAttribute('src', '/placeholder-image.svg');
    });
  });

  it('usa URLs de preview en el lightbox', async () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Abrir la primera foto
    const photoCards = screen.getAllByRole('button');
    const firstPhotoCard = photoCards.find(card =>
      card.textContent?.includes('test-photo-1.jpg')
    );

    if (firstPhotoCard) {
      firstPhotoCard.click();

      // Verificar que se abra el lightbox
      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });

      // Verificar que la imagen del lightbox tenga la URL correcta
      const lightboxImage = screen.getByRole('img', { hidden: true });
      expect(lightboxImage).toHaveAttribute('src');
      expect(lightboxImage.getAttribute('src')).toContain('example.com/preview');
    }
  });

  it('muestra información correcta de las fotos', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar que se muestre información de las fotos
    expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-photo-2.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-photo-3.jpg')).toBeInTheDocument();
  });

  it('muestra métricas correctas', () => {
    renderWithQueryClient(<MobilePhotoGallery {...defaultProps} />);

    // Verificar métricas
    expect(screen.getByText('3')).toBeInTheDocument(); // Total de fotos
    expect(screen.getByText('1')).toBeInTheDocument(); // Aprobadas
    expect(screen.getByText('1')).toBeInTheDocument(); // Pendientes
    expect(screen.getByText('1')).toBeInTheDocument(); // Rechazadas
  });
});
