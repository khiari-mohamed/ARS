import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBordereau, updateBordereau } from '../../../services/bordereauxService';
import { fetchClients } from '../../../services/clientService';
import { fetchContracts } from '../../../services/contractService';

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

  useEffect(() => {
    fetchClients().then(setClients);
    fetchContracts().then(setContracts);
  }, []);

  React.useEffect(() => {
    if (bordereau) {
      setValue('reference', bordereau.reference);
      setValue('clientId', bordereau.clientId);
      setValue('contractId', bordereau.contractId);
      setValue('dateReception', bordereau.dateReception?.slice(0, 10));
      setValue('delaiReglement', bordereau.delaiReglement);
      setValue('statut', bordereau.statut);
      setValue('nombreBS', bordereau.nombreBS);
      setValue('commentaire', bordereau.commentaire || '');
    }
  }, [bordereau, setValue]);

  const onSubmit = async (data: FormData) => {
    await updateBordereau(id as string, data);
    navigate(`/bordereaux/${id}`);
  };

  if (isLoading || !bordereau) return <div className="text-center py-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow max-w-lg w-full space-y-4">
        <h2 className="text-xl font-bold mb-4">Modifier le Bordereau</h2>
        <div>
          <label className="block text-sm font-medium">Référence</label>
          <input {...register('reference')} className="border rounded px-2 py-1 w-full" />
          {errors.reference && <span className="text-red-500 text-xs">{errors.reference.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium">Client</label>
          <select {...register("clientId")} className="input input-bordered w-full">
            <option value="">Sélectionner un client</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clientId && <span className="text-red-500 text-xs">{errors.clientId.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium">Contrat (optionnel)</label>
          <select {...register("contractId")} className="input input-bordered w-full">
            <option value="">Sélectionner un contrat</option>
            {contracts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Date de réception</label>
          <input type="date" {...register('dateReception')} className="border rounded px-2 py-1 w-full" />
          {errors.dateReception && <span className="text-red-500 text-xs">{errors.dateReception.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium">Délai règlement (jours)</label>
          <input type="number" {...register('delaiReglement', { valueAsNumber: true })} className="border rounded px-2 py-1 w-full" />
          {errors.delaiReglement && <span className="text-red-500 text-xs">{errors.delaiReglement.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium">Statut</label>
          <select {...register('statut')} className="border rounded px-2 py-1 w-full">
            <option value="">--</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_COURS">En cours</option>
            <option value="PARTIEL">Partiel</option>
            <option value="CLOTURE">Clôturé</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre de BS</label>
          <input type="number" {...register('nombreBS', { valueAsNumber: true })} className="border rounded px-2 py-1 w-full" />
          {errors.nombreBS && <span className="text-red-500 text-xs">{errors.nombreBS.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium">Commentaire (optionnel)</label>
          <textarea {...register('commentaire')} className="border rounded px-2 py-1 w-full" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
      </form>
    </div>
  );
};

export default EditBordereauPage;
