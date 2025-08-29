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
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<GalleryResponse>> {
  const requestId = generateRequestId();

  try {
    const { token } = await params;
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

    // Filter by accessible students
    const accessibleStudentIds = students.map((s) => s.id);
    if (student_id) {
      // Specific student requested - verify access
      if (!accessibleStudentIds.includes(student_id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'No tienes acceso a las fotos de este estudiante',
            // @ts-ignore - partial response for error case
          },
          { status: 403 }
        );
      }
      photoQuery = photoQuery.eq('photo_students.student_id', student_id);
    } else {
      // All accessible students
      photoQuery = photoQuery.in(
        'photo_students.student_id',
        accessibleStudentIds
      );
    }

    // Apply search filter
    if (search) {
      photoQuery = photoQuery.ilike('filename', `%${search}%`);
    }

    // TODO: Apply additional filters (favorites, purchased, etc.)
    // This would require joining with user-specific tables like favorites, orders, etc.

    // Apply sorting
    const sortColumn =
      sort_by === 'taken_at'
        ? 'taken_at'
        : sort_by === 'filename'
          ? 'filename'
          : 'created_at';
    photoQuery = photoQuery.order(sortColumn, {
      ascending: sort_order === 'asc',
    });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('approved', true)
      .in('photo_students.student_id', accessibleStudentIds);

    const totalPhotos = totalCount || 0;
    const totalPages = Math.ceil(totalPhotos / limit);
    const offset = (page - 1) * limit;

    // Apply pagination
    photoQuery = photoQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data: photosData, error: photosError } = await photoQuery;

    if (photosError) {
      console.error(`[${requestId}] Error fetching photos:`, photosError);
      throw new Error(`Failed to fetch photos: ${photosError.message}`);
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
    const totalFavorites = 0; // TODO: Implement favorites counting
    const totalInCart = 0; // TODO: Implement cart counting
    const totalPurchased = 0; // TODO: Implement purchased counting

    // Count photos by student
    for (const photo of photosData || []) {
      for (const photoStudent of photo.photo_students || []) {
        const studentId = photoStudent.student_id;
        photosByStudent[studentId] = (photosByStudent[studentId] || 0) + 1;
      }
    }

    // Build filters metadata
    const availableStudents = studentInfo.map((student) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      photo_count: photosByStudent[student.id] || 0,
    }));

    // Get date range for filters
    const { data: dateRange } = await supabase
      .from('assets')
      .select('created_at, taken_at')
      .eq('event_id', event.id)
      .eq('approved', true)
      .in('photo_students.student_id', accessibleStudentIds)
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: latestDate } = await supabase
      .from('assets')
      .select('created_at, taken_at')
      .eq('event_id', event.id)
      .eq('approved', true)
      .in('photo_students.student_id', accessibleStudentIds)
      .order('created_at', { ascending: false })
      .limit(1);

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
          earliest: dateRange?.[0]?.created_at || new Date().toISOString(),
          latest: latestDate?.[0]?.created_at || new Date().toISOString(),
        },
        file_types: ['jpg', 'jpeg', 'png', 'webp'], // TODO: Get actual file types
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
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<GalleryResponse>> {
  const requestId = generateRequestId();

  try {
    const { token } = await params;
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
