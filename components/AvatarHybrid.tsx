import React, { useEffect, useState } from 'react';

const GOOGLE_API_KEY = 'AIzaSyDBgs_zcP8yMbjIgcsV-KV7FfpGhn3E308';

const AvatarHybrid: React.FC = () => {
  const [lastMessage, setLastMessage] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Listener para capturar eventos del iframe de HeyGen
    const handleHeyGenMessage = async (event: MessageEvent) => {
      // Solo procesar mensajes del dominio de HeyGen
      if (event.origin !== 'https://labs.heygen.com') return;

      console.log('📨 Mensaje del iframe:', event.data);

      // Intentar extraer texto del usuario de diferentes estructuras posibles
      const userText = 
        event.data?.transcript || 
        event.data?.userMessage || 
        event.data?.text || 
        (event.data?.message?.type === 'user' && event.data?.message?.text);

      if (userText && typeof userText === 'string' && userText.trim()) {
        console.log('👤 Usuario dijo:', userText);
        setLastMessage(userText);
        await processWithGemini(userText);
      }
    };

    window.addEventListener('message', handleHeyGenMessage);

    return () => {
      window.removeEventListener('message', handleHeyGenMessage);
    };
  }, []);

  const processWithGemini = async (text: string) => {
    if (processing) return;
    setProcessing(true);

    try {
      console.log('🤖 Enviando a Gemini:', text);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Eres Elena, asistente de Charlitron. Analiza si el usuario quiere agendar una cita.

Si SÍ quiere agendar, responde SOLO con JSON (sin texto adicional):
{"agendar": true, "nombre": "nombre del usuario", "email": "email si lo dio", "fecha": "YYYY-MM-DD", "hora": "HH:MM", "servicio": "tipo de servicio"}

Si NO quiere agendar, responde: {"agendar": false}

Usuario dijo: "${text}"`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 300,
            }
          })
        }
      );

      const data = await response.json();
      const geminiResponse = data.candidates[0].content.parts[0].text;
      
      console.log('🤖 Respuesta Gemini:', geminiResponse);

      // Intentar parsear si es agendamiento
      try {
        const jsonMatch = geminiResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          if (parsed.agendar === true) {
            console.log('📅 ¡AGENDAMIENTO DETECTADO!', parsed);
            await guardarCita(parsed);
            
            // Mostrar notificación visual
            showNotification(`✅ Cita agendada: ${parsed.fecha} a las ${parsed.hora}`);
          } else {
            console.log('ℹ️ No es agendamiento');
          }
        }
      } catch (parseError) {
        console.log('No se pudo parsear como JSON, probablemente no es agendamiento');
      }

    } catch (error) {
      console.error('❌ Error procesando con Gemini:', error);
    } finally {
      setProcessing(false);
    }
  };

  const guardarCita = async (datos: any) => {
    try {
      console.log('💾 Guardando cita en Supabase...', datos);

      const response = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cita guardada:', result);
        return true;
      } else {
        console.error('❌ Error al guardar:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      return false;
    }
  };

  const showNotification = (message: string) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: sans-serif;
      font-size: 16px;
      font-weight: 600;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9998,
      maxWidth: '300px',
      display: processing ? 'block' : 'none'
    }}>
      <div>🎯 Procesando con IA...</div>
      {lastMessage && (
        <div style={{ marginTop: '8px', opacity: 0.7 }}>
          Último mensaje: "{lastMessage.substring(0, 50)}..."
        </div>
      )}
    </div>
  );
};

export default AvatarHybrid;
