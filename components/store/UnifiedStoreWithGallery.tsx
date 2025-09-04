'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import { PRODUCT_CATALOG } from '@/lib/types/unified-store';
import { GalleryInterface } from '@/components/gallery/GalleryInterface';
import { Button, Stack, Typography, Box, Container } from '@mui/material';
import { ArrowBack, ShoppingCart } from '@mui/icons-material';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
    theme?: string;
  };
}

interface UnifiedStoreWithGalleryProps {
  token: string;
  photos: Photo[];
  subject: Subject;
  onBack?: () => void;
  callbackBase?: 'share' | 'f' | 'store' | 'store-unified';
}

export function UnifiedStoreWithGallery({
  token,
  photos,
  subject,
  onBack,
  callbackBase = 'f',
}: UnifiedStoreWithGalleryProps) {
  const router = useRouter();
  const {
    // State
    selectedPackage,
    selectedPhotos,
    checkoutStep,
    
    // Actions
    setToken,
    setEventInfo,
    selectPackage,
    selectIndividualPhoto,
    selectGroupPhoto,
    getTotalPrice,
    nextStep,
  } = useUnifiedStore();

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Initialize store
  useEffect(() => {
    setToken(token);
    setEventInfo({
      name: subject.event.name,
      schoolName: subject.event.school_name,
      gradeSection: subject.grade_section,
    });
  }, [token, subject, setToken, setEventInfo]);

  // Auto-select a default package for demo
  useEffect(() => {
    if (!selectedPackage && PRODUCT_CATALOG.productOptions.length > 0) {
      selectPackage(PRODUCT_CATALOG.productOptions[0].id);
    }
  }, [selectedPackage, selectPackage]);

  const handleImageSelect = (imageId: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        // Remove from selection
        selectIndividualPhoto(imageId); // This will toggle in the store
        return prev.filter(id => id !== imageId);
      } else {
        // Add to selection
        selectIndividualPhoto(imageId); // This will toggle in the store
        return [...prev, imageId];
      }
    });
    
    toast.success(`Foto ${selectedImages.includes(imageId) ? 'removida de' : 'agregada a'} la selección`);
  };

  const handleProceedToCheckout = () => {
    if (selectedPhotos.individual.length === 0) {
      toast.error('Selecciona al menos una foto para continuar');
      return;
    }
    
    // Navigate to the original store checkout
    router.push(`/store-unified/${token}?step=contact`);
  };

  const maxSelections = selectedPackage?.contents.individualPhotos || 5;

  // Debug logging
  console.log('🔍 UnifiedStoreWithGallery rendering:', {
    token: token.slice(0, 8) + '...',
    photosCount: photos?.length || 0,
    subjectName: subject?.event?.name,
    selectedPackage: selectedPackage?.name
  });

  return (
    <Box className="min-h-screen bg-white">
      {/* Header with store info */}
      <Container maxWidth="xl" className="py-4">
        <Stack direction="row" justifyContent="space-between" alignItems="center" className="mb-6">
          <Stack direction="row" alignItems="center" spacing={2}>
            {onBack && (
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={onBack}
                className="border-gray-300 text-gray-700"
              >
                Volver
              </Button>
            )}
            <Box>
              <Typography variant="h5" className="font-bold text-gray-900">
                {subject.event.name}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                {subject.event.school_name} - {subject.grade_section}
              </Typography>
            </Box>
          </Stack>

          {selectedPackage && (
            <Stack alignItems="flex-end" spacing={1}>
              <Typography variant="body2" className="text-gray-600">
                Paquete seleccionado: {selectedPackage.name}
              </Typography>
              <Typography variant="h6" className="font-bold text-green-600">
                {formatCurrency(getTotalPrice())}
              </Typography>
              <Typography variant="caption" className="text-gray-500">
                {selectedPhotos.individual.length}/{maxSelections} fotos seleccionadas
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Selection info bar */}
        {selectedPackage && (
          <Box className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={2}>
                <ShoppingCart className="text-blue-600" />
                <Box>
                  <Typography variant="body1" className="font-medium text-blue-900">
                    Selecciona tus fotos favoritas
                  </Typography>
                  <Typography variant="body2" className="text-blue-700">
                    Puedes elegir hasta {maxSelections} fotos para tu {selectedPackage.name}
                  </Typography>
                </Box>
              </Stack>
              
              <Button
                variant="contained"
                onClick={handleProceedToCheckout}
                disabled={selectedPhotos.individual.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continuar ({selectedPhotos.individual.length})
              </Button>
            </Stack>
          </Box>
        )}
      </Container>

      {/* Gallery Interface */}
      <GalleryInterface
        token={token}
        photos={photos}
        subject={subject}
        onImageSelect={handleImageSelect}
        selectionMode={true}
        maxSelections={maxSelections}
      />
    </Box>
  );
}