import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderWorkflowService } from '@/lib/services/order-workflow.service';

// Validation schema for workflow trigger request
const WorkflowTriggerSchema = z.object({
  action: z.enum(['trigger_status_change', 'trigger_order_created', 'process_overdue', 'test_workflow']),
  order_id: z.string().uuid().optional(),
  status: z.string().optional(),
  previous_status: z.string().optional(),
  workflow_id: z.string().optional(),
});

/**
 * POST /api/admin/orders/workflows
 * Trigger workflows or manage automated processes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = WorkflowTriggerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid workflow parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { action, order_id, status, previous_status, workflow_id } = validation.data;

    console.log(`[Workflow API] Processing action: ${action}`, {
      order_id,
      status,
      previous_status,
      workflow_id,
    });

    let result: any = {};

    switch (action) {
      case 'trigger_order_created':
        if (!order_id) {
          return NextResponse.json(
            { error: 'order_id is required for trigger_order_created' },
            { status: 400 }
          );
        }
        await orderWorkflowService.triggerOrderCreated(order_id);
        result = { message: 'Order created workflows triggered successfully', order_id };
        break;

      case 'trigger_status_change':
        if (!order_id || !status || !previous_status) {
          return NextResponse.json(
            { error: 'order_id, status, and previous_status are required for trigger_status_change' },
            { status: 400 }
          );
        }
        await orderWorkflowService.triggerStatusChanged(order_id, status, previous_status);
        result = { 
          message: 'Status change workflows triggered successfully', 
          order_id, 
          status_change: `${previous_status} → ${status}` 
        };
        break;

      case 'process_overdue':
        await orderWorkflowService.processOverdueOrders();
        result = { message: 'Overdue orders processed successfully' };
        break;

      case 'test_workflow':
        // Test workflow with dummy data
        const testContext = {
          order: {
            id: 'test_order_123',
            status: 'pending',
            contact_name: 'John Doe',
            contact_email: 'john@example.com',
            contact_phone: '+1234567890',
            total_cents: 50000, // $500
            created_at: new Date().toISOString(),
            event: {
              name: 'School Graduation 2024',
              school: 'Test High School',
              date: '2024-06-15',
            },
            subject: {
              name: 'John Doe',
              type: 'student',
            },
          },
          trigger_event: 'order_created',
        };
        
        await orderWorkflowService.executeWorkflows(testContext);
        result = { message: 'Test workflow executed successfully', test_context: testContext };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    console.log(`[Workflow API] Action completed: ${action} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      action,
      result,
      performance: {
        execution_time_ms: duration,
      },
      metadata: {
        processed_at: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Workflow API] Workflow execution failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'Workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/workflows
 * Get workflow status and configuration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log(`[Workflow API] GET request with action: ${action}`);

    let response: any = {
      workflow_service: 'active',
      supported_actions: [
        'trigger_order_created',
        'trigger_status_change', 
        'process_overdue',
        'test_workflow'
      ],
    };

    if (action === 'status') {
      // Return workflow service status
      response.status = {
        service_health: 'healthy',
        last_overdue_check: 'N/A', // In real implementation, track this
        active_workflows: 4,
        automation_enabled: true,
      };
    } else if (action === 'workflows') {
      // Return available workflows (in real implementation, fetch from database)
      response.workflows = [
        {
          id: 'wf_order_confirmation',
          name: 'Order Confirmation Email',
          event_type: 'order_created',
          enabled: true,
          description: 'Send confirmation email when order is created',
        },
        {
          id: 'wf_payment_received',
          name: 'Payment Received Notification',
          event_type: 'status_changed',
          enabled: true,
          description: 'Send notification when payment is approved',
        },
        {
          id: 'wf_delivery_notification',
          name: 'Delivery Notification',
          event_type: 'status_changed',
          enabled: true,
          description: 'Send notification when order is delivered',
        },
        {
          id: 'wf_overdue_reminder',
          name: 'Overdue Order Reminder',
          event_type: 'overdue_order',
          enabled: true,
          description: 'Send reminder for overdue pending orders',
        },
      ];
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: response,
      performance: {
        response_time_ms: duration,
      },
      metadata: {
        retrieved_at: new Date().toISOString(),
        api_version: '1.0',
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Workflow API] GET request failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve workflow information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}