import { upsertKnowledgeDoc, getKnowledgeDocByUrl } from './db.js';

const BASE_URL = 'https://oran.gob.ar/wp-json/api/v1';
const TTL_MS = 60 * 60 * 1000; // 1 hora de caché

const TOPIC_MAP = [
  {
    keywords: ['residuo', 'basura', 'recolección', 'recoleccion', 'girsu', 'zona a', 'zona b', 'zona c', 'camión de basura', 'camion de basura', 'horario de residuos', 'recicl', 'contenedor'],
    endpoint: `${BASE_URL}/noticias`,
    title: 'Noticias municipales - Orán',
  },
  {
    keywords: ['obra', 'obras', 'infraestructura', 'pavimento', 'construcción', 'construccion', 'asfalto', 'bacheo'],
    endpoint: `${BASE_URL}/obras`,
    title: 'Obras municipales - Orán',
  },
  {
    keywords: ['restaurant', 'restaurante', 'gastronomia', 'gastronomía', 'comer', 'comida', 'parrilla', 'donde comer'],
    endpoint: `${BASE_URL}/gastronomia`,
    title: 'Gastronomía - Orán',
  },
  {
    keywords: ['hotel', 'hospedaje', 'alojamiento', 'dormir', 'hostal', 'posada', 'donde dormir', 'donde alojar'],
    endpoint: `${BASE_URL}/hospedaje`,
    title: 'Hospedaje - Orán',
  },
  {
    keywords: ['ordenanza', 'normativa', 'decreto', 'reglamento', 'legislación', 'legislacion'],
    endpoint: `${BASE_URL}/ordenanzas`,
    title: 'Ordenanzas municipales - Orán',
  },
  {
    keywords: ['boletin', 'boletín', 'boletín oficial', 'publicación oficial'],
    endpoint: `${BASE_URL}/boletin-oficial`,
    title: 'Boletín Oficial - Orán',
  },
  {
    keywords: ['licitación', 'licitacion', 'contratación', 'contratacion', 'compras', 'proveedor', 'concurso de precios'],
    endpoint: `${BASE_URL}/documentos`,
    title: 'Documentos y licitaciones - Orán',
  },
  {
    keywords: ['datos abiertos', 'estadísticas', 'estadisticas', 'dataset', 'datos del municipio'],
    endpoint: `${BASE_URL}/datos-abiertos`,
    title: 'Datos abiertos - Orán',
  },
];

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const isFresh = (doc) => {
  if (!doc || !doc.scraped_at) return false;
  const age = Date.now() - new Date(doc.scraped_at).getTime();
  return age < TTL_MS;
};

const formatItems = (items, endpoint) => {
  if (!Array.isArray(items) || items.length === 0) return 'Sin datos disponibles.';
  return items.slice(0, 5).map(item => {
    const title = item.title || item.nombre || '';
    const raw = item.content || item.descripcion || item.excerpt || '';
    const content = stripHtml(raw).slice(0, 200);
    const date = item.date || item.fecha || '';
    const url = item.permalink || item.link || endpoint;
    const parts = [];
    if (date) parts.push(`[${date}]`);
    if (title) parts.push(title);
    if (content) parts.push(content);
    if (url && url !== endpoint) parts.push(`(${url})`);
    return parts.join(' — ');
  }).join('\n\n');
};

/**
 * Detects relevant API topics from the user message and returns live/cached content.
 * @param {string} userMessage
 * @returns {Promise<Array<{title, url, content}> | null>}
 */
export const getLiveContext = async (userMessage) => {
  const msgLower = userMessage.toLowerCase();

  const matched = TOPIC_MAP.filter(({ keywords }) =>
    keywords.some(kw => msgLower.includes(kw))
  );

  if (matched.length === 0) return null;

  const results = [];

  for (const { endpoint, title } of matched) {
    try {
      const cached = getKnowledgeDocByUrl(endpoint);
      if (isFresh(cached)) {
        results.push({ title, url: endpoint, content: cached.content });
        continue;
      }

      // Fetch live data with 8 second timeout
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json', 'User-Agent': 'MuniOran-Bot/1.0' },
      });

      if (!res.ok) {
        console.warn(`[liveDataService] ${endpoint} → HTTP ${res.status}`);
        // Use stale cache if available
        if (cached) results.push({ title, url: endpoint, content: cached.content });
        continue;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || data.data || []);
      const content = formatItems(items, endpoint);

      upsertKnowledgeDoc(title, endpoint, content);
      results.push({ title, url: endpoint, content });
      console.log(`[liveDataService] ✅ Fetched & cached: ${title} (${items.length} items)`);
    } catch (e) {
      console.error(`[liveDataService] Error fetching ${endpoint}:`, e.message);
      // Use stale cache as fallback
      try {
        const cached = getKnowledgeDocByUrl(endpoint);
        if (cached) results.push({ title, url: endpoint, content: cached.content });
      } catch (_) {}
    }
  }

  return results.length > 0 ? results : null;
};
