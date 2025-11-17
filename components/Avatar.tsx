

import React, { useEffect, useRef, useState } from 'react';
import StreamingAvatar from '@heygen/streaming-avatar';
import { GoogleGenAI, Chat } from '@google/genai';

// --- ¡ACCIÓN REQUERIDA! ---
// Reemplaza el siguiente texto con tu API Token real de HeyGen.
const HEYGEN_API_TOKEN = "PASTE_YOUR_HEYGEN_API_TOKEN_HERE"; 
const AVATAR_ID = "Elenora_IT_Sitting_public";

const Avatar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Iniciando...");
    
    const avatarRef = useRef<StreamingAvatar | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const chatRef = useRef<Chat | null>(null);

    useEffect(() => {
        const startSession = async () => {
            // 1. Validar el token de HeyGen primero.
            if (!HEYGEN_API_TOKEN || HEYGEN_API_TOKEN === "PASTE_YOUR_HEYGEN_API_TOKEN_HERE") {
                setStatusMessage("Falta el Token de HeyGen!");
                console.error("HEYGEN_API_TOKEN no está configurado en components/Avatar.tsx");
                return;
            }

            // 2. Inicializar el cliente de Gemini AI.
            try {
                setStatusMessage("Conectando con IA...");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: 'You are Elena, a friendly and helpful AI assistant for Charlitron. Your goal is to answer questions about the company and help users. Keep your answers concise and conversational.',
                    },
                });
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
                const avatar = new StreamingAvatar({
                    token: HEYGEN_API_TOKEN,
                    // FIX: Corrected property 'avatar_id' to 'avatarId' as 'avatar_id' does not exist in type 'StreamingAvatarApiConfig'.
                    avatarId: AVATAR_ID,
                });
                avatarRef.current = avatar;

                avatar.on('session.message', handleAvatarMessage);
                avatar.on('session.start', () => {
                    setStatusMessage('¡Haz clic y habla conmigo!');
                    setIsInitialized(true);
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
            try {
                const stream = await chatRef.current.sendMessageStream({ message: message.text });
                
                let firstChunk = true;
                for await (const chunk of stream) {
                    const chunkText = chunk.text;
                    if (chunkText) {
                        if (firstChunk) {
                            setStatusMessage("Elena está hablando...");
                            firstChunk = false;
                        }
                        await avatarRef.current?.speak({ text: chunkText });
                    }
                }
                setStatusMessage('Te escucho...');
            } catch (error) {
                console.error("Error con la API de Gemini:", error);
                setStatusMessage("Lo siento, ocurrió un error.");
                await avatarRef.current?.speak({ text: "Estoy teniendo un pequeño problema ahora mismo." });
            }
        }
    };

    const handleContainerClick = () => {
        setIsExpanded(!isExpanded);
        // FIX: Corrected property 'sessionState' to 'state' as 'sessionState' does not exist on type 'StreamingAvatar'.
        if (avatarRef.current?.state === 'closed' && mediaStreamRef.current) {
             // FIX: Corrected method 'startSession' to 'start' to restart the session with the media stream.
             avatarRef.current.start({ mediaStream: mediaStreamRef.current });
        }
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

export default Avatar;
