"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createBordereau } from "../../services/bordereauxService";
import { fetchClients } from "../../services/clientService";
import { fetchContracts } from "../../services/contractService";

const schema = z.object({
  reference: z.string().min(2),
  dateReception: z.string(),
  clientId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  delaiReglement: z.number().min(1),
  nombreBS: z.number().min(1),
});

export default function CreateBordereauPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reference: "",
      dateReception: "",
      clientId: "",
      contractId: "",
      delaiReglement: 7,
      nombreBS: 1,
    },
  });

  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
 useEffect(() => {
  fetchClients().then(setClients);
  fetchContracts().then(setContracts);
}, []);

 const onSubmit = async (data: any) => {
  await createBordereau(data);
  navigate("/bordereaux");
};

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Créer un Bordereau</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-semibold">Référence</label>
          <input
            {...register("reference")}
            className="input input-bordered w-full"
          />
          {errors.reference && (
            <div className="text-red-600 text-xs">{errors.reference.message}</div>
          )}
        </div>
        <div>
          <label className="block font-semibold">Date de réception</label>
          <input
            type="date"
            {...register("dateReception")}
            className="input input-bordered w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Client</label>
          <select {...register("clientId")} className="input input-bordered w-full">
            <option value="">Sélectionner un client</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold">Contrat (optionnel)</label>
          <select {...register("contractId")} className="input input-bordered w-full">
            <option value="">Sélectionner un contrat</option>
            {contracts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold">Délai règlement (jours)</label>
          <input
            type="number"
            {...register("delaiReglement", { valueAsNumber: true })}
            className="input input-bordered w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Nombre de BS</label>
          <input
            type="number"
            {...register("nombreBS", { valueAsNumber: true })}
            className="input input-bordered w-full"
          />
        </div>
        <button className="btn btn-primary" disabled={isSubmitting}>
          Créer
        </button>
      </form>
    </div>
  );
}
