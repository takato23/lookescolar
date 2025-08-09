-- Performance indexes
CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_subject_id ON photos(subject_id);
CREATE INDEX idx_subjects_event_id ON subjects(event_id);
CREATE INDEX idx_orders_subject_id ON orders(subject_id);
CREATE INDEX idx_orders_mp_payment_id ON orders(mp_payment_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_subject_tokens_subject ON subject_tokens(subject_id);
CREATE INDEX idx_events_active ON events(active);
CREATE INDEX idx_email_queue_status ON email_queue(status);

-- Optimized indexes for common queries
CREATE INDEX idx_photos_event_subject ON photos(event_id, subject_id) WHERE approved = true;
CREATE INDEX idx_orders_subject_status ON orders(subject_id, status);
-- Índices sin WHERE dinámico (para evitar error de IMMUTABLE)
CREATE INDEX idx_subject_tokens_token_expires ON subject_tokens(token, expires_at);
CREATE INDEX idx_subject_tokens_active ON subject_tokens(subject_id, expires_at);