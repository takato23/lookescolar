/**
 * 🧪 Tests unitarios para StoreHeader
 * Verifica accesibilidad, funcionalidad y estados visuales
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreHeader } from '@/components/admin/store-settings/StoreHeader';

describe('StoreHeader', () => {
  const defaultProps = {
    hasChanges: false,
    isSaving: false,
    onSave: jest.fn(),
    onReset: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar correctamente sin cambios', () => {
    render(<StoreHeader {...defaultProps} />);

    expect(screen.getByText('Configuración de Tienda')).toBeInTheDocument();
    expect(screen.getByText('Configura productos y precios para el evento')).toBeInTheDocument();
    expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
    expect(screen.getByText('Resetear')).toBeInTheDocument();
  });

  it('debe mostrar badge de cambios sin guardar cuando hasChanges es true', () => {
    render(<StoreHeader {...defaultProps} hasChanges={true} />);

    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });

  it('debe mostrar estado de guardando cuando isSaving es true', () => {
    render(<StoreHeader {...defaultProps} isSaving={true} />);

    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardando configuración...' })).toBeDisabled();
  });

  it('debe deshabilitar botones cuando no hay cambios', () => {
    render(<StoreHeader {...defaultProps} hasChanges={false} />);

    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled();
  });

  it('debe llamar onSave cuando se hace click en guardar', () => {
    render(<StoreHeader {...defaultProps} hasChanges={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('debe llamar onReset cuando se hace click en resetear', () => {
    render(<StoreHeader {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Resetear cambios' }));
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('debe tener atributos ARIA correctos', () => {
    render(<StoreHeader {...defaultProps} hasChanges={true} isSaving={true} />);

    expect(screen.getByRole('button', { name: 'Guardando configuración...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resetear cambios' })).toBeInTheDocument();
  });
});
