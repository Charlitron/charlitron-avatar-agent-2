-- ============================================
-- ACTUALIZACIÓN DE TABLA CITAS
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna de duración (en horas)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion INTEGER DEFAULT 1;

-- 2. Actualizar el campo 'estado' para que tenga un valor por defecto
ALTER TABLE citas ALTER COLUMN estado SET DEFAULT 'pendiente';

-- 3. Opcional: Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN citas.duracion IS 'Duración del servicio en horas (1-6)';
COMMENT ON COLUMN citas.motivo IS 'Descripción del servicio: Consultoría Marketing, Perifoneo, Volanteo, Activación, Producción Visual, Otros';
COMMENT ON COLUMN citas.estado IS 'Estado de la cita: pendiente, confirmada, cancelada, completada';

-- 4. Ver la estructura actualizada
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
