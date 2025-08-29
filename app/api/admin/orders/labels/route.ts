import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderExportService } from '@/lib/services/order-export.service';

// Validation schema for labels generation
const LabelsRequestSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(100),
  format: z.enum(['pdf', 'html']).default('pdf'),
  label_size: z.enum(['standard', 'small', 'large']).default('standard'),
  include_qr: z.boolean().default(true),
  include_logo: z.boolean().default(true),
});

/**
 * POST /api/admin/orders/labels
 * Generate shipping labels for specified orders
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = LabelsRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid labels request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { order_ids, format, label_size, include_qr, include_logo } =
      validation.data;

    console.log(
      `[Order Labels API] Generating labels for ${order_ids.length} orders`,
      {
        format,
        label_size,
        include_qr,
        include_logo,
      }
    );

    // Generate labels using the export service
    const result = await orderExportService.generateShippingLabels(order_ids);

    const duration = Date.now() - startTime;

    console.log(`[Order Labels API] Labels generated in ${duration}ms`, {
      filename: result.filename,
      recordCount: result.recordCount,
      fileSize: `${(result.fileSize / 1024).toFixed(2)} KB`,
    });

    return NextResponse.json({
      success: true,
      labels: result,
      metadata: {
        order_count: order_ids.length,
        format,
        label_size,
        options: {
          include_qr,
          include_logo,
        },
        generated_at: new Date().toISOString(),
      },
      performance: {
        generation_time_ms: duration,
        labels_per_second: Math.round(order_ids.length / (duration / 1000)),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Labels API] Label generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Label generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/labels
 * Generate labels for orders based on query parameters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Get order IDs from query parameter (comma-separated)
    const orderIdsParam = searchParams.get('order_ids');
    if (!orderIdsParam) {
      return NextResponse.json(
        { error: 'order_ids parameter is required' },
        { status: 400 }
      );
    }

    const orderIds = orderIdsParam.split(',').filter(Boolean);
    if (orderIds.length === 0 || orderIds.length > 100) {
      return NextResponse.json(
        { error: 'Invalid number of order IDs (must be 1-100)' },
        { status: 400 }
      );
    }

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    for (const id of orderIds) {
      if (!uuidRegex.test(id)) {
        return NextResponse.json(
          { error: `Invalid order ID format: ${id}` },
          { status: 400 }
        );
      }
    }

    const format = (searchParams.get('format') as 'pdf' | 'html') || 'pdf';
    const labelSize =
      (searchParams.get('label_size') as 'standard' | 'small' | 'large') ||
      'standard';
    const includeQr = searchParams.get('include_qr') !== 'false';
    const includeLogo = searchParams.get('include_logo') !== 'false';

    console.log(
      `[Order Labels API] GET request for ${orderIds.length} labels`,
      {
        format,
        labelSize,
        includeQr,
        includeLogo,
      }
    );

    // Generate labels
    const result = await orderExportService.generateShippingLabels(orderIds);

    const duration = Date.now() - startTime;

    console.log(`[Order Labels API] GET labels completed in ${duration}ms`);

    // For GET requests, provide download information
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/admin/orders/labels/download/${result.filename}`,
      labels: result,
      message:
        'Labels generated successfully. Use the downloadUrl to get the file.',
      metadata: {
        order_count: orderIds.length,
        format,
        options: { includeQr, includeLogo, labelSize },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Labels API] GET labels failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Label generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
