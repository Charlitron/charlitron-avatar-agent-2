import React, { useState, useEffect } from 'react';

interface IntegrationStatus {
  name: string;
  configured: boolean;
  status: 'active' | 'mock' | 'missing';
  icon: string;
}

/**
 * Componente de Debug para mostrar el estado de las integraciones
 * Útil durante el desarrollo para verificar qué APIs están configuradas
 */
const IntegrationStatus: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  useEffect(() => {
    // Verificar estado de cada integración
    const status: IntegrationStatus[] = [
      {
        name: 'Gemini AI',
        configured: !!(process.env.API_KEY),
        status: process.env.API_KEY ? 'active' : 'missing',
        icon: '🤖'
      },
      {
        name: 'HeyGen Avatar',
        configured: !!(process.env.HEYGEN_API_TOKEN),
        status: process.env.HEYGEN_API_TOKEN ? 'active' : 'missing',
        icon: '👤'
      },
      {
        name: 'Supabase',
        configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        status: (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) ? 'active' : 'missing',
        icon: '💾'
      },
      {
        name: 'Google Calendar',
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        status: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? 'active' : 'mock',
        icon: '📅'
      },
      {
        name: 'SendGrid',
        configured: !!(process.env.SENDGRID_API_KEY),
        status: process.env.SENDGRID_API_KEY ? 'active' : 'mock',
        icon: '📧'
      }
    ];

    setIntegrations(status);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'mock': return 'text-yellow-400';
      case 'missing': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'mock': return 'Mock';
      case 'missing': return 'Falta';
      default: return 'Desconocido';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-all z-50 text-sm font-medium"
        title="Ver estado de integraciones"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-slate-800 text-white rounded-lg shadow-2xl z-50 w-80 border border-slate-700">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="font-bold text-lg">🔧 Estado de Integraciones</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-3">
        {integrations.map((integration, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <div className="font-medium text-sm">{integration.name}</div>
                <div className={`text-xs ${getStatusColor(integration.status)}`}>
                  {getStatusText(integration.status)}
                  {integration.status === 'mock' && ' (Simulado)'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              {integration.configured ? (
                <span className="text-green-400 text-xl">✓</span>
              ) : (
                <span className="text-red-400 text-xl">✗</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-700 text-xs text-gray-400">
        <p>
          <span className="text-green-400">●</span> Activo: API configurada y lista
        </p>
        <p>
          <span className="text-yellow-400">●</span> Mock: Funcionando en modo simulación
        </p>
        <p>
          <span className="text-red-400">●</span> Falta: Requiere configuración
        </p>
      </div>

      <div className="p-3 bg-slate-900 rounded-b-lg text-center">
        <a
          href="/SETUP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm underline"
        >
          📚 Ver guía de configuración
        </a>
      </div>
    </div>
  );
};

export default IntegrationStatus;
