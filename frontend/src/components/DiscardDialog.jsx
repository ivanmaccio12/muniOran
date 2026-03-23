import { useState } from 'react';
import './DiscardDialog.css';

const DiscardDialog = ({ reclamo, onConfirm, onCancel }) => {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async (notificar) => {
    setSaving(true);
    try {
      await onConfirm(reclamo.id, notificar);
    } catch (err) {
      setSaving(false);
    }
  };

  return (
    <div className="discard-overlay" onClick={onCancel}>
      <div className="discard-dialog" onClick={e => e.stopPropagation()}>
        <h3>Descartar reclamo</h3>
        <p className="discard-hint">
          <strong>{reclamo?.motivo}</strong> — {reclamo?.direccion}
        </p>
        <p className="discard-hint">
          ¿Querés notificar al vecino por WhatsApp sobre el descarte?
        </p>
        <div className="discard-actions">
          <button className="discard-btn-cancel" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button className="discard-btn-silent" onClick={() => handleConfirm(false)} disabled={saving}>
            Solo descartar
          </button>
          <button className="discard-btn-notify" onClick={() => handleConfirm(true)} disabled={saving}>
            {saving ? 'Guardando...' : 'Descartar y notificar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscardDialog;
