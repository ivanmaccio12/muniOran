/**
 * Servicio de envío de mensajes WhatsApp via n8n webhook.
 * Si N8N_WEBHOOK_URL no está configurado, loguea y retorna sin error.
 * Errores de red son swallowed para no bloquear la respuesta HTTP.
 */
export const sendWhatsApp = async (telefono, mensaje) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`📲 [WhatsApp MOCK] → ${telefono}:\n${mensaje}`);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: telefono, message: mensaje }),
    });
    if (!res.ok) {
      console.error(`❌ [WhatsApp] Error HTTP ${res.status} al notificar a ${telefono}`);
    }
  } catch (err) {
    console.error(`❌ [WhatsApp] Fallo al enviar a ${telefono}:`, err.message);
  }
};
