/**
 * scrapeOran.js — Scraper de oran.gob.ar para poblar knowledge_documents
 * Uso: node scripts/scrapeOran.js
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'munioran.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    scraped_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const PAGES = [
  { url: 'https://oran.gob.ar/transito/', title: 'Tránsito y Licencias de Conducir' },
  { url: 'https://oran.gob.ar/habilitaciones-comerciales/', title: 'Habilitaciones Comerciales' },
  { url: 'https://oran.gob.ar/discapacidad/', title: 'Secretaría de Discapacidad' },
  { url: 'https://oran.gob.ar/juventud/', title: 'Secretaría de Juventud' },
  { url: 'https://oran.gob.ar/deportes/', title: 'Secretaría de Deportes' },
  { url: 'https://oran.gob.ar/cultura/', title: 'Secretaría de Cultura' },
  { url: 'https://oran.gob.ar/obras-publicas/', title: 'Obras Públicas' },
  { url: 'https://oran.gob.ar/turismo/', title: 'Turismo en Orán' },
  { url: 'https://oran.gob.ar/defensa-del-consumidor/', title: 'Defensa del Consumidor' },
  { url: 'https://oran.gob.ar/veterinaria/', title: 'Centro Veterinario Municipal' },
  { url: 'https://oran.gob.ar/transporte-urbano/', title: 'Transporte Urbano' },
  { url: 'https://oran.gob.ar/hub-tecnologico/', title: 'Hub Tecnológico' },
  { url: 'https://oran.gob.ar/datos-abiertos/', title: 'Datos Abiertos y Transparencia' },
  { url: 'https://oran.gob.ar/ordenanzas/', title: 'Ordenanzas Municipales' },
  { url: 'https://oran.gob.ar/boletin-oficial/', title: 'Boletín Oficial Municipal' },
  { url: 'https://oran.gob.ar/participacion-ciudadana/', title: 'Participación Ciudadana' },
  { url: 'https://oran.gob.ar/cine-teatro-italiano/', title: 'Cine Teatro Italiano' },
  { url: 'https://oran.gob.ar/girsu/', title: 'GIRSU — Gestión de Residuos' },
  { url: 'https://oran.gob.ar/', title: 'Municipalidad de Orán — Inicio' },
];

const PDF_PAGES = [
  { url: 'https://oran.gob.ar/wp-content/uploads/2024/06/APERTURA-DE-NEGOCIO.pdf', title: 'Formulario: Apertura de Negocio' },
  { url: 'https://oran.gob.ar/wp-content/uploads/2024/06/CAMBIO-DE-RUBRO.pdf', title: 'Formulario: Cambio de Rubro' },
  { url: 'https://oran.gob.ar/wp-content/uploads/2024/06/TRASLADO-DE-NEGOCIO.pdf', title: 'Formulario: Traslado de Negocio' },
  { url: 'https://oran.gob.ar/wp-content/uploads/2024/06/ANEXAMIENTO-DE-NEGOCIO.pdf', title: 'Formulario: Anexamiento de Negocio' },
  { url: 'https://oran.gob.ar/wp-content/uploads/2024/06/CIERRE-DE-NEGOCIO.pdf', title: 'Formulario: Cierre de Negocio' },
];

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();

const upsert = db.prepare(`
  INSERT INTO knowledge_documents (title, url, content, scraped_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(url) DO UPDATE SET title=excluded.title, content=excluded.content, scraped_at=excluded.scraped_at
`);

const scrapeHtml = async ({ url, title }) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.warn(`  SKIP ${url} (${res.status})`); return; }
    const html = await res.text();
    const text = stripHtml(html).slice(0, 3000);
    upsert.run(title, url, text);
    console.log(`  OK  ${title}`);
  } catch (e) {
    console.warn(`  ERR ${url}: ${e.message}`);
  }
};

const scrapePdf = async ({ url, title }) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.warn(`  SKIP PDF ${url} (${res.status})`); return; }
    const buffer = Buffer.from(await res.arrayBuffer());
    const data = await pdfParse(buffer);
    const text = data.text.replace(/\s{2,}/g, ' ').trim().slice(0, 2000);
    upsert.run(title, url, text || `Formulario descargable: ${title}`);
    console.log(`  OK  ${title} (PDF)`);
  } catch (e) {
    // Fallback: store title + URL as minimal content
    const fallback = `Formulario descargable: ${title}. Disponible en: ${url}`;
    upsert.run(title, url, fallback);
    console.warn(`  PDF fallback para ${title}: ${e.message}`);
  }
};

console.log('Scrapeando oran.gob.ar...');
for (const page of PAGES) await scrapeHtml(page);
console.log('Scrapeando PDFs...');
for (const pdf of PDF_PAGES) await scrapePdf(pdf);

const count = db.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get();
console.log(`\nListo. ${count.c} documentos en knowledge_documents.`);
db.close();
