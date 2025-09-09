-- Aggregated event stats function
-- Returns subjects, photos (assets ready), orders count and revenue (ARS int)
CREATE OR REPLACE FUNCTION public.get_event_stats(event_ids uuid[])
RETURNS TABLE (
  event_id uuid,
  total_subjects integer,
  total_photos integer,
  total_orders integer,
  revenue integer
) AS $$
  WITH subjects AS (
    SELECT s.event_id, COUNT(*) AS total_subjects
    FROM public.subjects s
    WHERE s.event_id = ANY (event_ids)
    GROUP BY s.event_id
  ),
  folders AS (
    SELECT f.event_id, f.id
    FROM public.folders f
    WHERE f.event_id = ANY (event_ids)
  ),
  assets AS (
    SELECT f.event_id, COUNT(a.id) AS total_photos
    FROM public.assets a
    JOIN folders f ON f.id = a.folder_id
    WHERE a.status = 'ready'
    GROUP BY f.event_id
  ),
  orders AS (
    SELECT o.event_id,
           COUNT(*) AS total_orders,
           COALESCE(SUM(CASE WHEN o.status IN ('approved','delivered') THEN o.total_amount ELSE 0 END), 0) AS revenue_cents
    FROM public.orders o
    WHERE o.event_id = ANY (event_ids)
    GROUP BY o.event_id
  )
  SELECT e.id AS event_id,
         COALESCE(s.total_subjects, 0) AS total_subjects,
         COALESCE(a.total_photos, 0) AS total_photos,
         COALESCE(o.total_orders, 0) AS total_orders,
         COALESCE(ROUND(o.revenue_cents / 100.0)::int, 0) AS revenue
  FROM public.events e
  LEFT JOIN subjects s ON s.event_id = e.id
  LEFT JOIN folders f ON f.event_id = e.id
  LEFT JOIN assets a   ON a.folder_id = f.id
  LEFT JOIN orders o   ON o.event_id = e.id
  WHERE e.id = ANY (event_ids);
$$ LANGUAGE sql STABLE;

-- Permissions (service role can execute; optional for authenticated)
GRANT EXECUTE ON FUNCTION public.get_event_stats(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_stats(uuid[]) TO anon;
