import React, { useRef, useState } from 'react';
import CalendarioAgenda from './CalendarioAgenda';

const TestSimple2: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [avatarPausado, setAvatarPausado] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(true);
  const recognitionRef = useRef<any>(null);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const iniciar = () => {
    // Detectar si es Chrome/Edge o Firefox
    const tieneReconocimiento = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (!tieneReconocimiento) {
      log('⚠️ Firefox no soporta reconocimiento de voz');
      log('ℹ️ Usa el campo de texto para probar');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
      setIsListening(true);
      log('✅ Micrófono activado - HABLA AHORA');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }

      if (finalTranscript) {
        const texto = finalTranscript.trim();
        log(`👤 Escuché: "${texto}"`);
        setTranscript(texto);
        procesarTexto(texto);
      }
    };

    recognition.onerror = (event: any) => {
      log(`❌ Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      log('🛑 Reconocimiento detenido');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const detener = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      log('🛑 Micrófono desactivado');
    }
  };

  const procesarTexto = async (texto: string) => {
    log(`🔄 Procesando con Gemini...`);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        log('❌ Faltan credenciales de Supabase');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/agendar-cita`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          mensaje: texto,
          userInfo: {}
        })
      });

      const data = await response.json();

      log(`📦 Respuesta: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        if (data.agendar) {
          log(`✅ CITA GUARDADA: ${JSON.stringify(data.cita)}`);
        } else {
          log(`💬 Respuesta: ${data.respuesta}`);
        }
      } else {
        log(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      log(`❌ Error en fetch: ${error}`);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mostrarCalendario ? '1fr 500px' : '1fr',
      gap: '20px',
      maxWidth: mostrarCalendario ? '1400px' : '800px',
      margin: '0 auto',
      padding: '20px',
    }}>
      {/* Panel Izquierdo - Avatar y Controles */}
      <div style={{
        background: '#1a1a1a',
        padding: 20,
        borderRadius: 12,
        color: '#fff',
        border: '1px solid #333',
      }}>
        <h2 style={{ marginBottom: 20, color: '#00ffff', fontSize: 24 }}>
          🤖 Charlitron - Asistente de Publicidad
        </h2>

        {/* Botón Pausar/Reanudar Avatar */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => {
              setAvatarPausado(!avatarPausado);
              log(avatarPausado ? '▶️ Avatar reanudado' : '⏸️ Avatar pausado');
            }}
            style={{
              background: avatarPausado ? '#00ff00' : '#ff9800',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
              width: '100%',
            }}
          >
            {avatarPausado ? '▶️ REANUDAR AVATAR' : '⏸️ PAUSAR AVATAR'}
          </button>
          {avatarPausado && (
            <p style={{ 
              marginTop: 10, 
              color: '#ff9800', 
              fontSize: 14,
              textAlign: 'center'
            }}>
              ℹ️ Avatar en silencio. Usa el formulario de la derecha para agendar →
            </p>
          )}
        </div>

        {/* Área del Avatar (placeholder por ahora) */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
          borderRadius: 12,
          height: 350,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #00ffff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{ 
              fontSize: 120,
              filter: avatarPausado ? 'grayscale(100%)' : 'none',
              opacity: avatarPausado ? 0.5 : 1,
              transition: 'all 0.3s ease'
            }}>
              🤖
            </div>
            <p style={{ 
              color: '#00ffff', 
              marginTop: 10,
              fontWeight: 'bold',
              fontSize: 18
            }}>
              {avatarPausado ? '⏸️ Pausado' : '🎙️ Listo para hablar'}
            </p>
          </div>
          {/* Efecto de fondo animado */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
            animation: avatarPausado ? 'none' : 'pulse-glow 2s infinite',
          }}></div>
        </div>

        {/* Botón Toggle Calendario */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setMostrarCalendario(!mostrarCalendario)}
            style={{
              background: mostrarCalendario ? '#6366f1' : '#10b981',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 14,
              width: '100%',
            }}
          >
            {mostrarCalendario ? '❌ Ocultar Calendario' : '📅 Mostrar Calendario'}
          </button>
        </div>

        {/* Texto Manual */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            color: '#00ffff',
            fontSize: 14,
            fontWeight: 'bold'
          }}>
            💬 Escribe o habla tu consulta:
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && inputText.trim()) {
                log(`📝 Enviando: "${inputText}"`);
                procesarTexto(inputText);
                setInputText('');
              }
            }}
            placeholder="Ej: Quiero información sobre marketing digital"
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 6,
              border: '2px solid #333',
              background: '#000',
              color: '#fff',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => {
              if (inputText.trim()) {
                log(`📝 Enviando: "${inputText}"`);
                procesarTexto(inputText);
                setInputText('');
              }
            }}
            style={{
              background: '#00ff00',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 14,
              flex: 1,
            }}
          >
            ✅ ENVIAR
          </button>

          {!isListening ? (
            <button
              onClick={iniciar}
              style={{
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 14,
                flex: 1,
              }}
            >
              🎤 VOZ
            </button>
          ) : (
            <button
              onClick={detener}
              style={{
                background: '#ff0000',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 14,
                flex: 1,
              }}
            >
              🛑 DETENER
            </button>
          )}
        </div>

        {isListening && (
          <div style={{
            background: '#ff0000',
            padding: 10,
            borderRadius: 6,
            marginBottom: 10,
            textAlign: 'center',
            color: '#fff',
            fontWeight: 'bold',
            animation: 'pulse 1s infinite',
          }}>
            🔴 GRABANDO - HABLA AHORA
          </div>
        )}

        {transcript && (
          <div style={{
            background: '#333',
            padding: 10,
            borderRadius: 6,
            marginBottom: 10,
            color: '#fff',
          }}>
            <strong>Último texto capturado:</strong><br/>
            {transcript}
          </div>
        )}

        <div style={{
          background: '#000',
          padding: 10,
          borderRadius: 6,
          maxHeight: 300,
          overflow: 'auto',
          border: '1px solid #333',
        }}>
          <strong style={{ color: '#00ffff' }}>📋 Logs del Sistema:</strong>
          {logs.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
              Sin actividad aún...
            </div>
          ) : (
            logs.map((l, i) => (
              <div key={i} style={{ marginTop: 4, fontSize: 12, color: '#0f0' }}>{l}</div>
            ))
          )}
        </div>
      </div>

      {/* Panel Derecho - Calendario */}
      {mostrarCalendario && (
        <div>
          <CalendarioAgenda 
            onCitaAgendada={() => {
              log('✅ Cita agendada exitosamente desde calendario');
              setAvatarPausado(false); // Reanudar avatar después de agendar
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default TestSimple2;
