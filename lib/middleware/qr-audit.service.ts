/**
 * QR Audit Service
 * Provides audit logging functionality for QR-related operations
 */

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  result: 'success' | 'failed' | 'blocked';
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  user_id?: string;
  ip_address?: string;
}

class QRAuditService {
  private events: AuditEvent[] = [];

  logEvent(
    action: string,
    result: 'success' | 'failed' | 'blocked',
    details: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      result,
      details,
      severity,
      type: 'qr_operation',
      user_id: details.user_id,
      ip_address: details.ip_address,
    };

    this.events.push(event);

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    console.log(`[QR Audit] ${action}: ${result}`, {
      id: event.id,
      severity,
      details: this.sanitizeDetails(details),
    });
  }

  getEvents(limit: number = 100): AuditEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getEventsByType(type: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter((event) => event.type === type)
      .slice(-limit)
      .reverse();
  }

  getEventsBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical',
    limit: number = 100
  ): AuditEvent[] {
    return this.events
      .filter((event) => event.severity === severity)
      .slice(-limit)
      .reverse();
  }

  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: AuditEvent[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.events.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: this.events.slice(-10).reverse(),
    };
  }

  clearOldEvents(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.events.length;

    this.events = this.events.filter(
      (event) => new Date(event.timestamp) > cutoffTime
    );

    const removed = initialLength - this.events.length;
    if (removed > 0) {
      console.log(`[QR Audit] Cleaned up ${removed} old audit events`);
    }

    return removed;
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };

    // Remove sensitive information
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    // Truncate long strings
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + '...';
      }
    });

    return sanitized;
  }
}

export const qrAuditService = new QRAuditService();
export default qrAuditService;
