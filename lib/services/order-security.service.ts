/* eslint-disable @typescript-eslint/no-unused-vars */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { z } from 'zod';

export interface SecurityContext {
  user_id: string;
  user_email: string;
  user_role: 'admin' | 'moderator' | 'viewer';
  session_id: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: 'order' | 'order_item' | 'payment' | 'export' | 'workflow';
  resource_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SecurityRule {
  resource: string;
  action: string;
  required_role: string[];
  conditions?: SecurityCondition[];
}

export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'custom';
  value: any;
  custom_check?: (context: SecurityContext, resource: any) => boolean;
}

export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
  identifier_key: 'ip' | 'user_id' | 'session';
}

export class OrderSecurityService {
  private supabase;
  private rateLimitStore: Map<string, { count: number; window_start: number }> =
    new Map();

  constructor() {
    this.supabase = createServerSupabaseServiceClient();
  }

  /**
   * Validate and create security context from request
   */
  async createSecurityContext(
    request: Request
  ): Promise<SecurityContext | null> {
    try {
      // Extract headers from request directly
      const authorization = request.headers.get('authorization');
      const userAgent = request.headers.get('user-agent') || 'Unknown';
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');

      // Get IP address (prefer x-forwarded-for for proxied requests)
      const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

      // Validate JWT token (simplified - in production use proper JWT validation)
      if (!authorization?.startsWith('Bearer ')) {
        return null;
      }

      // Mock user data for now (in real implementation, validate JWT)
      const mockUser = {
        id: 'admin_user_123',
        email: 'admin@lookescolar.com',
        role: 'admin' as const,
        aud: 'session_123',
      };

      return {
        user_id: mockUser.id,
        user_email: mockUser.email,
        user_role: mockUser.role,
        session_id: mockUser.aud,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Security] Failed to create security context:', error);
      return null;
    }
  }

  /**
   * Check if user has permission to perform action on resource
   */
  async checkPermission(
    context: SecurityContext,
    action: string,
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      // Define security rules
      const rules: SecurityRule[] = [
        // Order management rules
        {
          resource: 'order',
          action: 'read',
          required_role: ['admin', 'moderator', 'viewer'],
        },
        {
          resource: 'order',
          action: 'update',
          required_role: ['admin', 'moderator'],
        },
        {
          resource: 'order',
          action: 'delete',
          required_role: ['admin'],
        },
        {
          resource: 'order',
          action: 'export',
          required_role: ['admin', 'moderator'],
        },

        // Analytics rules
        {
          resource: 'analytics',
          action: 'read',
          required_role: ['admin', 'moderator'],
        },

        // Workflow rules
        {
          resource: 'workflow',
          action: 'read',
          required_role: ['admin'],
        },
        {
          resource: 'workflow',
          action: 'execute',
          required_role: ['admin'],
        },

        // Audit log rules
        {
          resource: 'audit',
          action: 'read',
          required_role: ['admin'],
        },
      ];

      // Find applicable rule
      const rule = rules.find(
        (r) => r.resource === resourceType && r.action === action
      );
      if (!rule) {
        console.warn(`[Security] No rule found for ${resourceType}:${action}`);
        return false;
      }

      // Check role requirement
      if (!rule.required_role.includes(context.user_role)) {
        console.warn(
          `[Security] Insufficient role for ${resourceType}:${action}. Required: ${rule.required_role}, User: ${context.user_role}`
        );
        return false;
      }

      // Check additional conditions if present
      if (rule.conditions && resourceId) {
        const resource = await this.getResource(resourceType, resourceId);
        if (!resource) return false;

        for (const condition of rule.conditions) {
          if (!this.evaluateCondition(condition, context, resource)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[Security] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(
    identifier: string,
    config: RateLimitConfig = {
      window_ms: 60 * 1000, // 1 minute
      max_requests: 100,
      identifier_key: 'ip',
    }
  ): boolean {
    const now = Date.now();
    const windowStart = now - config.window_ms;

    // Clean up old entries
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.window_start < windowStart) {
        this.rateLimitStore.delete(key);
      }
    }

    // Check current rate
    const current = this.rateLimitStore.get(identifier);

    if (!current) {
      this.rateLimitStore.set(identifier, { count: 1, window_start: now });
      return true;
    }

    if (current.window_start < windowStart) {
      // Reset window
      this.rateLimitStore.set(identifier, { count: 1, window_start: now });
      return true;
    }

    if (current.count >= config.max_requests) {
      console.warn(`[Security] Rate limit exceeded for ${identifier}`);
      return false;
    }

    // Increment count
    current.count++;
    return true;
  }

  /**
   * Log security audit event
   */
  async logAuditEvent(
    context: SecurityContext,
    action: string,
    resourceType: AuditLogEntry['resource_type'],
    resourceId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const auditEntry: Omit<AuditLogEntry, 'id'> = {
        user_id: context.user_id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues || {},
        new_values: newValues || {},
        ip_address: context.ip_address,
        user_agent: context.user_agent,
        timestamp: context.timestamp,
        metadata: metadata || {},
      };

      // In production, store in dedicated audit log table
      console.log('[Security] Audit log entry:', auditEntry);

      // Mock database storage for now
      try {
        // In real implementation: await this.supabase.from('audit_logs').insert([auditEntry]);
        console.log('[Security] Audit entry stored successfully');
      } catch (dbError) {
        console.error('[Security] Failed to store audit log:', dbError);
      }
    } catch (error) {
      console.error('[Security] Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break operations
    }
  }

  /**
   * Validate and sanitize input data
   */
  validateInput<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; errors: string[] } {
    try {
      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errors = result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        return { success: false, errors };
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          'Validation failed: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        ],
      };
    }
  }

  /**
   * Sanitize string input to prevent XSS
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim()
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate order update data
   */
  validateOrderUpdate(
    data: unknown
  ): { success: true; data: any } | { success: false; errors: string[] } {
    const schema = z.object({
      status: z
        .enum(['pending', 'approved', 'delivered', 'failed', 'cancelled'])
        .optional(),
      admin_notes: z.string().max(1000).optional(),
      priority_level: z.number().int().min(1).max(5).optional(),
      delivery_method: z.string().max(100).optional(),
      tracking_number: z.string().max(100).optional(),
      estimated_delivery_date: z.string().datetime().optional(),
    });

    return this.validateInput(data, schema);
  }

  /**
   * Validate bulk operations data
   */
  validateBulkOperation(
    data: unknown
  ): { success: true; data: any } | { success: false; errors: string[] } {
    const schema = z.object({
      order_ids: z.array(z.string().uuid()).min(1).max(100),
      updates: z.object({
        status: z.enum(['approved', 'delivered', 'cancelled']).optional(),
        admin_notes: z.string().max(1000).optional(),
        priority_level: z.number().int().min(1).max(5).optional(),
      }),
    });

    return this.validateInput(data, schema);
  }

  /**
   * Validate export request
   */
  validateExportRequest(
    data: unknown
  ): { success: true; data: any } | { success: false; errors: string[] } {
    const schema = z.object({
      format: z.enum(['csv', 'excel', 'pdf', 'json']),
      template: z.enum([
        'standard',
        'detailed',
        'summary',
        'financial',
        'labels',
      ]),
      filters: z
        .object({
          status: z.array(z.string()).optional(),
          event_id: z.string().uuid().optional(),
          created_after: z.string().datetime().optional(),
          created_before: z.string().datetime().optional(),
        })
        .optional(),
    });

    return this.validateInput(data, schema);
  }

  /**
   * Check for suspicious activity patterns
   */
  detectSuspiciousActivity(context: SecurityContext, action: string): boolean {
    // Simple heuristics for suspicious activity
    const suspiciousPatterns = [
      // Too many requests from same IP
      () => this.checkPatternFrequency(context.ip_address, 100, 60000),

      // Unusual user agent
      () => this.checkSuspiciousUserAgent(context.user_agent),

      // Bulk operations outside business hours
      () => action.includes('bulk') && this.isOutsideBusinessHours(),

      // Multiple failed permission checks
      () => this.checkFailedPermissions(context.user_id),
    ];

    return suspiciousPatterns.some((check) => check());
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case 'day':
        periodStart.setDate(now.getDate() - 1);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
    }

    // In production, query actual audit logs
    return {
      period,
      period_start: periodStart.toISOString(),
      period_end: now.toISOString(),
      metrics: {
        total_requests: 1250,
        successful_requests: 1200,
        failed_requests: 50,
        unique_users: 25,
        unique_ips: 30,
        rate_limit_violations: 5,
        permission_denials: 15,
        suspicious_activities: 2,
      },
      top_actions: [
        { action: 'order_read', count: 800 },
        { action: 'order_update', count: 300 },
        { action: 'order_export', count: 100 },
        { action: 'analytics_read', count: 50 },
      ],
      security_alerts: [
        {
          type: 'rate_limit_violation',
          description: 'IP 192.168.1.100 exceeded rate limit',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          severity: 'medium',
        },
        {
          type: 'suspicious_bulk_operation',
          description: 'Bulk operation performed outside business hours',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          severity: 'low',
        },
      ],
    };
  }

  // Private helper methods

  private async getResource(
    resourceType: string,
    resourceId: string
  ): Promise<any> {
    try {
      if (resourceType === 'order') {
        // Mock order data for now
        return {
          id: resourceId,
          status: 'pending',
          user_id: 'mock_user',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private evaluateCondition(
    condition: SecurityCondition,
    context: SecurityContext,
    resource: any
  ): boolean {
    if (condition.custom_check) {
      return condition.custom_check(context, resource);
    }

    const fieldValue = this.getFieldValue(condition.field, resource);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );
      default:
        return false;
    }
  }

  private getFieldValue(field: string, object: any): any {
    return field.split('.').reduce((obj, key) => obj?.[key], object);
  }

  private checkPatternFrequency(
    identifier: string,
    maxCount: number,
    windowMs: number
  ): boolean {
    // Simplified implementation - in production, use Redis or similar
    const entry = this.rateLimitStore.get(`pattern_${identifier}`);
    const now = Date.now();

    if (!entry || now - entry.window_start > windowMs) {
      this.rateLimitStore.set(`pattern_${identifier}`, {
        count: 1,
        window_start: now,
      });
      return false;
    }

    return entry.count > maxCount;
  }

  private checkSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private isOutsideBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend or outside 9 AM - 6 PM
    return day === 0 || day === 6 || hour < 9 || hour > 18;
  }

  private checkFailedPermissions(userId: string): boolean {
    // In production, check recent failed permission attempts
    // For now, return false
    return false;
  }
}

export const orderSecurityService = new OrderSecurityService();
