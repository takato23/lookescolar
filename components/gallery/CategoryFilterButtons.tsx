'use client';

import { useState } from 'react';
import { Stack, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { CategoryType, CategoryData, formatCategoryName } from '@/lib/types/galleryMockData';

const StyledChip = styled(Chip)<{ categorycolor?: string }>(({ theme, categorycolor }) => ({
  borderRadius: '24px',
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: '8px 16px',
  height: '40px',
  minWidth: '80px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '2px solid transparent',
  cursor: 'pointer',
  
  '&.MuiChip-filled': {
    backgroundColor: categorycolor || theme.palette.primary.main,
    color: '#ffffff',
    boxShadow: `0 4px 12px ${categorycolor || theme.palette.primary.main}40`,
    transform: 'translateY(-2px)',
    
    '&:hover': {
      backgroundColor: categorycolor || theme.palette.primary.dark,
      transform: 'translateY(-3px)',
      boxShadow: `0 6px 16px ${categorycolor || theme.palette.primary.main}50`,
    }
  },
  
  '&.MuiChip-outlined': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: theme.palette.text.primary,
    border: `2px solid ${theme.palette.grey[300]}`,
    
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      borderColor: categorycolor || theme.palette.primary.main,
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }
  },
  
  '& .MuiChip-label': {
    fontWeight: 'inherit',
    fontSize: 'inherit',
  }
}));

interface CategoryFilterButtonsProps {
  categories: CategoryData[];
  currentCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

export function CategoryFilterButtons({
  categories,
  currentCategory,
  onCategoryChange
}: CategoryFilterButtonsProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  return (
    <Stack 
      direction="row" 
      spacing={2} 
      sx={{ 
        mb: 4,
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center'
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mr: 2 }}>
        <FilterAltOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          color: '#6c757d' 
        }}>
          Filtrar:
        </span>
      </Stack>
      
      {categories.map((category) => {
        const isSelected = currentCategory === category.id;
        const isHovered = hoveredCategory === category.id;
        
        return (
          <StyledChip
            key={category.id}
            label={category.name}
            variant={isSelected ? 'filled' : 'outlined'}
            categorycolor={category.color}
            onClick={() => onCategoryChange(category.id as CategoryType)}
            onMouseEnter={() => setHoveredCategory(category.id)}
            onMouseLeave={() => setHoveredCategory(null)}
            sx={{
              '& .MuiChip-label': {
                color: isSelected ? '#ffffff' : (isHovered ? category.color : 'inherit')
              }
            }}
          />
        );
      })}
    </Stack>
  );
}