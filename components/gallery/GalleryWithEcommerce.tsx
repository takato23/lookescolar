'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Container, Fab, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Button } from '@/components/ui/button';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { GalleryShowcase } from './GalleryShowcase';
import { EcommerceFlow } from '../ecommerce/EcommerceFlow';

const ShowcaseContainer = styled(Box)({
  backgroundColor: '#ffffff',
});

const TransitionSection = styled(Box)({
  padding: '80px 0',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  textAlign: 'center',
});

const FloatingActionButton = styled(Fab)({
  position: 'fixed',
  bottom: '32px',
  right: '32px',
  zIndex: 1000,
  backgroundColor: '#1976d2',
  color: '#ffffff',
  width: '72px',
  height: '72px',
  boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
  
  '&:hover': {
    backgroundColor: '#1565c0',
    transform: 'scale(1.1)',
    boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
  }
});

interface GalleryWithEcommerceProps {
  token?: string;
}

export function GalleryWithEcommerce({ token = 'demo-token' }: GalleryWithEcommerceProps) {
  const [showEcommerce, setShowEcommerce] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const handleStartShopping = () => {
    setShowEcommerce(true);
    // Smooth scroll to ecommerce section
    setTimeout(() => {
      document.getElementById('ecommerce-section')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
  };

  const handleOrderComplete = (orderId: string) => {
    setOrderCompleted(true);
    console.log('Order completed:', orderId);
  };

  const handleBackToGallery = () => {
    setShowEcommerce(false);
    setOrderCompleted(false);
    // Smooth scroll to gallery section
    setTimeout(() => {
      document.getElementById('gallery-section')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
  };

  return (
    <Box>
      {/* Gallery Showcase Section */}
      <Box id="gallery-section">
        <ShowcaseContainer>
          <GalleryShowcase />
        </ShowcaseContainer>
      </Box>

      {/* Transition Section */}
      <TransitionSection>
        <Container maxWidth="md">
          <Stack spacing={4} alignItems="center">
            <Typography variant="h3" sx={{ fontWeight: 700, textAlign: 'center' }}>
              ¿Te gustaron las fotos?
            </Typography>
            <Typography variant="h6" sx={{ textAlign: 'center', opacity: 0.9, maxWidth: '600px' }}>
              Ahora puedes crear tu paquete personalizado y llevar estos recuerdos a casa. 
              Elige entre nuestros paquetes premium con impresiones de alta calidad.
            </Typography>
            
            {!showEcommerce && (
              <Button
                onClick={handleStartShopping}
                size="lg"
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#1976d2',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  px: 4,
                  py: 2,
                  borderRadius: '50px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: '#f8faff',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
                  }
                }}
                endIcon={<ArrowForwardIcon />}
              >
                Crear Mi Paquete Personalizado
              </Button>
            )}

            {showEcommerce && !orderCompleted && (
              <Button
                onClick={handleBackToGallery}
                variant="outline"
                sx={{
                  borderColor: '#ffffff',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: '#ffffff',
                  }
                }}
              >
                Volver a la Galería
              </Button>
            )}

            {orderCompleted && (
              <Stack spacing={2} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#4ade80' }}>
                  ¡Pedido completado exitosamente! 🎉
                </Typography>
                <Button
                  onClick={handleBackToGallery}
                  variant="outline"
                  sx={{
                    borderColor: '#ffffff',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: '#ffffff',
                    }
                  }}
                >
                  Explorar Más Galerías
                </Button>
              </Stack>
            )}
          </Stack>
        </Container>
      </TransitionSection>

      {/* E-commerce Flow Section */}
      {showEcommerce && (
        <Box id="ecommerce-section" sx={{ backgroundColor: '#f8fafc' }}>
          <EcommerceFlow
            token={token}
            onComplete={handleOrderComplete}
          />
        </Box>
      )}

      {/* Floating Action Button */}
      {!showEcommerce && (
        <FloatingActionButton
          onClick={handleStartShopping}
          aria-label="Iniciar compra"
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: '2rem' }} />
        </FloatingActionButton>
      )}
    </Box>
  );
}