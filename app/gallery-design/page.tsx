'use client';

import { GalleryInterface } from '@/components/gallery/GalleryInterface';
// import { UnifiedStoreWithGallery } from '@/components/store/UnifiedStoreWithGallery';
import { mockGalleryData } from '@/lib/data/galleryMockData';
import { useState } from 'react';
import { Button, Stack, Typography, Box, Container } from '@mui/material';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GalleryCover } from '@/components/gallery/GalleryCover';

// Mock data for preview
const mockPhotos = mockGalleryData.images.map((img, index) => ({
  id: img.id,
  filename: `photo-${index + 1}.jpg`,
  preview_url: img.src,
  size: 2048000,
  width: 800,
  height: 600,
}));

const mockSubject = {
  id: 'event-1',
  name: 'Graduación 2024',
  grade_section: '6to Grado A',
  event: {
    name: 'Graduación 2024',
    school_name: 'Escuela Primaria San Martín',
    theme: 'default',
  },
};

export default function GalleryStylePreview() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box className="min-h-screen bg-gray-50">
      <Container maxWidth="xl" className="py-8">
        {/* Preview Header */}
        <Box className="text-center mb-8">
          <Typography variant="h3" className="font-bold text-gray-900 mb-4">
            Gallery Style Interface Preview
          </Typography>
          <Typography variant="body1" className="text-gray-600 mb-6">
            Demostración de la interfaz de galería con filtros por categoría y navegación
          </Typography>

          {/* Tab Navigation */}
          <Tabs value={currentTab.toString()} onValueChange={(value) => setCurrentTab(parseInt(value))} className="mb-8">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="0">Galería Simple</TabsTrigger>
              <TabsTrigger value="1">Tienda con Galería</TabsTrigger>
              <TabsTrigger value="2">Estilos de Portada</TabsTrigger>
            </TabsList>
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Tabs value={currentTab.toString()} onValueChange={(value) => setCurrentTab(parseInt(value))}>
          <TabsContent value="0">
            <Box>
              <Typography variant="h5" className="text-center mb-6 text-gray-800">
                Interfaz de Galería Básica
              </Typography>
              <GalleryInterface
                photos={mockPhotos}
                subject={mockSubject}
                onImageSelect={(imageId) => console.log('Selected image:', imageId)}
              />
            </Box>
          </TabsContent>

          <TabsContent value="1">
            <Box>
              <Typography variant="h5" className="text-center mb-6 text-gray-800">
                Tienda Unificada con Galería
              </Typography>
              <div className="p-8 text-center border border-dashed rounded bg-gray-50">
                UnifiedStoreWithGallery component not found in this branch.
              </div>
              {/* <UnifiedStoreWithGallery
                token="demo-token-12345"
                photos={mockPhotos}
                subject={mockSubject}
                callbackBase="store-unified"
              /> */}
            </Box>
          </TabsContent>

          <TabsContent value="2">
            <Box className="space-y-12">
              <Box>
                <Typography variant="h6" className="mb-4 text-gray-500 uppercase tracking-widest text-center">Vintage Style</Typography>
                <div className="border border-gray-200 shadow-xl overflow-hidden rounded-lg transform scale-90">
                  <GalleryCover
                    variant="vintage"
                    title="Graduación 2024"
                    subtitle="Escuela San Martín"
                    date="Diciembre 12, 2024"
                    backgroundImage="https://images.unsplash.com/photo-1627552245715-77d79bbf6fe2?q=80&w=3569&auto=format&fit=crop"
                  />
                </div>
              </Box>

              <Box>
                <Typography variant="h6" className="mb-4 text-gray-500 uppercase tracking-widest text-center">Classic Style</Typography>
                <div className="border border-gray-200 shadow-xl overflow-hidden rounded-lg transform scale-90">
                  <GalleryCover
                    variant="classic"
                    title="Momentos Especiales"
                    subtitle="Colección Anual"
                    date="2024"
                    backgroundImage="https://images.unsplash.com/photo-1511285560982-1351cdeb9821?q=80&w=2938&auto=format&fit=crop"
                  />
                </div>
              </Box>
            </Box>
          </TabsContent>
        </Tabs>
      </Container>
    </Box>
  );
}