import clsx from "clsx";
import { Statut, StatusColor } from "../utils/enums";

// Central mapping for status code to label and color
const bordereauStatusMap: Record<Statut | string, { label: string; color: StatusColor }> = {
  EN_ATTENTE: { label: "En attente", color: StatusColor.GREEN },
  SCAN_EN_COURS: { label: "Scan en cours", color: StatusColor.ORANGE },
  SCAN_TERMINE: { label: "Scan terminé", color: StatusColor.GREEN },
  ASSIGNE: { label: "Assigné", color: StatusColor.GREEN },
  TRAITE: { label: "Traité", color: StatusColor.GREEN },
  CLOTURE: { label: "Clôturé", color: StatusColor.GREEN },
  EN_COURS: { label: "En cours", color: StatusColor.ORANGE },
  PARTIEL: { label: "Partiel", color: StatusColor.ORANGE },
  EN_DIFFICULTE: { label: "En difficulté", color: StatusColor.RED },
};

export default function BordereauStatusBadge({
  statut,
  color,
}: {
  statut: Statut;
  color?: StatusColor;
}) {
  // Use mapping for label and color, fallback to props if not found
  const status = bordereauStatusMap[statut] || { label: statut, color: color || StatusColor.GREEN };
  const badgeColor = color || status.color;

  return (
    <span
      className={clsx(
        "inline-block px-2 py-1 rounded text-xs font-semibold",
        badgeColor === StatusColor.RED
          ? "bg-red-100 text-red-700"
          : badgeColor === StatusColor.ORANGE
          ? "bg-yellow-100 text-yellow-700"
          : "bg-green-100 text-green-700"
      )}
      aria-label={status.label}
      title={status.label}
    >
      <span>{status.label}</span>
    </span>
  );
}
