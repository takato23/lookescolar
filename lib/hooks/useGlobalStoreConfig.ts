/**
 * 🎯 Hook para configuración global de tienda
 * Maneja configuración global que se usa como fallback para eventos
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchGlobalStoreConfig, saveGlobalStoreConfig, getDefaultStoreConfig, type StoreConfig, type StoreProduct } from '@/lib/services/store-defaults.service';

interface UseGlobalStoreConfigProps {
  onUpdate?: (config: StoreConfig) => void;
}

export function useGlobalStoreConfig({ onUpdate }: UseGlobalStoreConfigProps = {}) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Query para cargar configuración global
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['global-store-config'],
    queryFn: fetchGlobalStoreConfig,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos
    retry: 2
  });

  // Mutation para guardar configuración global
  const saveMutation = useMutation({
    mutationFn: saveGlobalStoreConfig,
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(['global-store-config'], updatedConfig);
      setHasChanges(false);
      onUpdate?.(updatedConfig);
      toast.success('Configuración global guardada exitosamente');
    },
    onError: (error: Error) => {
      console.error('[GlobalStoreConfig] Error saving configuration:', error);
      toast.error(error.message || 'Error guardando configuración global');
    }
  });

  // Estado actual de configuración
  const currentConfig = useMemo(() => {
    return config || getDefaultStoreConfig();
  }, [config]);

  // Cálculos memoizados para optimización
  const totalProducts = useMemo(() =>
    currentConfig.products.length,
    [currentConfig.products]
  );

  const activeProducts = useMemo(() =>
    currentConfig.products.filter(product => product.enabled),
    [currentConfig]
  );

  const totalEnabledProducts = useMemo(() =>
    activeProducts.length,
    [activeProducts]
  );

  const totalValue = useMemo(() =>
    activeProducts.reduce((total, product) => total + product.price, 0),
    [activeProducts]
  );

  // Función para actualizar configuración
  const updateConfig = useCallback((updates: Partial<StoreConfig>) => {
    const newConfig = { ...currentConfig, ...updates };
    queryClient.setQueryData(['global-store-config'], newConfig);
    setHasChanges(true);
    return newConfig;
  }, [currentConfig, queryClient]);

  // Función para actualizar producto específico
  const updateProduct = useCallback((productId: string, updates: Partial<StoreProduct>) => {
    const newConfig = {
      ...currentConfig,
      products: currentConfig.products.map(p =>
        p.id === productId ? { ...p, ...updates } : p
      )
    };
    queryClient.setQueryData(['global-store-config'], newConfig);
    setHasChanges(true);
    return newConfig;
  }, [currentConfig, queryClient]);

  // Función para guardar configuración
  const saveChanges = useCallback(async () => {
    if (!hasChanges || !config) return;

    try {
      await saveMutation.mutateAsync(config);
    } catch (error) {
      console.error('[GlobalStoreConfig] Error in saveChanges:', error);
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
