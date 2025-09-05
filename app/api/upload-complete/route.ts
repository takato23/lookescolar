import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema
const UploadCompleteSchema = z.object({
  folderId: z.string().uuid(),
  uploads: z
    .array(
      z.object({
        uploadId: z.string().uuid(),
        filename: z.string().min(1).max(255),
        storagePath: z.string().min(1),
        size: z.number().int().min(1),
        type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
        checksum: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .min(1)
    .max(100),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { folderId, uploads } = UploadCompleteSchema.parse(body);

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

    // Verify folder exists
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Verify uploaded files exist in storage
    const verificationPromises = uploads.map(async (upload) => {
      const { data, error } = await supabase.storage
        .from('originals')
        .list('', {
          search: upload.storagePath,
          limit: 1,
        });

      if (error || !data || data.length === 0) {
        return {
          uploadId: upload.uploadId,
          status: 'missing',
          error: 'File not found in storage',
        };
      }

      return {
        uploadId: upload.uploadId,
        status: 'verified',
        storageFile: data[0],
      };
    });

    const verificationResults = await Promise.all(verificationPromises);
    const missingFiles = verificationResults.filter(
      (r) => r.status === 'missing'
    );

    if (missingFiles.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some files were not uploaded successfully',
          missingFiles,
        },
        { status: 400 }
      );
    }

    // Create asset records
    const assetData = uploads.map((upload) => ({
      folder_id: folderId,
      original_filename: upload.filename,
      filename: upload.filename,
      original_path: upload.storagePath,
      checksum: upload.checksum,
      file_size: upload.size,
      mime_type: upload.type,
      width: upload.width,
      height: upload.height,
      status: 'pending', // Will be processed for previews
      approved: false,
      metadata: {
        upload_id: upload.uploadId,
        ...upload.metadata,
      },
    }));

    const { data: createdAssets, error: insertError } = await supabase
      .from('assets')
      .insert(assetData)
      .select();

    if (insertError) {
      console.error('Error creating asset records:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create asset records' },
        { status: 500 }
      );
    }

    // Queue preview processing for each asset
    const processingPromises = createdAssets.map(async (asset) => {
      try {
        // Trigger preview processing (fire and forget)
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/process-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            assetId: asset.id,
          }),
        });

        return {
          assetId: asset.id,
          status: 'queued',
        };
      } catch (error) {
        console.error('Error queuing preview processing:', error);
        return {
          assetId: asset.id,
          status: 'error',
          error: 'Failed to queue preview processing',
        };
      }
    });

    const processingResults = await Promise.all(processingPromises);

    return NextResponse.json({
      success: true,
      folderId,
      folderName: folder.name,
      assets: createdAssets.map((asset, index) => ({
        id: asset.id,
        filename: asset.original_filename,
        status: asset.status,
        processingStatus: processingResults[index]?.status,
      })),
      summary: {
        uploaded: createdAssets.length,
        queued: processingResults.filter((r) => r.status === 'queued').length,
        errors: processingResults.filter((r) => r.status === 'error').length,
      },
    });
  } catch (error) {
    console.error('Upload complete error:', error);

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
