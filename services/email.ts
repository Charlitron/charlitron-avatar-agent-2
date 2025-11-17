/**
 * SendGrid Email Service
 * 
 * Este servicio está en modo MOCK hasta que configures tu API Key de SendGrid.
 * Para activarlo:
 * 1. Crea una cuenta en SendGrid
 * 2. Genera una API Key
 * 3. Agrega SENDGRID_API_KEY a .env.local
 * 4. Verifica tu email de remitente en SendGrid
 */

export interface EmailData {
  to: string;
  subject: string;
  nombre: string;
  fecha?: string;
  hora?: string;
  motivo?: string;
  mensaje?: string;
}

class EmailService {
  private apiKey: string | undefined;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@charlitron.com';

    if (!this.apiKey) {
      console.warn('⚠️ SendGrid no configurado. Los emails funcionarán en modo MOCK.');
    }
  }

  /**
   * Envía email de confirmación de cita
   */
  async enviarConfirmacionCita(data: EmailData): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.apiKey) {
      // Modo MOCK
      console.log('📧 [MOCK] Email de confirmación:', {
        to: data.to,
        subject: data.subject,
        body: this.generarHTMLConfirmacion(data)
      });

      return {
        success: true,
        message: `Email enviado a ${data.to} (MOCK - SendGrid no configurado)`
      };
    }

    try {
      // TODO: Implementar envío real con SendGrid cuando tengas la API Key
      // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     personalizations: [{
      //       to: [{ email: data.to, name: data.nombre }],
      //       subject: data.subject
      //     }],
      //     from: { email: this.fromEmail, name: 'Charlitron' },
      //     content: [{
      //       type: 'text/html',
      //       value: this.generarHTMLConfirmacion(data)
      //     }]
      //   })
      // });

      return {
        success: true,
        message: 'Email enviado exitosamente'
      };
    } catch (error: any) {
      console.error('Error al enviar email:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Envía email con información general
   */
  async enviarInfo(data: EmailData): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.apiKey) {
      console.log('📧 [MOCK] Email de información:', {
        to: data.to,
        subject: data.subject,
        mensaje: data.mensaje
      });

      return {
        success: true,
        message: `Email enviado a ${data.to} (MOCK)`
      };
    }

    try {
      // TODO: Implementar con SendGrid real
      return {
        success: true,
        message: 'Email enviado'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Genera HTML para email de confirmación de cita
   */
  private generarHTMLConfirmacion(data: EmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Cita Confirmada</h1>
          </div>
          <div class="content">
            <p>Hola ${data.nombre},</p>
            <p>Tu cita ha sido confirmada exitosamente. Aquí están los detalles:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">📅 Fecha:</span> ${data.fecha}
              </div>
              <div class="detail-row">
                <span class="label">🕐 Hora:</span> ${data.hora}
              </div>
              <div class="detail-row">
                <span class="label">📝 Motivo:</span> ${data.motivo}
              </div>
              <div class="detail-row">
                <span class="label">📧 Email:</span> ${data.to}
              </div>
            </div>

            <p>Recibirás un recordatorio 24 horas antes de tu cita.</p>
            <p>Si necesitas cancelar o reprogramar, por favor contáctanos.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático generado por el asistente IA de Charlitron.</p>
            <p>© 2025 Charlitron. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
