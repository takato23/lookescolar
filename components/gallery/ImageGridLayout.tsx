'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import { ImageData, CategoryData } from '@/lib/types/galleryMockData';

const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: '16px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: '#ffffff',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    
    '& .image-overlay': {
      opacity: 1,
    },
    
    '& .category-chip': {
      transform: 'translateY(0)',
      opacity: 1,
    },
    
    '& .favorite-icon': {
      transform: 'scale(1.1)',
      opacity: 1,
    }
  }
}));

const ImageElement = styled('img')({
  width: '100%',
  height: '240px',
  objectFit: 'cover',
  display: 'block',
});

const ImageOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '16px',
});

const CategoryChip = styled(Chip)<{ categorycolor?: string }>(({ categorycolor }) => ({
  position: 'absolute',
  top: '12px',
  left: '12px',
  backgroundColor: categorycolor || '#1976d2',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '0.75rem',
  height: '28px',
  borderRadius: '14px',
  transform: 'translateY(-8px)',
  opacity: 0,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
}));

const FavoriteIcon = styled(FavoriteOutlinedIcon)({
  position: 'absolute',
  top: '12px',
  right: '12px',
  color: '#ffffff',
  fontSize: '24px',
  opacity: 0.7,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  
  '&:hover': {
    color: '#ff4757',
    transform: 'scale(1.2)',
  }
});

interface ImageGridLayoutProps {
  images: ImageData[];
  categories: CategoryData[];
  onImageClick?: (image: ImageData) => void;
  onFavoriteClick?: (imageId: string) => void;
  favoriteIds?: Set<string>;
}

export function ImageGridLayout({
  images,
  categories,
  onImageClick,
  onFavoriteClick,
  favoriteIds = new Set()
}: ImageGridLayoutProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#1976d2';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 3,
        mb: 4,
      }}
    >
      {images.map((image) => {
        const categoryColor = getCategoryColor(image.category);
        const categoryName = getCategoryName(image.category);
        const isFavorite = favoriteIds.has(image.id);
        const isLoaded = loadedImages.has(image.id);

        return (
          <ImageContainer
            key={image.id}
            onClick={() => onImageClick?.(image)}
          >
            {!isLoaded && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '16px',
                }}
              >
                <Box
                  sx={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </Box>
            )}
            
            <ImageElement
              src={image.src}
              alt={image.alt}
              onLoad={() => handleImageLoad(image.id)}
              onError={handleImageError}
              style={{ opacity: isLoaded ? 1 : 0 }}
            />
            
            <CategoryChip
              className="category-chip"
              label={categoryName}
              size="small"
              categorycolor={categoryColor}
            />
            
            <FavoriteIcon
              className="favorite-icon"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteClick?.(image.id);
              }}
              sx={{
                color: isFavorite ? '#ff4757' : '#ffffff',
                opacity: isFavorite ? 1 : 0.7,
              }}
            />
            
            <ImageOverlay className="image-overlay">
              <Box />
              <Stack spacing={1}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 600,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    fontSize: '0.875rem',
                  }}
                >
                  {image.alt}
                </Typography>
              </Stack>
            </ImageOverlay>
          </ImageContainer>
        );
      })}
    </Box>
  );
}