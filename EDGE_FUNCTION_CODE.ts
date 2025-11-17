// ============================================
// EDGE FUNCTION: agendar-cita
// Copiar este código en Supabase Dashboard
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mensaje, userInfo } = await req.json()

    // 1. Obtener las API keys desde los secrets de Supabase
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GEMINI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Faltan configuraciones de API')
    }

    console.log('📝 Mensaje recibido:', mensaje)

    // 2. Procesar con Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analiza si el usuario quiere agendar una cita. 
              
Si SÍ quiere agendar, extrae la información y responde con este JSON:
{
  "agendar": true,
  "nombre": "nombre extraído o null",
  "email": "email extraído o null", 
  "telefono": "telefono extraído o null",
  "fecha": "YYYY-MM-DD o null",
  "hora": "HH:MM o null",
  "servicio": "servicio solicitado"
}

Si NO es una solicitud de cita, responde:
{
  "agendar": false,
  "respuesta": "tu respuesta conversacional aquí"
}

Mensaje del usuario: "${mensaje}"`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    )

    const geminiData = await geminiResponse.json()
    const respuestaTexto = geminiData.candidates[0].content.parts[0].text
    
    console.log('🤖 Respuesta Gemini:', respuestaTexto)

    // 3. Extraer JSON de la respuesta
    const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se pudo procesar la respuesta',
          respuesta: 'Lo siento, no entendí tu solicitud. ¿Podrías reformularla?'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resultado = JSON.parse(jsonMatch[0])

    // 4. Si NO es cita, devolver respuesta conversacional
    if (!resultado.agendar) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          agendar: false,
          respuesta: resultado.respuesta 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Si SÍ es cita, guardar en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { data, error } = await supabase
      .from('citas')
      .insert([{
        nombre: resultado.nombre || 'Sin nombre',
        email: resultado.email || userInfo?.email || '',
        telefono: resultado.telefono || userInfo?.telefono || '',
        fecha: resultado.fecha || new Date().toISOString().split('T')[0],
        hora: resultado.hora || '09:00',
        motivo: resultado.servicio || 'Consulta general'
      }])
      .select()

    if (error) {
      console.error('❌ Error Supabase:', error)
      throw error
    }

    console.log('✅ Cita guardada:', data)

    // 6. Devolver confirmación
    return new Response(
      JSON.stringify({ 
        success: true,
        agendar: true,
        cita: data[0],
        respuesta: `¡Perfecto! He agendado tu cita para el ${resultado.fecha || 'próximo día disponible'} a las ${resultado.hora || '9:00 AM'}. Te enviaré una confirmación pronto.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        respuesta: 'Hubo un problema al procesar tu solicitud. ¿Podrías intentarlo de nuevo?'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
