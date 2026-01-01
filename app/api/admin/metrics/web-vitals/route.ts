import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get recent performance metrics from the database
    const { data: metrics, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('metric_name', 'web-vitals')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('Failed to fetch web vitals', { error: error.message });
      throw error;
    }

    // Default values if no metrics found
    const defaultVitals = {
      CLS: 0.1,
      FCP: 1500,
      LCP: 2000,
      TTFB: 600,
    };

    // Return latest metrics or defaults
    const webVitals = metrics?.[0]?.metric_value
      ? JSON.parse(metrics[0].metric_value.toString())
      : defaultVitals;

    return NextResponse.json(webVitals);
  } catch (error) {
    logger.error('Web vitals API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch web vitals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const vitals = await request.json();

    // Validate the vitals data
    const requiredFields = ['CLS', 'FCP', 'LCP', 'TTFB'];
    for (const field of requiredFields) {
      if (typeof vitals[field] !== 'number') {
        return NextResponse.json(
          { error: `Invalid or missing ${field}` },
          { status: 400 }
        );
      }
    }

    // Store the metrics
    const { error } = await supabase.from('performance_metrics').insert({
      metric_name: 'web-vitals',
      metric_value: JSON.stringify(vitals),
      metric_unit: 'mixed',
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to store web vitals', { error: error.message });
      throw error;
    }

    logger.info('Web vitals stored successfully', { vitals });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Web vitals storage error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to store web vitals' },
      { status: 500 }
    );
  }
}
