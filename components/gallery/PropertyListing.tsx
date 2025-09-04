'use client';

import { useState } from 'react';
import { Box, Stack, Typography, IconButton, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import BentoOutlinedIcon from '@mui/icons-material/BentoOutlined';
import { PropertyListingProps, formatPropertyLocation } from '@/lib/types/galleryMockData';

const PropertyContainer = styled(Box)({
  maxWidth: '1000px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
});

const CarouselContainer = styled(Box)({
  position: 'relative',
  height: '400px',
  overflow: 'hidden',
});

const CarouselImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.5s ease',
});

const CarouselButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  color: '#1f2937',
  width: '48px',
  height: '48px',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: 'translateY(-50%) scale(1.1)',
  },
  
  '&.prev': {
    left: '16px',
  },
  
  '&.next': {
    right: '16px',
  }
}));

const DotsContainer = styled(Stack)({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  flexDirection: 'row',
  gap: '8px',
});

const Dot = styled(Box)<{ active?: boolean }>(({ active }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    backgroundColor: '#ffffff',
    transform: 'scale(1.2)',
  }
}));

const ImageGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
  padding: '24px',
});

const GridImage = styled(Box)({
  aspectRatio: '4/3',
  borderRadius: '16px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },
  
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
});

const AllImagesButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  bottom: '16px',
  right: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  color: '#1f2937',
  fontWeight: 600,
  borderRadius: '12px',
  padding: '8px 16px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  }
}));

export function PropertyListing({
  property,
  onImageClick,
  onViewAllImages
}: PropertyListingProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleDotClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="16">Image not available</text></svg>';
  };

  const displayImages = showGrid ? property.images : property.images.slice(0, 5);
  const currentImage = property.images[currentImageIndex];

  return (
    <PropertyContainer>
      {/* Property Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #f3f4f6' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
          {property.title}
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          {formatPropertyLocation(property.location.city, property.location.state, property.location.country)}
        </Typography>
      </Box>

      {/* Image Carousel */}
      <CarouselContainer>
        <CarouselImage
          src={currentImage.src}
          alt={currentImage.alt}
          onError={handleImageError}
        />
        
        <CarouselButton className="prev" onClick={handlePrevious}>
          <ArrowBackOutlinedIcon />
        </CarouselButton>
        
        <CarouselButton className="next" onClick={handleNext}>
          <ArrowForwardOutlinedIcon />
        </CarouselButton>
        
        <DotsContainer>
          {property.images.slice(0, 5).map((_, index) => (
            <Dot
              key={index}
              active={index === currentImageIndex}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </DotsContainer>
      </CarouselContainer>

      {/* Property Info */}
      <Box sx={{ p: 3, borderBottom: '1px solid #f3f4f6' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            {property.title}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<BentoOutlinedIcon />}
            onClick={onViewAllImages}
            sx={{
              borderColor: '#d1d5db',
              color: '#374151',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb',
              }
            }}
          >
            All Images
          </Button>
        </Stack>
        <Typography variant="body1" sx={{ color: '#6b7280', mt: 1 }}>
          {formatPropertyLocation(property.location.city, property.location.state, property.location.country)}
        </Typography>
      </Box>

      {/* Image Grid */}
      <Box sx={{ position: 'relative' }}>
        <ImageGrid>
          {displayImages.map((image, index) => (
            <GridImage
              key={image.id}
              onClick={() => onImageClick(image.id)}
            >
              <img
                src={image.src}
                alt={image.alt}
                onError={handleImageError}
              />
            </GridImage>
          ))}
        </ImageGrid>
        
        {!showGrid && property.totalImages > 9 && (
          <AllImagesButton
            onClick={() => setShowGrid(true)}
            startIcon={<BentoOutlinedIcon />}
          >
            All Images
          </AllImagesButton>
        )}
      </Box>
    </PropertyContainer>
  );
}