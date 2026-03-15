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

// ============= RECLAMOS API =============
app.get('/api/reclamos', listReclamos);
app.post('/api/reclamos', postReclamo);
app.get('/api/reclamos/:id', getReclamo);
app.patch('/api/reclamos/:id', patchReclamo);
app.get('/api/reclamos/:id/comentarios', listComentarios);
app.post('/api/reclamos/:id/comentarios', postComentario);
app.post('/api/reclamos/:id/solicitar-update', solicitarUpdate);

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
