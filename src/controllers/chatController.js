import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '../config/systemPrompt.js';
import { getHistory, saveHistory } from '../services/conversationService.js';
import { createReclamo } from '../services/db.js';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const chatController = async (req, res) => {
    try {
        const { message, session_id, context, channel, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }
        if (!session_id) {
            return res.status(400).json({ error: 'El campo session_id es requerido (usar el número de teléfono del usuario).' });
        }

        // Build system prompt (inject optional context if provided by n8n/RAG)
        const systemPrompt = getSystemPrompt();
        const contextBlock = context
            ? `\n\nCONTEXTO adicional proporcionado por el sistema:\n"""\n${context}\n"""`
            : '';

        // Load conversation history from PostgreSQL (expires after 24h automatically)
        const history = await getHistory(session_id);

        // Build messages array: existing history + new user message
        const messages = [...history, { role: 'user', content: message }];

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: systemPrompt + contextBlock,
            messages: messages,
        });

        const replyText = response.content[0].text;

        // Parse JSON response from Claude
        let parsedReply;
        try {
            // Claude may occasionally wrap the JSON in a code block despite instructions
            const cleanText = replyText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            parsedReply = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('Claude did not return valid JSON. Raw response:', replyText);
            // Graceful fallback: wrap the raw text in the expected structure
            parsedReply = {
                answer: replyText,
                intent: 'otro',
                topic: 'desconocido',
                suggested_next_questions: [
                    '¿Cómo pago mis tasas municipales?',
                    '¿Cómo renuevo mi licencia de conducir?',
                    '¿Cómo habilito mi comercio?'
                ],
                handoff: {
                    needed: false,
                    reason: '',
                    recommended_area: ''
                }
            };
        }

        if (parsedReply.extracted_complaint_data && 
            parsedReply.extracted_complaint_data.nombre_apellido && 
            parsedReply.extracted_complaint_data.dni &&
            parsedReply.extracted_complaint_data.descripcion &&
            parsedReply.extracted_complaint_data.direccion) {
            
            try {
                const complaintData = {
                    ...parsedReply.extracted_complaint_data,
                    telefono: session_id // asumiendo que session_id es el teléfono de whatsapp
                };
                
                const savedComplaint = createReclamo(complaintData);
                console.log(`✅ Nuevo reclamo guardado en BD. ID: ${savedComplaint.id}`);
            } catch (dbError) {
                console.error('❌ Error al guardar el reclamo automáticamente:', dbError.message);
                // Opcional: Podríamos alterar parsedReply.answer para avisar que hubo un problema temporal.
            }
        }

        // Append the assistant reply text to the history and save back to DB
        const updatedHistory = [
            ...messages,
            { role: 'assistant', content: replyText }
        ];
        await saveHistory(session_id, updatedHistory);

        // Log metadata for debugging
        console.log(`[${new Date().toISOString()}] session=${session_id} channel=${channel || 'unknown'} intent=${parsedReply.intent} topic=${parsedReply.topic}`);

        res.json(parsedReply);
    } catch (error) {
        console.error('Error interacting with Claude:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
