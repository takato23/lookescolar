'use client';

import Link from 'next/link';
import LoginForm from '@/components/admin/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,_white,_rgba(255,255,255,0))]"></div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">
              Iniciar Sesión
            </h1>
            <p className="text-white/70">Panel de Administración</p>
          </div>

          <LoginForm />

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
