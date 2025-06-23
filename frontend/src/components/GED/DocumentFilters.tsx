import React, { useState } from 'react';

interface Props {
  onSearch: (filters: any) => void;
}

const DocumentFilters: React.FC<Props> = ({ onSearch }) => {
  const [filters, setFilters] = useState({
    clientName: '',
    type: '',
    bordereauReference: '',
    uploadedAfter: '',
    uploadedBefore: '',
    keywords: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <form className="ged-filters-form" onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <input name="clientName" value={filters.clientName} onChange={handleChange} placeholder="Client Name" />
      <select name="type" value={filters.type} onChange={handleChange}>
        <option value="">All Types</option>
        <option value="BS">BS</option>
        <option value="contrat">Contrat</option>
        <option value="justificatif">Justificatif</option>
        <option value="reçu">Reçu</option>
        <option value="courrier">Courrier</option>
      </select>
      <input name="bordereauReference" value={filters.bordereauReference} onChange={handleChange} placeholder="Bordereau Ref" />
      <input name="uploadedAfter" type="date" value={filters.uploadedAfter} onChange={handleChange} />
      <input name="uploadedBefore" type="date" value={filters.uploadedBefore} onChange={handleChange} />
      <input name="keywords" value={filters.keywords} onChange={handleChange} placeholder="Keywords (OCR, name, type)" />
      <button type="submit">Search</button>
    </form>
  );
};

export default DocumentFilters;
