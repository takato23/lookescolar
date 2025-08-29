'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BrutalistHeader,
  BrutalistText,
  BrutalistSectionHeader,
  BrutalistLabel,
} from '@/components/ui/brutalist-typography';
import { ProductGrid } from '@/components/ui/product-grid';
import { AdminLoginModal } from '@/components/ui/admin-login-modal';
import { FamilyAccessSection } from '@/components/ui/family-access-section';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      // TODO: Implement newsletter subscription API
      console.log('Newsletter signup:', email);

      // Show success feedback
      alert('¡Gracias por suscribirte! Te mantendremos informado.');
      setEmail('');
    } catch (error) {
      console.error('Newsletter signup error:', error);
      alert('Error al suscribirse. Por favor intenta nuevamente.');
    }
  };

  const handleAdminLogin = (email: string, password: string) => {
    console.log('Admin login:', { email, password });
    // Redirect to admin dashboard
    window.location.href = '/admin';
  };

  const handleFamilyAccess = (token: string) => {
    console.log('Family access:', { token });
    // This will be handled by the FamilyAccessSection component
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              className="font-mono text-sm uppercase tracking-wider hover:underline"
              aria-label="Ver información sobre LookEscolar"
            >
              Información
            </button>
            <AdminLoginModal onLogin={handleAdminLogin} />
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="px-6 pb-12 pt-20">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <BrutalistHeader className="mb-8">LOOKESCOLAR</BrutalistHeader>
            <BrutalistText className="mb-2 text-gray-600">
              Un nuevo sistema de fotografía escolar
            </BrutalistText>
            <BrutalistText className="text-gray-600">
              @lookescolar
            </BrutalistText>
          </motion.div>
        </div>
      </section>

      {/* Event Information Grid */}
      <section className="px-6 py-12">
        <div className="container mx-auto">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-3">
            <div className="border-r border-gray-200 pr-8 text-center">
              <BrutalistLabel className="mb-4 block">Qué:</BrutalistLabel>
              <BrutalistSectionHeader className="mb-2">
                SISTEMA
              </BrutalistSectionHeader>
              <BrutalistSectionHeader>COMPLETO</BrutalistSectionHeader>
            </div>

            <div className="border-r border-gray-200 pr-8 text-center">
              <BrutalistLabel className="mb-4 block">Cuándo:</BrutalistLabel>
              <BrutalistSectionHeader className="mb-2">
                DISPONIBLE
              </BrutalistSectionHeader>
              <BrutalistSectionHeader>24/7</BrutalistSectionHeader>
            </div>

            <div className="text-center">
              <BrutalistLabel className="mb-4 block">Dónde:</BrutalistLabel>
              <BrutalistSectionHeader className="mb-2">
                TU ESCUELA
              </BrutalistSectionHeader>
              <BrutalistSectionHeader>ARGENTINA</BrutalistSectionHeader>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Grid */}
      <section className="py-12">
        <ProductGrid />
      </section>

      {/* Family Access Section */}
      <FamilyAccessSection onAccess={handleFamilyAccess} />

      {/* Brand Statement */}
      <section className="px-6 py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <BrutalistSectionHeader className="mb-8 leading-tight">
              LookEscolar es una revolución contra lo ordinario. Sin
              complicaciones, sin papeles—solo gestión profesional.
            </BrutalistSectionHeader>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="container mx-auto max-w-2xl text-center">
          <form onSubmit={handleNewsletterSubmit} className="space-y-6">
            <BrutalistText className="mb-6">
              Suscribite a nuestro newsletter
            </BrutalistText>

            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 flex-1 rounded-none border-2 border-black bg-white text-center font-mono focus:border-black focus:ring-0"
                required
              />
              <Button
                type="submit"
                className="h-12 rounded-none border-2 border-black bg-black px-8 font-mono text-xs uppercase tracking-wider text-white hover:bg-gray-800"
              >
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-16">
        <div className="container mx-auto text-center">
          <BrutalistHeader className="mb-8 text-4xl md:text-6xl">
            LOOKESCOLAR
          </BrutalistHeader>

          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between md:flex-row">
            <BrutalistText className="mb-4 md:mb-0">
              Un Sistema de Gestión Fotográfica
            </BrutalistText>

            <div className="space-y-2 text-center md:text-right">
              <BrutalistText>
                LookEscolar© 2025 Todos los Derechos Reservados
              </BrutalistText>
              <BrutalistText className="text-gray-600">
                @lookescolar
              </BrutalistText>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
