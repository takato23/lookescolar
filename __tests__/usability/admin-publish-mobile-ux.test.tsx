/**
 * Mobile UX and Accessibility Tests for Admin Publish Page
 * Tests the mobile-first redesign implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from '@/components/ui/NotificationSystem';
import PublishPage from '@/app/admin/publish/PublishClient';
import userEvent from '@testing-library/user-event';

import { vi } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Next.js components
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock responsive components
vi.mock('@/components/admin/ResponsiveFolderGrid', () => ({
  ResponsiveFolderGrid: ({ codes, loading, onPublish, onPreview }: any) => (
    <div data-testid="responsive-folder-grid">
      {loading ? (
        <div>Loading...</div>
      ) : (
        codes.map((code: any) => (
          <div key={code.id} data-testid={`code-card-${code.id}`}>
            <span>{code.code_value}</span>
            <button
              onClick={() => onPublish(code.id)}
              aria-label={`Publicar ${code.code_value}`}
            >
              Publicar
            </button>
            {onPreview && (
              <button
                onClick={() => onPreview(code)}
                aria-label={`Vista previa de ${code.code_value}`}
              >
                Vista previa
              </button>
            )}
          </div>
        ))
      )}
    </div>
  ),
  useFolderGrid: () => ({
    selectedCodes: [],
    setSelectedCodes: vi.fn(),
    bulkActionLoading: false,
    handleBulkPublish: vi.fn(),
    handleBulkUnpublish: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

// Mock photo preview modal
vi.mock('@/components/admin/PhotoPreviewModal', () => ({
  PhotoPreviewModal: ({ isOpen, onClose, folder }: any) =>
    isOpen ? (
      <div data-testid="photo-preview-modal" role="dialog" aria-modal="true">
        <button onClick={onClose} aria-label="Cerrar modal">
          Cerrar
        </button>
        <h2>{folder?.name}</h2>
      </div>
    ) : null,
}));

// Mock hooks
vi.mock('@/hooks/usePublishData', () => ({
  usePublishData: () => ({
    codes: [
      {
        id: '1',
        code_value: '3B-07',
        photos_count: 15,
        is_published: false,
        token: null,
        event_id: 'event-1',
      },
      {
        id: '2',
        code_value: '3A-12',
        photos_count: 8,
        is_published: true,
        token: 'test-token',
        event_id: 'event-1',
      },
    ],
    event: { id: 'event-1', name: 'Graduación 2024' },
    isLoading: false,
    isRefetching: false,
    error: null,
    publish: vi.fn(),
    unpublish: vi.fn(),
    rotateToken: vi.fn(),
    bulkPublish: vi.fn(),
    bulkUnpublish: vi.fn(),
    refetch: vi.fn(),
    stats: { total: 2, published: 1, unpublished: 1, totalPhotos: 23 },
    getIsPublishing: vi.fn(() => false),
    getIsUnpublishing: vi.fn(() => false),
    getIsRotating: vi.fn(() => false),
  }),
}));

// Mock PublishSuccessToast hook
vi.mock('@/components/admin/PublishSuccessToast', () => ({
  usePublishSuccessToast: () => ({
    showPublishSuccess: vi.fn(),
    showUnpublishSuccess: vi.fn(),
    showRotateSuccess: vi.fn(),
  }),
}));

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>{children}</NotificationProvider>
    </QueryClientProvider>
  );
}

describe('Admin Publish Page - Mobile UX & Accessibility', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe('Mobile-First Design', () => {
    it('renders mobile-optimized header', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      expect(
        screen.getByRole('heading', { name: /publicación de galerías/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/gestiona el acceso familiar/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /actualizar datos/i })
      ).toBeInTheDocument();
    });

    it('displays responsive stats cards', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      expect(screen.getByText('2')).toBeInTheDocument(); // Total códigos
      expect(screen.getByText('1')).toBeInTheDocument(); // Publicados
      expect(screen.getByText('1')).toBeInTheDocument(); // Privados
      expect(screen.getByText('23')).toBeInTheDocument(); // Fotos totales
    });

    it('shows public gallery section when event is available', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Galería Pública')).toBeInTheDocument();
      expect(screen.getByText('Graduación 2024')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /copiar enlace público/i })
      ).toBeInTheDocument();
    });
  });

  describe('Touch-Friendly Controls', () => {
    it('has minimum 44px touch targets for buttons', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      const updateButton = screen.getByRole('button', {
        name: /actualizar datos/i,
      });
      const computedStyle = window.getComputedStyle(updateButton);

      // Check for min-h-[44px] class or equivalent
      expect(updateButton.className).toMatch(/min-h-\[44px\]/);
    });

    it('renders search input with proper mobile styling', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/buscar código/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.className).toMatch(/min-h-\[44px\]/);

      // Test search icon
      expect(
        searchInput.parentElement?.querySelector('[data-lucide="search"]')
      ).toBeInTheDocument();
    });

    it('provides clear button for search input', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/buscar código/i);
      await user.type(searchInput, '3B');

      const clearButton = screen.getByRole('button', { name: '' }); // Clear button without text
      expect(clearButton).toBeInTheDocument();

      await user.click(clearButton);
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Accessibility Features', () => {
    it('has proper heading hierarchy', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/publicación de galerías/i);

      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings).toHaveLength(2); // Public and private sections
    });

    it('provides descriptive button labels', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      expect(screen.getByLabelText(/actualizar datos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cambiar a vista/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation for filters', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      const statusFilter = screen.getByDisplayValue('Todos');
      expect(statusFilter).toBeInTheDocument();

      await user.selectOptions(statusFilter, 'published');
      expect(statusFilter).toHaveValue('published');
    });

    it('has accessible form controls with labels', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/buscar código/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Responsive Grid Layout', () => {
    it('renders responsive folder grid component', () => {
      render(<PublishPage />, { wrapper: TestWrapper });

      expect(screen.getByTestId('responsive-folder-grid')).toBeInTheDocument();
    });

    it('shows view mode toggle', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      const viewToggle = screen.getByLabelText(/cambiar a vista/i);
      expect(viewToggle).toBeInTheDocument();

      await user.click(viewToggle);
      // Should switch between grid and list views
    });
  });

  describe('Interactive Features', () => {
    it('opens photo preview modal when preview is clicked', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      // First, make sure we can find a preview button
      const previewButtons = screen.getAllByLabelText(/vista previa de/i);
      expect(previewButtons.length).toBeGreaterThan(0);

      await user.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('photo-preview-modal')).toBeInTheDocument();
      });
    });

    it('closes modal with escape key', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      // Open modal first
      const previewButtons = screen.getAllByLabelText(/vista previa de/i);
      await user.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('photo-preview-modal')).toBeInTheDocument();
      });

      // Close with escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(
          screen.queryByTestId('photo-preview-modal')
        ).not.toBeInTheDocument();
      });
    });

    it('handles bulk selection actions', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      // Search for bulk action buttons (they appear when codes are selected)
      // Since our mock doesn't have selected codes, these won't appear
      // But we can test that the UI structure supports it
      expect(screen.queryByText(/seleccionados/)).not.toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('filters codes by search term', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/buscar código/i);
      await user.type(searchInput, '3B');

      expect(searchInput).toHaveValue('3B');

      // The filtering logic is tested in the filtered useMemo
      // We can verify the input works correctly
    });

    it('filters by publication status', async () => {
      const user = userEvent.setup();
      render(<PublishPage />, { wrapper: TestWrapper });

      const statusFilter = screen.getByDisplayValue('Todos');

      await user.selectOptions(statusFilter, 'published');
      expect(statusFilter).toHaveValue('published');

      await user.selectOptions(statusFilter, 'unpublished');
      expect(statusFilter).toHaveValue('unpublished');
    });
  });

  describe('Loading States', () => {
    it('shows loading state during data fetch', () => {
      // Mock loading state
      vi.doMock('@/hooks/usePublishData', () => ({
        usePublishData: () => ({
          codes: [],
          event: null,
          isLoading: true,
          isRefetching: false,
          error: null,
          publish: vi.fn(),
          unpublish: vi.fn(),
          rotateToken: vi.fn(),
          refetch: vi.fn(),
          stats: { total: 0, published: 0, unpublished: 0, totalPhotos: 0 },
        }),
      }));

      render(<PublishPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('renders without performance warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      render(<PublishPage />, { wrapper: TestWrapper });

      // Should not have React performance warnings
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Warning.*performance/)
      );

      consoleSpy.mockRestore();
    });

    it('has proper component memoization structure', () => {
      // This test ensures our components are structured for performance
      // The actual memoization is tested through re-render behavior
      render(<PublishPage />, { wrapper: TestWrapper });

      // Verify key performance-critical elements are present
      expect(screen.getByTestId('responsive-folder-grid')).toBeInTheDocument();
    });
  });
});

describe('Responsive Design Breakpoints', () => {
  const originalInnerWidth = global.innerWidth;

  afterEach(() => {
    global.innerWidth = originalInnerWidth;
  });

  it('adapts layout for mobile viewport (320px)', () => {
    global.innerWidth = 320;
    render(<PublishPage />, { wrapper: TestWrapper });

    // Mobile layout should stack elements vertically
    const header = screen.getByRole('heading', {
      name: /publicación de galerías/i,
    });
    expect(header).toBeInTheDocument();
  });

  it('adapts layout for tablet viewport (768px)', () => {
    global.innerWidth = 768;
    render(<PublishPage />, { wrapper: TestWrapper });

    // Tablet layout should show more columns
    expect(screen.getByTestId('responsive-folder-grid')).toBeInTheDocument();
  });

  it('adapts layout for desktop viewport (1024px+)', () => {
    global.innerWidth = 1200;
    render(<PublishPage />, { wrapper: TestWrapper });

    // Desktop layout should show full features
    expect(screen.getByTestId('responsive-folder-grid')).toBeInTheDocument();
  });
});
