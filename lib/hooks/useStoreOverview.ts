/**
 * 🎯 Hook para obtener overview de todas las tiendas
 * Carga configuraciones de tienda para mostrar estadísticas generales
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface StoreConfig {
  id: string;
  event_id: string;
  event_name?: string;
  enabled: boolean;
  currency: string;
  products_count: number;
  active_products_count: number;
  total_value: number;
  last_updated: string;
}

export function useStoreOverview() {
  return useQuery({
    queryKey: ['store-overview'],
    queryFn: async (): Promise<StoreConfig[]> => {
      const supabase = createClient();

      // Obtener todas las configuraciones de tienda con información del evento
      const { data: storeConfigs, error } = await supabase
        .from('store_settings')
        .select(`
          id,
          event_id,
          enabled,
          currency,
          products,
          payment_methods,
          updated_at,
          events!inner(name, date)
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[StoreOverview] Error fetching stores:', error);
        throw new Error('Error cargando tiendas');
      }

      // Transformar los datos para incluir estadísticas calculadas
      return (storeConfigs || []).map(config => {
        const products = config.products as any || {};
        const productList = Object.values(products);
        const activeProducts = productList.filter((p: any) => p.enabled);

        return {
          id: config.id,
          event_id: config.event_id,
          event_name: (config.events as any)?.name || 'Evento sin nombre',
          enabled: config.enabled || false,
          currency: config.currency || 'ARS',
          products_count: productList.length,
          active_products_count: activeProducts.length,
          total_value: activeProducts.reduce((sum: number, p: any) => sum + (p.price || 0), 0),
          last_updated: config.updated_at || new Date().toISOString()
        };
      });
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,   // 5 minutos
    retry: 2
  });
}
