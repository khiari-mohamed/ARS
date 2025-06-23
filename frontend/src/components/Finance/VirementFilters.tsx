import React, { useState } from 'react';
import { VirementSearchParams } from '../../types/finance';

interface Props {
  onChange: (filters: VirementSearchParams) => void;
}

const VirementFilters: React.FC<Props> = ({ onChange }) => {
  const [clientName, setClientName] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({
      clientName: clientName || undefined,
      bordereauReference: reference || undefined,
      confirmed: status === 'all' ? undefined : status === 'confirmed',
    });
  };

  return (
    <form className="virement-filters" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Client"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Référence bordereau"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
        <option value="all">Tous</option>
        <option value="pending">En attente</option>
        <option value="confirmed">Confirmé</option>
      </select>
      <button type="submit">Filtrer</button>
    </form>
  );
};

export default VirementFilters;