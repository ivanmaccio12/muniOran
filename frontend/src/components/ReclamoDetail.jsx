import { useState, useEffect } from 'react';
import { COLUMNS_ADMIN, EQUIPOS, MOTIVOS } from '../data/mockReclamos';
import { useUsers } from '../hooks/useUsers.js';
import './ReclamoDetail.css';

const ReclamoDetail = ({ reclamo, onClose, onUpdateEstado, onUpdateMotivo, onAssign, onAddComentario, onSolicitarUpdate, readOnly = false, currentWorker = null }) => {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const { workers, getWorkerName } = useUsers();

  // Local assignment state — only saved on ACEPTAR
  const [localMotivo, setLocalMotivo] = useState(reclamo?.motivo || '');
  const [localEquipo, setLocalEquipo] = useState(reclamo?.equipo || '');
  const [localAsignado, setLocalAsignado] = useState(reclamo?.asignado_a || '');
  const [savingAssign, setSavingAssign] = useState(false);

  // Reset local state when reclamo changes
  useEffect(() => {
    setLocalMotivo(reclamo?.motivo || '');
    setLocalEquipo(reclamo?.equipo || '');
    setLocalAsignado(reclamo?.asignado_a || '');
  }, [reclamo?.id]);

  // When equipo changes, filter workers and auto-select first from that equipo
  const handleEquipoChange = (equipo) => {
    setLocalEquipo(equipo);
    const workersInEquipo = workers.filter(w => w.equipo === equipo);
    // Keep current asignado if they belong to new equipo, otherwise auto-select first
    const currentStillValid = localAsignado && workersInEquipo.some(w => w.id === localAsignado);
    setLocalAsignado(currentStillValid ? localAsignado : (workersInEquipo[0]?.id || ''));
  };

  // Workers filtered by selected equipo
  const filteredWorkers = localEquipo
    ? workers.filter(w => w.equipo === localEquipo)
    : workers;

  // Detect pending changes
  const hasChanges = localMotivo !== reclamo?.motivo || localEquipo !== (reclamo?.equipo || '') || localAsignado !== (reclamo?.asignado_a || '');

  const handleAcceptarAsignacion = async () => {
    setSavingAssign(true);
    try {
      if (localMotivo !== reclamo.motivo && onUpdateMotivo) {
        await onUpdateMotivo(reclamo.id, localMotivo);
      }
      if ((localEquipo !== (reclamo.equipo || '') || localAsignado !== (reclamo.asignado_a || '')) && onAssign) {
        await onAssign(reclamo.id, localAsignado, localEquipo);
      }
    } finally {
      setSavingAssign(false);
    }
  };

  if (!reclamo) return null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
  };

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
  };

  const mapsUrl = reclamo.coordenadas
    ? `https://www.google.com/maps?q=${reclamo.coordenadas}`
    : `https://www.google.com/maps/search/${encodeURIComponent(reclamo.direccion + ', Orán, Salta, Argentina')}`;

  const handleSubmitComment = () => {
    if (!nuevoComentario.trim()) return;
    const authorName = currentWorker ? (getWorkerName(currentWorker) || 'Staff') : 'Admin';
    onAddComentario(reclamo.id, authorName, 'Administración', nuevoComentario.trim());
    setNuevoComentario('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>

        {/* Close button — outside content flow, always visible */}
        <button className="detail-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Update request alert */}
        {reclamo.solicita_update && (
          <div className="update-alert">
            ❗ El vecino solicita una actualización sobre este reclamo
          </div>
        )}

        <div className="detail-header">
          <span className={`badge badge-${reclamo.estado}`}>
            {COLUMNS_ADMIN.find(c => c.id === reclamo.estado)?.icon} {COLUMNS_ADMIN.find(c => c.id === reclamo.estado)?.title}
          </span>
          <span className="detail-id">{reclamo.id}</span>
        </div>

        <h2 className="detail-title">{reclamo.motivo}</h2>
        <p className="detail-timestamp">📅 {formatDate(reclamo.timestamp)}</p>

        <div className="detail-section">
          <h4>📝 Descripción</h4>
          <p>{reclamo.descripcion}</p>
        </div>

        {/* Photos */}
        {reclamo.fotos && reclamo.fotos.length > 0 && (
          <div className="detail-section">
            <h4>📷 Fotos adjuntas ({reclamo.fotos.length})</h4>
            <div className="detail-photos">
              {reclamo.fotos.map((foto, i) => (
                <div key={i} className="detail-photo-item">
                  <a href={foto} target="_blank" rel="noopener noreferrer" className="detail-photo-link">
                    <img src={foto} alt={`Adjunto ${i + 1}`} />
                  </a>
                  <a
                    href={foto}
                    download={`reclamo-${reclamo.id}-foto-${i + 1}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-photo-download"
                    title="Descargar foto"
                  >
                    ⬇ Descargar
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-grid">
          <div className="detail-field"><label>👤 Nombre</label><span>{reclamo.nombre_apellido}</span></div>
          <div className="detail-field"><label>🪪 DNI</label><span>{reclamo.dni}</span></div>
          <div className="detail-field"><label>📱 Teléfono</label><span>{reclamo.telefono}</span></div>
          <div className="detail-field detail-field-link" onClick={() => window.open(mapsUrl, '_blank')}>
            <label>📍 Dirección</label>
            <span>{reclamo.direccion} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>
          </div>
          {reclamo.barrio && <div className="detail-field"><label>🏘️ Barrio</label><span>{reclamo.barrio}</span></div>}
        </div>

        {/* Share */}
        <div className="detail-share">
          <button className="share-link-btn" onClick={() => { navigator.clipboard.writeText(reclamo.id); }}>
            🔗 Copiar ID de reclamo
          </button>
          <span className="share-url">{reclamo.id}</span>
        </div>

        {/* Comments */}
        <div className="comments-section">
          <h4 className="comments-title">
            💬 Comentarios y Actualizaciones
            <span className="comments-count">{reclamo.comentarios?.length || 0}</span>
          </h4>

          <div className="comments-list">
            {(!reclamo.comentarios || reclamo.comentarios.length === 0) ? (
              <div className="comments-empty">
                <p>No hay comentarios todavía.</p>
              </div>
            ) : (
              reclamo.comentarios.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-author">
                      <span className="comment-avatar">👤</span>
                      <span className="comment-name">{c.autor}</span>
                      <span className="comment-role">{c.rol}</span>
                    </div>
                    <span className="comment-date">{formatShortDate(c.timestamp)}</span>
                  </div>
                  <p className="comment-text">{c.texto}</p>
                </div>
              ))
            )}
          </div>

          {!readOnly && onAddComentario && (
            <div className="comment-input-area">
              <textarea
                className="comment-textarea"
                placeholder="Escribí un comentario o actualización de estado..."
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <button className="comment-submit" onClick={handleSubmitComment} disabled={!nuevoComentario.trim()}>
                Comentar
              </button>
              <p className="comment-hint">💡 Al comentar, se notifica al vecino por WhatsApp y se limpia la solicitud de actualización{reclamo.solicita_update ? ' ❗' : ''}</p>
            </div>
          )}

          {readOnly && onSolicitarUpdate && !reclamo.solicita_update && !['resuelto', 'descartado'].includes(reclamo.estado) && (
            <button className="request-update-btn" onClick={() => onSolicitarUpdate(reclamo.id)}>
              ❗ Solicitar actualización del estado
            </button>
          )}

          {readOnly && reclamo.solicita_update && (
            <div className="update-requested-msg">
              ✅ Ya se solicitó una actualización. El equipo fue notificado.
            </div>
          )}
        </div>

        {/* Actions — only if not readOnly */}
        {!readOnly && (
          <div className="detail-actions">
            <div className="detail-action-group">
              <label className="action-label">Cambiar Estado</label>
              <div className="action-buttons">
                {COLUMNS_ADMIN.map((col) => (
                  <button key={col.id} className={`action-btn ${reclamo.estado === col.id ? 'active' : ''}`}
                    style={{ '--btn-color': col.color, '--btn-glow': col.color + '33' }}
                    onClick={() => onUpdateEstado(reclamo.id, col.id)}>
                    {col.icon} {col.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignment section with ACEPTAR button */}
            <div className="detail-action-group assign-group">
              <label className="action-label">Asignación</label>
              <div className="assign-fields">
                <div className="assign-field">
                  <label className="assign-sublabel">Motivo / Categoría</label>
                  <select className="motivo-select" value={localMotivo} onChange={(e) => setLocalMotivo(e.target.value)}>
                    {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="assign-field">
                  <label className="assign-sublabel">Equipo</label>
                  <select className="motivo-select" value={localEquipo} onChange={(e) => handleEquipoChange(e.target.value)}>
                    <option value="">Sin equipo</option>
                    {EQUIPOS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
                <div className="assign-field">
                  <label className="assign-sublabel">Persona responsable</label>
                  <select className="motivo-select" value={localAsignado} onChange={(e) => setLocalAsignado(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {filteredWorkers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  </select>
                </div>
              </div>
              <button
                className={`assign-accept-btn ${hasChanges ? 'has-changes' : ''}`}
                onClick={handleAcceptarAsignacion}
                disabled={!hasChanges || savingAssign}
              >
                {savingAssign ? 'Guardando...' : '✔ Aceptar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReclamoDetail;
