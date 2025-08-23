/**
 * Comprehensive Security Audit Logging Service
 * 
 * Provides structured logging for security events, QR code usage,
 * authentication attempts, and system access patterns.
 */

import { createHash } from 'crypto';

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    ip?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id?: string;
    path?: string;
  };
  action: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'blocked' | 'warning';
  metadata?: {
    sessionId?: string;
    requestId?: string;
    geolocation?: string;
    deviceFingerprint?: string;
  };
}

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'qr_access'
  | 'qr_generation'
  | 'qr_verification'
  | 'data_access'
  | 'file_access'
  | 'admin_action'
  | 'rate_limit'
  | 'security_violation'
  | 'system_event';

export type SecurityEventCategory = 
  | 'access_control'
  | 'qr_security'
  | 'data_protection'
  | 'system_security'
  | 'compliance'
  | 'performance';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  type?: SecurityEventType;
  category?: SecurityEventCategory;
  severity?: SecurityEventSeverity;
  userId?: string;
  result?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentActivity: SecurityEvent[];
  topUsers: Array<{ userId: string; eventCount: number }>;
  timeRange: { start: Date; end: Date };
}

export class SecurityAuditService {
  private logs: SecurityEvent[] = [];
  private readonly maxInMemoryLogs = 10000;
  private readonly logRetentionDays = 90;

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: Date.now()
      };

      // Add to in-memory storage (for demo purposes)
      this.logs.push(securityEvent);

      // Trim logs if exceeding max size
      if (this.logs.length > this.maxInMemoryLogs) {
        this.logs = this.logs.slice(-this.maxInMemoryLogs);
      }

      // Log to console in structured format
      this.logToConsole(securityEvent);

      // In production, this would write to:
      // - Database (Supabase)
      // - External logging service (Datadog, LogRocket, etc.)
      // - SIEM system
      await this.persistToDatabase(securityEvent);

    } catch (error) {
      console.error('[Audit] Failed to log security event:', error);
    }
  }

  /**
   * Log QR code access attempt
   */
  async logQRAccess(params: {
    qrToken: string;
    studentId?: string;
    eventId?: string;
    ip?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'blocked';
    error?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'qr_access',
      category: 'qr_security',
      severity: params.result === 'success' ? 'low' : 'medium',
      action: 'qr_token_access',
      user: {
        ip: params.ip,
        userAgent: params.userAgent
      },
      resource: {
        type: 'qr_token',
        id: this.hashSensitiveData(params.qrToken)
      },
      details: {
        studentId: params.studentId,
        eventId: params.eventId,
        error: params.error,
        ...params.metadata
      },
      result: params.result
    });
  }

  /**
   * Log QR code generation
   */
  async logQRGeneration(params: {
    userId: string;
    studentId: string;
    eventId: string;
    qrType: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'qr_generation',
      category: 'qr_security',
      severity: 'low',
      action: 'qr_code_generated',
      user: {
        id: params.userId
      },
      resource: {
        type: 'qr_code',
        id: `${params.eventId}-${params.studentId}`
      },
      details: {
        studentId: params.studentId,
        eventId: params.eventId,
        qrType: params.qrType,
        ...params.metadata
      },
      result: 'success'
    });
  }

  /**
   * Log authentication attempt
   */
  async logAuthenticationAttempt(params: {
    email: string;
    ip?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'blocked';
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'authentication',
      category: 'access_control',
      severity: params.result === 'failure' ? 'medium' : 'low',
      action: 'login_attempt',
      user: {
        email: params.email,
        ip: params.ip,
        userAgent: params.userAgent
      },
      details: {
        reason: params.reason,
        ...params.metadata
      },
      result: params.result
    });
  }

  /**
   * Log rate limiting event
   */
  async logRateLimitEvent(params: {
    ip: string;
    endpoint: string;
    limit: number;
    current: number;
    windowMs: number;
    userAgent?: string;
    userId?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'rate_limit',
      category: 'system_security',
      severity: 'medium',
      action: 'rate_limit_exceeded',
      user: {
        id: params.userId,
        ip: params.ip,
        userAgent: params.userAgent
      },
      resource: {
        type: 'api_endpoint',
        path: params.endpoint
      },
      details: {
        limit: params.limit,
        current: params.current,
        windowMs: params.windowMs
      },
      result: 'blocked'
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'admin_action',
      category: 'access_control',
      severity: 'medium',
      action: params.action,
      user: {
        id: params.userId,
        ip: params.ip,
        userAgent: params.userAgent
      },
      resource: {
        type: params.resourceType,
        id: params.resourceId
      },
      details: params.details || {},
      result: 'success'
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<SecurityEvent[]> {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!.getTime());
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!.getTime());
    }

    if (query.type) {
      filteredLogs = filteredLogs.filter(log => log.type === query.type);
    }

    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category);
    }

    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.user?.id === query.userId);
    }

    if (query.result) {
      filteredLogs = filteredLogs.filter(log => log.result === query.result);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(days: number = 7): Promise<AuditLogStats> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoffTime);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const userEventCounts: Record<string, number> = {};

    recentLogs.forEach(log => {
      // Count by type
      eventsByType[log.type] = (eventsByType[log.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;

      // Count by user
      if (log.user?.id) {
        userEventCounts[log.user.id] = (userEventCounts[log.user.id] || 0) + 1;
      }
    });

    const topUsers = Object.entries(userEventCounts)
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: recentLogs.length,
      eventsByType,
      eventsBySeverity,
      recentActivity: recentLogs.slice(0, 20),
      topUsers,
      timeRange: {
        start: new Date(cutoffTime),
        end: new Date()
      }
    };
  }

  /**
   * Get recent security alerts
   */
  async getSecurityAlerts(hours: number = 24): Promise<SecurityEvent[]> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return this.logs.filter(log => 
      log.timestamp >= cutoffTime && 
      (log.severity === 'high' || log.severity === 'critical' || log.result === 'blocked')
    ).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(): Promise<number> {
    const cutoffTime = Date.now() - (this.logRetentionDays * 24 * 60 * 60 * 1000);
    const originalLength = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    const cleaned = originalLength - this.logs.length;
    
    if (cleaned > 0) {
      console.log(`[Audit] Cleaned up ${cleaned} old audit logs`);
    }
    
    return cleaned;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Hash sensitive data for logging
   */
  private hashSensitiveData(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Log to console in structured format
   */
  private logToConsole(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    const logMessage = {
      '@timestamp': new Date(event.timestamp).toISOString(),
      level: logLevel,
      component: 'security-audit',
      event_id: event.id,
      event_type: event.type,
      category: event.category,
      severity: event.severity,
      action: event.action,
      result: event.result,
      user: event.user,
      resource: event.resource,
      details: event.details,
      metadata: event.metadata
    };

    switch (logLevel) {
      case 'error':
        console.error('[SECURITY]', JSON.stringify(logMessage));
        break;
      case 'warn':
        console.warn('[SECURITY]', JSON.stringify(logMessage));
        break;
      default:
        console.log('[SECURITY]', JSON.stringify(logMessage));
    }
  }

  /**
   * Get appropriate log level based on severity
   */
  private getLogLevel(severity: SecurityEventSeverity): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Persist to database (placeholder for actual implementation)
   */
  private async persistToDatabase(event: SecurityEvent): Promise<void> {
    // TODO: Implement actual database persistence
    // This would write to a dedicated audit_logs table in Supabase
    // with proper retention policies and indexing
    
    // For now, we'll just log that we would persist
    if (process.env.NODE_ENV === 'development') {
      // Only log in development to avoid noise
      console.debug(`[Audit] Would persist event ${event.id} to database`);
    }
  }
}

// Singleton instance
export const securityAuditService = new SecurityAuditService();