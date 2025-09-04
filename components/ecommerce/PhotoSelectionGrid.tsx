'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Badge, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { PhotoData } from '@/lib/types/ecommerceMockData';

const PhotoGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '16px',
  marginTop: '16px',
});

const PhotoCard = styled(Box)<{ selected?: boolean; disabled?: boolean }>(({ selected, disabled }) => ({
  position: 'relative',
  borderRadius: '16px',
  overflow: 'hidden',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: selected ? '3px solid #10b981' : '2px solid #e5e7eb',
  opacity: disabled ? 0.5 : 1,
  
  '&:hover': {
    transform: disabled ? 'none' : 'translateY(-4px)',
    boxShadow: disabled ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.12)',
    borderColor: selected ? '#10b981' : '#9ca3af',
  }
}));

const PhotoImage = styled('img')({
  width: '100%',
  height: '240px',
  objectFit: 'cover',
});

const PhotoOverlay = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: selected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: selected ? 1 : 0,
  transition: 'opacity 0.3s ease',
  
  '.PhotoCard:hover &': {
    opacity: 1,
  }
}));

const PhotoTypeChip = styled(Chip)<{ phototype: 'individual' | 'group' }>(({ phototype }) => ({
  position: 'absolute',
  top: '12px',
  left: '12px',
  backgroundColor: phototype === 'individual' ? '#3b82f6' : '#f59e0b',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '0.75rem',
}));

const SelectionIndicator = styled(Box)({
  position: 'absolute',
  top: '12px',
  right: '12px',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

interface PhotoSelectionGridProps {
  photos: PhotoData[];
  selectedPhotos: {
    individual: string[];
    group: string[];
  };
  requirements: {
    individualPhotos: number;
    groupPhotos: number;
  };
  onPhotoSelect: (photoId: string, type: 'individual' | 'group') => void;
}

export function PhotoSelectionGrid({
  photos,
  selectedPhotos,
  requirements,
  onPhotoSelect
}: PhotoSelectionGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (photoId: string) => {
    setLoadedImages(prev => new Set([...prev, photoId]));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Vista previa no disponible</text></svg>';
  };

  const individualPhotos = photos.filter(p => p.type === 'individual');
  const groupPhotos = photos.filter(p => p.type === 'group');

  const canSelectIndividual = selectedPhotos.individual.length < requirements.individualPhotos;
  const canSelectGroup = selectedPhotos.group.length < requirements.groupPhotos;

  return (
    <Stack spacing={4}>
      {/* Individual Photos Section */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PersonIcon sx={{ color: '#3b82f6', fontSize: '1.25rem' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Fotos Individuales
            </Typography>
          </Stack>
          
          <Badge
            badgeContent={`${selectedPhotos.individual.length}/${requirements.individualPhotos}`}
            color={selectedPhotos.individual.length === requirements.individualPhotos ? 'success' : 'primary'}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '12px',
              }
            }}
          >
            <Box />
          </Badge>
        </Stack>
        
        <PhotoGrid>
          {individualPhotos.map((photo) => {
            const isSelected = selectedPhotos.individual.includes(photo.id);
            const isDisabled = !isSelected && !canSelectIndividual;
            const isLoaded = loadedImages.has(photo.id);
            
            return (
              <PhotoCard
                key={photo.id}
                className="PhotoCard"
                selected={isSelected}
                disabled={isDisabled}
                onClick={() => !isDisabled && onPhotoSelect(photo.id, 'individual')}
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
                        width: '32px',
                        height: '32px',
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
                
                <PhotoImage
                  src={photo.preview_url}
                  alt={photo.filename}
                  onLoad={() => handleImageLoad(photo.id)}
                  onError={handleImageError}
                  style={{ opacity: isLoaded ? 1 : 0 }}
                />
                
                <PhotoTypeChip
                  phototype="individual"
                  label="Individual"
                  size="small"
                  icon={<PersonIcon sx={{ fontSize: '0.875rem' }} />}
                />
                
                {isSelected && (
                  <SelectionIndicator>
                    <CheckCircleIcon sx={{ color: '#ffffff', fontSize: '1.25rem' }} />
                  </SelectionIndicator>
                )}
                
                <PhotoOverlay selected={isSelected}>
                  {isSelected ? (
                    <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      Seleccionada
                    </Typography>
                  ) : isDisabled ? (
                    <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center' }}>
                      Límite alcanzado
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center' }}>
                      Clic para seleccionar
                    </Typography>
                  )}
                </PhotoOverlay>
              </PhotoCard>
            );
          })}
        </PhotoGrid>
      </Box>

      {/* Group Photos Section */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GroupIcon sx={{ color: '#f59e0b', fontSize: '1.25rem' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Fotos Grupales
            </Typography>
          </Stack>
          
          <Badge
            badgeContent={`${selectedPhotos.group.length}/${requirements.groupPhotos}`}
            color={selectedPhotos.group.length === requirements.groupPhotos ? 'success' : 'warning'}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '12px',
              }
            }}
          >
            <Box />
          </Badge>
        </Stack>
        
        {groupPhotos.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: '#fef7ff',
              borderRadius: '16px',
              border: '2px dashed #d1d5db',
            }}
          >
            <GroupIcon sx={{ fontSize: '3rem', color: '#9ca3af', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
              No hay fotos grupales disponibles
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Las fotos grupales se agregarán automáticamente cuando estén disponibles
            </Typography>
          </Box>
        ) : (
          <PhotoGrid>
            {groupPhotos.map((photo) => {
              const isSelected = selectedPhotos.group.includes(photo.id);
              const isDisabled = !isSelected && !canSelectGroup;
              const isLoaded = loadedImages.has(photo.id);
              
              return (
                <PhotoCard
                  key={photo.id}
                  className="PhotoCard"
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onPhotoSelect(photo.id, 'group')}
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
                          width: '32px',
                          height: '32px',
                          border: '3px solid #e5e7eb',
                          borderTop: '3px solid #f59e0b',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    </Box>
                  )}
                  
                  <PhotoImage
                    src={photo.preview_url}
                    alt={photo.filename}
                    onLoad={() => handleImageLoad(photo.id)}
                    onError={handleImageError}
                    style={{ opacity: isLoaded ? 1 : 0 }}
                  />
                  
                  <PhotoTypeChip
                    phototype="group"
                    label="Grupal"
                    size="small"
                    icon={<GroupIcon sx={{ fontSize: '0.875rem' }} />}
                  />
                  
                  {isSelected && (
                    <SelectionIndicator>
                      <CheckCircleIcon sx={{ color: '#ffffff', fontSize: '1.25rem' }} />
                    </SelectionIndicator>
                  )}
                  
                  <PhotoOverlay selected={isSelected}>
                    {isSelected ? (
                      <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        Seleccionada
                      </Typography>
                    ) : isDisabled ? (
                      <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center' }}>
                        Límite alcanzado
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center' }}>
                        Clic para seleccionar
                      </Typography>
                    )}
                  </PhotoOverlay>
                </PhotoCard>
              );
            })}
          </PhotoGrid>
        )}
      </Box>
    </Stack>
  );
}