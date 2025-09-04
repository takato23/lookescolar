'use client';

import { GalleryInterface } from '@/components/gallery/GalleryInterface';
import { UnifiedStoreWithGallery } from '@/components/store/UnifiedStoreWithGallery';
import { mockGalleryData } from '@/lib/data/galleryMockData';
import { useState } from 'react';
import { Button, Stack, Typography, Box, Container } from '@mui/material';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="0">Galería Simple</TabsTrigger>
              <TabsTrigger value="1">Tienda con Galería</TabsTrigger>
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
              <UnifiedStoreWithGallery
                token="demo-token-12345"
                photos={mockPhotos}
                subject={mockSubject}
                callbackBase="store-unified"
              />
            </Box>
          </TabsContent>
        </Tabs>
      </Container>
    </Box>
  );
}