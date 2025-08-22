import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TokenAccessForm } from '@/components/landing/TokenAccessForm';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
}));

// Mock fetch
global.fetch = jest.fn();

describe('TokenAccessForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token access form', () => {
    render(<TokenAccessForm />);
    
    expect(screen.getByText('Accede a tu galería')).toBeInTheDocument();
    expect(screen.getByLabelText('Token de acceso')).toBeInTheDocument();
    expect(screen.getByText('Escanear QR')).toBeInTheDocument();
    expect(screen.getByText('Acceder')).toBeInTheDocument();
  });

  it('shows error when submitting empty token', async () => {
    render(<TokenAccessForm />);
    
    const submitButton = screen.getByText('Acceder');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Por favor ingresa un token válido')).toBeInTheDocument();
    });
  });

  it('shows error when token is too short', async () => {
    render(<TokenAccessForm />);
    
    const tokenInput = screen.getByLabelText('Token de acceso');
    const submitButton = screen.getByText('Acceder');
    
    fireEvent.change(tokenInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Por favor ingresa un token válido')).toBeInTheDocument();
    });
  });

  it('calls validation API and redirects on valid token', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        eventId: 'event-123',
      }),
    });
    
    render(<TokenAccessForm />);
    
    const tokenInput = screen.getByLabelText('Token de acceso');
    const submitButton = screen.getByText('Acceder');
    
    fireEvent.change(tokenInput, { target: { value: 'valid-token-with-enough-characters' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/family/validate-token/valid-token-with-enough-characters');
      expect(mockPush).toHaveBeenCalledWith('/gallery/event-123?token=valid-token-with-enough-characters');
    });
  });

  it('shows error message on invalid token', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Token inválido',
      }),
    });
    
    render(<TokenAccessForm />);
    
    const tokenInput = screen.getByLabelText('Token de acceso');
    const submitButton = screen.getByText('Acceder');
    
    fireEvent.change(tokenInput, { target: { value: 'invalid-token-with-enough-characters' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Token inválido')).toBeInTheDocument();
    });
  });
});