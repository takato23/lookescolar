'use client';

import { useState } from 'react';
import { Box, Stack, Typography, TextField, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { ContactInfo } from '@/lib/types/ecommerceMockData';

const FormSection = styled(Box)({
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
});

const SectionHeader = styled(Stack)({
  marginBottom: '24px',
});

const SectionIcon = styled(Box)({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#e3f2fd',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

interface ContactFormProps {
  contactInfo: ContactInfo | null;
  onContactInfoChange: (info: ContactInfo) => void;
  errors: Record<string, string>;
}

export function ContactForm({
  contactInfo,
  onContactInfoChange,
  errors
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: contactInfo?.name || '',
    email: contactInfo?.email || '',
    phone: contactInfo?.phone || '',
    street: contactInfo?.address?.street || '',
    city: contactInfo?.address?.city || '',
    state: contactInfo?.address?.state || '',
    zipCode: contactInfo?.address?.zipCode || '',
  });

  const handleChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Update contact info
    const newContactInfo: ContactInfo = {
      name: newFormData.name,
      email: newFormData.email,
      phone: newFormData.phone,
      address: {
        street: newFormData.street,
        city: newFormData.city,
        state: newFormData.state,
        zipCode: newFormData.zipCode,
        country: 'Argentina',
      },
    };

    onContactInfoChange(newContactInfo);
  };

  return (
    <Stack spacing={4}>
      {/* Personal Information */}
      <FormSection>
        <SectionHeader direction="row" alignItems="center" spacing={2}>
          <SectionIcon>
            <PersonIcon sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
          </SectionIcon>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Información Personal
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Datos necesarios para procesar tu pedido
            </Typography>
          </Box>
        </SectionHeader>

        <Stack spacing={3}>
          <TextField
            label="Nombre completo"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            fullWidth
            InputProps={{
              startAdornment: (
                <PersonIcon sx={{ color: '#9ca3af', mr: 1 }} />
              ),
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <EmailIcon sx={{ color: '#9ca3af', mr: 1 }} />
                ),
              }}
            />

            <TextField
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={!!errors.phone}
              helperText={errors.phone}
              fullWidth
              placeholder="+54 9 11 1234-5678"
              InputProps={{
                startAdornment: (
                  <PhoneIcon sx={{ color: '#9ca3af', mr: 1 }} />
                ),
              }}
            />
          </Stack>
        </Stack>
      </FormSection>

      {/* Address Information */}
      <FormSection>
        <SectionHeader direction="row" alignItems="center" spacing={2}>
          <SectionIcon>
            <LocationOnIcon sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
          </SectionIcon>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Dirección de Envío
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Donde enviaremos tu pedido
            </Typography>
          </Box>
        </SectionHeader>

        <Stack spacing={3}>
          <TextField
            label="Dirección"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
            error={!!errors.street}
            helperText={errors.street}
            required
            fullWidth
            placeholder="Av. Corrientes 1234"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Ciudad"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              error={!!errors.city}
              helperText={errors.city}
              required
              fullWidth
            />

            <TextField
              label="Provincia"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              error={!!errors.state}
              helperText={errors.state}
              required
              fullWidth
            />

            <TextField
              label="Código Postal"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              error={!!errors.zipCode}
              helperText={errors.zipCode}
              required
              fullWidth
            />
          </Stack>
        </Stack>
      </FormSection>

      {/* Information Alert */}
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        <Typography variant="body2">
          <strong>Información importante:</strong> Verificá que todos los datos sean correctos. 
          Esta información será utilizada para el envío de tu pedido y la facturación.
        </Typography>
      </Alert>
    </Stack>
  );
}