import clsx from "clsx";
import { Statut, StatusColor } from "../types/bordereaux";

const statusMap: Record<Statut, string> = {
  EN_ATTENTE: "En attente",
  SCAN_EN_COURS: "Scan en cours",
  SCAN_TERMINE: "Scan terminé",
  ASSIGNE: "Assigné",
  TRAITE: "Traité",
  CLOTURE: "Clôturé",
  EN_DIFFICULTE: "En difficulté",
  EN_COURS: "En cours",
  PARTIEL: "Partiel",
};

export default function BordereauStatusBadge({
  statut,
  color,
}: {
  statut: Statut;
  color?: StatusColor;
}) {
  return (
    <span
      className={clsx(
        "inline-block px-2 py-1 rounded text-xs font-semibold",
        color === "RED"
          ? "bg-red-100 text-red-700"
          : color === "ORANGE"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-green-100 text-green-700"
      )}
    >
      {statusMap[statut] || statut}
    </span>
  );
}