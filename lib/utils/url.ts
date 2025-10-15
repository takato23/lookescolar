/**
 * URL utility functions for consistent URL generation across the application
 */

import { NextRequest } from 'next/server';

/**
 * Get the base URL for the application
 * Prioritizes:
 * 1. NEXT_PUBLIC_SITE_URL (explicit production URL)
 * 2. VERCEL_URL (Vercel deployment URL)
 * 3. Request origin (preserves protocol and host)
 * 4. Fallback to localhost
 */
export function getBaseUrl(req?: NextRequest | Request): string {
  // 1. Check for explicit site URL (production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 2. Check for Vercel URL (preview/production deployments)
  if (process.env.VERCEL_URL) {
    // Always use HTTPS for Vercel deployments
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Try to get from request (preserves protocol)
  if (req) {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  }

  // 4. Fallback to localhost (development)
  return 'http://localhost:3000';
}

/**
 * Build a complete URL for a given path
 */
export function buildUrl(path: string, req?: NextRequest | Request): string {
  const baseUrl = getBaseUrl(req);
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Build a store URL for a given token
 */
export function buildStoreUrl(token: string, req?: NextRequest | Request): string {
  return buildUrl(`/store-unified/${token}`, req);
}

/**
 * Build a family gallery URL for a given token
 */
export function buildFamilyUrl(token: string, req?: NextRequest | Request): string {
  return buildUrl(`/f/${token}`, req);
}

/**
 * Build a share URL for a given token
 */
export function buildShareUrl(token: string, req?: NextRequest | Request): string {
  return buildUrl(`/s/${token}`, req);
}