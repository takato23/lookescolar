'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/supabase/auth-client';
import { Button } from '@/components/ui/button';

interface LoginFormProps {
  onLoginSuccess?: () => void;
  redirectTo?: string;
}

export default function LoginForm({
  onLoginSuccess,
  redirectTo = '/admin',
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();

  // Rate limiting del lado cliente (complementa el del middleware)
  const maxAttempts = 3;
  const rateLimitReached = attempts >= maxAttempts;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rateLimitReached) {
      setError(
        'Demasiados intentos. Espera un momento antes de intentar nuevamente.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, error } = await authClient.login({ email, password });

      if (error) {
        setError(error.message);
        setAttempts((prev) => prev + 1);

        // Log intento fallido sin exponer datos sensibles
        console.warn('Login attempt failed:', {
          timestamp: new Date().toISOString(),
          email: email.replace(/(.{2}).+(@.+)/, '$1***$2'), // Enmascarar email
          error: error.code,
          attempt: attempts + 1,
        });
        return;
      }

      if (user) {
        // Log login exitoso
        console.info('Login successful:', {
          timestamp: new Date().toISOString(),
          userId: user.id,
          email: user.email?.replace(/(.{2}).+(@.+)/, '$1***$2'),
        });

        // Reset attempt counter on success
        setAttempts(0);

        if (onLoginSuccess) {
          onLoginSuccess();
        }

        // Usar replace en lugar de push para evitar que vuelva atrás al login
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.');
      setAttempts((prev) => prev + 1);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.includes('@') && password.length >= 6;

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-white/90"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading || rateLimitReached}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="admin@lookescolar.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-white/90"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading || rateLimitReached}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200">
          {error}
          {attempts > 1 && attempts < maxAttempts && (
            <p className="mt-1 text-xs">
              Intento {attempts} de {maxAttempts}
            </p>
          )}
        </div>
      )}

      {rateLimitReached && (
        <div className="rounded-lg border border-primary-500/50 bg-primary-500/20 p-3 text-sm text-primary-200">
          Se ha alcanzado el límite de intentos. Refresca la página y espera un
          momento antes de intentar nuevamente.
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !isFormValid || rateLimitReached}
        className="w-full transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>

      <div className="mt-4 text-center text-xs text-white/60">
        <p>Protegido por rate limiting y autenticación segura</p>
        {attempts > 0 && (
          <p className="mt-1">
            Intentos realizados: {attempts}/{maxAttempts}
          </p>
        )}
      </div>
    </form>
  );
}
