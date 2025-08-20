/**
 * TEMPORARY: Simple photos URL builder for ultra-simple endpoint
 * Uses /api/admin/photos-simple to avoid OOM issues
 */
export function buildPhotosUrlSimple({
  limit = 10,
}: {
  limit?: number;
} = {}): string {
  const params = new URLSearchParams();
  
  // Ultra-simple endpoint only supports limit
  params.append('limit', Math.min(limit, 10).toString()); // Max 10 for memory
  
  const url = `/api/admin/photos-simple?${params.toString()}`;
  
  console.debug('[photos] SIMPLE URL built:', url);
  
  return url;
}

/**
 * Fetch photos using simple endpoint
 */
export async function fetchPhotosSimple(limit = 10) {
  const url = buildPhotosUrlSimple({ limit });
  
  console.debug('[photos] Fetching from simple endpoint:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  
  console.debug('[photos] Simple endpoint response:', data);
  
  return {
    photos: data.photos || [],
    count: data.count || 0,
    total: data.count || 0,
    success: data.success || false
  };
}