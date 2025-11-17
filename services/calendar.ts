/**
 * Google Calendar Service
 * 
 * Este servicio está en modo MOCK hasta que configures tus credenciales.
 * Para activarlo:
 * 1. Ve a Google Cloud Console
 * 2. Habilita Google Calendar API
 * 3. Crea credenciales OAuth 2.0
 * 4. Agrega las credenciales a .env.local
 */

export interface EventoCalendario {
  nombre: string;
  email: string;
  fecha: string;
  hora: string;
  motivo: string;
}

class CalendarService {
  private isConfigured: boolean = false;

  constructor() {
    // Verifica si las credenciales están configuradas
    this.isConfigured = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    );

    if (!this.isConfigured) {
      console.warn('⚠️ Google Calendar no configurado. Funcionando en modo MOCK.');
    }
  }

  /**
   * Crea un evento en Google Calendar
   * Por ahora es MOCK - retorna éxito simulado
   */
  async crearEvento(evento: EventoCalendario): Promise<{ 
    success: boolean; 
    message: string;
    eventLink?: string;
  }> {
    if (!this.isConfigured) {
      // Modo MOCK
      console.log('📅 [MOCK] Evento de calendario:', evento);
      
      return {
        success: true,
        message: `Cita agendada para ${evento.nombre} el ${evento.fecha} a las ${evento.hora} (MOCK - Google Calendar no configurado)`,
        eventLink: 'https://calendar.google.com/calendar/r' // Link genérico
      };
    }

    try {
      // TODO: Implementar lógica real de Google Calendar API cuando tengas las credenciales
      // const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     summary: `Cita con ${evento.nombre}`,
      //     description: `Motivo: ${evento.motivo}\nEmail: ${evento.email}`,
      //     start: {
      //       dateTime: `${evento.fecha}T${evento.hora}:00`,
      //       timeZone: 'America/Mexico_City'
      //     },
      //     end: {
      //       dateTime: `${evento.fecha}T${evento.hora}:00`,
      //       timeZone: 'America/Mexico_City'
      //     }
      //   })
      // });

      return {
        success: true,
        message: `Evento creado exitosamente`,
        eventLink: 'https://calendar.google.com/calendar/r'
      };
    } catch (error: any) {
      console.error('Error al crear evento en Calendar:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Verifica disponibilidad en una fecha/hora
   */
  async verificarDisponibilidad(fecha: string, hora: string): Promise<boolean> {
    if (!this.isConfigured) {
      // En modo MOCK, siempre hay disponibilidad
      return true;
    }

    // TODO: Implementar verificación real
    return true;
  }
}

export const calendarService = new CalendarService();
