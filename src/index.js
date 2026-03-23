import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatController } from './controllers/chatController.js';
import {
  listReclamos, getReclamo, patchReclamo,
  listComentarios, postComentario, solicitarUpdate, postReclamo,
} from './controllers/reclamosController.js';
import { postLogin, getMe } from './controllers/authController.js';
import { listUsers, postUser, patchUser } from './controllers/usersController.js';
import { requireAuth, requireRole } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'MuniOran API', version: '2.0.0' });
});

// Chatbot endpoint (existing)
app.post('/chat', chatController);

// ============= AUTH API =============
app.post('/api/auth/login', postLogin);
app.get('/api/auth/me', requireAuth, getMe);

// ============= USERS API (admin only) =============
app.get('/api/users', requireAuth, requireRole('admin', 'gestor'), listUsers);
app.post('/api/users', requireAuth, requireRole('admin'), postUser);
app.patch('/api/users/:id', requireAuth, requireRole('admin'), patchUser);

// ============= RECLAMOS API =============
app.get('/api/reclamos', requireAuth, listReclamos);
app.post('/api/reclamos', requireAuth, postReclamo);
app.get('/api/reclamos/:id', requireAuth, getReclamo);
app.patch('/api/reclamos/:id', requireAuth, patchReclamo);
app.get('/api/reclamos/:id/comentarios', requireAuth, listComentarios);
app.post('/api/reclamos/:id/comentarios', requireAuth, postComentario);
app.post('/api/reclamos/:id/solicitar-update', requireAuth, solicitarUpdate);

// ============= FRONTEND KANBAN =============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');

app.use('/kanban', express.static(publicPath));
// Fallback para React Router
app.get('/kanban/*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏛️  MuniOran API v2.0.0 running on port ${PORT}`);
    console.log(`   📋 Reclamos API: http://localhost:${PORT}/api/reclamos`);
    console.log(`   🖥️  Kanban Dashboard: http://localhost:${PORT}/kanban/`);
});

process.on('SIGTERM', () => {
    process.exit(0);
});
