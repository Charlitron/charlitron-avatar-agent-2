import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Tipos para nuestra base de datos
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

class SupabaseService {
  private client: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('⚠️ Supabase no configurado. Verifica SUPABASE_URL y SUPABASE_ANON_KEY en .env.local');
    }
  }

  /**
   * Guarda una cita en la base de datos
   */
  async guardarCita(cita: Cita): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.client) {
      return {
        success: false,
        message: 'Supabase no está configurado. La cita se guardó en memoria (mock).'
      };
    }

    try {
      const { data, error } = await this.client
        .from('citas')
        .insert([cita])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Cita guardada exitosamente',
        data
      };
    } catch (error: any) {
      console.error('Error al guardar cita en Supabase:', error);
      return {
        success: false,
        message: `Error al guardar: ${error.message}`
      };
    }
  }

  /**
   * Obtiene todas las citas
   */
  async obtenerCitas(): Promise<Cita[]> {
    if (!this.client) {
      console.log('Supabase no configurado, retornando array vacío');
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('citas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error al obtener citas:', error);
      return [];
    }
  }

  /**
   * Guarda una consulta/pregunta del usuario
   */
  async guardarConsulta(consulta: {
    pregunta: string;
    respuesta: string;
    user_info?: any;
  }): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return {
        success: false,
        message: 'Consulta registrada en memoria (Supabase no configurado)'
      };
    }

    try {
      const { error } = await this.client
        .from('consultas')
        .insert([consulta]);

      if (error) throw error;

      return {
        success: true,
        message: 'Consulta guardada'
      };
    } catch (error: any) {
      console.error('Error al guardar consulta:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Exportar instancia singleton
export const supabaseService = new SupabaseService();
