import { getAllReclamos, getReclamoById, updateReclamo, addComentario, getComentarios, createReclamo, getUserById, getCommentCountForReclamo } from '../services/db.js';
import { sendWhatsApp } from '../services/whatsappService.js';
import { sendAssignmentEmail } from '../services/emailService.js';

// GET /api/reclamos
export const listReclamos = (req, res) => {
  try {
    const reclamos = getAllReclamos();
    res.json(reclamos);
  } catch (err) {
    console.error('Error listing reclamos:', err);
    res.status(500).json({ error: 'Error al obtener reclamos' });
  }
};

// GET /api/reclamos/:id
export const getReclamo = (req, res) => {
  try {
    const reclamo = getReclamoById(req.params.id);
    if (!reclamo) return res.status(404).json({ error: 'Reclamo no encontrado' });
    res.json(reclamo);
  } catch (err) {
    console.error('Error getting reclamo:', err);
    res.status(500).json({ error: 'Error al obtener reclamo' });
  }
};

// PATCH /api/reclamos/:id
export const patchReclamo = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentario_resolucion, notificar, ...fields } = req.body;

    // Validación: pasar a resuelto requiere comentario
    if (fields.estado === 'resuelto') {
      const existingComments = getCommentCountForReclamo(id);
      if (!comentario_resolucion && existingComments === 0) {
        return res.status(400).json({ error: 'Se requiere un comentario de resolución para marcar como resuelto' });
      }
    }

    // Auto-guardar comentario de resolución antes de cambiar estado
    if (comentario_resolucion) {
      const autor = req.user?.nombre || 'Sistema';
      const rol = req.user?.equipo || req.user?.rol || 'Administración';
      addComentario(id, autor, rol, comentario_resolucion);
    }

    // Auto-asignar estado a 'asignado' si se asigna equipo + persona desde 'nuevo'
    const current = getReclamoById(id);
    if (!current) return res.status(404).json({ error: 'Reclamo no encontrado' });

    const willHaveEquipo = fields.equipo !== undefined ? fields.equipo : current.equipo;
    const willHaveAsignado = fields.asignado_a !== undefined ? fields.asignado_a : current.asignado_a;
    if (willHaveEquipo && willHaveAsignado && current.estado === 'nuevo' && !fields.estado) {
      fields.estado = 'asignado';
    }

    const updated = updateReclamo(id, fields);
    if (!updated) return res.status(404).json({ error: 'Reclamo no encontrado o sin cambios' });

    // Email al trabajador cuando se le asigna el reclamo
    const prevAsignado = current.asignado_a;
    const newAsignado = updated.asignado_a;
    if (newAsignado && newAsignado !== prevAsignado) {
      const worker = getUserById(newAsignado);
      if (worker) sendAssignmentEmail(worker, updated).catch(() => {});
    }

    // WhatsApp al vecino cuando se resuelve o descarta (con opción de no notificar en descarte)
    const debeNotificar = notificar !== false; // true por defecto
    if (fields.estado === 'resuelto' || (fields.estado === 'descartado' && debeNotificar)) {
      let mensaje;
      if (fields.estado === 'resuelto' && comentario_resolucion) {
        // Enviar exactamente el mensaje modificado por el usuario
        mensaje = comentario_resolucion;
      } else {
        const estadoLabel = 'DESCARTADO ❌';
        mensaje = `🏛️ *Municipalidad de Orán*\n\nHola *${updated.nombre_apellido}*, te informamos que tu reclamo ha sido *${estadoLabel}*.\n\nMotivo: ${updated.motivo}\nDescripción: ${updated.descripcion}\nDirección: ${updated.direccion}`;
      }
      sendWhatsApp(updated.telefono, mensaje);
      updateReclamo(id, { notificado: 1 });
    }

    res.json(getReclamoById(id));
  } catch (err) {
    console.error('Error updating reclamo:', err);
    res.status(500).json({ error: 'Error al actualizar reclamo' });
  }
};

// GET /api/reclamos/:id/comentarios
export const listComentarios = (req, res) => {
  try {
    const comentarios = getComentarios(req.params.id);
    res.json(comentarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};

// POST /api/reclamos/:id/comentarios
export const postComentario = (req, res) => {
  try {
    const { texto } = req.body;
    const autor = req.body.autor || req.user?.nombre || 'Sistema';
    const rol = req.body.rol || req.user?.equipo || req.user?.rol || 'Administración';
    if (!texto) return res.status(400).json({ error: 'Falta el campo: texto' });
    const comment = addComentario(req.params.id, autor, rol, texto);
    // Log WhatsApp notification
    const reclamo = getReclamoById(req.params.id);
    if (reclamo) {
      console.log(`📲 [WhatsApp] → ${reclamo.telefono}: Nuevo comentario en ${req.params.id} de ${autor}`);
    }
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

// POST /api/reclamos/:id/solicitar-update
export const solicitarUpdate = (req, res) => {
  try {
    const updated = updateReclamo(req.params.id, { solicita_update: true });
    if (!updated) return res.status(404).json({ error: 'Reclamo no encontrado' });
    console.log(`📲 [WhatsApp Staff] ❗ Vecino solicita actualización del reclamo ${req.params.id}`);
    res.json({ ok: true, message: 'Solicitud de actualización registrada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al solicitar update' });
  }
};

// POST /api/reclamos (create new, for bot integration)
export const postReclamo = (req, res) => {
  try {
    const { nombre_apellido, dni, telefono, descripcion, direccion } = req.body;
    if (!nombre_apellido || !dni || !telefono || !descripcion || !direccion) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const reclamo = createReclamo(req.body);
    console.log(`📲 [WhatsApp] → ${telefono}: Tu reclamo fue registrado con ID ${reclamo.id}`);
    res.status(201).json(reclamo);
  } catch (err) {
    console.error('Error creating reclamo:', err);
    res.status(500).json({ error: 'Error al crear reclamo' });
  }
};
