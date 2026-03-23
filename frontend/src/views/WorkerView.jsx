import { useState, useMemo } from 'react';
import { COLUMNS_WORKER } from '../data/mockReclamos';
import { useAuth } from '../context/AuthContext.jsx';
import { useUsers } from '../hooks/useUsers.js';
import KanbanColumn from '../components/KanbanColumn';
import ReclamoDetail from '../components/ReclamoDetail';
import ResolveDialog from '../components/ResolveDialog.jsx';
import FilterBar from '../components/FilterBar';
import './WorkerView.css';

const WorkerView = ({ reclamos, moveEstado, resolveReclamo, updateMotivo, getNextEstado, getPrevEstado, addComentario, fetchReclamo }) => {
  const { user } = useAuth();
  const { workers, getWorkerName } = useUsers();

  // equipo role: always their own reclamos; admin/gestor: can select any worker
  const [selectedWorker, setSelectedWorker] = useState(null);
  const effectiveWorker = user?.rol === 'equipo' ? user.id : (selectedWorker || user?.id);

  const [selectedReclamo, setSelectedReclamo] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [filters, setFilters] = useState({ search: '', motivo: '', estado: '' });

  const myReclamos = useMemo(() => {
    return reclamos.filter(r => {
      if (r.asignado_a !== effectiveWorker) return false;
      const term = (filters.search || '').toLowerCase();
      if (term && !(
        r.id.toLowerCase().includes(term) ||
        r.nombre_apellido.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term) ||
        r.direccion.toLowerCase().includes(term) ||
        r.motivo.toLowerCase().includes(term)
      )) return false;
      if (filters.motivo && r.motivo !== filters.motivo) return false;
      if (filters.estado && r.estado !== filters.estado) return false;
      return true;
    });
  }, [reclamos, effectiveWorker, filters]);

  const reclamosByEstado = useMemo(() => {
    const grouped = {};
    COLUMNS_WORKER.forEach(col => {
      grouped[col.id] = myReclamos
        .filter(r => r.estado === col.id)
        .sort((a, b) => {
          if (col.id === 'resuelto') return new Date(b.timestamp) - new Date(a.timestamp);
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
    });
    return grouped;
  }, [myReclamos]);

  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (_e, newEstado) => { if (draggedId) { moveEstado(draggedId, newEstado); setDraggedId(null); } };

  const handleMoveNext = (id) => {
    const r = reclamos.find(x => x.id === id);
    const next = getNextEstado(r.estado);
    if (!next || next === 'descartado') return;
    if (next === 'resuelto') { setResolveTarget(id); return; }
    moveEstado(id, next);
  };
  const handleMovePrev = (id) => { const r = reclamos.find(x => x.id === id); const prev = getPrevEstado(r.estado); if (prev) moveEstado(id, prev); };

  const handleUpdateEstado = async (id, estado) => {
    if (estado === 'descartado') return;
    if (estado === 'resuelto') { setResolveTarget(id); return; }
    await moveEstado(id, estado);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  const handleResolveConfirm = async (id, comentario) => {
    await resolveReclamo(id, comentario);
    setResolveTarget(null);
    setSelectedReclamo(null);
  };

  const handleUpdateMotivo = async (id, motivo) => {
    await updateMotivo(id, motivo);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  const handleAddComentario = async (id, autor, rol, texto) => {
    await addComentario(id, autor, rol, texto);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  return (
    <div className="worker-view">
      <div className="worker-header">
        <div className="worker-selector">
          {user?.rol === 'equipo' ? (
            <span className="worker-label">👤 {user.nombre} — {user.equipo}</span>
          ) : (
            <>
              <label>👤 Ver reclamos de:</label>
              <select value={selectedWorker || user?.id || ''} onChange={(e) => setSelectedWorker(e.target.value)}>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.nombre} — {w.equipo}</option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="worker-info">
          <span className="worker-count">{myReclamos.length} reclamos asignados</span>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showEquipo={false} />

      <div className="kanban-board">
        {COLUMNS_WORKER.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            reclamos={reclamosByEstado[col.id] || []}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={async (r) => { const full = await fetchReclamo(r.id); setSelectedReclamo(full || r); }}
            onMoveNext={handleMoveNext}
            onMovePrev={handleMovePrev}
            showArrows={true}
            getWorkerName={getWorkerName}
          />
        ))}
      </div>

      {selectedReclamo && (
        <ReclamoDetail
          reclamo={selectedReclamo}
          onClose={() => setSelectedReclamo(null)}
          onUpdateEstado={handleUpdateEstado}
          onUpdateMotivo={handleUpdateMotivo}
          onAddComentario={handleAddComentario}
          currentWorker={effectiveWorker}
        />
      )}

      {resolveTarget && (
        <ResolveDialog
          reclamo={reclamos.find(r => r.id === resolveTarget)}
          onConfirm={handleResolveConfirm}
          onCancel={() => setResolveTarget(null)}
        />
      )}
    </div>
  );
};

export default WorkerView;
