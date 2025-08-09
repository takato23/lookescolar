-- ============================================================
-- Script para ejecutar en Supabase SQL Editor
-- Ve a: https://supabase.com/dashboard/project/exaighpowgvbdappydyx/sql/new
-- Copia y pega este código, luego ejecuta
-- ============================================================

-- Crear tabla de configuración de pagos
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  public_key TEXT,
  access_token TEXT,
  webhook_secret TEXT,
  additional_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  
  -- Asegurar solo una configuración activa por proveedor
  CONSTRAINT unique_active_provider UNIQUE (provider, is_active)
);

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_payment_settings_provider ON payment_settings(provider, is_active);

-- Habilitar RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo service role puede acceder
CREATE POLICY "Service role has full access to payment_settings" ON payment_settings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER trigger_update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_settings_updated_at();

-- Insertar configuración sandbox por defecto (opcional)
INSERT INTO payment_settings (
  provider,
  environment,
  public_key,
  access_token,
  webhook_secret,
  additional_config,
  is_active
) VALUES (
  'mercadopago',
  'sandbox',
  NULL, -- Se configurará desde el panel admin
  NULL, -- Se configurará desde el panel admin
  NULL, -- Se configurará desde el panel admin
  '{"auto_return": "approved", "binary_mode": true}',
  true
) ON CONFLICT (provider, is_active) WHERE is_active = true DO NOTHING;

-- Agregar comentarios
COMMENT ON TABLE payment_settings IS 'Almacena configuraciones de pasarelas de pago (las credenciales deben ser encriptadas en producción)';
COMMENT ON COLUMN payment_settings.access_token IS 'Token de acceso encriptado - manejar con cuidado';
COMMENT ON COLUMN payment_settings.webhook_secret IS 'Secret del webhook encriptado - manejar con cuidado';

-- Confirmar creación
SELECT 'Tabla payment_settings creada exitosamente' as mensaje;