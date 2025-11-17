import React, { useEffect, useRef, useState } from 'react';
import { StreamingAvatar, TaskMode } from '@heygen/streaming-avatar';

const HEYGEN_API_TOKEN = 'N2U3YzdmMTQyNmQzNGQ1Y2I3ZjFmY2IwOTc3ZmJiZjAtMTc0MjQ5NzY0OA==';
const AVATAR_ID = 'Elenora_IT_Sitting_public';
const GOOGLE_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDBgs_zcP8yMbjIgcsV-KV7FfpGhn3E308';

const AvatarUnified: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Iniciando...');
  
  const avatarRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const genaiRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initializeAvatar = async () => {
      try {
        // 1. Inicializar Gemini usando fetch API (más compatible)
        setStatusMessage('Conectando con IA...');
        
        genaiRef.current = {
          async sendMessage(text: string) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `Contexto: Eres Elena, asistente IA de Charlitron. Si el usuario quiere agendar una cita, responde con JSON: {"agendar": true, "nombre": "...", "email": "...", "fecha": "YYYY-MM-DD", "hora": "HH:MM", "servicio": "..."}. Luego un mensaje amigable.\n\nUsuario: ${text}`
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 500,
                }
              })
            });
            
            const data = await response.json();
            return {
              response: {
                text: () => data.candidates[0].content.parts[0].text
              }
            };
          }
        };

        // 2. Solicitar permisos de micrófono
        setStatusMessage('Solicitando permisos...');
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        });

        // 3. Inicializar Avatar HeyGen
        setStatusMessage('Conectando avatar...');
        const avatar = new StreamingAvatar({
          token: HEYGEN_API_TOKEN,
        });

        avatarRef.current = avatar;

        // Event Listeners
        avatar.on('avatar_start_talking', () => {
          setStatusMessage('Elena está hablando...');
        });

        avatar.on('avatar_stop_talking', () => {
          setStatusMessage('Te escucho...');
        });

        avatar.on('user_talking', () => {
          setStatusMessage('Escuchando...');
        });

        avatar.on('user_stop_talking', async (event: any) => {
          const userText = event?.detail?.message || event?.text || '';
          if (userText.trim()) {
            await handleUserMessage(userText);
          }
        });

        avatar.on('stream_ready', (event: any) => {
          if (videoRef.current && event.detail) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.play();
          }
        });

        // Iniciar sesión
        await avatar.createStartAvatar({
          quality: 'medium',
          avatarName: AVATAR_ID,
          knowledgeBase: '07be27b9b571458999ce264c99cfe779b',
          voice: {
            rate: 1.0,
            emotion: 'Friendly',
          },
          language: 'es',
          disableIdleTimeout: false,
        });

        setStatusMessage('¡Puedo escucharte! Habla cuando quieras');
        setIsInitialized(true);
        sessionIdRef.current = 'active';

      } catch (err: any) {
        console.error('Error al inicializar:', err);
        if (err.name === 'NotAllowedError') {
          setStatusMessage('Permiso de micrófono denegado');
        } else {
          setStatusMessage('Error al iniciar');
        }
      }
    };

    initializeAvatar();

    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar?.();
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleUserMessage = async (userText: string) => {
    console.log('👤 Usuario dijo:', userText);
    setStatusMessage('Pensando...');

    try {
      if (!genaiRef.current) {
        console.error('Gemini no inicializado');
        return;
      }

      // Enviar a Gemini
      const result = await genaiRef.current.sendMessage(userText);
      const response = await result.response;
      const responseText = response.text();
      
      console.log('🤖 Respuesta Gemini:', responseText);

      // Verificar si Gemini detectó agendamiento
      let finalResponse = responseText;
      let agendamiento = null;

      try {
        const jsonMatch = responseText.match(/\{.*"agendar".*\}/);
        if (jsonMatch) {
          agendamiento = JSON.parse(jsonMatch[0]);
          console.log('📅 Agendamiento detectado:', agendamiento);
          
          finalResponse = `¡Perfecto! Voy a agendar tu cita para el ${agendamiento.fecha} a las ${agendamiento.hora}. Te enviaré confirmación por email.`;
          
          // Guardar cita
          await guardarCita(agendamiento);
        }
      } catch (parseErr) {
        console.log('No es agendamiento, respuesta normal');
      }

      // Hacer que el avatar hable la respuesta
      if (avatarRef.current) {
        setStatusMessage('Elena está hablando...');
        await avatarRef.current.speak({ 
          text: finalResponse,
          taskType: TaskMode.REPEAT 
        });
      }

      setStatusMessage('Te escucho...');

    } catch (error) {
      console.error('❌ Error:', error);
      setStatusMessage('Ocurrió un error');
      
      const errorMsg = 'Disculpa, tuve un pequeño problema. ¿Puedes intentar de nuevo?';
      if (avatarRef.current) {
        await avatarRef.current.speak({ text: errorMsg });
      }
      setStatusMessage('Te escucho...');
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
        console.log('✅ Cita guardada correctamente:', result);
      } else {
        console.error('❌ Error al guardar cita');
      }
    } catch (err) {
      console.error('❌ Error al guardar cita:', err);
    }
  };

  const handleContainerClick = () => {
    setIsExpanded(!isExpanded);
  };

  const containerClasses = [
    'show',
    isInitialized ? 'initialized' : '',
    isExpanded ? 'expand' : ''
  ].join(' ');

  return (
    <div id="avatar-container" className={containerClasses} onClick={handleContainerClick}>
      <div id="avatar-overlay">
        <span>{statusMessage}</span>
      </div>
      <video ref={videoRef} autoPlay playsInline muted id="avatar-video" />
    </div>
  );
};

export default AvatarUnified;
