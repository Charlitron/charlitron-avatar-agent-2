-- ============================================
-- SCRIPT SQL PARA SUPABASE
-- Charlitron Avatar Agent
-- ============================================

-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE CITAS
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_email ON citas(email);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. CREAR TABLA DE CONSULTAS
-- ============================================
CREATE TABLE IF NOT EXISTS consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  tipo_info TEXT,
  user_info JSONB,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consultas_tipo ON consultas(tipo_info);
CREATE INDEX IF NOT EXISTS idx_consultas_session ON consultas(session_id);
CREATE INDEX IF NOT EXISTS idx_consultas_created ON consultas(created_at DESC);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS DE SEGURIDAD
-- ============================================

-- Política para CITAS: Permitir insertar (público puede agendar)
DROP POLICY IF EXISTS "Permitir inserts públicos en citas" ON citas;
CREATE POLICY "Permitir inserts públicos en citas" 
ON citas FOR INSERT 
WITH CHECK (true);

-- Política para CITAS: Permitir lectura (puedes ajustar según necesites)
DROP POLICY IF EXISTS "Permitir lectura pública de citas" ON citas;
CREATE POLICY "Permitir lectura pública de citas" 
ON citas FOR SELECT 
USING (true);

-- Política para CITAS: Permitir actualización (ajusta según necesites)
DROP POLICY IF EXISTS "Permitir actualización de citas" ON citas;
CREATE POLICY "Permitir actualización de citas" 
ON citas FOR UPDATE 
USING (true);

-- Política para CONSULTAS: Permitir insertar
DROP POLICY IF EXISTS "Permitir inserts públicos en consultas" ON consultas;
CREATE POLICY "Permitir inserts públicos en consultas" 
ON consultas FOR INSERT 
WITH CHECK (true);

-- Política para CONSULTAS: Permitir lectura
DROP POLICY IF EXISTS "Permitir lectura de consultas" ON consultas;
CREATE POLICY "Permitir lectura de consultas" 
ON consultas FOR SELECT 
USING (true);

-- ============================================
-- 5. FUNCIONES AUXILIARES (OPCIONAL)
-- ============================================

-- Función para obtener citas por fecha
CREATE OR REPLACE FUNCTION obtener_citas_por_fecha(fecha_buscada DATE)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  telefono TEXT,
  fecha DATE,
  hora TIME,
  motivo TEXT,
  estado TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nombre,
    c.email,
    c.telefono,
    c.fecha,
    c.hora,
    c.motivo,
    c.estado
  FROM citas c
  WHERE c.fecha = fecha_buscada
  ORDER BY c.hora;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de citas
CREATE OR REPLACE FUNCTION estadisticas_citas()
RETURNS TABLE (
  total_citas BIGINT,
  citas_pendientes BIGINT,
  citas_confirmadas BIGINT,
  citas_completadas BIGINT,
  citas_canceladas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_citas,
    COUNT(*) FILTER (WHERE estado = 'pendiente') as citas_pendientes,
    COUNT(*) FILTER (WHERE estado = 'confirmada') as citas_confirmadas,
    COUNT(*) FILTER (WHERE estado = 'completada') as citas_completadas,
    COUNT(*) FILTER (WHERE estado = 'cancelada') as citas_canceladas
  FROM citas;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de horario
CREATE OR REPLACE FUNCTION verificar_disponibilidad(
  fecha_buscada DATE,
  hora_buscada TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  existe_cita INTEGER;
BEGIN
  SELECT COUNT(*) INTO existe_cita
  FROM citas
  WHERE fecha = fecha_buscada 
    AND hora = hora_buscada
    AND estado IN ('pendiente', 'confirmada');
  
  RETURN existe_cita = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. DATOS DE EJEMPLO (OPCIONAL - Para testing)
-- ============================================

-- Insertar una cita de ejemplo
-- INSERT INTO citas (nombre, email, telefono, fecha, hora, motivo, estado)
-- VALUES (
--   'Juan Pérez',
--   'juan@example.com',
--   '+52 55 1234 5678',
--   CURRENT_DATE + INTERVAL '7 days',
--   '14:00:00',
--   'Consultoría sobre desarrollo web',
--   'pendiente'
-- );

-- Insertar una consulta de ejemplo
-- INSERT INTO consultas (pregunta, respuesta, tipo_info)
-- VALUES (
--   '¿Cuáles son los servicios de Charlitron?',
--   'Ofrecemos desarrollo web, apps móviles, soluciones de IA...',
--   'servicios'
-- );

-- ============================================
-- 7. VERIFICAR INSTALACIÓN
-- ============================================

-- Verifica que las tablas se crearon correctamente
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('citas', 'consultas')
ORDER BY table_name;

-- ============================================
-- ✅ SCRIPT COMPLETADO
-- ============================================

-- Ahora puedes:
-- 1. Verificar que las tablas aparecen en el Table Editor
-- 2. Configurar SUPABASE_URL y SUPABASE_ANON_KEY en .env.local
-- 3. Probar la aplicación

-- Para ver las citas:
-- SELECT * FROM citas ORDER BY created_at DESC;

-- Para ver las consultas:
-- SELECT * FROM consultas ORDER BY created_at DESC;

-- Para ver estadísticas:
-- SELECT * FROM estadisticas_citas();

-- Para verificar disponibilidad:
-- SELECT verificar_disponibilidad('2025-11-20', '14:00:00');
