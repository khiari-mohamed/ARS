import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBordereau, updateBordereau } from '../../../services/bordereauxService';
import { fetchClients } from '../../../services/clientService';
import { fetchContractsByClient, fetchContractById } from '../../../services/contractService';

const schema = z.object({
  reference: z.string().min(1),
  clientId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  dateReception: z.string().min(1),
  delaiReglement: z.number().min(1),
  statut: z.string().optional(),
  nombreBS: z.number().min(1),
  commentaire: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EditBordereauPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: bordereau, isLoading } = useQuery(['bordereau', id], () => fetchBordereau(id as string), { enabled: !!id });
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [manager, setManager] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchClients().then(setClients);
  }, []);

  useEffect(() => {
    if (bordereau) {
      setValue('reference', bordereau.reference);
      setValue('clientId', bordereau.clientId);
      setValue('contractId', bordereau.contractId);
      setValue('dateReception', bordereau.dateReception?.slice(0, 10));
      setValue('delaiReglement', bordereau.delaiReglement);
      setValue('statut', bordereau.statut);
      setValue('nombreBS', bordereau.nombreBS);
      setValue('commentaire', bordereau.commentaire || '');
      // Fetch contracts for selected client
      fetchContractsByClient(bordereau.clientId).then(setContracts);
      if (bordereau.contractId) {
        fetchContractById(bordereau.contractId).then(contract => setManager(contract.assignedManagerId || ""));
      }
    }
  }, [bordereau, setValue]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(null);
    try {
      await updateBordereau(id as string, data);
      setSuccess('Bordereau mis à jour avec succès.');
      setTimeout(() => navigate(`/bordereaux/${id}`), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  if (isLoading || !bordereau) return <div className="text-center py-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded shadow max-w-xl w-full p-8 space-y-6">
        <h2 className="text-2xl font-bold mb-4">Modifier le Bordereau</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Client *</label>
            <select {...register('clientId')} className="input w-full" disabled>
              <option value="">Sélectionner un client</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Type de Fichier *</label>
            <select className="input w-full" value="BS" disabled>
              <option value="BS">BS</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Nombre de Fichiers *</label>
            <input type="number" {...register('nombreBS', { valueAsNumber: true })} className="input w-full" min={1} required />
            {errors.nombreBS && <span className="text-red-500 text-xs">{errors.nombreBS.message}</span>}
          </div>
          <div>
            <label className="block font-semibold mb-1">Référence *</label>
            <input type="text" {...register('reference')} className="input w-full" required />
            {errors.reference && <span className="text-red-500 text-xs">{errors.reference.message}</span>}
          </div>
          <div>
            <label className="block font-semibold mb-1">Date Réception *</label>
            <input type="date" {...register('dateReception')} className="input w-full" required />
            {errors.dateReception && <span className="text-red-500 text-xs">{errors.dateReception.message}</span>}
          </div>
          <div>
            <label className="block font-semibold mb-1">Gestionnaire</label>
            <input type="text" className="input w-full" value={manager} disabled />
          </div>
          <div>
            <label className="block font-semibold mb-1">Délais Règlement *</label>
            <input type="number" {...register('delaiReglement', { valueAsNumber: true })} className="input w-full" min={1} required />
            {errors.delaiReglement && <span className="text-red-500 text-xs">{errors.delaiReglement.message}</span>}
          </div>
          <div>
            <label className="block font-semibold mb-1">Contrat</label>
            <select {...register('contractId')} className="input w-full">
              <option value="">Sélectionner...</option>
              {contracts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name || c.nom}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block font-semibold mb-1">Statut</label>
          <select {...register('statut')} className="input w-full">
            <option value="">--</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_COURS">En cours</option>
            <option value="PARTIEL">Partiel</option>
            <option value="CLOTURE">Clôturé</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Commentaire (optionnel)</label>
          <textarea {...register('commentaire')} className="input w-full" />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="btn" style={{ background: '#64748b', color: '#fff' }} onClick={() => navigate(`/bordereaux/${id}`)}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Mise à jour...' : 'Enregistrer'}</button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
      </form>
    </div>
  );
};

export default EditBordereauPage;
