import { MOCK_WORKERS } from '../data/mockReclamos';
import './KanbanCard.css';

const KanbanCard = ({ reclamo, onDragStart, onClick, onMoveNext, onMovePrev, onDiscard, showArrows = true, readOnly = false }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getMotivoBadgeClass = (motivo) => {
    if (motivo.includes('alumbrado')) return 'motivo-alumbrado';
    if (motivo.includes('poda') || motivo.includes('escombros')) return 'motivo-poda';
    if (motivo.includes('Bacheo') || motivo.includes('calles')) return 'motivo-bacheo';
    if (motivo.includes('Recolección') || motivo.includes('residuos')) return 'motivo-residuos';
    if (motivo.includes('desagüe')) return 'motivo-desague';
    if (motivo.includes('Animales')) return 'motivo-animales';
    if (motivo.includes('tránsito')) return 'motivo-transito';
    return 'motivo-otro';
  };


  const mapsUrl = reclamo.coordenadas
    ? `https://www.google.com/maps?q=${reclamo.coordenadas}`
    : `https://www.google.com/maps/search/${encodeURIComponent(reclamo.direccion + ', Orán, Salta, Argentina')}`;

  const shareUrl = `${window.location.origin}/consulta?id=${reclamo.id}`;

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    const btn = e.currentTarget;
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  };

  const worker = reclamo.asignado_a ? MOCK_WORKERS.find(w => w.id === reclamo.asignado_a) : null;

  const commentCount = reclamo.comentarios?.length || 0;

  return (
    <div
      className={`kanban-card ${readOnly ? 'read-only' : ''} ${reclamo.solicita_update ? 'has-update-request' : ''}`}
      draggable={!readOnly}
      onDragStart={(e) => onDragStart && onDragStart(e, reclamo.id)}
      onClick={() => onClick && onClick(reclamo)}
    >
      {/* Top Row: Motivo + Update indicator */}
      <div className="card-header">
        <span className={`motivo-badge ${getMotivoBadgeClass(reclamo.motivo)}`}>{reclamo.motivo}</span>
        {reclamo.solicita_update && (
          <span className="update-request-badge" title="El vecino solicita una actualización">❗</span>
        )}
      </div>
      <span className="card-date">{formatDate(reclamo.timestamp)}</span>

      {/* Description */}
      <p className="card-descripcion">{reclamo.descripcion}</p>

      {/* Photo thumbnail */}
      {reclamo.fotos && reclamo.fotos.length > 0 && (
        <div className="card-photo">
          <img src={reclamo.fotos[0]} alt="Adjunto" />
          {reclamo.fotos.length > 1 && <span className="photo-count">+{reclamo.fotos.length - 1}</span>}
        </div>
      )}

      {/* Meta */}
      <div className="card-meta">
        <div className="card-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>{reclamo.nombre_apellido}</span>
        </div>
        <div className="card-meta-item card-meta-link" onClick={(e) => { e.stopPropagation(); window.open(mapsUrl, '_blank'); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>{reclamo.direccion}</span>
          <svg className="maps-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </div>
      </div>

      {/* Assignment */}
      {(worker || reclamo.equipo) && (
        <div className="card-assigned">
          {worker && <span className="assigned-worker">👤 {worker.name}</span>}
          {reclamo.equipo && <span className="assigned-equipo">🏢 {reclamo.equipo}</span>}
        </div>
      )}

      {/* Footer: ID + Comments count + Actions */}
      <div className="card-footer">
        <div className="card-footer-left">
          <span className="card-id">{reclamo.id}</span>
          {commentCount > 0 && (
            <span className="card-comments-count" title={`${commentCount} comentario(s)`}>💬 {commentCount}</span>
          )}
        </div>

        <div className="card-actions">
          <button className="card-action-btn share-btn" onClick={handleShare} title="Copiar link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>

          {showArrows && !readOnly && (
            <>
              {onMovePrev && (
                <button className="card-action-btn arrow-btn" onClick={(e) => { e.stopPropagation(); onMovePrev(reclamo.id); }} title="Mover atrás">
                  ◀
                </button>
              )}
              {onMoveNext && (
                <button className="card-action-btn arrow-btn" onClick={(e) => { e.stopPropagation(); onMoveNext(reclamo.id); }} title="Mover adelante">
                  ▶
                </button>
              )}
              {onDiscard && reclamo.estado !== 'descartado' && (
                <button className="card-action-btn discard-btn" onClick={(e) => { e.stopPropagation(); onDiscard(reclamo.id); }} title="Descartar">
                  🚫
                </button>
              )}
            </>
          )}
        </div>
      </div>{/* close card-footer */}
    </div>
  );
};

export default KanbanCard;
