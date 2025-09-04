'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Avatar, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import { MobileInterfaceProps } from '@/lib/types/galleryMockData';

const PhoneMockup = styled(Box)(({ theme }) => ({
  width: '300px',
  height: '600px',
  backgroundColor: '#1f2937',
  borderRadius: '32px',
  padding: '8px',
  position: 'relative',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '6px',
    backgroundColor: '#000000',
    borderRadius: '3px',
  }
}));

const PhoneScreen = styled(Box)({
  width: '100%',
  height: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  overflow: 'hidden',
  position: 'relative',
});

const AppHeader = styled(Box)({
  padding: '20px 20px 16px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #f3f4f6',
});

const GalleryCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: 'none',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  }
}));

const GalleryImage = styled('img')({
  width: '100%',
  height: '120px',
  objectFit: 'cover',
});

const ActionButton = styled(Box)({
  width: '40px',
  height: '40px',
  borderRadius: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)',
  
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: 'scale(1.1)',
  }
});

interface MobileAppInterfaceProps extends MobileInterfaceProps {
  onGalleryClick?: (galleryId: string) => void;
}

export function MobileAppInterface({
  user,
  galleries,
  onGalleryClick
}: MobileAppInterfaceProps) {
  const [activeGallery, setActiveGallery] = useState<string | null>(null);

  const handleGalleryClick = (galleryId: string) => {
    setActiveGallery(galleryId);
    onGalleryClick?.(galleryId);
  };

  return (
    <Stack direction="row" spacing={4} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* First Phone - Gallery List */}
      <PhoneMockup>
        <PhoneScreen>
          <AppHeader>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Avatar
                src={user.avatar}
                alt={user.name}
                sx={{ width: 48, height: 48 }}
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  Hello {user.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Welcome back
                </Typography>
              </Box>
            </Stack>
          </AppHeader>
          
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1f2937' }}>
              Your Galleries
            </Typography>
            
            <Stack spacing={3}>
              {galleries.map((gallery) => (
                <GalleryCard
                  key={gallery.id}
                  onClick={() => handleGalleryClick(gallery.id)}
                  sx={{
                    backgroundColor: activeGallery === gallery.id ? '#f3f4f6' : '#ffffff'
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <GalleryImage
                      src={gallery.coverImage}
                      alt={gallery.title}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="12">Gallery Image</text></svg>';
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {gallery.imageCount} photos
                    </Box>
                  </Box>
                  
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                      {gallery.title}
                    </Typography>
                  </CardContent>
                </GalleryCard>
              ))}
            </Stack>
          </Box>
        </PhoneScreen>
      </PhoneMockup>
      
      {/* Second Phone - Gallery Detail */}
      <PhoneMockup>
        <PhoneScreen>
          <AppHeader>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Avatar
                src="https://i.pravatar.cc/150?img=4"
                alt="Andrea_04"
                sx={{ width: 32, height: 32 }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                Andrea_04
              </Typography>
            </Stack>
          </AppHeader>
          
          <Box sx={{ position: 'relative', height: '300px' }}>
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop"
              alt="Featured image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14">Featured Image</text></svg>';
              }}
            />
            
            {/* Action buttons overlay */}
            <Stack
              direction="row"
              spacing={2}
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
              }}
            >
              <ActionButton>
                <FavoriteOutlinedIcon sx={{ fontSize: '1.2rem', color: '#ef4444' }} />
              </ActionButton>
              <ActionButton>
                <ShareOutlinedIcon sx={{ fontSize: '1.2rem', color: '#6b7280' }} />
              </ActionButton>
              <ActionButton>
                <MoreHorizOutlinedIcon sx={{ fontSize: '1.2rem', color: '#6b7280' }} />
              </ActionButton>
            </Stack>
          </Box>
          
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Shared gallery • 24 photos
            </Typography>
            
            {/* Thumbnail grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <Box
                  key={index}
                  sx={{
                    aspectRatio: '1',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={`https://images.unsplash.com/photo-${1500000000000 + index * 1000000}?w=100&h=100&fit=crop`}
                    alt={`Thumbnail ${index}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>';
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </PhoneScreen>
      </PhoneMockup>
    </Stack>
  );
}