'use client';

import { Typography, Box } from '@mui/material';

export function GalleryHeader() {
  return (
    <Box className="mb-8">
      <Typography 
        variant="h4" 
        component="h1" 
        className="text-3xl font-semibold text-gray-900 border-b-2 border-gray-300 pb-4 mb-2"
      >
        Galería de imágenes
      </Typography>
      <Typography variant="body2" className="text-gray-600">
        Selecciona las fotos que deseas incluir en tu paquete
      </Typography>
    </Box>
  );
}