'use client';

import { Button, Stack, Typography, Box } from '@mui/material';
import KeyboardArrowLeftOutlinedIcon from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import { formatPageInfo } from '@/lib/data/galleryMockData';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: PaginationControlsProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <Box className="flex justify-center items-center mt-8 pt-6 border-t border-gray-200">
      <Stack direction="row" spacing={4} alignItems="center">
        <Button
          variant="contained"
          onClick={handlePrevious}
          disabled={currentPage <= 1}
          startIcon={<KeyboardArrowLeftOutlinedIcon />}
          sx={{
            backgroundColor: '#000000',
            color: 'white',
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: '#333333',
            },
            '&:disabled': {
              backgroundColor: '#cccccc',
              color: '#666666',
            }
          }}
        >
          Anterior
        </Button>

        <Typography 
          variant="body2" 
          className="text-gray-600 font-medium px-4"
        >
          {formatPageInfo(currentPage, totalPages)}
        </Typography>

        <Button
          variant="contained"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          endIcon={<KeyboardArrowRightOutlinedIcon />}
          sx={{
            backgroundColor: '#000000',
            color: 'white',
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: '#333333',
            },
            '&:disabled': {
              backgroundColor: '#cccccc',
              color: '#666666',
            }
          }}
        >
          Siguiente
        </Button>
      </Stack>
    </Box>
  );
}