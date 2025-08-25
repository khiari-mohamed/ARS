export type Statut =
  | "EN_ATTENTE"
  | "A_SCANNER"
  | "SCAN_EN_COURS"
  | "SCANNE"
  | "A_AFFECTER"
  | "ASSIGNE"
  | "EN_COURS"
  | "TRAITE"
  | "PRET_VIREMENT"
  | "VIREMENT_EN_COURS"
  | "VIREMENT_EXECUTE"
  | "VIREMENT_REJETE"
  | "CLOTURE"
  | "EN_DIFFICULTE"
  | "PARTIEL";

export enum StatusColor {
  GREEN = "GREEN",
  ORANGE = "ORANGE",
  RED = "RED",
}