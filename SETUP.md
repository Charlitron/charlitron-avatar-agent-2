# 🚀 Guía de Configuración - Charlitron Avatar Agent

## 📋 Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación](#instalación)
3. [Configuración de APIs](#configuración-de-apis)
4. [Estructura del Flujo](#estructura-del-flujo)
5. [Desarrollo](#desarrollo)

---

## ✅ Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Gemini AI (Google)
- Cuenta de HeyGen
- Cuenta de Supabase
- (Opcional) Cuenta de Google Cloud para Calendar API
- (Opcional) Cuenta de SendGrid para emails

---

## 📦 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar archivo de variables de entorno
cp .env.local .env.local.backup
# Edita .env.local con tus credenciales reales
```

---

## 🔑 Configuración de APIs

### 1. **Gemini AI** (REQUERIDO)

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API Key
3. Copia la key y pégala en `.env.local`:
   ```
   API_KEY=tu_api_key_de_gemini
   ```

### 2. **HeyGen Avatar** (REQUERIDO)

1. Ve a [HeyGen Dashboard](https://app.heygen.com/)
2. Crea una cuenta y genera un API Token
3. Pega el token en **DOS lugares**:
   - En `.env.local`: `HEYGEN_API_TOKEN=tu_token`
   - En `components/Avatar.tsx`: línea 9, reemplaza `PASTE_YOUR_HEYGEN_API_TOKEN_HERE`

### 3. **Supabase** (REQUERIDO)

#### Paso 1: Crear proyecto
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un nuevo proyecto
3. Espera a que se inicialice

#### Paso 2: Crear tablas
Ve a **SQL Editor** y ejecuta:

```sql
-- Tabla de citas
CREATE TABLE citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de consultas
CREATE TABLE consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  user_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserts públicos (ajusta según necesites)
CREATE POLICY "Permitir inserts" ON citas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserts" ON consultas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura" ON citas FOR SELECT USING (true);
CREATE POLICY "Permitir lectura" ON consultas FOR SELECT USING (true);
```

#### Paso 3: Obtener credenciales
1. Ve a **Settings > API**
2. Copia:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
3. Pégalas en `.env.local`

### 4. **Google Calendar API** (OPCIONAL)

⚠️ **Por ahora funciona en modo MOCK** - puedes omitir esto

Para activarlo cuando estés listo:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto
3. Habilita Google Calendar API
4. Crea credenciales OAuth 2.0
5. Configura en `.env.local`:
   ```
   GOOGLE_CLIENT_ID=tu_client_id
   GOOGLE_CLIENT_SECRET=tu_client_secret
   ```

### 5. **SendGrid** (OPCIONAL)

⚠️ **Por ahora funciona en modo MOCK** - puedes omitir esto

Para activarlo:
1. Crea cuenta en [SendGrid](https://sendgrid.com/)
2. Verifica tu email de remitente
3. Genera API Key en Settings > API Keys
4. Configura en `.env.local`:
   ```
   SENDGRID_API_KEY=tu_api_key
   SENDGRID_FROM_EMAIL=tu_email_verificado@tudominio.com
   ```

---

## 🔄 Estructura del Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DEL SISTEMA                         │
└─────────────────────────────────────────────────────────────┘

1. Usuario habla al Avatar (HeyGen)
           ↓
2. HeyGen transcribe el audio a texto
           ↓
3. Texto se envía a Gemini AI
           ↓
4. Gemini analiza la intención y decide:
   ┌─────────────────┬─────────────────┐
   │  agendarCita()  │    darInfo()    │
   └─────────────────┴─────────────────┘
           ↓                   ↓
5. Se ejecutan las acciones:
   - Supabase (guardar)
   - Calendar (crear evento)
   - SendGrid (enviar email)
           ↓
6. Resultado vuelve a Gemini
           ↓
7. Gemini genera respuesta natural
           ↓
8. Avatar habla la respuesta al usuario
```

---

## 🎯 Funciones Disponibles

### `agendarCita()`
Se activa cuando el usuario quiere:
- Agendar una cita
- Reservar una reunión
- Programar una consulta

**Parámetros requeridos:**
- nombre
- email
- teléfono
- fecha (YYYY-MM-DD)
- hora (HH:MM)
- motivo

**Acciones que ejecuta:**
1. ✅ Guarda en Supabase → tabla `citas`
2. 📅 Crea evento en Google Calendar (mock)
3. 📧 Envía email de confirmación (mock)

### `darInfo()`
Se activa cuando el usuario pregunta sobre:
- Servicios de Charlitron
- Horarios de atención
- Precios
- Información de contacto
- Info general de la empresa

**Parámetros:**
- tipo_info: 'servicios' | 'horarios' | 'precios' | 'contacto' | 'general'
- detalles: string (opcional)

**Acciones:**
1. 📚 Consulta base de conocimiento interna
2. 💾 Guarda la consulta en Supabase → tabla `consultas`

---

## 💻 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:5173

# Construir para producción
npm run build

# Preview de producción
npm run preview
```

---

## 🐛 Troubleshooting

### Error: "Falta el Token de HeyGen"
- Verifica que hayas configurado `HEYGEN_API_TOKEN` en `Avatar.tsx`

### Error: "Supabase no configurado"
- Verifica las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env.local`
- Asegúrate que las tablas existan en tu proyecto de Supabase

### Avatar no responde
- Abre la consola del navegador (F12) y revisa los logs
- Verifica que `API_KEY` de Gemini esté configurada
- Revisa que hayas dado permisos de micrófono

### Modo MOCK activo
- Es NORMAL para Calendar y SendGrid si no los has configurado
- Los logs mostrarán `[MOCK]` cuando estén en modo simulación
- La funcionalidad core seguirá funcionando

---

## 📚 Recursos

- [Documentación HeyGen](https://docs.heygen.com/)
- [Documentación Gemini](https://ai.google.dev/docs)
- [Documentación Supabase](https://supabase.com/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [SendGrid Docs](https://docs.sendgrid.com/)

---

## 🎉 ¡Listo!

Una vez configurado todo, tu avatar estará listo para:
- ✅ Agendar citas automáticamente
- ✅ Responder preguntas sobre tu empresa
- ✅ Guardar todo en base de datos
- ✅ (Opcional) Crear eventos en calendario
- ✅ (Opcional) Enviar emails de confirmación

**Ejemplo de conversación:**

```
Usuario: "Hola, me gustaría agendar una cita"
Elena: "¡Por supuesto! ¿Me das tu nombre completo?"
Usuario: "Juan Pérez"
Elena: "Perfecto Juan, ¿cuál es tu email?"
Usuario: "juan@example.com"
... (continúa recopilando datos)
Elena: "¡Listo! Tu cita está confirmada para el 20 de noviembre 
       a las 15:00. Te envié un email de confirmación."
```

🚀 **¡Disfruta tu asistente IA!**
