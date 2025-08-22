import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { distributionService, DistributionMethod } from '@/lib/services/distribution.service';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const DistributionRequestSchema = z.object({
  method: z.enum(['email', 'whatsapp', 'sms', 'print', 'direct']),
  token_type: z.enum(['student_access', 'family_access']).default('family_access'),
  template_id: z.string().optional(),
  custom_message: z.string().max(500).optional(),
  auto_send: z.boolean().default(true),
  dry_run: z.boolean().default(false),
  schedule_at: z.string().datetime().optional(),
  notification_preferences: z.object({
    send_confirmation: z.boolean().default(true),
    track_opens: z.boolean().default(true),
    send_reminders: z.boolean().default(true)
  }).optional()
});

const BulkDistributionSchema = z.object({
  token_ids: z.array(z.string().uuid()).min(1).max(1000),
  method: z.enum(['email', 'whatsapp', 'sms', 'print', 'direct']),
  template_id: z.string().optional(),
  custom_message: z.string().max(500).optional(),
  schedule_at: z.string().datetime().optional(),
  dry_run: z.boolean().default(false)
});

const ExpiryWarningsSchema = z.object({
  days_before_expiry: z.number().min(1).max(30).default(7),
  auto_rotate_critical: z.boolean().default(true),
  notification_method: z.enum(['email', 'whatsapp', 'sms']).default('email'),
  dry_run: z.boolean().default(false)
});

// ============================================================
// GET - Distribution History and Statistics
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const requestId = generateRequestId();
    const { searchParams } = new URL(request.url);
    
    const includeStats = searchParams.get('include_stats') === 'true';
    const includeLogs = searchParams.get('include_logs') === 'true';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    console.log(`[${requestId}] Getting distribution data for event:`, { 
      eventId: `${eventId.substring(0, 8)}***`,
      includeStats,
      includeLogs
    });

    // Validate event ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, date, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Base response
    const response: any = {
      success: true,
      event: {
        id: event.id,
        name: event.name,
        school_name: event.school_name,
        date: event.date,
        status: event.status
      }
    };

    // Get distribution statistics if requested
    if (includeStats) {
      let statsQuery = supabase
        .from('token_distribution_log')
        .select(`
          distribution_method,
          status,
          distributed_at,
          token_id,
          enhanced_tokens!inner (
            event_id,
            type
          )
        `)
        .eq('enhanced_tokens.event_id', eventId);

      if (dateFrom) {
        statsQuery = statsQuery.gte('distributed_at', dateFrom);
      }
      if (dateTo) {
        statsQuery = statsQuery.lte('distributed_at', dateTo);
      }

      const { data: distributionLogs } = await statsQuery;

      // Calculate statistics
      const stats = {
        total_distributions: distributionLogs?.length || 0,
        by_method: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        by_token_type: {} as Record<string, number>,
        success_rate: 0,
        last_distribution: null as string | null,
        date_range: {
          from: dateFrom || null,
          to: dateTo || null
        }
      };

      if (distributionLogs) {
        // Group by method
        stats.by_method = distributionLogs.reduce((acc, log) => {
          acc[log.distribution_method] = (acc[log.distribution_method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Group by status
        stats.by_status = distributionLogs.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Group by token type
        stats.by_token_type = distributionLogs.reduce((acc, log) => {
          const tokenType = (log as any).enhanced_tokens?.type || 'unknown';
          acc[tokenType] = (acc[tokenType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate success rate
        const successfulDeliveries = (stats.by_status['sent'] || 0) + 
                                   (stats.by_status['delivered'] || 0) + 
                                   (stats.by_status['opened'] || 0);
        stats.success_rate = stats.total_distributions > 0 ? 
          Math.round((successfulDeliveries / stats.total_distributions) * 100) : 0;

        // Get last distribution date
        const lastLog = distributionLogs.sort((a, b) => 
          new Date(b.distributed_at).getTime() - new Date(a.distributed_at).getTime()
        )[0];
        stats.last_distribution = lastLog?.distributed_at || null;
      }

      response.statistics = stats;
    }

    // Get distribution logs if requested
    if (includeLogs) {
      let logsQuery = supabase
        .from('token_distribution_log')
        .select(`
          id,
          distribution_method,
          recipient_contact,
          distributed_by,
          status,
          distributed_at,
          status_updated_at,
          metadata,
          enhanced_tokens!inner (
            id,
            type,
            family_email,
            student_ids,
            event_id
          )
        `)
        .eq('enhanced_tokens.event_id', eventId)
        .order('distributed_at', { ascending: false });

      if (dateFrom) {
        logsQuery = logsQuery.gte('distributed_at', dateFrom);
      }
      if (dateTo) {
        logsQuery = logsQuery.lte('distributed_at', dateTo);
      }

      // Limit to recent logs to avoid overwhelming response
      logsQuery = logsQuery.limit(100);

      const { data: logs } = await logsQuery;

      response.distribution_logs = (logs || []).map(log => ({
        id: log.id,
        method: log.distribution_method,
        recipient: log.recipient_contact,
        status: log.status,
        distributed_at: log.distributed_at,
        distributed_by: log.distributed_by,
        token_type: (log as any).enhanced_tokens?.type,
        token_id: (log as any).enhanced_tokens?.id,
        metadata: {
          dry_run: log.metadata?.dry_run || false,
          request_id: log.metadata?.request_id
        }
      }));
    }

    // Get current token summary
    const { data: tokenSummary } = await supabase
      .from('enhanced_tokens')
      .select('type, is_active, expires_at')
      .eq('event_id', eventId);

    if (tokenSummary) {
      const now = new Date();
      response.token_summary = {
        total_tokens: tokenSummary.length,
        active_tokens: tokenSummary.filter(t => t.is_active && new Date(t.expires_at) > now).length,
        expired_tokens: tokenSummary.filter(t => new Date(t.expires_at) <= now).length,
        by_type: tokenSummary.reduce((acc, token) => {
          acc[token.type] = (acc[token.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    }

    SecurityLogger.logSecurityEvent(
      'distribution_data_accessed',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        includeStats,
        includeLogs,
        dateRange: { dateFrom, dateTo }
      },
      'info'
    );

    console.log(`[${requestId}] Distribution data retrieved:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      includeStats,
      includeLogs,
      tokenCount: response.token_summary?.total_tokens || 0
    });

    return NextResponse.json(response, {
      headers: { 'X-Request-Id': requestId }
    });

  } catch (error) {
    console.error('Error getting distribution data:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Generate and Distribute Tokens
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Distribution request for event:`, { 
      eventId: `${eventId.substring(0, 8)}***` 
    });

    // Validate event ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = DistributionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos de solicitud inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      method,
      token_type,
      template_id,
      custom_message,
      auto_send,
      dry_run,
      schedule_at,
      notification_preferences
    } = validationResult.data;

    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists and is active
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'El evento debe estar activo para generar distribuciones' },
        { status: 400 }
      );
    }

    // Handle scheduled distribution
    if (schedule_at) {
      const scheduledDate = new Date(schedule_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'La fecha de programación debe ser futura' },
          { status: 400 }
        );
      }

      // TODO: Implement scheduled job system
      console.log(`[${requestId}] Scheduled distribution for:`, scheduledDate);
      
      return NextResponse.json({
        success: true,
        message: 'Distribución programada exitosamente',
        scheduled_at: schedule_at,
        request_id: requestId
      });
    }

    console.log(`[${requestId}] Generating event distribution:`, {
      method,
      tokenType: token_type,
      autoSend: auto_send,
      dryRun: dry_run
    });

    // Generate and distribute tokens
    const distributionResult = await distributionService.generateEventDistribution(
      eventId,
      method as DistributionMethod,
      {
        token_type,
        custom_message,
        template_id,
        dry_run,
        auto_send
      }
    );

    SecurityLogger.logSecurityEvent(
      'event_distribution_generated',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        method,
        tokenType: token_type,
        tokensGenerated: distributionResult.tokens_generated,
        distributionsSent: distributionResult.distributions_sent,
        dryRun: dry_run,
        autoSend: auto_send
      },
      'info'
    );

    console.log(`[${requestId}] Event distribution completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      tokensGenerated: distributionResult.tokens_generated,
      distributionsSent: distributionResult.distributions_sent
    });

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        school_name: event.school_name
      },
      results: {
        tokens_generated: distributionResult.tokens_generated,
        distributions_sent: distributionResult.distributions_sent,
        method,
        token_type,
        dry_run
      },
      summary: distributionResult.summary,
      request_id: requestId,
      generated_at: new Date().toISOString()
    }, {
      headers: { 'X-Request-Id': requestId }
    });

  } catch (error) {
    console.error('Error generating distribution:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Bulk Distribute Existing Tokens
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Bulk distribution request for event:`, { 
      eventId: `${eventId.substring(0, 8)}***` 
    });

    const body = await request.json();
    const validationResult = BulkDistributionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos de solicitud inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      token_ids,
      method,
      template_id,
      custom_message,
      schedule_at,
      dry_run
    } = validationResult.data;

    const supabase = await createServerSupabaseServiceClient();

    // Verify tokens belong to this event
    const { data: tokens } = await supabase
      .from('enhanced_tokens')
      .select('id, event_id')
      .in('id', token_ids)
      .eq('event_id', eventId);

    if (!tokens || tokens.length !== token_ids.length) {
      return NextResponse.json(
        { error: 'Algunos tokens no pertenecen a este evento' },
        { status: 400 }
      );
    }

    // Handle scheduled distribution
    if (schedule_at) {
      const scheduledDate = new Date(schedule_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'La fecha de programación debe ser futura' },
          { status: 400 }
        );
      }

      // TODO: Implement scheduled job system
      return NextResponse.json({
        success: true,
        message: 'Distribución programada exitosamente',
        scheduled_at: schedule_at,
        token_count: token_ids.length
      });
    }

    console.log(`[${requestId}] Distributing existing tokens:`, {
      tokenCount: token_ids.length,
      method,
      dryRun: dry_run
    });

    // Distribute tokens
    const distributionResult = await distributionService.distributeTokens({
      token_ids,
      method: method as DistributionMethod,
      template_id,
      custom_message,
      dry_run
    });

    SecurityLogger.logSecurityEvent(
      'bulk_token_distribution',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        method,
        tokenCount: token_ids.length,
        successful: distributionResult.successful,
        failed: distributionResult.failed,
        dryRun: dry_run
      },
      'info'
    );

    console.log(`[${requestId}] Bulk distribution completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalRequested: distributionResult.total_requested,
      successful: distributionResult.successful,
      failed: distributionResult.failed
    });

    return NextResponse.json({
      success: true,
      results: {
        total_requested: distributionResult.total_requested,
        successful: distributionResult.successful,
        failed: distributionResult.failed,
        skipped: distributionResult.skipped,
        method,
        dry_run
      },
      distribution_logs: distributionResult.distribution_logs.map(log => ({
        token_id: log.token_id,
        recipient: log.recipient,
        status: log.status,
        message: log.message
      })),
      errors: distributionResult.errors,
      request_id: requestId,
      distributed_at: new Date().toISOString()
    }, {
      headers: { 'X-Request-Id': requestId }
    });

  } catch (error) {
    console.error('Error in bulk distribution:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH - Send Expiry Warnings
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Expiry warnings request for event:`, { 
      eventId: `${eventId.substring(0, 8)}***` 
    });

    const body = await request.json();
    const validationResult = ExpiryWarningsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos de solicitud inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      days_before_expiry,
      auto_rotate_critical,
      notification_method,
      dry_run
    } = validationResult.data;

    // Send expiry warnings
    const warningsResult = await distributionService.sendExpiryWarnings(days_before_expiry);

    SecurityLogger.logSecurityEvent(
      'expiry_warnings_sent',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        daysBeforeExpiry: days_before_expiry,
        warningsSent: warningsResult.warnings_sent,
        tokensRotated: warningsResult.tokens_rotated,
        errorsCount: warningsResult.errors.length,
        dryRun: dry_run
      },
      'info'
    );

    console.log(`[${requestId}] Expiry warnings completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      warningsSent: warningsResult.warnings_sent,
      tokensRotated: warningsResult.tokens_rotated
    });

    return NextResponse.json({
      success: true,
      results: {
        warnings_sent: warningsResult.warnings_sent,
        tokens_rotated: warningsResult.tokens_rotated,
        days_before_expiry,
        notification_method,
        auto_rotate_critical,
        dry_run
      },
      errors: warningsResult.errors,
      request_id: requestId,
      processed_at: new Date().toISOString()
    }, {
      headers: { 'X-Request-Id': requestId }
    });

  } catch (error) {
    console.error('Error sending expiry warnings:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}