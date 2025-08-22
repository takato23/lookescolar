import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateSecureToken,
  maskToken,
  getTokenExpiryDate,
} from '@/lib/utils/tokens';
import type { Database } from '@/types/database';

// Enhanced token types for different access patterns
export type TokenType = 
  | 'student_access'    // Individual student access
  | 'family_access'     // Multi-child family access
  | 'group_access'      // Class/group access
  | 'event_access'      // Full event access
  | 'temporary_access'; // Short-term access

export interface TokenMetadata {
  generatedBy?: string;
  generatedAt: string;
  distributionMethod?: 'email' | 'whatsapp' | 'sms' | 'print' | 'direct';
  schoolContact?: string;
  notes?: string;
  deviceFingerprints?: string[];
}

export interface EnhancedTokenData {
  id: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  isActive: boolean;
  metadata: TokenMetadata;
  accessRules: {
    maxDevices?: number;
    ipWhitelist?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      allowedDays?: number[];
    };
  };
  // Relations
  studentIds?: string[];
  familyEmail?: string;
  eventId?: string;
}

export interface TokenGenerationOptions {
  expiryDays?: number;
  type?: TokenType;
  maxDevices?: number;
  distributionMethod?: string;
  metadata?: Partial<TokenMetadata>;
  rotateExisting?: boolean;
}

export interface BulkTokenGenerationResult {
  successful: Map<string, EnhancedTokenData>;
  failed: Array<{ identifier: string; error: string }>;
  summary: {
    totalRequested: number;
    successful: number;
    failed: number;
    tokensGenerated: number;
    tokensRotated: number;
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  token?: EnhancedTokenData;
  student?: Database['public']['Tables']['students']['Row'];
  students?: Database['public']['Tables']['students']['Row'][];
  event?: Database['public']['Tables']['events']['Row'];
  accessLevel: 'none' | 'student' | 'family' | 'group' | 'event';
  warnings?: string[];
  expiresInDays?: number;
}

/**
 * Enhanced Token Service for Family Access Management
 * Supports multiple token types, family access, and advanced security features
 */
export class EnhancedTokenService {
  private supabase = createServerSupabaseClient();

  /**
   * Generate a token for student access
   */
  async generateStudentToken(
    studentId: string, 
    options: TokenGenerationOptions = {}
  ): Promise<EnhancedTokenData> {
    const { 
      expiryDays = 30, 
      distributionMethod = 'direct',
      metadata = {},
      rotateExisting = false 
    } = options;

    const supabase = await this.supabase;

    // Validate student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, events(*)')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    // Check for existing token
    if (!rotateExisting) {
      const existingToken = await this.getActiveStudentToken(studentId);
      if (existingToken) {
        return existingToken;
      }
    }

    // Generate new secure token
    const token = await this.generateUniqueToken();
    const expiresAt = getTokenExpiryDate(expiryDays);

    const tokenData: EnhancedTokenData = {
      id: crypto.randomUUID(),
      token,
      type: 'student_access',
      expiresAt,
      isActive: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        distributionMethod: distributionMethod as any,
        ...metadata
      },
      accessRules: {
        maxDevices: options.maxDevices || 3,
      },
      studentIds: [studentId],
      eventId: student.event_id
    };

    // Store in enhanced_tokens table
    await this.storeEnhancedToken(tokenData);

    // Also maintain backward compatibility with subject_tokens
    await this.createSubjectToken(studentId, token, expiresAt);

    console.log({
      event: 'student_token_generated',
      studentId: maskToken(studentId),
      token: maskToken(token),
      type: 'student_access',
      expiresAt: expiresAt.toISOString()
    });

    return tokenData;
  }

  /**
   * Generate a family token for multiple children access
   */
  async generateFamilyToken(
    studentIds: string[], 
    familyEmail: string,
    options: TokenGenerationOptions = {}
  ): Promise<EnhancedTokenData> {
    const { 
      expiryDays = 30, 
      distributionMethod = 'email',
      metadata = {},
    } = options;

    const supabase = await this.supabase;

    // Validate all students exist and belong to the same event
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*, events(*)')
      .in('id', studentIds);

    if (studentsError || !students || students.length === 0) {
      throw new Error('No valid students found');
    }

    if (students.length !== studentIds.length) {
      throw new Error('Some students not found');
    }

    // Verify all students belong to same event
    const eventIds = [...new Set(students.map(s => s.event_id))];
    if (eventIds.length > 1) {
      throw new Error('Students must belong to the same event for family access');
    }

    // Check for existing family token
    const existingToken = await this.getActiveFamilyToken(familyEmail, eventIds[0]);
    if (existingToken && !options.rotateExisting) {
      return existingToken;
    }

    // Generate family token
    const token = await this.generateUniqueToken();
    const expiresAt = getTokenExpiryDate(expiryDays);

    const tokenData: EnhancedTokenData = {
      id: crypto.randomUUID(),
      token,
      type: 'family_access',
      expiresAt,
      isActive: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        distributionMethod: distributionMethod as any,
        ...metadata
      },
      accessRules: {
        maxDevices: options.maxDevices || 5,
      },
      studentIds,
      familyEmail,
      eventId: eventIds[0]
    };

    // Store enhanced token
    await this.storeEnhancedToken(tokenData);

    // Create individual subject tokens for backward compatibility
    for (const studentId of studentIds) {
      await this.createSubjectToken(studentId, token, expiresAt);
    }

    console.log({
      event: 'family_token_generated',
      familyEmail: maskToken(familyEmail),
      token: maskToken(token),
      type: 'family_access',
      studentCount: studentIds.length,
      expiresAt: expiresAt.toISOString()
    });

    return tokenData;
  }

  /**
   * Bulk generate tokens for an entire event/class
   */
  async generateBulkTokens(
    eventId: string,
    type: TokenType = 'student_access',
    options: TokenGenerationOptions = {}
  ): Promise<BulkTokenGenerationResult> {
    const supabase = await this.supabase;
    
    // Get all students in the event
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, parent_email, events(*)')
      .eq('event_id', eventId);

    if (studentsError || !students) {
      throw new Error(`Failed to fetch students for event ${eventId}`);
    }

    const successful = new Map<string, EnhancedTokenData>();
    const failed: Array<{ identifier: string; error: string }> = [];
    let tokensGenerated = 0;
    let tokensRotated = 0;

    // Process based on token type
    if (type === 'family_access') {
      // Group students by family email
      const familyGroups = new Map<string, string[]>();
      
      for (const student of students) {
        if (!student.parent_email) {
          failed.push({
            identifier: `${student.first_name} ${student.last_name}`,
            error: 'No parent email provided'
          });
          continue;
        }
        
        const email = student.parent_email.toLowerCase();
        const studentIds = familyGroups.get(email) || [];
        studentIds.push(student.id);
        familyGroups.set(email, studentIds);
      }

      // Generate family tokens
      for (const [familyEmail, studentIds] of familyGroups) {
        try {
          const existingToken = await this.getActiveFamilyToken(familyEmail, eventId);
          
          if (existingToken && !options.rotateExisting) {
            successful.set(familyEmail, existingToken);
          } else {
            const tokenData = await this.generateFamilyToken(
              studentIds, 
              familyEmail, 
              options
            );
            successful.set(familyEmail, tokenData);
            
            if (existingToken) {
              tokensRotated++;
            } else {
              tokensGenerated++;
            }
          }
        } catch (error: any) {
          failed.push({
            identifier: familyEmail,
            error: error.message
          });
        }
      }
    } else {
      // Generate individual student tokens
      for (const student of students) {
        try {
          const existingToken = await this.getActiveStudentToken(student.id);
          
          if (existingToken && !options.rotateExisting) {
            successful.set(student.id, existingToken);
          } else {
            const tokenData = await this.generateStudentToken(student.id, options);
            successful.set(student.id, tokenData);
            
            if (existingToken) {
              tokensRotated++;
            } else {
              tokensGenerated++;
            }
          }
        } catch (error: any) {
          failed.push({
            identifier: `${student.first_name} ${student.last_name}`,
            error: error.message
          });
        }
      }
    }

    return {
      successful,
      failed,
      summary: {
        totalRequested: students.length,
        successful: successful.size,
        failed: failed.length,
        tokensGenerated,
        tokensRotated
      }
    };
  }

  /**
   * Validate a token and return comprehensive access information
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    if (!token || token.length < 20) {
      return { isValid: false, accessLevel: 'none' };
    }

    try {
      const supabase = await this.supabase;
      
      // Get enhanced token data
      const { data: enhancedToken } = await supabase
        .from('enhanced_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      // Fallback to legacy subject_tokens for backward compatibility
      if (!enhancedToken) {
        return await this.validateLegacyToken(token);
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(enhancedToken.expires_at);
      
      if (expiresAt <= now) {
        console.log({
          event: 'token_expired',
          token: maskToken(token),
          expiresAt: enhancedToken.expires_at
        });
        return { isValid: false, accessLevel: 'none' };
      }

      // Calculate expiration warning
      const expiresInDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const warnings: string[] = [];
      
      if (expiresInDays <= 7) {
        warnings.push(`Token expires in ${expiresInDays} days`);
      }

      // Get associated students and event
      const studentIds = enhancedToken.student_ids || [];
      const { data: students } = await supabase
        .from('students')
        .select('*, events(*)')
        .in('id', studentIds);

      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', enhancedToken.event_id)
        .single();

      // Update token usage
      await this.updateTokenUsage(token);

      const result: TokenValidationResult = {
        isValid: true,
        token: {
          id: enhancedToken.id,
          token: enhancedToken.token,
          type: enhancedToken.type as TokenType,
          expiresAt,
          isActive: enhancedToken.is_active,
          metadata: enhancedToken.metadata as TokenMetadata,
          accessRules: enhancedToken.access_rules || {},
          studentIds: enhancedToken.student_ids,
          familyEmail: enhancedToken.family_email,
          eventId: enhancedToken.event_id
        },
        students: students || [],
        event: event || undefined,
        accessLevel: this.determineAccessLevel(enhancedToken.type as TokenType),
        warnings,
        expiresInDays
      };

      // For single student access, also include the individual student
      if (students && students.length === 1) {
        result.student = students[0];
      }

      return result;
    } catch (error: any) {
      console.error({
        event: 'token_validation_error',
        token: maskToken(token),
        error: error.message
      });
      return { isValid: false, accessLevel: 'none' };
    }
  }

  /**
   * Get tokens that are expiring soon for rotation warnings
   */
  async getExpiringTokens(daysBeforeExpiry: number = 7): Promise<{
    tokens: EnhancedTokenData[];
    byType: Record<TokenType, number>;
    totalCount: number;
  }> {
    const supabase = await this.supabase;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysBeforeExpiry);

    const { data: expiringTokens, error } = await supabase
      .from('enhanced_tokens')
      .select('*')
      .eq('is_active', true)
      .lte('expires_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error fetching expiring tokens:', error);
      return { tokens: [], byType: {} as Record<TokenType, number>, totalCount: 0 };
    }

    const tokens = (expiringTokens || []).map(this.mapDbTokenToEnhanced);
    const byType = tokens.reduce((acc, token) => {
      acc[token.type] = (acc[token.type] || 0) + 1;
      return acc;
    }, {} as Record<TokenType, number>);

    return {
      tokens,
      byType,
      totalCount: tokens.length
    };
  }

  /**
   * Rotate tokens that are expiring soon
   */
  async rotateExpiringTokens(daysBeforeExpiry: number = 7): Promise<{
    rotated: number;
    failed: number;
    errors: Array<{ tokenId: string; error: string }>;
  }> {
    const { tokens } = await this.getExpiringTokens(daysBeforeExpiry);
    const errors: Array<{ tokenId: string; error: string }> = [];
    let rotated = 0;

    for (const tokenData of tokens) {
      try {
        if (tokenData.type === 'family_access' && tokenData.studentIds && tokenData.familyEmail) {
          await this.generateFamilyToken(
            tokenData.studentIds,
            tokenData.familyEmail,
            { rotateExisting: true }
          );
        } else if (tokenData.type === 'student_access' && tokenData.studentIds?.[0]) {
          await this.generateStudentToken(
            tokenData.studentIds[0],
            { rotateExisting: true }
          );
        }
        rotated++;
      } catch (error: any) {
        errors.push({
          tokenId: tokenData.id,
          error: error.message
        });
      }
    }

    console.log({
      event: 'bulk_token_rotation_completed',
      totalExpiring: tokens.length,
      rotated,
      failed: errors.length
    });

    return {
      rotated,
      failed: errors.length,
      errors
    };
  }

  /**
   * Generate portal URLs for tokens
   */
  static generatePortalUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/f/${token}`;
  }

  /**
   * Generate QR code data for token
   */
  static generateQRCodeData(token: string, baseUrl?: string): string {
    return this.generatePortalUrl(token, baseUrl);
  }

  // Private helper methods
  private async generateUniqueToken(): Promise<string> {
    const supabase = await this.supabase;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const token = generateSecureToken();
      
      // Check uniqueness in both enhanced_tokens and subject_tokens
      const [{ data: enhancedDupe }, { data: legacyDupe }] = await Promise.all([
        supabase.from('enhanced_tokens').select('id').eq('token', token).single(),
        supabase.from('subject_tokens').select('id').eq('token', token).single()
      ]);

      if (!enhancedDupe && !legacyDupe) {
        return token;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique token after multiple attempts');
  }

  private async storeEnhancedToken(tokenData: EnhancedTokenData): Promise<void> {
    const supabase = await this.supabase;
    
    const { error } = await supabase
      .from('enhanced_tokens')
      .upsert({
        id: tokenData.id,
        token: tokenData.token,
        type: tokenData.type,
        expires_at: tokenData.expiresAt.toISOString(),
        is_active: tokenData.isActive,
        metadata: tokenData.metadata,
        access_rules: tokenData.accessRules,
        student_ids: tokenData.studentIds,
        family_email: tokenData.familyEmail,
        event_id: tokenData.eventId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store enhanced token: ${error.message}`);
    }
  }

  private async createSubjectToken(studentId: string, token: string, expiresAt: Date): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .from('subject_tokens')
      .upsert({
        subject_id: studentId,
        token,
        expires_at: expiresAt.toISOString()
      });
  }

  private async getActiveStudentToken(studentId: string): Promise<EnhancedTokenData | null> {
    const supabase = await this.supabase;
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('enhanced_tokens')
      .select('*')
      .eq('type', 'student_access')
      .contains('student_ids', [studentId])
      .eq('is_active', true)
      .gt('expires_at', now)
      .single();

    return data ? this.mapDbTokenToEnhanced(data) : null;
  }

  private async getActiveFamilyToken(familyEmail: string, eventId: string): Promise<EnhancedTokenData | null> {
    const supabase = await this.supabase;
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('enhanced_tokens')
      .select('*')
      .eq('type', 'family_access')
      .eq('family_email', familyEmail)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .single();

    return data ? this.mapDbTokenToEnhanced(data) : null;
  }

  private async validateLegacyToken(token: string): Promise<TokenValidationResult> {
    const supabase = await this.supabase;

    const { data: tokenInfo } = await supabase
      .from('subject_tokens')
      .select(`
        *,
        subjects (
          *,
          events (*)
        )
      `)
      .eq('token', token)
      .single();

    if (!tokenInfo) {
      return { isValid: false, accessLevel: 'none' };
    }

    const expiresAt = new Date(tokenInfo.expires_at);
    if (expiresAt <= new Date()) {
      return { isValid: false, accessLevel: 'none' };
    }

    return {
      isValid: true,
      student: tokenInfo.subjects as any,
      accessLevel: 'student'
    };
  }

  private async updateTokenUsage(token: string): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .from('enhanced_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: supabase.rpc('increment_usage_count', { token_value: token })
      })
      .eq('token', token);
  }

  private determineAccessLevel(type: TokenType): TokenValidationResult['accessLevel'] {
    switch (type) {
      case 'student_access': return 'student';
      case 'family_access': return 'family';
      case 'group_access': return 'group';
      case 'event_access': return 'event';
      default: return 'none';
    }
  }

  private mapDbTokenToEnhanced(dbToken: any): EnhancedTokenData {
    return {
      id: dbToken.id,
      token: dbToken.token,
      type: dbToken.type as TokenType,
      expiresAt: new Date(dbToken.expires_at),
      isActive: dbToken.is_active,
      metadata: dbToken.metadata || {},
      accessRules: dbToken.access_rules || {},
      studentIds: dbToken.student_ids,
      familyEmail: dbToken.family_email,
      eventId: dbToken.event_id
    };
  }
}

// Singleton instance
export const enhancedTokenService = new EnhancedTokenService();