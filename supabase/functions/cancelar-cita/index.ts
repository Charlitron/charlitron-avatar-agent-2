import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email es requerido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar citas pendientes o confirmadas del cliente
    const { data: citas, error: buscarError } = await supabase
      .from('citas')
      .select('*')
      .eq('email', email)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha', { ascending: true });

    if (buscarError) {
      return new Response(
        JSON.stringify({ error: 'Error al buscar citas', details: buscarError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!citas || citas.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          mensaje: 'No se encontraron citas activas con este email'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Obtener credenciales de Google para cancelar eventos
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    let accessToken = null;

    if (refreshToken && clientId && clientSecret) {
      // Obtener access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
    }

    // Cancelar todas las citas del cliente
    const citasCanceladas = [];
    for (const cita of citas) {
      // Cancelar en Google Calendar si tiene google_event_id
      if (cita.google_event_id && accessToken) {
        try {
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${cita.google_event_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
        } catch (googleError) {
          console.warn('No se pudo cancelar en Google Calendar:', googleError);
        }
      }

      // Actualizar estado en Supabase
      const { error: updateError } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', cita.id);

      if (!updateError) {
        citasCanceladas.push({
          fecha: cita.fecha,
          hora: cita.hora,
          motivo: cita.motivo,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        mensaje: `Se cancelaron ${citasCanceladas.length} cita(s)`,
        citas_canceladas: citasCanceladas
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
