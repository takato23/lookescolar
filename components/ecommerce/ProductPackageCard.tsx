'use client';

import { Box, Stack, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { ProductPackage, formatCurrency } from '@/lib/types/ecommerceMockData';

const PackageCard = styled(Card)<{ selected?: boolean }>(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: selected ? '3px solid #1976d2' : '2px solid #e5e7eb',
  backgroundColor: selected ? '#f8faff' : '#ffffff',
  transform: selected ? 'translateY(-4px)' : 'none',
  boxShadow: selected 
    ? '0 12px 24px rgba(25, 118, 210, 0.15)' 
    : '0 4px 12px rgba(0, 0, 0, 0.08)',
  
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.12)',
    borderColor: selected ? '#1976d2' : '#9ca3af',
  }
}));

const IconContainer = styled(Box)({
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: '#e3f2fd',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
});

const FeatureList = styled(Stack)({
  gap: '8px',
  marginTop: '16px',
});

const FeatureItem = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  fontSize: '0.875rem',
  color: '#6b7280',
});

interface ProductPackageCardProps {
  package: ProductPackage;
  selected: boolean;
  onSelect: (packageId: string) => void;
  popular?: boolean;
}

export function ProductPackageCard({
  package: pkg,
  selected,
  onSelect,
  popular = false
}: ProductPackageCardProps) {
  return (
    <PackageCard
      selected={selected}
      onClick={() => onSelect(pkg.id)}
    >
      <CardHeader sx={{ textAlign: 'center', pb: 2 }}>
        <IconContainer>
          <CardGiftcardOutlinedIcon sx={{ fontSize: '2rem', color: '#1976d2' }} />
        </IconContainer>
        
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            {pkg.name}
          </Typography>
          {popular && (
            <Chip
              icon={<StarIcon sx={{ fontSize: '1rem' }} />}
              label="Popular"
              size="small"
              sx={{
                backgroundColor: '#fbbf24',
                color: '#ffffff',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: '#ffffff'
                }
              }}
            />
          )}
        </Stack>
        
        <Typography variant="body2" sx={{ color: '#6b7280', mt: 1, mb: 2 }}>
          {pkg.description}
        </Typography>
        
        <Chip
          label={formatCurrency(pkg.basePrice)}
          sx={{
            backgroundColor: selected ? '#1976d2' : '#f3f4f6',
            color: selected ? '#ffffff' : '#1f2937',
            fontWeight: 700,
            fontSize: '1.125rem',
            height: '40px',
            borderRadius: '20px',
          }}
        />
      </CardHeader>
      
      <CardContent sx={{ pt: 0 }}>
        {/* Package Contents */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
            Contenido del paquete:
          </Typography>
          
          <Stack spacing={2}>
            <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                📁 Carpeta: {pkg.contents.folderSize}
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, backgroundColor: '#f0f9ff', borderRadius: '12px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                👤 {pkg.contents.individualPhotos} foto individual ({pkg.contents.individualSize})
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, backgroundColor: '#f0fdf4', borderRadius: '12px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                📸 {pkg.contents.smallPhotos} fotos pequeñas ({pkg.contents.smallSize})
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, backgroundColor: '#fef7ff', borderRadius: '12px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                👥 {pkg.contents.groupPhotos} foto grupal ({pkg.contents.groupSize})
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        {/* Features */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
            Características:
          </Typography>
          
          <FeatureList>
            {pkg.features.map((feature, index) => (
              <FeatureItem key={index}>
                <CheckCircleIcon sx={{ fontSize: '1rem', color: '#10b981', mt: 0.25 }} />
                <Typography variant="body2">{feature}</Typography>
              </FeatureItem>
            ))}
          </FeatureList>
        </Box>
        
        {/* Selection Indicator */}
        {selected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              p: 2,
              backgroundColor: '#e3f2fd',
              borderRadius: '12px',
              mt: 2,
            }}
          >
            <CheckCircleIcon sx={{ color: '#1976d2', fontSize: '1.25rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Paquete Seleccionado
            </Typography>
          </Box>
        )}
        
        {!selected && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(pkg.id);
            }}
            sx={{ width: '100%', mt: 2 }}
          >
            Seleccionar Paquete
          </Button>
        )}
      </CardContent>
    </PackageCard>
  );
}