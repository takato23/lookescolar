import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { GalleryShowcase } from '@/components/gallery/GalleryShowcase';
import theme from '@/lib/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <GalleryShowcase />
      </Box>
    </ThemeProvider>
  );
}

export default App;