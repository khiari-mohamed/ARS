-- Create Department table
CREATE TABLE "Department" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "serviceType" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert required departments
INSERT INTO "Department" ("id", "name", "code", "serviceType", "description") VALUES
('dept-bo', 'Bureau d''Ordre', 'BO', 'BUREAU_ORDRE', 'Service de réception et saisie initiale'),
('dept-scan', 'Service SCAN', 'SCAN', 'SCAN', 'Service de numérisation et indexation'),
('dept-sante', 'Équipe Santé', 'SANTE', 'SANTE', 'Service de traitement des dossiers santé'),
('dept-finance', 'Service Finance', 'FINANCE', 'FINANCE', 'Service de gestion financière et virements'),
('dept-client', 'Service Client', 'CLIENT', 'CLIENT_SERVICE', 'Service de gestion des réclamations');

-- Update existing users to have proper departments
UPDATE "User" SET "department" = 'Bureau d''Ordre' WHERE "role" = 'BO';
UPDATE "User" SET "department" = 'Service SCAN' WHERE "role" = 'SCAN';
UPDATE "User" SET "department" = 'Équipe Santé' WHERE "role" IN ('CHEF_EQUIPE', 'GESTIONNAIRE');
UPDATE "User" SET "department" = 'Service Finance' WHERE "role" = 'FINANCE';
UPDATE "User" SET "department" = 'Service Client' WHERE "role" = 'CLIENT_SERVICE';