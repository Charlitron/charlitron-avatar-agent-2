# 🎯 CAMBIOS REALIZADOS - RESUMEN

## ✅ Problemas Solucionados:

### 1. **Nombre no se guardaba en BD** ✅
- **Problema:** Se enviaba "Sin nombre" a la base de datos
- **Solución:** Ahora se hace INSERT directo a Supabase con los datos del formulario
- **Código:** `CalendarioAgenda.tsx` ahora guarda directamente `nombre`, `email`, `telefono`

### 2. **Citas de 1 hora en lugar de 30 minutos** ✅
- **Cambio:** Los slots de tiempo ahora son cada 1 hora (9:00, 10:00, 11:00, etc.)
- **Archivos actualizados:**
  - `CalendarioAgenda.tsx` - Horarios cada hora
  - `EDGE_FUNCTION_CALENDAR.ts` - Google Calendar busca bloques de 1 hora

### 3. **Duración del servicio configurable** ✅
- **Nuevo campo:** Selector de duración (1-6 horas)
- **Funcionalidad:** El cliente elige cuántas horas durará el servicio
- **Base de datos:** Nuevo campo `duracion` en tabla `citas`
- **Google Calendar:** Bloquea el tiempo completo (ej: 2-5pm si son 3 horas)

### 4. **Nuevos servicios de publicidad** ✅
- **Servicios actualizados:**
  - 📊 Consultoría Marketing
  - 📢 Perifoneo
  - 📄 Volanteo
  - 🎉 Activación
  - 🎥 Producción Visual
  - ⭐ Otros

---

## 📋 ARCHIVOS MODIFICADOS:

### Frontend:
1. **`components/CalendarioAgenda.tsx`**
   - Agregado selector de duración (1-6 horas)
   - Cambiado a servicios de publicidad
   - INSERT directo a Supabase (guarda nombre correctamente)
   - Integración con Google Calendar (opcional)
   - Horarios cada 1 hora

### Backend:
2. **`EDGE_FUNCTION_CALENDAR.ts`**
   - Slots cada 1 hora (no 30 minutos)

3. **`EDGE_FUNCTION_AGENDAR_GOOGLE.ts`** (NUEVO)
   - Crea eventos en Google Calendar
   - Respeta la duración seleccionada
   - Agrega detalles del cliente
   - Envía recordatorios automáticos

### Base de Datos:
4. **`UPDATE_CITAS_TABLE.sql`** (NUEVO)
   - Script SQL para agregar columna `duracion`
   - Actualizar valores por defecto

---

## 🚀 QUÉ HACER AHORA:

### Paso 1: Actualizar Base de Datos
```sql
-- Ve a Supabase Dashboard → SQL Editor
-- Pega y ejecuta este código:

ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion INTEGER DEFAULT 1;
ALTER TABLE citas ALTER COLUMN estado SET DEFAULT 'pendiente';
```

### Paso 2: Probar el Sistema
1. Abre: **http://localhost:3001**
2. Rellena el formulario:
   - Nombre: "Carlos López"
   - Email: "carlos@ejemplo.com"
   - Teléfono: "555-1234"
   - Servicio: "Perifoneo"
   - Duración: "2 horas"
   - Fecha y hora disponible
3. Haz clic en "AGENDAR CITA"

### Paso 3 (Opcional): Integrar Google Calendar
Si quieres que también se guarde en Google Calendar:

1. **Crear Edge Function en Supabase:**
   - Dashboard → Edge Functions → New Function
   - Nombre: `agendar-en-google`
   - Código: Copiar de `EDGE_FUNCTION_AGENDAR_GOOGLE.ts`

2. **Configurar Secrets** (si aún no lo hiciste):
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REFRESH_TOKEN (usa el script `get-google-token.sh`)

3. **Deploy** la función

---

## 🎨 NUEVAS CARACTERÍSTICAS:

### Selector de Duración:
```
⏱️ Duración del servicio:
[ 1 hora  ▼ ]
  1 hora
  2 horas
  3 horas
  4 horas
  5 horas
  6 horas
```

### Servicios de Publicidad:
```
💼 Servicio:
[ Consultoría Marketing ▼ ]
  📊 Consultoría Marketing
  📢 Perifoneo
  📄 Volanteo
  🎉 Activación
  🎥 Producción Visual
  ⭐ Otros
```

### Ejemplo de Cita Guardada:
```json
{
  "nombre": "Carlos López",
  "email": "carlos@ejemplo.com",
  "telefono": "555-1234",
  "fecha": "2025-11-18",
  "hora": "10:00",
  "motivo": "Perifoneo - 2h",
  "duracion": 2,
  "estado": "pendiente"
}
```

### Google Calendar (cuando se configure):
- Bloque de 10:00 AM a 12:00 PM (2 horas)
- Título: "Perifoneo - Carlos López"
- Descripción con todos los datos del cliente
- Recordatorios: 1 día antes + 1 hora antes
- Color azul para identificar fácilmente

---

## ✅ VERIFICACIÓN:

Revisa que ahora:
- [ ] El nombre se guarda correctamente (no "Sin nombre")
- [ ] Los horarios son cada 1 hora (9:00, 10:00, 11:00...)
- [ ] Aparece selector de duración
- [ ] Los servicios son: Perifoneo, Volanteo, etc.
- [ ] El campo `motivo` muestra: "Servicio - Xh"
- [ ] Se guarda en la columna `duracion` de la BD

---

## 🔧 TROUBLESHOOTING:

### Error: "column duracion does not exist"
→ Ejecuta el SQL del Paso 1 (UPDATE_CITAS_TABLE.sql)

### Nombre sigue guardando "Sin nombre"
→ Refresca el navegador (Ctrl+F5) para actualizar el código

### Google Calendar no funciona
→ Es opcional, el sistema funciona sin esto. Configúralo después.

---

**¿Todo listo?** Ejecuta el SQL del Paso 1 y prueba agendando una cita! 🎉
