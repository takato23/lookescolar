-- Create function to get duplicate statistics
-- This supplements the unified folders system with deduplication analytics

CREATE OR REPLACE FUNCTION public.get_duplicate_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_assets integer;
  unique_checksums integer;
  duplicate_groups integer;
  space_wasted bigint;
BEGIN
  -- Get total assets
  SELECT COUNT(*) INTO total_assets FROM public.assets;
  
  -- Get unique checksums
  SELECT COUNT(DISTINCT checksum) INTO unique_checksums FROM public.assets;
  
  -- Get duplicate groups (checksums with > 1 asset)
  SELECT COUNT(*) 
  INTO duplicate_groups
  FROM (
    SELECT checksum
    FROM public.assets
    GROUP BY checksum
    HAVING COUNT(*) > 1
  ) duplicate_checksums;
  
  -- Calculate space wasted by duplicates
  -- For each duplicate group, the wasted space is (count - 1) * file_size
  SELECT COALESCE(SUM(wasted_per_group), 0)
  INTO space_wasted
  FROM (
    SELECT 
      checksum,
      file_size,
      (COUNT(*) - 1) * file_size as wasted_per_group
    FROM public.assets
    GROUP BY checksum, file_size
    HAVING COUNT(*) > 1
  ) duplicate_waste;
  
  RETURN json_build_object(
    'totalAssets', total_assets,
    'uniqueChecksums', unique_checksums,
    'duplicateGroups', duplicate_groups,
    'spaceWasted', space_wasted
  );
END;
$$;