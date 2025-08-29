-- Añadir campo theme a la tabla events
-- Permite selección manual de tema por evento

-- Añadir la columna theme
ALTER TABLE events 
ADD COLUMN theme VARCHAR(20) DEFAULT 'default' CHECK (theme IN ('default', 'jardin', 'secundaria', 'bautismo'));

-- Añadir comentario para documentar el campo
COMMENT ON COLUMN events.theme IS 'Tema visual para la galería y tienda: default, jardin, secundaria, bautismo';

-- Actualizar eventos existentes para usar tema default
UPDATE events SET theme = 'default' WHERE theme IS NULL;

-- Crear índice para mejorar queries por tema
CREATE INDEX IF NOT EXISTS idx_events_theme ON events(theme);
