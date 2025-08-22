/**
 * Apple-Grade Frontend Demo
 * Showcases the premium UI/UX improvements implemented for LookEscolar
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppleGradePhotoGallery } from '@/components/ui/apple-grade-photo-gallery';
import { AppleGradeButton, FAB, IconButton, SocialButton } from '@/components/ui/apple-grade-button';
import { OptimizedImage } from '@/components/ui/optimized-image-apple-grade';
import { pageVariants, listVariants, listItemVariants, springConfig } from '@/lib/design-system/animations';
import { colors, spacing } from '@/lib/design-system/tokens';

// Mock photo data for demonstration
const mockPhotos = Array.from({ length: 24 }, (_, i) => ({
  id: `photo-${i}`,
  src: `https://picsum.photos/400/400?random=${i}`,
  alt: `Foto escolar ${i + 1}`,
  width: 400,
  height: 400,
  price: Math.floor(Math.random() * 50) + 10,
  packageType: Math.random() > 0.5 ? 'individual' as const : 'package' as const,
}));

const AppleGradeDemoPage = () => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<'kindergarten' | 'elementary' | 'secondary'>('elementary');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<typeof mockPhotos>([]);
  const [showFeature, setShowFeature] = useState<string>('gallery');

  const ageGroupConfigs = {
    kindergarten: {
      title: 'Jardín de Infantes',
      description: 'Diseño colorido y juguetón para los más pequeños',
      colors: {
        primary: colors.kindergarten.primary,
        secondary: colors.kindergarten.secondary,
        accent: colors.kindergarten.accent,
      },
    },
    elementary: {
      title: 'Primaria',
      description: 'Interfaz amigable y estimulante para niños',
      colors: {
        primary: colors.elementary.primary,
        secondary: colors.elementary.secondary,
        accent: colors.elementary.accent,
      },
    },
    secondary: {
      title: 'Secundaria',
      description: 'Diseño sofisticado para adolescentes',
      colors: {
        primary: colors.secondary.primary,
        secondary: colors.secondary.secondary,
        accent: colors.secondary.accent,
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-white"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <motion.header 
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm"
        variants={listItemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                LookEscolar - Apple Grade UI
              </h1>
              <p className="text-gray-600 mt-1">
                Demostración de mejoras premium en el frontend
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="kindergarten">Jardín</option>
                <option value="elementary">Primaria</option>
                <option value="secondary">Secundaria</option>
              </select>
              
              <AppleGradeButton
                variant={selectionMode ? 'primary' : 'secondary'}
                onClick={() => setSelectionMode(!selectionMode)}
                ageGroup={selectedAgeGroup}
              >
                {selectionMode ? 'Salir Selección' : 'Modo Selección'}
              </AppleGradeButton>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Age Group Info */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 py-8"
        variants={listItemVariants}
      >
        <div 
          className="p-6 rounded-2xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${ageGroupConfigs[selectedAgeGroup].colors.primary}20, ${ageGroupConfigs[selectedAgeGroup].colors.secondary}20)`,
          }}
        >
          <h2 className="text-xl font-semibold mb-2">
            {ageGroupConfigs[selectedAgeGroup].title}
          </h2>
          <p className="text-gray-600 mb-4">
            {ageGroupConfigs[selectedAgeGroup].description}
          </p>
          
          <div className="flex gap-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: ageGroupConfigs[selectedAgeGroup].colors.primary }}
            />
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: ageGroupConfigs[selectedAgeGroup].colors.secondary }}
            />
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: ageGroupConfigs[selectedAgeGroup].colors.accent }}
            />
          </div>
        </div>
      </motion.section>

      {/* Feature Navigation */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 mb-8"
        variants={listItemVariants}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[
            { id: 'gallery', label: 'Galería de Fotos', icon: '🖼️' },
            { id: 'buttons', label: 'Botones Interactivos', icon: '🔘' },
            { id: 'images', label: 'Imágenes Optimizadas', icon: '🎨' },
            { id: 'animations', label: 'Animaciones', icon: '✨' },
          ].map((feature) => (
            <AppleGradeButton
              key={feature.id}
              variant={showFeature === feature.id ? 'primary' : 'ghost'}
              onClick={() => setShowFeature(feature.id)}
              ageGroup={selectedAgeGroup}
              className="flex-shrink-0"
            >
              <span className="mr-2">{feature.icon}</span>
              {feature.label}
            </AppleGradeButton>
          ))}
        </div>
      </motion.section>

      {/* Main Content */}
      <motion.main 
        className="max-w-7xl mx-auto px-4 pb-20"
        variants={listVariants}
      >
        {showFeature === 'gallery' && (
          <motion.section variants={listItemVariants}>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold mb-2">Galería de Fotos Apple-Grade</h2>
                <p className="text-gray-600 text-sm">
                  Navegación fluida, zoom suave, y interacciones apropiadas para cada edad
                </p>
              </div>
              
              <AppleGradePhotoGallery
                photos={mockPhotos}
                ageGroup={selectedAgeGroup}
                selectionMode={selectionMode}
                showPricing={true}
                onSelectionChange={setSelectedPhotos}
                className="min-h-[600px]"
              />
            </div>
          </motion.section>
        )}

        {showFeature === 'buttons' && (
          <motion.section variants={listItemVariants}>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-lg font-semibold mb-6">Botones Interactivos</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="font-medium mb-4">Botones Principales</h3>
                  <div className="flex flex-wrap gap-4">
                    <AppleGradeButton variant="primary" ageGroup={selectedAgeGroup} hapticFeedback>
                      Primario
                    </AppleGradeButton>
                    <AppleGradeButton variant="secondary" ageGroup={selectedAgeGroup}>
                      Secundario
                    </AppleGradeButton>
                    <AppleGradeButton variant="ghost" ageGroup={selectedAgeGroup}>
                      Ghost
                    </AppleGradeButton>
                    <AppleGradeButton variant="destructive" ageGroup={selectedAgeGroup}>
                      Destructivo
                    </AppleGradeButton>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Botones con Efectos</h3>
                  <div className="flex flex-wrap gap-4">
                    <AppleGradeButton 
                      variant="primary" 
                      ageGroup={selectedAgeGroup}
                      glowEffect
                      pulse
                    >
                      Con Brillo
                    </AppleGradeButton>
                    <AppleGradeButton 
                      variant="primary" 
                      ageGroup={selectedAgeGroup}
                      gradient
                      soundFeedback
                    >
                      Con Sonido
                    </AppleGradeButton>
                    <AppleGradeButton 
                      variant="primary" 
                      ageGroup={selectedAgeGroup}
                      loading
                      loadingText="Procesando..."
                    >
                      Cargando
                    </AppleGradeButton>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Botones Especializados</h3>
                  <div className="flex flex-wrap gap-4">
                    <SocialButton provider="google">
                      Continuar con Google
                    </SocialButton>
                    <SocialButton provider="apple">
                      Continuar con Apple
                    </SocialButton>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {showFeature === 'images' && (
          <motion.section variants={listItemVariants}>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-lg font-semibold mb-6">Imágenes Optimizadas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockPhotos.slice(0, 6).map((photo, index) => (
                  <div key={photo.id} className="space-y-3">
                    <OptimizedImage
                      src={photo.src}
                      alt={photo.alt}
                      width={300}
                      height={300}
                      ageGroup={selectedAgeGroup}
                      aspectRatio="square"
                      showLoadingProgress
                      watermark
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600 text-center">
                      Carga progresiva con watermark
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {showFeature === 'animations' && (
          <motion.section variants={listItemVariants}>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-lg font-semibold mb-6">Sistema de Animaciones</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="font-medium mb-4">Animaciones de Entrada</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
                        variants={listItemVariants}
                        custom={i}
                        whileHover={{ scale: 1.05, rotate: 1 }}
                        whileTap={{ scale: 0.95 }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Micro-interacciones</h3>
                  <div className="flex flex-wrap gap-4">
                    <motion.div
                      className="w-16 h-16 bg-green-500 rounded-full cursor-pointer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="w-16 h-16 bg-red-500 rounded-lg cursor-pointer"
                      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
                      whileTap={{ y: 0 }}
                    />
                    <motion.div
                      className="w-16 h-16 bg-yellow-500 rounded-full cursor-pointer"
                      whileHover={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </motion.main>

      {/* Floating Action Button */}
      <FAB
        ageGroup={selectedAgeGroup}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        ↑
      </FAB>

      {/* Selection Summary */}
      {selectionMode && selectedPhotos.length > 0 && (
        <motion.div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border px-6 py-3 z-40"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {selectedPhotos.length} foto{selectedPhotos.length !== 1 ? 's' : ''} seleccionada{selectedPhotos.length !== 1 ? 's' : ''}
            </span>
            <AppleGradeButton
              size="sm"
              variant="primary"
              ageGroup={selectedAgeGroup}
            >
              Continuar
            </AppleGradeButton>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AppleGradeDemoPage;