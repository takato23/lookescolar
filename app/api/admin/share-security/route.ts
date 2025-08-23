import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// GET /admin/share-security - Get security overview and suspicious activity
export const GET = withAuth(async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const tokenId = searchParams.get('tokenId');
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24');

    logger.info('Share security request', {
      requestId,
      action,
      tokenId: tokenId?.substring(0, 8) + '...',
      hoursBack,
    });

    const supabase = await createServerSupabaseServiceClient();

    switch (action) {
      case 'analytics':
        if (!tokenId) {
          return NextResponse.json(
            { success: false, error: 'Token ID is required for analytics' },
            { status: 400 }
          );
        }

        const analytics = await shareTokenSecurity.getTokenAnalytics(tokenId);
        return NextResponse.json({
          success: true,
          analytics,
        });

      case 'suspicious-activity':
        // Get suspicious activity from database function
        const { data: suspiciousActivity, error: suspiciousError } = await supabase
          .rpc('get_suspicious_share_activity', { hours_back: Math.min(hoursBack, 168) }); // Max 7 days

        if (suspiciousError) {
          throw suspiciousError;
        }

        return NextResponse.json({
          success: true,
          suspiciousActivity: suspiciousActivity || [],
          hoursBack,
        });

      case 'overview':
      default:
        // Get general security overview
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Get recent access attempts
        const { data: recentAccesses, error: accessError } = await supabase
          .from('share_access_log')
          .select('*')
          .gte('timestamp', oneDayAgo)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (accessError) {
          throw accessError;
        }

        // Get access statistics
        const { data: dailyStats } = await supabase
          .from('share_access_log')
          .select('success, count(*)')
          .gte('timestamp', oneDayAgo)
          .group('success');

        const { data: weeklyStats } = await supabase
          .from('share_access_log')
          .select('success, count(*)')
          .gte('timestamp', oneWeekAgo)
          .group('success');

        // Get active tokens count
        const { count: activeTokens } = await supabase
          .from('share_tokens')
          .select('*', { count: 'exact', head: true })
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        // Process statistics
        const processStats = (stats: any[]) => {
          const successful = stats?.find(s => s.success)?.count || 0;
          const failed = stats?.find(s => !s.success)?.count || 0;
          return { successful, failed, total: successful + failed };
        };

        const dailyAccessStats = processStats(dailyStats || []);
        const weeklyAccessStats = processStats(weeklyStats || []);

        return NextResponse.json({
          success: true,
          overview: {
            activeTokens: activeTokens || 0,
            recentAccesses: recentAccesses || [],
            dailyStats: dailyAccessStats,
            weeklyStats: weeklyAccessStats,
          },
        });
    }

  } catch (error) {
    logger.error('Error in share security endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /admin/share-security - Revoke tokens or perform security actions
export const POST = withAuth(async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { action, tokenId, reason } = body;

    logger.info('Share security action request', {
      requestId,
      action,
      tokenId: tokenId?.substring(0, 8) + '...',
      reason,
    });

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'revoke-token':
        if (!tokenId || typeof tokenId !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Token ID is required for revocation' },
            { status: 400 }
          );
        }

        const revocationReason = reason || 'Manual revocation by admin';
        const revokeResult = await shareTokenSecurity.revokeToken(tokenId, revocationReason);

        if (!revokeResult.success) {
          return NextResponse.json(
            { success: false, error: revokeResult.error },
            { status: 400 }
          );
        }

        logger.info('Share token revoked by admin', {
          requestId,
          tokenId,
          reason: revocationReason,
        });

        return NextResponse.json({
          success: true,
          message: 'Share token revoked successfully',
        });

      case 'cleanup-expired':
        const cleanupResult = await shareTokenSecurity.cleanupExpiredData();

        logger.info('Expired share data cleaned up', {
          requestId,
          deletedTokens: cleanupResult.deletedTokens,
          deletedLogs: cleanupResult.deletedLogs,
        });

        return NextResponse.json({
          success: true,
          message: 'Expired data cleaned up successfully',
          cleanup: cleanupResult,
        });

      case 'block-ip':
        // For now, we'll just log this action
        // In a production environment, you might want to integrate with a firewall or rate limiter
        const { ip } = body;
        
        if (!ip || typeof ip !== 'string') {
          return NextResponse.json(
            { success: false, error: 'IP address is required' },
            { status: 400 }
          );
        }

        logger.warn('IP block requested by admin', {
          requestId,
          ip,
          reason: reason || 'Suspicious activity',
        });

        // TODO: Implement actual IP blocking mechanism
        // This could involve:
        // 1. Adding to a blocked IPs table
        // 2. Integrating with Cloudflare or other CDN
        // 3. Updating firewall rules

        return NextResponse.json({
          success: true,
          message: 'IP block request logged (implementation pending)',
          action: 'logged',
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Error in share security action endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});