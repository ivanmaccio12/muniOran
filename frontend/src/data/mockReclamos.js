import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3003/api';

// Equipos/Áreas de la Municipalidad
export const EQUIPOS = [
  'Obras Públicas',
  'Alumbrado',
  'Tránsito',
  'Bienestar Animal',
  'GIRSU (Residuos)',
  'Espacios Verdes',
  'Mantenimiento Urbano',
  'Defensa del Consumidor',
];

export const COLUMNS_ADMIN = [
  { id: 'nuevo', title: 'Nuevo', color: '#6366f1', icon: '🆕', order: 0 },
  { id: 'en_revision', title: 'En Revisión', color: '#f59e0b', icon: '🔍', order: 1 },
  { id: 'asignado', title: 'Asignado', color: '#3b82f6', icon: '👤', order: 2 },
  { id: 'resuelto', title: 'Resuelto', color: '#10b981', icon: '✅', order: 3 },
  { id: 'descartado', title: 'Descartado', color: '#ef4444', icon: '🚫', order: 4 },
];

export const COLUMNS_WORKER = COLUMNS_ADMIN.filter(c => !['descartado'].includes(c.id));

export const MOTIVOS = [
  'Sin categorizar',
  'Retiro de poda y/o escombros',
  'Problema de alumbrado',
  'Bacheo / estado de calles',
  'Recolección de residuos',
  'Problema de desagüe',
  'Reclamo por ruidos molestos',
  'Problema con arbolado urbano',
  'Animales sueltos',
  'Problema de tránsito',
  'Otro',
];

export const MOTIVO_TO_EQUIPO = {
  'Retiro de poda y/o escombros': 'Obras Públicas',
  'Problema de alumbrado': 'Alumbrado',
  'Bacheo / estado de calles': 'Obras Públicas',
  'Recolección de residuos': 'GIRSU (Residuos)',
  'Problema de desagüe': 'Obras Públicas',
  'Reclamo por ruidos molestos': 'Tránsito',
  'Problema con arbolado urbano': 'Espacios Verdes',
  'Animales sueltos': 'Bienestar Animal',
  'Problema de tránsito': 'Tránsito',
};

export const MOCK_WORKERS = [
  { id: 'w1', name: 'Juan Pérez', equipo: 'Obras Públicas' },
  { id: 'w2', name: 'Laura Gómez', equipo: 'Alumbrado' },
  { id: 'w3', name: 'Martín López', equipo: 'GIRSU (Residuos)' },
  { id: 'w4', name: 'Carolina Ruiz', equipo: 'Bienestar Animal' },
  { id: 'w5', name: 'Pedro Sánchez', equipo: 'Tránsito' },
];

// Hook que consume la API REST
export const useReclamos = () => {
  const [reclamos, setReclamos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all reclamos
  const fetchReclamos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reclamos`);
      const data = await res.json();
      setReclamos(data);
    } catch (err) {
      console.error('Error fetching reclamos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReclamos(); }, [fetchReclamos]);

  // Fetch single reclamo with comments
  const fetchReclamo = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/reclamos/${id}`);
      return await res.json();
    } catch (err) {
      console.error('Error fetching reclamo:', err);
      return null;
    }
  };

  // PATCH reclamo and refresh list
  const patchAndRefresh = async (id, body) => {
    try {
      await fetch(`${API_BASE}/reclamos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await fetchReclamos();
    } catch (err) {
      console.error('Error updating reclamo:', err);
    }
  };

  const moveEstado = (id, nuevoEstado) => patchAndRefresh(id, { estado: nuevoEstado });

  const assignWorker = (id, workerId, equipo) => patchAndRefresh(id, { asignado_a: workerId || null, equipo: equipo || null });

  const updateMotivo = (id, motivo) => patchAndRefresh(id, { motivo });

  const discardReclamo = (id) => patchAndRefresh(id, { estado: 'descartado' });

  const addComentario = async (id, autor, rol, texto) => {
    try {
      await fetch(`${API_BASE}/reclamos/${id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autor, rol, texto }),
      });
      await fetchReclamos();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const solicitarUpdate = async (id) => {
    try {
      await fetch(`${API_BASE}/reclamos/${id}/solicitar-update`, { method: 'POST' });
      await fetchReclamos();
    } catch (err) {
      console.error('Error requesting update:', err);
    }
  };

  const getNextEstado = (currentEstado) => {
    const col = COLUMNS_ADMIN.find(c => c.id === currentEstado);
    const next = COLUMNS_ADMIN.find(c => c.order === col.order + 1);
    return next?.id || null;
  };

  const getPrevEstado = (currentEstado) => {
    const col = COLUMNS_ADMIN.find(c => c.id === currentEstado);
    const prev = COLUMNS_ADMIN.find(c => c.order === col.order - 1);
    return prev?.id || null;
  };

  return {
    reclamos,
    loading,
    fetchReclamo,
    fetchReclamos,
    moveEstado,
    assignWorker,
    updateMotivo,
    discardReclamo,
    addComentario,
    solicitarUpdate,
    getNextEstado,
    getPrevEstado,
  };
};
