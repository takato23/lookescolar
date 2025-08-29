import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock auth client
vi.mock('@/lib/supabase/auth', () => ({
  authClient: {
    login: vi.fn(),
  },
}));

describe('LoginForm', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefresh = vi.fn();
  let mockAuthClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup router mock
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: mockRefresh,
    });

    // Setup auth client mock
    const { authClient } = require('@/lib/supabase/auth');
    mockAuthClient = authClient;
  });

  it('should render login form with all fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i })
    ).toBeInTheDocument();
  });

  it('should show validation errors for invalid inputs', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Button should be disabled initially (empty form)
    expect(submitButton).toBeDisabled();

    // Fill in invalid email
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Button should still be disabled
    expect(submitButton).toBeDisabled();

    // Fill in valid email but short password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    const passwordInput = screen.getByLabelText(/contraseña/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // Button should still be disabled
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button with valid inputs', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in valid inputs
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Button should be enabled
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle successful login', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    mockAuthClient.login.mockResolvedValue({
      user: mockUser,
      error: null,
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in valid credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAuthClient.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should handle login error', async () => {
    mockAuthClient.login.mockResolvedValue({
      user: null,
      error: {
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS',
      },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Submit form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Email o contraseña incorrectos')
      ).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should handle rate limiting after multiple failed attempts', async () => {
    mockAuthClient.login.mockResolvedValue({
      user: null,
      error: {
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS',
      },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Make multiple failed attempts
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/intento 1 de 3/i)).toBeInTheDocument();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/intento 2 de 3/i)).toBeInTheDocument();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/se ha alcanzado el límite/i)
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show loading state during login', async () => {
    // Mock a slow login response
    mockAuthClient.login.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ user: null, error: { message: 'Error' } }),
            100
          )
        )
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/iniciando sesión\.\.\./i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should use custom redirect path', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    mockAuthClient.login.mockResolvedValue({
      user: mockUser,
      error: null,
    });

    const customRedirect = '/admin/dashboard';
    render(<LoginForm redirectTo={customRedirect} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in valid credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(customRedirect);
    });
  });

  it('should call onLoginSuccess callback', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    const onLoginSuccess = vi.fn();

    mockAuthClient.login.mockResolvedValue({
      user: mockUser,
      error: null,
    });

    render(<LoginForm onLoginSuccess={onLoginSuccess} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    // Fill in valid credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });
});
