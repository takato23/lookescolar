-- Script para asignar tenant_id a eventos existentes
-- Ejecutar desde Supabase SQL Editor

-- 1. Ver eventos sin tenant_id
SELECT id, name, tenant_id FROM events WHERE tenant_id IS NULL;

-- 2. Asignar tenant_id a todos los eventos que no lo tienen
UPDATE events
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- 3. Verificar que se asignó correctamente
SELECT id, name, tenant_id FROM events;
