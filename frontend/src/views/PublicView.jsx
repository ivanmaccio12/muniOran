import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COLUMNS_ADMIN, MOCK_WORKERS } from '../data/mockReclamos';
import ReclamoDetail from '../components/ReclamoDetail';
import FilterBar from '../components/FilterBar';
import './PublicView.css';

const PublicView = ({ reclamos, solicitarUpdate, fetchReclamo }) => {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('id');

  const [selectedReclamo, setSelectedReclamo] = useState(null);
  const [filters, setFilters] = useState({ search: preselectedId || '', motivo: '', estado: '' });

  // Deep-link: load full reclamo when ?id= is present
  useEffect(() => {
    if (preselectedId && fetchReclamo) {
      fetchReclamo(preselectedId).then(r => { if (r) setSelectedReclamo(r); });
    }
  }, [preselectedId]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filtered = useMemo(() => {
    return reclamos
      .filter(r => {
        const term = (filters.search || '').toLowerCase();
        if (term && !(
          r.id.toLowerCase().includes(term) ||
          r.nombre_apellido.toLowerCase().includes(term) ||
          r.direccion.toLowerCase().includes(term) ||
          r.motivo.toLowerCase().includes(term) ||
          r.barrio?.toLowerCase().includes(term)
        )) return false;
        if (filters.motivo && r.motivo !== filters.motivo) return false;
        if (filters.estado && r.estado !== filters.estado) return false;
        return true;
      })
      .sort((a, b) => {
        // Non-resolved first (oldest to newest), then resolved
        const aResolved = ['resuelto', 'descartado'].includes(a.estado);
        const bResolved = ['resuelto', 'descartado'].includes(b.estado);
        if (aResolved !== bResolved) return aResolved ? 1 : -1;
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
  }, [reclamos, filters]);

  const getEstadoBadge = (estado) => {
    const col = COLUMNS_ADMIN.find(c => c.id === estado);
    return col ? `${col.icon} ${col.title}` : estado;
  };

  const getStatusColor = (estado) => {
    const map = { nuevo: '#6366f1', en_revision: '#f59e0b', asignado: '#3b82f6', resuelto: '#10b981', descartado: '#ef4444' };
    return map[estado] || '#94a3b8';
  };

  return (
    <div className="public-view">
      <div className="public-header">
        <div className="public-hero">
          <h2>🔎 Consulta de Reclamos</h2>
          <p>Consultá el estado de tu reclamo ingresando el número, nombre o dirección</p>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showEquipo={false} />

      <div className="public-results">
        <div className="results-header">
          <span>{filtered.length} reclamos encontrados</span>
        </div>

        <div className="results-list">
          {filtered.map(r => {
            const worker = r.asignado_a ? MOCK_WORKERS.find(w => w.id === r.asignado_a) : null;
            return (
              <div key={r.id} className="result-row" onClick={async () => { const full = await fetchReclamo(r.id); setSelectedReclamo(full || r); }}>
                <div className="result-id">{r.id}</div>
                <div className="result-main">
                  <span className="result-motivo">{r.motivo}</span>
                  <span className="result-desc">{r.descripcion.substring(0, 80)}...</span>
                </div>
                <div className="result-meta">
                  <span className="result-address">📍 {r.direccion}</span>
                  <span className="result-date">📅 {formatDate(r.timestamp)}</span>
                </div>
                <div className="result-status" style={{ '--status-color': getStatusColor(r.estado) }}>
                  <span className="status-dot"></span>
                  {getEstadoBadge(r.estado)}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="no-results">
              <p>No se encontraron reclamos con esos criterios.</p>
              <p className="no-results-hint">Probá con tu número de reclamo (ej: REC-2025-001)</p>
            </div>
          )}
        </div>
      </div>

      {selectedReclamo && (
        <ReclamoDetail
          reclamo={selectedReclamo}
          onClose={() => setSelectedReclamo(null)}
          readOnly={true}
          onSolicitarUpdate={async (id) => {
            await solicitarUpdate(id);
            const full = await fetchReclamo(id);
            setSelectedReclamo(full);
          }}
        />
      )}
    </div>
  );
};

export default PublicView;
