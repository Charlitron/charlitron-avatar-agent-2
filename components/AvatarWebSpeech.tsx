import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import StreamingAvatar from '@heygen/streaming-avatar';

const HEYGEN_TOKEN = import.meta.env.VITE_HEYGEN_TOKEN || '';

const AvatarWebSpeech: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    log('🎯 Componente montado - Web Speech API');
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const iniciarAvatar = async () => {
    setIsLoading(true);
    log('🚀 Iniciando avatar...');

    try {
      // ========== 1. CREAR AVATAR ==========
      const avatar = new StreamingAvatar({ token: HEYGEN_TOKEN });
      avatarRef.current = avatar;

      avatar.on('avatar_start_talking', () => {
        log('🗣️ Avatar hablando');
      });

      avatar.on('avatar_stop_talking', () => {
        log('🤐 Avatar terminó');
      });

      avatar.on('stream_ready', (event: any) => {
        log('📹 Video listo');
        setStream(event.detail);
      });

      avatar.on('stream_disconnected', () => {
        log('❌ Desconectado');
        setIsConnected(false);
      });

      // Crear sesión (SIN knowledgeBase)
      log('⏳ Creando sesión HeyGen...');
      const sessionData = await avatar.createStartAvatar({
        quality: 'high',
        avatarName: 'Elenora_IT_Sitting_public',
        voice: {
          rate: 1.0,
          emotion: 'friendly',
        },
        language: 'es',
      });

      setSessionId(sessionData.session_id);
      setIsConnected(true);
      log(`✅ Avatar listo: ${sessionData.session_id}`);

      // ========== 2. INICIAR WEB SPEECH API ==========
      iniciarReconocimientoVoz();

    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
      console.error('Error completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iniciarReconocimientoVoz = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      log('❌ Tu navegador no soporta reconocimiento de voz');
      log('ℹ️ Usa Chrome o Edge');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
      setIsListening(true);
      log('🎤 Micrófono ACTIVO - Habla ahora');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const texto = finalTranscript.trim();
        log(`👤 Usuario: "${texto}"`);
        setTranscript(texto);
        procesarConGemini(texto);
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      log(`⚠️ Error micrófono: ${event.error}`);
      if (event.error === 'no-speech') {
        log('ℹ️ No detecté voz, sigue escuchando...');
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start(); // Reiniciar automáticamente
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    log('✅ Web Speech API inicializada');
  };

  const procesarConGemini = async (texto: string) => {
    log('🤖 Procesando con Gemini...');

    try {
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
            userInfo: {}
          })
        }
      );

      const data = await res.json();
      log(`📨 Respuesta recibida`);

      if (data.success) {
        if (data.agendar) {
          log(`✅ CITA AGENDADA!`);
          mostrarNotificacion('✅ Cita agendada correctamente');
        } else {
          log(`💬 Conversación normal`);
        }
        
        // Hacer que el avatar hable
        if (avatarRef.current && sessionId) {
          await avatarRef.current.speak({
            text: data.respuesta,
            taskType: 'repeat',
          });
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

  const detenerReconocimiento = () => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
      log('🛑 Micrófono desactivado');
    }
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
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'all 0.4s ease',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!isConnected && (
          <button
            onClick={iniciarAvatar}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: 8,
              cursor: isLoading ? 'wait' : 'pointer',
              font: '700 16px sans-serif',
            }}
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Chat'}
          </button>
        )}
        
        {isConnected && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            
            {/* Indicador de escucha */}
            {isListening && (
              <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: '#f00',
                width: 12,
                height: 12,
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite',
              }} />
            )}

            {/* Transcript en vivo */}
            {transcript && (
              <div style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                right: 10,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: 8,
                borderRadius: 6,
                fontSize: 12,
              }}>
                {transcript}
              </div>
            )}
          </>
        )}
      </div>

      {/* Panel de Debug */}
      <div style={{
        position: 'fixed',
        right: 40,
        bottom: 40,
        width: 400,
        maxHeight: 300,
        background: 'rgba(0,0,0,0.9)',
        color: '#00ff00',
        padding: 16,
        borderRadius: 12,
        fontFamily: 'monospace',
        fontSize: 12,
        overflow: 'auto',
        zIndex: 1001,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#00ffff' }}>
          🐛 Debug Console
        </div>
        {logs.map((l, i) => (
          <div key={i} style={{ marginBottom: 4 }}>{l}</div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
};

export default AvatarWebSpeech;
