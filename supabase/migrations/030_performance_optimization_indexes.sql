-- Performance optimization indexes for LookEscolar
-- Created: 2025-01-20
-- Purpose: Add composite indexes for common query patterns to improve performance

-- Photo query optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_approved_created 
ON photos(event_id, approved, created_at DESC) 
WHERE approved = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_subject_approved_created 
ON photos(subject_id, approved, created_at DESC) 
WHERE approved = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_subject_approved 
ON photos(event_id, subject_id, approved) 
WHERE approved = true;

-- Photo-student relationship optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_students_photo_id 
ON photo_students(photo_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_students_student_id 
ON photo_students(student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_students_composite 
ON photo_students(photo_id, student_id);

-- Order and payment optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_status 
ON orders(created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_photo_order 
ON order_items(photo_id, order_id);

-- Token and access optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_tokens_student_expires 
ON family_tokens(student_id, expires_at) 
WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_tokens_token_valid 
ON family_tokens(token) 
WHERE expires_at > NOW();

-- Event and subject optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_event_active 
ON subjects(event_id, active) 
WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_active_created 
ON events(active, created_at DESC) 
WHERE active = true;

-- Search and filtering optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_filename_search 
ON photos USING gin(to_tsvector('spanish', original_filename));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_name_search 
ON students USING gin(to_tsvector('spanish', first_name || ' ' || last_name));

-- Analytics and reporting optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_date_event 
ON egress_metrics(date DESC, event_id);

-- Storage and file management optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_storage_path 
ON photos(storage_path) 
WHERE storage_path IS NOT NULL;

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name varchar(100) NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit varchar(20) NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_date 
ON performance_metrics(metric_name, created_at DESC);

-- Add table comments for documentation
COMMENT ON INDEX idx_photos_event_approved_created IS 'Optimizes photo gallery loading by event';
COMMENT ON INDEX idx_photos_subject_approved_created IS 'Optimizes photo gallery loading by subject';
COMMENT ON INDEX idx_photo_students_composite IS 'Optimizes photo-student relationship queries';
COMMENT ON INDEX idx_orders_created_status IS 'Optimizes order listing and status filtering';
COMMENT ON INDEX idx_family_tokens_token_valid IS 'Optimizes family access token validation';

-- Analyze tables to update statistics
ANALYZE photos;
ANALYZE photo_students; 
ANALYZE orders;
ANALYZE order_items;
ANALYZE family_tokens;
ANALYZE subjects;
ANALYZE events;