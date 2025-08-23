import { NextRequest, NextResponse } from 'next/server';
import { orderWorkflowService } from '@/lib/services/order-workflow.service';

/**
 * POST /api/admin/orders/scheduled-jobs
 * Run scheduled jobs for order automation
 * This endpoint should be called by a cron job or scheduler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify request is from authorized source (in production, use proper auth)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Scheduled Jobs] Starting automated order processing...');

    const results = {
      overdue_orders_processed: 0,
      delivery_reminders_sent: 0,
      cleanup_operations: 0,
      errors: [] as string[],
    };

    try {
      // Process overdue orders
      console.log('[Scheduled Jobs] Processing overdue orders...');
      await orderWorkflowService.processOverdueOrders();
      results.overdue_orders_processed = 1; // In real implementation, return actual count
    } catch (error) {
      console.error('[Scheduled Jobs] Failed to process overdue orders:', error);
      results.errors.push(`Overdue processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Send delivery reminders (for orders that should have been delivered)
      console.log('[Scheduled Jobs] Processing delivery reminders...');
      await processDeliveryReminders();
      results.delivery_reminders_sent = 1; // In real implementation, return actual count
    } catch (error) {
      console.error('[Scheduled Jobs] Failed to process delivery reminders:', error);
      results.errors.push(`Delivery reminders failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Cleanup old workflow logs (optional)
      console.log('[Scheduled Jobs] Running cleanup operations...');
      await cleanupOldLogs();
      results.cleanup_operations = 1;
    } catch (error) {
      console.error('[Scheduled Jobs] Failed cleanup operations:', error);
      results.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = Date.now() - startTime;

    console.log(`[Scheduled Jobs] Completed in ${duration}ms`, results);

    return NextResponse.json({
      success: true,
      message: 'Scheduled jobs completed',
      results,
      performance: {
        execution_time_ms: duration,
        jobs_run: 3,
        errors_count: results.errors.length,
      },
      metadata: {
        executed_at: new Date().toISOString(),
        next_run: getNextRunTime(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Scheduled Jobs] Execution failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'Scheduled jobs execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/scheduled-jobs
 * Get status of scheduled jobs
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        status: {
          service: 'active',
          last_run: 'N/A', // In production, track this in database
          next_run: getNextRunTime(),
          jobs_configured: [
            {
              name: 'process_overdue_orders',
              description: 'Process overdue pending orders and send reminders',
              frequency: 'hourly',
              enabled: true,
            },
            {
              name: 'delivery_reminders',
              description: 'Send reminders for delayed deliveries',
              frequency: 'daily',
              enabled: true,
            },
            {
              name: 'cleanup_logs',
              description: 'Clean up old workflow execution logs',
              frequency: 'weekly',
              enabled: true,
            },
          ],
        },
        metadata: {
          timezone: 'UTC',
          scheduler: 'vercel-cron',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled jobs service is active',
      available_actions: ['status'],
    });

  } catch (error) {
    console.error('[Scheduled Jobs] GET request failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve scheduled jobs status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process delivery reminders for orders that should have been delivered
 */
async function processDeliveryReminders(): Promise<void> {
  // This would check for orders that are approved but not delivered
  // and past their expected delivery date
  console.log('[Scheduled Jobs] Processing delivery reminders...');
  
  // In real implementation:
  // 1. Query orders with status 'approved' and past estimated delivery date
  // 2. Trigger delivery reminder workflows
  // 3. Update order priority if significantly overdue
  
  // Placeholder implementation
  const mockOverdueDeliveries = []; // Would be actual database query
  
  for (const order of mockOverdueDeliveries) {
    // Trigger delivery reminder workflow
  }
}

/**
 * Clean up old workflow execution logs
 */
async function cleanupOldLogs(): Promise<void> {
  console.log('[Scheduled Jobs] Cleaning up old logs...');
  
  // In real implementation:
  // 1. Delete workflow execution logs older than 30 days
  // 2. Archive important logs
  // 3. Clean up temporary files
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  console.log(`[Scheduled Jobs] Would clean logs older than ${thirtyDaysAgo.toISOString()}`);
}

/**
 * Calculate next run time (helper function)
 */
function getNextRunTime(): string {
  // Calculate next hour for hourly jobs
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour.toISOString();
}