import { useState, useMemo, useEffect } from 'react';
import { COLUMNS_WORKER } from '../data/mockReclamos';
import { useAuth } from '../context/AuthContext.jsx';
import { useUsers } from '../hooks/useUsers.js';
import KanbanColumn from '../components/KanbanColumn';
import ReclamoDetail from '../components/ReclamoDetail';
import ResolveDialog from '../components/ResolveDialog.jsx';
import FilterBar from '../components/FilterBar';
import './WorkerView.css';

const getDefaultDateFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  d.setHours(0, 0, 0, 0);
  return d;
};

const WorkerView = ({ reclamos, moveEstado, resolveReclamo, updateMotivo, getNextEstado, getPrevEstado, addComentario, fetchReclamo }) => {
  const { user } = useAuth();
  const { workers, getWorkerName } = useUsers();

  const [selectedWorker, setSelectedWorker] = useState(null);

  // Default to first worker for admin/gestor when workers load
  useEffect(() => {
    if (user?.rol !== 'equipo' && !selectedWorker && workers.length > 0) {
      setSelectedWorker(workers[0].id);
    }
  }, [workers, user?.rol]);

  const effectiveWorker = user?.rol === 'equipo' ? user.id : (selectedWorker || user?.id);

  const [selectedReclamo, setSelectedReclamo] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [filters, setFilters] = useState({ search: '', motivo: '', estado: '', dateFrom: getDefaultDateFrom(), dateTo: null });

  const myReclamos = useMemo(() => {
    return reclamos.filter(r => {
      if (r.asignado_a !== effectiveWorker) return false;
      const term = (filters.search || '').toLowerCase();
      if (term && !(
        r.id.toLowerCase().includes(term) ||
        r.nombre_apellido.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term) ||
        r.direccion.toLowerCase().includes(term) ||
        r.motivo.toLowerCase().includes(term) ||
        r.barrio?.toLowerCase().includes(term) ||
        r.dni.includes(term)
      )) return false;
      if (filters.motivo && r.motivo !== filters.motivo) return false;
      if (filters.estado && r.estado !== filters.estado) return false;
      if (filters.dateFrom && new Date(r.timestamp) < filters.dateFrom) return false;
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(r.timestamp) > to) return false;
      }
      return true;
    });
  }, [reclamos, effectiveWorker, filters]);

  const reclamosByEstado = useMemo(() => {
    const grouped = {};
    COLUMNS_WORKER.forEach(col => {
      grouped[col.id] = myReclamos
        .filter(r => r.estado === col.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    return grouped;
  }, [myReclamos]);

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

  const handleResolveConfirm = async (id, notificar) => {
    await resolveReclamo(id, notificar);
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
      <div className="worker-sticky-top">
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
      </div>

      <div className="kanban-board">
        {COLUMNS_WORKER.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            reclamos={reclamosByEstado[col.id] || []}
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
