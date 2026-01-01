/**
 * Products API Endpoint
 *
 * Handles CRUD operations for products in the products table.
 * All operations are tenant-scoped with proper validation and error handling.
 *
 * Security:
 * - Admin authentication required
 * - Rate limiting applied
 * - Tenant isolation enforced
 * - Input validation with Zod
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import {
  getProducts,
  getActiveProducts,
  getProductsByType,
  createProduct,
  getProductCategories,
  getProductTypes,
  validateProductInput,
} from '@/lib/services/products.service';

// Query parameters schema for GET requests
const GetProductsQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  category: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(50).optional(),
  search: z.string().min(1).max(200).optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
  getCategories: z.enum(['true', 'false']).optional(),
  getTypes: z.enum(['true', 'false']).optional(),
});

// Request body schema for POST
const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name is too long'),
  description: z.string().max(1000, 'Description is too long').nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  type: z.string().min(1, 'Product type is required').max(50, 'Product type is too long'),
  basePrice: z.number().min(0, 'Price must be non-negative'),
  active: z.boolean().optional(),
  config: z.record(z.any()).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/products
 *
 * Fetch products with optional filtering
 *
 * Query Parameters:
 * - active: Filter by active status ('true' or 'false')
 * - category: Filter by category
 * - type: Filter by product type
 * - search: Search in name and description
 * - activeOnly: Return only active products ('true' or 'false', default: 'false')
 * - getCategories: Return available categories instead of products
 * - getTypes: Return available types instead of products
 */
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest) => {
    try {
      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID is required' },
          { status: 400 }
        );
      }

      // Parse and validate query parameters
      const { searchParams } = new URL(req.url);
      const queryParams: Record<string, string> = {};

      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      let parsed;
      try {
        parsed = GetProductsQuerySchema.parse(queryParams);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid query parameters',
              details: error.flatten().fieldErrors,
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Handle getCategories request
      if (parsed.getCategories === 'true') {
        const categories = await getProductCategories(tenantId);
        return NextResponse.json({
          success: true,
          data: categories,
          count: categories.length,
        });
      }

      // Handle getTypes request
      if (parsed.getTypes === 'true') {
        const types = await getProductTypes(tenantId);
        return NextResponse.json({
          success: true,
          data: types,
          count: types.length,
        });
      }

      // Handle activeOnly shortcut
      if (parsed.activeOnly === 'true') {
        const products = await getActiveProducts(tenantId);
        return NextResponse.json({
          success: true,
          data: products,
          count: products.length,
        });
      }

      // Handle type filter shortcut
      if (parsed.type && !parsed.category && !parsed.search) {
        const activeOnly = parsed.active === 'true' || parsed.active === undefined;
        const products = await getProductsByType(tenantId, parsed.type, activeOnly);
        return NextResponse.json({
          success: true,
          data: products,
          count: products.length,
        });
      }

      // Build filters object
      const filters: {
        active?: boolean;
        category?: string;
        type?: string;
        search?: string;
      } = {};

      if (parsed.active !== undefined) {
        filters.active = parsed.active === 'true';
      }

      if (parsed.category) {
        filters.category = parsed.category;
      }

      if (parsed.type) {
        filters.type = parsed.type;
      }

      if (parsed.search) {
        filters.search = parsed.search;
      }

      // Fetch products with filters
      const products = await getProducts(tenantId, filters);

      return NextResponse.json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error('[ProductsAPI] GET error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch products',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * POST /api/admin/products
 *
 * Create a new product
 *
 * Request Body:
 * {
 *   name: string,
 *   description?: string | null,
 *   category?: string | null,
 *   type: string,
 *   basePrice: number,
 *   active?: boolean,
 *   config?: Record<string, any> | null,
 *   sortOrder?: number
 * }
 */
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest) => {
    try {
      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID is required' },
          { status: 400 }
        );
      }

      // Get user from auth middleware
      const user = (req as any).user;

      // Parse and validate request body
      const body = await req.json();

      let parsed;
      try {
        parsed = CreateProductSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid request body',
              details: error.flatten(),
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Additional validation
      try {
        validateProductInput(parsed);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Product validation failed',
            details: error instanceof Error ? error.message : 'Invalid product data',
          },
          { status: 400 }
        );
      }

      // Create product
      const product = await createProduct(tenantId, parsed, user?.id);

      return NextResponse.json(
        {
          success: true,
          data: product,
          message: 'Product created successfully',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[ProductsAPI] POST error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create product',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);
