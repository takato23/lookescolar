/**
 * QR Batch Processing API
 * 
 * Provides endpoints for batch QR code operations including generation,
 * validation, analytics, and data import/export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { qrBatchProcessingService } from '@/lib/services/qr-batch-processing.service';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { logger } from '@/lib/utils/logger';

// POST /api/qr/batch - Perform batch QR operations
async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate':
        return generateBatchQRCodes(params);
      
      case 'validate':
        return validateBatchQRCodes(params);
      
      case 'analytics':
        return getBatchAnalytics(params);
      
      case 'export':
        return exportQRCodes(params);
      
      case 'import':
        return importQRCodes(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use generate, validate, analytics, export, or import' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('qr_batch_api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/qr/batch - Get batch operation status or download exported data
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const batchId = searchParams.get('batchId');
    const format = searchParams.get('format') || 'json';

    if (action === 'export' && batchId) {
      // In a real implementation, you would retrieve the exported data by batchId
      // For now, we'll return a placeholder
      return NextResponse.json({
        message: 'Export data would be returned here',
        batchId,
        format,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('qr_batch_get_api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate QR codes in batch
 */
async function generateBatchQRCodes(params: any) {
  try {
    const result = await qrBatchProcessingService.generateBatchQRCodes(params);
    
    return NextResponse.json({
      success: true,
      action: 'generate',
      result,
    });
  } catch (error) {
    logger.error('batch_qr_generation_api_failed', {
      eventId: params.eventId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        action: 'generate',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate QR codes in batch
 */
async function validateBatchQRCodes(params: any) {
  try {
    const result = await qrBatchProcessingService.validateBatchQRCodes(params);
    
    return NextResponse.json({
      success: true,
      action: 'validate',
      result,
    });
  } catch (error) {
    logger.error('batch_qr_validation_api_failed', {
      eventId: params.eventId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        action: 'validate',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get batch analytics
 */
async function getBatchAnalytics(params: any) {
  try {
    const result = await qrBatchProcessingService.getBatchAnalytics(params);
    
    return NextResponse.json({
      success: true,
      action: 'analytics',
      result,
    });
  } catch (error) {
    logger.error('batch_qr_analytics_api_failed', {
      eventId: params.eventId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        action: 'analytics',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Export QR codes
 */
async function exportQRCodes(params: { eventId: string; format?: 'json' | 'csv' }) {
  try {
    const format = params.format || 'json';
    const exportedData = await qrBatchProcessingService.exportEventQRCodes(params.eventId, format);
    
    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    headers.set('Content-Disposition', `attachment; filename="qr_codes_${params.eventId}.${format}"`);
    
    return new NextResponse(exportedData, {
      headers,
      status: 200,
    });
  } catch (error) {
    logger.error('qr_export_api_failed', {
      eventId: params.eventId,
      format: params.format,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        action: 'export',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Import QR codes
 */
async function importQRCodes(params: { eventId: string; qrData: any[]; userId?: string }) {
  try {
    const result = await qrBatchProcessingService.importQRCodes(
      params.eventId, 
      params.qrData, 
      params.userId
    );
    
    return NextResponse.json({
      success: true,
      action: 'import',
      result,
    });
  } catch (error) {
    logger.error('qr_import_api_failed', {
      eventId: params.eventId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        action: 'import',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Wrap with authentication middleware
const authHandler = withAuth(async (request: NextRequest, context: any) => {
  // Check if user is admin
  if (!context.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Route based on method
  switch (request.method) {
    case 'GET':
      return GET(request);
    case 'POST':
      return POST(request);
    default:
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
  }
});

export { authHandler as GET, authHandler as POST };