/**
 * QR Code Digital Signatures Security Service
 * 
 * Implements digital signatures for QR codes to prevent tampering
 * and ensure authenticity of QR code data.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface QRSignaturePayload {
  data: string;
  timestamp: number;
  nonce: string;
  version: string;
}

export interface SignedQRData {
  payload: QRSignaturePayload;
  signature: string;
  hash: string;
}

export interface QRVerificationResult {
  valid: boolean;
  payload?: QRSignaturePayload;
  error?: string;
  timestamp?: number;
}

export class QRSignatureService {
  private readonly secret: string;
  private readonly algorithm = 'HS256';
  private readonly version = '1.0';
  private readonly maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.secret = process.env.QR_SIGNATURE_SECRET || process.env.SESSION_SECRET || 'fallback-dev-secret';
    
    if (!this.secret || this.secret === 'fallback-dev-secret') {
      console.warn('[Security] QR_SIGNATURE_SECRET not properly configured');
    }
  }

  /**
   * Create a digital signature for QR code data
   */
  async signQRData(data: string): Promise<SignedQRData> {
    try {
      const timestamp = Date.now();
      const nonce = randomBytes(16).toString('hex');
      
      const payload: QRSignaturePayload = {
        data,
        timestamp,
        nonce,
        version: this.version
      };

      // Create JWT signature
      const secret = new TextEncoder().encode(this.secret);
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: this.algorithm })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      // Create additional hash for integrity
      const hash = createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');

      return {
        payload,
        signature: jwt,
        hash
      };
    } catch (error) {
      console.error('[Security] Failed to sign QR data:', error);
      throw new Error('QR signature generation failed');
    }
  }

  /**
   * Verify QR code digital signature
   */
  async verifyQRSignature(signedData: SignedQRData): Promise<QRVerificationResult> {
    try {
      const { payload, signature, hash } = signedData;

      // Verify hash integrity
      const expectedHash = createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== expectedHash) {
        return {
          valid: false,
          error: 'Hash verification failed - data integrity compromised'
        };
      }

      // Verify JWT signature
      const secret = new TextEncoder().encode(this.secret);
      const { payload: jwtPayload } = await jwtVerify(signature, secret);

      // Verify payload matches
      if (JSON.stringify(jwtPayload) !== JSON.stringify(payload)) {
        return {
          valid: false,
          error: 'Payload mismatch between signature and data'
        };
      }

      // Check timestamp validity
      const now = Date.now();
      const age = now - payload.timestamp;

      if (age > this.maxAge) {
        return {
          valid: false,
          error: 'QR code signature has expired'
        };
      }

      if (payload.timestamp > now + 60000) { // Allow 1 minute clock skew
        return {
          valid: false,
          error: 'QR code timestamp is in the future'
        };
      }

      // Verify version compatibility
      if (payload.version !== this.version) {
        return {
          valid: false,
          error: `Unsupported QR signature version: ${payload.version}`
        };
      }

      return {
        valid: true,
        payload,
        timestamp: now
      };
    } catch (error) {
      console.error('[Security] QR signature verification failed:', error);
      return {
        valid: false,
        error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create HMAC for additional security layer
   */
  createHMAC(data: string, salt?: string): string {
    const hmacSalt = salt || randomBytes(16).toString('hex');
    return createHmac('sha256', this.secret)
      .update(data + hmacSalt)
      .digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, hmac: string, salt: string): boolean {
    const expectedHmac = createHmac('sha256', this.secret)
      .update(data + salt)
      .digest('hex');
    
    return hmac === expectedHmac;
  }

  /**
   * Generate secure token with signature
   */
  async generateSecureToken(payload: Record<string, any>): Promise<string> {
    const tokenData = JSON.stringify(payload);
    const signed = await this.signQRData(tokenData);
    
    // Encode the signed data as base64 for URL safety
    return Buffer.from(JSON.stringify(signed)).toString('base64url');
  }

  /**
   * Verify and decode secure token
   */
  async verifySecureToken(token: string): Promise<QRVerificationResult> {
    try {
      // Decode from base64
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const signedData: SignedQRData = JSON.parse(decoded);
      
      return await this.verifyQRSignature(signedData);
    } catch (error) {
      return {
        valid: false,
        error: `Token decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if signature service is properly configured
   */
  isConfigured(): boolean {
    return this.secret !== 'fallback-dev-secret' && this.secret.length >= 32;
  }

  /**
   * Get signature service status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      version: this.version,
      algorithm: this.algorithm,
      maxAge: this.maxAge
    };
  }
}

// Singleton instance
export const qrSignatureService = new QRSignatureService();