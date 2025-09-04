'use client';

import { Chip, Stack, Typography, Box } from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { CategoryItem } from '@/lib/data/galleryMockData';

interface CategoryFilterProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CategoryFilterProps) {
  return (
    <Box className="mb-8">
      <Stack direction="row" spacing={2} alignItems="center" className="mb-4">
        <Typography variant="body1" className="text-gray-700 font-medium flex items-center gap-2">
          <FilterAltOutlinedIcon className="text-gray-600" fontSize="small" />
          Filtrar:
        </Typography>
      </Stack>
      
      <Stack 
        direction="row" 
        spacing={2} 
        className="flex-wrap gap-2"
        sx={{ flexWrap: 'wrap' }}
      >
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            onClick={() => onCategoryChange(category.id)}
            variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            sx={{
              backgroundColor: selectedCategory === category.id ? category.color : 'transparent',
              borderColor: category.color,
              color: selectedCategory === category.id ? 'white' : category.color,
              fontWeight: 500,
              '&:hover': {
                backgroundColor: selectedCategory === category.id 
                  ? category.color 
                  : `${category.color}15`,
              },
              '&.MuiChip-filled': {
                color: 'white',
              }
            }}
            className="cursor-pointer transition-all duration-200 hover:scale-105"
          />
        ))}
      </Stack>
    </Box>
  );
}