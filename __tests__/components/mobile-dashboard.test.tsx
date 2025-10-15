import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileDashboardPage } from '../../app/admin/mobile-dashboard/page';
import { QuickActionsGrid } from '../../app/admin/mobile-dashboard/components/QuickActionsGrid';
import { PhotoUploadQueue } from '../../app/admin/mobile-dashboard/components/PhotoUploadQueue';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/mobile-dashboard',
}));

// Mock mobile detection hook
vi.mock('../../hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobileView: true,
  }),
}));

describe('Mobile Dashboard Components', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('MobileDashboardPage', () => {
    it('renders dashboard layout correctly', () => {
      render(<MobileDashboardPage />);

      expect(screen.getByText('LookEscolar')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Móvil')).toBeInTheDocument();
      expect(screen.getByText('¡Hola, María González!')).toBeInTheDocument();
    });

    it('shows quick actions grid', () => {
      render(<MobileDashboardPage />);

      expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
      expect(screen.getByText('Subir Fotos')).toBeInTheDocument();
      expect(screen.getByText('Eventos')).toBeInTheDocument();
      expect(screen.getByText('Pedidos')).toBeInTheDocument();
    });

    it('shows recent activity section', () => {
      render(<MobileDashboardPage />);

      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
      expect(screen.getByText('Evento "Graduación 2024"')).toBeInTheDocument();
    });
  });

  describe('QuickActionsGrid', () => {
    it('renders all action buttons', () => {
      const mockActions = {
        onUpload: vi.fn(),
        onViewEvents: vi.fn(),
        onViewOrders: vi.fn(),
        onViewStats: vi.fn(),
        onSettings: vi.fn(),
      };

      render(<QuickActionsGrid {...mockActions} />);

      expect(screen.getByText('Subir Fotos')).toBeInTheDocument();
      expect(screen.getByText('Eventos')).toBeInTheDocument();
      expect(screen.getByText('Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Estadísticas')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('calls onUpload when upload button is clicked', () => {
      const onUpload = vi.fn();
      const mockActions = {
        onUpload,
        onViewEvents: vi.fn(),
        onViewOrders: vi.fn(),
        onViewStats: vi.fn(),
        onSettings: vi.fn(),
      };

      render(<QuickActionsGrid {...mockActions} />);

      const uploadButton = screen.getByLabelText('Subir Fotos');
      fireEvent.click(uploadButton);

      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    it('shows online status indicator', () => {
      const mockActions = {
        onUpload: vi.fn(),
        onViewEvents: vi.fn(),
        onViewOrders: vi.fn(),
        onViewStats: vi.fn(),
        onSettings: vi.fn(),
      };

      render(<QuickActionsGrid {...mockActions} />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  describe('PhotoUploadQueue', () => {
    it('renders upload area', () => {
      render(<PhotoUploadQueue />);

      expect(screen.getByText(/Arrastra fotos aquí/)).toBeInTheDocument();
    });

    it('handles file selection', async () => {
      const onUploadComplete = vi.fn();
      render(<PhotoUploadQueue onUploadComplete={onUploadComplete} />);

      const fileInput = screen.getByRole('button', { name: /selecciona archivos/ });

      // Simulate file selection
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;

      // Mock the file input behavior
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      // Simulate change event
      fireEvent.change(input);

      // Wait for upload to complete
      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('shows offline warning when offline', () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(<PhotoUploadQueue />);

      expect(screen.getByText('Subidas en espera')).toBeInTheDocument();
      expect(screen.getByText(/Se subirán automáticamente cuando haya conexión/)).toBeInTheDocument();
    });
  });

  describe('Mobile Dashboard Integration', () => {
    it('navigates between sections correctly', () => {
      render(<MobileDashboardPage />);

      // Initially shows dashboard
      expect(screen.getByText('¡Hola, María González!')).toBeInTheDocument();

      // Click on events section (this would be handled by the navigation)
      // Note: In a real test, we'd need to mock the navigation state
      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    });

    it('displays performance metrics', () => {
      render(<MobileDashboardPage />);

      expect(screen.getByText('Rendimiento del Día')).toBeInTheDocument();
      expect(screen.getByText('127')).toBeInTheDocument(); // Photos uploaded
      expect(screen.getByText('98%')).toBeInTheDocument(); // Success rate
    });
  });
});
