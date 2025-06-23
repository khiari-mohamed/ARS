import { Bordereau } from "../types/bordereaux";
import BordereauStatusBadge from "./BordereauStatusBadge";
import { Link } from "react-router-dom";

export default function BordereauCard({ bordereau }: { bordereau: Bordereau }) {
  return (
    <Link
      to={`/home/bordereaux/${bordereau.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-lg transition p-4 mb-4 border border-gray-100"
    >
      <div className="flex justify-between items-center">
        <div>
          <div className="font-bold text-lg">{bordereau.reference}</div>
          <div className="text-sm text-gray-500">
          Client: {bordereau.client?.name || bordereau.clientId}
          </div>
          <div className="text-xs text-gray-400">
            Reçu le: {new Date(bordereau.dateReception).toLocaleDateString()}
          </div>
        </div>
        <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span>
          BS: <b>{bordereau.nombreBS}</b>
        </span>
        <span>
          SLA: <b>{bordereau.delaiReglement}j</b>
        </span>
        <span>
          Restant: <b>{bordereau.daysRemaining}</b>j
        </span>
      </div>
    </Link>
  );
}