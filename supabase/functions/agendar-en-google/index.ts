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
    const { nombre, email, telefono, fecha, hora, motivo, duracion } = await req.json();
    
    if (!nombre || !email || !fecha || !hora || !motivo) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Obtener credenciales de Google
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Credenciales de Google no configuradas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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
    
    if (!tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener access token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    // Preparar fechas para el evento
    const [horaInicio] = hora.split(':');
    const inicio = new Date(fecha);
    inicio.setHours(parseInt(horaInicio), 0, 0, 0);

    const fin = new Date(inicio);
    fin.setHours(inicio.getHours() + (duracion || 1));

    // Crear evento en Google Calendar
    const evento = {
      summary: `${motivo} - ${nombre}`,
      description: `Cliente: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || 'No proporcionado'}\nServicio: ${motivo}\nDuración: ${duracion || 1}h`,
      start: {
        dateTime: inicio.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: fin.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      attendees: [
        { email: email }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evento),
      }
    );

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Error al crear evento en Google Calendar', details: calendarData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Guardar en Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('citas')
      .insert([{
        nombre,
        email,
        telefono,
        fecha,
        hora,
        motivo,
        duracion: duracion || 1,
        estado: 'confirmada',
        google_event_id: calendarData.id,
      }])
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Error al guardar en base de datos', details: error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cita: data[0],
        googleEvent: calendarData,
        mensaje: 'Cita agendada exitosamente en Google Calendar y base de datos'
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
