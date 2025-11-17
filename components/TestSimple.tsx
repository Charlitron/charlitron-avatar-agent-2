import React, { useRef, useState } from 'react';
import CalendarioAgenda from './CalendarioAgenda';

const TestSimple: React.FC = () => {
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
      log(`⚠️ Error: ${event.error}`);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const procesarTexto = async (texto: string) => {
    log('🤖 Enviando a Gemini...');

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
      log(`📨 Respuesta: ${JSON.stringify(data).substring(0, 100)}`);

      if (data.success) {
        if (data.agendar) {
          log(`✅ ¡CITA AGENDADA EN SUPABASE!`);
          log(`📅 Datos: ${JSON.stringify(data.cita)}`);
          alert('✅ CITA GUARDADA! Revisa Supabase');
        } else {
          log(`💬 Respuesta: ${data.respuesta}`);
        }
      } else {
        log(`❌ Error: ${data.error || 'Desconocido'}`);
      }
    } catch (err: any) {
      log(`❌ Error fetch: ${err.message}`);
    }
  };

  const detener = () => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
      log('🛑 Micrófono desactivado');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: 20,
      background: 'rgba(0,0,0,0.9)',
      color: '#00ff00',
      padding: 20,
      borderRadius: 12,
      fontFamily: 'monospace',
      fontSize: 14,
      maxWidth: 500,
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 10000,
    }}>
      <h3 style={{ color: '#00ffff', marginTop: 0 }}>🧪 TEST - Gemini + Supabase</h3>
      
      {/* Campo de texto para Firefox */}
      <div style={{ marginBottom: 15, background: '#222', padding: 10, borderRadius: 6 }}>
        <label style={{ color: '#fff', display: 'block', marginBottom: 5 }}>
          ✍️ Escribe tu mensaje (para Firefox):
        </label>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && inputText.trim()) {
              log(`📝 Texto escrito: "${inputText}"`);
              procesarTexto(inputText);
              setInputText('');
            }
          }}
          placeholder="Ej: Quiero agendar una cita para mañana"
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 4,
            border: '2px solid #00ff00',
            background: '#000',
            color: '#0f0',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={() => {
            if (inputText.trim()) {
              log(`📝 Enviando: "${inputText}"`);
              procesarTexto(inputText);
              setInputText('');
            }
          }}
          style={{
            marginTop: 8,
            background: '#0066ff',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          📤 ENVIAR
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        {!isListening ? (
          <button
            onClick={iniciar}
            style={{
              background: '#00ff00',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            🎤 INICIAR RECONOCIMIENTO
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
              fontSize: 16,
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
          <strong>Último texto:</strong><br/>
          {transcript}
        </div>
      )}

      <div style={{
        background: '#000',
        padding: 10,
        borderRadius: 6,
        maxHeight: 400,
        overflow: 'auto',
      }}>
        <strong style={{ color: '#00ffff' }}>📋 Logs:</strong>
        {logs.map((l, i) => (
          <div key={i} style={{ marginTop: 4, fontSize: 12 }}>{l}</div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TestSimple;
