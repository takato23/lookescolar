/**
 * 📦 Products Service
 *
 * Comprehensive service for product CRUD operations in the LookEscolar platform.
 * Manages both the `products` table and products stored in `store_settings.products` JSON.
 *
 * Architecture:
 * - Tenant-scoped database operations
 * - Supports both dedicated products table and JSON-based store products
 * - Proper validation with Zod schemas
 * - Sorting and filtering capabilities
 *
 * Security:
 * - Tenant isolation enforced on all operations
 * - Service role client for RLS bypass
 * - Input validation for all mutations
 */

import { createServiceClient } from '@/lib/supabase/server';
import { StoreProduct, validateStoreConfig } from '@/lib/validations/store-config';
import type { Database } from '@/types/database';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Product type from the products table
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: string; // 'digital', 'physical', 'package', etc.
  basePrice: number;
  active: boolean;
  config?: Record<string, any> | null;
  sortOrder?: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  category?: string | null;
  type: string;
  basePrice: number;
  active?: boolean;
  config?: Record<string, any> | null;
  sortOrder?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  category?: string | null;
  type?: string;
  basePrice?: number;
  active?: boolean;
  config?: Record<string, any> | null;
  sortOrder?: number;
}

export interface ProductFilters {
  active?: boolean;
  category?: string;
  type?: string;
  search?: string;
}

/**
 * Convert database row to Product interface
 */
function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    category: row.category,
    type: row.type,
    basePrice: row.base_price,
    active: row.active ?? true,
    config: row.config as Record<string, any> | null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    visibleFrom: row.visible_from,
    visibleUntil: row.visible_until,
  };
}

/**
 * Get all products for a tenant with optional filtering
 */
export async function getProducts(
  tenantId: string,
  filters?: ProductFilters
): Promise<Product[]> {
  try {
    const supabase = await createServiceClient();

    let query = supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Default ordering by sort_order, then name
    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[ProductsService] Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data || []).map(rowToProduct);
  } catch (error) {
    console.error('[ProductsService] Error in getProducts:', error);
    throw error;
  }
}

/**
 * Get products by type (packages, individual products, etc.)
 */
export async function getProductsByType(
  tenantId: string,
  type: string,
  activeOnly: boolean = true
): Promise<Product[]> {
  return getProducts(tenantId, { type, active: activeOnly });
}

/**
 * Get active products only
 */
export async function getActiveProducts(tenantId: string): Promise<Product[]> {
  return getProducts(tenantId, { active: true });
}

/**
 * Get a single product by ID
 */
export async function getProductById(
  id: string,
  tenantId: string
): Promise<Product | null> {
  try {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('[ProductsService] Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return rowToProduct(data);
  } catch (error) {
    console.error('[ProductsService] Error in getProductById:', error);
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  tenantId: string,
  input: CreateProductInput,
  userId?: string
): Promise<Product> {
  try {
    const supabase = await createServiceClient();

    // Get next sort order if not provided
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const { data: existingProducts } = await supabase
        .from('products')
        .select('sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: false })
        .limit(1);

      sortOrder = existingProducts && existingProducts.length > 0
        ? (existingProducts[0].sort_order || 0) + 10
        : 0;
    }

    const insertPayload: ProductInsert = {
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      type: input.type,
      base_price: input.basePrice,
      active: input.active ?? true,
      config: input.config as any || null,
      sort_order: sortOrder,
      created_by: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[ProductsService] Error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create product: No data returned');
    }

    return rowToProduct(data);
  } catch (error) {
    console.error('[ProductsService] Error in createProduct:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  tenantId: string,
  updates: UpdateProductInput
): Promise<Product> {
  try {
    const supabase = await createServiceClient();

    // Verify product exists and belongs to tenant
    const existing = await getProductById(id, tenantId);
    if (!existing) {
      throw new Error('Product not found');
    }

    const updatePayload: ProductUpdate = {
      ...updates,
      base_price: updates.basePrice,
      sort_order: updates.sortOrder,
      config: updates.config as any,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key as keyof ProductUpdate] === undefined) {
        delete updatePayload[key as keyof ProductUpdate];
      }
    });

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[ProductsService] Error updating product:', error);
      throw new Error(`Failed to update product: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update product: No data returned');
    }

    return rowToProduct(data);
  } catch (error) {
    console.error('[ProductsService] Error in updateProduct:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(
  id: string,
  tenantId: string
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    // Verify product exists and belongs to tenant
    const existing = await getProductById(id, tenantId);
    if (!existing) {
      throw new Error('Product not found');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[ProductsService] Error deleting product:', error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  } catch (error) {
    console.error('[ProductsService] Error in deleteProduct:', error);
    throw error;
  }
}

/**
 * Reorder products by updating sort_order
 */
export async function reorderProducts(
  tenantId: string,
  productIds: string[]
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    // Update each product with new sort order
    const updates = productIds.map((id, index) => ({
      id,
      tenant_id: tenantId,
      sort_order: index * 10,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('products')
        .update({ sort_order: update.sort_order, updated_at: update.updated_at })
        .eq('id', update.id)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[ProductsService] Error reordering product:', error);
        throw new Error(`Failed to reorder products: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('[ProductsService] Error in reorderProducts:', error);
    throw error;
  }
}

/**
 * Bulk update product active status
 */
export async function bulkUpdateProductStatus(
  tenantId: string,
  productIds: string[],
  active: boolean
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('products')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .in('id', productIds);

    if (error) {
      console.error('[ProductsService] Error bulk updating products:', error);
      throw new Error(`Failed to bulk update products: ${error.message}`);
    }
  } catch (error) {
    console.error('[ProductsService] Error in bulkUpdateProductStatus:', error);
    throw error;
  }
}

/**
 * Get product categories (unique categories from all products)
 */
export async function getProductCategories(tenantId: string): Promise<string[]> {
  try {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('tenant_id', tenantId)
      .not('category', 'is', null);

    if (error) {
      console.error('[ProductsService] Error fetching product categories:', error);
      throw new Error(`Failed to fetch product categories: ${error.message}`);
    }

    // Get unique categories
    const categories = new Set<string>();
    (data || []).forEach((row) => {
      if (row.category) {
        categories.add(row.category);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('[ProductsService] Error in getProductCategories:', error);
    throw error;
  }
}

/**
 * Get product types (unique types from all products)
 */
export async function getProductTypes(tenantId: string): Promise<string[]> {
  try {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('products')
      .select('type')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[ProductsService] Error fetching product types:', error);
      throw new Error(`Failed to fetch product types: ${error.message}`);
    }

    // Get unique types
    const types = new Set<string>();
    (data || []).forEach((row) => {
      if (row.type) {
        types.add(row.type);
      }
    });

    return Array.from(types).sort();
  } catch (error) {
    console.error('[ProductsService] Error in getProductTypes:', error);
    throw error;
  }
}

/**
 * Validate product input
 */
export function validateProductInput(input: CreateProductInput | UpdateProductInput): void {
  if ('name' in input && input.name) {
    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      throw new Error('Product name is required and must be a non-empty string');
    }
    if (input.name.length > 200) {
      throw new Error('Product name is too long (max 200 characters)');
    }
  }

  if ('description' in input && input.description !== null && input.description !== undefined) {
    if (typeof input.description !== 'string') {
      throw new Error('Product description must be a string');
    }
    if (input.description.length > 1000) {
      throw new Error('Product description is too long (max 1000 characters)');
    }
  }

  if ('basePrice' in input && input.basePrice !== undefined) {
    if (typeof input.basePrice !== 'number' || input.basePrice < 0) {
      throw new Error('Product price must be a non-negative number');
    }
  }

  if ('type' in input && input.type) {
    if (typeof input.type !== 'string' || input.type.trim().length === 0) {
      throw new Error('Product type is required and must be a non-empty string');
    }
  }
}
