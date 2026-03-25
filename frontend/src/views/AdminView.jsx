import { useState, useMemo } from 'react';
import { COLUMNS_ADMIN } from '../data/mockReclamos';
import { useUsers } from '../hooks/useUsers.js';
import KanbanColumn from '../components/KanbanColumn';
import ReclamoDetail from '../components/ReclamoDetail';
import ResolveDialog from '../components/ResolveDialog.jsx';
import DiscardDialog from '../components/DiscardDialog.jsx';
import FilterBar from '../components/FilterBar';
import './AdminView.css';

const getDefaultDateFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  d.setHours(0, 0, 0, 0);
  return d;
};

const AdminView = ({ reclamos, moveEstado, assignWorker, updateMotivo, discardReclamo, resolveReclamo, applySuggestion, getNextEstado, getPrevEstado, addComentario, fetchReclamo }) => {
  const { getWorkerName } = useUsers();
  const [selectedReclamo, setSelectedReclamo] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [filters, setFilters] = useState({ search: '', equipo: '', motivo: '', estado: '', dateFrom: getDefaultDateFrom(), dateTo: null });

  const filteredReclamos = useMemo(() => {
    return reclamos.filter(r => {
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
      if (filters.equipo && r.equipo !== filters.equipo) return false;
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
  }, [reclamos, filters]);

  const reclamosByEstado = useMemo(() => {
    const grouped = {};
    COLUMNS_ADMIN.forEach(col => {
      grouped[col.id] = filteredReclamos
        .filter(r => r.estado === col.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    return grouped;
  }, [filteredReclamos]);

  const stats = useMemo(() => ({
    total: reclamos.length,
    nuevos: reclamos.filter(r => r.estado === 'nuevo').length,
    pending: reclamos.filter(r => !['resuelto', 'descartado'].includes(r.estado)).length,
    resueltos: reclamos.filter(r => r.estado === 'resuelto').length,
  }), [reclamos]);

  const checkCanMoveToAsignado = (r, estadoDestino) => {
    if (estadoDestino === 'asignado' && (!r.equipo || !r.asignado_a)) {
      alert('Para mover a "Asignado", primero debés ingresar al detalle del reclamo y asignarle un Equipo y una Persona responsable.');
      return false;
    }
    return true;
  };

  const handleMoveNext = (id) => {
    const r = reclamos.find(x => x.id === id);
    const next = getNextEstado(r.estado);
    if (!next) return;
    if (!checkCanMoveToAsignado(r, next)) return;
    if (next === 'resuelto') { setResolveTarget(id); return; }
    moveEstado(id, next);
  };

  const handleMovePrev = (id) => {
    const r = reclamos.find(x => x.id === id);
    const prev = getPrevEstado(r.estado);
    if (prev) moveEstado(id, prev);
  };

  const handleCardClick = async (r) => {
    const full = await fetchReclamo(r.id);
    setSelectedReclamo(full || r);
  };

  const handleUpdateEstado = async (id, estado) => {
    const r = reclamos.find(x => x.id === id);
    if (!checkCanMoveToAsignado(r, estado)) return;
    if (estado === 'resuelto') { setResolveTarget(id); return; }
    if (estado === 'descartado') { setDiscardTarget(id); return; }
    await moveEstado(id, estado);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  const handleResolveConfirm = async (id, notificar) => {
    await resolveReclamo(id, notificar);
    setResolveTarget(null);
    setSelectedReclamo(null);
  };

  const handleDiscardConfirm = async (id, notificar) => {
    await discardReclamo(id, notificar);
    setDiscardTarget(null);
    setSelectedReclamo(null);
  };

  const handleUpdateMotivo = async (id, motivo) => {
    await updateMotivo(id, motivo);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  const handleAssign = async (id, workerId, equipo) => {
    await assignWorker(id, workerId, equipo);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  const handleAddComentario = async (id, autor, rol, texto) => {
    await addComentario(id, autor, rol, texto);
    const full = await fetchReclamo(id);
    setSelectedReclamo(full);
  };

  return (
    <div className="admin-view">
      <div className="admin-sticky-top">
        <div className="admin-header">
          <div className="admin-stats">
            <div className="stat-pill"><span className="stat-num">{stats.total}</span><span className="stat-lbl">Total</span></div>
            <div className="stat-pill s-new"><span className="stat-num">{stats.nuevos}</span><span className="stat-lbl">Nuevos</span></div>
            <div className="stat-pill s-pend"><span className="stat-num">{stats.pending}</span><span className="stat-lbl">Pendientes</span></div>
            <div className="stat-pill s-done"><span className="stat-num">{stats.resueltos}</span><span className="stat-lbl">Resueltos</span></div>
          </div>
        </div>

        <FilterBar filters={filters} onFilterChange={setFilters} />
      </div>

      <div className="kanban-board">
        {COLUMNS_ADMIN.map(col => {
          const isFirst = col.order === 0;
          const isLast = col.order === COLUMNS_ADMIN.length - 1;
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              reclamos={reclamosByEstado[col.id] || []}
              onCardClick={handleCardClick}
              onMoveNext={!isLast ? handleMoveNext : null}
              onMovePrev={!isFirst ? handleMovePrev : null}
              onDiscard={(id) => setDiscardTarget(id)}
              onApplySuggestion={applySuggestion}
              showArrows={true}
              getWorkerName={getWorkerName}
            />
          );
        })}
      </div>

      {selectedReclamo && (
        <ReclamoDetail
          reclamo={selectedReclamo}
          onClose={() => setSelectedReclamo(null)}
          onUpdateEstado={handleUpdateEstado}
          onUpdateMotivo={handleUpdateMotivo}
          onAssign={handleAssign}
          onAddComentario={handleAddComentario}
        />
      )}

      {resolveTarget && (
        <ResolveDialog
          reclamo={reclamos.find(r => r.id === resolveTarget)}
          onConfirm={handleResolveConfirm}
          onCancel={() => setResolveTarget(null)}
        />
      )}

      {discardTarget && (
        <DiscardDialog
          reclamo={reclamos.find(r => r.id === discardTarget)}
          onConfirm={handleDiscardConfirm}
          onCancel={() => setDiscardTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminView;
