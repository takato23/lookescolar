'use client';

import { Stack, Box } from '@mui/material';
import { ImageCard } from './ImageCard';
import { ImageItem, CategoryItem } from '@/lib/data/galleryMockData';

interface ImageGridProps {
  images: ImageItem[];
  categories: CategoryItem[];
  selectedImages?: string[];
  onImageClick?: (imageId: string) => void;
}

export function ImageGrid({ 
  images, 
  categories, 
  selectedImages = [], 
  onImageClick 
}: ImageGridProps) {
  return (
    <Box className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            categories={categories}
            onImageClick={onImageClick}
            isSelected={selectedImages.includes(image.id)}
          />
        ))}
      </div>
    </Box>
  );
}