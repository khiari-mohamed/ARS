import React from 'react';
import { ReclamationSeverity, ReclamationStatus } from '../../types/reclamation.d';

interface FilterPanelProps {
  filters: {
    clientId?: string;
    status?: ReclamationStatus;
    severity?: ReclamationSeverity;
    type?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  onChange: (filters: any) => void;
  clients: { id: string; name: string }[];
  users: { id: string; fullName: string }[];
  types: string[];
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  clients,
  users,
  types,
  className = '',
}) => {
  return (
    <div className={`reclamations-filter-panel ${className}`}>
      <label>
        Client
        <select
          value={filters.clientId || ''}
          onChange={e => onChange({ ...filters, clientId: e.target.value })}
        >
          <option value="">Tous</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Statut
        <select
          value={filters.status || ''}
          onChange={e => onChange({ ...filters, status: e.target.value })}
        >
          <option value="">Tous</option>
          {['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_CLIENT_REPLY', 'RESOLVED', 'CLOSED'].map(
            s => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            )
          )}
        </select>
      </label>
      <label>
        Gravité
        <select
          value={filters.severity || ''}
          onChange={e => onChange({ ...filters, severity: e.target.value })}
        >
          <option value="">Toutes</option>
          {['low', 'medium', 'critical'].map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select
          value={filters.type || ''}
          onChange={e => onChange({ ...filters, type: e.target.value })}
        >
          <option value="">Tous</option>
          {types.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assigné à
        <select
          value={filters.assignedToId || ''}
          onChange={e => onChange({ ...filters, assignedToId: e.target.value })}
        >
          <option value="">Tous</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Du
        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
        />
      </label>
      <label>
        Au
        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={e => onChange({ ...filters, dateTo: e.target.value })}
        />
      </label>
      {/* You can add a filter button if needed */}
       <button className="filter-btn" onClick={() => onChange(filters)}>Filtrer</button> 
    </div>
  );
};