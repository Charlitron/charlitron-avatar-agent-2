// ============================================
// EDGE FUNCTION: obtener-disponibilidad
// Consulta Google Calendar y devuelve horas libres
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fecha } = await req.json() // Fecha en formato "YYYY-MM-DD"

    // 1. Obtener credenciales de Google Calendar
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN') // Lo configuraremos

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Faltan credenciales de Google Calendar')
    }

    console.log('📅 Consultando disponibilidad para:', fecha)

    // 2. Obtener Access Token usando Refresh Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error('No se pudo obtener access token de Google')
    }

    // 3. Consultar eventos del día en Google Calendar
    const fechaInicio = `${fecha}T09:00:00-06:00` // 9 AM
    const fechaFin = `${fecha}T20:00:00-06:00`    // 8 PM

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(fechaInicio)}&` +
      `timeMax=${encodeURIComponent(fechaFin)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    const calendarData = await calendarResponse.json()

    if (calendarData.error) {
      console.error('❌ Error de Google Calendar:', calendarData.error)
      throw new Error(calendarData.error.message)
    }

    // 4. Procesar eventos ocupados
    const eventosOcupados = (calendarData.items || []).map((evento: any) => {
      const inicio = new Date(evento.start.dateTime || evento.start.date)
      const fin = new Date(evento.end.dateTime || evento.end.date)
      
      return {
        inicio: inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
        fin: fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
        titulo: evento.summary || 'Ocupado'
      }
    })

    console.log('🔒 Eventos ocupados:', eventosOcupados)

    // 5. Generar horarios disponibles (9 AM - 8 PM, cada 30 mins)
    const horariosDisponibles: string[] = []
    const horariosOcupados = new Set(eventosOcupados.map(e => e.inicio))

    for (let hora = 9; hora < 20; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`
        
        // Si no está ocupado, agregarlo
        if (!horariosOcupados.has(horario)) {
          horariosDisponibles.push(horario)
        }
      }
    }

    console.log('✅ Horarios disponibles:', horariosDisponibles)

    // 6. Devolver respuesta
    return new Response(
      JSON.stringify({
        success: true,
        fecha,
        disponibles: horariosDisponibles,
        ocupados: eventosOcupados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ============================================
// INSTRUCCIONES DE DEPLOYMENT:
// ============================================
// 1. Ve a Supabase Dashboard > Edge Functions
// 2. Crea nueva función llamada: obtener-disponibilidad
// 3. Copia este código
// 4. Configura estos secrets:
//    - GOOGLE_CLIENT_ID (ya lo tienes)
//    - GOOGLE_CLIENT_SECRET (ya lo tienes)
//    - GOOGLE_REFRESH_TOKEN (necesitas generarlo - ver abajo)
//
// PARA GENERAR REFRESH TOKEN:
// Ejecuta este flujo OAuth2 una vez:
// https://accounts.google.com/o/oauth2/v2/auth?
//   client_id=580428014061-7al3dj3lfo7scmcd1iggdpnf73d359p5.apps.googleusercontent.com&
//   redirect_uri=http://localhost:3000&
//   response_type=code&
//   scope=https://www.googleapis.com/auth/calendar.readonly&
//   access_type=offline&
//   prompt=consent
//
// Luego intercambia el código por refresh_token usando:
// POST https://oauth2.googleapis.com/token
// Body: {
//   code: "el_codigo_que_obtuviste",
//   client_id: "tu_client_id",
//   client_secret: "tu_client_secret",
//   redirect_uri: "http://localhost:3000",
//   grant_type: "authorization_code"
// }
