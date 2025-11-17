import React, { useEffect, useState } from 'react';

const GOOGLE_API_KEY = 'AIzaSyDBgs_zcP8yMbjIgcsV-KV7FfpGhn3E308';

const AvatarDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${msg}`;
    console.log(log);
    setLogs(prev => [...prev.slice(-15), log]);
  };

  useEffect(() => {
    addLog('🎯 Sistema iniciado');
    
    const handler = async (e: MessageEvent) => {
      addLog(`📨 Mensaje de: ${e.origin}`);
      
      if (e.origin !== 'https://labs.heygen.com') {
        addLog(`⚠️ Ignorado (no HeyGen)`);
        return;
      }

      addLog(`📦 ${JSON.stringify(e.data).substring(0, 80)}...`);

      const texto = e.data?.transcript || e.data?.userMessage || e.data?.text;
      
      if (texto) {
        addLog(`👤 "${texto}"`);
        await procesar(texto);
      }
    };

    window.addEventListener('message', handler);
    addLog('✅ Listener listo');

    return () => window.removeEventListener('message', handler);
  }, []);

  const procesar = async (texto: string) => {
    addLog('🤖 Llamando Gemini...');
    
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Si quiere cita JSON: {"agendar":true,"nombre":"...","email":"...","fecha":"2025-11-18","hora":"15:00","servicio":"..."} SINO: {"agendar":false}\nTexto: "${texto}"` }] }]
          })
        }
      );

      const data = await res.json();
      const resp = data.candidates[0].content.parts[0].text;
      addLog(`🤖 ${resp.substring(0, 80)}`);

      const json = resp.match(/\{.*\}/)?.[0];
      if (json) {
        const obj = JSON.parse(json);
        if (obj.agendar) {
          addLog('📅 ¡CITA DETECTADA!');
          await guardar(obj);
        } else {
          addLog('ℹ️ No es cita');
        }
      }
    } catch (err: any) {
      addLog(`❌ ${err.message}`);
    }
  };

  const guardar = async (datos: any) => {
    addLog(`💾 Guardando ${JSON.stringify(datos)}`);
    
    try {
      const res = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      if (res.ok) {
        const result = await res.json();
        addLog(`✅ Guardado! ${JSON.stringify(result)}`);
        notif(`✅ ${datos.fecha} ${datos.hora}`);
      } else {
        const err = await res.text();
        addLog(`❌ API: ${err}`);
      }
    } catch (err: any) {
      addLog(`❌ ${err.message}`);
    }
  };

  const notif = (msg: string) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:16px 24px;border-radius:12px;z-index:10001;font:600 16px sans-serif';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5000);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 400,
      maxHeight: 300,
      background: 'rgba(0,0,0,0.95)',
      color: '#0f0',
      padding: 16,
      borderRadius: 12,
      fontSize: 10,
      fontFamily: 'monospace',
      overflowY: 'auto',
      border: '2px solid #667eea',
      zIndex: 9998
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #667eea', paddingBottom: 8 }}>
        <strong style={{ color: '#fff' }}>🔍 Debug Panel</strong>
        <button onClick={() => setVisible(false)} style={{ background: '#f44336', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>X</button>
      </div>
      {logs.map((log, i) => (
        <div key={i} style={{
          marginBottom: 4,
          color: log.includes('❌') ? '#f44' : log.includes('✅') ? '#4f4' : log.includes('⚠️') ? '#ff4' : '#0f0'
        }}>
          {log}
        </div>
      ))}
    </div>
  );
};

export default AvatarDebug;
