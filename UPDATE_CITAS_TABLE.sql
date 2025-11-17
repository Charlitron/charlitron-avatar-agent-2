-- ============================================
-- ACTUALIZACIÓN DE TABLA CITAS
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna de duración (en horas)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion INTEGER DEFAULT 1;

-- 2. Agregar columna para ID del evento en Google Calendar
ALTER TABLE citas ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- 3. Actualizar el campo 'estado' para que tenga un valor por defecto
ALTER TABLE citas ALTER COLUMN estado SET DEFAULT 'pendiente';

-- 4. Opcional: Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN citas.duracion IS 'Duración del servicio en horas (1-6)';
COMMENT ON COLUMN citas.google_event_id IS 'ID del evento creado en Google Calendar';
COMMENT ON COLUMN citas.motivo IS 'Descripción del servicio: Consultoría Marketing, Perifoneo, Volanteo, Activación, Producción Visual, Otros';
COMMENT ON COLUMN citas.estado IS 'Estado de la cita: pendiente, confirmada, cancelada, completada';

-- 5. Ver la estructura actualizada
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'citas'
ORDER BY ordinal_position;

-- ============================================
-- DATOS DE EJEMPLO
-- ============================================
-- Puedes probar insertando una cita de ejemplo:
/*
INSERT INTO citas (nombre, email, telefono, fecha, hora, motivo, duracion, estado)
VALUES (
  'Juan Pérez',
  'juan@ejemplo.com',
  '555-1234',
  '2025-11-18',
  '10:00',
  'Perifoneo - 2h',
  2,
  'pendiente'
);
*/
