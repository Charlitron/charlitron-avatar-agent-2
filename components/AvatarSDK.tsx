import React, { useEffect, useRef, useState } from 'react';
import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType,
  VoiceEmotion 
} from '@heygen/streaming-avatar';

// Solo necesitamos el token de HeyGen en el frontend
const HEYGEN_TOKEN = import.meta.env.VITE_HEYGEN_TOKEN || '';

const AvatarSDK: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setLogs(prev => [...prev.slice(-12), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    log('🎯 Inicializando Avatar SDK...');
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar();
      }
    };
  }, []);

  const iniciarAvatar = async () => {
    setIsLoading(true);
    log('🚀 Creando instancia de StreamingAvatar...');

    try {
      const avatar = new StreamingAvatar({ token: HEYGEN_TOKEN });
      avatarRef.current = avatar;

      // ========== EVENTOS DEL AVATAR ==========
      
      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        log('🗣️ Avatar empezó a hablar');
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        log('🤐 Avatar dejó de hablar');
      });

      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        log('📹 Stream de video listo');
        setStream(event.detail);
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        log('❌ Stream desconectado');
        setIsConnected(false);
      });

      // ========== ⭐ EVENTO CRÍTICO - Captura lo que dice el usuario ⭐ ==========
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, async (message: any) => {
        log(`📩 [RAW EVENT] ${JSON.stringify(message).substring(0, 300)}`);
        
        // Intentar diferentes formas de extraer el texto
        const textoUsuario = message?.detail || message?.message || message?.text || message;
        
        log(`👤 USUARIO DIJO: "${textoUsuario}"`);
        
        if (textoUsuario && typeof textoUsuario === 'string' && textoUsuario.length > 0) {
          await procesarConGemini(textoUsuario);
        } else {
          log(`⚠️ Mensaje inválido. Type: ${typeof message}, Value: ${JSON.stringify(message)}`);
        }
      });

      // Eventos adicionales para debug completo
      avatar.on(StreamingEvents.USER_START, () => {
        log('👂 [USER_START] Usuario empezó a hablar');
      });

      avatar.on(StreamingEvents.USER_STOP, () => {
        log('🛑 [USER_STOP] Usuario terminó de hablar');
      });

      // Capturar TODOS los eventos para debug
      const allEvents = Object.values(StreamingEvents);
      allEvents.forEach((eventName: any) => {
        avatar.on(eventName, (e: any) => {
          if (!eventName.includes('AVATAR') && !eventName.includes('STREAM')) {
            log(`🔔 Evento: ${eventName}`);
          }
        });
      });

      // ========== 1. CREAR SESIÓN (SIN knowledge base) ==========
      log('⏳ Iniciando sesión con HeyGen...');
      const sessionData = await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: 'Elenora_IT_Sitting_public',
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.FRIENDLY,
        },
        language: 'es',
        disableIdleTimeout: false,
        // ❌ NO knowledgeBase
        // ❌ NO knowledgeId
      });

      setSessionId(sessionData.session_id);
      setIsConnected(true);
      log(`✅ Sesión iniciada: ${sessionData.session_id}`);
      
      // ========== 2. ⭐ ACTIVAR VOICE CHAT (ESTO CAPTURA EL AUDIO) ⭐ ==========
      log('🎤 Activando Voice Chat...');
      await avatar.startVoiceChat();
      log('✅ ¡Voice Chat ACTIVADO! Ahora puedes hablar');
      log('💬 Di algo como: "Hola" o "Quiero agendar una cita"');

    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
      console.error('Error completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const procesarConGemini = async (texto: string) => {
    log('🤖 Enviando a Edge Function...');

    try {
      // Llamar a la Edge Function de Supabase (las API keys están protegidas allá)
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/agendar-cita`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            mensaje: texto,
            userInfo: {} // Aquí puedes agregar info adicional del usuario
          })
        }
      );

      const data = await res.json();
      log(`📨 Respuesta: ${JSON.stringify(data).substring(0, 100)}...`);

      if (data.success) {
        if (data.agendar) {
          // Es una cita
          log(`✅ ¡CITA AGENDADA! ${JSON.stringify(data.cita)}`);
          
          // Hacer que el avatar confirme
          if (avatarRef.current && sessionId) {
            await avatarRef.current.speak({
              text: data.respuesta,
              taskType: TaskType.REPEAT,
              taskMode: 'sync'
            });
          }
          
          mostrarNotificacion(`✅ Cita agendada correctamente`);
        } else {
          // Es conversación normal
          log(`💬 Respuesta conversacional`);
          
          if (avatarRef.current && sessionId) {
            await avatarRef.current.speak({
              text: data.respuesta,
              taskType: TaskType.REPEAT,
              taskMode: 'sync'
            });
          }
        }
      } else {
        log(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      log(`❌ Error Edge Function: ${err.message}`);
    }
  };

  const mostrarNotificacion = (msg: string) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px 32px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:10002;font:700 18px sans-serif';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 6000);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  return (
    <>
      {/* Avatar Video Container */}
      <div style={{
        position: 'fixed',
        left: 40,
        bottom: 40,
        width: isConnected ? 400 : 200,
        height: isConnected ? 300 : 200,
        borderRadius: isConnected ? 12 : '50%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        border: '3px solid white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        zIndex: 9999
      }}>
        {!isConnected ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: 16
          }}>
            <button
              onClick={iniciarAvatar}
              disabled={isLoading}
              style={{
                padding: '16px 32px',
                fontSize: 16,
                fontWeight: 'bold',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: 50,
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {isLoading ? '⏳ Cargando...' : '👋 Iniciar Chat'}
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
      </div>

      {/* Debug Panel */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 450,
        maxHeight: 350,
        background: 'rgba(0,0,0,0.95)',
        color: '#0f0',
        padding: 16,
        borderRadius: 12,
        fontSize: 11,
        fontFamily: 'Consolas, monospace',
        overflowY: 'auto',
        border: '2px solid #667eea',
        zIndex: 9998
      }}>
        <div style={{
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #667eea',
          color: '#fff',
          fontWeight: 'bold'
        }}>
          🔍 Debug Console
        </div>
        {logs.map((log, i) => (
          <div key={i} style={{
            marginBottom: 4,
            color: log.includes('❌') ? '#f44' :
                   log.includes('✅') ? '#4f4' :
                   log.includes('⚠️') ? '#ff4' :
                   log.includes('📅') ? '#0ff' : '#0f0'
          }}>
            {log}
          </div>
        ))}
      </div>
    </>
  );
};

export default AvatarSDK;
