-- Clear all data while keeping tables and schema intact
TRUNCATE TABLE 
  "TraitementHistory",
  "DocumentAssignmentHistory", 
  "VirementHistorique",
  "SuiviVirement",
  "OrdreVirementItem",
  "OrdreVirement",
  "Virement",
  "BulletinSoin",
  "Document",
  "Bordereau",
  "Reclamation",
  "Notification",
  "AlertLog",
  "ActionLog",
  "AuditLog",
  "OCRLog",
  "Contract",
  "Adherent",
  "Client",
  "DonneurOrdre",
  "User"
RESTART IDENTITY CASCADE;
