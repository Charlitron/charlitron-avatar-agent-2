import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function CancelarCita() {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cancelarCitas = async () => {
    if (!email) {
      alert('Por favor ingresa tu email')
      return
    }

    setCargando(true)
    setMensaje('')

    try {
      const { data, error } = await supabase.functions.invoke('cancelar-cita', {
        body: { email }
      })

      if (error) throw error

      if (data && data.success) {
        setMensaje(`✅ ${data.mensaje}`)
        setEmail('')
      } else {
        setMensaje(`❌ ${data.mensaje || 'No se encontraron citas'}`)
      }
    } catch (err: any) {
      console.error('❌ Error:', err)
      setMensaje(`❌ Error: ${err.message || 'Error desconocido'}`)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-2xl shadow-2xl p-8 border border-red-500/30 backdrop-blur-sm">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2">
          ❌ Cancelar Cita
        </h2>
        <p className="text-slate-400 text-sm">
          Ingresa tu email para cancelar tus citas activas
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-red-300 text-sm font-semibold mb-2">
            📧 Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 transition-all"
          />
        </div>

        <button
          onClick={cancelarCitas}
          disabled={cargando || !email}
          className={`
            w-full py-3 rounded-lg font-bold text-lg transition-all duration-200
            ${cargando || !email
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 active:scale-95'
            }
          `}
        >
          {cargando ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Cancelando...
            </span>
          ) : (
            '🗑️ CANCELAR MIS CITAS'
          )}
        </button>

        {mensaje && (
          <div className={`p-4 rounded-lg text-center font-medium ${
            mensaje.includes('✅') 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {mensaje}
          </div>
        )}
      </div>
    </div>
  )
}
