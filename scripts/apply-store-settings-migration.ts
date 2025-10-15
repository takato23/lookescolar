/**
 * Script para aplicar la migración de store_settings
 * Ejecutar con: npx tsx scripts/apply-store-settings-migration.ts
 */

import { createClient } from '../lib/supabase/client';

async function applyStoreSettingsMigration() {
  console.log('🚀 Aplicando migración de store_settings...');

  const supabase = createClient();

  // Crear la tabla store_settings
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.store_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,

      -- Configuración básica
      enabled BOOLEAN DEFAULT false,
      template TEXT DEFAULT 'pixieset',
      currency TEXT DEFAULT 'ARS',

      -- Colores
      colors JSONB DEFAULT '{"primary": "#1f2937", "secondary": "#6b7280", "accent": "#3b82f6", "background": "#f9fafb", "surface": "#ffffff", "text": "#111827", "text_secondary": "#6b7280"}'::jsonb,

      -- Textos
      texts JSONB DEFAULT '{"hero_title": "Galería Fotográfica", "hero_subtitle": "Encuentra tus mejores momentos escolares", "footer_text": "© 2024 LookEscolar - Fotografía Escolar", "contact_email": "", "contact_phone": "", "terms_url": "", "privacy_url": ""}'::jsonb,

      -- Configuración de tema
      theme_customization JSONB DEFAULT '{"custom_css": "", "header_style": "default", "gallery_layout": "grid", "photo_aspect_ratio": "auto", "show_photo_numbers": true, "enable_zoom": true, "enable_fullscreen": true, "mobile_columns": 2, "desktop_columns": 4, "template_variant": "pixieset"}'::jsonb,

      -- Productos
      products JSONB DEFAULT '{}'::jsonb,

      -- Métodos de pago
      payment_methods JSONB DEFAULT '{"mercadopago": {"enabled": true, "name": "Mercado Pago", "description": "Pago online con tarjetas y billeteras virtuales", "icon": "CreditCard"}}'::jsonb,

      -- URLs
      logo_url TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',

      -- Características
      features JSONB DEFAULT '{"allowExtrasOnly": true, "showFAQ": true, "showBadges": true}'::jsonb,

      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Índice para event_id
    CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

    -- Constraint único para event_id
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
      ) THEN
        ALTER TABLE store_settings ADD CONSTRAINT store_settings_event_id_unique UNIQUE (event_id);
      END IF;
    END $$;

    -- Trigger para updated_at
    CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_store_settings_updated_at
      BEFORE UPDATE ON store_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_store_settings_updated_at();

    -- Permisos para la tabla
    GRANT ALL ON store_settings TO service_role;
    GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

    -- Permisos para la función
    GRANT EXECUTE ON FUNCTION update_store_settings_updated_at() TO service_role, authenticated;
  `;

  try {
    // Intentar ejecutar la migración usando RPC (si está disponible)
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (rpcError) {
      console.error('❌ Error ejecutando migración via RPC:', rpcError);

      // Si RPC no está disponible, mostrar instrucciones
      console.log('\n📋 INSTRUCCIONES MANUALES:');
      console.log('1. Abrir Supabase Dashboard → SQL Editor');
      console.log('2. Copiar y pegar el siguiente SQL:');
      console.log('3. Ejecutar la consulta');

      // Dividir el SQL en líneas para mejor legibilidad
      const sqlLines = createTableSQL.split('\n');
      sqlLines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`${String(index + 1).padStart(3, ' ')}: ${line}`);
        }
      });

      return;
    }

    console.log('✅ Migración aplicada exitosamente via RPC');
    console.log('📊 Resultado:', rpcData);

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);

    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('La migración debe aplicarse manualmente en Supabase:');
    console.log('1. Abrir Supabase Dashboard → SQL Editor');
    console.log('2. Ejecutar el SQL proporcionado arriba');
  }
}

// Ejecutar la migración
applyStoreSettingsMigration().catch(console.error);
