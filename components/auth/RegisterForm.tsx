'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/supabase/auth-client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface RegisterFormProps {
  onRegisterSuccess?: () => void;
  redirectTo?: string;
}

export default function RegisterForm({
  onRegisterSuccess,
  redirectTo = '/admin',
}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const maxAttempts = 5;
  const rateLimitReached = attempts >= maxAttempts;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rateLimitReached) {
      setError('Demasiados intentos. Espera un momento antes de intentar nuevamente.');
      return;
    }

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { user, error } = await authClient.signup({
        email,
        password,
        confirmPassword,
      });

      if (error) {
        setError(error.message);
        setAttempts((prev) => prev + 1);
        return;
      }

      if (user) {
        setSuccess('Registro exitoso. Revisa tu email para confirmar tu cuenta.');
        setAttempts(0);

        if (onRegisterSuccess) {
          onRegisterSuccess();
        }

        // Optionally redirect after a delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.');
      setAttempts((prev) => prev + 1);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    email.includes('@') &&
    password.length >= 6 &&
    password === confirmPassword &&
    name.length > 0;

  const inputClassName = (fieldName: string) => `
    w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3
    text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200
    focus:border-transparent focus:outline-none focus:ring-2
    ${fieldName === 'email' ? 'focus:ring-blue-500 focus:shadow-blue-500/20' : ''}
    ${fieldName === 'name' ? 'focus:ring-cyan-500 focus:shadow-cyan-500/20' : ''}
    ${fieldName === 'password' ? 'focus:ring-purple-500 focus:shadow-purple-500/20' : ''}
    ${fieldName === 'confirmPassword' ? 'focus:ring-pink-500 focus:shadow-pink-500/20' : ''}
    focus:shadow-lg disabled:cursor-not-allowed disabled:opacity-50
  `;

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      {/* Name Field */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <motion.label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: focusedField === 'name' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
          }}
        >
          Nombre completo
        </motion.label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          required
          autoComplete="name"
          disabled={loading || rateLimitReached}
          className={inputClassName('name')}
          placeholder="Tu nombre"
        />
      </motion.div>

      {/* Email Field */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <motion.label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: focusedField === 'email' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
          }}
        >
          Correo electrónico
        </motion.label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          required
          autoComplete="email"
          disabled={loading || rateLimitReached}
          className={inputClassName('email')}
          placeholder="tu@email.com"
        />
      </motion.div>

      {/* Password Field */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: focusedField === 'password' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
          }}
        >
          Contraseña
        </motion.label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          required
          autoComplete="new-password"
          disabled={loading || rateLimitReached}
          className={inputClassName('password')}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
        />
      </motion.div>

      {/* Confirm Password Field */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <motion.label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-white/90"
          animate={{
            color: focusedField === 'confirmPassword' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
          }}
        >
          Confirmar contraseña
        </motion.label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
          required
          autoComplete="new-password"
          disabled={loading || rateLimitReached}
          className={inputClassName('confirmPassword')}
          placeholder="Repite tu contraseña"
          minLength={6}
        />
        {/* Password match indicator */}
        <AnimatePresence>
          {confirmPassword && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-1 text-xs ${
                password === confirmPassword ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {password === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200 backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-lg border border-green-500/50 bg-green-500/20 p-3 text-sm text-green-200 backdrop-blur-sm"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {rateLimitReached && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 p-3 text-sm text-yellow-200 backdrop-blur-sm"
        >
          Se ha alcanzado el límite de intentos. Refresca la página y espera un momento.
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <motion.button
          type="submit"
          disabled={loading || !isFormValid || rateLimitReached || !!success}
          whileHover={
            !loading && isFormValid && !rateLimitReached && !success
              ? {
                  scale: 1.02,
                  boxShadow: '0 20px 40px -12px rgba(6, 182, 212, 0.4)',
                }
              : {}
          }
          whileTap={
            !loading && isFormValid && !rateLimitReached && !success
              ? { scale: 0.98 }
              : {}
          }
          className="w-full transform rounded-xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          <motion.span className="flex items-center justify-center gap-2">
            {loading && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
            )}
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Login Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-4 text-center text-sm text-white/70"
      >
        <p>
          ¿Ya tienes una cuenta?{' '}
          <Link
            href="/login"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Inicia sesión
          </Link>
        </p>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-4 text-center text-xs text-white/50"
      >
        <p>Al registrarte, aceptas nuestros términos y condiciones</p>
      </motion.div>
    </form>
  );
}
