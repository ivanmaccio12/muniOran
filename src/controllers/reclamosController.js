import { getAllReclamos, getReclamoById, updateReclamo, addComentario, getComentarios, createReclamo } from '../services/db.js';

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
export const patchReclamo = (req, res) => {
  try {
    const updated = updateReclamo(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Reclamo no encontrado o sin cambios' });
    // Log WhatsApp notification simulation
    console.log(`📲 [WhatsApp] → ${updated.telefono}: Tu reclamo ${updated.id} fue actualizado`);
    res.json(updated);
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
    const { autor, rol, texto } = req.body;
    if (!autor || !texto) return res.status(400).json({ error: 'Faltan campos: autor, texto' });
    const comment = addComentario(req.params.id, autor, rol || 'Administración', texto);
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
