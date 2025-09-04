import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { GalleryWithEcommerce } from '@/components/gallery/GalleryWithEcommerce';
import theme from '@/lib/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <GalleryWithEcommerce token="demo-gallery-token" />
      </Box>
    </ThemeProvider>
  );
}

export default App;