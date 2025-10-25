import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { enhancedTokenService } from '@/lib/services/enhanced-token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const GalleryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(60),
  student_id: z.string().uuid().optional(),
  sort_by: z.enum(['created_at', 'filename', 'taken_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  filter_by: z
    .enum(['all', 'favorites', 'purchased', 'unpurchased'])
    .default('all'),
  search: z.string().max(100).optional(),
});

interface PhotoWithMetadata {
  id: string;
  filename: string;
  preview_url: string;
  watermark_url?: string;
  size: number;
  width: number;
  height: number;
  taken_at?: string;
  created_at: string;
  metadata?: {
    camera_settings?: any;
    location?: any;
    tags?: string[];
  };
  engagement?: {
    is_favorite: boolean;
    in_cart_quantity: number;
    purchased_quantity: number;
  };
}

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  grade?: string;
  section?: string;
  qr_code?: string;
}

interface EventInfo {
  id: string;
  name: string;
  school_name: string;
  date: string;
  description?: string;
  photographer_contact?: string;
}

interface GalleryResponse {
  success: boolean;

  // Access information
  access_level: 'student' | 'family' | 'group' | 'event';
  token_type: string;
  expires_in_days: number;
  warnings?: string[];

  // Content data
  photos: PhotoWithMetadata[];
  students: StudentInfo[];
  event: EventInfo;

  // Pagination
  pagination: {
    current_page: number;
    total_pages: number;
    total_photos: number;
    has_more: boolean;
    per_page: number;
  };

  // Statistics
  stats: {
    total_photos: number;
    photos_by_student: Record<string, number>;
    total_favorites: number;
    total_in_cart: number;
    total_purchased: number;
  };

  // Filters and metadata
  filters: {
    available_students: Array<{
      id: string;
      name: string;
      photo_count: number;
    }>;
    date_range: { earliest: string; latest: string };
    file_types: string[];
  };

  error?: string;
}

/**
 * GET /api/family/gallery-enhanced/[token]
 * Enhanced family gallery with advanced filtering, sorting, and multi-student support
 */
export async function GET(
  request: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  const requestId = generateRequestId();

  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);

    console.log(`[${requestId}] Enhanced gallery request:`, {
      token: `${token.slice(0, 8)}***`,
    });

    // Validate query parameters
    const queryResult = GalleryQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );
    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros de consulta inválidos',
          // @ts-ignore - partial response for error case
          details: queryResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { page, limit, student_id, sort_by, sort_order, filter_by, search } =
      queryResult.data;

    // Validate token using enhanced service
    const validationResult = await enhancedTokenService.validateToken(token);

    if (!validationResult.isValid) {
      console.log(`[${requestId}] Token validation failed:`, {
        token: `${token.slice(0, 8)}***`,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Token no válido o expirado',
          // @ts-ignore - partial response for error case
        },
        { status: 401 }
      );
    }

    const tokenData = validationResult.token!;
    const students = validationResult.students || [];
    const event = validationResult.event!;

    if (!event || event.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'El evento no está disponible actualmente',
          // @ts-ignore - partial response for error case
        },
        { status: 404 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const accessibleStudentIds = Array.from(
      new Set(
        (students || [])
          .map((s) => s.id)
          .filter(
            (id): id is string => typeof id === 'string' && id.length > 0
          )
      )
    );
    const restrictByStudents =
      accessibleStudentIds.length > 0 && validationResult.accessLevel !== 'event';

    if (student_id && !accessibleStudentIds.includes(student_id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes acceso a las fotos de este estudiante',
          // @ts-ignore - partial response for error case
        },
        { status: 403 }
      );
    }

    async function resolveShareTokenId(): Promise<string | null> {
      try {
        const { data } = await supabase
          .from('share_tokens')
          .select('id')
          .eq('token', token)
          .eq('is_active', true)
          .maybeSingle();
        return data?.id ?? null;
      } catch (err: any) {
        if (err?.code === 'PGRST116' || err?.code === '42P01') {
          return null;
        }
        console.warn(`[${requestId}] Failed to resolve share token id`, err);
        return null;
      }
    }

    async function loadFavorites(tokenId: string | null): Promise<Set<string>> {
      if (!tokenId) return new Set();

      try {
        const { data, error } = await supabase
          .from('share_favorites')
          .select('asset_id')
          .eq('share_token_id', tokenId);

        if (error) {
          if (error.code === '42P01') {
            return new Set();
          }
          throw error;
        }

        const favorites = new Set<string>();
        for (const row of data || []) {
          const assetId = (row as any).asset_id;
          if (typeof assetId === 'string' && assetId.length > 0) {
            favorites.add(assetId);
          }
        }
        return favorites;
      } catch (err) {
        console.warn(`[${requestId}] Failed to load favorites`, err);
        return new Set();
      }
    }

    type OrderMetrics = {
      counts: Map<string, number>;
      total: number;
    };

    async function collectOrderMetrics(
      statuses: string[]
    ): Promise<OrderMetrics> {
      if (!statuses.length) {
        return { counts: new Map(), total: 0 };
      }

      try {
        let orderQuery = supabase.from('orders').select('id').in('status', statuses);

        if (restrictByStudents) {
          orderQuery = orderQuery.in('subject_id', accessibleStudentIds);
        } else if (event?.id) {
          orderQuery = orderQuery.eq('event_id', event.id);
        }

        const { data: ordersData, error: ordersError } = await orderQuery;
        if (ordersError) {
          if (ordersError.code === '42P01') {
            return { counts: new Map(), total: 0 };
          }
          throw ordersError;
        }

        const orderIds =
          ordersData?.map((row: any) => row.id).filter((id: any) => typeof id === 'string') ?? [];

        if (!orderIds.length) {
          return { counts: new Map(), total: 0 };
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('order_id, photo_id, quantity')
          .in('order_id', orderIds);

        if (itemsError) {
          if (itemsError.code === '42P01') {
            return { counts: new Map(), total: 0 };
          }
          throw itemsError;
        }

        const counts = new Map<string, number>();
        let total = 0;

        for (const row of itemsData || []) {
          const photoId = (row as any).photo_id;
          const rawQty = (row as any).quantity;
          if (typeof photoId !== 'string' || photoId.length === 0) continue;

          const quantity =
            typeof rawQty === 'number' && !Number.isNaN(rawQty) ? rawQty : 1;

          counts.set(photoId, (counts.get(photoId) ?? 0) + quantity);
          total += quantity;
        }

        return { counts, total };
      } catch (err) {
        console.warn(`[${requestId}] Failed to collect order metrics`, err);
        return { counts: new Map(), total: 0 };
      }
    }

    const shareTokenId = await resolveShareTokenId();
    const [favoriteAssetSet, cartMetrics, purchasedMetrics] = await Promise.all([
      loadFavorites(shareTokenId),
      collectOrderMetrics(['pending', 'processing']),
      collectOrderMetrics(['paid', 'completed', 'fulfilled', 'delivered']),
    ]);

    const favoriteAssetIds = Array.from(favoriteAssetSet);
    const purchasedAssetIds = Array.from(purchasedMetrics.counts.keys());

    const applyPhotoFilters = (
      queryBuilder: any
    ): { builder: any; emptyResult: boolean } => {
      let builder = queryBuilder;
      let emptyResult = false;

      if (student_id) {
        if (!accessibleStudentIds.includes(student_id)) {
          emptyResult = true;
        } else {
          builder = builder.eq('photo_students.student_id', student_id);
        }
      } else if (restrictByStudents) {
        builder = builder.in('photo_students.student_id', accessibleStudentIds);
      }

      if (search) {
        builder = builder.ilike('filename', `%${search}%`);
      }

      switch (filter_by) {
        case 'favorites':
          if (!favoriteAssetIds.length) {
            emptyResult = true;
          } else {
            builder = builder.in('id', favoriteAssetIds);
          }
          break;
        case 'purchased':
          if (!purchasedAssetIds.length) {
            emptyResult = true;
          } else {
            builder = builder.in('id', purchasedAssetIds);
          }
          break;
        case 'unpurchased':
          if (purchasedAssetIds.length) {
            const inClause = `("${purchasedAssetIds.join('","')}")`;
            builder = builder.not('id', 'in', inClause);
          }
          break;
        default:
          break;
      }

      return { builder, emptyResult };
    };

    // Build photo query based on access level and filters
    let photoQuery = supabase
      .from('assets')
      .select(
        `
        id,
        filename,
        storage_path,
        preview_path,
        watermark_path,
        file_size,
        width,
        height,
        taken_at,
        created_at,
        metadata,
        photo_students!inner (
          student_id,
          students (
            id,
            first_name,
            last_name,
            grade,
            section,
            qr_code
          )
        )
      `
      )
      .eq('event_id', event.id)
      .eq('approved', true);

    // Apply filters
    const filteredPhotoQuery = applyPhotoFilters(photoQuery);

    // Apply sorting
    const sortColumn =
      sort_by === 'taken_at'
        ? 'taken_at'
        : sort_by === 'filename'
          ? 'filename'
          : 'created_at';
    const orderedPhotoQuery = (filteredPhotoQuery.builder as any).order(sortColumn, {
      ascending: sort_order === 'asc',
    });

    // Get total count for pagination
    const countQuery = applyPhotoFilters(
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('approved', true)
    );

    const emptyResult =
      filteredPhotoQuery.emptyResult || countQuery.emptyResult;

    const offset = (page - 1) * limit;
    let totalPhotos = 0;
    let totalPages = 0;
    let photosData: any[] = [];

    if (!emptyResult) {
      const {
        count: totalCount,
        error: totalCountError,
      } = await countQuery.builder;
      if (totalCountError) {
        console.error(
          `[${requestId}] Error counting photos:`,
          totalCountError
        );
        throw new Error(
          `Failed to count photos: ${totalCountError.message}`
        );
      }

      totalPhotos = totalCount || 0;
      totalPages = totalPhotos > 0 ? Math.ceil(totalPhotos / limit) : 0;

      const { data: photosResponse, error: photosError } = await (orderedPhotoQuery as any).range(
        offset,
        offset + limit - 1
      );

      if (photosError) {
        console.error(`[${requestId}] Error fetching photos:`, photosError);
        throw new Error(`Failed to fetch photos: ${photosError.message}`);
      }

      photosData = photosResponse || [];
    }

    // Process photos and build response
    const photos: PhotoWithMetadata[] = (photosData || []).map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      preview_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path || photo.storage_path}`,
      watermark_url: photo.watermark_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermark_path}`
        : undefined,
      size: photo.file_size || 0,
      width: photo.width || 0,
      height: photo.height || 0,
      taken_at: photo.taken_at,
      created_at: photo.created_at,
      metadata: photo.metadata,
      engagement: {
        is_favorite: favoriteAssetSet.has(photo.id),
        in_cart_quantity: cartMetrics.counts.get(photo.id) ?? 0,
        purchased_quantity: purchasedMetrics.counts.get(photo.id) ?? 0,
      },
    }));

    // Build student information
    const studentInfo: StudentInfo[] = students.map((student) => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      grade: student.grade || undefined,
      section: student.section || undefined,
      qr_code: student.qr_code || undefined,
    }));

    // Build event information
    const eventInfo: EventInfo = {
      id: event.id,
      name: event.name,
      school_name: event.school_name || '',
      date: event.date,
      description: event.description,
      photographer_contact: event.photographer_contact,
    };

    // Calculate statistics
    const photosByStudent: Record<string, number> = {};
    const totalFavorites = favoriteAssetSet.size;
    const totalInCart = cartMetrics.total;
    const totalPurchased = purchasedMetrics.total;

    // Count photos by student
    for (const photo of photosData || []) {
      for (const photoStudent of (photo.photo_students || []) as any[]) {
        const studentId = photoStudent?.student_id;
        if (typeof studentId !== 'string' || studentId.length === 0) continue;
        photosByStudent[studentId] = (photosByStudent[studentId] || 0) + 1;
      }
    }

    const fileTypesSet = new Set<string>();
    for (const photo of photosData || []) {
      const filename = (photo as any)?.filename;
      if (typeof filename === 'string') {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext) {
          fileTypesSet.add(ext);
        }
      }
    }
    const fileTypes =
      fileTypesSet.size > 0
        ? Array.from(fileTypesSet).sort()
        : ['jpg', 'jpeg', 'png', 'webp'];

    // Build filters metadata
    const availableStudents = studentInfo.map((student) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      photo_count: photosByStudent[student.id] || 0,
    }));

    // Get date range for filters
    const buildDateQuery = (ascending: boolean) =>
      applyPhotoFilters(
        supabase
          .from('assets')
          .select('created_at, taken_at')
          .eq('event_id', event.id)
          .eq('approved', true)
          .order('created_at', { ascending })
          .limit(1)
      );

    const earliestQuery = buildDateQuery(true);
    const latestQuery = buildDateQuery(false);

    let earliestRecord: any = null;
    let latestRecord: any = null;

    if (!earliestQuery.emptyResult) {
      const { data, error } = await earliestQuery.builder;
      if (error) {
        console.warn(`[${requestId}] Error fetching earliest date:`, error);
      } else if (Array.isArray(data) && data.length > 0) {
        earliestRecord = data[0];
      }
    }

    if (!latestQuery.emptyResult) {
      const { data, error } = await latestQuery.builder;
      if (error) {
        console.warn(`[${requestId}] Error fetching latest date:`, error);
      } else if (Array.isArray(data) && data.length > 0) {
        latestRecord = data[0];
      }
    }

    const response: GalleryResponse = {
      success: true,

      // Access information
      access_level: validationResult.accessLevel as any,
      token_type: tokenData.type,
      expires_in_days: validationResult.expiresInDays || 0,
      warnings: validationResult.warnings,

      // Content data
      photos,
      students: studentInfo,
      event: eventInfo,

      // Pagination
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_photos: totalPhotos,
        has_more: page < totalPages,
        per_page: limit,
      },

      // Statistics
      stats: {
        total_photos: totalPhotos,
        photos_by_student: photosByStudent,
        total_favorites: totalFavorites,
        total_in_cart: totalInCart,
        total_purchased: totalPurchased,
      },

      // Filters and metadata
      filters: {
        available_students: availableStudents,
        date_range: {
          earliest: earliestRecord?.created_at || new Date().toISOString(),
          latest: latestRecord?.created_at || new Date().toISOString(),
        },
        file_types: fileTypes,
      },
    };

    // Log successful access
    SecurityLogger.logSecurityEvent(
      'enhanced_gallery_access',
      {
        requestId,
        token: `${token.slice(0, 8)}***`,
        tokenType: tokenData.type,
        accessLevel: validationResult.accessLevel,
        eventId: `${event.id.substring(0, 8)}***`,
        studentCount: students.length,
        photosReturned: photos.length,
        totalPhotos: totalPhotos,
        page,
        filters: {
          student_id: student_id ? `${student_id.substring(0, 8)}***` : 'all',
          sort_by,
          filter_by,
          search: search ? 'provided' : 'none',
        },
      },
      'info'
    );

    console.log(`[${requestId}] Enhanced gallery response:`, {
      token: `${token.slice(0, 8)}***`,
      accessLevel: validationResult.accessLevel,
      studentsAccessed: students.length,
      photosReturned: photos.length,
      totalPhotos,
      currentPage: page,
    });

    return NextResponse.json(response, {
      headers: {
        'X-Request-Id': requestId,
        'X-Access-Level': validationResult.accessLevel,
        'X-Total-Photos': totalPhotos.toString(),
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Enhanced gallery error:`, error);

    SecurityLogger.logSecurityEvent(
      'enhanced_gallery_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    const errorResponse: Partial<GalleryResponse> = {
      success: false,
      error: 'Error interno del servidor',
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
}

/**
 * POST /api/family/gallery-enhanced/[token]
 * Enhanced gallery with additional context and preferences
 */
export async function POST(
  request: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  const requestId = generateRequestId();

  try {
    const { token } = params;
    const body = await request.json();

    const {
      page = 1,
      limit = 60,
      filters = {},
      preferences = {},
      device_context = {},
    } = body;

    console.log(`[${requestId}] Enhanced gallery POST request:`, {
      token: `${token.slice(0, 8)}***`,
      hasFilters: Object.keys(filters).length > 0,
      hasPreferences: Object.keys(preferences).length > 0,
    });

    // Validate token
    const validationResult = await enhancedTokenService.validateToken(token);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token no válido o expirado',
          // @ts-ignore - partial response for error case
        },
        { status: 401 }
      );
    }

    // TODO: Implement advanced filtering with POST body
    // This would include:
    // - Advanced date range filters
    // - Multiple student selection
    // - Tag-based filtering
    // - Metadata searches
    // - User preferences (view mode, sorting preferences, etc.)
    // - Device-specific optimizations

    // For now, redirect to GET with equivalent parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters.student_id && { student_id: filters.student_id }),
      ...(filters.sort_by && { sort_by: filters.sort_by }),
      ...(filters.search && { search: filters.search }),
    });

    // Create a new request with query parameters
    const getRequest = new Request(
      `${request.url.split('?')[0]}?${queryParams.toString()}`,
      { method: 'GET', headers: request.headers }
    );

    // Call the GET handler
    return GET(getRequest, { params });
  } catch (error) {
    console.error(`[${requestId}] Enhanced gallery POST error:`, error);

    const errorResponse: Partial<GalleryResponse> = {
      success: false,
      error: 'Error interno del servidor',
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
}
