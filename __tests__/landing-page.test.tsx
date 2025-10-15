import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FamilyAccessCard } from '@/components/ui/family-access-card';
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

jest.mock('@/lib/utils/family-token-storage', () => ({
  storeFamilyToken: jest.fn().mockResolvedValue(undefined),
}));

const storeFamilyToken = require('@/lib/utils/family-token-storage')
  .storeFamilyToken as jest.Mock;

const mockContactResponse = {
  ok: true,
  json: async () => ({
    email: 'contacto@lookescolar.com',
    phone: '+54 9 11 2222 3333',
    whatsappUrl: 'https://wa.me/5491122223333',
  }),
};

describe('FamilyAccessCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token access form', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockContactResponse);

    render(<FamilyAccessCard />);

    expect(
      screen.getByText('Acceso familiar a tu galería')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Alias o código de acceso familiar')
    ).toBeInTheDocument();
    expect(screen.getByText('Validar acceso')).toBeInTheDocument();
  });

  it('shows error when submitting empty token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockContactResponse);

    render(<FamilyAccessCard />);

    const submitButton = screen.getByText('Validar acceso');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Ingresa un código o alias')).toBeInTheDocument();
    });
  });

  it('resolves alias and shows confirmation card', async () => {
    const aliasResponse = {
      ok: true,
      json: async () => ({
        alias: 'luna1234',
        short_code: 'LU12',
        token: 'token-12345678901234567890',
        token_id: 'token-id',
        event_id: 'event-001',
        expires_at: '2025-12-31T00:00:00Z',
      }),
    };

    const validationResponse = {
      ok: true,
      json: async () => ({
        valid: true,
        access_level: 'family',
        event: {
          id: 'event-001',
          name: 'Festival Primavera',
          start_date: '2025-09-01T00:00:00Z',
        },
        family: {
          email: 'family@example.com',
          students: [],
          event: {
            id: 'event-001',
            name: 'Festival Primavera',
            start_date: '2025-09-01T00:00:00Z',
          },
        },
        permissions: {
          can_view_photos: true,
          can_download_previews: true,
          can_purchase: true,
          can_share: true,
          max_devices: 3,
          device_fingerprint_required: false,
        },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockContactResponse);
    (global.fetch as jest.Mock).mockResolvedValueOnce(aliasResponse);
    (global.fetch as jest.Mock).mockResolvedValueOnce(validationResponse);

    render(<FamilyAccessCard />);

    const input = screen.getByLabelText('Alias o código de acceso familiar');
    fireEvent.change(input, { target: { value: 'Luna1234' } });
    fireEvent.click(screen.getByText('Validar acceso'));

    await waitFor(() => {
      expect(
        screen.getByText('Acceso familiar a tu galería')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Festival Primavera', { selector: 'h4' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Alias detectado/i)).toBeInTheDocument();
    });
  });

  it('navigates to store when CTA is pressed after successful validation', async () => {
    const validationResponse = {
      ok: true,
      json: async () => ({
        valid: true,
        access_level: 'student',
        event: {
          id: 'event-002',
          name: 'Acto Escolar',
        },
        student: {
          id: 'student-100',
          name: 'Juan Pérez',
          event: {
            id: 'event-002',
            name: 'Acto Escolar',
          },
        },
        permissions: {
          can_view_photos: true,
          can_download_previews: true,
          can_purchase: true,
          can_share: false,
          max_devices: 3,
          device_fingerprint_required: false,
        },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockContactResponse);
    (global.fetch as jest.Mock).mockResolvedValueOnce(validationResponse);

    render(<FamilyAccessCard />);

    const input = screen.getByLabelText('Alias o código de acceso familiar');
    const tokenValue = 'token-98765432109876543210';

    fireEvent.change(input, { target: { value: tokenValue } });
    fireEvent.click(screen.getByText('Validar acceso'));

    await waitFor(() => {
      expect(
        screen.getByText('Acto Escolar', { selector: 'h4' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Entrar a mi galería'));

    await waitFor(() => {
      expect(storeFamilyToken).toHaveBeenCalledWith(tokenValue);
      expect(mockPush).toHaveBeenCalledWith(
        `/store-unified/${encodeURIComponent(tokenValue)}`
      );
    });
  });
});
