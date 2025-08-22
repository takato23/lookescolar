// Product Catalog Service
// Handles product catalog operations and data fetching

import { supabase } from '@/lib/supabase/client';
import { 
  ProductCategory, 
  PhotoProduct, 
  ComboPackage, 
  ProductCatalog,
  EventProductPricing,
  ProductFilters,
  CreateProductRequest,
  CreateComboRequest,
  ProductWithCategory,
  ComboWithItems
} from '@/lib/types/products';

class ProductCatalogService {
  
  /**
   * Get complete product catalog for an event
   */
  async getProductCatalog(event_id?: string): Promise<ProductCatalog> {
    try {
      // Fetch all catalog data in parallel
      const [
        categoriesResult,
        productsResult,
        combosResult,
        eventPricingResult
      ] = await Promise.all([
        this.getProductCategories(),
        this.getPhotoProducts(),
        this.getComboPackages(),
        event_id ? this.getEventPricing(event_id) : Promise.resolve([])
      ]);

      return {
        categories: categoriesResult,
        products: productsResult,
        combos: combosResult,
        event_pricing: eventPricingResult
      };
    } catch (error) {
      console.error('[ProductCatalog] Error fetching catalog:', error);
      throw new Error('Error al cargar el catálogo de productos');
    }
  }

  /**
   * Get product categories
   */
  async getProductCategories(include_inactive = false): Promise<ProductCategory[]> {
    let query = supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ProductCatalog] Error fetching categories:', error);
      throw new Error('Error al cargar categorías de productos');
    }

    return data || [];
  }

  /**
   * Get photo products with optional filtering
   */
  async getPhotoProducts(filters?: ProductFilters): Promise<PhotoProduct[]> {
    let query = supabase
      .from('photo_products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .order('sort_order', { ascending: true });

    // Apply filters
    if (filters) {
      if (filters.category_ids?.length) {
        query = query.in('category_id', filters.category_ids);
      }
      
      if (filters.types?.length) {
        query = query.in('type', filters.types);
      }
      
      if (filters.finishes?.length) {
        query = query.in('finish', filters.finishes);
      }
      
      if (filters.paper_qualities?.length) {
        query = query.in('paper_quality', filters.paper_qualities);
      }
      
      if (filters.price_range) {
        if (filters.price_range.min !== undefined) {
          query = query.gte('base_price', filters.price_range.min);
        }
        if (filters.price_range.max !== undefined) {
          query = query.lte('base_price', filters.price_range.max);
        }
      }
      
      if (filters.size_range) {
        if (filters.size_range.min_width !== undefined) {
          query = query.gte('width_cm', filters.size_range.min_width);
        }
        if (filters.size_range.max_width !== undefined) {
          query = query.lte('width_cm', filters.size_range.max_width);
        }
        if (filters.size_range.min_height !== undefined) {
          query = query.gte('height_cm', filters.size_range.min_height);
        }
        if (filters.size_range.max_height !== undefined) {
          query = query.lte('height_cm', filters.size_range.max_height);
        }
      }
      
      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }
      
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
    }

    // Default filter for active products if no explicit filter
    if (!filters?.is_active && filters?.is_active !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ProductCatalog] Error fetching products:', error);
      throw new Error('Error al cargar productos');
    }

    return data || [];
  }

  /**
   * Get combo packages with items
   */
  async getComboPackages(include_inactive = false): Promise<ComboPackage[]> {
    let query = supabase
      .from('combo_packages')
      .select(`
        *,
        items:combo_package_items(
          *,
          product:photo_products(*)
        )
      `)
      .order('sort_order', { ascending: true });

    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ProductCatalog] Error fetching combos:', error);
      throw new Error('Error al cargar paquetes combo');
    }

    return data || [];
  }

  /**
   * Get event-specific pricing
   */
  async getEventPricing(event_id: string): Promise<EventProductPricing[]> {
    const { data, error } = await supabase
      .from('event_product_pricing')
      .select(`
        *,
        product:photo_products(*),
        combo:combo_packages(*)
      `)
      .eq('event_id', event_id)
      .eq('is_active', true);

    if (error) {
      console.error('[ProductCatalog] Error fetching event pricing:', error);
      throw new Error('Error al cargar precios del evento');
    }

    return data || [];
  }

  /**
   * Get product by ID
   */
  async getProductById(product_id: string): Promise<ProductWithCategory | null> {
    const { data, error } = await supabase
      .from('photo_products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      console.error('[ProductCatalog] Error fetching product:', error);
      throw new Error('Error al cargar producto');
    }

    return data;
  }

  /**
   * Get combo by ID with items
   */
  async getComboById(combo_id: string): Promise<ComboWithItems | null> {
    const { data, error } = await supabase
      .from('combo_packages')
      .select(`
        *,
        items:combo_package_items(
          *,
          product:photo_products(*)
        )
      `)
      .eq('id', combo_id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      console.error('[ProductCatalog] Error fetching combo:', error);
      throw new Error('Error al cargar paquete combo');
    }

    return data;
  }

  /**
   * Get featured products and combos
   */
  async getFeaturedItems(): Promise<{
    products: PhotoProduct[];
    combos: ComboPackage[];
  }> {
    const [products, combos] = await Promise.all([
      this.getPhotoProducts({ is_featured: true, is_active: true }),
      this.getComboPackages(false)
    ]);

    return {
      products,
      combos: combos.filter(combo => combo.is_featured)
    };
  }

  /**
   * Search products and combos
   */
  async searchCatalog(query: string): Promise<{
    products: PhotoProduct[];
    combos: ComboPackage[];
  }> {
    const searchTerm = `%${query.toLowerCase()}%`;

    const [productsResult, combosResult] = await Promise.all([
      supabase
        .from('photo_products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true }),
      
      supabase
        .from('combo_packages')
        .select(`
          *,
          items:combo_package_items(
            *,
            product:photo_products(*)
          )
        `)
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
    ]);

    if (productsResult.error) {
      console.error('[ProductCatalog] Error searching products:', productsResult.error);
    }

    if (combosResult.error) {
      console.error('[ProductCatalog] Error searching combos:', combosResult.error);
    }

    return {
      products: productsResult.data || [],
      combos: combosResult.data || []
    };
  }

  /**
   * Create new product (admin only)
   */
  async createProduct(product: CreateProductRequest): Promise<PhotoProduct> {
    const { data, error } = await supabase
      .from('photo_products')
      .insert({
        ...product,
        sort_order: await this.getNextSortOrder('photo_products', product.category_id)
      })
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) {
      console.error('[ProductCatalog] Error creating product:', error);
      throw new Error('Error al crear producto');
    }

    return data;
  }

  /**
   * Create new combo package (admin only)
   */
  async createCombo(combo: CreateComboRequest): Promise<ComboWithItems> {
    const { data: comboData, error: comboError } = await supabase
      .from('combo_packages')
      .insert({
        name: combo.name,
        description: combo.description,
        min_photos: combo.min_photos,
        max_photos: combo.max_photos,
        allows_duplicates: combo.allows_duplicates,
        pricing_type: combo.pricing_type,
        base_price: combo.base_price,
        price_per_photo: combo.price_per_photo,
        image_url: combo.image_url,
        badge_text: combo.badge_text,
        badge_color: combo.badge_color,
        is_featured: combo.is_featured || false,
        sort_order: await this.getNextSortOrder('combo_packages')
      })
      .select()
      .single();

    if (comboError) {
      console.error('[ProductCatalog] Error creating combo:', comboError);
      throw new Error('Error al crear paquete combo');
    }

    // Create combo items
    if (combo.items?.length) {
      const { error: itemsError } = await supabase
        .from('combo_package_items')
        .insert(
          combo.items.map(item => ({
            combo_id: comboData.id,
            product_id: item.product_id,
            quantity: item.quantity,
            is_required: item.is_required ?? true,
            additional_price: item.additional_price || 0
          }))
        );

      if (itemsError) {
        console.error('[ProductCatalog] Error creating combo items:', itemsError);
        // Rollback combo creation
        await supabase.from('combo_packages').delete().eq('id', comboData.id);
        throw new Error('Error al crear items del paquete combo');
      }
    }

    // Fetch complete combo with items
    const completeCombo = await this.getComboById(comboData.id);
    if (!completeCombo) {
      throw new Error('Error al cargar paquete combo creado');
    }

    return completeCombo;
  }

  /**
   * Update product (admin only)
   */
  async updateProduct(product_id: string, updates: Partial<CreateProductRequest>): Promise<PhotoProduct> {
    const { data, error } = await supabase
      .from('photo_products')
      .update(updates)
      .eq('id', product_id)
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) {
      console.error('[ProductCatalog] Error updating product:', error);
      throw new Error('Error al actualizar producto');
    }

    return data;
  }

  /**
   * Set event-specific pricing
   */
  async setEventPricing(
    event_id: string, 
    product_id: string | null, 
    combo_id: string | null, 
    override_price: number
  ): Promise<EventProductPricing> {
    const { data, error } = await supabase
      .from('event_product_pricing')
      .upsert({
        event_id,
        product_id,
        combo_id,
        override_price,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('[ProductCatalog] Error setting event pricing:', error);
      throw new Error('Error al configurar precio del evento');
    }

    return data;
  }

  /**
   * Get next sort order for a table
   */
  private async getNextSortOrder(table: string, category_id?: string): Promise<number> {
    let query = supabase
      .from(table)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    if (category_id && table === 'photo_products') {
      query = query.eq('category_id', category_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ProductCatalog] Error getting next sort order:', error);
      return 0;
    }

    const maxSortOrder = data?.[0]?.sort_order || 0;
    return maxSortOrder + 10;
  }

  /**
   * Get product recommendations based on popularity and context
   */
  async getProductRecommendations(
    event_id: string,
    limit = 6
  ): Promise<{
    popular_products: PhotoProduct[];
    featured_combos: ComboPackage[];
  }> {
    // This could be enhanced with actual sales data and ML recommendations
    const [products, combos] = await Promise.all([
      this.getPhotoProducts({ 
        is_featured: true, 
        is_active: true 
      }),
      this.getComboPackages(false)
    ]);

    return {
      popular_products: products.slice(0, Math.ceil(limit / 2)),
      featured_combos: combos
        .filter(combo => combo.is_featured)
        .slice(0, Math.floor(limit / 2))
    };
  }
}

// Export singleton instance
export const productCatalogService = new ProductCatalogService();

// Export convenience functions
export async function getProductCatalog(event_id?: string): Promise<ProductCatalog> {
  return productCatalogService.getProductCatalog(event_id);
}

export async function getFeaturedProducts(): Promise<{
  products: PhotoProduct[];
  combos: ComboPackage[];
}> {
  return productCatalogService.getFeaturedItems();
}

export async function searchProducts(query: string): Promise<{
  products: PhotoProduct[];
  combos: ComboPackage[];
}> {
  return productCatalogService.searchCatalog(query);
}