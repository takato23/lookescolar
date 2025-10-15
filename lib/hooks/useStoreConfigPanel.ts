/**
 * 🎣 Hook premium para StoreConfigPanel
 * Maneja estado, loading y operaciones de forma optimizada
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchStoreConfig, saveStoreConfig, getDefaultConfig, getTotalEnabledProducts, getTotalValue, getActiveProducts, type StoreConfig, type StoreProduct } from '@/lib/services/store-config.client.service';

interface UseStoreConfigPanelProps {
  eventId: string;
  onUpdate?: (config: StoreConfig) => void;
}

export function useStoreConfigPanel({ eventId, onUpdate }: UseStoreConfigPanelProps) {
  // Verificar que estamos en el navegador y que React Query está disponible
  if (typeof window === 'undefined') {
    throw new Error('useStoreConfigPanel solo puede ser usado en el navegador');
  }

  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Query para cargar configuración
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['store-config', eventId],
    queryFn: () => fetchStoreConfig(eventId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos
    retry: 2,
    enabled: !!eventId
  });

  // Mutation para guardar configuración
  const saveMutation = useMutation({
    mutationFn: (config: StoreConfig) => saveStoreConfig(eventId, config),
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(['store-config', eventId], updatedConfig);
      setHasChanges(false);
      onUpdate?.(updatedConfig);
      toast.success('Configuración guardada exitosamente');
    },
    onError: (error: Error) => {
      console.error('[StoreConfigPanel] Error saving configuration:', error);
      toast.error(error.message || 'Error guardando configuración');
    }
  });

  // Estado actual de configuración
  const currentConfig = useMemo(() => {
    return config || getDefaultConfig();
  }, [config]);

  // Cálculos memoizados para optimización
  const totalProducts = useMemo(() =>
    currentConfig.products.length,
    [currentConfig.products]
  );

  const activeProducts = useMemo(() =>
    getActiveProducts(currentConfig),
    [currentConfig]
  );

  const totalEnabledProducts = useMemo(() =>
    getTotalEnabledProducts(currentConfig),
    [currentConfig]
  );

  const totalValue = useMemo(() =>
    getTotalValue(currentConfig),
    [currentConfig]
  );

  // Función para actualizar configuración
  const updateConfig = useCallback((updates: Partial<StoreConfig>) => {
    const newConfig = { ...currentConfig, ...updates };
    queryClient.setQueryData(['store-config', eventId], newConfig);
    setHasChanges(true);
    return newConfig;
  }, [currentConfig, eventId, queryClient]);

  // Función para actualizar producto específico
  const updateProduct = useCallback((productId: string, updates: Partial<StoreProduct>) => {
    const newConfig = {
      ...currentConfig,
      products: currentConfig.products.map(p =>
        p.id === productId ? { ...p, ...updates } : p
      )
    };
    queryClient.setQueryData(['store-config', eventId], newConfig);
    setHasChanges(true);
    return newConfig;
  }, [currentConfig, eventId, queryClient]);

  // Función para guardar configuración
  const saveChanges = useCallback(async () => {
    if (!hasChanges || !config) return;

    try {
      await saveMutation.mutateAsync(config);
    } catch (error) {
      console.error('[StoreConfigPanel] Error in saveChanges:', error);
    }
  }, [hasChanges, config, saveMutation]);

  // Función para resetear cambios
  const resetChanges = useCallback(() => {
    refetch();
    setHasChanges(false);
  }, [refetch]);

  // Función para formatear precio
  const formatPrice = useCallback((price: number) => {
    const currency = currentConfig.currency || 'ARS';
    const symbol = getCurrencySymbol(currency);

    return new Intl.NumberFormat('es-AR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price / 100).replace(/^/, symbol);
  }, [currentConfig.currency]);

  return {
    // Estado
    config: currentConfig,
    loading,
    error,
    hasChanges,
    isSaving: saveMutation.isPending,

    // Métricas calculadas
    totalProducts,
    activeProducts,
    totalEnabledProducts,
    totalValue,

    // Acciones
    updateConfig,
    updateProduct,
    saveChanges,
    resetChanges,
    refetch,

    // Utilidades
    formatPrice
  };
}

/**
 * Obtiene símbolo de moneda
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    ARS: '$',
    USD: 'USD$',
    EUR: '€',
    BRL: 'R$',
    CLP: '$',
    PEN: 'S/',
    COP: '$',
    MXN: '$'
  };
  return symbols[currency] || '$';
}
