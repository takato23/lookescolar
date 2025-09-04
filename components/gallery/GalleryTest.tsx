'use client';

import { Box, Typography, Alert } from '@mui/material';
import { GalleryInterface } from './GalleryInterface';

// Simple test component to verify gallery is working
export function GalleryTest() {
  const testPhotos = [
    {
      id: 'test-1',
      filename: 'test-photo-1.jpg',
      preview_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      size: 1024,
      width: 400,
      height: 300
    },
    {
      id: 'test-2', 
      filename: 'test-photo-2.jpg',
      preview_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
      size: 1024,
      width: 400,
      height: 300
    }
  ];

  const testSubject = {
    id: 'test-event',
    name: 'Test Event',
    grade_section: 'Test Grade',
    event: {
      name: 'Test Event',
      school_name: 'Test School',
      theme: 'default'
    }
  };

  return (
    <Box className="p-4">
      <Alert severity="info" className="mb-4">
        🧪 Gallery Test Component - This should show the new gallery interface
      </Alert>
      
      <Typography variant="h5" className="mb-4">
        Gallery Interface Test
      </Typography>
      
      <GalleryInterface
        token="test-token"
        photos={testPhotos}
        subject={testSubject}
        onImageSelect={(id) => console.log('Selected:', id)}
        selectionMode={true}
        maxSelections={5}
      />
    </Box>
  );
}