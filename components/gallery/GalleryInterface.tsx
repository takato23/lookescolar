'use client';

import { useState, useEffect } from 'react';
import { Container, Box, ThemeProvider } from '@mui/material';
import { GalleryHeader } from './GalleryHeader';
import { CategoryFilter } from './CategoryFilter';
import { ImageGrid } from './ImageGrid';
import { PaginationControls } from './PaginationControls';
import { 
  mockGalleryData, 
  CategoryItem, 
  ImageItem,
  GalleryProps 
} from '@/lib/data/galleryMockData';
import galleryTheme from '@/lib/theme/galleryTheme';

interface GalleryInterfaceProps {
  token?: string;
  photos?: any[];
  subject?: any;
  onImageSelect?: (imageId: string) => void;
  selectionMode?: boolean;
  maxSelections?: number;
}

export function GalleryInterface({
  token,
  photos = [],
  subject,
  onImageSelect,
  selectionMode = false,
  maxSelections
}: GalleryInterfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [currentPage, setCurrentPage] = useState<number>(mockGalleryData.currentPage);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Convert photos to ImageItem format if provided, otherwise use mock data
  const images: ImageItem[] = photos.length > 0 
    ? photos.map((photo, index) => ({
        id: photo.id || `photo-${index}`,
        src: photo.preview_url || photo.src,
        category: `categoria-${(index % 6) + 1}`, // Distribute across categories
        alt: photo.filename || photo.alt || `Image ${index + 1}`
      }))
    : mockGalleryData.images;

  const categories = mockGalleryData.categories.map(cat => ({
    ...cat,
    active: cat.id === selectedCategory
  }));

  // Filter images based on selected category
  const filteredImages = selectedCategory === 'todas' 
    ? images 
    : images.filter(img => img.category === selectedCategory);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page when changing category
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleImageClick = (imageId: string) => {
    if (selectionMode) {
      setSelectedImages(prev => {
        if (prev.includes(imageId)) {
          // Remove from selection
          return prev.filter(id => id !== imageId);
        } else {
          // Add to selection (check max limit)
          if (maxSelections && prev.length >= maxSelections) {
            return prev; // Don't add if at max
          }
          return [...prev, imageId];
        }
      });
    }
    
    onImageSelect?.(imageId);
  };

  // Debug logging
  console.log('🎨 GalleryInterface rendering:', {
    photosCount: photos?.length || 0,
    imagesCount: images.length,
    selectedCategory,
    selectionMode
  });

  return (
    <ThemeProvider theme={galleryTheme}>
      <Container maxWidth="xl" className="py-8">
        <Box className="bg-white">
          <GalleryHeader />
          
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
          
          <ImageGrid
            images={filteredImages}
            categories={categories}
            selectedImages={selectedImages}
            onImageClick={handleImageClick}
          />
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={mockGalleryData.totalPages}
            onPageChange={handlePageChange}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
}