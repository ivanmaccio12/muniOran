import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'munioran.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============= SCHEMA =============
db.exec(`
  CREATE TABLE IF NOT EXISTS reclamos (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    nombre_apellido TEXT NOT NULL,
    dni TEXT NOT NULL,
    telefono TEXT NOT NULL,
    motivo TEXT DEFAULT 'Sin categorizar',
    descripcion TEXT NOT NULL,
    direccion TEXT NOT NULL,
    barrio TEXT,
    coordenadas TEXT,
    estado TEXT DEFAULT 'nuevo',
    equipo TEXT,
    asignado_a TEXT,
    solicita_update INTEGER DEFAULT 0,
    fotos TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS comentarios (
    id TEXT PRIMARY KEY,
    reclamo_id TEXT NOT NULL,
    autor TEXT NOT NULL,
    rol TEXT NOT NULL,
    texto TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reclamo_id) REFERENCES reclamos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    session_id TEXT PRIMARY KEY,
    history TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ============= SEED DATA =============
const count = db.prepare('SELECT COUNT(*) as c FROM reclamos').get();
if (count.c === 0) {
  console.log('🌱 Seeding database with example reclamos...');

  const insertReclamo = db.prepare(`
    INSERT INTO reclamos (id, timestamp, nombre_apellido, dni, telefono, motivo, descripcion, direccion, barrio, coordenadas, estado, equipo, asignado_a, solicita_update, fotos)
    VALUES (@id, @timestamp, @nombre_apellido, @dni, @telefono, @motivo, @descripcion, @direccion, @barrio, @coordenadas, @estado, @equipo, @asignado_a, @solicita_update, @fotos)
  `);

  const insertComentario = db.prepare(`
    INSERT INTO comentarios (id, reclamo_id, autor, rol, texto, timestamp)
    VALUES (@id, @reclamo_id, @autor, @rol, @texto, @timestamp)
  `);

  const seed = db.transaction(() => {
    // Reclamo 1: Alumbrado - Nuevo
    insertReclamo.run({
      id: 'REC-2025-001',
      timestamp: '2025-06-18T08:48:00Z',
      nombre_apellido: 'María González',
      dni: '28456789',
      telefono: '+5493878123456',
      motivo: 'Problema de alumbrado',
      descripcion: 'Hace 5 días que no funciona la luminaria de la esquina de Belgrano y Mendoza. La calle queda totalmente a oscuras y es peligroso para los vecinos que vuelven de noche.',
      direccion: 'Belgrano esq. Mendoza',
      barrio: 'Centro',
      coordenadas: '-23.1303,-64.3254',
      estado: 'nuevo',
      equipo: null,
      asignado_a: null,
      solicita_update: 0,
      fotos: '[]',
    });

    // Reclamo 2: Bacheo - En revisión con comentarios
    insertReclamo.run({
      id: 'REC-2025-002',
      timestamp: '2025-06-22T09:15:00Z',
      nombre_apellido: 'Carlos Rodríguez',
      dni: '32198765',
      telefono: '+5493878654321',
      motivo: 'Bacheo / estado de calles',
      descripcion: 'Hay un bache enorme en la intersección de San Martín y Sarmiento que ya dañó varios autos. Mide aproximadamente 1 metro de diámetro. Es un peligro constante.',
      direccion: 'San Martín esq. Sarmiento',
      barrio: 'Centro',
      coordenadas: '-23.1310,-64.3230',
      estado: 'nuevo',
      equipo: 'Obras Públicas',
      asignado_a: null,
      solicita_update: 1,
      fotos: '["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400"]',
    });
    insertComentario.run({
      id: 'c1',
      reclamo_id: 'REC-2025-002',
      autor: 'Juan Pérez',
      rol: 'Obras Públicas',
      texto: 'Se relevó la zona. El bache es crítico, vamos a programar la reparación para la semana próxima.',
      timestamp: '2025-06-25T10:30:00Z',
    });

    // Reclamo 3: Residuos - Asignado
    insertReclamo.run({
      id: 'REC-2025-003',
      timestamp: '2025-07-01T11:30:00Z',
      nombre_apellido: 'Ana Flores',
      dni: '25789012',
      telefono: '+5493878112233',
      motivo: 'Recolección de residuos',
      descripcion: 'El camión de basura no pasa por nuestra cuadra hace una semana. La basura se está acumulando en la esquina y el olor es insoportable. Necesitamos que normalicen el servicio.',
      direccion: 'Rivadavia 1250',
      barrio: 'Villa Obrera',
      coordenadas: '-23.1350,-64.3150',
      estado: 'asignado',
      equipo: 'GIRSU (Residuos)',
      asignado_a: 'w3',
      solicita_update: 0,
      fotos: '[]',
    });
    insertComentario.run({
      id: 'c2',
      reclamo_id: 'REC-2025-003',
      autor: 'Martín López',
      rol: 'GIRSU (Residuos)',
      texto: 'Se habló con el encargado de la ruta. El camión tuvo una falla mecánica. Mañana se normaliza el servicio.',
      timestamp: '2025-07-02T09:00:00Z',
    });

    // Reclamo 4: Tránsito - Nuevo
    insertReclamo.run({
      id: 'REC-2025-004',
      timestamp: '2025-07-14T15:10:00Z',
      nombre_apellido: 'Diego Torres',
      dni: '35678901',
      telefono: '+5493878889900',
      motivo: 'Problema de tránsito',
      descripcion: 'El semáforo de San Martín y Mitre no funciona hace 3 días. Se produjeron dos accidentes menores. Necesitamos que lo reparen urgentemente.',
      direccion: 'San Martín y Mitre',
      barrio: 'Centro',
      coordenadas: '-23.1305,-64.3235',
      estado: 'nuevo',
      equipo: null,
      asignado_a: null,
      solicita_update: 0,
      fotos: '[]',
    });
  });

  seed();
  console.log('✅ Seeded 4 reclamos with comments.');
}

// ============= QUERIES =============

// Get all reclamos with comment count
export const getAllReclamos = () => {
  return db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM comentarios c WHERE c.reclamo_id = r.id) as comment_count
    FROM reclamos r
    ORDER BY r.timestamp DESC
  `).all().map(formatReclamo);
};

// Get single reclamo
export const getReclamoById = (id) => {
  const row = db.prepare('SELECT * FROM reclamos WHERE id = ?').get(id);
  if (!row) return null;
  const reclamo = formatReclamo(row);
  reclamo.comentarios = db.prepare(
    'SELECT * FROM comentarios WHERE reclamo_id = ? ORDER BY timestamp ASC'
  ).all(id);
  return reclamo;
};

// Update reclamo fields
export const updateReclamo = (id, fields) => {
  const allowed = ['estado', 'equipo', 'asignado_a', 'motivo', 'solicita_update'];
  const updates = [];
  const values = {};

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = key === 'solicita_update' ? (fields[key] ? 1 : 0) : fields[key];
    }
  }

  if (updates.length === 0) return null;
  values.id = id;

  db.prepare(`UPDATE reclamos SET ${updates.join(', ')} WHERE id = @id`).run(values);
  return getReclamoById(id);
};

// Add comment
export const addComentario = (reclamoId, autor, rol, texto) => {
  const id = `c-${Date.now()}`;
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO comentarios (id, reclamo_id, autor, rol, texto, timestamp)
    VALUES (@id, @reclamo_id, @autor, @rol, @texto, @timestamp)
  `).run({ id, reclamo_id: reclamoId, autor, rol, texto, timestamp });

  // Clear solicita_update when staff comments
  db.prepare('UPDATE reclamos SET solicita_update = 0 WHERE id = ?').run(reclamoId);

  return { id, reclamo_id: reclamoId, autor, rol, texto, timestamp };
};

// Get comments for a reclamo
export const getComentarios = (reclamoId) => {
  return db.prepare(
    'SELECT * FROM comentarios WHERE reclamo_id = ? ORDER BY timestamp ASC'
  ).all(reclamoId);
};

// Create a new reclamo (used by bot later)
export const createReclamo = (data) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM reclamos').get();
  const num = String(count.c + 1).padStart(3, '0');
  const id = `REC-${new Date().getFullYear()}-${num}`;

  db.prepare(`
    INSERT INTO reclamos (id, nombre_apellido, dni, telefono, motivo, descripcion, direccion, barrio, coordenadas, fotos)
    VALUES (@id, @nombre_apellido, @dni, @telefono, @motivo, @descripcion, @direccion, @barrio, @coordenadas, @fotos)
  `).run({
    id,
    nombre_apellido: data.nombre_apellido,
    dni: data.dni,
    telefono: data.telefono,
    motivo: data.motivo || 'Sin categorizar',
    descripcion: data.descripcion,
    direccion: data.direccion,
    barrio: data.barrio || null,
    coordenadas: data.coordenadas || null,
    fotos: JSON.stringify(data.fotos || []),
  });

  return getReclamoById(id);
};

// Helper: format row → object with parsed JSON
function formatReclamo(row) {
  return {
    ...row,
    fotos: JSON.parse(row.fotos || '[]'),
    solicita_update: !!row.solicita_update,
  };
}

// ============= RAG: VECTOR SEARCH =============

const pgPool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const searchKnowledge = async (queryText) => {
  if (!openai || !pgPool) return [];
  try {
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText,
      encoding_format: 'float',
    });
    const embedding = embedRes.data[0].embedding;

    const result = await pgPool.query(`
      SELECT title, url, content
      FROM knowledge_documents
      ORDER BY embedding <=> $1::vector
      LIMIT 4
    `, [JSON.stringify(embedding)]);

    return result.rows;
  } catch (e) {
    console.error('Vector Search Error:', e.message);
    return [];
  }
};

export default db;
