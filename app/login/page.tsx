'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoginForm from '@/components/admin/LoginForm';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic imports for Three.js components to avoid SSR issues
const Canvas = dynamic(
  () => import('@react-three/fiber').then(mod => ({ default: mod.Canvas })),
  { ssr: false }
);
const Float = dynamic(
  () => import('@react-three/drei').then(mod => ({ default: mod.Float })),
  { ssr: false }
);
const LoginIris = dynamic(
  () => import('@/components/login/LoginIris').then(mod => ({ default: mod.LoginIris })),
  { ssr: false }
);
const Particles = dynamic(
  () => import('@/components/landing/Particles').then(mod => ({ default: mod.Particles })),
  { ssr: false }
);

export default function LoginPage() {
  const [showContent, setShowContent] = useState(false);
  const [fadeFromWhite, setFadeFromWhite] = useState(true);
  const [irisReady, setIrisReady] = useState(false);

  useEffect(() => {
    // Optimized timing sequence for seamless transition
    // Phase 1: White flash fade (continues tunnel effect)
    const whiteTimer = setTimeout(() => setFadeFromWhite(false), 400);

    // Phase 2: Iris becomes visible and starts opening
    const irisTimer = setTimeout(() => setIrisReady(true), 200);

    // Phase 3: Content fades in after iris is open
    const contentTimer = setTimeout(() => setShowContent(true), 1000);

    return () => {
      clearTimeout(whiteTimer);
      clearTimeout(irisTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden font-sans">
      {/* Flash blanco de entrada (continuación del túnel) - mejorado */}
      <AnimatePresence>
        {fadeFromWhite && (
          <motion.div
            className="fixed inset-0 z-50 bg-white pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1] // Cubic ease out
            }}
          />
        )}
      </AnimatePresence>

      {/* Premium Background Gradient - mismo que landing */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(20, 40, 80, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(60, 20, 80, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(0, 20, 40, 0.8) 0%, transparent 70%),
            linear-gradient(180deg, #000000 0%, #050510 50%, #000005 100%)
          `
        }}
      />

      {/* 3D Background Layer - optimizado */}
      <div className="absolute inset-0 z-[1]">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false, // Optimize - not needed
            depth: true
          }}
          dpr={[1, 2]}
          frameloop="demand" // Only render when needed
        >
          <Suspense fallback={null}>
            <LoginIris isReady={irisReady} />
            <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.3}>
              <Particles count={60} /> {/* Reduced for performance */}
            </Float>
          </Suspense>
        </Canvas>
      </div>

      {/* Ambient Glow - mejorado */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none z-[2]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
      />
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-[2]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />

      {/* Content - mejorado con más polish */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.8 }
            }}
            className="relative w-full max-w-md z-10 px-4"
          >
            {/* Glass card con efecto hover sutil */}
            <motion.div
              className="rounded-3xl border border-white/10 bg-black/70 p-8 shadow-2xl backdrop-blur-xl"
              whileHover={{
                borderColor: "rgba(255,255,255,0.15)",
                boxShadow: "0 25px 50px -12px rgba(100, 200, 255, 0.15)"
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mb-2 text-4xl font-black tracking-tighter text-white"
                >
                  APERTURA
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-gray-400 font-light tracking-wide"
                >
                  Acceso a tu cuenta
                </motion.p>
              </div>

              {/* Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <LoginForm />
              </motion.div>

              {/* Back link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="mt-8 text-center"
              >
                <Link
                  href="/"
                  className="group relative inline-flex items-center gap-2 text-sm text-gray-500 transition-all duration-300 hover:text-white"
                >
                  <motion.span
                    className="inline-block"
                    whileHover={{ x: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    ←
                  </motion.span>
                  <span className="relative">
                    Volver al inicio
                    <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-white transition-all duration-300 group-hover:w-full" />
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
