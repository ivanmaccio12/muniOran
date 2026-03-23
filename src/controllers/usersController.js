import { getAllUsers, createUser as dbCreateUser, updateUser as dbUpdateUser, getUserById, deleteUserById, getActiveReclamosByAsignado, unassignReclamosFromUser } from '../services/db.js';
import { hashPassword } from '../services/authService.js';

export const listUsers = (req, res) => {
  res.json(getAllUsers());
};

export const postUser = (req, res) => {
  const { nombre, email, password, rol, equipo } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos' });
  }
  const validRoles = ['admin', 'gestor', 'equipo'];
  if (rol && !validRoles.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Usar: admin, gestor, equipo' });
  }
  // Gestor no puede crear admins
  if (req.user?.rol === 'gestor' && rol === 'admin') {
    return res.status(403).json({ error: 'No tenés permisos para crear usuarios con rol admin' });
  }
  try {
    const user = dbCreateUser({ nombre, email, password_hash: hashPassword(password), rol, equipo });
    res.status(201).json(user);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const patchUser = (req, res) => {
  const { id } = req.params;
  const user = getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Gestor no puede modificar admins
  if (req.user?.rol === 'gestor' && user.rol === 'admin') {
    return res.status(403).json({ error: 'No tenés permisos para modificar usuarios admin' });
  }

  const { nombre, email, password, rol, equipo, activo } = req.body;
  const fields = {};
  if (nombre !== undefined) fields.nombre = nombre;
  if (email !== undefined) fields.email = email;
  if (rol !== undefined) fields.rol = rol;
  if (equipo !== undefined) fields.equipo = equipo;
  if (activo !== undefined) fields.activo = activo ? 1 : 0;
  if (password) fields.password_hash = hashPassword(password);

  try {
    const updated = dbUpdateUser(id, fields);
    res.json(updated);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const deleteUser = (req, res) => {
  const { id } = req.params;
  const { force } = req.query; // ?force=true to unassign active reclamos and delete

  if (req.user?.id === id) {
    return res.status(400).json({ error: 'No podés eliminar tu propio usuario' });
  }
  const user = getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const activeReclamos = getActiveReclamosByAsignado(id);
  if (activeReclamos.length > 0 && force !== 'true') {
    return res.status(409).json({
      error: `Este usuario tiene ${activeReclamos.length} reclamo(s) activo(s) asignado(s). Los reclamos volverán al inicio como "Nuevo" sin asignar.`,
      activeReclamos: activeReclamos.map(r => r.id),
      requiresForce: true,
    });
  }

  if (activeReclamos.length > 0) {
    unassignReclamosFromUser(id);
  }
  deleteUserById(id);
  res.json({ ok: true, unassigned: activeReclamos.length });
};
