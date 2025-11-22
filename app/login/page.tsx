'use client';

import Link from 'next/link';
import LoginForm from '@/components/admin/LoginForm';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden font-sans">
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/images/background-texture.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-md z-10 px-4"
      >
        <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-black tracking-tighter text-white mix-blend-difference">
              APERTURA
            </h1>
            <p className="text-gray-400 font-light tracking-wide">Acceso a tu cuenta</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-white hover:underline underline-offset-4"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
