import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'muni-oran-dev-secret-changeme';
const JWT_EXPIRES_IN = '7d';

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};
