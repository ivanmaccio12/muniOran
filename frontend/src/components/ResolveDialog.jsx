import { useState } from 'react';
import './ResolveDialog.css';

const ResolveDialog = ({ reclamoId, onConfirm, onCancel }) => {
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!comentario.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm(reclamoId, comentario.trim());
    } catch (err) {
      setError(err.message || 'Error al resolver el reclamo');
      setSaving(false);
    }
  };

  return (
    <div className="resolve-overlay" onClick={onCancel}>
      <div className="resolve-dialog" onClick={e => e.stopPropagation()}>
        <h3>Marcar como Resuelto</h3>
        <p className="resolve-hint">
          Ingresá un comentario de resolución. Este mensaje será enviado al vecino por WhatsApp.
        </p>
        <textarea
          className="resolve-textarea"
          placeholder="Ej: El problema fue solucionado por el equipo de Alumbrado el día de hoy..."
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          rows={4}
          autoFocus
        />
        {error && <div className="resolve-error">{error}</div>}
        <div className="resolve-actions">
          <button className="resolve-btn-cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="resolve-btn-confirm" onClick={handleConfirm} disabled={!comentario.trim() || saving}>
            {saving ? 'Guardando...' : 'Confirmar Resolución'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResolveDialog;
