import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  event_type: 'order_created' | 'status_changed' | 'payment_received' | 'overdue_order' | 'delivery_reminder';
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface WorkflowAction {
  type: 'send_email' | 'send_sms' | 'update_status' | 'assign_priority' | 'create_reminder' | 'webhook';
  parameters: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
  enabled: boolean;
}

export interface OrderWorkflowContext {
  order: {
    id: string;
    status: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    total_cents: number;
    created_at: string;
    event?: {
      name: string;
      school: string;
      date: string;
    };
    subject?: {
      name: string;
      type: string;
    };
  };
  previous_status?: string;
  trigger_event: string;
  metadata?: Record<string, any>;
}

export class OrderWorkflowService {
  private supabase;

  constructor() {
    this.supabase = createServerSupabaseServiceClient();
  }

  /**
   * Execute workflows triggered by an order event
   */
  async executeWorkflows(context: OrderWorkflowContext): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[Order Workflow] Executing workflows for order ${context.order.id}, event: ${context.trigger_event}`);

      // Get active workflows for this event type
      const workflows = await this.getActiveWorkflows(context.trigger_event as any);

      const executionResults = [];

      for (const workflow of workflows) {
        try {
          const shouldExecute = this.evaluateConditions(workflow.conditions, context);
          
          if (shouldExecute) {
            console.log(`[Order Workflow] Executing workflow: ${workflow.name}`);
            
            const result = await this.executeWorkflowActions(workflow.actions, context);
            executionResults.push({
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              success: true,
              actions_executed: result.length,
              results: result,
            });

            // Log workflow execution
            await this.logWorkflowExecution(workflow.id, context.order.id, 'success', result);
          }
        } catch (error) {
          console.error(`[Order Workflow] Failed to execute workflow ${workflow.name}:`, error);
          
          executionResults.push({
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Log workflow failure
          await this.logWorkflowExecution(workflow.id, context.order.id, 'failed', [
            { action: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
          ]);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Order Workflow] Completed workflow execution in ${duration}ms`, {
        order_id: context.order.id,
        workflows_executed: executionResults.filter(r => r.success).length,
        total_workflows: workflows.length,
        duration,
      });

    } catch (error) {
      console.error('[Order Workflow] Failed to execute workflows:', error);
      throw error;
    }
  }

  /**
   * Get active workflows for a specific event type
   */
  private async getActiveWorkflows(eventType: WorkflowTrigger['event_type']): Promise<WorkflowTrigger[]> {
    // In a real implementation, this would fetch from database
    // For now, return predefined workflows
    const defaultWorkflows: WorkflowTrigger[] = [
      // Order confirmation email
      {
        id: 'wf_order_confirmation',
        name: 'Order Confirmation Email',
        description: 'Send confirmation email when order is created',
        event_type: 'order_created',
        conditions: [],
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'order_confirmation',
              to: '{{order.contact_email}}',
              subject: 'Order Confirmation - {{order.event.name}}',
            },
          },
        ],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      
      // Payment received notification
      {
        id: 'wf_payment_received',
        name: 'Payment Received Notification',
        description: 'Send notification when payment is approved',
        event_type: 'status_changed',
        conditions: [
          { field: 'order.status', operator: 'equals', value: 'approved' },
          { field: 'previous_status', operator: 'equals', value: 'pending' },
        ],
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'payment_confirmation',
              to: '{{order.contact_email}}',
              subject: 'Payment Confirmed - {{order.event.name}}',
            },
          },
        ],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },

      // Delivery notification
      {
        id: 'wf_delivery_notification',
        name: 'Delivery Notification',
        description: 'Send notification when order is delivered',
        event_type: 'status_changed',
        conditions: [
          { field: 'order.status', operator: 'equals', value: 'delivered' },
        ],
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'delivery_confirmation',
              to: '{{order.contact_email}}',
              subject: 'Your Order Has Been Delivered - {{order.event.name}}',
            },
          },
        ],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },

      // Overdue order reminder
      {
        id: 'wf_overdue_reminder',
        name: 'Overdue Order Reminder',
        description: 'Send reminder for overdue pending orders',
        event_type: 'overdue_order',
        conditions: [
          { field: 'order.status', operator: 'equals', value: 'pending' },
        ],
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'payment_reminder',
              to: '{{order.contact_email}}',
              subject: 'Payment Reminder - {{order.event.name}}',
            },
          },
          {
            type: 'assign_priority',
            parameters: {
              priority_level: 3,
            },
          },
        ],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return defaultWorkflows.filter(wf => wf.event_type === eventType && wf.enabled);
  }

  /**
   * Evaluate workflow conditions against context
   */
  private evaluateConditions(conditions: WorkflowCondition[], context: OrderWorkflowContext): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(field: string, context: OrderWorkflowContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, operator: WorkflowCondition['operator'], expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflowActions(actions: WorkflowAction[], context: OrderWorkflowContext): Promise<any[]> {
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push({
          action: action.type,
          success: true,
          result,
        });
      } catch (error) {
        console.error(`[Order Workflow] Failed to execute action ${action.type}:`, error);
        results.push({
          action: action.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: WorkflowAction, context: OrderWorkflowContext): Promise<any> {
    switch (action.type) {
      case 'send_email':
        return this.sendEmail(action.parameters, context);
      
      case 'send_sms':
        return this.sendSMS(action.parameters, context);
      
      case 'update_status':
        return this.updateOrderStatus(action.parameters, context);
      
      case 'assign_priority':
        return this.assignPriority(action.parameters, context);
      
      case 'create_reminder':
        return this.createReminder(action.parameters, context);
      
      case 'webhook':
        return this.callWebhook(action.parameters, context);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { template, to, subject } = parameters;
    
    // Replace template variables
    const resolvedTo = this.replaceVariables(to, context);
    const resolvedSubject = this.replaceVariables(subject, context);
    
    console.log(`[Order Workflow] Sending email to ${resolvedTo} with subject: ${resolvedSubject}`);
    
    // In a real implementation, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log the email
    const emailContent = await this.renderEmailTemplate(template, context);
    
    // Simulate email sending
    return {
      email_id: `email_${Date.now()}`,
      to: resolvedTo,
      subject: resolvedSubject,
      sent_at: new Date().toISOString(),
      status: 'sent',
    };
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { template, to } = parameters;
    
    const resolvedTo = this.replaceVariables(to, context);
    const smsContent = await this.renderSMSTemplate(template, context);
    
    console.log(`[Order Workflow] Sending SMS to ${resolvedTo}: ${smsContent}`);
    
    // In a real implementation, integrate with SMS service (Twilio, AWS SNS, etc.)
    return {
      sms_id: `sms_${Date.now()}`,
      to: resolvedTo,
      content: smsContent,
      sent_at: new Date().toISOString(),
      status: 'sent',
    };
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { status, notes } = parameters;
    
    const { error } = await this.supabase
      .from('orders')
      .update({
        status,
        admin_notes: notes || `Status updated by workflow`,
        last_status_change: new Date().toISOString(),
      })
      .eq('id', context.order.id);

    if (error) throw error;

    return { order_id: context.order.id, new_status: status };
  }

  /**
   * Assign priority to order
   */
  private async assignPriority(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { priority_level } = parameters;
    
    const { error } = await this.supabase
      .from('orders')
      .update({
        priority_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.order.id);

    if (error) throw error;

    return { order_id: context.order.id, priority_level };
  }

  /**
   * Create reminder
   */
  private async createReminder(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { reminder_type, remind_at, message } = parameters;
    
    // In a real implementation, store in reminders table
    console.log(`[Order Workflow] Creating reminder for order ${context.order.id}:`, {
      type: reminder_type,
      remind_at,
      message: this.replaceVariables(message, context),
    });

    return {
      reminder_id: `reminder_${Date.now()}`,
      order_id: context.order.id,
      type: reminder_type,
      remind_at,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Call webhook
   */
  private async callWebhook(parameters: any, context: OrderWorkflowContext): Promise<any> {
    const { url, method = 'POST', headers = {}, payload } = parameters;
    
    const resolvedPayload = payload ? this.replaceVariables(JSON.stringify(payload), context) : null;
    
    console.log(`[Order Workflow] Calling webhook: ${method} ${url}`);
    
    // In a real implementation, make HTTP request
    return {
      webhook_id: `webhook_${Date.now()}`,
      url,
      method,
      status: 'success',
      called_at: new Date().toISOString(),
    };
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, context: OrderWorkflowContext): string {
    let result = template;
    
    // Replace order variables
    result = result.replace(/\{\{order\.id\}\}/g, context.order.id);
    result = result.replace(/\{\{order\.status\}\}/g, context.order.status);
    result = result.replace(/\{\{order\.contact_name\}\}/g, context.order.contact_name);
    result = result.replace(/\{\{order\.contact_email\}\}/g, context.order.contact_email);
    result = result.replace(/\{\{order\.total_amount\}\}/g, (context.order.total_cents / 100).toFixed(2));
    
    // Replace event variables
    if (context.order.event) {
      result = result.replace(/\{\{order\.event\.name\}\}/g, context.order.event.name);
      result = result.replace(/\{\{order\.event\.school\}\}/g, context.order.event.school);
      result = result.replace(/\{\{order\.event\.date\}\}/g, context.order.event.date);
    }
    
    // Replace subject variables
    if (context.order.subject) {
      result = result.replace(/\{\{order\.subject\.name\}\}/g, context.order.subject.name);
      result = result.replace(/\{\{order\.subject\.type\}\}/g, context.order.subject.type);
    }
    
    // Replace other variables
    if (context.previous_status) {
      result = result.replace(/\{\{previous_status\}\}/g, context.previous_status);
    }
    
    return result;
  }

  /**
   * Render email template
   */
  private async renderEmailTemplate(templateName: string, context: OrderWorkflowContext): Promise<string> {
    const templates = {
      order_confirmation: `
        <h2>Order Confirmation</h2>
        <p>Dear {{order.contact_name}},</p>
        <p>Thank you for your order! We have received your order for {{order.event.name}} at {{order.event.school}}.</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          <li>Order ID: {{order.id}}</li>
          <li>Total Amount: \${{order.total_amount}}</li>
          <li>Event: {{order.event.name}}</li>
          <li>School: {{order.event.school}}</li>
        </ul>
        <p>You will receive another email once your payment is processed.</p>
        <p>Best regards,<br>LookEscolar Team</p>
      `,
      payment_confirmation: `
        <h2>Payment Confirmed</h2>
        <p>Dear {{order.contact_name}},</p>
        <p>Great news! Your payment has been confirmed for your order {{order.id}}.</p>
        <p>We are now processing your photos for {{order.event.name}}. You will be notified when they are ready for delivery.</p>
        <p>Best regards,<br>LookEscolar Team</p>
      `,
      delivery_confirmation: `
        <h2>Your Order Has Been Delivered</h2>
        <p>Dear {{order.contact_name}},</p>
        <p>Your order {{order.id}} for {{order.event.name}} has been delivered!</p>
        <p>Thank you for choosing LookEscolar. We hope you love your photos!</p>
        <p>Best regards,<br>LookEscolar Team</p>
      `,
      payment_reminder: `
        <h2>Payment Reminder</h2>
        <p>Dear {{order.contact_name}},</p>
        <p>This is a friendly reminder that your payment for order {{order.id}} is still pending.</p>
        <p>Please complete your payment to ensure your photos from {{order.event.name}} are processed.</p>
        <p>Order Amount: \${{order.total_amount}}</p>
        <p>Best regards,<br>LookEscolar Team</p>
      `,
    };

    const template = templates[templateName as keyof typeof templates] || '';
    return this.replaceVariables(template, context);
  }

  /**
   * Render SMS template
   */
  private async renderSMSTemplate(templateName: string, context: OrderWorkflowContext): Promise<string> {
    const templates = {
      order_confirmation: 'Order {{order.id}} confirmed for {{order.event.name}}. Amount: \${{order.total_amount}}. Thank you!',
      payment_confirmation: 'Payment confirmed for order {{order.id}}. Photos are being processed. - LookEscolar',
      delivery_confirmation: 'Your order {{order.id}} has been delivered! Thank you for choosing LookEscolar.',
      payment_reminder: 'Reminder: Payment pending for order {{order.id}} - {{order.event.name}}. Amount: \${{order.total_amount}}}',
    };

    const template = templates[templateName as keyof typeof templates] || '';
    return this.replaceVariables(template, context);
  }

  /**
   * Log workflow execution
   */
  private async logWorkflowExecution(
    workflowId: string, 
    orderId: string, 
    status: 'success' | 'failed', 
    results: any[]
  ): Promise<void> {
    try {
      // In a real implementation, store in workflow_executions table
      console.log(`[Order Workflow] Logging execution:`, {
        workflow_id: workflowId,
        order_id: orderId,
        status,
        results,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Order Workflow] Failed to log execution:', error);
      // Don't throw - logging failures shouldn't break workflows
    }
  }

  /**
   * Check for overdue orders and trigger workflows
   */
  async processOverdueOrders(): Promise<void> {
    try {
      console.log('[Order Workflow] Checking for overdue orders...');

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: overdueOrders, error } = await this.supabase
        .from('orders')
        .select(`
          id, status, contact_name, contact_email, contact_phone, total_cents, created_at,
          events(name, school, date),
          subjects(name, type)
        `)
        .eq('status', 'pending')
        .lt('created_at', twentyFourHoursAgo);

      if (error) throw error;

      console.log(`[Order Workflow] Found ${overdueOrders?.length || 0} overdue orders`);

      for (const order of overdueOrders || []) {
        const context: OrderWorkflowContext = {
          order: {
            id: order.id,
            status: order.status,
            contact_name: order.contact_name,
            contact_email: order.contact_email,
            contact_phone: order.contact_phone,
            total_cents: order.total_cents,
            created_at: order.created_at,
            event: (order as any).events ? {
              name: (order as any).events.name,
              school: (order as any).events.school,
              date: (order as any).events.date,
            } : undefined,
            subject: (order as any).subjects ? {
              name: (order as any).subjects.name,
              type: (order as any).subjects.type,
            } : undefined,
          },
          trigger_event: 'overdue_order',
          metadata: {
            hours_overdue: Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)),
          },
        };

        await this.executeWorkflows(context);
      }

    } catch (error) {
      console.error('[Order Workflow] Failed to process overdue orders:', error);
      throw error;
    }
  }

  /**
   * Trigger workflow for order creation
   */
  async triggerOrderCreated(orderId: string): Promise<void> {
    const order = await this.getOrderForWorkflow(orderId);
    if (!order) return;

    const context: OrderWorkflowContext = {
      order,
      trigger_event: 'order_created',
    };

    await this.executeWorkflows(context);
  }

  /**
   * Trigger workflow for status change
   */
  async triggerStatusChanged(orderId: string, newStatus: string, previousStatus: string): Promise<void> {
    const order = await this.getOrderForWorkflow(orderId);
    if (!order) return;

    const context: OrderWorkflowContext = {
      order: { ...order, status: newStatus },
      previous_status: previousStatus,
      trigger_event: 'status_changed',
    };

    await this.executeWorkflows(context);
  }

  /**
   * Get order data for workflow context
   */
  private async getOrderForWorkflow(orderId: string): Promise<OrderWorkflowContext['order'] | null> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select(`
          id, status, contact_name, contact_email, contact_phone, total_cents, created_at,
          events(name, school, date),
          subjects(name, type)
        `)
        .eq('id', orderId)
        .single();

      if (error || !order) return null;

      return {
        id: order.id,
        status: order.status,
        contact_name: order.contact_name,
        contact_email: order.contact_email,
        contact_phone: order.contact_phone,
        total_cents: order.total_cents,
        created_at: order.created_at,
        event: (order as any).events ? {
          name: (order as any).events.name,
          school: (order as any).events.school,
          date: (order as any).events.date,
        } : undefined,
        subject: (order as any).subjects ? {
          name: (order as any).subjects.name,
          type: (order as any).subjects.type,
        } : undefined,
      };
    } catch (error) {
      console.error('[Order Workflow] Failed to get order for workflow:', error);
      return null;
    }
  }
}

export const orderWorkflowService = new OrderWorkflowService();