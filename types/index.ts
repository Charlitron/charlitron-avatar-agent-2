/**
 * Tipos y definiciones para el sistema de Avatar Charlitron
 */

// ===== TIPOS DE SERVICIOS =====

export interface Cita {
  id?: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  hora: string;
  motivo: string;
  created_at?: string;
}

export interface Consulta {
  id?: string;
  pregunta: string;
  respuesta: string;
  user_info?: any;
  created_at?: string;
}

export interface EventoCalendario {
  nombre: string;
  email: string;
  fecha: string;
  hora: string;
  motivo: string;
}

export interface EmailData {
  to: string;
  subject: string;
  nombre: string;
  fecha?: string;
  hora?: string;
  motivo?: string;
  mensaje?: string;
}

// ===== TIPOS DE RESPUESTAS DE SERVICIOS =====

export interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface CalendarResponse {
  success: boolean;
  message: string;
  eventLink?: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
}

// ===== TIPOS DE GEMINI FUNCTION CALLING =====

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface AgendarCitaArgs {
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  hora: string;
  motivo: string;
}

export interface DarInfoArgs {
  tipo_info: 'servicios' | 'horarios' | 'precios' | 'contacto' | 'general';
  detalles?: string;
}

export type FunctionCallArgs = AgendarCitaArgs | DarInfoArgs;

// ===== TIPOS DE AVATAR =====

export interface AvatarMessage {
  type: string;
  text: string;
}

export type AvatarStatus = 
  | 'Iniciando...'
  | 'Conectando con IA...'
  | 'Solicitando permisos...'
  | 'Conectando con el avatar...'
  | '¡Haz clic y habla conmigo!'
  | 'Te escucho...'
  | 'Pensando...'
  | 'Elena está hablando...'
  | 'Ejecutando: agendarCita...'
  | 'Ejecutando: darInfo...'
  | 'Sesión terminada. Haz clic para reiniciar.'
  | 'Error. Refresca la página.'
  | 'Permiso de micrófono denegado.'
  | 'Error al iniciar el avatar.'
  | 'Falta el Token de HeyGen!'
  | 'Error al conectar con IA.'
  | 'Lo siento, ocurrió un error.';

// ===== VARIABLES DE ENTORNO =====

export interface EnvironmentVariables {
  API_KEY: string;
  GEMINI_API_KEY?: string;
  HEYGEN_API_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
}

// ===== EXTENDER PROCESS.ENV =====

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}

export {};
