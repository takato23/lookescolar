import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { OrderWithDetails } from '@/types/admin-api';
import type { OrderFilters } from './enhanced-order.service';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';
export type ExportTemplate = 'standard' | 'detailed' | 'summary' | 'financial' | 'labels';

export interface ExportOptions {
  format: ExportFormat;
  template: ExportTemplate;
  filters?: OrderFilters;
  includeItems?: boolean;
  includeAuditTrail?: boolean;
  includePaymentInfo?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  customFields?: string[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  downloadUrl?: string;
  recordCount: number;
  fileSize: number;
  generatedAt: string;
  expiresAt: string;
}

export class OrderExportService {
  private supabase;

  constructor() {
    this.supabase = createServerSupabaseServiceClient();
  }

  /**
   * Export orders with specified options
   */
  async exportOrders(options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Get orders based on filters
      const orders = await this.getOrdersForExport(options.filters);
      
      // Generate export based on format
      let exportData: string | Buffer;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'csv':
          exportData = await this.generateCSV(orders, options);
          filename = `orders-${this.getTimestamp()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'excel':
          exportData = await this.generateExcel(orders, options);
          filename = `orders-${this.getTimestamp()}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'pdf':
          exportData = await this.generatePDF(orders, options);
          filename = `orders-${this.getTimestamp()}.pdf`;
          mimeType = 'application/pdf';
          break;
        case 'json':
          exportData = await this.generateJSON(orders, options);
          filename = `orders-${this.getTimestamp()}.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Calculate file size
      const fileSize = Buffer.isBuffer(exportData) 
        ? exportData.length 
        : Buffer.byteLength(exportData, 'utf8');

      const result: ExportResult = {
        success: true,
        filename,
        recordCount: orders.length,
        fileSize,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      console.log(`[Order Export] Generated ${options.format.toUpperCase()} export`, {
        template: options.template,
        recordCount: orders.length,
        fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
        duration: `${Date.now() - startTime}ms`
      });

      return result;

    } catch (error) {
      console.error('[Order Export] Export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get orders for export based on filters
   */
  private async getOrdersForExport(filters?: OrderFilters): Promise<OrderWithDetails[]> {
    let query = this.supabase
      .from('order_details_with_audit')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id);
      }
      if (filters.priority_level && filters.priority_level.length > 0) {
        query = query.in('priority_level', filters.priority_level);
      }
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }
      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }
      if (filters.amount_min) {
        query = query.gte('total_amount_cents', filters.amount_min * 100);
      }
      if (filters.amount_max) {
        query = query.lte('total_amount_cents', filters.amount_max * 100);
      }
      if (filters.overdue_only) {
        query = query.in('enhanced_status', ['pending_overdue', 'delivery_overdue']);
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders as OrderWithDetails[];
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(orders: OrderWithDetails[], options: ExportOptions): Promise<string> {
    const headers = this.getCSVHeaders(options.template);
    const rows = orders.map(order => this.orderToCSVRow(order, options.template));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Generate Excel export (simplified - would use a library like xlsx in real implementation)
   */
  private async generateExcel(orders: OrderWithDetails[], options: ExportOptions): Promise<Buffer> {
    // For now, return CSV content as buffer (in real implementation, use xlsx library)
    const csvContent = await this.generateCSV(orders, options);
    return Buffer.from(csvContent, 'utf8');
  }

  /**
   * Generate PDF export
   */
  private async generatePDF(orders: OrderWithDetails[], options: ExportOptions): Promise<Buffer> {
    // Simplified PDF generation (in real implementation, use puppeteer or pdfkit)
    const htmlContent = this.generateHTMLReport(orders, options);
    
    // For now, return HTML as buffer (in real implementation, convert to PDF)
    return Buffer.from(htmlContent, 'utf8');
  }

  /**
   * Generate JSON export
   */
  private async generateJSON(orders: OrderWithDetails[], options: ExportOptions): Promise<string> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        recordCount: orders.length,
        template: options.template,
        filters: options.filters,
      },
      orders: orders.map(order => this.orderToJSONObject(order, options.template)),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get CSV headers based on template
   */
  private getCSVHeaders(template: ExportTemplate): string[] {
    const baseHeaders = [
      'Order ID',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Status',
      'Total Amount (ARS)',
      'Items Count',
      'Created At',
      'Event Name',
      'Event School',
      'Subject Name'
    ];

    switch (template) {
      case 'detailed':
        return [
          ...baseHeaders,
          'Priority Level',
          'Delivery Method',
          'Tracking Number',
          'Estimated Delivery',
          'Actual Delivery',
          'Admin Notes',
          'MP Payment ID',
          'MP Status',
          'Hours Since Created',
          'Hours Since Status Change'
        ];

      case 'financial':
        return [
          'Order ID',
          'Customer Name',
          'Status',
          'Total Amount (ARS)',
          'Created At',
          'Payment ID',
          'Payment Status',
          'Revenue Category'
        ];

      case 'summary':
        return [
          'Order ID',
          'Customer Name',
          'Status',
          'Total Amount (ARS)',
          'Items Count',
          'Created At'
        ];

      case 'labels':
        return [
          'Customer Name',
          'Customer Email',
          'Customer Phone',
          'Order ID',
          'Event Name',
          'School Name',
          'Delivery Method',
          'Tracking Number'
        ];

      default: // standard
        return baseHeaders;
    }
  }

  /**
   * Convert order to CSV row
   */
  private orderToCSVRow(order: OrderWithDetails, template: ExportTemplate): string[] {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const baseRow = [
      order.id,
      order.contact_name,
      order.contact_email,
      order.contact_phone || '',
      order.status,
      (order.total_amount_cents / 100).toFixed(2),
      order.total_items.toString(),
      new Date(order.created_at).toLocaleDateString(),
      order.event?.name || '',
      order.event?.school || '',
      order.subject?.name || ''
    ].map(escapeCSV);

    switch (template) {
      case 'detailed':
        return [
          ...baseRow,
          order.priority_level?.toString() || '1',
          order.delivery_method || '',
          order.tracking_number || '',
          order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString() : '',
          order.actual_delivery_date ? new Date(order.actual_delivery_date).toLocaleDateString() : '',
          order.admin_notes || '',
          order.mp_payment_id || '',
          order.mp_status || '',
          order.hours_since_created?.toFixed(1) || '',
          order.hours_since_status_change?.toFixed(1) || ''
        ].map(escapeCSV);

      case 'financial':
        return [
          order.id,
          order.contact_name,
          order.status,
          (order.total_amount_cents / 100).toFixed(2),
          new Date(order.created_at).toLocaleDateString(),
          order.mp_payment_id || '',
          order.mp_status || '',
          order.status === 'delivered' || order.status === 'approved' ? 'Revenue' : 'Pending'
        ].map(escapeCSV);

      case 'summary':
        return [
          order.id,
          order.contact_name,
          order.status,
          (order.total_amount_cents / 100).toFixed(2),
          order.total_items.toString(),
          new Date(order.created_at).toLocaleDateString()
        ].map(escapeCSV);

      case 'labels':
        return [
          order.contact_name,
          order.contact_email,
          order.contact_phone || '',
          order.id,
          order.event?.name || '',
          order.event?.school || '',
          order.delivery_method || 'pickup',
          order.tracking_number || ''
        ].map(escapeCSV);

      default: // standard
        return baseRow;
    }
  }

  /**
   * Convert order to JSON object
   */
  private orderToJSONObject(order: OrderWithDetails, template: ExportTemplate): any {
    const baseObject = {
      id: order.id,
      customer: {
        name: order.contact_name,
        email: order.contact_email,
        phone: order.contact_phone,
      },
      status: order.status,
      enhanced_status: order.enhanced_status,
      total_amount_cents: order.total_amount_cents,
      total_amount_ars: order.total_amount_cents / 100,
      total_items: order.total_items,
      created_at: order.created_at,
      event: order.event,
      subject: order.subject,
    };

    switch (template) {
      case 'detailed':
        return {
          ...baseObject,
          priority_level: order.priority_level,
          delivery_method: order.delivery_method,
          tracking_number: order.tracking_number,
          estimated_delivery_date: order.estimated_delivery_date,
          actual_delivery_date: order.actual_delivery_date,
          admin_notes: order.admin_notes,
          payment_info: {
            mp_payment_id: order.mp_payment_id,
            mp_status: order.mp_status,
          },
          audit_info: {
            hours_since_created: order.hours_since_created,
            hours_since_status_change: order.hours_since_status_change,
            status_history: order.status_history,
            recent_audit_events: order.recent_audit_events,
          },
          items: order.items,
        };

      case 'financial':
        return {
          id: order.id,
          customer_name: order.contact_name,
          status: order.status,
          total_amount_cents: order.total_amount_cents,
          total_amount_ars: order.total_amount_cents / 100,
          created_at: order.created_at,
          payment_id: order.mp_payment_id,
          payment_status: order.mp_status,
          revenue_category: order.status === 'delivered' || order.status === 'approved' ? 'Revenue' : 'Pending',
        };

      case 'summary':
        return {
          id: order.id,
          customer_name: order.contact_name,
          status: order.status,
          total_amount_ars: order.total_amount_cents / 100,
          total_items: order.total_items,
          created_at: order.created_at,
        };

      default: // standard
        return baseObject;
    }
  }

  /**
   * Generate HTML report for PDF conversion
   */
  private generateHTMLReport(orders: OrderWithDetails[], options: ExportOptions): string {
    const title = `Orders Report - ${options.template.charAt(0).toUpperCase() + options.template.slice(1)}`;
    const generatedAt = new Date().toLocaleString();
    
    const ordersHTML = orders.map(order => `
      <tr>
        <td>${order.id.slice(-8)}</td>
        <td>${order.contact_name}</td>
        <td>${order.contact_email}</td>
        <td>${order.status}</td>
        <td>$${(order.total_amount_cents / 100).toFixed(2)}</td>
        <td>${order.total_items}</td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <p><strong>Generated:</strong> ${generatedAt}</p>
            <p><strong>Total Records:</strong> ${orders.length}</p>
            <p><strong>Template:</strong> ${options.template}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${ordersHTML}
            </tbody>
          </table>
          <div class="footer">
            <p>Generated by LookEscolar Admin Dashboard</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get timestamp for filename
   */
  private getTimestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  }

  /**
   * Generate labels for printing
   */
  async generateShippingLabels(orderIds: string[]): Promise<ExportResult> {
    const orders = await this.getOrdersByIds(orderIds);
    
    const options: ExportOptions = {
      format: 'pdf',
      template: 'labels',
      includeItems: false,
    };

    return this.exportOrders(options);
  }

  /**
   * Get orders by IDs
   */
  private async getOrdersByIds(orderIds: string[]): Promise<OrderWithDetails[]> {
    const { data: orders, error } = await this.supabase
      .from('order_details_with_audit')
      .select('*')
      .in('id', orderIds);

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders as OrderWithDetails[];
  }
}

export const orderExportService = new OrderExportService();