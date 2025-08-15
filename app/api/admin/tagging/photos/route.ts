import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

// Enhanced schema for photo filtering
const PhotoFilterSchema = z.object({
  eventId: z.string().uuid(),
  include_metadata: z.boolean().default(false),
  filters: z
    .object({
      search: z.string().optional(),
      assignmentStatus: z
        .enum(['all', 'assigned', 'unassigned'])
        .default('all'),
      subjectId: z.string().uuid().optional(),
      dateRange: z
        .object({
          start: z.string().datetime().optional(),
          end: z.string().datetime().optional(),
        })
        .optional(),
      filenamePattern: z.string().optional(),
      tags: z.array(z.string()).optional(),
      sortBy: z
        .enum(['date', 'filename', 'assignment', 'size'])
        .default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    })
    .optional(),
  include_signed_urls: z.boolean().default(true),
  url_expires_in: z.number().min(300).max(3600).default(900), // 5–60 min, default 15 min
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(true); // Service role
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = {
      eventId: searchParams.get('eventId'),
      include_metadata: searchParams.get('include_metadata') === 'true',
      include_signed_urls: searchParams.get('include_signed_urls') !== 'false',
      url_expires_in: parseInt(searchParams.get('url_expires_in') || '3600'),
      filters: {
        search: searchParams.get('search') || undefined,
        assignmentStatus:
          (searchParams.get('assignmentStatus') as any) || 'all',
        subjectId: searchParams.get('subjectId') || undefined,
        dateRange:
          searchParams.get('startDate') || searchParams.get('endDate')
            ? {
                start: searchParams.get('startDate') || undefined,
                end: searchParams.get('endDate') || undefined,
              }
            : undefined,
        filenamePattern: searchParams.get('filenamePattern') || undefined,
        tags: searchParams.get('tags')?.split(',') || undefined,
        sortBy: (searchParams.get('sortBy') as any) || 'date',
        sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
        limit: parseInt(searchParams.get('limit') || '100'),
        offset: parseInt(searchParams.get('offset') || '0'),
      },
    };

    if (!queryParams.eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    // Validate parameters
    const validationResult = PhotoFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      eventId,
      include_metadata,
      filters = {},
      include_signed_urls,
      url_expires_in,
    } = validationResult.data;

    // Base query with relationships
    let query = supabase
      .from('photos')
      .select(
        `
        id,
        storage_path,
        filename,
        width,
        height,
        created_at,
        file_size_bytes,
        approved,
        ${include_metadata ? 'metadata,' : ''}
        photo_subjects!left(
          subject_id,
          tagged_at,
          subjects!inner(
            id,
            name
          )
        )
      `
      )
      .eq('event_id', eventId)
      .eq('approved', true);

    // Apply filters
    if (filters.search) {
      query = query.or(
        `filename.ilike.%${filters.search}%,metadata->>camera.ilike.%${filters.search}%`
      );
    }

    if (filters.assignmentStatus === 'assigned') {
      query = query.not('photo_subjects', 'is', null);
    } else if (filters.assignmentStatus === 'unassigned') {
      query = query.is('photo_subjects', null);
    }

    if (filters.subjectId) {
      query = query.eq('photo_subjects.subject_id', filters.subjectId);
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end);
      }
    }

    if (filters.filenamePattern) {
      query = query.ilike('filename', `%${filters.filenamePattern}%`);
    }

    // Apply sorting
    const sortColumn =
      filters.sortBy === 'size'
        ? 'file_size_bytes'
        : filters.sortBy === 'assignment'
          ? 'photo_subjects.tagged_at'
          : filters.sortBy;

    query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });

    // Apply pagination
    query = query.range(filters.offset, filters.offset + filters.limit - 1);

    const { data: photos, error: photosError } = await query;

    if (photosError) {
      console.error('Error fetching filtered photos:', photosError);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    // Process photos and add signed URLs if requested
    let processedPhotos = photos || [];

    if (include_signed_urls) {
      const signedUrlPromises = processedPhotos.map(async (photo) => {
        try {
          const key = (photo as any).preview_path || photo.storage_path;
          if (!key) return photo;

          const signed = await signedUrlForKey(key, url_expires_in);
          return {
            ...photo,
            signed_url: signed,
            signed_url_expires_at: new Date(
              Date.now() + url_expires_in * 1000
            ).toISOString(),
          };
        } catch (error) {
          console.error(
            `Error generating signed URL for photo ${photo.id}:`,
            error
          );
          return photo;
        }
      });

      processedPhotos = await Promise.all(signedUrlPromises);
    }

    // Transform data structure for easier client consumption
    const transformedPhotos = processedPhotos.map((photo) => ({
      id: photo.id,
      storage_path: photo.storage_path,
      filename: photo.filename,
      width: photo.width,
      height: photo.height,
      created_at: photo.created_at,
      file_size_bytes: photo.file_size_bytes,
      metadata: include_metadata ? photo.metadata : undefined,
      signed_url: photo.signed_url,
      signed_url_expires_at: photo.signed_url_expires_at,
      assignments:
        photo.photo_subjects?.map((ps) => ({
          subject_id: ps.subject_id,
          subject_name: ps.subjects?.name,
          tagged_at: ps.tagged_at,
        })) || [],
      primary_assignment: photo.photo_subjects?.[0]
        ? {
            subject_id: photo.photo_subjects[0].subject_id,
            subject_name: photo.photo_subjects[0].subjects?.name,
            tagged_at: photo.photo_subjects[0].tagged_at,
          }
        : null,
    }));

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('approved', true);

    if (countError) {
      console.error('Error getting photo count:', countError);
    }

    // Calculate pagination metadata
    const hasMore = filters.offset + filters.limit < (totalCount || 0);
    const totalPages = Math.ceil((totalCount || 0) / filters.limit);
    const currentPage = Math.floor(filters.offset / filters.limit) + 1;

    return NextResponse.json({
      success: true,
      data: {
        photos: transformedPhotos,
        pagination: {
          total: totalCount || 0,
          limit: filters.limit,
          offset: filters.offset,
          hasMore,
          totalPages,
          currentPage,
        },
        filters: filters,
        metadata: {
          include_metadata,
          include_signed_urls,
          url_expires_in,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in enhanced photo filtering:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Advanced photo search with complex criteria
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(true);
    const body = await request.json();

    const SearchCriteriaSchema = z.object({
      eventId: z.string().uuid(),
      criteria: z.object({
        fullTextSearch: z.string().optional(),
        similarityThreshold: z.number().min(0).max(1).default(0.8),
        metadataFilters: z.record(z.any()).optional(),
        dateTimeRange: z
          .object({
            start: z.string().datetime(),
            end: z.string().datetime(),
          })
          .optional(),
        sizeRange: z
          .object({
            minBytes: z.number().optional(),
            maxBytes: z.number().optional(),
          })
          .optional(),
        dimensionsRange: z
          .object({
            minWidth: z.number().optional(),
            maxWidth: z.number().optional(),
            minHeight: z.number().optional(),
            maxHeight: z.number().optional(),
          })
          .optional(),
        assignmentCriteria: z
          .object({
            hasAssignments: z.boolean().optional(),
            subjectIds: z.array(z.string().uuid()).optional(),
            excludeSubjectIds: z.array(z.string().uuid()).optional(),
          })
          .optional(),
      }),
      options: z
        .object({
          includeSignedUrls: z.boolean().default(true),
          includeMetadata: z.boolean().default(true),
          groupBySubject: z.boolean().default(false),
          sortBy: z
            .array(
              z.object({
                field: z.string(),
                direction: z.enum(['asc', 'desc']).default('desc'),
              })
            )
            .default([{ field: 'created_at', direction: 'desc' }]),
          limit: z.number().min(1).max(500).default(100),
        })
        .default({}),
    });

    const { eventId, criteria, options } = SearchCriteriaSchema.parse(body);

    // Complex search implementation would go here
    // For now, return a simplified response

    return NextResponse.json({
      success: true,
      message: 'Advanced search functionality - implementation in progress',
      data: {
        photos: [],
        groups: {},
        stats: {
          totalMatches: 0,
          processingTime: 0,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search criteria', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in advanced photo search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
