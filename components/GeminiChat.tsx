import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { supabaseService, Cita } from '../services/supabase';
import { calendarService } from '../services/calendar';
import { emailService } from '../services/email';

// Definición de las funciones que Gemini puede llamar
const AVAILABLE_FUNCTIONS = [
    {
        name: 'agendarCita',
        description: 'Agenda una cita para el cliente. Usa esta función cuando el usuario quiera agendar una cita, reservar, o programar una reunión.',
        parameters: {
            type: 'object',
            properties: {
                nombre: { type: 'string', description: 'Nombre completo del cliente' },
                email: { type: 'string', description: 'Email del cliente' },
                telefono: { type: 'string', description: 'Teléfono de contacto' },
                fecha: { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD' },
                hora: { type: 'string', description: 'Hora de la cita en formato HH:MM (24h)' },
                motivo: { type: 'string', description: 'Motivo o descripción de la cita' }
            },
            required: ['nombre', 'email', 'telefono', 'fecha', 'hora', 'motivo']
        }
    },
    {
        name: 'darInfo',
        description: 'Proporciona información sobre Charlitron cuando el usuario pregunte algo muy específico que requiera consultar la base de datos.',
        parameters: {
            type: 'object',
            properties: {
                tipo_info: {
                    type: 'string',
                    enum: ['servicios', 'horarios', 'precios', 'contacto', 'general'],
                    description: 'Tipo de información solicitada'
                },
                detalles: { type: 'string', description: 'Detalles adicionales sobre la consulta' }
            },
            required: ['tipo_info']
        }
    }
];

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

const GeminiChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Inicializar Gemini
        const initGemini = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `Eres un asistente inteligente que trabaja CON el avatar de HeyGen de Charlitron.

IMPORTANTE:
- El avatar de HeyGen YA tiene información sobre Charlitron en su knowledge base
- SOLO usa las funciones cuando sea NECESARIO ejecutar una ACCIÓN:
  * agendarCita(): SOLO cuando el usuario quiera AGENDAR una cita (guarda en base de datos)
  * darInfo(): SOLO para consultas muy específicas que requieran la base de datos
  
- Para preguntas NORMALES (qué hacen, servicios, horarios): NO uses funciones, deja que el avatar responda
- Sé breve y natural
- Habla en español`,
                        tools: AVAILABLE_FUNCTIONS as any,
                    },
                });
                console.log('✅ Gemini inicializado con Function Calling');
                
                // Mensaje de bienvenida
                setMessages([{
                    role: 'assistant',
                    text: '¡Hola! Soy el cerebro detrás de Elena. Monitoreo las conversaciones y puedo ejecutar acciones como agendar citas. ¿En qué puedo ayudarte?'
                }]);
            } catch (error) {
                console.error('Error al inicializar Gemini:', error);
            }
        };

        initGemini();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!userInput.trim() || !chatRef.current || isProcessing) return;

        const userMessage = userInput.trim();
        setUserInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsProcessing(true);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: userMessage });
            
            let fullResponse = '';
            let functionCalls: any[] = [];
            
            for await (const chunk of stream) {
                if (chunk.text) fullResponse += chunk.text;
                if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                    functionCalls = chunk.functionCalls;
                }
            }

            console.log('🤖 Respuesta:', fullResponse);
            console.log('🔧 Functions:', functionCalls);

            if (functionCalls.length > 0) {
                for (const call of functionCalls) {
                    const result = await executeFunctionCall(call);
                    
                    // Enviar resultado a Gemini para respuesta natural
                    const followUpStream = await chatRef.current.sendMessageStream({
                        message: `Resultado de ${call.name}: ${JSON.stringify(result)}`
                    });

                    let followUpResponse = '';
                    for await (const chunk of followUpStream) {
                        if (chunk.text) followUpResponse += chunk.text;
                    }

                    setMessages(prev => [...prev, { role: 'assistant', text: followUpResponse }]);
                }
            } else if (fullResponse) {
                setMessages(prev => [...prev, { role: 'assistant', text: fullResponse }]);
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const executeFunctionCall = async (call: any) => {
        console.log(`🔧 Ejecutando: ${call.name}`, call.args);

        if (call.name === 'agendarCita') {
            return await ejecutarAgendarCita(call.args);
        } else if (call.name === 'darInfo') {
            return await ejecutarDarInfo(call.args);
        }
        return { success: false, message: 'Función no reconocida' };
    };

    const ejecutarAgendarCita = async (args: any): Promise<any> => {
        const citaData: Cita = {
            nombre: args.nombre,
            email: args.email,
            telefono: args.telefono,
            fecha: args.fecha,
            hora: args.hora,
            motivo: args.motivo
        };

        console.log('📅 Agendando cita:', citaData);

        const dbResult = await supabaseService.guardarCita(citaData);
        const calendarResult = await calendarService.crearEvento(citaData);
        const emailResult = await emailService.enviarConfirmacionCita({
            to: citaData.email,
            subject: '✅ Cita confirmada - Charlitron',
            nombre: citaData.nombre,
            fecha: citaData.fecha,
            hora: citaData.hora,
            motivo: citaData.motivo
        });

        return {
            success: true,
            message: `Cita agendada para ${citaData.nombre} el ${citaData.fecha} a las ${citaData.hora}`,
            detalles: {
                base_datos: dbResult.message,
                calendario: calendarResult.message,
                email: emailResult.message
            }
        };
    };

    const ejecutarDarInfo = async (args: any): Promise<any> => {
        const { tipo_info, detalles } = args;

        const infoBase: any = {
            servicios: 'Desarrollo web, apps móviles, consultoría IA, automatización',
            horarios: 'Lunes a Viernes 9:00-18:00',
            precios: 'Cotización personalizada según proyecto',
            contacto: 'Email: contacto@charlitron.com, Tel: +52 55 1234 5678',
            general: 'Empresa de tecnología especializada en software y soluciones de IA'
        };

        const info = infoBase[tipo_info] || infoBase.general;

        await supabaseService.guardarConsulta({
            pregunta: detalles || tipo_info,
            respuesta: info
        });

        return {
            success: true,
            tipo: tipo_info,
            informacion: info
        };
    };

    return (
        <div id="gemini-chat-panel">
            <div id="gemini-chat-header">
                <span>🧠 Gemini Agent</span>
                <span style={{fontSize: '12px', opacity: 0.9}}>Powered by AI</span>
            </div>
            
            <div id="gemini-chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                {isProcessing && (
                    <div className="message assistant">
                        <em>Procesando...</em>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form id="gemini-chat-input-container" onSubmit={handleSendMessage}>
                <input
                    id="gemini-chat-input"
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={isProcessing}
                />
                <button 
                    id="gemini-send-btn" 
                    type="submit"
                    disabled={isProcessing}
                >
                    {isProcessing ? '⏳' : 'Enviar'}
                </button>
            </form>
        </div>
    );
};

export default GeminiChat;
