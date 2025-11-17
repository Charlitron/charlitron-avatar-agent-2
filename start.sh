#!/bin/bash

# 🚀 Script de inicio rápido para Charlitron Avatar Agent
# Este script te guiará en la configuración inicial

echo "╔════════════════════════════════════════════════╗"
echo "║  🤖 CHARLITRON AVATAR AGENT - SETUP RÁPIDO   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    echo "   Descárgalo desde: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detectado: $(node -v)"
echo ""

# Paso 1: Instalar dependencias
echo "📦 Paso 1: Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "⚠️  Hubo un problema al instalar las dependencias."
    echo "   Intenta manualmente: npm install --legacy-peer-deps"
    exit 1
fi

echo "✅ Dependencias instaladas"
echo ""

# Paso 2: Verificar .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ No se encontró el archivo .env.local"
    echo ""
    echo "📝 Necesitas crear .env.local con las siguientes variables:"
    echo ""
    echo "   API_KEY=tu_gemini_api_key"
    echo "   HEYGEN_API_TOKEN=tu_heygen_token"
    echo "   SUPABASE_URL=tu_supabase_url"
    echo "   SUPABASE_ANON_KEY=tu_supabase_key"
    echo ""
    echo "📚 Consulta SETUP.md para instrucciones detalladas"
    exit 1
fi

echo "✅ Archivo .env.local encontrado"
echo ""

# Paso 3: Verificar variables críticas
echo "🔍 Verificando configuración..."
echo ""

source .env.local 2>/dev/null || true

MISSING_VARS=0

if [ -z "$API_KEY" ]; then
    echo "⚠️  Falta: API_KEY (Gemini)"
    MISSING_VARS=1
fi

if [ -z "$HEYGEN_API_TOKEN" ]; then
    echo "⚠️  Falta: HEYGEN_API_TOKEN"
    MISSING_VARS=1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Falta: SUPABASE_URL o SUPABASE_ANON_KEY"
    MISSING_VARS=1
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo "❌ Algunas variables críticas no están configuradas"
    echo "📚 Consulta SETUP.md para obtener las credenciales"
    exit 1
fi

echo "✅ Todas las variables críticas están configuradas"
echo ""

# Recordatorio de HeyGen en código
echo "⚠️  RECORDATORIO IMPORTANTE:"
echo "   También debes configurar HEYGEN_API_TOKEN en:"
echo "   📄 components/Avatar.tsx (línea 9)"
echo ""

# Paso 4: Verificar Supabase
echo "💡 ¿Ya configuraste las tablas en Supabase?"
echo "   Si no, ejecuta el script SQL en: supabase-setup.sql"
echo ""

# Paso 5: Listo para iniciar
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅ TODO LISTO PARA EMPEZAR                   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🚀 Para iniciar el servidor de desarrollo:"
echo "   npm run dev"
echo ""
echo "📚 Documentación completa:"
echo "   - SETUP.md (configuración detallada)"
echo "   - RESUMEN.md (resumen del proyecto)"
echo "   - supabase-setup.sql (script de base de datos)"
echo ""
echo "🐛 Debug:"
echo "   - Abre F12 en el navegador para ver logs"
echo "   - Haz clic en '🔧 Debug' en la app para ver estado de APIs"
echo ""
echo "¡Disfruta tu asistente IA! 🎉"
