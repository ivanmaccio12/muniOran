import { EQUIPOS, MOTIVOS } from '../data/mockReclamos';
import './FilterBar.css';

const toInputDate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
};

const FilterBar = ({ filters, onFilterChange, showEquipo = true, showSearch = true }) => {
  return (
    <div className="filter-bar">
      {showSearch && (
        <div className="filter-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Buscar por Nº, nombre, dirección..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button className="filter-clear" onClick={() => onFilterChange({ ...filters, search: '' })}>✕</button>
          )}
        </div>
      )}

      {showEquipo && (
        <select
          className="filter-select"
          value={filters.equipo || ''}
          onChange={(e) => onFilterChange({ ...filters, equipo: e.target.value })}
        >
          <option value="">Todos los Equipos</option>
          {EQUIPOS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      )}

      <select
        className="filter-select"
        value={filters.motivo || ''}
        onChange={(e) => onFilterChange({ ...filters, motivo: e.target.value })}
      >
        <option value="">Todos los Motivos</option>
        {MOTIVOS.filter(m => m !== 'Sin categorizar').map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <select
        className="filter-select"
        value={filters.estado || ''}
        onChange={(e) => onFilterChange({ ...filters, estado: e.target.value })}
      >
        <option value="">Todos los Estados</option>
        <option value="nuevo">Nuevo</option>
        <option value="en_revision">En Revisión</option>
        <option value="asignado">Asignado</option>
        <option value="resuelto">Resuelto</option>
        <option value="descartado">Descartado</option>
      </select>

      <div className="filter-dates">
        <label className="filter-date-label">Desde</label>
        <input
          type="date"
          className="filter-date-input"
          value={toInputDate(filters.dateFrom)}
          onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value + 'T00:00:00') : null })}
        />
        <label className="filter-date-label">Hasta</label>
        <input
          type="date"
          className="filter-date-input"
          value={toInputDate(filters.dateTo)}
          onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value + 'T00:00:00') : null })}
        />
        {(filters.dateFrom || filters.dateTo) && (
          <button className="filter-clear" title="Limpiar fechas" onClick={() => onFilterChange({ ...filters, dateFrom: null, dateTo: null })}>✕</button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
