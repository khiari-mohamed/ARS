import { Virement } from "../types/bordereaux";

const getStatus = (v: Virement) => {
  if (v.confirmed) return "Validé";
  return "En cours";
};

export default function VirementStatus({ virement }: { virement: Virement | null }) {
  if (!virement) return <div>Aucun virement lié.</div>;
  return (
    <div className="border rounded p-2 bg-gray-50">
      <div>
        <b>Montant:</b> {virement.montant} DT
      </div>
      <div>
        <b>Statut:</b> <span>{getStatus(virement)}</span>
      </div>
      <div>
        <b>Date:</b> {new Date(virement.dateExecution).toLocaleDateString()}
      </div>
      <div>
        <b>Validé par:</b> {virement.confirmedById || "N/A"}
      </div>
    </div>
  );
}