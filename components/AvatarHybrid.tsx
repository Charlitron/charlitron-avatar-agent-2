import React, { useEffect, useState } from 'react';

const GOOGLE_API_KEY = 'AIzaSyDBgs_zcP8yMbjIgcsV-KV7FfpGhn3E308';

const AvatarHybrid: React.FC = () => {
  const [lastMessage, setLastMessage] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-10), logMessage]); // Mantener últimos 10 logs
  };

  useEffect(() => {
    addLog('🎯 AvatarHybrid iniciado - escuchando mensajes...');
    
    // Listener para capturar eventos del iframe de HeyGen
    const handleHeyGenMessage = async (event: MessageEvent) => {
      // Loguear TODOS los mensajes para debug
      addLog(`📨 Mensaje recibido de: ${event.origin}`);
      
      // Solo procesar mensajes del dominio de HeyGen
      if (event.origin !== 'https://labs.heygen.com') {
        addLog(`⚠️ Ignorado - origen no es HeyGen`);
        return;
      }

      addLog(`📦 Data completo: ${JSON.stringify(event.data).substring(0, 100)}...`);

      // Intentar extraer texto del usuario de diferentes estructuras posibles
      const userText = 
        event.data?.transcript || 
        event.data?.userMessage || 
        event.data?.text || 
        (event.data?.message?.type === 'user' && event.data?.message?.text);

      if (userText && typeof userText === 'string' && userText.trim()) {
        addLog(`👤 USUARIO DIJO: "${userText}"`);
        setLastMessage(userText);
        await processWithGemini(userText);
      } else {
        addLog(`ℹ️ Mensaje sin texto de usuario extraíble`);
      }
    };

    window.addEventListener('message', handleHeyGenMessage);
    addLog('✅ Event listener registrado');

    return () => {
      window.removeEventListener('message', handleHeyGenMessage);
      addLog('🛑 Event listener removido');
    };
  }, []);

  const processWithGemini = async (text: string) => {
    if (processing) {
      addLog('⏳ Ya procesando, esperando...');
      return;
    }
    
    setProcessing(true);
    addLog('🤖 Iniciando procesamiento con Gemini...');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`;
      addLog(`📡 Enviando request a Gemini...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Eres Elena, asistente de Charlitron. Analiza si el usuario quiere agendar una cita.

Si SÍ quiere agendar, responde SOLO con JSON (sin texto adicional):
{"agendar": true, "nombre": "nombre del usuario", "email": "email@ejemplo.com", "fecha": "2025-11-18", "hora": "15:00", "servicio": "perifoneo"}

Si NO quiere agendar, responde: {"agendar": false}

Usuario dijo: "${text}"`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          }
        })
      });

      if (!response.ok) {
        addLog(`❌ Error HTTP: ${response.status}`);
        const errorText = await response.text();
        addLog(`❌ Detalles: ${errorText.substring(0, 200)}`);
        return;
      }

      const data = await response.json();
      const geminiResponse = data.candidates[0].content.parts[0].text;
      
      addLog(`🤖 Respuesta Gemini: ${geminiResponse.substring(0, 150)}...`);

      // Intentar parsear si es agendamiento
      try {
        const jsonMatch = geminiResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          addLog(`📋 JSON parseado: ${JSON.stringify(parsed)}`);
          
          if (parsed.agendar === true) {
            addLog('📅 ¡AGENDAMIENTO DETECTADO!');
            const success = await guardarCita(parsed);
            
            if (success) {
              showNotification(`✅ Cita agendada: ${parsed.fecha} a las ${parsed.hora}`);
              addLog('✅ Cita guardada exitosamente');
            } else {
              showNotification(`❌ Error al guardar cita`);
              addLog('❌ Falló al guardar cita');
            }
          } else {
            addLog('ℹ️ No es agendamiento (agendar: false)');
          }
        } else {
          addLog('⚠️ No se encontró JSON en respuesta');
        }
      } catch (parseError: any) {
        addLog(`❌ Error parseando JSON: ${parseError.message}`);
      }

    } catch (error: any) {
      addLog(`❌ Error en Gemini: ${error.message}`);
    } finally {
      setProcessing(false);
      addLog('✅ Procesamiento finalizado');
    }
  };

  const guardarCita = async (datos: any) => {
    try {
      addLog(`💾 Guardando en Supabase: ${JSON.stringify(datos)}`);

      const response = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      addLog(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Respuesta de API: ${JSON.stringify(result)}`);
        return true;
      } else {
        const errorText = await response.text();
        addLog(`❌ Error de API: ${errorText}`);
        return false;
      }
    } catch (error: any) {
      addLog(`❌ Error de red: ${error.message}`);
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
    }, 5000);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.95)',
      color: '#00ff00',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '11px',
      fontFamily: 'Consolas, monospace',
      zIndex: 9998,
      maxWidth: '400px',
      maxHeight: '300px',
      overflowY: 'auto',
      border: '2px solid #667eea',
      display: showDebug ? 'block' : 'none'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '1px solid #667eea',
        paddingBottom: '8px'
      }}>
        <strong style={{ color: '#fff' }}>🔍 Debug Panel</strong>
        <button 
          onClick={() => setShowDebug(false)}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Ocultar
        </button>
      </div>
      
      {processing && (
        <div style={{ 
          color: '#ffc107', 
          marginBottom: '8px',
          fontWeight: 'bold'
        }}>
          ⏳ PROCESANDO...
        </div>
      )}
      
      {lastMessage && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px',
          background: 'rgba(102, 126, 234, 0.2)',
          borderRadius: '6px',
          color: '#fff'
        }}>
          <strong>Último mensaje:</strong><br />
          "{lastMessage}"
        </div>
      )}
      
      <div style={{ fontSize: '10px' }}>
        {logs.map((log, idx) => (
          <div key={idx} style={{ 
            marginBottom: '4px',
            color: log.includes('❌') ? '#ff5252' : 
                   log.includes('✅') ? '#4caf50' :
                   log.includes('⚠️') ? '#ffc107' : '#00ff00'
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarHybrid;
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
