/**
 * API Unificada para Gestión de Tiendas
 * POST /api/admin/stores - Crear/Publicar tienda
 * GET /api/admin/stores - Listar tiendas publicadas
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Esquemas de validación
const CreateStoreSchema = z.object({
  folder_id: z.string().uuid(),
  store_settings: z.object({
    allow_download: z.boolean().default(false),
    watermark_enabled: z.boolean().default(true),
    store_title: z.string().optional(),
    store_description: z.string().optional(),
    contact_info: z.string().optional(),
  }).optional(),
});

const ListStoresSchema = z.object({
  event_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// POST - Crear/Publicar tienda
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folder_id, store_settings } = CreateStoreSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el folder existe y el usuario tiene permisos
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id, parent_id, is_published, share_token')
      .eq('id', folder_id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Llamar función de base de datos para publicar
    const { data: result, error: publishError } = await supabase
      .rpc('publish_store', {
        p_folder_id: folder_id,
        p_store_settings: store_settings || null,
      })
      .single();

    if (publishError) {
      console.error('Error publishing store:', publishError);
      return NextResponse.json(
        { error: 'Failed to publish store', details: publishError.message },
        { status: 500 }
      );
    }

    // Obtener datos completos de la tienda recién creada
    const { data: storeData, error: storeError } = await supabase
      .from('published_stores')
      .select('*')
      .eq('folder_id', folder_id)
      .single();

    if (storeError) {
      console.warn('Could not fetch complete store data:', storeError);
    }

    return NextResponse.json({
      success: true,
      message: 'Store published successfully',
      store: {
        token: result.token,
        url: result.store_url,
        folder: {
          id: folder.id,
          name: folder.name,
          event_id: folder.event_id,
        },
        ...storeData,
      },
    });

  } catch (error) {
    console.error('Store creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Listar tiendas publicadas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const { event_id, limit, offset } = ListStoresSchema.parse(params);

    const supabase = await createServerSupabaseServiceClient();

    let query = supabase
      .from('published_stores')
      .select('*')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por evento si se especifica
    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data: stores, error: storesError, count } = await query;

    if (storesError) {
      console.error('Error fetching stores:', storesError);
      return NextResponse.json(
        { error: 'Failed to fetch stores', details: storesError.message },
        { status: 500 }
      );
    }

    // Agregar estadísticas útiles
    const { data: stats } = await supabase
      .from('published_stores')
      .select('asset_count, view_count')
      .then(({ data }) => ({
        data: {
          total_stores: data?.length || 0,
          total_assets: data?.reduce((sum, store) => sum + (store.asset_count || 0), 0) || 0,
          total_views: data?.reduce((sum, store) => sum + (store.view_count || 0), 0) || 0,
        }
      }));

    return NextResponse.json({
      stores: stores || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
      stats,
    });

  } catch (error) {
    console.error('Store listing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Despublicar tienda
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder_id = searchParams.get('folder_id');

    if (!folder_id) {
      return NextResponse.json(
        { error: 'folder_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Llamar función para despublicar
    const { data: success, error: unpublishError } = await supabase
      .rpc('unpublish_store', {
        p_folder_id: folder_id,
      });

    if (unpublishError) {
      console.error('Error unpublishing store:', unpublishError);
      return NextResponse.json(
        { error: 'Failed to unpublish store', details: unpublishError.message },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Store not found or already unpublished' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Store unpublished successfully',
    });

  } catch (error) {
    console.error('Store deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

