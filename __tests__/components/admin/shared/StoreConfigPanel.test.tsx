import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoreConfigPanel } from '@/components/admin/shared/StoreConfigPanel';

const mockConfigResponse = {
  success: true,
  config: {
    enabled: true,
    currency: 'ARS',
    tax_rate: 0,
    shipping_enabled: true,
    shipping_price: 50000,
    payment_methods: ['mercadopago'],
    products: [
      {
        id: 'opcionA',
        name: 'Opción A',
        type: 'physical',
        enabled: true,
        price: 200000,
        description: 'Producto demo'
      }
    ]
  }
};

describe('StoreConfigPanel', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfigResponse)
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('muestra el loader mientras se obtiene la configuración', async () => {
    render(<StoreConfigPanel mode="global" />);

    expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Configuración Global de Tienda')).toBeInTheDocument();
    });
  });

  it('renderiza la configuración recibida', async () => {
    render(<StoreConfigPanel mode="global" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Moneda')).toHaveValue('ARS');
    });

    expect(screen.getByText('Opción A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
  });

  it('envía los cambios al guardar', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfigResponse)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfigResponse)
      } as any);

    render(<StoreConfigPanel mode="global" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Moneda')).toHaveValue('ARS');
    });

    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'USD' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    const [, saveCall] = fetchSpy.mock.calls;
    expect(saveCall[0]).toBe('/api/admin/store-settings');
    expect(saveCall[1]?.method).toBe('POST');
  });

  it('muestra un mensaje de error si no puede cargar la configuración', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<StoreConfigPanel mode="global" />);

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la configuración')).toBeInTheDocument();
    });
  });
});
