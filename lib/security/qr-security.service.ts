import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import 'server-only';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface QRSignature {
  signature: string;
  algorithm: string;
  keyId: string;
  timestamp: Date;
  expiresAt: Date;
}

interface QRAuditEvent {
  eventType: 'generate' | 'validate' | 'scan' | 'tamper_detected' | 'expired';
  qrCodeId: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  errorDetails?: string;
}

export class QRSecurityService {
  private readonly SIGNATURE_ALGORITHM = 'sha256';
  private readonly KEY_ROTATION_DAYS = 30;
  private auditLog: QRAuditEvent[] = [];

  /**
   * Generate digital signature for QR code
   */
  generateSignature(qrData: string, keyId?: string): QRSignature {
    const secretKey = this.getSigningKey(keyId);
    const timestamp = new Date();
    const expirationHours = 24; // QR codes expire in 24 hours

    const dataToSign = `${qrData}:${timestamp.toISOString()}`;
    const signature = crypto
      .createHmac(this.SIGNATURE_ALGORITHM, secretKey)
      .update(dataToSign)
      .digest('hex');

    return {
      signature,
      algorithm: this.SIGNATURE_ALGORITHM,
      keyId: keyId || 'default',
      timestamp,
      expiresAt: new Date(
        timestamp.getTime() + expirationHours * 60 * 60 * 1000
      ),
    };
  }

  /**
   * Verify QR code signature
   */
  verifySignature(
    qrData: string,
    signature: QRSignature
  ): {
    valid: boolean;
    reason?: string;
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    try {
      // Check expiration
      if (new Date() > signature.expiresAt) {
        return {
          valid: false,
          reason: 'Signature expired',
          securityLevel: 'medium',
        };
      }

      // Verify signature
      const expectedSignature = this.generateSignature(qrData, signature.keyId);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature.signature, 'hex'),
        Buffer.from(expectedSignature.signature, 'hex')
      );

      if (!isValid) {
        this.recordAuditEvent({
          eventType: 'tamper_detected',
          qrCodeId: qrData.substring(0, 20),
          ipAddress: 'unknown',
          timestamp: new Date(),
          securityLevel: 'critical',
          success: false,
          errorDetails: 'Invalid signature detected - possible tampering',
        });

        return {
          valid: false,
          reason: 'Invalid signature - possible tampering',
          securityLevel: 'critical',
        };
      }

      return {
        valid: true,
        securityLevel: 'high',
      };
    } catch (error) {
      logger.error('Signature verification failed', { error });
      return {
        valid: false,
        reason: 'Verification error',
        securityLevel: 'high',
      };
    }
  }

  /**
   * Record security audit event
   */
  async recordAuditEvent(event: QRAuditEvent): Promise<void> {
    try {
      // Store in database
      const { error } = await supabase.from('qr_audit_log').insert({
        event_type: event.eventType,
        qr_code_id: event.qrCodeId,
        user_id: event.userId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        timestamp: event.timestamp.toISOString(),
        metadata: event.metadata,
        security_level: event.securityLevel,
        success: event.success,
        error_details: event.errorDetails,
      });

      if (error) {
        logger.error('Failed to record audit event', { error: error.message });
        // Keep in memory as fallback
        this.auditLog.push(event);
      }

      // Alert on critical security events
      if (event.securityLevel === 'critical') {
        await this.handleCriticalSecurityEvent(event);
      }

      logger.info('QR security event recorded', {
        eventType: event.eventType,
        securityLevel: event.securityLevel,
        success: event.success,
      });
    } catch (error) {
      logger.error('Error recording audit event', { error });
      this.auditLog.push(event);
    }
  }

  /**
   * Get security audit trail
   */
  async getAuditTrail(
    qrCodeId?: string,
    timeRange?: { start: Date; end: Date },
    securityLevel?: string
  ): Promise<QRAuditEvent[]> {
    try {
      let query = supabase.from('qr_audit_log').select('*');

      if (qrCodeId) {
        query = query.eq('qr_code_id', qrCodeId);
      }

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      if (securityLevel) {
        query = query.eq('security_level', securityLevel);
      }

      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get audit trail: ${error.message}`);
      }

      return (data || []).map((event) => ({
        eventType: event.event_type,
        qrCodeId: event.qr_code_id,
        userId: event.user_id,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        timestamp: new Date(event.timestamp),
        metadata: event.metadata,
        securityLevel: event.security_level,
        success: event.success,
        errorDetails: event.error_details,
      }));
    } catch (error) {
      logger.error('Failed to get audit trail', { error });
      return [];
    }
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousActivity(eventId: string): Promise<{
    suspiciousIPs: string[];
    frequentFailures: Array<{ qrCodeId: string; failures: number }>;
    possibleBruteForce: boolean;
    recommendations: string[];
  }> {
    try {
      const recentEvents = await this.getAuditTrail(undefined, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      });

      const ipFailures: Record<string, number> = {};
      const qrFailures: Record<string, number> = {};

      recentEvents.forEach((event) => {
        if (!event.success) {
          ipFailures[event.ipAddress] = (ipFailures[event.ipAddress] || 0) + 1;
          qrFailures[event.qrCodeId] = (qrFailures[event.qrCodeId] || 0) + 1;
        }
      });

      const suspiciousIPs = Object.entries(ipFailures)
        .filter(([, failures]) => failures > 10) // More than 10 failures
        .map(([ip]) => ip);

      const frequentFailures = Object.entries(qrFailures)
        .filter(([, failures]) => failures > 5)
        .map(([qrCodeId, failures]) => ({ qrCodeId, failures }))
        .sort((a, b) => b.failures - a.failures);

      const possibleBruteForce =
        suspiciousIPs.length > 0 ||
        Object.values(ipFailures).some((failures) => failures > 20);

      const recommendations = [];
      if (possibleBruteForce) {
        recommendations.push('Consider implementing stricter rate limiting');
        recommendations.push(
          'Review and potentially block suspicious IP addresses'
        );
      }
      if (frequentFailures.length > 0) {
        recommendations.push(
          'Check QR codes with frequent validation failures'
        );
        recommendations.push('Consider regenerating problematic QR codes');
      }

      return {
        suspiciousIPs,
        frequentFailures,
        possibleBruteForce,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to detect suspicious activity', { eventId, error });
      return {
        suspiciousIPs: [],
        frequentFailures: [],
        possibleBruteForce: false,
        recommendations: [],
      };
    }
  }

  /**
   * Handle critical security events
   */
  private async handleCriticalSecurityEvent(
    event: QRAuditEvent
  ): Promise<void> {
    // Log critical event
    logger.error('CRITICAL QR SECURITY EVENT', {
      eventType: event.eventType,
      qrCodeId: event.qrCodeId,
      ipAddress: event.ipAddress,
      details: event.errorDetails,
    });

    // In production, could send alerts, disable QR codes, etc.
    // For now, just ensure it's properly logged
  }

  /**
   * Get signing key (in production, use proper key management)
   */
  private getSigningKey(keyId?: string): string {
    // In production, retrieve from secure key store
    const baseKey =
      process.env.QR_SIGNING_KEY || 'default-dev-key-not-for-production';
    return `${baseKey}-${keyId || 'default'}`;
  }

  /**
   * Generate device fingerprint for additional security
   */
  generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}:${Date.now()}`;
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Validate device fingerprint
   */
  validateDeviceFingerprint(
    fingerprint: string,
    userAgent: string,
    ipAddress: string
  ): boolean {
    // Simple validation - in production, use more sophisticated fingerprinting
    const expectedLength = 16;
    return (
      fingerprint.length === expectedLength && /^[a-f0-9]+$/i.test(fingerprint)
    );
  }
}

export const qrSecurityService = new QRSecurityService();
