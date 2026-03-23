import { getUserByEmail } from '../services/db.js';
import { verifyPassword, signToken } from '../services/authService.js';

export const postLogin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, equipo: user.equipo };
  const token = signToken(payload);

  return res.json({ token, user: payload });
};

export const getMe = (req, res) => {
  res.json(req.user);
};
