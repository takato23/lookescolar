/**
 * Store Configuration API Endpoint
 *
 * Handles CRUD operations for store configuration.
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
  getStoreConfig,
  getStoreConfigWithMetadata,
  saveStoreConfig,
  updateStoreConfig,
  deleteStoreConfig,
  listStoreConfigs,
} from '@/lib/services/store-config.service';
import { StoreConfigSchema } from '@/lib/validations/store-config';

// Query parameters schema for GET requests
const GetQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  withMetadata: z.enum(['true', 'false']).optional(),
  list: z.enum(['true', 'false']).optional(),
  includeGlobal: z.enum(['true', 'false']).optional(),
});

// Request body schema for POST/PATCH
const SaveConfigBodySchema = z.object({
  config: StoreConfigSchema,
  eventId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
});

const UpdateConfigBodySchema = z.object({
  id: z.string().uuid(),
  updates: StoreConfigSchema.partial(),
});

const DeleteConfigBodySchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/admin/store-config
 *
 * Fetch store configuration with optional filtering
 *
 * Query Parameters:
 * - eventId: UUID of event (optional)
 * - folderId: UUID of folder (optional)
 * - withMetadata: Include metadata (optional, default: false)
 * - list: Return list of configs (optional, default: false)
 * - includeGlobal: Include global configs when listing (optional, default: true)
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
        parsed = GetQuerySchema.parse(queryParams);
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

      // Handle list request
      if (parsed.list === 'true') {
        const configs = await listStoreConfigs(tenantId, {
          eventId: parsed.eventId,
          folderId: parsed.folderId,
          includeGlobal: parsed.includeGlobal !== 'false',
        });

        return NextResponse.json({
          success: true,
          data: configs,
          count: configs.length,
        });
      }

      // Handle single config request with metadata
      if (parsed.withMetadata === 'true') {
        const result = await getStoreConfigWithMetadata(tenantId, {
          eventId: parsed.eventId,
          folderId: parsed.folderId,
        });

        if (!result) {
          return NextResponse.json(
            { error: 'Store configuration not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      // Handle simple config request
      const config = await getStoreConfig(tenantId, {
        eventId: parsed.eventId,
        folderId: parsed.folderId,
      });

      return NextResponse.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('[StoreConfigAPI] GET error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch store configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * POST /api/admin/store-config
 *
 * Create or update store configuration
 *
 * Request Body:
 * {
 *   config: StoreConfig,
 *   eventId?: string,
 *   folderId?: string
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

      // Parse and validate request body
      const body = await req.json();

      let parsed;
      try {
        parsed = SaveConfigBodySchema.parse(body);
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

      // Save configuration
      const savedConfig = await saveStoreConfig(tenantId, parsed.config, {
        eventId: parsed.eventId,
        folderId: parsed.folderId,
      });

      return NextResponse.json({
        success: true,
        data: savedConfig,
        message: 'Store configuration saved successfully',
      });
    } catch (error) {
      console.error('[StoreConfigAPI] POST error:', error);
      return NextResponse.json(
        {
          error: 'Failed to save store configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * PATCH /api/admin/store-config
 *
 * Update existing store configuration
 *
 * Request Body:
 * {
 *   id: string,
 *   updates: Partial<StoreConfig>
 * }
 */
export const PATCH = RateLimitMiddleware.withRateLimit(
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

      // Parse and validate request body
      const body = await req.json();

      let parsed;
      try {
        parsed = UpdateConfigBodySchema.parse(body);
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

      // Update configuration
      const updatedConfig = await updateStoreConfig(
        parsed.id,
        tenantId,
        parsed.updates
      );

      return NextResponse.json({
        success: true,
        data: updatedConfig,
        message: 'Store configuration updated successfully',
      });
    } catch (error) {
      console.error('[StoreConfigAPI] PATCH error:', error);

      // Handle not found error
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Store configuration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to update store configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);

/**
 * DELETE /api/admin/store-config
 *
 * Delete store configuration
 *
 * Request Body:
 * {
 *   id: string
 * }
 */
export const DELETE = RateLimitMiddleware.withRateLimit(
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

      // Parse and validate request body
      const body = await req.json();

      let parsed;
      try {
        parsed = DeleteConfigBodySchema.parse(body);
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

      // Delete configuration
      await deleteStoreConfig(parsed.id, tenantId);

      return NextResponse.json({
        success: true,
        message: 'Store configuration deleted successfully',
      });
    } catch (error) {
      console.error('[StoreConfigAPI] DELETE error:', error);

      // Handle not found error
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Store configuration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to delete store configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
);
