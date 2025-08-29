/**
 * Checksum Service - File deduplication using SHA-256 hashes
 * 
 * This service handles generating and validating checksums for files
 * to prevent duplicate uploads in the unified photo system.
 */

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface ChecksumResult {
  checksum: string;
  isDuplicate: boolean;
  duplicateAsset?: {
    id: string;
    filename: string;
    folder: string;
    path: string;
  };
}

/**
 * Generate SHA-256 checksum from file buffer
 */
export function generateChecksum(buffer: Buffer): string {
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Generate checksum from file stream (for large files)
 */
export async function generateChecksumFromStream(stream: ReadableStream): Promise<string> {
  const hash = createHash('sha256');
  const reader = stream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
    }
    return hash.digest('hex');
  } finally {
    reader.releaseLock();
  }
}

/**
 * Check if a file with this checksum already exists
 */
export async function checkDuplicateByChecksum(
  checksum: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<ChecksumResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: existingAsset } = await supabase
    .from('assets')
    .select(`
      id,
      filename,
      folder:folders!inner(
        name,
        path
      )
    `)
    .eq('checksum', checksum)
    .single();

  if (existingAsset) {
    return {
      checksum,
      isDuplicate: true,
      duplicateAsset: {
        id: existingAsset.id,
        filename: existingAsset.filename,
        folder: existingAsset.folder?.name || 'Unknown',
        path: existingAsset.folder?.path || '/'
      }
    };
  }

  return {
    checksum,
    isDuplicate: false
  };
}

/**
 * Generate checksum from file and check for duplicates in one operation
 */
export async function processFileDeduplication(
  buffer: Buffer,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<ChecksumResult> {
  const checksum = generateChecksum(buffer);
  return checkDuplicateByChecksum(checksum, supabaseUrl, supabaseServiceKey);
}

/**
 * Batch check multiple checksums for duplicates
 */
export async function batchCheckDuplicates(
  checksums: string[],
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Map<string, ChecksumResult>> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: existingAssets } = await supabase
    .from('assets')
    .select(`
      checksum,
      id,
      filename,
      folder:folders!inner(
        name,
        path
      )
    `)
    .in('checksum', checksums);

  const results = new Map<string, ChecksumResult>();
  
  // Initialize all checksums as non-duplicates
  checksums.forEach(checksum => {
    results.set(checksum, {
      checksum,
      isDuplicate: false
    });
  });
  
  // Mark duplicates
  existingAssets?.forEach(asset => {
    results.set(asset.checksum, {
      checksum: asset.checksum,
      isDuplicate: true,
      duplicateAsset: {
        id: asset.id,
        filename: asset.filename,
        folder: asset.folder?.name || 'Unknown',
        path: asset.folder?.path || '/'
      }
    });
  });
  
  return results;
}

/**
 * Validate file integrity by comparing stored checksum with actual file
 */
export async function validateFileIntegrity(
  buffer: Buffer,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = generateChecksum(buffer);
  return actualChecksum === expectedChecksum;
}

/**
 * Get duplicate statistics for reporting
 */
export async function getDuplicateStats(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{
  totalAssets: number;
  uniqueChecksums: number;
  duplicateGroups: number;
  spaceWasted: number; // in bytes
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: stats } = await supabase
    .rpc('get_duplicate_stats')
    .single();
    
  return stats || {
    totalAssets: 0,
    uniqueChecksums: 0,
    duplicateGroups: 0,
    spaceWasted: 0
  };
}

/**
 * Find all duplicate groups (files with same checksum)
 */
export async function findDuplicateGroups(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Array<{
  checksum: string;
  count: number;
  totalSize: number;
  assets: Array<{
    id: string;
    filename: string;
    folder: string;
    path: string;
    created_at: string;
  }>;
}>> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: duplicateGroups } = await supabase
    .from('assets')
    .select(`
      checksum,
      id,
      filename,
      file_size,
      created_at,
      folder:folders!inner(
        name,
        path
      )
    `)
    .order('checksum')
    .order('created_at');
    
  if (!duplicateGroups) return [];
  
  // Group by checksum and filter groups with more than 1 file
  const groups = new Map<string, typeof duplicateGroups>();
  
  duplicateGroups.forEach(asset => {
    if (!groups.has(asset.checksum)) {
      groups.set(asset.checksum, []);
    }
    groups.get(asset.checksum)!.push(asset);
  });
  
  return Array.from(groups.entries())
    .filter(([_, assets]) => assets.length > 1)
    .map(([checksum, assets]) => ({
      checksum,
      count: assets.length,
      totalSize: assets.reduce((sum, asset) => sum + (asset.file_size || 0), 0),
      assets: assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        folder: asset.folder?.name || 'Unknown',
        path: asset.folder?.path || '/',
        created_at: asset.created_at
      }))
    }));
}