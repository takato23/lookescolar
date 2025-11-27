'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/supabase/auth-client';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
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
      {/* Email Field con micro-interacciones */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <motion.label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: emailFocused ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.9)"
          }}
          transition={{ duration: 0.2 }}
        >
          Correo electrónico
        </motion.label>
        <motion.div
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            required
            autoComplete="email"
            disabled={loading || rateLimitReached}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="admin@lookescolar.com"
          />
        </motion.div>
      </motion.div>

      {/* Password Field con micro-interacciones */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: passwordFocused ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.9)"
          }}
          transition={{ duration: 0.2 }}
        >
          Contraseña
        </motion.label>
        <motion.div
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            required
            autoComplete="current-password"
            disabled={loading || rateLimitReached}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:shadow-lg focus:shadow-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
            minLength={6}
          />
        </motion.div>
      </motion.div>

      {/* Error Messages con animación */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200 backdrop-blur-sm"
        >
          {error}
          {attempts > 1 && attempts < maxAttempts && (
            <p className="mt-1 text-xs">
              Intento {attempts} de {maxAttempts}
            </p>
          )}
        </motion.div>
      )}

      {rateLimitReached && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 p-3 text-sm text-yellow-200 backdrop-blur-sm"
        >
          Se ha alcanzado el límite de intentos. Refresca la página y espera un
          momento antes de intentar nuevamente.
        </motion.div>
      )}

      {/* Submit Button con micro-interacciones mejoradas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <motion.button
          type="submit"
          disabled={loading || !isFormValid || rateLimitReached}
          whileHover={!loading && isFormValid && !rateLimitReached ? {
            scale: 1.02,
            boxShadow: "0 20px 40px -12px rgba(168, 85, 247, 0.4)"
          } : {}}
          whileTap={!loading && isFormValid && !rateLimitReached ? {
            scale: 0.98
          } : {}}
          className="w-full transform rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2"
          >
            {loading && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
            )}
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Footer Info con animación */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-4 text-center text-xs text-white/60"
      >
        <p className="flex items-center justify-center gap-2">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🔒
          </motion.span>
          Protegido por rate limiting y autenticación segura
        </p>
        {attempts > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1"
          >
            Intentos realizados: {attempts}/{maxAttempts}
          </motion.p>
        )}
      </motion.div>
    </form>
  );
}
