

import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { supabaseService, Cita } from '../services/supabase';
import { calendarService } from '../services/calendar';
import { emailService } from '../services/email';

// Token de HeyGen
const HEYGEN_API_TOKEN = "N2U3YzdmMTQyNmQzNGQ1Y2I3ZjFmY2IwOTc3ZmJiZjAtMTc0MjQ5NzY0OA=="; 
const AVATAR_ID = "Elenora_IT_Sitting_public";

// Definición de las funciones que Gemini puede llamar
const AVAILABLE_FUNCTIONS = [
    {
        name: 'agendarCita',
        description: 'Agenda una cita para el cliente. Usa esta función cuando el usuario quiera agendar una cita, reservar, o programar una reunión.',
        parameters: {
            type: 'object',
            properties: {
                nombre: {
                    type: 'string',
                    description: 'Nombre completo del cliente'
                },
                email: {
                    type: 'string',
                    description: 'Email del cliente'
                },
                telefono: {
                    type: 'string',
                    description: 'Teléfono de contacto'
                },
                fecha: {
                    type: 'string',
                    description: 'Fecha de la cita en formato YYYY-MM-DD'
                },
                hora: {
                    type: 'string',
                    description: 'Hora de la cita en formato HH:MM (24h)'
                },
                motivo: {
                    type: 'string',
                    description: 'Motivo o descripción de la cita'
                }
            },
            required: ['nombre', 'email', 'telefono', 'fecha', 'hora', 'motivo']
        }
    },
    {
        name: 'darInfo',
        description: 'Proporciona información sobre Charlitron, servicios, horarios, etc. Usa esta función cuando el usuario pregunte sobre la empresa, precios, servicios disponibles, horarios de atención, etc.',
        parameters: {
            type: 'object',
            properties: {
                tipo_info: {
                    type: 'string',
                    enum: ['servicios', 'horarios', 'precios', 'contacto', 'general'],
                    description: 'Tipo de información solicitada'
                },
                detalles: {
                    type: 'string',
                    description: 'Detalles adicionales sobre la consulta'
                }
            },
            required: ['tipo_info']
        }
    }
];

const Avatar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Iniciando...");
    const [isListening, setIsListening] = useState(false);
    const [userInput, setUserInput] = useState("");
    
    const avatarRef = useRef<any>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const chatRef = useRef<Chat | null>(null);
    const recognitionRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Configurar reconocimiento de voz
    const setupSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('⚠️ Reconocimiento de voz no disponible en este navegador');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setStatusMessage('🎤 Escuchando...');
            console.log('🎤 Escuchando...');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log('👤 Usuario dijo:', transcript);
            setIsListening(false);
            
            // Enviar el mensaje a Gemini
            handleAvatarMessage({ type: 'text', text: transcript });
        };

        recognition.onerror = (event: any) => {
            console.error('Error en reconocimiento de voz:', event.error);
            setIsListening(false);
            setStatusMessage('Te escucho...');
        };

        recognition.onend = () => {
            setIsListening(false);
            if (isExpanded) {
                setStatusMessage('Te escucho...');
            }
        };

        recognitionRef.current = recognition;
    };

    // Iniciar escucha de voz
    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error al iniciar reconocimiento:', error);
            }
        }
    };

    useEffect(() => {
        const startSession = async () => {
            // Verificar que StreamingAvatar esté disponible
            if (typeof (window as any).StreamingAvatar === 'undefined') {
                console.error('❌ StreamingAvatar SDK no disponible');
                setStatusMessage("Error: SDK de Avatar no cargado");
                return;
            }

            const StreamingAvatar = (window as any).StreamingAvatar;

            // 1. Validar el token de HeyGen primero.
            if (!HEYGEN_API_TOKEN) {
                setStatusMessage("Falta el Token de HeyGen!");
                console.error("HEYGEN_API_TOKEN no está configurado");
                return;
            }

            // 2. Inicializar el cliente de Gemini AI con Function Calling.
            try {
                setStatusMessage("Conectando con IA...");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `Eres Elena, asistente virtual de Charlitron. 
                        
Tu rol es ayudar a los clientes de manera amigable y profesional.

INSTRUCCIONES IMPORTANTES:
- Cuando un cliente quiera agendar una cita, pregunta por: nombre, email, teléfono, fecha preferida, hora y motivo.
- Una vez tengas TODA la información, usa la función "agendarCita".
- Si preguntan por servicios, horarios o información general, usa "darInfo".
- Sé conversacional, cálida y eficiente.
- Habla en español de forma natural.
- Mantén respuestas concisas (2-3 oraciones máximo).

INFORMACIÓN DE CHARLITRON:
- Servicios: Desarrollo web, apps móviles, consultoría IA, automatización
- Horario: Lunes a Viernes 9:00-18:00
- Ubicación: Ciudad de México
- Email: contacto@charlitron.com
- Teléfono: +52 55 1234 5678`,
                        tools: AVAILABLE_FUNCTIONS as any,
                    },
                });
                console.log('✅ Gemini inicializado con Function Calling');
            } catch (error) {
                console.error("Error al inicializar Gemini:", error);
                setStatusMessage("Error al conectar con IA.");
                return;
            }

            // 3. Inicializar el Avatar de HeyGen.
            try {
                setStatusMessage("Solicitando permisos...");
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                setStatusMessage("Conectando con el avatar...");
                
                // Obtener la clase StreamingAvatar del objeto window
                const StreamingAvatar = (window as any).StreamingAvatar;
                
                const avatar = new StreamingAvatar({
                    token: HEYGEN_API_TOKEN,
                    avatarId: AVATAR_ID,
                });
                avatarRef.current = avatar;

                avatar.on('session.message', handleAvatarMessage);
                avatar.on('session.start', () => {
                    setStatusMessage('¡Haz clic y habla conmigo!');
                    setIsInitialized(true);
                    
                    // Inicializar reconocimiento de voz
                    setupSpeechRecognition();
                });
                avatar.on('session.close', () => {
                    setStatusMessage('Sesión terminada. Haz clic para reiniciar.');
                    setIsInitialized(false);
                });
                avatar.on('session.error', (error) => {
                    console.error('Error en la sesión del avatar:', error);
                    setStatusMessage(`Error. Refresca la página.`);
                });
                avatar.on('media.stream', (stream: MediaStream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                });
                
                // FIX: Corrected method 'startSession' to 'start'. 'startSession' expects 0 arguments, but the media stream needs to be passed.
                await avatar.start({ mediaStream: mediaStreamRef.current });
            } catch (err: any) {
                console.error('Fallo al inicializar el avatar:', err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setStatusMessage('Permiso de micrófono denegado.');
                } else {
                    setStatusMessage('Error al iniciar el avatar.');
                }
            }
        };

        startSession();

        return () => {
            // FIX: Corrected method 'stopSession' to 'stop' as 'stopSession' does not exist on type 'StreamingAvatar'.
            avatarRef.current?.stop();
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleAvatarMessage = async (message: { type: string, text: string }) => {
        if (message.type === 'text' && message.text.trim() && chatRef.current) {
            setStatusMessage("Pensando...");
            console.log('👤 Usuario:', message.text);
            
            try {
                const stream = await chatRef.current.sendMessageStream({ message: message.text });
                
                let fullResponse = '';
                let functionCalls: any[] = [];
                
                // Procesar el stream de respuesta
                for await (const chunk of stream) {
                    // Si hay texto, acumularlo
                    if (chunk.text) {
                        fullResponse += chunk.text;
                    }
                    
                    // Si hay function calls, guardarlos
                    if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                        functionCalls = chunk.functionCalls;
                    }
                }

                console.log('🤖 Respuesta completa:', fullResponse);
                console.log('🔧 Function calls:', functionCalls);

                // Si hay function calls, ejecutarlos
                if (functionCalls.length > 0) {
                    await processFunctionCalls(functionCalls);
                } else if (fullResponse) {
                    // Si solo hay texto, hacer que el avatar hable
                    setStatusMessage("Elena está hablando...");
                    await avatarRef.current?.speak({ text: fullResponse });
                    setStatusMessage('Te escucho...');
                }

            } catch (error) {
                console.error("Error con la API de Gemini:", error);
                setStatusMessage("Lo siento, ocurrió un error.");
                await avatarRef.current?.speak({ text: "Estoy teniendo un pequeño problema ahora mismo. ¿Puedes repetir?" });
                setStatusMessage('Te escucho...');
            }
        }
    };

    /**
     * Procesa los Function Calls de Gemini y ejecuta las acciones correspondientes
     */
    const processFunctionCalls = async (functionCalls: any[]) => {
        for (const call of functionCalls) {
            const functionName = call.name;
            const args = call.args;

            console.log(`🔧 Ejecutando función: ${functionName}`, args);
            setStatusMessage(`Ejecutando: ${functionName}...`);

            let result: any;

            try {
                if (functionName === 'agendarCita') {
                    result = await ejecutarAgendarCita(args);
                } else if (functionName === 'darInfo') {
                    result = await ejecutarDarInfo(args);
                } else {
                    result = { success: false, message: 'Función no reconocida' };
                }

                console.log(`✅ Resultado de ${functionName}:`, result);

                // Enviar el resultado de vuelta a Gemini para que genere una respuesta natural
                const followUpStream = await chatRef.current!.sendMessageStream({
                    message: `Resultado de la función ${functionName}: ${JSON.stringify(result)}`
                });

                let responseText = '';
                for await (const chunk of followUpStream) {
                    if (chunk.text) {
                        responseText += chunk.text;
                    }
                }

                // Hacer que el avatar hable la respuesta
                if (responseText) {
                    setStatusMessage("Elena está hablando...");
                    await avatarRef.current?.speak({ text: responseText });
                }

            } catch (error: any) {
                console.error(`Error ejecutando ${functionName}:`, error);
                await avatarRef.current?.speak({ 
                    text: `Lo siento, tuve un problema al ${functionName === 'agendarCita' ? 'agendar la cita' : 'obtener la información'}.` 
                });
            }
        }
        
        setStatusMessage('Te escucho...');
    };

    /**
     * Ejecuta la función de agendar cita
     */
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

        // 1. Guardar en Supabase
        const dbResult = await supabaseService.guardarCita(citaData);
        
        // 2. Crear evento en Google Calendar (mock por ahora)
        const calendarResult = await calendarService.crearEvento({
            nombre: citaData.nombre,
            email: citaData.email,
            fecha: citaData.fecha,
            hora: citaData.hora,
            motivo: citaData.motivo
        });

        // 3. Enviar email de confirmación (mock por ahora)
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

    /**
     * Ejecuta la función de dar información
     */
    const ejecutarDarInfo = async (args: any): Promise<any> => {
        const { tipo_info, detalles } = args;

        console.log(`ℹ️ Solicitando info de tipo: ${tipo_info}`, detalles);

        // Base de conocimiento
        const infoBase: any = {
            servicios: {
                titulo: 'Nuestros Servicios',
                contenido: `Ofrecemos:
- 🌐 Desarrollo Web (React, Next.js, TypeScript)
- 📱 Apps Móviles (iOS/Android)
- 🤖 Soluciones de IA y Machine Learning
- ⚡ Automatización de procesos
- 💼 Consultoría tecnológica`
            },
            horarios: {
                titulo: 'Horarios de Atención',
                contenido: 'Lunes a Viernes de 9:00 a 18:00 hrs. Sábados de 10:00 a 14:00 hrs.'
            },
            precios: {
                titulo: 'Información de Precios',
                contenido: 'Nuestros precios varían según el proyecto. Agenda una consulta gratuita para recibir una cotización personalizada.'
            },
            contacto: {
                titulo: 'Contacto',
                contenido: `📧 Email: contacto@charlitron.com
📱 Teléfono: +52 55 1234 5678
📍 Ubicación: Ciudad de México
🌐 Web: www.charlitron.com`
            },
            general: {
                titulo: 'Sobre Charlitron',
                contenido: 'Somos una empresa de tecnología especializada en desarrollo de software y soluciones de IA. Ayudamos a empresas a transformarse digitalmente.'
            }
        };

        const info = infoBase[tipo_info] || infoBase.general;

        // Guardar la consulta en Supabase (opcional)
        await supabaseService.guardarConsulta({
            pregunta: detalles || tipo_info,
            respuesta: info.contenido
        });

        return {
            success: true,
            tipo: tipo_info,
            informacion: info.contenido
        };
    };

    const handleContainerClick = () => {
        if (!isExpanded) {
            // Expandir
            setIsExpanded(true);
            // Iniciar escucha automáticamente
            setTimeout(() => startListening(), 500);
        } else {
            // Si está expandido y no está escuchando, iniciar escucha
            if (!isListening) {
                startListening();
            }
        }
        
        // Reiniciar sesión si está cerrada
        if (avatarRef.current?.state === 'closed' && mediaStreamRef.current) {
             avatarRef.current.start({ mediaStream: mediaStreamRef.current });
        }
    };
    
    // Enviar mensaje por texto
    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (userInput.trim() && chatRef.current) {
            const message = userInput.trim();
            setUserInput("");
            handleAvatarMessage({ type: 'text', text: message });
        }
    };

    const containerClasses = [
        'show',
        isInitialized ? 'initialized' : '',
        isExpanded ? 'expand' : '',
        isListening ? 'listening' : ''
    ].join(' ');

    return (
        <div id="avatar-container" className={containerClasses} onClick={(e) => {
            // Solo expandir si se hace clic en el contenedor, no en el input
            if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'avatar-video' || (e.target as HTMLElement).id === 'avatar-overlay') {
                handleContainerClick();
            }
        }}>
            <div id="avatar-overlay">
                <span>{statusMessage}</span>
                {isListening && <div style={{marginTop: '10px', fontSize: '2em'}}>🎤</div>}
            </div>
            <video ref={videoRef} autoPlay playsInline muted id="avatar-video" />
            
            {isExpanded && isInitialized && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 10,
                    pointerEvents: 'auto'
                }} onClick={(e) => e.stopPropagation()}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escribe tu mensaje o haz clic en 🎤..."
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '2px solid #667eea',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        style={{
                            padding: '12px 20px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Enviar
                    </button>
                    {recognitionRef.current && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                startListening();
                            }}
                            disabled={isListening}
                            style={{
                                padding: '12px 20px',
                                background: isListening ? '#ccc' : '#764ba2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isListening ? 'not-allowed' : 'pointer',
                                fontSize: '18px'
                            }}
                        >
                            {isListening ? '⏸️' : '🎤'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Avatar;
