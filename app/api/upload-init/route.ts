import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { tenantPlanServiceFactory } from '@/lib/services/tenant-plan.service';
import { PlanLimitError } from '@/lib/errors/plan-limit-error';
import crypto from 'crypto';

// Validation schema
const UploadInitSchema = z.object({
  folderId: z.string().uuid(),
  files: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        size: z
          .number()
          .int()
          .min(1)
          .max(50 * 1024 * 1024), // 50MB max
        type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
        checksum: z.string().optional(), // SHA-256 hex string
      })
    )
    .min(1)
    .max(100), // Max 100 files per batch
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { folderId, files } = UploadInitSchema.parse(body);

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verify admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify folder exists and user has access
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, path, event_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tenant_id')
      .eq('id', folder.event_id)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Evento relacionado no encontrado' },
        { status: 404 }
      );
    }

    const planService = tenantPlanServiceFactory(supabase);
    await planService.assertCanUploadPhotos({
      tenantId: event.tenant_id,
      eventId: event.id,
      additionalPhotos: files.length,
    });

    // Check for duplicate checksums if provided
    const providedChecksums = files
      .map((f) => f.checksum)
      .filter(Boolean) as string[];

    let existingAssets: any[] = [];
    if (providedChecksums.length > 0) {
      const { data: existing } = await supabase
        .from('assets')
        .select('checksum, original_filename, folder_id')
        .in('checksum', providedChecksums);

      existingAssets = existing || [];
    }

    // Generate upload data for each file
    const uploadData = await Promise.all(
      files.map(async (file, index) => {
        // Check if file already exists by checksum
        const existingAsset = existingAssets.find(
          (a) => a.checksum === file.checksum
        );
        if (existingAsset) {
          return {
            filename: file.filename,
            status: 'duplicate',
            message: `File already exists: ${existingAsset.original_filename}`,
            existingAssetId: existingAsset.id,
          };
        }

        // Generate unique storage path
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uniqueId = crypto.randomUUID();
        const extension = file.filename.split('.').pop();
        const storagePath = `folder-${folderId}/${year}/${month}/${uniqueId}.${extension}`;

        // Generate signed URL for direct upload to originals bucket
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('originals')
          .createSignedUploadUrl(storagePath, {
            expiresIn: 3600, // 1 hour
            upsert: false,
          });

        if (urlError) {
          console.error('Error generating signed URL:', urlError);
          return {
            filename: file.filename,
            status: 'error',
            error: 'Failed to generate upload URL',
          };
        }

        return {
          filename: file.filename,
          status: 'ready',
          uploadUrl: signedUrl.signedUrl,
          storagePath,
          uploadId: uniqueId,
        };
      })
    );

    // Count successful uploads
    const readyUploads = uploadData.filter((u) => u.status === 'ready');
    const duplicates = uploadData.filter((u) => u.status === 'duplicate');
    const errors = uploadData.filter((u) => u.status === 'error');

    return NextResponse.json({
      success: true,
      folderId,
      folderName: folder.name,
      folderPath: folder.path,
      uploads: uploadData,
      summary: {
        total: files.length,
        ready: readyUploads.length,
        duplicates: duplicates.length,
        errors: errors.length,
      },
    });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'PLAN_LIMIT_EXCEEDED',
          details: error.details,
        },
        { status: 403 }
      );
    }

    console.error('Upload init error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
