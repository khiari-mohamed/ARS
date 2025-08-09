export type Statut =
  | "EN_ATTENTE"
  | "SCAN_EN_COURS"
  | "SCAN_TERMINE"
  | "ASSIGNE"
  | "TRAITE"
  | "CLOTURE"
  | "EN_DIFFICULTE"
  | "EN_COURS"
  | "PARTIEL";

export enum StatusColor {
  GREEN = "GREEN",
  ORANGE = "ORANGE",
  RED = "RED",
}