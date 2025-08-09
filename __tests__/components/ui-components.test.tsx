/**
 * UI Components Test Suite
 * Tests critical UI components and user interactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/test',
    query: {},
    asPath: '/test'
  })
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClientSupabaseClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null })
    }),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  })
}));

// Import components
import LoginForm from '@/components/admin/LoginForm';
import PhotoUploader from '@/components/admin/PhotoUploader';
import FamilyGallery from '@/components/family/FamilyGallery';
import PublicGallery from '@/components/gallery/PublicGallery';
import CheckoutForm from '@/components/family/CheckoutForm';
import OrderStatus from '@/components/family/OrderStatus';

describe('UI Components Tests', () => {
  
  describe('LoginForm Component', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render login form elements', () => {
      render(<LoginForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email no es válido/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      
      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('PhotoUploader Component', () => {
    const mockProps = {
      eventId: 'test-event-123',
      onUploadSuccess: vi.fn(),
      onUploadError: vi.fn()
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render upload interface', () => {
      render(<PhotoUploader {...mockProps} />);
      
      expect(screen.getByText(/subir fotos/i)).toBeInTheDocument();
      expect(screen.getByText(/arrastra archivos aquí/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /seleccionar archivos/i })).toBeInTheDocument();
    });

    it('should handle file selection', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...mockProps} />);
      
      const fileInput = screen.getByRole('button', { name: /seleccionar archivos/i });
      
      // Create a test file
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, testFile);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...mockProps} />);
      
      const fileInput = screen.getByRole('button', { name: /seleccionar archivos/i });
      
      // Create an invalid file
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        expect(screen.getByText(/tipo de archivo no válido/i)).toBeInTheDocument();
      });
    });

    it('should show upload progress', async () => {
      const user = userEvent.setup();
      render(<PhotoUploader {...mockProps} />);
      
      const fileInput = screen.getByRole('button', { name: /seleccionar archivos/i });
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, testFile);
      
      const uploadButton = screen.getByRole('button', { name: /subir fotos/i });
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
      });
    });
  });

  describe('FamilyGallery Component', () => {
    const mockProps = {
      subject: {
        id: 'subject-123',
        name: 'Juan Pérez',
        token: 'test-token-123',
        event: {
          id: 'event-123',
          name: 'Evento Test',
          school: 'Escuela Test',
          date: '2024-01-15'
        }
      },
      photos: [
        {
          id: 'photo-123',
          preview_url: 'https://test.com/photo1.jpg',
          thumbnail_url: 'https://test.com/thumb1.jpg'
        },
        {
          id: 'photo-456',
          preview_url: 'https://test.com/photo2.jpg',
          thumbnail_url: 'https://test.com/thumb2.jpg'
        }
      ]
    };

    it('should render family gallery with photos', () => {
      render(<FamilyGallery {...mockProps} />);
      
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Evento Test')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    it('should handle photo selection for cart', async () => {
      const user = userEvent.setup();
      render(<FamilyGallery {...mockProps} />);
      
      const photoCheckboxes = screen.getAllByRole('checkbox');
      expect(photoCheckboxes).toHaveLength(2);
      
      await user.click(photoCheckboxes[0]);
      
      await waitFor(() => {
        expect(photoCheckboxes[0]).toBeChecked();
      });
    });

    it('should show cart summary', async () => {
      const user = userEvent.setup();
      render(<FamilyGallery {...mockProps} />);
      
      const photoCheckboxes = screen.getAllByRole('checkbox');
      await user.click(photoCheckboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/1 foto seleccionada/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ir al carrito/i })).toBeInTheDocument();
      });
    });

    it('should handle empty gallery', () => {
      render(<FamilyGallery {...{ ...mockProps, photos: [] }} />);
      
      expect(screen.getByText(/no hay fotos disponibles/i)).toBeInTheDocument();
    });
  });

  describe('PublicGallery Component', () => {
    const mockProps = {
      event: {
        id: 'event-123',
        name: 'Evento Público Test',
        school: 'Escuela Pública Test',
        date: '2024-01-15',
        location: 'Ubicación Test'
      },
      photos: [
        {
          id: 'photo-789',
          preview_url: 'https://test.com/public1.jpg',
          thumbnail_url: 'https://test.com/thumb-public1.jpg'
        }
      ]
    };

    it('should render public gallery', () => {
      render(<PublicGallery {...mockProps} />);
      
      expect(screen.getByText('Evento Público Test')).toBeInTheDocument();
      expect(screen.getByText('Escuela Pública Test')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(1);
    });

    it('should allow photo selection for purchase', async () => {
      const user = userEvent.setup();
      render(<PublicGallery {...mockProps} />);
      
      const photoCheckbox = screen.getByRole('checkbox');
      await user.click(photoCheckbox);
      
      await waitFor(() => {
        expect(photoCheckbox).toBeChecked();
        expect(screen.getByRole('button', { name: /comprar fotos/i })).toBeInTheDocument();
      });
    });
  });

  describe('CheckoutForm Component', () => {
    const mockProps = {
      items: [
        {
          photo_id: 'photo-123',
          print_size: 'digital',
          quantity: 1,
          unit_price: 1500
        }
      ],
      onSubmit: vi.fn(),
      loading: false
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render checkout form', () => {
      render(<CheckoutForm {...mockProps} />);
      
      expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceder al pago/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<CheckoutForm {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /proceder al pago/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
      });
    });

    it('should show order summary', () => {
      render(<CheckoutForm {...mockProps} />);
      
      expect(screen.getByText(/1 foto digital/i)).toBeInTheDocument();
      expect(screen.getByText(/\$1\.500/)).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      render(<CheckoutForm {...mockProps} />);
      
      const nameInput = screen.getByLabelText(/nombre completo/i);
      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/teléfono/i);
      
      await user.type(nameInput, 'Juan Pérez');
      await user.type(emailInput, 'juan@test.com');
      await user.type(phoneInput, '+541234567890');
      
      const submitButton = screen.getByRole('button', { name: /proceder al pago/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          contact_name: 'Juan Pérez',
          contact_email: 'juan@test.com',
          contact_phone: '+541234567890'
        });
      });
    });
  });

  describe('OrderStatus Component', () => {
    const mockProps = {
      order: {
        id: 'order-123',
        status: 'approved',
        total_amount: 1500,
        created_at: '2024-01-15T10:00:00Z',
        contact_name: 'Juan Pérez',
        contact_email: 'juan@test.com',
        items: [
          {
            photo_id: 'photo-123',
            print_size: 'digital',
            quantity: 1,
            unit_price: 1500
          }
        ]
      }
    };

    it('should render order status - approved', () => {
      render(<OrderStatus {...mockProps} />);
      
      expect(screen.getByText(/pedido aprobado/i)).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText(/\$1\.500/)).toBeInTheDocument();
    });

    it('should render order status - pending', () => {
      const pendingProps = {
        ...mockProps,
        order: { ...mockProps.order, status: 'pending' }
      };
      
      render(<OrderStatus {...pendingProps} />);
      
      expect(screen.getByText(/procesando pago/i)).toBeInTheDocument();
    });

    it('should render order status - delivered', () => {
      const deliveredProps = {
        ...mockProps,
        order: { ...mockProps.order, status: 'delivered' }
      };
      
      render(<OrderStatus {...deliveredProps} />);
      
      expect(screen.getByText(/pedido entregado/i)).toBeInTheDocument();
    });

    it('should show order items', () => {
      render(<OrderStatus {...mockProps} />);
      
      expect(screen.getByText(/1 foto digital/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design Tests', () => {
    beforeEach(() => {
      // Mock window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('768px') ? false : true, // Mock mobile
          media: query,
          onchange: null,
          addListener: vi.fn(), // deprecated
          removeListener: vi.fn(), // deprecated
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should adapt gallery layout for mobile', () => {
      const mockProps = {
        subject: {
          id: 'subject-123',
          name: 'Juan Pérez',
          token: 'test-token-123',
          event: {
            id: 'event-123',
            name: 'Evento Test',
            school: 'Escuela Test',
            date: '2024-01-15'
          }
        },
        photos: [
          {
            id: 'photo-123',
            preview_url: 'https://test.com/photo1.jpg',
            thumbnail_url: 'https://test.com/thumb1.jpg'
          }
        ]
      };
      
      render(<FamilyGallery {...mockProps} />);
      
      // Should have mobile-specific classes
      const gallery = screen.getByTestId('photo-gallery');
      expect(gallery).toHaveClass('grid-cols-2'); // Mobile: 2 columns
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels', () => {
      const mockProps = {
        subject: {
          id: 'subject-123',
          name: 'Juan Pérez',
          token: 'test-token-123',
          event: {
            id: 'event-123',
            name: 'Evento Test',
            school: 'Escuela Test',
            date: '2024-01-15'
          }
        },
        photos: [
          {
            id: 'photo-123',
            preview_url: 'https://test.com/photo1.jpg',
            thumbnail_url: 'https://test.com/thumb1.jpg'
          }
        ]
      };
      
      render(<FamilyGallery {...mockProps} />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button');
      
      // Tab navigation should work
      await user.tab();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });
});