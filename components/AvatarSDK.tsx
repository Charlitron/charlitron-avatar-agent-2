import React, { useEffect, useRef, useState } from 'react';
import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType,
  VoiceEmotion 
} from '@heygen/streaming-avatar';

const HEYGEN_TOKEN = 'N2U3YzdmMTQyNmQzNGQ1Y2I3ZjFmY2IwOTc3ZmJiZjAtMTc0MjQ5NzY0OA==';
const GEMINI_KEY = 'AIzaSyDBgs_zcP8yMbjIgcsV-KV7FfpGhn3E308';

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

      // ========== EVENTOS IMPORTANTES ==========
      
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

      // ========== ESTE ES EL EVENTO CLAVE ==========
      avatar.on(StreamingEvents.USER_TALKING, (e) => {
        log('👂 Usuario hablando...');
      });

      avatar.on(StreamingEvents.USER_STOP_TALKING, async (e) => {
        log('🛑 Usuario dejó de hablar');
        // AQUÍ capturamos lo que dijo el usuario
        const userMessage = e.detail?.message || e.detail?.text || '';
        if (userMessage) {
          log(`👤 Usuario dijo: "${userMessage}"`);
          await procesarConGemini(userMessage);
        }
      });

      // Iniciar sesión
      log('⏳ Iniciando sesión con HeyGen...');
      const sessionData = await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: 'Elenora_IT_Sitting_public',
        knowledgeBase: '07be27b9b571458999ce264c99cfe779b',
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.FRIENDLY,
        },
        language: 'es',
        disableIdleTimeout: false,
      });

      setSessionId(sessionData.session_id);
      setIsConnected(true);
      log(`✅ Sesión iniciada: ${sessionData.session_id}`);
      log('🎤 ¡Habla con el avatar ahora!');

    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const procesarConGemini = async (texto: string) => {
    log('🤖 Procesando con Gemini...');

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analiza si el usuario quiere agendar una cita. Si SÍ, responde JSON: {"agendar":true,"nombre":"...","email":"...","fecha":"2025-11-18","hora":"15:00","servicio":"perifoneo"}. Si NO: {"agendar":false}\n\nUsuario: "${texto}"`
              }]
            }]
          })
        }
      );

      const data = await res.json();
      const respuesta = data.candidates[0].content.parts[0].text;
      log(`🤖 Gemini: ${respuesta.substring(0, 80)}...`);

      const json = respuesta.match(/\{.*\}/)?.[0];
      if (json) {
        const obj = JSON.parse(json);
        if (obj.agendar) {
          log('📅 ¡CITA DETECTADA! Guardando...');
          await guardarCita(obj);
        } else {
          log('ℹ️ No es solicitud de cita');
        }
      }
    } catch (err: any) {
      log(`❌ Error Gemini: ${err.message}`);
    }
  };

  const guardarCita = async (datos: any) => {
    try {
      const res = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      if (res.ok) {
        const result = await res.json();
        log(`✅ CITA GUARDADA! ${JSON.stringify(result)}`);
        
        // Hacer que el avatar confirme
        if (avatarRef.current && sessionId) {
          await avatarRef.current.speak({
            text: `¡Perfecto! He agendado tu cita para el ${datos.fecha} a las ${datos.hora}. Recibirás una confirmación pronto.`,
            taskType: TaskType.REPEAT,
            taskMode: 'sync'
          });
        }
        
        mostrarNotificacion(`✅ Cita: ${datos.fecha} ${datos.hora}`);
      } else {
        log(`❌ Error API: ${await res.text()}`);
      }
    } catch (err: any) {
      log(`❌ ${err.message}`);
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
