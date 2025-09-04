'use client';

import { Box, Stack, Typography, Drawer, IconButton, Divider, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Button } from '@/components/ui/button';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { QuantityControl } from './QuantityControl';
import { CartItem, formatCurrency } from '@/lib/types/ecommerceMockData';

const DrawerContent = styled(Box)({
  width: '400px',
  height: '100%',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
});

const DrawerHeader = styled(Box)({
  padding: '24px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f8fafc',
});

const DrawerBody = styled(Box)({
  flex: 1,
  padding: '24px',
  overflowY: 'auto',
});

const DrawerFooter = styled(Box)({
  padding: '24px',
  borderTop: '1px solid #e5e7eb',
  backgroundColor: '#f8fafc',
});

const CartItemCard = styled(Box)({
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  transition: 'all 0.2s ease',
  
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    borderColor: '#d1d5db',
  }
});

const EmptyCartContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  textAlign: 'center',
  padding: '48px 24px',
});

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  totalPrice: number;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  totalPrice
}: CartDrawerProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const getItemDisplayName = (item: CartItem) => {
    if (item.type === 'base_package') {
      return item.productId === 'option_a' ? 'OPCIÓN A' : 'OPCIÓN B';
    }
    return item.metadata?.size ? `Copia ${item.metadata.size}` : 'Copia adicional';
  };

  const getItemDescription = (item: CartItem) => {
    if (item.type === 'base_package') {
      return 'Paquete completo con carpeta y fotos';
    }
    return `Foto adicional de ${item.metadata?.size || 'tamaño estándar'}`;
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '400px',
          maxWidth: '100vw',
        }
      }}
    >
      <DrawerContent>
        {/* Header */}
        <DrawerHeader>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Badge badgeContent={totalItems} color="primary">
                <ShoppingCartOutlinedIcon sx={{ fontSize: '1.5rem', color: '#1f2937' }} />
              </Badge>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                Carrito de Compras
              </Typography>
            </Stack>
            
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
          
          {totalItems > 0 && (
            <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
              {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en tu carrito
            </Typography>
          )}
        </DrawerHeader>

        {/* Body */}
        <DrawerBody>
          {items.length === 0 ? (
            <EmptyCartContainer>
              <ShoppingCartOutlinedIcon 
                sx={{ 
                  fontSize: '4rem', 
                  color: '#d1d5db', 
                  mb: 2 
                }} 
              />
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                Tu carrito está vacío
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                Agrega productos para comenzar tu compra
              </Typography>
              <Button variant="outline" onClick={onClose}>
                Continuar Comprando
              </Button>
            </EmptyCartContainer>
          ) : (
            <Stack spacing={2}>
              {items.map((item) => (
                <CartItemCard key={item.id}>
                  <Stack spacing={2}>
                    {/* Item Info */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {getItemDisplayName(item)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                          {getItemDescription(item)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                          {formatCurrency(item.unitPrice)} c/u
                        </Typography>
                      </Box>
                      
                      <IconButton
                        onClick={() => onRemoveItem(item.id)}
                        size="small"
                        sx={{ color: '#ef4444' }}
                        aria-label="Eliminar artículo"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                    
                    {/* Quantity and Total */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <QuantityControl
                        value={item.quantity}
                        onChange={(quantity) => onUpdateQuantity(item.id, quantity)}
                        min={1}
                        max={10}
                      />
                      
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                        {formatCurrency(item.totalPrice)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CartItemCard>
              ))}
            </Stack>
          )}
        </DrawerBody>

        {/* Footer */}
        {items.length > 0 && (
          <DrawerFooter>
            <Stack spacing={3}>
              {/* Total */}
              <Box>
                <Divider sx={{ mb: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    Total
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                    {formatCurrency(totalPrice)}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                  Envío calculado en el checkout
                </Typography>
              </Box>
              
              {/* Checkout Button */}
              <Button
                onClick={onCheckout}
                sx={{ 
                  width: '100%',
                  py: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                Proceder al Checkout
              </Button>
              
              <Button
                variant="outline"
                onClick={onClose}
                sx={{ width: '100%' }}
              >
                Continuar Comprando
              </Button>
            </Stack>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}