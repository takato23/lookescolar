-- Migration: Enhanced batch tagging functions and triggers
-- Date: 2024-01-15
-- Description: Add functions for efficient batch photo tagging operations

-- Function: batch_assign_photos
-- Assigns multiple photos to subjects in a single transaction
CREATE OR REPLACE FUNCTION batch_assign_photos(
    p_event_id UUID,
    p_assignments JSONB[]
) RETURNS TABLE(
    photo_id UUID,
    subject_id UUID,
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assignment JSONB;
    photo_uuid UUID;
    subject_uuid UUID;
    photo_exists BOOLEAN;
    subject_exists BOOLEAN;
BEGIN
    -- Validate event exists
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id) THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;

    -- Process each assignment
    FOREACH assignment IN ARRAY p_assignments
    LOOP
        photo_uuid := (assignment->>'photo_id')::UUID;
        subject_uuid := (assignment->>'subject_id')::UUID;

        -- Validate photo exists and belongs to event
        SELECT EXISTS (
            SELECT 1 FROM photos 
            WHERE id = photo_uuid 
            AND event_id = p_event_id 
            AND approved = true
        ) INTO photo_exists;

        -- Validate subject exists and belongs to event
        SELECT EXISTS (
            SELECT 1 FROM subjects 
            WHERE id = subject_uuid 
            AND event_id = p_event_id
        ) INTO subject_exists;

        IF photo_exists AND subject_exists THEN
            -- Remove any existing assignment for this photo
            DELETE FROM photo_subjects 
            WHERE photo_id = photo_uuid;

            -- Insert new assignment
            INSERT INTO photo_subjects (photo_id, subject_id, tagged_at, tagged_by)
            VALUES (photo_uuid, subject_uuid, NOW(), 'system')
            ON CONFLICT (photo_id, subject_id) DO UPDATE SET
                tagged_at = NOW(),
                tagged_by = 'system';

            -- Update photos table for backward compatibility
            UPDATE photos 
            SET subject_id = subject_uuid 
            WHERE id = photo_uuid;

            RETURN QUERY SELECT photo_uuid, subject_uuid, true, NULL::TEXT;
        ELSE
            RETURN QUERY SELECT 
                photo_uuid, 
                subject_uuid, 
                false, 
                CASE 
                    WHEN NOT photo_exists THEN 'Photo not found or not approved'
                    WHEN NOT subject_exists THEN 'Subject not found'
                    ELSE 'Unknown error'
                END;
        END IF;
    END LOOP;
END;
$$;

-- Function: batch_unassign_photos
-- Removes assignments for multiple photos in a single transaction
CREATE OR REPLACE FUNCTION batch_unassign_photos(
    p_event_id UUID,
    p_photo_ids UUID[]
) RETURNS TABLE(
    photo_id UUID,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    photo_uuid UUID;
    photo_exists BOOLEAN;
BEGIN
    -- Validate event exists
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id) THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;

    -- Process each photo
    FOREACH photo_uuid IN ARRAY p_photo_ids
    LOOP
        -- Validate photo exists and belongs to event
        SELECT EXISTS (
            SELECT 1 FROM photos 
            WHERE id = photo_uuid 
            AND event_id = p_event_id
        ) INTO photo_exists;

        IF photo_exists THEN
            -- Remove assignment from photo_subjects
            DELETE FROM photo_subjects 
            WHERE photo_id = photo_uuid;

            -- Clear subject_id from photos table
            UPDATE photos 
            SET subject_id = NULL 
            WHERE id = photo_uuid;

            RETURN QUERY SELECT photo_uuid, true, NULL::TEXT;
        ELSE
            RETURN QUERY SELECT photo_uuid, false, 'Photo not found in event'::TEXT;
        END IF;
    END LOOP;
END;
$$;

-- Function: get_tagging_suggestions
-- Generates smart tagging suggestions based on patterns
CREATE OR REPLACE FUNCTION get_tagging_suggestions(
    p_event_id UUID,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE(
    suggestion_id TEXT,
    suggestion_type TEXT,
    title TEXT,
    description TEXT,
    photo_ids UUID[],
    confidence NUMERIC,
    reasoning TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Sequence-based suggestions (photos taken within 30 seconds)
    RETURN QUERY
    WITH photo_sequences AS (
        SELECT 
            'seq_' || ROW_NUMBER() OVER () as suggestion_id,
            'sequence' as suggestion_type,
            'Secuencia de ' || COUNT(*) || ' fotos' as title,
            'Fotos consecutivas que probablemente pertenecen al mismo sujeto' as description,
            ARRAY_AGG(id ORDER BY created_at) as photo_ids,
            0.8 as confidence,
            'Fotos tomadas en secuencia temporal cercana (< 30 segundos)' as reasoning
        FROM (
            SELECT 
                id,
                created_at,
                LAG(created_at) OVER (ORDER BY created_at) as prev_created_at
            FROM photos 
            WHERE event_id = p_event_id 
            AND approved = true 
            AND subject_id IS NULL
        ) photos_with_lag
        WHERE prev_created_at IS NULL 
        OR EXTRACT(EPOCH FROM (created_at - prev_created_at)) <= 30
        GROUP BY DATE_TRUNC('minute', created_at)
        HAVING COUNT(*) >= 3
        LIMIT p_limit
    )
    SELECT * FROM photo_sequences;

    -- Pattern-based suggestions (similar metadata)
    RETURN QUERY
    WITH metadata_patterns AS (
        SELECT 
            'pattern_' || ROW_NUMBER() OVER () as suggestion_id,
            'pattern' as suggestion_type,
            COUNT(*) || ' fotos con patrón similar' as title,
            'Patrón: ' || COALESCE(metadata->>'camera', 'Sin metadata') as description,
            ARRAY_AGG(id) as photo_ids,
            0.6 as confidence,
            'Patrón detectado en metadata: ' || COALESCE(metadata->>'camera', 'Sin camera info') as reasoning
        FROM photos
        WHERE event_id = p_event_id 
        AND approved = true 
        AND subject_id IS NULL
        AND metadata IS NOT NULL
        GROUP BY metadata->>'camera'
        HAVING COUNT(*) >= 2
        LIMIT (p_limit - 1)
    )
    SELECT * FROM metadata_patterns;

END;
$$;

-- Function: get_tagging_statistics
-- Returns comprehensive tagging statistics for an event
CREATE OR REPLACE FUNCTION get_tagging_statistics(p_event_id UUID)
RETURNS TABLE(
    total_photos INTEGER,
    tagged_photos INTEGER,
    untagged_photos INTEGER,
    progress_percentage NUMERIC,
    subjects_with_photos INTEGER,
    subjects_without_photos INTEGER,
    average_photos_per_subject NUMERIC,
    tagging_rate_last_hour NUMERIC,
    most_active_subject_id UUID,
    most_active_subject_name TEXT,
    most_active_subject_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_count INTEGER;
    tagged_count INTEGER;
    untagged_count INTEGER;
    progress_pct NUMERIC;
    subjects_with INTEGER;
    subjects_without INTEGER;
    avg_per_subject NUMERIC;
    rate_last_hour NUMERIC;
    most_active_id UUID;
    most_active_name TEXT;
    most_active_count INTEGER;
BEGIN
    -- Basic counts
    SELECT COUNT(*) INTO total_count
    FROM photos 
    WHERE event_id = p_event_id AND approved = true;

    SELECT COUNT(*) INTO tagged_count
    FROM photos 
    WHERE event_id = p_event_id AND approved = true AND subject_id IS NOT NULL;

    untagged_count := total_count - tagged_count;
    
    progress_pct := CASE 
        WHEN total_count > 0 THEN ROUND((tagged_count::NUMERIC / total_count::NUMERIC) * 100, 2)
        ELSE 0 
    END;

    -- Subject statistics
    SELECT 
        COUNT(*) FILTER (WHERE photo_count > 0),
        COUNT(*) FILTER (WHERE photo_count = 0)
    INTO subjects_with, subjects_without
    FROM (
        SELECT 
            s.id,
            COUNT(p.id) as photo_count
        FROM subjects s
        LEFT JOIN photos p ON s.id = p.subject_id AND p.approved = true
        WHERE s.event_id = p_event_id
        GROUP BY s.id
    ) subject_counts;

    avg_per_subject := CASE 
        WHEN subjects_with > 0 THEN ROUND(tagged_count::NUMERIC / subjects_with::NUMERIC, 2)
        ELSE 0 
    END;

    -- Tagging rate in last hour
    SELECT COUNT(*) INTO rate_last_hour
    FROM photo_subjects ps
    JOIN photos p ON ps.photo_id = p.id
    WHERE p.event_id = p_event_id
    AND ps.tagged_at >= NOW() - INTERVAL '1 hour';

    -- Most active subject
    SELECT 
        s.id,
        s.name,
        COUNT(p.id)
    INTO most_active_id, most_active_name, most_active_count
    FROM subjects s
    JOIN photos p ON s.id = p.subject_id AND p.approved = true
    WHERE s.event_id = p_event_id
    GROUP BY s.id, s.name
    ORDER BY COUNT(p.id) DESC
    LIMIT 1;

    RETURN QUERY SELECT 
        total_count,
        tagged_count,
        untagged_count,
        progress_pct,
        subjects_with,
        subjects_without,
        avg_per_subject,
        rate_last_hour,
        most_active_id,
        most_active_name,
        most_active_count;
END;
$$;

-- Trigger: update_photo_assignment_timestamp
-- Updates tagged_at when photo assignments change
CREATE OR REPLACE FUNCTION update_photo_assignment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.tagged_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply the trigger to photo_subjects table
DROP TRIGGER IF EXISTS photo_subjects_update_timestamp ON photo_subjects;
CREATE TRIGGER photo_subjects_update_timestamp
    BEFORE UPDATE ON photo_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_assignment_timestamp();

-- Index optimizations for batch operations
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_event_subject ON photos(event_id, subject_id) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_photos_filename_search ON photos USING gin(to_tsvector('spanish', filename));

-- Grant permissions
GRANT EXECUTE ON FUNCTION batch_assign_photos TO authenticated;
GRANT EXECUTE ON FUNCTION batch_unassign_photos TO authenticated;
GRANT EXECUTE ON FUNCTION get_tagging_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_tagging_statistics TO authenticated;