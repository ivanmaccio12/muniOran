import { useState, useMemo } from 'react';
import { COLUMNS_WORKER, MOCK_WORKERS } from '../data/mockReclamos';
import KanbanColumn from '../components/KanbanColumn';
import ReclamoDetail from '../components/ReclamoDetail';
import FilterBar from '../components/FilterBar';
import './WorkerView.css';

const WorkerView = ({ reclamos, moveEstado, updateMotivo, getNextEstado, getPrevEstado, addComentario, fetchReclamo }) => {
  const [selectedWorker, setSelectedWorker] = useState(MOCK_WORKERS[0].id);
  const [selectedReclamo, setSelectedReclamo] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [filters, setFilters] = useState({ search: '', motivo: '', estado: '' });

  const worker = MOCK_WORKERS.find(w => w.id === selectedWorker);

  const myReclamos = useMemo(() => {
    return reclamos.filter(r => {
      if (r.asignado_a !== selectedWorker) return false;
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
  }, [reclamos, selectedWorker, filters]);

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
  const handleDrop = (e, newEstado) => { if (draggedId) { moveEstado(draggedId, newEstado); setDraggedId(null); } };

  const handleMoveNext = (id) => { const r = reclamos.find(x => x.id === id); const next = getNextEstado(r.estado); if (next && next !== 'descartado') moveEstado(id, next); };
  const handleMovePrev = (id) => { const r = reclamos.find(x => x.id === id); const prev = getPrevEstado(r.estado); if (prev) moveEstado(id, prev); };

  const handleUpdateEstado = async (id, estado) => {
    if (estado === 'descartado') return;
    await moveEstado(id, estado);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
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
          <label>👤 Sesión como:</label>
          <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
            {MOCK_WORKERS.map(w => (
              <option key={w.id} value={w.id}>{w.name} — {w.equipo}</option>
            ))}
          </select>
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
          currentWorker={selectedWorker}
        />
      )}
    </div>
  );
};

export default WorkerView;
