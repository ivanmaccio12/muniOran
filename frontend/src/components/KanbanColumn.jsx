import KanbanCard from './KanbanCard';
import './KanbanColumn.css';

const KanbanColumn = ({ column, reclamos, onCardClick, onMoveNext, onMovePrev, onDiscard, onApplySuggestion, showArrows, readOnly, getWorkerName }) => {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <div className="column-title-row">
          <span className="column-icon">{column.icon}</span>
          <h3 className="column-title">{column.title}</h3>
          <span className="column-count" style={{ background: column.color + '22', color: column.color }}>
            {reclamos.length}
          </span>
        </div>
        <div className="column-indicator" style={{ background: column.color }}></div>
      </div>

      <div className="column-body">
        {reclamos.length === 0 ? (
          <div className="column-empty"><p>Sin reclamos</p></div>
        ) : (
          reclamos.map((r) => (
            <KanbanCard
              key={r.id}
              reclamo={r}
              onClick={onCardClick}
              onMoveNext={onMoveNext}
              onMovePrev={onMovePrev}
              onDiscard={onDiscard}
              onApplySuggestion={onApplySuggestion}
              showArrows={showArrows}
              readOnly={readOnly}
              getWorkerName={getWorkerName}
              columnColor={column.color}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
