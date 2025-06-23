import React, { useState } from 'react';
import { useCreateReclamation, useUpdateReclamation } from '../../hooks/useReclamations';
import { CreateReclamationDTO, UpdateReclamationDTO, Reclamation } from '../../types/reclamation.d';

interface Props {
  initial?: Partial<Reclamation>;
  onSuccess: () => void;
}

export const ReclamationForm: React.FC<Props> = ({ initial = {}, onSuccess }) => {
  const [form, setForm] = useState<CreateReclamationDTO>({
    clientId: initial.clientId || '',
    type: initial.type || '',
    severity: (initial.severity as any) || 'low',
    description: initial.description || '',
    documentId: initial.documentId,
    bordereauId: initial.bordereauId,
    assignedToId: initial.assignedToId,
    file: undefined,
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateReclamation();
  // For edit: const updateMutation = useUpdateReclamation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (name === 'file') {
      setForm(f => ({ ...f, file: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Validation
    if (!form.clientId || !form.type || !form.description) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la soumission.');
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <label>Client *</label>
        <select name="clientId" value={form.clientId} onChange={handleChange} required>
          {/* TODO: Populate clients */}
          <option value="">Sélectionner</option>
        </select>
      </div>
      <div>
        <label>Type *</label>
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="">Sélectionner</option>
          <option value="retard">Retard</option>
          <option value="document manquant">Document manquant</option>
          <option value="erreur traitement">Erreur traitement</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div>
        <label>Gravité *</label>
        <select name="severity" value={form.severity} onChange={handleChange} required>
          <option value="low">Faible</option>
          <option value="medium">Moyenne</option>
          <option value="critical">Critique</option>
        </select>
      </div>
      <div>
        <label>Description *</label>
        <textarea name="description" value={form.description} onChange={handleChange} required />
      </div>
      <div>
        <label>Document lié (GED)</label>
        <input type="text" name="documentId" value={form.documentId || ''} onChange={handleChange} />
      </div>
      <div>
        <label>Bordereau lié</label>
        <input type="text" name="bordereauId" value={form.bordereauId || ''} onChange={handleChange} />
      </div>
      <div>
        <label>Preuve (fichier)</label>
        <input type="file" name="file" accept="application/pdf,image/*" onChange={handleChange} />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={createMutation.isLoading}
      >
        {createMutation.isLoading ? 'Envoi...' : 'Soumettre'}
      </button>
    </form>
  );
};