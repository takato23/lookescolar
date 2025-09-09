-- ============================================================
-- Create/Refresh view: order_details_with_audit
-- Normalizes legacy column names and exposes enriched fields
-- Safe to run multiple times (DROP/CREATE)
-- ============================================================

BEGIN;

-- Drop old view if exists to avoid column mismatch
DROP VIEW IF EXISTS public.order_details_with_audit;

-- Helper: normalize status to current app domain
-- (paid -> approved, completed -> delivered, rejected -> failed)
CREATE OR REPLACE FUNCTION public._normalize_order_status(_s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE LOWER(_s)
    WHEN 'paid' THEN 'approved'
    WHEN 'completed' THEN 'delivered'
    WHEN 'rejected' THEN 'failed'
    ELSE _s
  END;
$$;

-- Build the view dynamically to tolerate schema differences between environments
DO $$
DECLARE
  has_unit_price_cents boolean;
  has_unit_price boolean;
  has_mp_payment_id boolean;
  has_payment_id boolean;
  has_mp_status boolean;
  has_payment_status boolean;
  has_mp_pref boolean;
  has_admin_notes boolean;
  has_delivered_at boolean;
  has_delivery_date boolean;
  has_actual_delivery_date boolean;
  has_total_amount_cents boolean;
  has_total_cents boolean;
  has_total_amount boolean;
  has_priority boolean;
  has_estimated_delivery boolean;
  has_last_status_change boolean;
  has_delivery_method boolean;
  has_tracking_number boolean;
  has_event_school boolean;
  has_event_school_name boolean;
  has_subject_email boolean;
  has_subject_phone boolean;
  has_audit_table boolean;
  has_contact_name boolean;
  has_contact_email boolean;
  has_contact_phone boolean;

  items_total_expr text;
  audit_cte_sql text := '';
  audit_join_sql text := '';
  audit_count_expr text := '0';
  audit_recent_expr text := 'NULL::jsonb';

  contact_name_expr text;
  contact_email_expr text;
  contact_phone_expr text;
  mp_payment_id_expr text;
  mp_status_expr text;
  mp_pref_expr text;
  admin_notes_expr text;
  delivered_at_expr text;
  total_amount_expr text;
  priority_expr text;
  est_deliv_expr text;
  actual_deliv_expr text;
  actual_deliv_parts text := '';
  delivery_method_expr text;
  tracking_num_expr text;
  last_status_change_expr text;
  event_school_expr text;
  subject_email_expr text;
  subject_phone_expr text;
  view_sql text;
BEGIN
  -- Column existence checks
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='order_items' AND column_name='unit_price_cents'
  ) INTO has_unit_price_cents;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='order_items' AND column_name='unit_price'
  ) INTO has_unit_price;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='mp_payment_id') INTO has_mp_payment_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_id') INTO has_payment_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='mp_status') INTO has_mp_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') INTO has_payment_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='mp_preference_id') INTO has_mp_pref;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='admin_notes') INTO has_admin_notes;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at') INTO has_delivered_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivery_date') INTO has_delivery_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='actual_delivery_date') INTO has_actual_delivery_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='total_amount_cents') INTO has_total_amount_cents;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='total_cents') INTO has_total_cents;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='total_amount') INTO has_total_amount;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='priority_level') INTO has_priority;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='estimated_delivery_date') INTO has_estimated_delivery;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='last_status_change') INTO has_last_status_change;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivery_method') INTO has_delivery_method;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_number') INTO has_tracking_number;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='school') INTO has_event_school;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='school_name') INTO has_event_school_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='email') INTO has_subject_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='phone') INTO has_subject_phone;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='order_audit_log') INTO has_audit_table;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='contact_name') INTO has_contact_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='contact_email') INTO has_contact_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='contact_phone') INTO has_contact_phone;

  -- Expressions
  items_total_expr := CASE 
    WHEN has_unit_price_cents THEN 'COALESCE(SUM(oi.quantity * oi.unit_price_cents), 0)'
    WHEN has_unit_price THEN 'COALESCE(SUM(oi.quantity * (oi.unit_price * 100)), 0)'
    ELSE '0' END;

  IF has_audit_table THEN
    audit_cte_sql := $AUD$,
audit AS (
  SELECT oal.order_id,
         COUNT(*) AS audit_log_count,
         (
           SELECT jsonb_agg(e ORDER BY e->>'created_at' DESC)
           FROM (
             SELECT jsonb_build_object(
               'action_type', oal2.action_type,
               'created_at', oal2.created_at,
               'changed_by_type', oal2.changed_by_type,
               'notes', oal2.notes
             ) AS e
             FROM public.order_audit_log oal2
             WHERE oal2.order_id = oal.order_id
             ORDER BY oal2.created_at DESC
             LIMIT 8
           ) q
         ) AS recent_audit_events
  FROM public.order_audit_log oal
  GROUP BY oal.order_id
)$AUD$;
    audit_join_sql := 'LEFT JOIN audit a ON a.order_id = o.id';
    audit_count_expr := 'COALESCE(a.audit_log_count, 0)';
    audit_recent_expr := 'a.recent_audit_events';
  END IF;

  -- Build contact fields only with existing columns to avoid invalid references
  contact_name_expr := (
    CASE 
      WHEN has_contact_name AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_name')
        THEN 'COALESCE(o.contact_name, o.customer_name, s.name)'
      WHEN has_contact_name THEN 'COALESCE(o.contact_name, s.name)'
      WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_name')
        THEN 'COALESCE(o.customer_name, s.name)'
      ELSE 's.name'
    END
  );

  contact_email_expr := (
    CASE 
      WHEN has_contact_email AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_email')
        THEN 'COALESCE(o.contact_email, o.customer_email' || CASE WHEN has_subject_email THEN ', s.email' ELSE '' END || ')'
      WHEN has_contact_email 
        THEN 'COALESCE(o.contact_email' || CASE WHEN has_subject_email THEN ', s.email' ELSE '' END || ')'
      WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_email')
        THEN 'COALESCE(o.customer_email' || CASE WHEN has_subject_email THEN ', s.email' ELSE '' END || ')'
      ELSE (CASE WHEN has_subject_email THEN 's.email' ELSE 'NULL::text' END)
    END
  );

  contact_phone_expr := (
    CASE 
      WHEN has_contact_phone AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_phone')
        THEN 'COALESCE(o.contact_phone, o.customer_phone' || CASE WHEN has_subject_phone THEN ', s.phone' ELSE '' END || ')'
      WHEN has_contact_phone 
        THEN 'COALESCE(o.contact_phone' || CASE WHEN has_subject_phone THEN ', s.phone' ELSE '' END || ')'
      WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_phone')
        THEN 'COALESCE(o.customer_phone' || CASE WHEN has_subject_phone THEN ', s.phone' ELSE '' END || ')'
      ELSE (CASE WHEN has_subject_phone THEN 's.phone' ELSE 'NULL::text' END)
    END
  );

  mp_payment_id_expr := (CASE WHEN has_mp_payment_id AND has_payment_id THEN 'COALESCE(o.mp_payment_id, o.payment_id)'
                               WHEN has_mp_payment_id THEN 'o.mp_payment_id'
                               WHEN has_payment_id THEN 'o.payment_id' ELSE 'NULL::text' END) || ' AS mp_payment_id';
  mp_status_expr     := (CASE WHEN has_mp_status AND has_payment_status THEN 'COALESCE(o.mp_status, o.payment_status)'
                               WHEN has_mp_status THEN 'o.mp_status'
                               WHEN has_payment_status THEN 'o.payment_status' ELSE 'NULL::text' END) || ' AS mp_status';
  mp_pref_expr       := (CASE WHEN has_mp_pref THEN 'o.mp_preference_id' ELSE 'NULL::text' END) || ' AS mp_preference_id';
  admin_notes_expr   := (CASE WHEN has_admin_notes THEN 'o.admin_notes' ELSE 'NULL::text' END) || ' AS admin_notes';

  delivered_at_expr  := (CASE 
    WHEN has_delivered_at THEN 'o.delivered_at'
    WHEN has_delivery_date THEN 'o.delivery_date'
    WHEN has_actual_delivery_date THEN '(o.actual_delivery_date::timestamp)'
    ELSE 'NULL::timestamptz' END) || ' AS delivered_at';

  total_amount_expr  := (CASE 
    WHEN has_total_amount_cents THEN 'COALESCE(o.total_amount_cents, i.items_total_cents, 0)'
    WHEN has_total_cents THEN 'COALESCE(o.total_cents, i.items_total_cents, 0)'
    WHEN has_total_amount THEN 'COALESCE(o.total_amount, i.items_total_cents, 0)'
    ELSE 'COALESCE(i.items_total_cents, 0)'
  END) || ' AS total_amount_cents';

  priority_expr      := (CASE WHEN has_priority THEN 'o.priority_level' ELSE 'NULL::int' END) || ' AS priority_level';
  est_deliv_expr     := (CASE WHEN has_estimated_delivery THEN 'o.estimated_delivery_date' ELSE 'NULL::date' END) || ' AS estimated_delivery_date';
  -- Build actual_delivery_date dynamically with only existing columns (order: actual, delivered, delivery)
  IF has_actual_delivery_date THEN
    actual_deliv_parts := 'o.actual_delivery_date';
  END IF;
  IF has_delivered_at THEN
    actual_deliv_parts := CASE WHEN actual_deliv_parts = '' THEN 'o.delivered_at' ELSE actual_deliv_parts || ', o.delivered_at' END;
  END IF;
  IF has_delivery_date THEN
    actual_deliv_parts := CASE WHEN actual_deliv_parts = '' THEN 'o.delivery_date' ELSE actual_deliv_parts || ', o.delivery_date' END;
  END IF;
  actual_deliv_expr := CASE 
    WHEN actual_deliv_parts = '' THEN 'NULL::date'
    ELSE 'COALESCE(' || actual_deliv_parts || ')::date'
  END || ' AS actual_delivery_date';
  delivery_method_expr := (CASE WHEN has_delivery_method THEN 'o.delivery_method' ELSE 'NULL::text' END) || ' AS delivery_method';
  tracking_num_expr    := (CASE WHEN has_tracking_number THEN 'o.tracking_number' ELSE 'NULL::text' END) || ' AS tracking_number';
  last_status_change_expr := (CASE WHEN has_last_status_change THEN 'o.last_status_change' ELSE 'NULL::timestamptz' END) || ' AS last_status_change';

  event_school_expr := CASE WHEN has_event_school THEN 'e.school'
                            WHEN has_event_school_name THEN 'e.school_name'
                            ELSE 'NULL::text' END || ' AS event_school';
  subject_email_expr := (CASE WHEN has_subject_email THEN 's.email' ELSE 'NULL::text' END) || ' AS subject_email';
  subject_phone_expr := (CASE WHEN has_subject_phone THEN 's.phone' ELSE 'NULL::text' END) || ' AS subject_phone';

  view_sql := format($VIEW$CREATE VIEW public.order_details_with_audit AS
WITH items AS (
  SELECT oi.order_id,
         COALESCE(SUM(oi.quantity), 0) AS total_items,
         %s AS items_total_cents
  FROM public.order_items oi
  GROUP BY oi.order_id
)
%s
SELECT 
  o.id,
  o.event_id,
  o.subject_id,
  %s AS contact_name,
  %s AS contact_email,
  %s AS contact_phone,
  public._normalize_order_status(COALESCE(o.status, 'pending')) AS status,
  %s,
  %s,
  %s,
  o.notes,
  %s,
  o.created_at,
  %s,
  %s,
  COALESCE(i.total_items, 0) AS total_items,
  %s,
  %s,
  %s,
  %s,
  %s,
  %s,
  CASE 
    WHEN public._normalize_order_status(COALESCE(o.status, 'pending')) = 'pending' 
         AND o.created_at < NOW() - INTERVAL '24 hours' THEN 'pending_overdue'
    WHEN public._normalize_order_status(COALESCE(o.status, 'pending')) = 'approved'
         AND %s IS NOT NULL
         AND %s < CURRENT_DATE THEN 'delivery_overdue'
    ELSE public._normalize_order_status(COALESCE(o.status, 'pending'))
  END AS enhanced_status,
  EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 AS hours_since_created,
  CASE WHEN %s IS NOT NULL 
       THEN EXTRACT(EPOCH FROM (NOW() - %s)) / 3600
       ELSE NULL END AS hours_since_status_change,
  e.name AS event_name,
  %s,
  e.date AS event_date,
  s.name AS subject_name,
  %s,
  %s,
  %s AS audit_log_count,
  %s AS recent_audit_events
FROM public.orders o
LEFT JOIN public.events   e ON e.id = o.event_id
LEFT JOIN public.subjects s ON s.id = o.subject_id
LEFT JOIN items i           ON i.order_id = o.id
%s;$VIEW$,
  items_total_expr,
  audit_cte_sql,
  contact_name_expr,
  contact_email_expr,
  contact_phone_expr,
  mp_payment_id_expr,
  mp_status_expr,
  mp_pref_expr,
  admin_notes_expr,
  delivered_at_expr,
  total_amount_expr,
  priority_expr,
  est_deliv_expr,
  actual_deliv_expr,
  delivery_method_expr,
  tracking_num_expr,
  last_status_change_expr,
  -- used twice in enhanced status clause
  split_part(est_deliv_expr, ' AS ', 1),
  split_part(est_deliv_expr, ' AS ', 1),
  split_part(last_status_change_expr, ' AS ', 1),
  split_part(last_status_change_expr, ' AS ', 1),
  event_school_expr,
  subject_email_expr,
  subject_phone_expr,
  audit_count_expr,
  audit_recent_expr,
  audit_join_sql);

  EXECUTE view_sql;
END$$;

-- Permissions: service role and authenticated read are safe
GRANT SELECT ON public.order_details_with_audit TO authenticated;
GRANT SELECT ON public.order_details_with_audit TO service_role;

COMMIT;
