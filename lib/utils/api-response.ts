import { NextResponse } from 'next/server';

/**
 * Creates a consistent error response for APIs
 * @param error - Error message
 * @param details - Optional error details
 * @param status - HTTP status code (default: 500)
 * @param requestId - Optional request ID for tracking
 * @returns NextResponse with consistent error format
 */
export function createErrorResponse(
  error: string,
  details?: string,
  status: number = 500,
  requestId?: string
): NextResponse {
  const errorBody: {
    error: string;
    details?: string;
    requestId?: string;
  } = { error };

  if (details) {
    errorBody.details = details;
  }

  if (requestId) {
    errorBody.requestId = requestId;
  }

  return NextResponse.json(errorBody, { status });
}

/**
 * Creates a consistent success response with optional pagination
 * @param data - Response data
 * @param pagination - Optional pagination metadata
 * @param requestId - Optional request ID for tracking
 * @returns NextResponse with consistent success format
 */
export function createSuccessResponse<T>(
  data: T,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  },
  requestId?: string
): NextResponse {
  const responseBody: {
    data: T;
    pagination?: typeof pagination;
    requestId?: string;
  } = { data };

  if (pagination) {
    responseBody.pagination = pagination;
  }

  if (requestId) {
    responseBody.requestId = requestId;
  }

  return NextResponse.json(responseBody);
}

/**
 * Parses pagination parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Parsed pagination parameters with defaults
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Creates pagination metadata from query results
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
} {
  const total_pages = Math.ceil(total / limit);
  const has_more = page < total_pages;

  return {
    page,
    limit,
    total,
    total_pages,
    has_more,
  };
}

/**
 * Development logger utility
 * Only logs in development environment
 * @param requestId - Request ID for tracking
 * @param method - HTTP method
 * @param pathname - Request pathname
 * @param duration - Request duration in ms
 * @param status - Response status
 */
export function logDevRequest(
  requestId: string,
  method: string,
  pathname: string,
  duration: number,
  status: number | string = 'success'
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${requestId}] ${method} ${pathname} - ${duration}ms (${status})`
    );
  }
}
