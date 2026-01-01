import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedStorePage from '@/app/store-unified/[token]/page';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      store: { name: 'Tienda Test' },
      assets: [
        {
          id: '1',
          url: '/photo1.jpg',
          preview_url: '/preview1.jpg',
          alt: 'Foto de prueba',
          student: 'Juan Pérez'
        }
      ],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false }
    })
  })
);

const mockSettings = {
  enabled: true,
  template: 'pixieset',
  currency: 'ARS',
  products: {
    opcionA: {
      name: 'Opción A',
      price: 200000,
      enabled: true,
      description: 'Paquete básico'
    }
  }
};

// Mock del componente de template
jest.mock('@/components/store/templates/PixiesetTemplate', () => ({
  PixiesetTemplate: ({ photos, totalPhotos, hasMorePhotos, loadingMore, onLoadMorePhotos }: any) => (
    <div data-testid="pixieset-template">
      <div data-testid="photos-count">{photos.length}</div>
      <div data-testid="total-photos">{totalPhotos}</div>
      <div data-testid="has-more">{hasMorePhotos ? 'true' : 'false'}</div>
      <div data-testid="loading-more">{loadingMore ? 'true' : 'false'}</div>
      <button onClick={onLoadMorePhotos} data-testid="load-more">Cargar mas</button>
    </div>
  )
}));

jest.mock('@/components/store/templates/PremiumStoreTemplate', () => ({
  PremiumStoreTemplate: () => <div data-testid="premium-template" />
}));

// Mock de los providers
jest.mock('@/components/providers/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/components/ui/ErrorBoundary', () => ({
  StoreErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/components/ui/theme-toggle-enhanced', () => ({
  ThemeToggleSimple: () => <div data-testid="theme-toggle">Toggle</div>
}));

// Mock del servicio de inicialización
jest.mock('@/lib/services/store-initialization.service', () => ({
  GUARANTEED_SETTINGS: mockSettings
}));

describe('UnifiedStorePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('debe cargar y mostrar fotos correctamente', async () => {
    renderWithProviders(<UnifiedStorePage />);

    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('1');
    });
  });

  it('debe mostrar error cuando falla la carga', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    renderWithProviders(<UnifiedStorePage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar galería no disponible cuando no hay fotos', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          store: { name: 'Tienda Vacía' },
          assets: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
        })
      })
    );

    renderWithProviders(<UnifiedStorePage />);

    await waitFor(() => {
      expect(screen.getByText('Galería no disponible')).toBeInTheDocument();
      expect(screen.getByText('No se encontraron fotos en esta galería.')).toBeInTheDocument();
    });
  });

  it('debe mostrar botón de reintento cuando hay error', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    renderWithProviders(<UnifiedStorePage />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('debe mostrar loading state inicialmente', () => {
    renderWithProviders(<UnifiedStorePage />);

    expect(screen.getByText('Cargando galería...')).toBeInTheDocument();
  });
});

