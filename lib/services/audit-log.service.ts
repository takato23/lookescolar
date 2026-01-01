/**
 * Audit Logging Service
 * Comprehensive logging for security events and configuration changes
 *
 * Features:
 * - Immutable audit trail for compliance (SOC2, GDPR, PCI DSS)
 * - Structured logging with full context
 * - Automatic retention policy enforcement
 * - Sensitive data masking
 * - Query capabilities for security investigations
 *
 * @security CRITICAL - This service must NEVER be disabled
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';

// Audit event types
export type AuditEventType =
  | 'store_config_created'
  | 'store_config_updated'
  | 'store_config_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'template_changed'
  | 'payment_settings_updated'
  | 'smtp_settings_updated'
  | 'admin_login_success'
  | 'admin_login_failed'
  | 'rate_limit_exceeded'
  | 'unauthorized_access_attempt'
  | 'suspicious_activity_detected'
  | 'file_upload'
  | 'file_deleted'
  | 'tenant_isolation_violation';

// Audit event severity levels
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  request_id: string;
  changes?: AuditChanges;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Change tracking for before/after comparison
export interface AuditChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
  fields_changed?: string[];
}

// Audit query filters
export interface AuditQueryFilters {
  tenant_id?: string;
  event_type?: AuditEventType | AuditEventType[];
  severity?: AuditSeverity | AuditSeverity[];
  user_id?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Log Service
 */
export class AuditLogService {
  /**
   * Log an audit event
   * @security CRITICAL - Must be called for all security-relevant events
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = await createServiceClient();

      // Mask sensitive data before logging
      const sanitizedEntry = this.sanitizeEntry(entry);

      // Insert into audit_logs table
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          tenant_id: sanitizedEntry.tenant_id,
          event_type: sanitizedEntry.event_type,
          severity: sanitizedEntry.severity,
          user_id: sanitizedEntry.user_id || null,
          user_email: sanitizedEntry.user_email || null,
          user_role: sanitizedEntry.user_role || null,
          ip_address: this.maskIP(sanitizedEntry.ip_address),
          user_agent: this.maskUserAgent(sanitizedEntry.user_agent),
          endpoint: sanitizedEntry.endpoint,
          method: sanitizedEntry.method,
          request_id: sanitizedEntry.request_id,
          changes: sanitizedEntry.changes || null,
          metadata: sanitizedEntry.metadata || null,
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Failed to write audit log', {
          error: error.message,
          event_type: sanitizedEntry.event_type,
          request_id: sanitizedEntry.request_id,
        });
      }

      // Also log to application logger for redundancy
      logger.info('Audit event logged', {
        event_type: sanitizedEntry.event_type,
        severity: sanitizedEntry.severity,
        user_id: sanitizedEntry.user_id,
        request_id: sanitizedEntry.request_id,
      });
    } catch (error) {
      // CRITICAL: Never throw errors from audit logging - could break application
      logger.error('Audit logging error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry: entry.event_type,
      });
    }
  }

  /**
   * Log store configuration change
   */
  static async logStoreConfigChange(
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    requestId: string,
    before: Record<string, any> | null,
    after: Record<string, any>,
    eventType: 'store_config_created' | 'store_config_updated' | 'store_config_deleted' = 'store_config_updated'
  ): Promise<void> {
    const fieldsChanged = before
      ? Object.keys(after).filter(
          (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
        )
      : Object.keys(after);

    await this.log({
      tenant_id: tenantId,
      event_type: eventType,
      severity: 'info',
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint,
      method,
      request_id: requestId,
      changes: {
        before: before || undefined,
        after,
        fields_changed: fieldsChanged,
      },
      metadata: {
        change_count: fieldsChanged.length,
        critical_fields: this.identifyCriticalFields(fieldsChanged),
      },
    });
  }

  /**
   * Log unauthorized access attempt
   */
  static async logUnauthorizedAccess(
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    requestId: string,
    reason: string,
    attemptedUserId?: string
  ): Promise<void> {
    await this.log({
      tenant_id: tenantId,
      event_type: 'unauthorized_access_attempt',
      severity: 'warning',
      user_id: attemptedUserId,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint,
      method,
      request_id: requestId,
      metadata: {
        reason,
        alert: true,
      },
    });
  }

  /**
   * Log rate limit exceeded
   */
  static async logRateLimitExceeded(
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    requestId: string,
    limit: number,
    userId?: string
  ): Promise<void> {
    await this.log({
      tenant_id: tenantId,
      event_type: 'rate_limit_exceeded',
      severity: 'warning',
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint,
      method,
      request_id: requestId,
      metadata: {
        limit,
        alert: true,
      },
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspiciousActivity(
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    requestId: string,
    description: string,
    indicators: string[],
    userId?: string
  ): Promise<void> {
    await this.log({
      tenant_id: tenantId,
      event_type: 'suspicious_activity_detected',
      severity: 'critical',
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint,
      method,
      request_id: requestId,
      metadata: {
        description,
        indicators,
        alert: true,
        requires_investigation: true,
      },
    });
  }

  /**
   * Query audit logs with filters
   */
  static async query(
    filters: AuditQueryFilters
  ): Promise<AuditLogEntry[]> {
    try {
      const supabase = await createServiceClient();
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.tenant_id) {
        query = query.eq('tenant_id', filters.tenant_id);
      }

      if (filters.event_type) {
        if (Array.isArray(filters.event_type)) {
          query = query.in('event_type', filters.event_type);
        } else {
          query = query.eq('event_type', filters.event_type);
        }
      }

      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in('severity', filters.severity);
        } else {
          query = query.eq('severity', filters.severity);
        }
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 100) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to query audit logs', { error: error.message });
        return [];
      }

      return (data || []) as AuditLogEntry[];
    } catch (error) {
      logger.error('Audit query error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditTrail(
    tenantId: string,
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.query({
      tenant_id: tenantId,
      user_id: userId,
      limit,
    });
  }

  /**
   * Get recent security events
   */
  static async getRecentSecurityEvents(
    tenantId: string,
    hours: number = 24,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.query({
      tenant_id: tenantId,
      severity: ['warning', 'error', 'critical'],
      start_date: startDate,
      limit,
    });
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param retentionDays Number of days to retain logs (default: 90)
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const supabase = await createServiceClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        logger.error('Failed to cleanup audit logs', { error: error.message });
        return 0;
      }

      const deletedCount = data?.length || 0;
      logger.info('Audit logs cleaned up', {
        deleted_count: deletedCount,
        retention_days: retentionDays,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Audit cleanup error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Sanitize audit entry to remove sensitive data
   */
  private static sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };

    // Mask sensitive fields in changes
    if (sanitized.changes) {
      sanitized.changes = {
        ...sanitized.changes,
        before: this.maskSensitiveFields(sanitized.changes.before),
        after: this.maskSensitiveFields(sanitized.changes.after),
      };
    }

    // Mask sensitive metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.maskSensitiveFields(sanitized.metadata);
    }

    return sanitized;
  }

  /**
   * Mask sensitive fields in data objects
   */
  private static maskSensitiveFields(
    data?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!data) return undefined;

    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'api_key',
      'private_key',
      'smtp_password',
      'webhook_secret',
      'mp_access_token',
      'credit_card',
      'ssn',
    ];

    const masked = { ...data };

    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        masked[key] = '***REDACTED***';
      }
    }

    return masked;
  }

  /**
   * Identify critical configuration fields
   */
  private static identifyCriticalFields(fields: string[]): string[] {
    const criticalFields = [
      'enabled',
      'payment_methods',
      'smtp',
      'template',
      'currency',
      'products',
    ];

    return fields.filter((field) =>
      criticalFields.some((critical) => field.includes(critical))
    );
  }

  /**
   * Mask IP address for privacy (GDPR compliance)
   */
  private static maskIP(ip: string): string {
    if (!ip || ip === 'unknown') return 'unknown';

    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}:***:***`;
    } else {
      // IPv4
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.**`;
      }
      return '***.***.***.**';
    }
  }

  /**
   * Mask user agent for privacy
   */
  private static maskUserAgent(ua: string): string {
    if (!ua || ua.length <= 20) {
      return ua.substring(0, 10) + '***';
    }
    return ua.substring(0, 20) + '***' + ua.substring(ua.length - 5);
  }
}

/**
 * Database migration for audit_logs table
 *
 * Run this SQL to create the audit logs table:
 *
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL,
 *   event_type TEXT NOT NULL,
 *   severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
 *   user_id UUID,
 *   user_email TEXT,
 *   user_role TEXT,
 *   ip_address TEXT NOT NULL,
 *   user_agent TEXT NOT NULL,
 *   endpoint TEXT NOT NULL,
 *   method TEXT NOT NULL,
 *   request_id TEXT NOT NULL,
 *   changes JSONB,
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Indexes for fast querying
 * CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
 * CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
 * CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
 * CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
 * CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
 * CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
 *
 * -- Row Level Security
 * ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Tenants can only view their own audit logs"
 *   ON audit_logs FOR SELECT
 *   USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
 *
 * -- Admins can view all logs (service role)
 * CREATE POLICY "Service role can view all audit logs"
 *   ON audit_logs FOR SELECT
 *   USING (true);
 *
 * -- Only service role can insert (application level)
 * CREATE POLICY "Service role can insert audit logs"
 *   ON audit_logs FOR INSERT
 *   WITH CHECK (true);
 *
 * -- Prevent updates and deletes (immutable audit trail)
 * CREATE POLICY "Audit logs are immutable"
 *   ON audit_logs FOR UPDATE
 *   USING (false);
 *
 * CREATE POLICY "Audit logs cannot be deleted"
 *   ON audit_logs FOR DELETE
 *   USING (false);
 */
