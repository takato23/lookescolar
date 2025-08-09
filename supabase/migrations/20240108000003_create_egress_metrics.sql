-- Migración para tabla de métricas de egress según CLAUDE.md
-- Tracking de transferencia de datos por evento y por día

CREATE TABLE IF NOT EXISTS egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bytes_served BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar queries frecuentes
CREATE INDEX IF NOT EXISTS idx_egress_metrics_date ON egress_metrics(date);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_id ON egress_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_date ON egress_metrics(event_id, date);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_date_desc ON egress_metrics(date DESC);

-- Índice compuesto para queries de resumen mensual
CREATE INDEX IF NOT EXISTS idx_egress_metrics_monthly ON egress_metrics(date, event_id, bytes_served);

-- Constraint para evitar entradas duplicadas por evento/día
CREATE UNIQUE INDEX IF NOT EXISTS idx_egress_metrics_unique_event_date 
ON egress_metrics(event_id, date) 
WHERE event_id IS NOT NULL;

-- Constraint para entradas globales (sin evento específico)
CREATE UNIQUE INDEX IF NOT EXISTS idx_egress_metrics_unique_global_date 
ON egress_metrics(date) 
WHERE event_id IS NULL;

-- RLS (Row Level Security) habilitado
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- Política para service role (acceso completo)
CREATE POLICY "Service role can manage all egress metrics" 
ON egress_metrics 
FOR ALL 
TO service_role 
USING (true);

-- Política para usuarios autenticados (solo lectura de sus eventos)
CREATE POLICY "Users can view egress metrics for their events" 
ON egress_metrics 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = egress_metrics.event_id 
    AND events.created_by = auth.uid()
  )
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_egress_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_egress_metrics_updated_at
  BEFORE UPDATE ON egress_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_egress_metrics_updated_at();

-- Función para obtener resumen mensual (optimizada)
CREATE OR REPLACE FUNCTION get_monthly_egress_summary(target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE))
RETURNS TABLE (
  total_bytes BIGINT,
  total_requests BIGINT,
  unique_events INTEGER,
  avg_bytes_per_request NUMERIC,
  days_with_data INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(em.bytes_served), 0) as total_bytes,
    COALESCE(SUM(em.requests_count), 0) as total_requests,
    COUNT(DISTINCT em.event_id)::INTEGER as unique_events,
    CASE 
      WHEN SUM(em.requests_count) > 0 
      THEN ROUND(SUM(em.bytes_served)::NUMERIC / SUM(em.requests_count)::NUMERIC, 2)
      ELSE 0 
    END as avg_bytes_per_request,
    COUNT(DISTINCT em.date)::INTEGER as days_with_data
  FROM egress_metrics em
  WHERE em.date >= DATE_TRUNC('month', target_month)
    AND em.date < (DATE_TRUNC('month', target_month) + INTERVAL '1 month')
    AND em.bytes_served > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpieza de métricas viejas
CREATE OR REPLACE FUNCTION cleanup_old_egress_metrics(older_than_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM egress_metrics 
  WHERE date < (CURRENT_DATE - older_than_days * INTERVAL '1 day');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para dashboards de administrador
CREATE OR REPLACE VIEW admin_egress_summary AS
SELECT 
  em.date,
  e.name as event_name,
  e.school_name,
  em.bytes_served,
  em.requests_count,
  CASE 
    WHEN em.requests_count > 0 
    THEN ROUND(em.bytes_served::NUMERIC / em.requests_count::NUMERIC, 2)
    ELSE 0 
  END as avg_bytes_per_request,
  ROUND(em.bytes_served / (1024.0 * 1024.0), 2) as mb_served
FROM egress_metrics em
LEFT JOIN events e ON e.id = em.event_id
WHERE em.bytes_served > 0
ORDER BY em.date DESC, em.bytes_served DESC;

-- Comentarios de documentación
COMMENT ON TABLE egress_metrics IS 'Tracking de transferencia de datos (egress) por evento y fecha para monitoreo de límites según CLAUDE.md';
COMMENT ON COLUMN egress_metrics.event_id IS 'Referencia al evento (NULL para métricas globales)';
COMMENT ON COLUMN egress_metrics.date IS 'Fecha de la métrica (YYYY-MM-DD)';
COMMENT ON COLUMN egress_metrics.bytes_served IS 'Total de bytes transferidos en el día';
COMMENT ON COLUMN egress_metrics.requests_count IS 'Total de requests que generaron transferencia';
COMMENT ON FUNCTION get_monthly_egress_summary IS 'Obtiene resumen de egress para un mes específico';
COMMENT ON FUNCTION cleanup_old_egress_metrics IS 'Limpia métricas más viejas que X días (default: 90)';
COMMENT ON VIEW admin_egress_summary IS 'Vista para dashboards de admin con métricas de egress agrupadas por evento';