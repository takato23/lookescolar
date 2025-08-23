import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { qrService, QRGenerationOptions, StudentQRData } from './qr.service';
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

interface QRAnalytics {
  qrCodeId: string;
  eventId: string;
  totalScans: number;
  uniqueScans: number;
  lastScanAt: Date | null;
  avgScanInterval: number; // minutes
  deviceTypes: Record<string, number>;
  scanLocations: Array<{
    ip: string;
    location?: string;
    timestamp: Date;
  }>;
}

interface QRCacheEntry {
  qrCode: string;
  dataUrl: string;
  format: 'png' | 'svg' | 'pdf';
  size: number;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
}

interface EnhancedQROptions extends QRGenerationOptions {
  format?: 'png' | 'svg' | 'pdf';
  enableAnalytics?: boolean;
  cacheDuration?: number; // hours
  signature?: boolean;
}

export class QREnhancedService {
  private cache: Map<string, QRCacheEntry> = new Map();
  private analytics: Map<string, QRAnalytics> = new Map();
  
  /**
   * Generate QR with enhanced features
   */
  async generateEnhancedQR(
    subjectId: string,
    subjectName: string,
    options: EnhancedQROptions = {}
  ): Promise<{
    dataUrl: string;
    format: string;
    analytics: QRAnalytics;
    cacheKey: string;
  }> {
    const cacheKey = this.generateCacheKey(subjectId, options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      cached.accessCount++;
      return {
        dataUrl: cached.dataUrl,
        format: cached.format,
        analytics: this.getAnalytics(subjectId),
        cacheKey,
      };
    }

    // Generate new QR
    const result = await qrService.generateQRForSubject(subjectId, subjectName, options);
    
    // Store in cache
    const cacheEntry: QRCacheEntry = {
      qrCode: result.dataUrl,
      dataUrl: result.dataUrl,
      format: options.format || 'png',
      size: options.size || 200,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (options.cacheDuration || 24) * 60 * 60 * 1000),
      accessCount: 1,
    };
    
    this.cache.set(cacheKey, cacheEntry);
    
    // Initialize analytics
    if (options.enableAnalytics !== false) {
      this.initializeAnalytics(subjectId, result.token);
    }

    return {
      dataUrl: result.dataUrl, 
      format: options.format || 'png',
      analytics: this.getAnalytics(subjectId),
      cacheKey,
    };
  }

  /**
   * Get QR analytics
   */
  getAnalytics(qrCodeId: string): QRAnalytics {
    return this.analytics.get(qrCodeId) || {
      qrCodeId,
      eventId: '',
      totalScans: 0,
      uniqueScans: 0,
      lastScanAt: null,
      avgScanInterval: 0,
      deviceTypes: {},
      scanLocations: [],
    };
  }

  /**
   * Track QR scan
   */
  trackScan(qrCodeId: string, deviceInfo: { type: string; ip: string; location?: string }) {
    const analytics = this.getAnalytics(qrCodeId);
    analytics.totalScans++;
    analytics.lastScanAt = new Date();
    
    // Track device types
    analytics.deviceTypes[deviceInfo.type] = (analytics.deviceTypes[deviceInfo.type] || 0) + 1;
    
    // Track locations
    analytics.scanLocations.push({
      ip: deviceInfo.ip,
      location: deviceInfo.location,
      timestamp: new Date(),
    });

    this.analytics.set(qrCodeId, analytics);
  }

  private generateCacheKey(subjectId: string, options: EnhancedQROptions): string {
    const optionsStr = JSON.stringify(options);
    return `qr_${subjectId}_${Buffer.from(optionsStr).toString('base64')}`;
  }

  private getFromCache(key: string): QRCacheEntry | null {
    return this.cache.get(key) || null;
  }

  private isCacheExpired(entry: QRCacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  private initializeAnalytics(subjectId: string, token: string) {
    if (!this.analytics.has(subjectId)) {
      this.analytics.set(subjectId, {
        qrCodeId: subjectId,
        eventId: '',
        totalScans: 0,
        uniqueScans: 0,
        lastScanAt: null,
        avgScanInterval: 0,
        deviceTypes: {},
        scanLocations: [],
      });
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isCacheExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      hitRate: 0, // Would track in production
      avgAccessCount: Array.from(this.cache.values())
        .reduce((sum, entry) => sum + entry.accessCount, 0) / this.cache.size,
    };
  }
}

export const qrEnhancedService = new QREnhancedService();