import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface Mensaje {
  rol: 'usuario' | 'asistente'
  texto: string
  timestamp: Date
}

export default function ChatAsistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: 'asistente',
      texto: '¡Hola! Soy tu asistente virtual de Charlitron Agencia 360. Puedo ayudarte a:\n\n📅 Consultar disponibilidad de citas\n✅ Agendar citas para servicios\n❌ Cancelar citas existentes\n\n💰 Si deseas cotizar un servicio, puedes:\n- Usar el botón "Cotizador de Servicios" abajo\n- Contactar directamente por WhatsApp para atención personalizada\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const mensajesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight
    }
  }, [mensajes])

  const procesarMensaje = async (texto: string) => {
    setCargando(true)
    
    const mensajeUsuario: Mensaje = {
      rol: 'usuario',
      texto,
      timestamp: new Date()
    }
    setMensajes(prev => [...prev, mensajeUsuario])

    try {
      // Construir historial completo para mantener contexto
      const historialCompleto = [...mensajes, mensajeUsuario]
        .map(m => `${m.rol === 'usuario' ? 'Usuario' : 'Asistente'}: ${m.texto}`)
        .join('\n\n')

      // Llamar a Gemini para procesar la intención CON CONTEXTO
      const respuestaGemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Eres un asistente de agendamiento de citas. Analiza TODA la conversación y extrae la información necesaria.

HISTORIAL DE LA CONVERSACIÓN:
${historialCompleto}

IMPORTANTE: 
- Si el usuario ya dio su nombre, email o teléfono anteriormente, ÚSALO
- Si el usuario dice una hora como "de 3 a 6" significa de 15:00 (3pm) con duración de 3 horas
- Si el usuario confirma querer agendar, usa TODA la información recopilada
- Formatos de fecha aceptados: "19 de noviembre", "mañana", "hoy", "YYYY-MM-DD"
- Convierte SIEMPRE la fecha a formato YYYY-MM-DD (año actual: 2025)
- El TELÉFONO es OBLIGATORIO para agendar (10 dígitos)
- Si falta el teléfono, NO intentes agendar, pide el dato
- Si el usuario pregunta por cotización o presupuesto, dile: "Para cotizaciones personalizadas, usa el botón 'Cotizador de Servicios' abajo o contacta por WhatsApp para atención directa con un humano"

Responde en formato JSON EXACTO:
{
  "intencion": "consultar_disponibilidad" | "agendar_cita" | "cancelar_cita" | "informacion",
  "fecha": "2025-11-XX" (SIEMPRE en formato YYYY-MM-DD),
  "hora": "HH:00" (formato 24h, ej: "15:00" para 3pm),
  "nombre": "nombre completo extraído de la conversación",
  "email": "email extraído de la conversación",
  "telefono": "teléfono de 10 dígitos extraído (OBLIGATORIO para agendar)",
  "servicio": "Perifoneo | Volanteo | Consultoría Marketing | Activación | Producción Visual | Otros",
  "duracion": 1-6 (número de horas),
  "respuesta": "mensaje confirmando la acción o pidiendo datos faltantes"
}

Servicios: Consultoría Marketing, Perifoneo, Volanteo, Activación, Producción Visual, Otros
Horario: 9am - 8pm
Duración: 1-6 horas`
              }]
            }]
          })
        }
      )

      const dataGemini = await respuestaGemini.json()
      const textoRespuesta = dataGemini.candidates[0].content.parts[0].text
      
      // Extraer JSON de la respuesta
      const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No se pudo procesar la respuesta')
      
      const analisis = JSON.parse(jsonMatch[0])

      console.log('🔍 Análisis de Gemini:', analisis)

      // Ejecutar acción según la intención
      let respuestaFinal = analisis.respuesta

      if (analisis.intencion === 'consultar_disponibilidad' && analisis.fecha) {
        // Consultar disponibilidad
        const { data } = await supabase.functions.invoke('obtener-disponibilidad', {
          body: { fecha: analisis.fecha }
        })

        if (data && data.disponibles) {
          const horas = data.disponibles.map((d: any) => d.hora).join(', ')
          respuestaFinal = `📅 Horarios disponibles para ${analisis.fecha}:\n\n✅ ${horas}\n\n¿A qué hora quieres tu cita?`
        }
      } else if (analisis.intencion === 'agendar_cita') {
        // Validar que tengamos todos los datos necesarios
        if (!analisis.fecha || !analisis.hora || !analisis.nombre || !analisis.email || !analisis.telefono) {
          const faltantes = []
          if (!analisis.fecha) faltantes.push('📅 fecha')
          if (!analisis.hora) faltantes.push('⏰ hora')
          if (!analisis.nombre) faltantes.push('👤 nombre completo')
          if (!analisis.email) faltantes.push('📧 email')
          if (!analisis.telefono) faltantes.push('📱 teléfono')
          
          respuestaFinal = `❗ Me falta información para agendar tu cita:\n\n${faltantes.join('\n')}\n\nPor favor proporciónalos para continuar.`
        } else {
          // Agendar cita automáticamente
          const { data, error } = await supabase.functions.invoke('agendar-en-google', {
            body: {
              nombre: analisis.nombre,
              email: analisis.email,
              telefono: analisis.telefono,
              fecha: analisis.fecha,
              hora: analisis.hora,
              motivo: analisis.servicio || 'Consultoría Marketing',
              duracion: analisis.duracion || 1
            }
          })

          if (data && data.success) {
            respuestaFinal = `✅ ¡Perfecto ${analisis.nombre}! Tu cita ha sido agendada:\n\n📅 Fecha: ${analisis.fecha}\n⏰ Hora: ${analisis.hora}\n💼 Servicio: ${analisis.servicio || 'Consultoría Marketing'}\n⏱️ Duración: ${analisis.duracion || 1}h\n\n📧 Recibirás confirmación en ${analisis.email}`
          } else {
            respuestaFinal = `❌ Hubo un problema al agendar: ${error?.message || data?.error || 'Error desconocido'}`
          }
        }
      } else if (analisis.intencion === 'cancelar_cita' && analisis.email) {
        // Cancelar cita
        const { data } = await supabase.functions.invoke('cancelar-cita', {
          body: { email: analisis.email }
        })

        if (data && data.success) {
          respuestaFinal = `✅ ${data.mensaje}`
        }
      }

      const mensajeAsistente: Mensaje = {
        rol: 'asistente',
        texto: respuestaFinal,
        timestamp: new Date()
      }
      setMensajes(prev => [...prev, mensajeAsistente])

    } catch (error: any) {
      console.error('Error:', error)
      const mensajeError: Mensaje = {
        rol: 'asistente',
        texto: '❌ Lo siento, hubo un error. ¿Puedes intentar de nuevo?',
        timestamp: new Date()
      }
      setMensajes(prev => [...prev, mensajeError])
    } finally {
      setCargando(false)
      setInput('')
    }
  }

  const enviarMensaje = () => {
    if (!input.trim()) return
    procesarMensaje(input.trim())
  }

  return (
    <>
      {/* Botón flotante */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-all duration-200"
          style={{ width: '64px', height: '64px' }}
        >
          <span className="text-3xl">💬</span>
        </button>
      )}

      {/* Ventana de chat */}
      {abierto && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 bg-slate-800 sm:rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden"
          style={{ 
            width: '100vw', 
            height: '100vh',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex', 
            flexDirection: 'column'
          }}
          className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 bg-slate-800 sm:rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden sm:w-[400px] sm:h-[600px] w-full h-full"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center">
            <div>
              <h3 className="text-white font-bold text-lg">🤖 Asistente Virtual</h3>
              <p className="text-purple-100 text-xs">Consulta y agenda aquí</p>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div
            ref={mensajesRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900"
            style={{ scrollBehavior: 'smooth' }}
          >
            {mensajes.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.rol === 'usuario'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.texto}
                </div>
              </div>
            ))}
            
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 p-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribe tu mensaje..."
                disabled={cargando}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
              <button
                onClick={enviarMensaje}
                disabled={cargando || !input.trim()}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  cargando || !input.trim()
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:scale-105'
                }`}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
