-- Crear tabla photo_subjects (relación muchos a muchos entre fotos y sujetos)
CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Evitar duplicados
  UNIQUE(photo_id, subject_id)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);

-- Crear tabla payments (para tracking de pagos de Mercado Pago)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id BIGINT UNIQUE, -- ID de pago de Mercado Pago
  mp_preference_id TEXT,
  mp_status TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT DEFAULT 'ARS',
  payment_method TEXT,
  payer_email TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  processed_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  raw_webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_processed_at ON payments(processed_at);

-- Activar Row Level Security
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para photo_subjects
-- Solo admin puede crear/modificar/eliminar asignaciones
CREATE POLICY "Admin full access to photo_subjects" ON photo_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id
    )
  );

-- Las familias pueden ver las asignaciones de sus fotos mediante token
CREATE POLICY "Families can view their photo assignments" ON photo_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subject_tokens st
      WHERE st.subject_id = photo_subjects.subject_id
      AND st.expires_at > NOW()
    )
  );

-- Políticas RLS para payments
-- Solo admin puede ver todos los pagos
CREATE POLICY "Admin can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id
    )
  );

-- Las familias pueden ver pagos de sus órdenes
CREATE POLICY "Families can view their order payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN subjects s ON o.subject_id = s.id
      JOIN subject_tokens st ON st.subject_id = s.id
      WHERE o.id = payments.order_id
      AND st.expires_at > NOW()
    )
  );

-- Solo el sistema puede crear/actualizar pagos (mediante service role)
CREATE POLICY "System can manage payments" ON payments
  FOR ALL USING (false) WITH CHECK (false);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE photo_subjects IS 'Tabla de relación muchos a muchos entre fotos y sujetos (alumnos)';
COMMENT ON TABLE payments IS 'Registro de pagos procesados por Mercado Pago';
COMMENT ON COLUMN payments.mp_payment_id IS 'ID único del pago en Mercado Pago';
COMMENT ON COLUMN payments.mp_status IS 'Estado del pago en MP: approved, pending, in_process, rejected';
COMMENT ON COLUMN payments.raw_webhook_data IS 'Datos crudos del webhook de MP para auditoría';