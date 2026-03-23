import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '../config/systemPrompt.js';
import { getHistory, saveHistory } from '../services/conversationService.js';
import { createReclamo, updateReclamo, searchKnowledge, getReclamoById, getExistingMotivos, getDistinctEquipos, getUserWithLeastLoadInEquipo, addFotoToReclamo, getActiveReclamoByTelefono } from '../services/db.js';
import { getLiveContext } from '../services/liveDataService.js';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Buffer en memoria: guarda fotos recibidas antes de que el reclamo se cree
// key: session_id (teléfono), value: string[]
const pendingMediaBySession = new Map();

import fs from 'fs';
import path from 'path';

export const chatController = async (req, res) => {
    try {
        const { session_id, channel, userId } = req.body;
        let { message, context, media_url } = req.body;

        // --- Manejo de imagen nativa (Base64) enviada desde n8n
        if (req.body.media_base64) {
            try {
                const ext = req.body.media_mime ? req.body.media_mime.split('/')[1] : 'jpg';
                const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const filepath = path.join(process.cwd(), 'data', 'uploads', filename);
                if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
                fs.writeFileSync(filepath, req.body.media_base64, 'base64');
                media_url = `http://31.97.31.53:3003/uploads/${filename}`;
            } catch (err) {
                console.error('Error guardando imagen base64:', err.message);
            }
        }

        // Si viene solo una foto sin texto, usamos un mensaje implícito para Claude
        if (!message && media_url) {
            message = '[El vecino envió una foto como parte de su reclamo]';
        }

        // Acumular media_url pendiente en el buffer de la sesión
        if (media_url) {
            const existing = pendingMediaBySession.get(session_id) || [];
            if (!existing.includes(media_url)) existing.push(media_url);
            pendingMediaBySession.set(session_id, existing);
        }

        if (!message) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }
        if (!session_id) {
            return res.status(400).json({ error: 'El campo session_id es requerido (usar el número de teléfono del usuario).' });
        }

        // Perform Retrieval-Augmented Generation (RAG)
        const relevantDocs = await searchKnowledge(message);
        if (relevantDocs && relevantDocs.length > 0) {
            const addedContext = relevantDocs.map(doc =>
                `📌 Título: ${doc.title}\n🔗 Fuente: ${doc.url}\n📄 Información: ${doc.content}`
            ).join('\n\n');
            context = (context ? context + '\n\n' : '') + addedContext;
        }

        // Live data from oran.gob.ar API (cached 1h, keyword-triggered)
        try {
            const liveDocs = await getLiveContext(message);
            if (liveDocs && liveDocs.length > 0) {
                const liveContext = liveDocs.map(doc =>
                    `📡 Dato en tiempo real — ${doc.title}\n🔗 Fuente: ${doc.url}\n📄 Contenido:\n${doc.content}`
                ).join('\n\n');
                context = (context ? context + '\n\n' : '') + liveContext;
            }
        } catch (e) {
            console.error('[chatController] Live data error:', e.message);
        }

        // Build system prompt (inject optional context if provided by n8n/RAG)
        const systemPrompt = getSystemPrompt();
        const contextBlock = context
            ? `\n\nCONTEXTO adicional proporcionado por el sistema:\n"""\n${context}\n"""`
            : '';

        // Load conversation history from PostgreSQL (expires after 24h automatically)
        const history = await getHistory(session_id);

        // Si viene media_url, incluirla en el mensaje para que Claude lo considere
        const effectiveMessage = media_url
            ? `${message}\n[Adjunto de imagen recibido: ${media_url}]`
            : message;

        // Build messages array: existing history + new user message
        const messages = [...history, { role: 'user', content: effectiveMessage }];

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
            // Find JSON block from first { to last }
            const jsonMatch = replyText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedReply = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON object found");
            }
        } catch (parseError) {
            console.error('Claude did not return valid JSON. Error:', parseError.message);
            // Graceful fallback
            parsedReply = {
                answer: replyText.replace(/```json[\s\S]*```/g, ''), // Strip code blocks just in case
                intent: 'otro',
                topic: 'desconocido',
                suggested_next_questions: [],
                handoff: { needed: false, reason: '', recommended_area: '' }
            };
        }

        if (parsedReply.extracted_complaint_data && 
            parsedReply.extracted_complaint_data.nombre_apellido && 
            parsedReply.extracted_complaint_data.dni &&
            parsedReply.extracted_complaint_data.descripcion &&
            parsedReply.extracted_complaint_data.direccion) {
            
            try {
                // Determine 'motivo' via secondary AI call
                let classifiedMotivo = parsedReply.extracted_complaint_data.motivo || 'Sin categorizar';
                try {
                    const existingMotivos = getExistingMotivos();
                    if (existingMotivos.length > 0) {
                        const catResponse = await anthropic.messages.create({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 50,
                            system: `Sos un categorizador objetivo. Clasificá el siguiente problema en UNO de los siguientes motivos existentes: ${existingMotivos.join(', ')}. Si el problema no encaja en ninguno de esos, inventá un motivo nuevo muy corto (max 3 palabras, primera letra mayúscula). Respondé ÚNICAMENTE con el nombre del motivo, sin punteos ni explicaciones.`,
                            messages: [{ role: 'user', content: `Descripción del problema: ${parsedReply.extracted_complaint_data.descripcion}` }]
                        });
                        classifiedMotivo = catResponse.content[0].text.trim();
                    }
                } catch(e) {
                    console.error('Error in AI motif classification:', e.message);
                }

                // Auto-assign equipo based on motivo + descripcion
                let autoEquipo = null;
                try {
                    const equipos = getDistinctEquipos();
                    if (equipos.length > 0) {
                        const eqResponse = await anthropic.messages.create({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 30,
                            system: `Sos un clasificador. Asigná el siguiente reclamo al área más adecuada de esta lista: ${equipos.join(', ')}. Si ninguna encaja claramente, respondé exactamente "ninguna". Respondé ÚNICAMENTE con el nombre del área tal como aparece en la lista, sin explicaciones.`,
                            messages: [{ role: 'user', content: `Motivo: ${classifiedMotivo}\nDescripción: ${parsedReply.extracted_complaint_data.descripcion}` }]
                        });
                        const suggested = eqResponse.content[0].text.trim();
                        if (equipos.includes(suggested)) autoEquipo = suggested;
                    }
                } catch(e) {
                    console.error('Error in equipo auto-assignment:', e.message);
                }

                const complaintData = {
                    ...parsedReply.extracted_complaint_data,
                    motivo: classifiedMotivo,
                    telefono: session_id // asumiendo que session_id es el teléfono de whatsapp
                };

                const savedComplaint = createReclamo(complaintData);
                console.log(`✅ Nuevo reclamo guardado en BD. ID: ${savedComplaint.id}`);

                if (autoEquipo) {
                    const suggestedUserId = getUserWithLeastLoadInEquipo(autoEquipo);
                    updateReclamo(savedComplaint.id, {
                        suggested_equipo: autoEquipo,
                        suggested_asignado: suggestedUserId || null,
                    });
                    console.log(`💡 Sugerencia para ${savedComplaint.id}: ${autoEquipo} → ${suggestedUserId}`);
                }

                // Si hay fotos pendientes en el buffer de esta sesión, adjuntarlas al reclamo
                const pendingFotos = pendingMediaBySession.get(session_id) || [];
                for (const fotoUrl of pendingFotos) {
                    addFotoToReclamo(savedComplaint.id, fotoUrl);
                }
                // También adjuntar media_url del mensaje actual si no estaba ya
                if (media_url && !pendingFotos.includes(media_url)) {
                    addFotoToReclamo(savedComplaint.id, media_url);
                }
                if (pendingFotos.length > 0 || media_url) {
                    console.log(`📷 ${pendingFotos.length} foto(s) adjuntadas al reclamo ${savedComplaint.id}`);
                    pendingMediaBySession.delete(session_id); // limpiar buffer
                }

                // Le aseguramos al usuario final cuál es su número de reclamo.
                parsedReply.answer += `\n\n✅ ¡Listo! Tu reclamo está registrado. El número de seguimiento es: *${savedComplaint.id}*.`;
            } catch (dbError) {
                console.error('❌ Error al guardar el reclamo automáticamente:', dbError.message);
                // Opcional: Podríamos alterar parsedReply.answer para avisar que hubo un problema temporal.
            }
        }

        // Si vino media_url pero NO se creó un reclamo nuevo, intentar adjuntarla al reclamo activo
        // SOLO si el usuario no está en medio de la creación de un nuevo reclamo (intent !== 'reclamo')
        if (media_url && !parsedReply.extracted_complaint_data?.nombre_apellido && parsedReply.intent !== 'reclamo') {
            try {
                const reclamoActivo = getActiveReclamoByTelefono(session_id);
                if (reclamoActivo) {
                    addFotoToReclamo(reclamoActivo.id, media_url);
                    pendingMediaBySession.delete(session_id); // ya adjuntada, limpiar
                    console.log(`📷 Foto adjuntada al reclamo activo ${reclamoActivo.id} del teléfono ${session_id}`);
                } else {
                    console.log(`📷 Foto de ${session_id} guardada en buffer, se adjuntará cuando se cree el reclamo.`);
                }
            } catch (e) {
                console.error('Error adjuntando foto a reclamo activo:', e.message);
            }
        }

        // Consulta de reclamo por ID (intent: consulta_reclamo)
        if (parsedReply.reclamo_id) {
            try {
                const reclamoId = String(parsedReply.reclamo_id).toUpperCase().trim();
                const reclamo = getReclamoById(reclamoId);
                if (reclamo) {
                    const estadoEmoji = { nuevo: '🟡', asignado: '🔵', resuelto: '✅', descartado: '❌' }[reclamo.estado] || '⚪';
                    const comentariosTexto = reclamo.comentarios && reclamo.comentarios.length > 0
                        ? reclamo.comentarios.map(c => `  • [${c.autor} — ${c.rol}] ${c.texto}`).join('\n')
                        : '  Sin comentarios aún.';
                    const detalle = [
                        ``,
                        `📋 *Reclamo ${reclamo.id}*`,
                        `• Motivo: ${reclamo.motivo}`,
                        `• Estado: ${estadoEmoji} ${reclamo.estado}`,
                        `• Dirección: ${reclamo.direccion}`,
                        `• Descripción: ${reclamo.descripcion}`,
                        reclamo.equipo ? `• Equipo asignado: ${reclamo.equipo}` : null,
                        ``,
                        `💬 Comentarios del equipo:`,
                        comentariosTexto,
                    ].filter(Boolean).join('\n');
                    parsedReply.answer += detalle;
                } else {
                    parsedReply.answer += `\n\nNo encontré ningún reclamo con el número *${reclamoId}*. Verificá el número e intentá de nuevo.`;
                }
            } catch (lookupError) {
                console.error('Error buscando reclamo por ID:', lookupError.message);
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
