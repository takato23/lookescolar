import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  enhancedTokenService,
  TokenType,
} from '@/lib/services/enhanced-token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const BulkTokenGenerationSchema = z.object({
  token_type: z
    .enum(['student_access', 'family_access', 'group_access'])
    .default('family_access'),
  expiry_days: z.number().min(1).max(365).default(30),
  distribution_method: z
    .enum(['email', 'whatsapp', 'sms', 'print', 'direct'])
    .default('email'),
  max_devices: z.number().min(1).max(10).default(5),
  regenerate_existing: z.boolean().default(false),
  notify_families: z.boolean().default(true),
  metadata: z
    .object({
      generated_by: z.string().optional(),
      notes: z.string().optional(),
      school_contact: z.string().optional(),
    })
    .optional(),
});

const TokenRotationSchema = z.object({
  rotation_reason: z
    .enum([
      'expiry_warning',
      'security_breach',
      'admin_request',
      'scheduled_rotation',
    ])
    .default('admin_request'),
  notify_families: z.boolean().default(true),
  force_rotation: z.boolean().default(false),
  days_before_expiry: z.number().min(1).max(30).default(7),
});

const TokenAnalyticsSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  token_type: z
    .enum(['student_access', 'family_access', 'group_access', 'all'])
    .default('all'),
  include_distribution_stats: z.boolean().default(true),
  include_access_logs: z.boolean().default(false),
});

// ============================================================
// GET - Enhanced Token Listing with Analytics
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params;
    const requestId = generateRequestId();

    console.log(`[${requestId}] Getting enhanced tokens for event:`, {
      eventId: `${eventId.substring(0, 8)}***`,
    });

    // Validate event ID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists and get basic info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, date, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log(`[${requestId}] Event not found:`, {
        eventId: `${eventId.substring(0, 8)}***`,
      });
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Get enhanced tokens for this event
    const { data: enhancedTokens, error: tokensError } = await supabase
      .from('enhanced_tokens')
      .select(
        `
        id,
        token,
        type,
        expires_at,
        is_active,
        usage_count,
        last_used_at,
        student_ids,
        family_email,
        metadata,
        access_rules,
        created_at
      `
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (tokensError) {
      console.error(
        `[${requestId}] Error fetching enhanced tokens:`,
        tokensError
      );
      return NextResponse.json(
        { error: 'Error obteniendo tokens del evento' },
        { status: 500 }
      );
    }

    // Get students for this event to enrich token data
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name, parent_email')
      .eq('event_id', eventId);

    const studentsMap = new Map((students || []).map((s) => [s.id, s]));

    // Calculate statistics
    const now = new Date();
    const stats = {
      total: enhancedTokens?.length || 0,
      active: 0,
      expired: 0,
      expiring_soon: 0,
      by_type: {} as Record<string, number>,
      families_with_access: new Set<string>().size,
      students_with_access: 0,
      total_usage: 0,
      avg_usage_per_token: 0,
    };

    // Process tokens and calculate stats
    const processedTokens = (enhancedTokens || []).map((token) => {
      const expiresAt = new Date(token.expires_at);
      const isExpired = expiresAt <= now;
      const isExpiringSoon =
        !isExpired &&
        expiresAt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Update stats
      if (token.is_active && !isExpired) {
        stats.active++;
      }
      if (isExpired) {
        stats.expired++;
      }
      if (isExpiringSoon) {
        stats.expiring_soon++;
      }

      stats.by_type[token.type] = (stats.by_type[token.type] || 0) + 1;
      stats.total_usage += token.usage_count || 0;

      if (token.family_email) {
        // This would need to be accumulated properly
      }

      // Get student names for this token
      const tokenStudents = (token.student_ids || [])
        .map((id) => studentsMap.get(id))
        .filter(Boolean)
        .map((s) => `${s.first_name} ${s.last_name}`);

      return {
        id: token.id,
        token_masked: `${token.token.substring(0, 8)}***${token.token.slice(-4)}`,
        type: token.type,
        expires_at: token.expires_at,
        is_active: token.is_active,
        is_expired: isExpired,
        expires_in_days: Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
        usage_count: token.usage_count || 0,
        last_used_at: token.last_used_at,

        // Access details
        family_email: token.family_email,
        student_count: token.student_ids?.length || 0,
        student_names: tokenStudents,

        // Portal access
        portal_url: enhancedTokenService.generatePortalUrl(token.token),
        qr_code_data: enhancedTokenService.generateQRCodeData(token.token),

        // Metadata
        generation_method: token.metadata?.distributionMethod || 'unknown',
        generated_by: token.metadata?.generatedBy || 'system',
        notes: token.metadata?.notes,

        created_at: token.created_at,
      };
    });

    // Calculate final stats
    stats.avg_usage_per_token =
      stats.total > 0
        ? Math.round((stats.total_usage / stats.total) * 100) / 100
        : 0;
    stats.students_with_access = [
      ...new Set((enhancedTokens || []).flatMap((t) => t.student_ids || [])),
    ].length;
    stats.families_with_access = [
      ...new Set(
        (enhancedTokens || []).map((t) => t.family_email).filter(Boolean)
      ),
    ].length;

    SecurityLogger.logSecurityEvent(
      'enhanced_tokens_accessed',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        totalTokens: stats.total,
        activeTokens: stats.active,
        tokenTypes: Object.keys(stats.by_type),
      },
      'info'
    );

    console.log(`[${requestId}] Enhanced tokens retrieved:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalTokens: stats.total,
      activeTokens: stats.active,
      tokenTypes: stats.by_type,
    });

    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name,
          date: event.date,
          status: event.status,
        },
        tokens: processedTokens,
        stats,
        generated_at: new Date().toISOString(),
      },
      {
        headers: { 'X-Request-Id': requestId },
      }
    );
  } catch (error) {
    console.error('Error getting enhanced tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Enhanced Bulk Token Generation
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params;
    const requestId = generateRequestId();

    console.log(`[${requestId}] Generating enhanced tokens for event:`, {
      eventId: `${eventId.substring(0, 8)}***`,
    });

    // Validate event ID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = BulkTokenGenerationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Datos de solicitud inválidos',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      token_type,
      expiry_days,
      distribution_method,
      max_devices,
      regenerate_existing,
      notify_families,
      metadata,
    } = validationResult.data;

    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log(`[${requestId}] Event not found:`, {
        eventId: `${eventId.substring(0, 8)}***`,
      });
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'El evento debe estar activo para generar tokens' },
        { status: 400 }
      );
    }

    // Generate tokens using enhanced service
    const generationOptions = {
      expiryDays: expiry_days,
      type: token_type as TokenType,
      maxDevices: max_devices,
      distributionMethod: distribution_method,
      rotateExisting: regenerate_existing,
      metadata: {
        generatedBy: 'admin', // This would come from auth context
        ...metadata,
      },
    };

    console.log(`[${requestId}] Starting bulk token generation:`, {
      tokenType: token_type,
      expiryDays: expiry_days,
      regenerateExisting: regenerate_existing,
    });

    const bulkResult = await enhancedTokenService.generateBulkTokens(
      eventId,
      token_type as TokenType,
      generationOptions
    );

    // Log generation results for each successful token
    const distributionLogs = [];
    for (const [identifier, tokenData] of bulkResult.successful) {
      // Create distribution log entry
      const { error: logError } = await supabase
        .from('token_distribution_log')
        .insert({
          token_id: tokenData.id,
          distribution_method,
          recipient_contact: tokenData.familyEmail || identifier,
          distributed_by: 'admin', // This would come from auth context
          status: notify_families ? 'pending' : 'generated',
          metadata: {
            generation_request_id: requestId,
            bulk_generation: true,
            event_name: event.name,
          },
        });

      if (!logError) {
        distributionLogs.push({
          identifier,
          token_id: tokenData.id,
          portal_url: enhancedTokenService.generatePortalUrl(tokenData.token),
        });
      }
    }

    // If notification is requested, trigger notification system
    if (notify_families && bulkResult.successful.size > 0) {
      // TODO: Implement notification service integration
      console.log(
        `[${requestId}] Family notifications requested for ${bulkResult.successful.size} tokens`
      );
    }

    SecurityLogger.logSecurityEvent(
      'bulk_enhanced_token_generation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        tokenType: token_type,
        totalRequested: bulkResult.summary.totalRequested,
        successful: bulkResult.summary.successful,
        failed: bulkResult.summary.failed,
        tokensGenerated: bulkResult.summary.tokensGenerated,
        tokensRotated: bulkResult.summary.tokensRotated,
        distributionMethod: distribution_method,
        notifyFamilies: notify_families,
      },
      'info'
    );

    console.log(`[${requestId}] Bulk enhanced token generation completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      summary: bulkResult.summary,
      distributionLogsCreated: distributionLogs.length,
    });

    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name,
        },
        generation_summary: bulkResult.summary,
        token_type,
        expiry_days,
        distribution_method,
        notifications_pending: notify_families ? bulkResult.successful.size : 0,
        failed_generations: bulkResult.failed.map((f) => ({
          identifier: f.identifier,
          error: f.error,
        })),
        successful_tokens: Array.from(bulkResult.successful.values()).map(
          (token) => ({
            id: token.id,
            type: token.type,
            family_email: token.familyEmail,
            student_count: token.studentIds?.length || 0,
            portal_url: enhancedTokenService.generatePortalUrl(token.token),
            expires_at: token.expiresAt.toISOString(),
          })
        ),
        generated_at: new Date().toISOString(),
      },
      {
        headers: { 'X-Request-Id': requestId },
      }
    );
  } catch (error) {
    console.error('Error generating enhanced tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Token Rotation for Expiring Tokens
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params;
    const requestId = generateRequestId();

    console.log(`[${requestId}] Rotating expiring tokens for event:`, {
      eventId: `${eventId.substring(0, 8)}***`,
    });

    // Validate request body
    const body = await request.json();
    const validationResult = TokenRotationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Datos de solicitud inválidos',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      rotation_reason,
      notify_families,
      force_rotation,
      days_before_expiry,
    } = validationResult.data;

    const supabase = await createServerSupabaseServiceClient();

    // Get event info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Get tokens to rotate
    let tokensToRotate;
    if (force_rotation) {
      // Rotate all active tokens for this event
      const { data } = await supabase
        .from('enhanced_tokens')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      tokensToRotate = {
        tokens: (data || []).map((t) => ({
          id: t.id,
          token: t.token,
          type: t.type as TokenType,
          expiresAt: new Date(t.expires_at),
          isActive: t.is_active,
          metadata: t.metadata || {},
          accessRules: t.access_rules || {},
          studentIds: t.student_ids,
          familyEmail: t.family_email,
          eventId: t.event_id,
        })),
      };
    } else {
      // Get expiring tokens
      tokensToRotate =
        await enhancedTokenService.getExpiringTokens(days_before_expiry);

      // Filter by event
      tokensToRotate.tokens = tokensToRotate.tokens.filter(
        (t) => t.eventId === eventId
      );
    }

    if (tokensToRotate.tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron tokens que requieran rotación',
        rotated_count: 0,
        failed_count: 0,
      });
    }

    // Perform rotation
    console.log(
      `[${requestId}] Rotating ${tokensToRotate.tokens.length} tokens`
    );

    let rotatedCount = 0;
    let failedCount = 0;
    const rotationErrors: Array<{ tokenId: string; error: string }> = [];

    for (const oldToken of tokensToRotate.tokens) {
      try {
        // Generate new token based on type
        let newTokenData;
        if (
          oldToken.type === 'family_access' &&
          oldToken.studentIds &&
          oldToken.familyEmail
        ) {
          newTokenData = await enhancedTokenService.generateFamilyToken(
            oldToken.studentIds,
            oldToken.familyEmail,
            { rotateExisting: true }
          );
        } else if (
          oldToken.type === 'student_access' &&
          oldToken.studentIds?.[0]
        ) {
          newTokenData = await enhancedTokenService.generateStudentToken(
            oldToken.studentIds[0],
            { rotateExisting: true }
          );
        } else {
          throw new Error(
            `Unsupported token type for rotation: ${oldToken.type}`
          );
        }

        // Log rotation
        await supabase.from('token_rotation_history').insert({
          old_token_id: oldToken.id,
          new_token_id: newTokenData.id,
          rotation_reason,
          rotated_by: 'admin', // This would come from auth context
          family_notified: false, // Will be updated when notification is sent
        });

        rotatedCount++;

        // TODO: Queue family notification if requested
        if (notify_families && newTokenData.familyEmail) {
          console.log(
            `[${requestId}] Queuing notification for family: ${newTokenData.familyEmail}`
          );
        }
      } catch (error: any) {
        failedCount++;
        rotationErrors.push({
          tokenId: oldToken.id,
          error: error.message,
        });

        console.error(
          `[${requestId}] Failed to rotate token ${oldToken.id}:`,
          error.message
        );
      }
    }

    SecurityLogger.logSecurityEvent(
      'bulk_token_rotation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        rotationReason: rotation_reason,
        totalTokens: tokensToRotate.tokens.length,
        rotatedCount,
        failedCount,
        forceRotation: force_rotation,
        daysBeforeExpiry: days_before_expiry,
      },
      'info'
    );

    console.log(`[${requestId}] Token rotation completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalTokens: tokensToRotate.tokens.length,
      rotatedCount,
      failedCount,
    });

    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
        },
        rotation_summary: {
          tokens_found: tokensToRotate.tokens.length,
          rotated_count: rotatedCount,
          failed_count: failedCount,
          rotation_reason,
          force_rotation,
          days_before_expiry,
        },
        errors: rotationErrors,
        notifications_pending: notify_families ? rotatedCount : 0,
        rotated_at: new Date().toISOString(),
      },
      {
        headers: { 'X-Request-Id': requestId },
      }
    );
  } catch (error) {
    console.error('Error rotating tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
