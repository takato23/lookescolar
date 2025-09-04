'use client';

import { Box, IconButton, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const QuantityContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '4px',
  border: '1px solid #e2e8f0',
});

const QuantityButton = styled(IconButton)({
  width: '32px',
  height: '32px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  
  '&:hover': {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    transform: 'scale(1.05)',
  },
  
  '&:disabled': {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    color: '#cbd5e1',
    cursor: 'not-allowed',
    transform: 'none',
  }
});

const QuantityDisplay = styled(Box)({
  minWidth: '40px',
  textAlign: 'center',
  padding: '0 8px',
});

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityControl({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled = false
}: QuantityControlProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <QuantityContainer>
      <QuantityButton
        onClick={handleDecrease}
        disabled={disabled || value <= min}
        size="small"
        aria-label="Disminuir cantidad"
      >
        <RemoveIcon sx={{ fontSize: '1rem' }} />
      </QuantityButton>
      
      <QuantityDisplay>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: disabled ? '#9ca3af' : '#1f2937',
            fontSize: '0.875rem',
          }}
        >
          {value}
        </Typography>
      </QuantityDisplay>
      
      <QuantityButton
        onClick={handleIncrease}
        disabled={disabled || value >= max}
        size="small"
        aria-label="Aumentar cantidad"
      >
        <AddIcon sx={{ fontSize: '1rem' }} />
      </QuantityButton>
    </QuantityContainer>
  );
}