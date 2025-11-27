import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import {
  getTenantBranding,
  updateTenantBranding,
  validateBranding,
  TenantBranding,
} from '@/lib/services/tenant-branding.service';

/**
 * GET /api/admin/branding
 * Get the current tenant's branding configuration
 */
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { tenantId } = resolveTenantFromHeaders(req.headers);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    const branding = await getTenantBranding(tenantId);

    return NextResponse.json({
      success: true,
      branding,
    });
  } catch (error) {
    console.error('[API:Branding:GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/branding
 * Update the current tenant's branding configuration
 */
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const { tenantId } = resolveTenantFromHeaders(req.headers);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const brandingUpdate = body as Partial<TenantBranding>;

    // Validate the branding data
    const validation = validateBranding(brandingUpdate);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Update branding
    const result = await updateTenantBranding(tenantId, brandingUpdate);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update branding' },
        { status: 500 }
      );
    }

    // Fetch updated branding
    const updatedBranding = await getTenantBranding(tenantId);

    return NextResponse.json({
      success: true,
      branding: updatedBranding,
      message: 'Branding actualizado correctamente',
    });
  } catch (error) {
    console.error('[API:Branding:PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
