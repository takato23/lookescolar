/**
 * Test para el componente MobileOrdersManager mejorado
 * Verifica funcionalidades premium: header con métricas, tarjetas con gradientes, búsqueda, filtros
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileOrdersManager } from '@/components/admin/mobile/MobileOrdersManager';

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

// Mock lucide-react icons para evitar problemas de renderizado
vi.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  ShoppingBag: () => <div data-testid="shopping-bag-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  CreditCard: () => <div data-testid="credit-card-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
}));

// Mock clsx
vi.mock('clsx', () => ({
  clsx: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      className={`${variant || 'default'} ${size || ''} ${className || ''} ${disabled ? 'disabled' : ''}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock data de pedidos actualizada con la nueva estructura
const mockOrders = [
  {
    id: 'order-1',
    status: 'pending_payment',
    payment_method: 'mercadopago',
    payment_status: 'pending',
    contact_info: {
      name: 'María González',
      email: 'maria@example.com',
      phone: '+549111234567',
    },
    event_name: 'Evento Primavera 2024',
    event_date: '2024-12-15T18:00:00Z',
    package_type: 'premium',
    selected_photos: {
      individual: ['photo-1', 'photo-2'],
      group: ['group-1'],
    },
    additional_copies: [
      { id: 'copy-1', type: '8x10', quantity: 2 },
    ],
    total_price: 50000,
    currency: 'ARS',
    production_notes: 'Imprimir con marco negro',
    tracking_number: 'TRACK123',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    token: 'token123',
  },
  {
    id: 'order-2',
    status: 'delivered',
    payment_method: 'transferencia',
    payment_status: 'paid',
    contact_info: {
      name: 'Carlos Rodríguez',
      email: 'carlos@example.com',
    },
    event_name: 'Evento Navidad 2023',
    event_date: '2024-01-10T20:00:00Z',
    package_type: 'basic',
    selected_photos: {
      individual: ['photo-3'],
    },
    additional_copies: [],
    total_price: 25000,
    currency: 'ARS',
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-12T16:00:00Z',
    token: 'token456',
  },
];

const mockStats = {
  total: 2,
  total_revenue: 75000,
  pending_payment: 1,
  delivered: 1,
};

const defaultProps = {
  orders: mockOrders,
  stats: mockStats,
  onOrderSelect: vi.fn(),
  onOrderUpdate: vi.fn(),
  onOrderCancel: vi.fn(),
  onViewSharedPhotos: vi.fn(),
  onRefresh: vi.fn(),
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

describe('MobileOrdersManager - Funcionalidades Premium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente sin errores', () => {
    expect(() => {
      renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);
    }).not.toThrow();
  });

  it('muestra el header premium con métricas visuales', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    // Verificar header premium
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Gestión de ventas')).toBeInTheDocument();

    // Verificar métricas
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Entregados')).toBeInTheDocument();

    // Verificar valores de métricas
    expect(screen.getByText('2')).toBeInTheDocument(); // Total
    expect(screen.getByText('$750.00')).toBeInTheDocument(); // Ingresos
    expect(screen.getByText('1')).toBeInTheDocument(); // Pendientes
    expect(screen.getByText('1')).toBeInTheDocument(); // Entregados
  });

  it('muestra la búsqueda premium', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar por nombre, ID o evento...');
    expect(searchInput).toBeInTheDocument();

    // Verificar que tiene el ícono de búsqueda
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('muestra botones de filtros premium', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    const filterButton = screen.getByText('Filtros');
    expect(filterButton).toBeInTheDocument();

    // Verificar ícono de filtro
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
  });

  it('muestra tarjetas de pedidos con diseño premium', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    // Verificar nombres de clientes
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();

    // Verificar eventos
    expect(screen.getByText('Evento Primavera 2024')).toBeInTheDocument();
    expect(screen.getByText('Evento Navidad 2023')).toBeInTheDocument();

    // Verificar precios
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('muestra badges de estado correctamente', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    expect(screen.getByText('Pago Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Entregado')).toBeInTheDocument();
  });

  it('filtra pedidos por búsqueda', async () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar por nombre, ID o evento...');

    // Buscar por nombre
    fireEvent.change(searchInput, { target: { value: 'María' } });

    await waitFor(() => {
      expect(screen.getByText('María González')).toBeInTheDocument();
      expect(screen.queryByText('Carlos Rodríguez')).not.toBeInTheDocument();
    });

    // Limpiar búsqueda
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
    });
  });

  it('llama a onRefresh cuando se hace clic en actualizar', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    const refreshButton = screen.getByTestId('refresh-icon').closest('button');
    fireEvent.click(refreshButton!);

    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('llama a onViewSharedPhotos cuando se hace clic en fotos compartidas', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    const sharedPhotosButton = screen.getAllByTestId('external-link-icon')[0].closest('button');
    fireEvent.click(sharedPhotosButton!);

    expect(defaultProps.onViewSharedPhotos).toHaveBeenCalledWith('token123');
  });

  it('muestra estado de loading premium', () => {
    renderWithQueryClient(
      <MobileOrdersManager
        {...defaultProps}
        orders={[]}
        loading={true}
      />
    );

    expect(screen.getByText('Cargando pedidos...')).toBeInTheDocument();
  });

  it('muestra estado vacío premium cuando no hay pedidos', () => {
    renderWithQueryClient(
      <MobileOrdersManager
        {...defaultProps}
        orders={[]}
      />
    );

    expect(screen.getByText('Aún no hay pedidos')).toBeInTheDocument();
    expect(screen.getByText('Los pedidos de los usuarios aparecerán aquí cuando realicen compras')).toBeInTheDocument();
  });

  it('muestra estado vacío con botón de limpiar búsqueda', async () => {
    renderWithQueryClient(
      <MobileOrdersManager
        {...defaultProps}
        orders={[]}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por nombre, ID o evento...');
    fireEvent.change(searchInput, { target: { value: 'búsqueda sin resultados' } });

    await waitFor(() => {
      expect(screen.getByText('No se encontraron pedidos')).toBeInTheDocument();
      expect(screen.getByText('Limpiar búsqueda')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Limpiar búsqueda');
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('muestra contador de resultados de búsqueda', async () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    // Inicialmente debe mostrar todos los pedidos
    expect(screen.getByText('2 pedidos')).toBeInTheDocument();

    // Buscar un pedido específico
    const searchInput = screen.getByPlaceholderText('Buscar por nombre, ID o evento...');
    fireEvent.change(searchInput, { target: { value: 'María' } });

    await waitFor(() => {
      expect(screen.getByText('1 pedido para "María"')).toBeInTheDocument();
    });
  });

  it('muestra acciones rápidas en las tarjetas', () => {
    renderWithQueryClient(<MobileOrdersManager {...defaultProps} />);

    // Verificar que hay botones de acciones (ver detalles, fotos compartidas)
    const eyeIcons = screen.getAllByTestId('eye-icon');
    const externalLinkIcons = screen.getAllByTestId('external-link-icon');

    expect(eyeIcons.length).toBeGreaterThan(0);
    expect(externalLinkIcons.length).toBeGreaterThan(0);
  });

  it('maneja correctamente cuando no hay estadísticas', () => {
    renderWithQueryClient(
      <MobileOrdersManager
        {...defaultProps}
        stats={undefined}
      />
    );

    // Debe renderizar sin errores incluso sin estadísticas
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
  });
});
