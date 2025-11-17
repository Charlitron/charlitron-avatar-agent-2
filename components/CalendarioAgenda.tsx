import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface DisponibilidadResponse {
  success: boolean
  fecha: string
  disponibles: string[]
  ocupados: Array<{ inicio: string; fin: string; titulo: string }>
  error?: string
}

interface CalendarioAgendaProps {
  onCitaAgendada?: () => void
}

export default function CalendarioAgenda({ onCitaAgendada }: CalendarioAgendaProps) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('')
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  const [disponibilidad, setDisponibilidad] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Datos del formulario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [servicio, setServicio] = useState('Consultoría Marketing')
  const [duracion, setDuracion] = useState(1) // Horas que dura el servicio

  // Generar próximos 7 días
  const [diasDisponibles, setDiasDisponibles] = useState<string[]>([])
  const [fechaMinima, setFechaMinima] = useState<string>('')

  useEffect(() => {
    const hoy = new Date()
    const dias: string[] = []
    
    // Fecha mínima es hoy
    setFechaMinima(hoy.toISOString().split('T')[0])
    
    // Generar próximos 7 días (para fallback)
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() + i)
      dias.push(fecha.toISOString().split('T')[0])
    }
    
    setDiasDisponibles(dias)
    setFechaSeleccionada(hoy.toISOString().split('T')[0]) // Seleccionar hoy por defecto
  }, [])

  // Cuando cambia la fecha o duración, consultar disponibilidad
  useEffect(() => {
    if (!fechaSeleccionada) return

    const consultarDisponibilidad = async () => {
      setCargando(true)
      setHoraSeleccionada('')

      try {
        const { data, error } = await supabase.functions.invoke('obtener-disponibilidad', {
          body: { fecha: fechaSeleccionada }
        })

        if (error) throw error

        const resultado = data as DisponibilidadResponse

        if (resultado.success) {
          // Filtrar horarios según duración (no permitir que se salga de 8pm)
          const horariosValidos = resultado.disponibles.filter(hora => {
            const horaInicio = parseInt(hora.split(':')[0])
            return horaInicio + duracion <= 20 // Máximo 8pm
          })
          setDisponibilidad(horariosValidos)
        } else {
          console.error('❌ Error al obtener disponibilidad:', resultado.error)
          // Fallback: horarios fijos si falla el API (cada 1 hora)
          const horariosFallback = []
          for (let h = 9; h < 20; h++) {
            if (h + duracion <= 20) { // Filtrar según duración
              horariosFallback.push(`${h.toString().padStart(2, '0')}:00`)
            }
          }
          setDisponibilidad(horariosFallback)
        }
      } catch (err) {
        console.error('❌ Error consultando disponibilidad:', err)
        // Fallback (cada 1 hora)
        const horariosFallback = []
        for (let h = 9; h < 20; h++) {
          if (h + duracion <= 20) { // Filtrar según duración
            horariosFallback.push(`${h.toString().padStart(2, '0')}:00`)
          }
        }
        setDisponibilidad(horariosFallback)
      } finally {
        setCargando(false)
      }
    }

    consultarDisponibilidad()
  }, [fechaSeleccionada, duracion]) // Agregar duracion como dependencia

  const agendarCita = async () => {
    if (!nombre || !email || !telefono || !horaSeleccionada) {
      alert('Por favor completa todos los campos')
      return
    }

    setGuardando(true)

    try {
      // Agendar directamente en Google Calendar + Supabase
      const { data, error } = await supabase.functions.invoke('agendar-en-google', {
        body: {
          nombre,
          email,
          telefono,
          fecha: fechaSeleccionada,
          hora: horaSeleccionada,
          motivo: servicio,
          duracion
        }
      })

      if (error) throw error

      if (data && data.success) {
        alert(`✅ ¡Cita agendada exitosamente!\n${servicio} - ${duracion}h\n${fechaSeleccionada} a las ${horaSeleccionada}\n\n📧 Recibirás confirmación por email`)
        
        // Limpiar formulario
        setNombre('')
        setEmail('')
        setTelefono('')
        setHoraSeleccionada('')
        setDuracion(1)
        
        onCitaAgendada?.()
      } else {
        throw new Error(data?.error || 'Error desconocido')
      }
    } catch (err: any) {
      console.error('❌ Error:', err)
      alert(`❌ Error al agendar cita: ${err.message || 'Error desconocido'}`)
    } finally {
      setGuardando(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-8 border border-cyan-500/30 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
          📅 Agenda tu Consultoría
        </h2>
        <p className="text-slate-400 text-sm">
          Selecciona fecha y hora disponible
        </p>
      </div>

      {/* Selector de Fecha */}
      <div className="mb-6">
        <label className="block text-cyan-300 text-sm font-semibold mb-3">
          📆 Selecciona la fecha:
        </label>
        <input
          type="date"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          min={fechaMinima}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-lg font-medium focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer"
          style={{
            colorScheme: 'dark'
          }}
        />
      </div>

      {/* Selector de Hora */}
      <div className="mb-6">
        <label className="block text-cyan-300 text-sm font-semibold mb-3">
          ⏰ Hora de inicio:
        </label>
        
        {cargando ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-slate-400 mt-2 text-sm">Consultando disponibilidad...</p>
          </div>
        ) : (
          <select
            value={horaSeleccionada}
            onChange={(e) => setHoraSeleccionada(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-lg font-medium focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer"
          >
            <option value="" disabled>Selecciona una hora...</option>
            {disponibilidad.length === 0 ? (
              <option value="" disabled>No hay horarios disponibles</option>
            ) : (
              disponibilidad.map((hora) => (
                <option key={hora} value={hora}>
                  {hora} - {parseInt(hora.split(':')[0]) + duracion}:00 ({duracion}h)
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Formulario de Datos */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-cyan-300 text-sm font-semibold mb-2">
            👤 Nombre completo:
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-cyan-300 text-sm font-semibold mb-2">
            📧 Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-cyan-300 text-sm font-semibold mb-2">
            📱 Teléfono:
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="555-123-4567"
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-cyan-300 text-sm font-semibold mb-2">
            💼 Servicio:
          </label>
          <select
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all"
          >
            <option value="Consultoría Marketing">📊 Consultoría Marketing</option>
            <option value="Perifoneo">📢 Perifoneo</option>
            <option value="Volanteo">📄 Volanteo</option>
            <option value="Activación">🎉 Activación</option>
            <option value="Producción Visual">🎥 Producción Visual</option>
            <option value="Otros">⭐ Otros</option>
          </select>
        </div>

        <div>
          <label className="block text-cyan-300 text-sm font-semibold mb-2">
            ⏱️ Duración del servicio:
          </label>
          <select
            value={duracion}
            onChange={(e) => {
              setDuracion(Number(e.target.value))
              // Resetear hora seleccionada cuando cambia la duración
              setHoraSeleccionada('')
            }}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all"
          >
            <option value={1}>⏰ 1 hora</option>
            <option value={2}>⏰ 2 horas</option>
            <option value={3}>⏰ 3 horas</option>
            <option value={4}>⏰ 4 horas</option>
            <option value={5}>⏰ 5 horas</option>
            <option value={6}>⏰ 6 horas</option>
          </select>
          <p className="text-slate-400 text-xs mt-1">
            Bloqueo de {duracion === 1 ? '1 hora' : `${duracion} horas`} en el calendario
          </p>
        </div>
      </div>

      {/* Resumen */}
      {horaSeleccionada && (
        <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-cyan-300 text-sm font-semibold mb-2">📋 Resumen de tu cita:</p>
          <div className="space-y-1">
            <p className="text-white font-medium">{servicio}</p>
            <p className="text-slate-300 text-sm">
              📅 {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-slate-300 text-sm">
              ⏰ {horaSeleccionada} - {parseInt(horaSeleccionada.split(':')[0]) + duracion}:00
            </p>
            <p className="text-cyan-400 text-sm font-semibold">
              ⏱️ Duración: {duracion} {duracion === 1 ? 'hora' : 'horas'}
            </p>
          </div>
        </div>
      )}

      {/* Botón Agendar */}
      <button
        onClick={agendarCita}
        disabled={guardando || !horaSeleccionada || !nombre || !email || !telefono}
        className={`
          w-full py-3 rounded-lg font-bold text-lg transition-all duration-200
          ${guardando || !horaSeleccionada || !nombre || !email || !telefono
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 active:scale-95'
          }
        `}
      >
        {guardando ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Agendando...
          </span>
        ) : (
          '✅ AGENDAR CITA'
        )}
      </button>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.8);
        }
      `}</style>
    </div>
  )
}
