/**
 * Single Product API Endpoint
 *
 * Handles operations for a specific product by ID.
 * All operations are tenant-scoped with proper validation and error handling.
 *
 * Security:
 * - Admin authentication required
 * - Rate limiting applied
 * - Tenant isolation enforced
 * - Input validation with Zod
 */

import type { RouteContext } from '@/types/next-route';
import { resolveParams } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import {
  getProductById,
  updateProduct,
  deleteProduct,
  validateProductInput,
} from '@/lib/services/products.service';

// Request body schema for PATCH
const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  type: z.string().min(1).max(50).optional(),
  basePrice: z.number().min(0).optional(),
  active: z.boolean().optional(),
  config: z.record(z.any()).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/products/[id]
 *
 * Fetch a single product by ID
 */
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await resolveParams(context);

      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID is required' },
          { status: 400 }
        );
      }

      // Validate UUID format
      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }

      // Fetch product
      const product = await getProductById(id, tenantId);

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('[ProductAPI] GET error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch product',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * PATCH /api/admin/products/[id]
 *
 * Update a product
 *
 * Request Body:
 * {
 *   name?: string,
 *   description?: string | null,
 *   category?: string | null,
 *   type?: string,
 *   basePrice?: number,
 *   active?: boolean,
 *   config?: Record<string, any> | null,
 *   sortOrder?: number
 * }
 */
export const PATCH = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await resolveParams(context);

      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID is required' },
          { status: 400 }
        );
      }

      // Validate UUID format
      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await req.json();

      let parsed;
      try {
        parsed = UpdateProductSchema.parse(body);
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

      // Update product
      const product = await updateProduct(id, tenantId, parsed);

      return NextResponse.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      console.error('[ProductAPI] PATCH error:', error);

      // Handle not found error
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to update product',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * DELETE /api/admin/products/[id]
 *
 * Delete a product
 */
export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await resolveParams(context);

      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID is required' },
          { status: 400 }
        );
      }

      // Validate UUID format
      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_PATTERN.test(id)) {
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }

      // Delete product
      await deleteProduct(id, tenantId);

      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('[ProductAPI] DELETE error:', error);

      // Handle not found error
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to delete product',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);
