import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderExportService, type ExportOptions, type ExportFormat, type ExportTemplate } from '@/lib/services/order-export.service';
import type { OrderFilters } from '@/lib/services/enhanced-order.service';

// Validation schema for export request
const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
  template: z.enum(['standard', 'detailed', 'summary', 'financial', 'labels']).default('standard'),
  includeItems: z.boolean().default(false),
  includeAuditTrail: z.boolean().default(false),
  includePaymentInfo: z.boolean().default(false),
  filters: z.object({
    status: z.array(z.string()).optional(),
    event_id: z.string().uuid().optional(),
    priority_level: z.array(z.number()).optional(),
    delivery_method: z.array(z.string()).optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    amount_min: z.number().optional(),
    amount_max: z.number().optional(),
    overdue_only: z.boolean().optional(),
    has_payment: z.boolean().optional(),
    search_query: z.string().optional(),
  }).optional(),
  customFields: z.array(z.string()).optional(),
});

/**
 * POST /api/admin/orders/export
 * Export orders with specified format and filters
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = ExportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid export parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const {
      format,
      template,
      includeItems,
      includeAuditTrail,
      includePaymentInfo,
      filters,
      customFields
    } = validation.data;

    // Prepare export options
    const exportOptions: ExportOptions = {
      format,
      template,
      includeItems,
      includeAuditTrail,
      includePaymentInfo,
      filters,
      customFields,
    };

    console.log(`[Order Export API] Starting export`, {
      format,
      template,
      filters: filters ? Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined) : [],
    });

    // Generate export
    const result = await orderExportService.exportOrders(exportOptions);

    const duration = Date.now() - startTime;

    console.log(`[Order Export API] Export completed in ${duration}ms`, {
      filename: result.filename,
      recordCount: result.recordCount,
      fileSize: `${(result.fileSize / 1024).toFixed(2)} KB`,
    });

    // Return export result
    return NextResponse.json({
      success: true,
      export: result,
      performance: {
        generation_time_ms: duration,
        records_per_second: Math.round(result.recordCount / (duration / 1000)),
      },
      metadata: {
        format,
        template,
        filters_applied: filters ? Object.keys(filters).length : 0,
        generated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Export API] Export failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/export
 * Simple export with query parameters (for direct download links)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const format = (searchParams.get('format') as ExportFormat) || 'csv';
    const template = (searchParams.get('template') as ExportTemplate) || 'standard';
    const eventId = searchParams.get('event_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const createdAfter = searchParams.get('created_after') || undefined;
    const createdBefore = searchParams.get('created_before') || undefined;

    // Build filters from query params
    const filters: OrderFilters = {};
    if (eventId) filters.event_id = eventId;
    if (status && status !== 'all') filters.status = [status];
    if (createdAfter) filters.created_after = createdAfter;
    if (createdBefore) filters.created_before = createdBefore;

    const exportOptions: ExportOptions = {
      format,
      template,
      filters,
      includeItems: template === 'detailed',
      includeAuditTrail: template === 'detailed',
      includePaymentInfo: template === 'financial' || template === 'detailed',
    };

    console.log(`[Order Export API] GET export request`, {
      format,
      template,
      filters: Object.keys(filters),
    });

    // Generate export
    const result = await orderExportService.exportOrders(exportOptions);

    const duration = Date.now() - startTime;

    console.log(`[Order Export API] GET export completed in ${duration}ms`, {
      filename: result.filename,
      recordCount: result.recordCount,
    });

    // For GET requests, return the file directly
    // In a real implementation, you would stream the file content
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/admin/orders/export/download/${result.filename}`,
      export: result,
      message: 'Export generated successfully. Use the downloadUrl to get the file.',
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Export API] GET export failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}