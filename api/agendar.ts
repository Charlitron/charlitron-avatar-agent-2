import { supabaseService } from '../services/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nombre, email, fecha, hora, servicio, telefono } = req.body;

    // Validar datos requeridos
    if (!nombre || !fecha || !hora || !servicio) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos',
        required: ['nombre', 'fecha', 'hora', 'servicio']
      });
    }

    // Guardar en Supabase
    const result = await supabaseService.guardarCita({
      nombre,
      email: email || '',
      telefono: telefono || '',
      fecha,
      hora,
      motivo: servicio,
    });

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Cita agendada correctamente',
        data: result.data 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: result.message 
      });
    }

  } catch (error: any) {
    console.error('Error en /api/agendar:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
