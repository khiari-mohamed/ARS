import React, { useState, useEffect } from 'react';
import { Contract } from '../../types/ContractType';
import { ContractService } from '../../api/ContractService';
import ContractUploadInput from './ContractUploadInput';
import { LocalAPI } from '../../services/axios';

interface Props {
  contract?: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}

const initialState = {
  clientId: '',
  clientName: '',
  startDate: '',
  endDate: '',
  signature: '',
  delaiReglement: 0,
  delaiReclamation: 0,
  escalationThreshold: undefined,
  assignedManagerId: '',
  notes: '',
};

const ContractFormModal: React.FC<Props> = ({ contract, onClose, onSaved }) => {
  const [form, setForm] = useState<any>(contract || initialState);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    // Fetch clients
    LocalAPI.get('/clients').then(res => {
      setClients(res.data || []);
    });
    // Fetch managers (GESTIONNAIRE role)
    LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } }).then(res => {
      setManagers(res.data || []);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f: any) => ({ ...f, [name]: value }));
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = clients.find(c => c.id === e.target.value);
    setForm((f: any) => ({ ...f, clientId: selected?.id || '', clientName: selected?.name || '' }));
  };

  const handleManagerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((f: any) => ({ ...f, assignedManagerId: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (contract) {
        await ContractService.update(contract.id, form);
      } else {
        await ContractService.create(form, file || undefined);
      }
      onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <form className="contract-modal-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="contract-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="contract-modal-title">
          {contract ? 'Edit Contract' : 'Add Contract'}
        </div>
        <label>Client:</label>
        <select name="clientId" value={form.clientId} onChange={handleClientChange} required>
          <option value="">Select client</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input name="clientName" value={form.clientName} readOnly placeholder="Client Name" required />
        <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
        <input name="endDate" type="date" value={form.endDate} onChange={handleChange} required />
        <input name="signature" type="text" value={form.signature} onChange={handleChange} placeholder="Signature (or date string)" />
        <input name="delaiReglement" type="number" value={form.delaiReglement} onChange={handleChange} required />
        <input name="delaiReclamation" type="number" value={form.delaiReclamation} onChange={handleChange} required />
        <input name="escalationThreshold" type="number" value={form.escalationThreshold || ''} onChange={handleChange} />
        <label>Account Manager:</label>
        <select name="assignedManagerId" value={form.assignedManagerId} onChange={handleManagerChange} required>
          <option value="">Select manager</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
        <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" />
        <ContractUploadInput onFileChange={setFile} />
        <div className="contract-modal-actions">
          <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ContractFormModal;
