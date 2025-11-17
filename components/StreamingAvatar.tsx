import { useEffect, useRef, useState } from 'react';
import { StreamingAvatar, StartAvatarResponse, StreamingEvents, TaskType } from '@heygen/streaming-avatar';
import { supabaseService } from '../services/supabase';

const HEYGEN_API_KEY = 'N2U3YzdmMTQyNmQzNGQ1Y2I3ZjFmY2IwOTc3ZmJiZjAtMTc0MjQ5NzY0OA==';

export default function StreamingAvatarComponent() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debug, setDebug] = useState<string>('');
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; text: string }>>([]);

  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug('Streaming started!');
      };
    }
  }, [stream]);

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = HEYGEN_API_KEY;
    
    avatar.current = new StreamingAvatar({ token: newToken });
    
    // Configurar event listeners
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log('Avatar started talking', e);
    });
    
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log('Avatar stopped talking', e);
    });
    
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log('Stream disconnected');
      endSession();
    });
    
    avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
      console.log('Stream ready:', event.detail);
      setStream(event.detail);
    });

    avatar.current.on(StreamingEvents.USER_TALKING, (e) => {
      console.log('User talking detected:', e);
    });

    avatar.current.on(StreamingEvents.USER_STOP_TALKING, async (e) => {
      console.log('User stopped talking:', e);
      // Aquí capturamos lo que dijo el usuario
      if (e.detail && e.detail.transcript) {
        const userText = e.detail.transcript;
        console.log('User said:', userText);
        await processUserMessage(userText);
      }
    });

    try {
      const res: StartAvatarResponse = await avatar.current.createStartAvatar({
        quality: 'medium',
        avatarName: 'Elenora_IT_Sitting_public',
        knowledgeBase: '07be27b9b571458999ce264c99cfe779b',
        voice: {
          rate: 1.0,
          emotion: 'Friendly',
        },
        language: 'es',
        disableIdleTimeout: false,
      });

      setDebug(JSON.stringify(res));
    } catch (error) {
      console.error('Error starting avatar:', error);
      setDebug(`Error: ${error}`);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function processUserMessage(message: string) {
    console.log('📝 Mensaje del usuario:', message);
    
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    
    // Detección simple de intenciones
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('cita') || lowerMsg.includes('agendar') || lowerMsg.includes('reservar')) {
      console.log('🎯 Detectada solicitud de cita!');
      const logMsg = `📋 Solicitud de cita detectada: "${message}"`;
      setChatHistory(prev => [...prev, { role: 'system', text: logMsg }]);
      
      // Guardar en Supabase
      await supabaseService.guardarConsulta({
        pregunta: message,
        respuesta: 'Solicitud de cita - pendiente de procesar',
        user_info: { timestamp: new Date().toISOString() }
      });
    }
  }

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug('Avatar no inicializado');
      return;
    }
    
    try {
      await avatar.current.speak({
        text: userMessage,
        taskType: TaskType.TALK,
      });
      
      setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
      setUserMessage('');
    } catch (e) {
      setDebug(`Error: ${e}`);
    } finally {
      setIsLoadingRepeat(false);
    }
  }

  async function endSession() {
    if (avatar.current) {
      await avatar.current.stopAvatar();
      avatar.current = null;
    }
    setStream(null);
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 10000,
      background: '#0a0a0a'
    }}>
      {/* Video del Avatar */}
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        <video
          ref={mediaStream}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <track kind="captions" />
        </video>

        {/* Botón de inicio */}
        {!stream && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <button
              onClick={startSession}
              disabled={isLoadingSession}
              style={{
                padding: '20px 40px',
                fontSize: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: isLoadingSession ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.5)',
              }}
            >
              {isLoadingSession ? '🔄 Iniciando Avatar...' : '👋 Iniciar Conversación'}
            </button>
          </div>
        )}

        {/* Botón para cerrar */}
        {stream && (
          <button
            onClick={endSession}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '12px 24px',
              fontSize: '16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            ✕ Cerrar
          </button>
        )}
      </div>

      {/* Panel de Chat e Input */}
      {stream && (
        <div style={{
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.95)',
          borderTop: '1px solid #333',
          maxHeight: '35vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Historial de Chat */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '15px',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            maxHeight: '180px',
          }}>
            {chatHistory.length === 0 && (
              <p style={{ color: '#999', textAlign: 'center', fontSize: '14px' }}>
                Habla con el avatar o escribe un mensaje...
              </p>
            )}
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '8px',
                  padding: '10px 14px',
                  background: msg.role === 'user' ? 'rgba(102, 126, 234, 0.4)' : 'rgba(118, 75, 162, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#fff',
                  borderLeft: msg.role === 'user' ? '4px solid #667eea' : '4px solid #764ba2',
                }}
              >
                <strong style={{ marginRight: '8px', display: 'block', marginBottom: '4px' }}>
                  {msg.role === 'user' ? '👤 Usuario' : '🤖 Sistema'}
                </strong>
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input de texto */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoadingRepeat && userMessage && handleSpeak()}
              placeholder="Escribe un mensaje para el avatar..."
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '16px',
                border: '1px solid #444',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSpeak}
              disabled={isLoadingRepeat || !userMessage}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                background: isLoadingRepeat || !userMessage ? '#555' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoadingRepeat || !userMessage ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isLoadingRepeat ? '⏳ Enviando...' : '📤 Enviar'}
            </button>
          </div>

          {/* Debug info */}
          {debug && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(255, 243, 205, 0.15)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ffc107',
              maxHeight: '70px',
              overflowY: 'auto',
              fontFamily: 'monospace',
            }}>
              {debug}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
