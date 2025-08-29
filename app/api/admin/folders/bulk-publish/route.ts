import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const bulkPublishSchema = z.object({
  folder_ids: z.array(z.string().uuid()).min(1).max(20), // Max 20 folders at once
  action: z.enum(['publish', 'unpublish']).default('publish'),
  batch_size: z.number().min(1).max(10).optional().default(5),
  settings: z.object({
    allowDownload: z.boolean().optional().default(false),
    watermarkLevel: z.enum(['light', 'medium', 'heavy']).optional().default('medium'),
  }).optional().default({}),
});

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const requestStart = Date.now();
  console.time('[API] /admin/folders/bulk-publish');

  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const { folder_ids, action, batch_size, settings } = bulkPublishSchema.parse(body);

    console.log(`[API] Bulk ${action} operation:`, {
      folder_count: folder_ids.length,
      batch_size,
      requestId: `bulk_${Date.now()}`
    });

    // Get Supabase client
    const supabase = await createServerSupabaseServiceClient();

    let results;
    
    if (action === 'publish') {
      // Use optimized database function for bulk publish
      try {
        const { data: bulkResults, error: funcError } = await supabase
          .rpc('bulk_publish_folders', {
            p_folder_ids: folder_ids,
            p_batch_size: batch_size,
            p_settings: {
              ...settings,
              published_by: 'admin',
              publish_method: 'bulk_publish',
              published_at: new Date().toISOString(),
            }
          });

        if (funcError) {
          console.warn('[API] Bulk function error, using fallback:', funcError.message);
          throw funcError;
        }

        results = (bulkResults || []).map((result: any) => ({
          folder_id: result.folder_id,
          success: result.success,
          share_token: result.share_token,
          family_url: result.family_url ? `${request.headers.get('origin') || 'http://localhost:3000'}${result.family_url}` : null,
          qr_url: result.qr_url ? `${request.headers.get('origin') || 'http://localhost:3000'}${result.qr_url}` : null,
          error: result.error_message,
        }));
      } catch (funcError) {
        // Fallback: sequential processing with concurrency control
        console.log('[API] Using sequential fallback with concurrency control');
        results = await processSequentialBulk(supabase, folder_ids, 'publish', batch_size, settings, request);
      }
    } else {
      // Bulk unpublish
      results = await processSequentialBulk(supabase, folder_ids, 'unpublish', batch_size, {}, request);
    }

    // Performance logging
    const executionTime = Date.now() - requestStart;
    console.timeEnd('[API] /admin/folders/bulk-publish');

    const successCount = results.filter((r: any) => r.success).length;
    const errorCount = results.length - successCount;

    if (executionTime > 5000) {
      console.warn(`[PERF] Slow bulk operation: ${executionTime}ms for ${folder_ids.length} folders`);
    } else if (successCount === folder_ids.length && executionTime < 2000) {
      console.log(`[PERF] Fast bulk operation: ${executionTime}ms ✅`);
    }

    return NextResponse.json({
      success: true,
      total_processed: folder_ids.length,
      successful: successCount,
      failed: errorCount,
      execution_time_ms: executionTime,
      results,
    }, {
      headers: {
        'X-Response-Time': `${executionTime}ms`,
        'X-Operation-Type': `bulk-${action}`,
        'X-Batch-Size': batch_size.toString(),
        'X-Success-Rate': `${successCount}/${folder_ids.length}`,
      }
    });

  } catch (error) {
    const executionTime = Date.now() - requestStart;
    console.timeEnd('[API] /admin/folders/bulk-publish');
    console.error('[API] Bulk publish error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Fallback function for sequential processing with concurrency control
async function processSequentialBulk(
  supabase: any,
  folderIds: string[],
  action: 'publish' | 'unpublish',
  batchSize: number,
  settings: any,
  request: NextRequest
) {
  const results: any[] = [];
  const origin = request.headers.get('origin') || 'http://localhost:3000';

  // Process in batches to control concurrency
  for (let i = 0; i < folderIds.length; i += batchSize) {
    const batch = folderIds.slice(i, i + batchSize);
    
    // Process batch concurrently
    const batchPromises = batch.map(async (folderId) => {
      try {
        if (action === 'publish') {
          // Check if folder has photos and isn't already published
          const { data: folder, error: checkError } = await supabase
            .from('folders')
            .select('id, name, is_published, share_token')
            .eq('id', folderId)
            .single();

          if (checkError || !folder) {
            return {
              folder_id: folderId,
              success: false,
              error: 'Folder not found'
            };
          }

          if (folder.is_published && folder.share_token) {
            return {
              folder_id: folderId,
              success: true,
              share_token: folder.share_token,
              family_url: `${origin}/f/${folder.share_token}`,
              qr_url: `${origin}/api/qr?token=${folder.share_token}`,
              already_published: true
            };
          }

          // Check photo count (using photos table for now, will migrate to assets later)
          const { data: folderData } = await supabase
            .from('folders')
            .select('event_id')
            .eq('id', folderId)
            .single();
            
          const { count: photoCount } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', folderData?.event_id);

          // Allow publishing empty folders for testing (TODO: Add validation later)
          if (!photoCount || photoCount === 0) {
            console.log(`[DEBUG] Publishing empty folder ${folderId} for testing purposes`);
          }

          // Generate token and publish
          const shareToken = generateToken();
          const publishedAt = new Date().toISOString();

          const { error: publishError } = await supabase
            .from('folders')
            .update({
              is_published: true,
              share_token: shareToken,
              published_at: publishedAt,
              publish_settings: {
                ...settings,
                published_by: 'admin',
                publish_method: 'bulk_publish'
              }
            })
            .eq('id', folderId);

          if (publishError) {
            return {
              folder_id: folderId,
              success: false,
              error: publishError.message
            };
          }

          return {
            folder_id: folderId,
            success: true,
            share_token: shareToken,
            family_url: `${origin}/f/${shareToken}`,
            qr_url: `${origin}/api/qr?token=${shareToken}`,
            photo_count: photoCount
          };
        } else {
          // Unpublish
          const { error: unpublishError } = await supabase
            .from('folders')
            .update({
              is_published: false,
              share_token: null,
              published_at: null,
              publish_settings: null
            })
            .eq('id', folderId);

          if (unpublishError) {
            return {
              folder_id: folderId,
              success: false,
              error: unpublishError.message
            };
          }

          return {
            folder_id: folderId,
            success: true,
            unpublished_at: new Date().toISOString()
          };
        }
      } catch (error) {
        return {
          folder_id: folderId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results and add delay between batches
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          folder_id: 'unknown',
          success: false,
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });

    // Small delay between batches to prevent overwhelming the database
    if (i + batchSize < folderIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Simple token generator
function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Export handler with admin authentication middleware
export const POST = withAdminAuth(handlePOST);