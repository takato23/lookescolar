/**
 * Client-side API utilities for dynamic URL handling
 */

/**
 * Get the current origin/base URL from the browser
 * This ensures API calls use the same port/host as the current page
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In development, if running on port 3001, use port 3000 for API calls
    if (window.location.origin.includes('localhost:3001')) {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Create a full API URL with the correct base URL
 * @param path - API path (e.g., '/api/admin/photos/upload')
 */
export function createApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Enhanced fetch wrapper that automatically uses the correct base URL
 * @param path - API path or full URL
 * @param options - Fetch options
 */
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  // If it's already a full URL, use it as-is
  const url = path.startsWith('http') ? path : createApiUrl(path);

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * Upload files with correct base URL handling
 * @param path - Upload endpoint path
 * @param formData - FormData with files
 * @param options - Additional fetch options
 */
export async function uploadFiles(
  path: string,
  formData: FormData,
  options?: Omit<RequestInit, 'body' | 'method'>
): Promise<Response> {
  const url = createApiUrl(path);

  return fetch(url, {
    method: 'POST',
    body: formData,
    ...options,
    // Don't set Content-Type for FormData - browser sets it with boundary
    headers: {
      ...options?.headers,
    },
  });
}
