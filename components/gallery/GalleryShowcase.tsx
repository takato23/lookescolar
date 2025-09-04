'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CategoryFilterButtons } from './CategoryFilterButtons';
import { ImageGridLayout } from './ImageGridLayout';
import { PaginationControls } from './PaginationControls';
import { MobileAppInterface } from './MobileAppInterface';
import { PropertyListing } from './PropertyListing';
import { 
  CategoryType, 
  mockGalleryData, 
  mockMobileData, 
  mockPropertyData 
} from '@/lib/types/galleryMockData';

const ShowcaseSection = styled(Box)(({ theme }) => ({
  padding: '48px 0',
  backgroundColor: '#ffffff',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#1f2937',
  marginBottom: '16px',
  textAlign: 'center',
}));

const SectionDescription = styled(Typography)(({ theme }) => ({
  fontSize: '1.125rem',
  color: '#6b7280',
  marginBottom: '48px',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '0 auto 48px',
}));

const DividerSection = styled(Box)({
  height: '80px',
  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export function GalleryShowcase() {
  const [currentCategory, setCurrentCategory] = useState<CategoryType>(CategoryType.ALL);
  const [currentPage, setCurrentPage] = useState(2);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(['1', '3', '5']));

  // Filter images based on current category
  const filteredImages = currentCategory === CategoryType.ALL 
    ? mockGalleryData.images 
    : mockGalleryData.images.filter(img => img.category === currentCategory);

  const handleCategoryChange = (category: CategoryType) => {
    setCurrentCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFavoriteClick = (imageId: string) => {
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleImageClick = (image: any) => {
    console.log('Image clicked:', image);
  };

  const handleGalleryClick = (galleryId: string) => {
    console.log('Gallery clicked:', galleryId);
  };

  const handlePropertyImageClick = (imageId: string) => {
    console.log('Property image clicked:', imageId);
  };

  const handleViewAllImages = () => {
    console.log('View all images clicked');
  };

  return (
    <Box>
      {/* Gallery with Category Filters Section */}
      <ShowcaseSection>
        <Container maxWidth="lg">
          <SectionTitle>
            Galería de imágenes
          </SectionTitle>
          <SectionDescription>
            Explora nuestra colección organizada por categorías con filtros intuitivos y navegación fluida
          </SectionDescription>

          <CategoryFilterButtons
            categories={mockGalleryData.categories}
            currentCategory={currentCategory}
            onCategoryChange={handleCategoryChange}
          />

          <ImageGridLayout
            images={filteredImages}
            categories={mockGalleryData.categories}
            onImageClick={handleImageClick}
            onFavoriteClick={handleFavoriteClick}
            favoriteIds={favoriteIds}
          />

          <PaginationControls
            pagination={mockGalleryData.pagination}
            onPageChange={handlePageChange}
          />
        </Container>
      </ShowcaseSection>

      <DividerSection>
        <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 600 }}>
          Mobile App Interface
        </Typography>
      </DividerSection>

      {/* Mobile App Interface Section */}
      <ShowcaseSection sx={{ backgroundColor: '#f8fafc' }}>
        <Container maxWidth="lg">
          <SectionTitle>
            Mobile Gallery Experience
          </SectionTitle>
          <SectionDescription>
            Interfaz móvil optimizada para navegación táctil y experiencia de usuario fluida
          </SectionDescription>

          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <MobileAppInterface
              user={mockMobileData.user}
              galleries={mockMobileData.galleries}
              onGalleryClick={handleGalleryClick}
            />
          </Box>
        </Container>
      </ShowcaseSection>

      <DividerSection>
        <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 600 }}>
          Property Showcase
        </Typography>
      </DividerSection>

      {/* Property Listing Section */}
      <ShowcaseSection>
        <Container maxWidth="lg">
          <SectionTitle>
            Property Image Gallery
          </SectionTitle>
          <SectionDescription>
            Showcase inmobiliario con carrusel interactivo y vista de cuadrícula para explorar propiedades
          </SectionDescription>

          <PropertyListing
            property={mockPropertyData}
            onImageClick={handlePropertyImageClick}
            onViewAllImages={handleViewAllImages}
          />
        </Container>
      </ShowcaseSection>
    </Box>
  );
}