-- Finance portfolio query indexes for CHEF_EQUIPE and GESTIONNAIRE_SENIOR
-- Idempotent and safe to run against an existing database.

BEGIN;

CREATE INDEX IF NOT EXISTS "OrdreVirement_clientId_idx"
  ON "OrdreVirement" ("clientId");

CREATE INDEX IF NOT EXISTS "OrdreVirement_bordereauId_idx"
  ON "OrdreVirement" ("bordereauId");

CREATE INDEX IF NOT EXISTS "OrdreVirement_utilisateurSante_idx"
  ON "OrdreVirement" ("utilisateurSante");

CREATE INDEX IF NOT EXISTS "Contract_clientId_idx"
  ON "Contract" ("clientId");

CREATE INDEX IF NOT EXISTS "Contract_teamLeaderId_idx"
  ON "Contract" ("teamLeaderId");

CREATE INDEX IF NOT EXISTS "Contract_assignedManagerId_idx"
  ON "Contract" ("assignedManagerId");

COMMIT;
