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
    const { fecha } = await req.json();
    
    if (!fecha) {
      return new Response(
        JSON.stringify({ error: 'Fecha es requerida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Obtener refresh token de las variables de entorno
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Credenciales de Google no configuradas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Obtener access token usando el refresh token
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
        JSON.stringify({ error: 'No se pudo obtener access token', details: tokenData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    // Consultar eventos del día en Google Calendar
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startOfDay.toISOString()}&` +
      `timeMax=${endOfDay.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Error al consultar Google Calendar', details: calendarData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extraer horas ocupadas
    const ocupadas = (calendarData.items || []).map((event: any) => {
      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);
      return {
        inicio: start.toISOString(),
        fin: end.toISOString(),
      };
    });

    // Generar slots disponibles de 9am a 8pm (20:00)
    const disponibles = [];
    for (let hora = 9; hora < 20; hora++) {
      const inicio = new Date(fecha);
      inicio.setHours(hora, 0, 0, 0);
      
      const fin = new Date(fecha);
      fin.setHours(hora + 1, 0, 0, 0);

      // Verificar si el slot está ocupado
      const estaOcupado = ocupadas.some(ocupado => {
        const ocupadoInicio = new Date(ocupado.inicio);
        const ocupadoFin = new Date(ocupado.fin);
        
        return (
          (inicio >= ocupadoInicio && inicio < ocupadoFin) ||
          (fin > ocupadoInicio && fin <= ocupadoFin) ||
          (inicio <= ocupadoInicio && fin >= ocupadoFin)
        );
      });

      if (!estaOcupado) {
        disponibles.push({
          hora: `${hora.toString().padStart(2, '0')}:00`,
          inicio: inicio.toISOString(),
          fin: fin.toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ disponibles, ocupadas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
