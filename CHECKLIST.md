# ✅ Checklist de Configuración

Usa este checklist para asegurarte de que todo está configurado correctamente.

## 📋 Preparación Inicial

- [ ] Node.js 18+ instalado (`node -v` para verificar)
- [ ] Git configurado
- [ ] Editor de código (VS Code recomendado)

---

## 🔑 Credenciales de APIs

### 1. Gemini AI (REQUERIDO) ⚠️
- [ ] Cuenta creada en [Google AI Studio](https://aistudio.google.com/)
- [ ] API Key generada
- [ ] API Key copiada a `.env.local` → `API_KEY`
- [ ] Verificada en código (abre F12 → Console, debe decir "✅ Gemini inicializado")

### 2. HeyGen (REQUERIDO) ⚠️
- [ ] Cuenta creada en [HeyGen](https://app.heygen.com/)
- [ ] API Token generado
- [ ] Token copiado a `.env.local` → `HEYGEN_API_TOKEN`
- [ ] Token copiado a `components/Avatar.tsx` línea 9
- [ ] Avatar se muestra correctamente al hacer clic

### 3. Supabase (REQUERIDO) ⚠️
- [ ] Proyecto creado en [Supabase](https://supabase.com/dashboard)
- [ ] Script `supabase-setup.sql` ejecutado en SQL Editor
- [ ] Tablas `citas` y `consultas` creadas y visibles en Table Editor
- [ ] Project URL copiada a `.env.local` → `SUPABASE_URL`
- [ ] Anon Key copiada a `.env.local` → `SUPABASE_ANON_KEY`
- [ ] Políticas RLS habilitadas

### 4. Google Calendar (OPCIONAL) ℹ️
- [ ] Proyecto creado en [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Calendar API habilitada
- [ ] Credenciales OAuth 2.0 creadas
- [ ] Client ID agregado a `.env.local`
- [ ] Client Secret agregado a `.env.local`
- [ ] Código descomentado en `services/calendar.ts`

O mantener en **modo MOCK** (funciona sin configuración):
- [x] Funcionando en modo simulación

### 5. SendGrid (OPCIONAL) ℹ️
- [ ] Cuenta creada en [SendGrid](https://sendgrid.com/)
- [ ] Email de remitente verificado
- [ ] API Key generada
- [ ] API Key agregada a `.env.local`
- [ ] Email configurado en `.env.local` → `SENDGRID_FROM_EMAIL`
- [ ] Código descomentado en `services/email.ts`

O mantener en **modo MOCK** (funciona sin configuración):
- [x] Funcionando en modo simulación

---

## 💻 Instalación Local

- [ ] `npm install` ejecutado sin errores
- [ ] Archivo `.env.local` existe y tiene las variables
- [ ] No hay errores de TypeScript en el editor
- [ ] `npm run dev` inicia correctamente
- [ ] App abre en http://localhost:3000

---

## 🧪 Pruebas Funcionales

### Test 1: Avatar básico
- [ ] Avatar aparece en esquina inferior derecha
- [ ] Al hacer clic, se expande
- [ ] Pide permisos de micrófono
- [ ] Video del avatar se carga correctamente
- [ ] Mensaje "Te escucho..." aparece

### Test 2: Conversación básica
- [ ] Hablar al micrófono → avatar transcribe
- [ ] Avatar responde de manera natural
- [ ] Console (F12) muestra logs:
  - [ ] `👤 Usuario: [tu mensaje]`
  - [ ] `🤖 Respuesta completa: [texto]`
- [ ] Avatar mueve los labios al hablar

### Test 3: Función agendarCita()
- [ ] Decir "Quiero agendar una cita"
- [ ] Elena pregunta por datos paso a paso
- [ ] Console muestra: `🔧 Ejecutando función: agendarCita`
- [ ] Console muestra: `📅 Agendando cita: {...}`
- [ ] Elena confirma la cita
- [ ] En Supabase → tabla `citas` aparece el registro
- [ ] Si Calendar activo: evento creado
- [ ] Si SendGrid activo: email enviado

### Test 4: Función darInfo()
- [ ] Decir "¿Qué servicios ofrecen?"
- [ ] Console muestra: `ℹ️ Solicitando info de tipo: servicios`
- [ ] Elena responde con lista de servicios
- [ ] En Supabase → tabla `consultas` aparece el registro

### Test 5: Panel de Debug
- [ ] Botón "🔧 Debug" visible en esquina inferior izquierda
- [ ] Al hacer clic, se abre panel
- [ ] Muestra estado de todas las integraciones:
  - [ ] Gemini AI = Verde (Active)
  - [ ] HeyGen = Verde (Active)
  - [ ] Supabase = Verde (Active)
  - [ ] Calendar = Amarillo (Mock) o Verde (Active)
  - [ ] SendGrid = Amarillo (Mock) o Verde (Active)

---

## 🐛 Troubleshooting

Si algo no funciona, revisa:

### Avatar no se muestra
- [ ] Token de HeyGen configurado en Avatar.tsx
- [ ] Console no muestra errores de red
- [ ] Permisos de micrófono concedidos

### Avatar no responde
- [ ] API_KEY de Gemini configurada
- [ ] Console muestra "✅ Gemini inicializado"
- [ ] No hay errores en F12 → Console

### Function Calling no funciona
- [ ] Console muestra `🔧 Function calls: [...]`
- [ ] Si está vacío, revisa la configuración de Gemini
- [ ] Verifica que AVAILABLE_FUNCTIONS está bien definido

### Supabase no guarda
- [ ] Credenciales correctas en .env.local
- [ ] Tablas existen en Supabase Dashboard
- [ ] Políticas RLS configuradas
- [ ] Console muestra errores de Supabase (si hay)

### Modo MOCK activo cuando no debería
- [ ] Variables de entorno bien configuradas
- [ ] Archivo .env.local en la raíz del proyecto
- [ ] Reiniciar servidor después de cambiar .env.local
- [ ] Limpiar caché: `rm -rf node_modules/.vite`

---

## 📊 Verificación en Supabase

```sql
-- ¿Se crearon las tablas?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('citas', 'consultas');

-- ¿Hay citas guardadas?
SELECT COUNT(*) as total_citas FROM citas;

-- Ver últimas citas
SELECT * FROM citas ORDER BY created_at DESC LIMIT 5;

-- Ver últimas consultas
SELECT * FROM consultas ORDER BY created_at DESC LIMIT 5;

-- Estadísticas
SELECT * FROM estadisticas_citas();
```

---

## 🎯 Criterios de Éxito

Tu sistema está 100% funcional cuando:

✅ Avatar se muestra y responde
✅ Puedes agendar una cita de principio a fin
✅ La cita se guarda en Supabase
✅ Puedes pedir información y recibir respuestas
✅ El panel de debug muestra todo en verde/amarillo
✅ No hay errores en la consola del navegador
✅ Los logs muestran el flujo completo

---

## 🚀 Siguiente Nivel

Una vez que todo funcione:

- [ ] Activar Google Calendar (quitar modo MOCK)
- [ ] Activar SendGrid (quitar modo MOCK)
- [ ] Personalizar respuestas de Elena
- [ ] Agregar más tipos de información en darInfo()
- [ ] Crear dashboard de administración
- [ ] Implementar recordatorios automáticos
- [ ] Exportar datos a Excel/CSV
- [ ] Analytics de conversaciones

---

## 📚 Recursos de Ayuda

- **SETUP.md** → Guía detallada paso a paso
- **RESUMEN.md** → Visión general del proyecto
- **supabase-setup.sql** → Script completo de DB
- **Console (F12)** → Logs en tiempo real
- **Panel Debug (🔧)** → Estado de integraciones

---

**Última actualización:** 17 de Noviembre, 2025

¿Completaste todo el checklist? 🎉 **¡Felicidades, tu avatar está listo!**
