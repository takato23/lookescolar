'use client';

import { Card, CardMedia, Box, Typography, Chip } from '@mui/material';
import { ImageItem, CategoryItem } from '@/lib/data/galleryMockData';

interface ImageCardProps {
  image: ImageItem;
  categories: CategoryItem[];
  onImageClick?: (imageId: string) => void;
  isSelected?: boolean;
}

export function ImageCard({ 
  image, 
  categories, 
  onImageClick, 
  isSelected = false 
}: ImageCardProps) {
  const categoryData = categories.find(cat => cat.id === image.category);
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={() => onImageClick?.(image.id)}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        maxWidth: '100%',
        height: 'auto'
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={image.src}
        alt={image.alt}
        sx={{
          objectFit: 'cover',
          height: 200,
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          }
        }}
      />
      
      {/* Category label overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          padding: '16px 12px 8px',
        }}
      >
        {categoryData && (
          <Chip
            label={categoryData.name}
            size="small"
            sx={{
              backgroundColor: categoryData.color,
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          />
        )}
      </Box>
    </Card>
  );
}