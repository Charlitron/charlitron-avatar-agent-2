// ============================================
// EDGE FUNCTION: agendar-en-google
// Guarda la cita en Google Calendar
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
    const { nombre, email, telefono, fecha, hora, servicio, duracion } = await req.json()

    // 1. Obtener credenciales
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN')

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Faltan credenciales de Google Calendar')
    }

    console.log('📅 Agendando en Google Calendar:', { nombre, fecha, hora, servicio, duracion })

    // 2. Obtener Access Token
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

    // 3. Calcular hora de inicio y fin
    const [horaInicio, minutoInicio] = hora.split(':').map(Number)
    const horaFin = horaInicio + duracion
    
    const fechaHoraInicio = `${fecha}T${hora}:00-06:00` // Zona horaria México
    const fechaHoraFin = `${fecha}T${horaFin.toString().padStart(2, '0')}:00-06:00`

    // 4. Crear evento en Google Calendar
    const eventoResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: `${servicio} - ${nombre}`,
          description: `Cliente: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono}\nServicio: ${servicio}\nDuración: ${duracion} hora(s)`,
          start: {
            dateTime: fechaHoraInicio,
            timeZone: 'America/Mexico_City'
          },
          end: {
            dateTime: fechaHoraFin,
            timeZone: 'America/Mexico_City'
          },
          attendees: email ? [{ email }] : [],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 }, // 1 día antes
              { method: 'popup', minutes: 60 }     // 1 hora antes
            ]
          },
          colorId: '9' // Azul (color distintivo para citas)
        })
      }
    )

    const eventoData = await eventoResponse.json()

    if (eventoData.error) {
      console.error('❌ Error de Google Calendar:', eventoData.error)
      throw new Error(eventoData.error.message)
    }

    console.log('✅ Evento creado en Google Calendar:', eventoData.id)

    // 5. Devolver respuesta
    return new Response(
      JSON.stringify({
        success: true,
        eventoId: eventoData.id,
        htmlLink: eventoData.htmlLink,
        mensaje: `Cita agendada: ${servicio} el ${fecha} de ${hora} a ${horaFin}:00 (${duracion}h)`
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
