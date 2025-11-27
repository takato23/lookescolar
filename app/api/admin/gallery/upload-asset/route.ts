import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { v4 as uuidv4 } from 'uuid';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/admin/gallery/upload-asset
// Uploads cover images and logos for gallery customization
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { tenantId } = resolveTenantFromHeaders(req.headers);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'cover' or 'logo'
    const eventId = formData.get('eventId') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (!type || !['cover', 'logo'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "cover" o "logo"' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Se requiere eventId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el límite de 5MB' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verify event belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const storagePath = `gallery-assets/${tenantId}/${eventId}/${type}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    // Using 'photos' bucket which should be public for gallery assets
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Error al subir el archivo', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Error al obtener URL pública' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      type,
      eventId
    });

  } catch (error) {
    console.error('Error in gallery asset upload:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/gallery/upload-asset
// Deletes a gallery asset
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { tenantId } = resolveTenantFromHeaders(req.headers);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Se requiere path del archivo' },
        { status: 400 }
      );
    }

    // Verify path belongs to tenant
    if (!path.includes(`/${tenantId}/`)) {
      return NextResponse.json(
        { error: 'No autorizado para eliminar este archivo' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const { error } = await supabase.storage
      .from('photos')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Error al eliminar archivo', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting gallery asset:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
