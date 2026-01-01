/**
 * Secure File Upload Service
 * Enterprise-grade file upload security with comprehensive validation
 *
 * Features:
 * - Magic number validation (file type detection)
 * - File size limits enforcement
 * - Malware scanning hooks
 * - Tenant-scoped storage
 * - Path traversal prevention
 * - SVG sanitization (removes embedded scripts)
 * - MIME type validation
 * - Filename sanitization
 *
 * @security CRITICAL - All file uploads MUST use this service
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import path from 'path';

// Allowed file types with magic number signatures
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    magicNumbers: [
      [0xff, 0xd8, 0xff], // JPEG
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'image/png': {
    extensions: ['.png'],
    magicNumbers: [
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'image/webp': {
    extensions: ['.webp'],
    magicNumbers: [
      [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'image/svg+xml': {
    extensions: ['.svg'],
    magicNumbers: [
      [0x3c, 0x73, 0x76, 0x67], // <svg
      [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml
    ],
    maxSize: 2 * 1024 * 1024, // 2MB (SVGs should be small)
  },
} as const;

// Upload result interface
export interface UploadResult {
  success: boolean;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  error?: string;
  security_warnings?: string[];
}

// Upload options interface
export interface UploadOptions {
  tenant_id: string;
  bucket: 'photos' | 'logos' | 'banners' | 'assets';
  folder?: string;
  allowed_types?: (keyof typeof ALLOWED_FILE_TYPES)[];
  max_size?: number;
  scan_for_malware?: boolean;
  sanitize_svg?: boolean;
}

/**
 * Secure File Upload Service
 */
export class SecureFileUploadService {
  /**
   * Upload file with comprehensive security validation
   */
  static async upload(
    file: File | Blob,
    filename: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const warnings: string[] = [];

    try {
      // 1. Validate tenant ID (prevent tenant manipulation)
      if (!this.isValidUUID(options.tenant_id)) {
        return {
          success: false,
          error: 'Invalid tenant ID',
        };
      }

      // 2. Sanitize filename (prevent path traversal)
      const sanitizedFilename = this.sanitizeFilename(filename);
      if (!sanitizedFilename) {
        return {
          success: false,
          error: 'Invalid filename',
        };
      }

      // 3. Read file buffer for validation
      const buffer = await this.fileToBuffer(file);

      // 4. Validate file size
      const maxSize = options.max_size || 10 * 1024 * 1024; // Default 10MB
      if (buffer.length > maxSize) {
        return {
          success: false,
          error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
        };
      }

      if (buffer.length === 0) {
        return {
          success: false,
          error: 'Empty file not allowed',
        };
      }

      // 5. Detect file type via magic numbers
      const detectedType = this.detectFileType(buffer);
      if (!detectedType) {
        return {
          success: false,
          error: 'Unsupported or unrecognized file type',
        };
      }

      // 6. Validate against allowed types
      const allowedTypes = options.allowed_types || Object.keys(ALLOWED_FILE_TYPES);
      if (!allowedTypes.includes(detectedType as keyof typeof ALLOWED_FILE_TYPES)) {
        return {
          success: false,
          error: `File type ${detectedType} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        };
      }

      // 7. Validate file extension matches detected type
      const fileExtension = path.extname(sanitizedFilename).toLowerCase();
      const typeInfo = ALLOWED_FILE_TYPES[detectedType as keyof typeof ALLOWED_FILE_TYPES];
      if (!typeInfo.extensions.includes(fileExtension)) {
        return {
          success: false,
          error: `File extension ${fileExtension} does not match detected type ${detectedType}`,
        };
      }

      // 8. Check file size against type-specific limit
      if (buffer.length > typeInfo.maxSize) {
        return {
          success: false,
          error: `File size exceeds type-specific limit of ${typeInfo.maxSize / 1024 / 1024}MB for ${detectedType}`,
        };
      }

      // 9. SVG-specific sanitization (remove scripts, event handlers)
      let finalBuffer = buffer;
      if (detectedType === 'image/svg+xml' && options.sanitize_svg !== false) {
        const sanitizedSvg = await this.sanitizeSVG(buffer);
        if (!sanitizedSvg.success) {
          return {
            success: false,
            error: sanitizedSvg.error || 'SVG sanitization failed',
          };
        }
        finalBuffer = sanitizedSvg.buffer!;
        if (sanitizedSvg.warnings) {
          warnings.push(...sanitizedSvg.warnings);
        }
      }

      // 10. Malware scanning (optional, requires integration with scanning service)
      if (options.scan_for_malware) {
        const scanResult = await this.scanForMalware(finalBuffer, sanitizedFilename);
        if (!scanResult.safe) {
          logger.error('Malware detected in uploaded file', {
            tenant_id: options.tenant_id,
            filename: sanitizedFilename,
            threats: scanResult.threats,
          });
          return {
            success: false,
            error: 'File contains malicious content and was rejected',
          };
        }
        if (scanResult.warnings) {
          warnings.push(...scanResult.warnings);
        }
      }

      // 11. Generate unique, unpredictable filename
      const uniqueFilename = this.generateSecureFilename(sanitizedFilename);

      // 12. Construct tenant-scoped storage path
      const storagePath = this.constructSecurePath(
        options.tenant_id,
        options.bucket,
        options.folder,
        uniqueFilename
      );

      // 13. Upload to Supabase Storage
      const supabase = await createServiceClient();
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(storagePath, finalBuffer, {
          contentType: detectedType,
          cacheControl: '3600',
          upsert: false, // Prevent overwriting existing files
        });

      if (error) {
        logger.error('File upload failed', {
          error: error.message,
          tenant_id: options.tenant_id,
          filename: sanitizedFilename,
        });
        return {
          success: false,
          error: 'File upload failed',
        };
      }

      // 14. Generate signed URL for access
      const { data: urlData } = await supabase.storage
        .from(options.bucket)
        .createSignedUrl(storagePath, 3600 * 24 * 365); // 1 year

      logger.info('File uploaded successfully', {
        tenant_id: options.tenant_id,
        filename: sanitizedFilename,
        size: finalBuffer.length,
        type: detectedType,
        path: storagePath,
      });

      return {
        success: true,
        file_path: storagePath,
        file_url: urlData?.signedUrl,
        file_size: finalBuffer.length,
        file_type: detectedType,
        security_warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error('File upload error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenant_id: options.tenant_id,
        filename,
      });
      return {
        success: false,
        error: 'Internal error during file upload',
      };
    }
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(
    tenantId: string,
    bucket: string,
    filePath: string
  ): Promise<boolean> {
    try {
      // Validate tenant ownership of file
      if (!filePath.startsWith(`tenant_${tenantId}/`)) {
        logger.warn('Attempted to delete file not owned by tenant', {
          tenant_id: tenantId,
          file_path: filePath,
        });
        return false;
      }

      const supabase = await createServiceClient();
      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        logger.error('File deletion failed', {
          error: error.message,
          file_path: filePath,
        });
        return false;
      }

      logger.info('File deleted successfully', {
        tenant_id: tenantId,
        file_path: filePath,
      });
      return true;
    } catch (error) {
      logger.error('File deletion error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        file_path: filePath,
      });
      return false;
    }
  }

  /**
   * Detect file type via magic numbers
   */
  private static detectFileType(buffer: Buffer): string | null {
    for (const [mimeType, typeInfo] of Object.entries(ALLOWED_FILE_TYPES)) {
      for (const magicNumber of typeInfo.magicNumbers) {
        if (this.matchesMagicNumber(buffer, magicNumber)) {
          return mimeType;
        }
      }
    }
    return null;
  }

  /**
   * Check if buffer starts with magic number
   */
  private static matchesMagicNumber(buffer: Buffer, magicNumber: number[]): boolean {
    if (buffer.length < magicNumber.length) return false;

    for (let i = 0; i < magicNumber.length; i++) {
      if (buffer[i] !== magicNumber[i]) return false;
    }
    return true;
  }

  /**
   * Sanitize filename to prevent path traversal and injection
   */
  private static sanitizeFilename(filename: string): string | null {
    if (!filename || filename.length > 255) return null;

    // Remove path components
    const basename = path.basename(filename);

    // Remove dangerous characters
    const sanitized = basename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow alphanumeric, dots, dashes, underscores
      .replace(/\.+/g, '.') // Collapse multiple dots
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, ''); // Remove trailing dots

    if (!sanitized || sanitized.length === 0) return null;

    // Ensure has valid extension
    const ext = path.extname(sanitized);
    if (!ext || ext.length < 2) return null;

    return sanitized;
  }

  /**
   * Generate secure, unique filename
   */
  private static generateSecureFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');

    return `${basename}_${timestamp}_${randomBytes}${ext}`;
  }

  /**
   * Construct secure storage path with tenant isolation
   */
  private static constructSecurePath(
    tenantId: string,
    bucket: string,
    folder: string | undefined,
    filename: string
  ): string {
    // Always scope to tenant
    const parts = [`tenant_${tenantId}`, bucket];

    if (folder) {
      // Sanitize folder name
      const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '_');
      parts.push(sanitizedFolder);
    }

    parts.push(filename);

    return parts.join('/');
  }

  /**
   * Sanitize SVG to remove malicious content
   */
  private static async sanitizeSVG(buffer: Buffer): Promise<{
    success: boolean;
    buffer?: Buffer;
    error?: string;
    warnings?: string[];
  }> {
    try {
      const svgContent = buffer.toString('utf-8');
      const warnings: string[] = [];

      // Check for dangerous patterns
      const dangerousPatterns = [
        /<script[\s>]/i,
        /javascript:/i,
        /on\w+\s*=/i, // Event handlers
        /<iframe/i,
        /<embed/i,
        /<object/i,
        /data:text\/html/i,
        /<foreignObject/i,
      ];

      let sanitized = svgContent;
      let hasChanges = false;

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          warnings.push(`Removed potentially dangerous content: ${pattern.source}`);
          sanitized = sanitized.replace(pattern, '');
          hasChanges = true;
        }
      }

      // Remove event handler attributes
      sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

      // Ensure SVG has proper XML declaration
      if (!sanitized.includes('<?xml') && !sanitized.startsWith('<svg')) {
        return {
          success: false,
          error: 'Invalid SVG structure',
        };
      }

      return {
        success: true,
        buffer: Buffer.from(sanitized, 'utf-8'),
        warnings: hasChanges ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: 'SVG sanitization failed',
      };
    }
  }

  /**
   * Scan file for malware (integration point for AV service)
   */
  private static async scanForMalware(
    buffer: Buffer,
    filename: string
  ): Promise<{
    safe: boolean;
    threats?: string[];
    warnings?: string[];
  }> {
    // INTEGRATION POINT: Replace with actual malware scanning service
    // Options:
    // - ClamAV (open source)
    // - VirusTotal API
    // - AWS Macie
    // - Google Safe Browsing API

    // For now, perform basic heuristic checks
    const heuristicThreats: string[] = [];

    // Check for executable content in non-executable files
    if (this.hasExecutableContent(buffer)) {
      heuristicThreats.push('Executable content detected in image file');
    }

    // Check for suspicious strings
    const suspiciousStrings = ['eval(', 'exec(', 'system(', 'shell_exec'];
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));

    for (const str of suspiciousStrings) {
      if (content.includes(str)) {
        heuristicThreats.push(`Suspicious string detected: ${str}`);
      }
    }

    return {
      safe: heuristicThreats.length === 0,
      threats: heuristicThreats.length > 0 ? heuristicThreats : undefined,
      warnings: [
        'Note: Full malware scanning not configured. Using heuristic checks only.',
      ],
    };
  }

  /**
   * Check for executable content in buffer
   */
  private static hasExecutableContent(buffer: Buffer): boolean {
    // Check for common executable headers
    const executableSignatures = [
      [0x4d, 0x5a], // DOS/Windows executable
      [0x7f, 0x45, 0x4c, 0x46], // ELF (Linux executable)
      [0xcf, 0xfa, 0xed, 0xfe], // Mach-O (macOS executable)
      [0x23, 0x21], // Shebang (#!)
    ];

    for (const signature of executableSignatures) {
      if (this.matchesMagicNumber(buffer, signature)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert File/Blob to Buffer
   */
  private static async fileToBuffer(file: File | Blob): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Validate UUID format
   */
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Usage Example:
 *
 * import { SecureFileUploadService } from '@/lib/services/secure-file-upload.service';
 *
 * // In API route
 * const formData = await request.formData();
 * const file = formData.get('logo') as File;
 *
 * const result = await SecureFileUploadService.upload(file, file.name, {
 *   tenant_id: tenantId,
 *   bucket: 'logos',
 *   folder: 'store-configs',
 *   allowed_types: ['image/jpeg', 'image/png', 'image/svg+xml'],
 *   max_size: 5 * 1024 * 1024, // 5MB
 *   sanitize_svg: true,
 *   scan_for_malware: true,
 * });
 *
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 *
 * // Use result.file_url in store configuration
 */
