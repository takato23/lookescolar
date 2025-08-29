import { NextRequest, NextResponse } from 'next/server';
import {
  enhancedTokenService,
  TokenValidationResult,
} from '@/lib/services/enhanced-token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 50, // Max 50 validation attempts per IP per window
  blockDurationMs: 60 * 60 * 1000, // 1 hour block for excessive attempts
};

interface EnhancedTokenValidationResponse {
  valid: boolean;
  access_level: 'none' | 'student' | 'family' | 'group' | 'event';
  token_type?: string;
  expires_in_days?: number;
  warnings?: string[];

  // Student access data
  student?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
      school_name?: string;
    };
  };

  // Family access data
  family?: {
    email: string;
    students: Array<{
      id: string;
      name: string;
    }>;
    event: {
      id: string;
      name: string;
      school_name?: string;
    };
  };

  // Access permissions
  permissions?: {
    can_view_photos: boolean;
    can_download_previews: boolean;
    can_purchase: boolean;
    can_share: boolean;
    max_devices: number;
    device_fingerprint_required: boolean;
  };

  // Security information
  security?: {
    device_registered: boolean;
    ip_address: string;
    access_logged: boolean;
    usage_count: number;
    last_access?: string;
  };

  error?: string;
  error_code?:
    | 'INVALID_TOKEN'
    | 'EXPIRED_TOKEN'
    | 'INACTIVE_TOKEN'
    | 'EVENT_INACTIVE'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR';
}

/**
 * GET /api/family/validate-token/enhanced/[token]
 * Enhanced token validation with comprehensive access control and security logging
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<EnhancedTokenValidationResponse>> {
  const requestId = generateRequestId();
  let clientIP: string;
  let userAgent: string;

  try {
    const { token } = await params;

    // Extract client information for security logging
    clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`[${requestId}] Enhanced token validation requested:`, {
      token: `${token.slice(0, 8)}***`,
      clientIP: clientIP.replace(/\d+$/g, 'xxx'), // Mask last octet for privacy
      userAgent: userAgent.substring(0, 50) + '...',
    });

    // Basic token format validation
    if (!token || token.length < 20) {
      const response: EnhancedTokenValidationResponse = {
        valid: false,
        access_level: 'none',
        error: 'Formato de token inválido',
        error_code: 'INVALID_TOKEN',
      };

      SecurityLogger.logSecurityEvent(
        'invalid_token_format',
        {
          requestId,
          token: `${token?.slice(0, 8) || 'null'}***`,
          clientIP: clientIP.replace(/\d+$/g, 'xxx'),
          userAgent: userAgent.substring(0, 100),
        },
        'warning'
      );

      return NextResponse.json(response, { status: 400 });
    }

    // TODO: Implement rate limiting check here
    // const rateLimitResult = await checkRateLimit(clientIP);
    // if (rateLimitResult.blocked) { ... }

    // Validate token using enhanced service
    const validationResult: TokenValidationResult =
      await enhancedTokenService.validateToken(token);

    if (!validationResult.isValid) {
      const response: EnhancedTokenValidationResponse = {
        valid: false,
        access_level: 'none',
        error: 'Token no válido o expirado',
        error_code: 'INVALID_TOKEN',
      };

      SecurityLogger.logSecurityEvent(
        'token_validation_failed',
        {
          requestId,
          token: `${token.slice(0, 8)}***`,
          clientIP: clientIP.replace(/\d+$/g, 'xxx'),
          reason: 'invalid_or_expired',
        },
        'warning'
      );

      return NextResponse.json(response, { status: 401 });
    }

    // Token is valid - extract information
    const tokenData = validationResult.token!;
    const students = validationResult.students || [];
    const event = validationResult.event;

    if (!event) {
      const response: EnhancedTokenValidationResponse = {
        valid: false,
        access_level: 'none',
        error: 'Evento asociado no encontrado',
        error_code: 'EVENT_INACTIVE',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if event is active
    if (event.status !== 'active') {
      const response: EnhancedTokenValidationResponse = {
        valid: false,
        access_level: 'none',
        error: 'El evento no está disponible actualmente',
        error_code: 'EVENT_INACTIVE',
      };

      SecurityLogger.logSecurityEvent(
        'inactive_event_access_attempt',
        {
          requestId,
          token: `${token.slice(0, 8)}***`,
          eventId: `${event.id.substring(0, 8)}***`,
          eventStatus: event.status,
          clientIP: clientIP.replace(/\d+$/g, 'xxx'),
        },
        'info'
      );

      return NextResponse.json(response, { status: 403 });
    }

    // Log successful access
    const supabase = await createServerSupabaseServiceClient();
    await supabase.from('token_access_log').insert({
      token_id: tokenData.id,
      accessed_at: new Date().toISOString(),
      ip_address: clientIP,
      user_agent: userAgent,
      access_granted: true,
      metadata: {
        request_id: requestId,
        validation_type: 'enhanced',
        token_type: tokenData.type,
      },
    });

    // Determine permissions based on token type and access rules
    const permissions = {
      can_view_photos: true,
      can_download_previews: tokenData.type !== 'temporary_access',
      can_purchase: ['student_access', 'family_access'].includes(
        tokenData.type
      ),
      can_share: tokenData.type === 'family_access',
      max_devices: tokenData.accessRules?.maxDevices || 3,
      device_fingerprint_required: tokenData.accessRules?.maxDevices
        ? tokenData.accessRules.maxDevices < 5
        : false,
    };

    // Build response based on access level
    let response: EnhancedTokenValidationResponse;

    if (validationResult.accessLevel === 'family' && tokenData.familyEmail) {
      // Family access response
      response = {
        valid: true,
        access_level: 'family',
        token_type: tokenData.type,
        expires_in_days: validationResult.expiresInDays,
        warnings: validationResult.warnings,

        family: {
          email: tokenData.familyEmail,
          students: students.map((s) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
          })),
          event: {
            id: event.id,
            name: event.name,
            school_name: event.school_name || undefined,
          },
        },

        permissions,

        security: {
          device_registered: false, // TODO: Implement device fingerprinting
          ip_address: clientIP.replace(/\d+$/g, 'xxx'), // Masked for privacy
          access_logged: true,
          usage_count: tokenData.metadata.usage_count || 0,
          last_access: tokenData.metadata.last_used_at,
        },
      };
    } else if (
      validationResult.accessLevel === 'student' &&
      validationResult.student
    ) {
      // Student access response
      const student = validationResult.student;
      response = {
        valid: true,
        access_level: 'student',
        token_type: tokenData.type,
        expires_in_days: validationResult.expiresInDays,
        warnings: validationResult.warnings,

        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          event: {
            id: event.id,
            name: event.name,
            school_name: event.school_name || undefined,
          },
        },

        permissions,

        security: {
          device_registered: false,
          ip_address: clientIP.replace(/\d+$/g, 'xxx'),
          access_logged: true,
          usage_count: tokenData.metadata.usage_count || 0,
          last_access: tokenData.metadata.last_used_at,
        },
      };
    } else {
      // Generic access response
      response = {
        valid: true,
        access_level: validationResult.accessLevel,
        token_type: tokenData.type,
        expires_in_days: validationResult.expiresInDays,
        warnings: validationResult.warnings,
        permissions,
        security: {
          device_registered: false,
          ip_address: clientIP.replace(/\d+$/g, 'xxx'),
          access_logged: true,
          usage_count: tokenData.metadata.usage_count || 0,
        },
      };
    }

    SecurityLogger.logSecurityEvent(
      'token_validation_successful',
      {
        requestId,
        token: `${token.slice(0, 8)}***`,
        tokenType: tokenData.type,
        accessLevel: validationResult.accessLevel,
        eventId: `${event.id.substring(0, 8)}***`,
        eventName: event.name,
        familyEmail: tokenData.familyEmail
          ? `${tokenData.familyEmail?.split('@')[0]}***@${tokenData.familyEmail?.split('@')[1]}`
          : null,
        studentCount: students.length,
        clientIP: clientIP.replace(/\d+$/g, 'xxx'),
        expiresInDays: validationResult.expiresInDays,
        warnings: validationResult.warnings?.length || 0,
      },
      'info'
    );

    console.log(`[${requestId}] Enhanced token validation successful:`, {
      token: `${token.slice(0, 8)}***`,
      accessLevel: validationResult.accessLevel,
      tokenType: tokenData.type,
      studentCount: students.length,
      expiresInDays: validationResult.expiresInDays,
    });

    return NextResponse.json(response, {
      headers: {
        'X-Request-Id': requestId,
        'X-Token-Type': tokenData.type,
        'X-Access-Level': validationResult.accessLevel,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Enhanced token validation error:`, error);

    SecurityLogger.logSecurityEvent(
      'token_validation_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP: clientIP?.replace(/\d+$/g, 'xxx') || 'unknown',
      },
      'error'
    );

    const errorResponse: EnhancedTokenValidationResponse = {
      valid: false,
      access_level: 'none',
      error: 'Error interno del servidor',
      error_code: 'SERVER_ERROR',
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
}

/**
 * POST /api/family/validate-token/enhanced/[token]
 * Enhanced token validation with device registration and additional security context
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<EnhancedTokenValidationResponse>> {
  const requestId = generateRequestId();

  try {
    const { token } = await params;
    const body = await request.json();

    // Extract device fingerprint and additional security context
    const {
      device_fingerprint,
      screen_resolution,
      timezone,
      language,
      platform,
      register_device = false,
    } = body;

    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(
      `[${requestId}] Enhanced token validation with device context:`,
      {
        token: `${token.slice(0, 8)}***`,
        hasDeviceFingerprint: !!device_fingerprint,
        registerDevice: register_device,
      }
    );

    // First perform standard validation
    const validationResult: TokenValidationResult =
      await enhancedTokenService.validateToken(token);

    if (!validationResult.isValid) {
      const response: EnhancedTokenValidationResponse = {
        valid: false,
        access_level: 'none',
        error: 'Token no válido o expirado',
        error_code: 'INVALID_TOKEN',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const tokenData = validationResult.token!;
    const supabase = await createServerSupabaseServiceClient();

    // Enhanced security logging with device context
    await supabase.from('token_access_log').insert({
      token_id: tokenData.id,
      accessed_at: new Date().toISOString(),
      ip_address: clientIP,
      user_agent: userAgent,
      device_fingerprint: device_fingerprint,
      access_granted: true,
      metadata: {
        request_id: requestId,
        validation_type: 'enhanced_with_device',
        token_type: tokenData.type,
        screen_resolution,
        timezone,
        language,
        platform,
        register_device,
      },
    });

    // Check device limits if enforced
    const maxDevices = tokenData.accessRules?.maxDevices;
    let deviceRegistered = false;
    let deviceLimitExceeded = false;

    if (maxDevices && device_fingerprint) {
      // Get unique device count for this token
      const { data: deviceLogs } = await supabase
        .from('token_access_log')
        .select('device_fingerprint')
        .eq('token_id', tokenData.id)
        .eq('access_granted', true)
        .not('device_fingerprint', 'is', null);

      const uniqueDevices = new Set(
        (deviceLogs || []).map((log) => log.device_fingerprint)
      );

      deviceRegistered = uniqueDevices.has(device_fingerprint);
      deviceLimitExceeded =
        !deviceRegistered && uniqueDevices.size >= maxDevices;

      if (deviceLimitExceeded && !register_device) {
        SecurityLogger.logSecurityEvent(
          'device_limit_exceeded',
          {
            requestId,
            token: `${token.slice(0, 8)}***`,
            deviceFingerprint: `${device_fingerprint?.slice(0, 8)}***`,
            uniqueDevices: uniqueDevices.size,
            maxDevices,
            clientIP: clientIP.replace(/\d+$/g, 'xxx'),
          },
          'warning'
        );

        const response: EnhancedTokenValidationResponse = {
          valid: false,
          access_level: 'none',
          error: `Se ha alcanzado el límite máximo de ${maxDevices} dispositivos para este token`,
          error_code: 'RATE_LIMITED',
        };
        return NextResponse.json(response, { status: 429 });
      }
    }

    // Build enhanced response with device information
    const response = await buildValidationResponse(
      validationResult,
      tokenData,
      {
        clientIP,
        deviceFingerprint: device_fingerprint,
        deviceRegistered,
        deviceLimitExceeded: false, // If we got here, limit wasn't exceeded
        requestId,
      }
    );

    SecurityLogger.logSecurityEvent(
      'enhanced_token_validation_with_device',
      {
        requestId,
        token: `${token.slice(0, 8)}***`,
        tokenType: tokenData.type,
        accessLevel: validationResult.accessLevel,
        deviceFingerprint: device_fingerprint
          ? `${device_fingerprint.slice(0, 8)}***`
          : null,
        deviceRegistered,
        registerDevice: register_device,
        maxDevices,
        clientIP: clientIP.replace(/\d+$/g, 'xxx'),
      },
      'info'
    );

    return NextResponse.json(response, {
      headers: {
        'X-Request-Id': requestId,
        'X-Token-Type': tokenData.type,
        'X-Device-Registered': deviceRegistered.toString(),
        'X-Access-Level': validationResult.accessLevel,
      },
    });
  } catch (error) {
    console.error(
      `[${requestId}] Enhanced token validation with device error:`,
      error
    );

    const errorResponse: EnhancedTokenValidationResponse = {
      valid: false,
      access_level: 'none',
      error: 'Error interno del servidor',
      error_code: 'SERVER_ERROR',
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
}

// Helper function to build consistent validation responses
async function buildValidationResponse(
  validationResult: TokenValidationResult,
  tokenData: any,
  securityContext: {
    clientIP: string;
    deviceFingerprint?: string;
    deviceRegistered: boolean;
    deviceLimitExceeded: boolean;
    requestId: string;
  }
): Promise<EnhancedTokenValidationResponse> {
  const students = validationResult.students || [];
  const event = validationResult.event!;

  const permissions = {
    can_view_photos: true,
    can_download_previews: tokenData.type !== 'temporary_access',
    can_purchase: ['student_access', 'family_access'].includes(tokenData.type),
    can_share: tokenData.type === 'family_access',
    max_devices: tokenData.accessRules?.maxDevices || 3,
    device_fingerprint_required: !!tokenData.accessRules?.maxDevices,
  };

  const security = {
    device_registered: securityContext.deviceRegistered,
    ip_address: securityContext.clientIP.replace(/\d+$/g, 'xxx'),
    access_logged: true,
    usage_count: tokenData.metadata?.usage_count || 0,
    last_access: tokenData.metadata?.last_used_at,
  };

  if (validationResult.accessLevel === 'family' && tokenData.familyEmail) {
    return {
      valid: true,
      access_level: 'family',
      token_type: tokenData.type,
      expires_in_days: validationResult.expiresInDays,
      warnings: validationResult.warnings,

      family: {
        email: tokenData.familyEmail,
        students: students.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
        })),
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name || undefined,
        },
      },

      permissions,
      security,
    };
  } else if (
    validationResult.accessLevel === 'student' &&
    validationResult.student
  ) {
    const student = validationResult.student;
    return {
      valid: true,
      access_level: 'student',
      token_type: tokenData.type,
      expires_in_days: validationResult.expiresInDays,
      warnings: validationResult.warnings,

      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name || undefined,
        },
      },

      permissions,
      security,
    };
  }

  // Generic response
  return {
    valid: true,
    access_level: validationResult.accessLevel,
    token_type: tokenData.type,
    expires_in_days: validationResult.expiresInDays,
    warnings: validationResult.warnings,
    permissions,
    security,
  };
}
