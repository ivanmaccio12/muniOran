import { useState } from 'react';
import './ResolveDialog.css';

const ResolveDialog = ({ reclamo, onConfirm, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (notificar) => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(reclamo.id, notificar);
    } catch (err) {
      setError(err.message || 'Error al resolver el reclamo');
      setSaving(false);
    }
  };

  return (
    <div className="resolve-overlay" onClick={onCancel}>
      <div className="resolve-dialog" onClick={e => e.stopPropagation()}>
        <h3>Marcar como Resuelto</h3>
        <div className="resolve-reclamo-id">{reclamo?.id}</div>
        <p className="resolve-hint">
          ¿Querés enviar un mensaje al ciudadano por WhatsApp notificando la resolución?
        </p>
        {error && <div className="resolve-error">{error}</div>}
        <div className="resolve-actions">
          <button className="resolve-btn-cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="resolve-btn-no" onClick={() => handleConfirm(false)} disabled={saving}>
            {saving ? 'Guardando...' : 'No enviar'}
          </button>
          <button className="resolve-btn-confirm" onClick={() => handleConfirm(true)} disabled={saving}>
            {saving ? 'Guardando...' : 'Sí, enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResolveDialog;
